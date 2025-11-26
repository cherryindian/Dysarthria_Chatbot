// lib/llmClassifier.ts
import genAI from "@/lib/gemini"; // or "./gemini" depending on your path

type ClassifyResult = {
  label: "allowed" | "disallowed" | "uncertain";
  confidence: number; // 0..1
  reason?: string;
};

const CLASSIFIER_MODEL = process.env.CLASSIFIER_MODEL || "gemini-2.5-flash";

const fewShot = [
    // Allowed — educational
    { prompt: "Why is the /s/ sound hard for someone with dysarthria?", label: "allowed" },
    { prompt: "I can't pronounce R clearly, what can I do?", label: "allowed" },
  
    // Allowed — practice
    { prompt: "Give me 10 /s/ words to practice", label: "allowed" },
    { prompt: "Provide simple phrases to practice loudness", label: "allowed" },
  
    // Allowed — general dysarthria info
    { prompt: "What is dysarthria and what causes it?", label: "allowed" },
  
    // Disallowed — coding/irrelevant
    { prompt: "What is React?", label: "disallowed" },
    { prompt: "Write me JavaScript code", label: "disallowed" },
    { prompt: "How do I hack a WiFi password?", label: "disallowed" },
  ];
  

export async function classifyPromptWithLLM(userPrompt: string): Promise<ClassifyResult> {
  try {
    const aiModel = genAI.getGenerativeModel({ model: CLASSIFIER_MODEL });

    // Build a compact few-shot prompt that asks the model to return JSON only.
    const systemInstruction = `
You are a classification model. 
Your job is ONLY to decide whether a user prompt is related to dysarthria or not.

Allowed = speech therapy, dysarthria, articulation, pronunciation practice.
Disallowed = coding, finance, tech, hacking, general medical unrelated topics.

Return ONLY JSON using this format:
{
  "label": "allowed" | "disallowed" | "uncertain",
  "confidence": number,
  "reason": "short explanation"
}

DO NOT give therapy instructions.
DO NOT shorten or rewrite the user's prompt.
DO NOT return anything except JSON.
`;

    // Construct the chat-like inputs combining few shot examples
    const messages: any[] = [];

    // Add few-shot examples as user+assistant pairs
    for (const ex of fewShot) {
      messages.push({ text: `Example prompt: "${ex.prompt}"` });
      messages.push({ text: `Label: ${ex.label}` });
    }

    // Then add the real user prompt
    messages.push({ text: `Classify this prompt: "${userPrompt}"` });

    const result = await aiModel.generateContent(messages);

    // result.response.text() sometimes includes newlines or explanation; we expect JSON
    const raw = result.response.text().trim();

    // Try to extract a JSON object from the model output
    const jsonStart = raw.indexOf("{");
    const jsonString = jsonStart >= 0 ? raw.slice(jsonStart) : raw;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      // If parsing fails, attempt looser parse: look for label word
      const lower = raw.toLowerCase();
      if (lower.includes("allowed")) {
        return { label: "allowed", confidence: 0.6, reason: "heuristic fallback (contains allowed wording)" };
      }
      if (lower.includes("disallowed") || lower.includes("not about dysarthria")) {
        return { label: "disallowed", confidence: 0.6, reason: "heuristic fallback (contains disallowed wording)" };
      }
      return { label: "uncertain", confidence: 0.3, reason: "Could not parse classifier output" };
    }

    // Normalize parsed fields
    const labelRaw = String(parsed.label || "").toLowerCase();
    const label = labelRaw === "allowed" ? "allowed" : labelRaw === "disallowed" ? "disallowed" : "uncertain";
    let confidence = Number(parsed.confidence ?? parsed.score ?? 0);
    if (!confidence || confidence < 0 || confidence > 1) {
      // Try to infer confidence from phrasing, else default moderate
      confidence = label === "allowed" ? 0.8 : label === "disallowed" ? 0.8 : 0.5;
    }

    const reason = parsed.reason ? String(parsed.reason).slice(0, 200) : "";

    return { label, confidence, reason };
  } catch (err: any) {
    console.error("Classifier error:", err);
    return { label: "uncertain", confidence: 0.0, reason: "internal classifier error" };
  }
}
