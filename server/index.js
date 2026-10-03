import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 8787;
const model = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
app.use(cors());
app.use(express.json());

const stores = {
  bookings: [],
  documents: [
    { id: "DOC-01", name: "Passport", status: "Ready" },
    { id: "DOC-02", name: "Flight ticket", status: "Ready" },
    { id: "DOC-03", name: "Hotel voucher", status: "Ready" }
  ],
  notifications: [
    { id: "N-01", title: "Arrival pickup", body: "Your airport pickup can be timed from the arrival estimate.", unread: true },
    { id: "N-02", title: "Journey plan", body: "TravelMateAI is ready for your next journey.", unread: true },
    { id: "N-03", title: "Travel documents", body: "Your saved travel documents are available.", unread: true }
  ]
};

const journeySchema = {
  type: "object",
  properties: {
    mode: { type: "string", enum: ["flight", "train", "metro", "bus"] },
    reference: { type: "string", description: "Flight number, train number/name, metro line or bus route." },
    origin: { type: "string" },
    pickup: { type: "string" },
    destination: { type: "string" },
    passengers: { type: "integer", minimum: 1, maximum: 12 },
    large_bags: { type: "integer", minimum: 0, maximum: 20 },
    small_bags: { type: "integer", minimum: 0, maximum: 20 },
    travel_date: { type: "string" },
    preference: { type: "string", description: "Optional preference such as fastest, cheapest, accessible or comfortable." }
  },
  required: ["mode", "reference", "origin", "pickup", "destination", "passengers", "large_bags", "small_bags", "travel_date", "preference"]
};

function fallbackJourney(text) {
  const lower = text.toLowerCase();
  const mode = lower.includes("train") || /\b\d{4,6}\b/.test(text) && lower.includes("station") ? "train"
    : lower.includes("metro") ? "metro"
    : lower.includes("bus") ? "bus" : "flight";
  const ref = (text.match(/\b(?:AI|6E|UK|SG|EK|QR|IX)\s?\d{2,4}\b/i)?.[0] ||
    text.match(/\b\d{4,6}\b/)?.[0] || (mode === "metro" ? "Blue Line" : mode === "bus" ? "Airport Bus" : mode === "train" ? "12723" : "DEMO 1234")).toUpperCase();
  const passengers = Number(text.match(/\b(\d+)\s*(?:passengers?|people|travellers?|travelers?)\b/i)?.[1]) || (lower.includes("parents") ? 3 : 2);
  const large = Number(text.match(/\b(\d+)\s*(?:large|big|checked)(?:\s+(?:suitcases?|bags?))?/i)?.[1]) || 0;
  const small = Number(text.match(/\b(\d+)\s*(?:cabin|small|carry[- ]?on)(?:\s+(?:bags?|suitcases?|luggage))?/i)?.[1]) || 0;
  const destination = text.match(/(?:to|going to|heading to|destination is|drop(?:\s+me|\s+us)?\s+at)\s+([^.,]+)/i)?.[1]?.trim() || "Your destination";
  const origin = text.match(/(?:from|leaving)\s+([^.,]+)/i)?.[1]?.trim() || "Hyderabad";
  const pickup = mode === "flight" ? (lower.includes("hyd") || lower.includes("hyderabad") ? "Hyderabad Airport (HYD)" : "Arrival Airport")
    : mode === "train" ? "Arrival Railway Station"
    : mode === "metro" ? "Nearest Metro Station"
    : "Bus stop";
  return { mode, reference: ref, origin, pickup, destination, passengers, large_bags: large, small_bags: small, travel_date: "today", preference: "comfortable" };
}

function normalizeJourney(journey, originalText) {
  const fallback = fallbackJourney(originalText);
  const result = { ...fallback, ...(journey || {}) };
  result.mode = ["flight", "train", "metro", "bus"].includes(result.mode) ? result.mode : fallback.mode;
  result.reference = String(result.reference || fallback.reference).trim();
  result.origin = String(result.origin || fallback.origin).trim();
  result.pickup = String(result.pickup || fallback.pickup).trim();
  result.destination = String(result.destination || fallback.destination).trim();
  result.passengers = Math.max(1, Math.min(12, Number(result.passengers) || fallback.passengers));
  result.large_bags = Math.max(0, Math.min(20, Number(result.large_bags) || 0));
  result.small_bags = Math.max(0, Math.min(20, Number(result.small_bags) || 0));
  result.travel_date = String(result.travel_date || fallback.travel_date).trim();
  result.preference = String(result.preference || fallback.preference).trim();
  if (result.mode === "flight" && /\b(?:hyderabad|hyd)\b/i.test(originalText)) result.pickup = "Hyderabad Airport (HYD)";
  return result;
}

