// @verify_jwt: false
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Pass Authorization header to client — Supabase recommended pattern
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

    // Admin client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify premium status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    if (!profile?.is_premium) {
      return new Response(JSON.stringify({ error: "premium_required" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { topic, quantity = 10, level = "Intermediário", language = "Português", additionalContext } = await req.json();

    if (!topic || topic.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Topic must be at least 3 characters" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const clampedQuantity = Math.min(Math.max(quantity, 5), 30);

    const groqResponse = await callGroqWithRetry(
      [{
        role: "user",
        content: `Você é um educador especialista em criar flashcards de alta qualidade para estudo.

Crie EXATAMENTE ${clampedQuantity} flashcards sobre: "${topic}". Nem mais, nem menos. O array "flashcards" DEVE conter exatamente ${clampedQuantity} itens.
Nível: ${level}
Idioma: ${language}
${additionalContext ? `Contexto adicional: ${additionalContext}` : ""}

Regras:
- O array "flashcards" deve ter exatamente ${clampedQuantity} objetos — conte antes de retornar
- Cubra os conceitos mais importantes do tópico de forma abrangente
- Varie os tipos de pergunta: definições, aplicações, comparações, exemplos
- As respostas devem ser claras, completas mas concisas (máximo 3 frases)
- Garanta precisão factual
- Retorne APENAS um objeto JSON válido, sem texto extra, sem markdown, sem blocos de código
- Responda no idioma especificado: ${language}

Retorne exatamente neste formato JSON (nada mais), com ${clampedQuantity} itens no array:
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

    // Strip markdown code blocks that some models add despite instructions
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: extract JSON object via regex
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

    // Enforce the requested count: trim extras, but never pad — if the model returned fewer,
    // the user gets what was generated and can retry.
    const trimmed = parsed.flashcards.slice(0, clampedQuantity);

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
