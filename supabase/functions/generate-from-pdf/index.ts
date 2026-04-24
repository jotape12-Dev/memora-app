// @verify_jwt: false
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_WEEKLY_LIMIT = 10;
const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_TEXT_CHARS = 4000;

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Calls Groq with automatic retry on 429 (TPM rate limit).
// Supabase Edge Functions timeout = 150s; with 2 retries of 61s each + processing we stay ~130s.
async function callGroqWithRetry(
  messages: object[],
  maxTokens: number,
  retries = 2,
  delayMs = 61000,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: false,
        }),
      },
    );

    if (response.status !== 429) return response;
    if (attempt === retries) return response;

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Retry loop exhausted");
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { pdfBase64, quantity: rawQuantity = 10 } = await req.json();
    const quantity = Math.min(Math.max(rawQuantity, 3), 20);

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Missing pdfBase64" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = decodeBase64(pdfBase64);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid base64 PDF" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (pdfBytes.length > MAX_PDF_BYTES) {
      return new Response(JSON.stringify({ error: "pdf_too_large" }), {
        status: 413,
        headers: corsHeaders,
      });
    }

    // Extract text from PDF
    let extracted: string;
    try {
      const pdf = await getDocumentProxy(pdfBytes);
      const { text } = await extractText(pdf, { mergePages: true });
      extracted = (Array.isArray(text) ? text.join("\n") : text).trim();
    } catch (err) {
      console.error("PDF parse error:", err);
      return new Response(JSON.stringify({ error: "pdf_parse_failed" }), {
        status: 422,
        headers: corsHeaders,
      });
    }

    if (extracted.length < 50) {
      return new Response(JSON.stringify({ error: "pdf_text_too_short" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Admin client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_generation_count, last_generation_date, is_premium")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const today = new Date().toISOString().split("T")[0];

    if (!profile.is_premium) {
      const currentWeekStart = getWeekStart(today);
      const lastWeekStart = profile.last_generation_date
        ? getWeekStart(profile.last_generation_date)
        : null;
      const isNewWeek = lastWeekStart !== currentWeekStart;
      const count = isNewWeek ? 0 : profile.daily_generation_count;

      if (count >= FREE_WEEKLY_LIMIT) {
        return new Response(JSON.stringify({ error: "weekly_limit_reached", limit: FREE_WEEKLY_LIMIT }), {
          status: 429,
          headers: corsHeaders,
        });
      }

      await supabase.from("profiles").update({
        daily_generation_count: isNewWeek ? 1 : count + 1,
        last_generation_date: today,
      }).eq("id", user.id);
    }

    const truncated = extracted.substring(0, MAX_TEXT_CHARS);

    const groqResponse = await callGroqWithRetry(
      [{
        role: "user",
        content: `Você é um educador especialista. Dado o texto extraído de um PDF abaixo, gere EXATAMENTE ${quantity} pares de flashcards otimizados para aprendizado por repetição espaçada. Nem mais, nem menos. O array "flashcards" DEVE conter exatamente ${quantity} itens.

Regras:
- O array "flashcards" deve ter exatamente ${quantity} objetos — conte antes de retornar
- As perguntas devem testar compreensão, não apenas memorização
- As respostas devem ser concisas (máximo 3 frases)
- Foque nos conceitos mais importantes
- Ignore cabeçalhos, rodapés, números de página e metadados do PDF
- Retorne APENAS um objeto JSON válido, sem texto extra, sem markdown, sem blocos de código
- Responda no mesmo idioma do texto fornecido

Texto:
${truncated}

Retorne exatamente neste formato JSON (nada mais), com ${quantity} itens no array:
{"flashcards": [{"question": "...", "answer": "..."}]}`,
      }],
      5000,
    );

    if (groqResponse.status === 429) {
      return new Response(JSON.stringify({ error: "service_unavailable" }), {
        status: 503,
        headers: corsHeaders,
      });
    }

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errorText);
      return new Response(JSON.stringify({ error: `Groq error ${groqResponse.status}: ${errorText.substring(0, 300)}` }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*"flashcards"[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Raw AI content:", content.substring(0, 500));
        return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
          status: 500,
          headers: corsHeaders,
        });
      }
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    if (!parsed?.flashcards || !Array.isArray(parsed.flashcards)) {
      return new Response(JSON.stringify({ error: "Invalid AI response format" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const trimmed = parsed.flashcards.slice(0, quantity);

    return new Response(JSON.stringify({ flashcards: trimmed }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