async function extractJourney(message) {
  const fallback = fallbackJourney(message);
  if (!process.env.GEMINI_API_KEY) return fallback;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const interaction = await ai.interactions.create({
      model,
      input: [
        "You are TravelMateAI's universal journey intent engine.",
        "Extract the user's complete travel request into structured JSON.",
        "Supported modes: flight, train, metro, bus.",
        "Preserve explicit names/numbers. Never invent a real-time status, schedule, fare, hotel, or route.",
        "Infer passengers only when clearly stated; 'my parents' means 3 people including the user.",
        "Count large/checked and cabin/carry-on bags separately when stated.",
        "Use generic labels such as 'Arrival Airport' or 'Arrival Railway Station' when a location is omitted.",
        "If the user says Hyderabad or HYD for a flight, normalize pickup to Hyderabad Airport (HYD).",
        "Return only JSON matching the schema.",
        "",
        "User request:",
        message
      ].join("\n"),
      response_format: { type: "text", mime_type: "application/json", schema: journeySchema }
    });
    return normalizeJourney(JSON.parse(interaction.output_text), message);
  } catch (error) {
    console.error("Gemma extraction failed; using deterministic fallback:", error.message);
    return fallback;
  }
}

function addMinutes(hhmm, minutes) {
  const [hours, mins] = hhmm.split(":").map(Number);
  const total = (hours * 60 + mins + minutes) % 1440;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function demoFlight(reference) {
  const seed = Number(reference.match(/\d+/)?.[0] || "1234") % 37;
  const arrival = 18 * 60 + 15 + seed;
  const time = String(Math.floor(arrival / 60)).padStart(2, "0") + ":" + String(arrival % 60).padStart(2, "0");
  return { reference, status: "En route", arrival_time: time, updated_at: "Demo feed · just now", mode: "demo", provider: "Demo Flight Adapter" };
}

function demoTrain(reference) {
  const seed = Number(reference.match(/\d+/)?.[0] || "12723") % 25;
  const arrival = 17 * 60 + seed;
  const time = String(Math.floor(arrival / 60)).padStart(2, "0") + ":" + String(arrival % 60).padStart(2, "0");
  return { reference, status: seed % 2 ? "On time" : "Approaching", arrival_time: time, updated_at: "Demo feed · just now", mode: "demo", provider: "Demo Rail Adapter" };
}

function demoMetro(reference) {
  return { reference, status: "Running normally", next_train: "6 min", frequency: "6–8 min", updated_at: "Demo feed · just now", mode: "demo", provider: "Demo Metro Adapter" };
}

function demoBus(reference) {
  return { reference, status: "Running", next_bus: "10 min", frequency: "10–15 min", updated_at: "Demo feed · just now", mode: "demo", provider: "Demo Transit Adapter" };
}

function vehicleFor(journey) {
  const seats = Number(journey.passengers || 1);
  const bags = Number(journey.large_bags || 0) + Number(journey.small_bags || 0);
  if (seats <= 3 && bags <= 3) return { type: "Sedan", fare: 549, capacity: "3 passengers · 3 bags" };
  if (seats <= 5 && bags <= 5) return { type: "SUV", fare: 749, capacity: "5 passengers · 5 bags" };
  return { type: "XL Van", fare: 999, capacity: "7 passengers · 8 bags" };
}

function journeyPlan(journey, status) {
  let pickupWindow;
  if (journey.mode === "flight" || journey.mode === "train") {
    pickupWindow = { start: addMinutes(status.arrival_time, 15), end: addMinutes(status.arrival_time, 35), reason: "Pickup is buffered after arrival for exit and baggage/transfer time." };
  } else {
    pickupWindow = { start: "Next service", end: "Within 15 min", reason: "Local transit timing is based on the next scheduled service in this demo." };
  }
  return {
    journey,
    status,
    pickup_window: pickupWindow,
    vehicle: vehicleFor(journey),
    recommendation: journey.mode === "metro" ? "Take the metro to the nearest practical interchange, then use the matched local ride." : "Use the matched vehicle after the arrival window."
  };
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "TravelMateAI", model, features: ["flight", "train", "metro", "bus", "transport", "hotels", "food", "documents", "notifications", "support", "emergency"] }));

app.post("/api/journey/plan", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (message.length < 8) return res.status(400).json({ error: "Describe your journey with a little more detail." });
  if (message.length > 2000) return res.status(400).json({ error: "Please keep the journey description under 2000 characters." });
  try {
    const journey = await extractJourney(message);
    const status = journey.mode === "flight" ? demoFlight(journey.reference)
      : journey.mode === "train" ? demoTrain(journey.reference)
      : journey.mode === "metro" ? demoMetro(journey.reference)
      : demoBus(journey.reference);
    res.json({ ...journeyPlan(journey, status), ai: { provider: process.env.GEMINI_API_KEY ? "Gemma 4" : "deterministic fallback", model } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "The journey planner could not process this request." });
  }
});

