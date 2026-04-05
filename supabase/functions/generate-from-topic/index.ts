import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify premium status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    if (!profile?.is_premium) {
      return new Response(JSON.stringify({ error: "premium_required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { topic, quantity = 10, level = "Intermediário", language = "Português", additionalContext } = await req.json();

    if (!topic || topic.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Topic must be at least 3 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clampedQuantity = Math.min(Math.max(quantity, 5), 30);

    const prompt = `You are an expert educator specialized in creating high-quality study flashcards.

Create ${clampedQuantity} flashcards about: "${topic}"
Level: ${level} (Básico/Intermediário/Avançado)
Language: ${language}
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Rules:
- Cover the most important concepts of this topic comprehensively
- Questions should vary in type: definitions, applications, comparisons, examples
- Answers should be clear, complete but concise
- Ensure factual accuracy
- Return ONLY valid JSON, no extra text

Return format:
{"flashcards": [{"question": "...", "answer": "..."}]}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert educator. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract JSON — try direct parse, then regex fallback
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*"flashcards"[\s\S]*\}/);
      if (!jsonMatch) {
        return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (!parsed?.flashcards || !Array.isArray(parsed.flashcards)) {
      return new Response(JSON.stringify({ error: "Invalid AI response format" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
