// @verify_jwt: false
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_DAILY_LIMIT = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

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

    const { text, quantity: rawQuantity = 10 } = await req.json();
    const quantity = Math.min(Math.max(rawQuantity, 3), 20);

    if (!text || text.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Text must be at least 50 characters" }), {
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
      const isNewDay = profile.last_generation_date !== today;
      const count = isNewDay ? 0 : profile.daily_generation_count;

      if (count >= FREE_DAILY_LIMIT) {
        return new Response(JSON.stringify({ error: "daily_limit_reached", limit: FREE_DAILY_LIMIT }), {
          status: 429,
          headers: corsHeaders,
        });
      }

      await supabase.from("profiles").update({
        daily_generation_count: isNewDay ? 1 : count + 1,
        last_generation_date: today,
      }).eq("id", user.id);
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Você é um educador especialista. Dado o texto abaixo, gere exatamente ${quantity} pares de flashcards otimizados para aprendizado por repetição espaçada.

Regras:
- As perguntas devem testar compreensão, não apenas memorização
- As respostas devem ser concisas (máximo 3 frases)
- Foque nos conceitos mais importantes
- Retorne APENAS um objeto JSON válido, sem texto extra, sem markdown, sem blocos de código
- Responda no mesmo idioma do texto fornecido

Texto:
${text.substring(0, 4000)}

Retorne exatamente neste formato JSON (nada mais):
{"flashcards": [{"question": "...", "answer": "..."}]}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      return new Response(JSON.stringify({ error: `Gemini error ${geminiResponse.status}: ${errorText.substring(0, 300)}` }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

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

    return new Response(JSON.stringify(parsed), {
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