app.post("/api/track-flight", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "Please provide your flight and travel details." });
  try {
    const journey = await extractJourney(message);
    journey.mode = "flight";
    const flight = demoFlight(journey.reference);
    res.json({ intent: journey, flight: { flight_number: flight.reference, route: "Tracked arrival → Hyderabad (HYD)", status: flight.status, arrival_time: flight.arrival_time, updated_at: flight.updated_at, mode: flight.mode }, pickup_window: journeyPlan(journey, flight).pickup_window });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "TravelMateAI could not process the flight request." });
  }
});

app.get("/api/trips", (_req, res) => res.json({ trips: stores.bookings }));
app.get("/api/documents", (_req, res) => res.json({ documents: stores.documents }));
app.get("/api/notifications", (_req, res) => res.json({ notifications: stores.notifications, unread: stores.notifications.filter(n => n.unread).length }));

app.get("/api/hotels", (req, res) => {
  const city = String(req.query.city || "Hyderabad");
  res.json({ city, hotels: [
    { id: "H1", name: "City Centre Stay", area: "Banjara Hills", price: 3200, rating: 4.5, amenities: ["Wi-Fi", "Breakfast", "Airport access"] },
    { id: "H2", name: "Metro View Hotel", area: "Hitech City", price: 2800, rating: 4.3, amenities: ["Wi-Fi", "Gym", "Late check-in"] },
    { id: "H3", name: "Airport Transit Hotel", area: "Shamshabad", price: 2400, rating: 4.1, amenities: ["Shuttle", "Wi-Fi", "24h desk"] }
  ]});
});

app.get("/api/food", (req, res) => {
  const preference = String(req.query.preference || "popular");
  res.json({ preference, options: [
    { id: "F1", name: "Hyderabadi Biryani", type: "Local", eta: "25 min", price: 280 },
    { id: "F2", name: "Vegetarian Thali", type: "Vegetarian", eta: "20 min", price: 220 },
    { id: "F3", name: "Quick Airport Meal", type: "Fast", eta: "15 min", price: 190 }
  ]});
});

app.get("/api/transport/options", (req, res) => {
  const from = String(req.query.from || "Hyderabad Airport");
  const to = String(req.query.to || "Banjara Hills");
  res.json({ from, to, options: [
    { type: "Airport Cab", eta: "8 min", price: 549, best_for: "Door-to-door" },
    { type: "Airport Metro/Bus", eta: "15 min", price: 120, best_for: "Budget" },
    { type: "Premium Cab", eta: "6 min", price: 899, best_for: "Comfort" }
  ]});
});

app.post("/api/bookings", (req, res) => {
  const body = req.body || {};
  if (!body.mode || !body.reference || !body.destination || !body.vehicle || !body.pickup_window) {
    return res.status(400).json({ error: "Complete the journey plan before confirming a transfer." });
  }
  const booking = { id: "TM-" + String(Date.now()).slice(-6), created_at: new Date().toISOString(), ...body, status: "confirmed" };
  stores.bookings.push(booking);
  stores.notifications.unshift({ id: "N-" + Date.now(), title: "Ride booked", body: booking.id + " is confirmed.", unread: true });
  res.status(201).json({ booking });
});

app.post("/api/support", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (message.length > 1000) return res.status(400).json({ error: "Please keep your support question under 1000 characters." });
  if (!message) return res.status(400).json({ error: "Ask the AI support team a question." });
  if (!process.env.GEMINI_API_KEY) return res.json({ answer: "TravelMateAI support can help with your journey, transport, pickup timing, hotels, food and documents. Add a Gemini API key for live AI support.", mode: "demo" });
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const interaction = await ai.interactions.create({ model, input: "You are TravelMateAI support. Answer briefly and practically. Do not invent live travel status. User: " + message });
    res.json({ answer: interaction.output_text, mode: "gemma-4" });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "AI support is temporarily unavailable." });
  }
});

app.post("/api/emergency", (req, res) => {
  const { location = "Current journey location", type = "General emergency" } = req.body || {};
  const alert = { id: "EM-" + String(Date.now()).slice(-6), type, location, created_at: new Date().toISOString(), status: "escalation-ready", message: "Emergency request recorded. Contact local emergency services for immediate help." };
  stores.notifications.unshift({ id: alert.id, title: "Emergency request", body: alert.message, unread: true });
  res.status(201).json({ alert });
});

app.post("/api/notifications/read", (req, res) => {
  const id = String(req.body?.id || "");
  if (id) stores.notifications = stores.notifications.map(n => n.id === id ? { ...n, unread: false } : n);
  else stores.notifications = stores.notifications.map(n => ({ ...n, unread: false }));
  res.json({ unread: stores.notifications.filter(n => n.unread).length });
});

app.listen(port, () => console.log("TravelMateAI API running on port " + port + " using " + model));
