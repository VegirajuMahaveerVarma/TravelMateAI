# TravelMateAI ✦

**Track the flight. Time the ride.**

TravelMateAI is an open-source airport transfer assistant for React Hyderabad Hack Day 2026. A traveller gives a flight and trip request in natural language; **Gemma 4** extracts structured intent, a flight-tracking adapter supplies arrival timing, and the application turns that arrival into a pickup window and cab recommendation.

## Core workflow

~~~text
Flight + traveller request
          ↓
       Gemma 4
          ↓
Structured trip intent (JSON)
          ↓
Flight arrival status
          ↓
Arrival-based pickup window
          ↓
Vehicle recommendation
          ↓
Mock cab booking
~~~

## Important demo note

The current local demo uses a clearly labelled **demo flight feed** so the complete workflow works with only the Gemini API key. The backend isolates the tracking adapter in the demoFlightStatus function.

For production, replace that adapter with a real flight-data provider such as FlightAware AeroAPI and map its estimated/actual arrival fields into the same response shape.

No live flight status is claimed by the demo feed.

## Tech stack

- React + Vite
- Node.js + Express
- Google GenAI SDK
- **Gemma 4 26B MoE IT** (gemma-4-26b-a4b-it)
- Structured JSON output
- Flight tracking adapter
- Arrival-based pickup calculation
- Mock vehicle recommendation + booking
- MIT License

## Run locally

Requirements: Node.js 20+ and a Google AI Studio/Gemini API key with access to Gemma 4.

~~~bash
git clone https://github.com/VegirajuMahaveerVarma/StormBreakers.git
cd StormBreakers
npm install
cp .env.example .env
~~~

Add your key to .env:

~~~env
GEMINI_API_KEY=your_key_here
GEMMA_MODEL=gemma-4-26b-a4b-it
PORT=8787
~~~

Then run:

~~~bash
npm run dev
~~~

Open http://localhost:5173.

## Demo script

1. Enter a flight, arrival airport, passenger/luggage details and destination in natural language.
2. Click **Track flight & plan my ride**.
3. Show Gemma's structured JSON.
4. Show the tracked flight card and estimated arrival.
5. Show the calculated pickup window after touchdown.
6. Show how passenger + luggage intent determines the vehicle.
7. Confirm the mock airport transfer.
8. Point to the architecture section and this README.

Suggested demo request:

> Track flight AI 1234 arriving at Hyderabad today. We are 3 people with 3 large suitcases and 2 cabin bags going to Banjara Hills.

## Submission checklist

- [x] AI is central to the workflow.
- [x] Open-source project license included.
- [x] Gemma 4 is explicitly identified.
- [x] Structured model output is consumed by application logic.
- [x] Flight-to-arrival-to-cab workflow is demonstrated.
- [x] Arrival-based pickup window is calculated.
- [x] End-to-end mock booking flow included.
- [ ] Connect a live flight provider before claiming live tracking in production.
- [ ] Make repository public before submission if required by the challenge.
- [ ] Add the final demo URL and screenshots before submission.

## License

MIT. See LICENSE.

Vehicle prices and booking confirmation are intentionally mocked for the hackathon demo. No real cab provider, payment, or passenger service is connected.
