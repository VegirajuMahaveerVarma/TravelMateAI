import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 8787;
const model = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
app.use(cors());
app.use(express.json());

const travelSchema = {
  type: "object",
  properties: {
    passengers: { type: "integer", minimum: 1, maximum: 12, description: "Number of travellers." },
    large_bags: { type: "integer", minimum: 0, maximum: 20, description: "Large suitcases or checked-size bags." },
    small_bags: { type: "integer", minimum: 0, maximum: 20, description: "Cabin bags, backpacks, or small bags." },
    pickup: { type: "string", description: "Pickup location, normally an airport or named place." },
    destination: { type: "string", description: "Traveller's destination." }
  },
  required: ["passengers", "large_bags", "small_bags", "pickup", "destination"]
};

function fallbackFromText(text) {
  const lower = text.toLowerCase();
  const numbers = [...text.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
  const pickup = lower.includes("hyderabad") || lower.includes("hyd") ? "Hyderabad Airport" : "Airport pickup";
  const destinationMatch = text.match(/(?:to|going to|heading to|destination is)\s+([^.,]+)/i);
  return { passengers: numbers[0] || 2, large_bags: numbers[1] || 2, small_bags: numbers[2] || 0, pickup, destination: destinationMatch?.[1]?.trim() || "Your destination" };
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "TravelMateAI", model }));

app.post("/api/understand-trip", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "Please describe your journey." });

  if (!process.env.GEMINI_API_KEY) {
    return res.json({ intent: fallbackFromText(message), mode: "demo-fallback", note: "Add GEMINI_API_KEY to enable live Gemma 4 inference." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: "user",
        parts: [{ text: [
          "You are TravelMateAI's travel-intent extraction engine.",
          "Extract only traveller facts needed to arrange an airport transfer.",
          "Do not invent missing facts. If a quantity is not stated, use 0 for bag counts and 1 for passengers only when necessary.",
          "Normalize obvious airport wording such as HYD to Hyderabad Airport.",
          "Return JSON matching the supplied schema.",
          "",
          "Traveller message:",
          message
        ].join("\n") }]
      }],
      config: { responseMimeType: "application/json", responseSchema: travelSchema, temperature: 0.1 }
    });
    return res.json({ intent: JSON.parse(response.text), mode: "gemma-4", model });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: "Gemma could not process this request. Check your API key/model access and try again." });
  }
});

app.listen(port, () => console.log("TravelMateAI API running on port " + port + " using " + model));
