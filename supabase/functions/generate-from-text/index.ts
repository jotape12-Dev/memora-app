import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_DAILY_LIMIT = 10;

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

    const { text, quantity: rawQuantity = 10 } = await req.json();
    const quantity = Math.min(Math.max(rawQuantity, 3), 20);

    if (!text || text.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Text must be at least 50 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check rate limit for free users
    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_generation_count, last_generation_date, is_premium")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    if (!profile.is_premium) {
      const isNewDay = profile.last_generation_date !== today;
      const count = isNewDay ? 0 : profile.daily_generation_count;

      if (count >= FREE_DAILY_LIMIT) {
        return new Response(JSON.stringify({ error: "daily_limit_reached", limit: FREE_DAILY_LIMIT }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Update counter
      await supabase.from("profiles").update({
        daily_generation_count: isNewDay ? 1 : count + 1,
        last_generation_date: today,
      }).eq("id", user.id);
    }

    // Call Hugging Face Inference API
    const prompt = `<s>[INST] You are an expert educator. Given the following text, generate exactly ${quantity} flashcard pairs optimized for spaced repetition learning.

Rules:
- Questions should test understanding, not just memorization
- Answers should be concise (1-3 sentences max)
- Focus on the most important concepts
- Return ONLY valid JSON, no extra text

Text:
${text.substring(0, 3000)}

Return format:
{"flashcards": [{"question": "...", "answer": "..."}]} [/INST]`;

    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 2000,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
      }
    );

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error("HF API error:", errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hfData = await hfResponse.json();
    const generatedText = Array.isArray(hfData) ? hfData[0]?.generated_text : hfData.generated_text;

    // Extract JSON from response — try direct parse, then regex fallback
    let parsed;
    try {
      parsed = JSON.parse(generatedText);
    } catch {
      const jsonMatch = generatedText?.match(/\{[\s\S]*"flashcards"[\s\S]*\}/);
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
