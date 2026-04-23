import type { GeneratedFlashcard } from "../types/database";

export async function generateFlashcardsOnDevice(
  generate: (prompt: string) => Promise<string>,
  topic: string,
  level: string,
  quantity: number,
  context?: string
): Promise<GeneratedFlashcard[]> {
  const prompt = `Você é um educador especialista em criar flashcards de alta qualidade para estudo.

Crie exatamente ${quantity} flashcards sobre: "${topic}"
Nível: ${level}
${context ? `Contexto adicional: ${context}` : ""}

Regras:
- Cubra os conceitos mais importantes do tópico de forma abrangente
- Varie os tipos de pergunta: definições, aplicações, comparações, exemplos
- As respostas devem ser claras, completas mas concisas (máximo 3 frases)
- Garanta precisão factual
- Retorne APENAS um objeto JSON válido, sem texto extra, sem markdown, sem blocos de código

Retorne exatamente neste formato JSON (nada mais):
{"flashcards": [{"question": "...", "answer": "..."}]}`;

  const raw = await generate(prompt);

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: { flashcards?: GeneratedFlashcard[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*"flashcards"[\s\S]*\}/);
    if (!match) throw new Error("Failed to parse AI response");
    parsed = JSON.parse(match[0]);
  }

  if (!parsed?.flashcards || !Array.isArray(parsed.flashcards)) {
    throw new Error("Invalid AI response format");
  }

  return parsed.flashcards;
}
