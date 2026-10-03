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
    flight_number: { type: "string", description: "Flight number, for example AI 1234 or 6E 6421." },
    passengers: { type: "integer", minimum: 1, maximum: 12, description: "Number of travellers." },
    large_bags: { type: "integer", minimum: 0, maximum: 20, description: "Large suitcases or checked-size bags." },
    small_bags: { type: "integer", minimum: 0, maximum: 20, description: "Cabin bags, backpacks, or small bags." },
    pickup: { type: "string", description: "Arrival airport or pickup location." },
    destination: { type: "string", description: "Traveller's destination after the airport." },
    travel_date: { type: "string", description: "Requested travel/arrival date if stated." }
  },
  required: ["flight_number", "passengers", "large_bags", "small_bags", "pickup", "destination", "travel_date"]
};

function fallbackFromText(text) {
  const lower = text.toLowerCase();
  const flightMatch = text.match(/\b([A-Z]{1,3}\s?\d{2,4})\b/i);
  const passengersMatch = text.match(/\b(\d+)\s*(?:passengers?|people|travellers?|travelers?)\b/i);
  const largeMatch = text.match(/\b(\d+)\s*(?:large|big|checked)(?:\s+(?:suitcases?|bags?))?/i);
  const smallMatch = text.match(/\b(\d+)\s*(?:cabin|small|carry[- ]?on)(?:\s+(?:bags?|suitcases?|luggage))?/i);
  const pickup = lower.includes("hyderabad") || lower.includes("hyd") ? "Hyderabad Airport (HYD)" : "Arrival Airport";
  const destinationMatch = text.match(/(?:to|going to|heading to|destination is)\s+([^.,]+)/i);

  return {
    flight_number: flightMatch?.[1]?.toUpperCase() || "DEMO 1234",
    passengers: Number(passengersMatch?.[1]) || (lower.includes("parents") ? 3 : 2),
    large_bags: Number(largeMatch?.[1]) || 0,
    small_bags: Number(smallMatch?.[1]) || 0,
    pickup,
    destination: destinationMatch?.[1]?.trim() || "Your destination",
    travel_date: "today"
  };
}

function addMinutes(hhmm, minutes) {
  const [hours, mins] = hhmm.split(":").map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function demoFlightStatus(flightNumber) {
  const digits = (flightNumber.match(/\d+/)?.[0] || "1234");
  const seed = Number(digits) % 37;
  const arrival = 18 * 60 + 15 + seed;
  const hhmm = String(Math.floor(arrival / 60)).padStart(2, "0") + ":" + String(arrival % 60).padStart(2, "0");
  return {
    flight_number: flightNumber,
    route: "Tracked arrival → Hyderabad (HYD)",
    status: "En route",
    arrival_time: hhmm,
    updated_at: "Demo feed · just now",
    mode: "demo"
  };
}

async function extractIntent(message) {
  if (!process.env.GEMINI_API_KEY) return fallbackFromText(message);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const interaction = await ai.interactions.create({
    model,
    input: [
      "You are TravelMateAI's flight-to-ride intent extraction engine.",
      "Extract only facts needed to track a flight and arrange an airport transfer.",
      "The user may write the flight number, arrival airport, passenger count, bags and destination in natural language.",
      "Do not invent missing facts. Use 0 for unspecified bag counts, 2 for passengers only if the message clearly refers to a group but gives no count, and 'today' for travel_date when the user says today or does not specify a date.",
      "Normalize HYD to Hyderabad Airport (HYD). Preserve the flight number.",
      "Return JSON matching the supplied schema.",
      "",
      "Traveller request:",
      message
    ].join("\n"),
    response_format: { type: "text", mime_type: "application/json", schema: travelSchema }
  });
  return JSON.parse(interaction.output_text);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "TravelMateAI", model });
});

app.post("/api/track-flight", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "Please provide your flight and travel details." });

  try {
    const intent = await extractIntent(message);
    const flight = demoFlightStatus(intent.flight_number);

    return res.json({
      intent,
      flight,
      pickup_window: {
        start: addMinutes(flight.arrival_time, 15),
        end: addMinutes(flight.arrival_time, 35),
        reason: "15–35 minutes after estimated touchdown for disembarking and baggage collection."
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: "TravelMateAI could not process the flight request. Check your Gemini API key/model access and try again." });
  }
});

app.listen(port, () => console.log("TravelMateAI API running on port " + port + " using " + model));
