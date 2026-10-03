# TravelMateAI ✦

**Your AI companion from touchdown to destination.**

TravelMateAI is an open-source AI-first journey planner for React Hyderabad Hack Day 2026. A traveller describes an entire trip in natural language; **Gemma 4** extracts structured travel intent, and the application turns that intent into a connected journey workspace for flights, trains, metro, buses, pickup/drop planning, vehicle selection and mock booking.

## Core workflow

```text
Natural-language travel request
              ↓
           Gemma 4
              ↓
     Structured journey JSON
              ↓
   Route + date + traveller needs
              ↓
 ┌──────────┬──────────┬───────────┐
 │ Transport│  Pickup  │  Services │
 └──────────┴──────────┴───────────┘
              ↓
   Vehicle options + editable
   passengers/luggage
              ↓
        Mock booking
```

## What the AI actually does

Gemma 4 is part of the core application workflow, not a decorative chatbot. It extracts:

- transport mode: flight, train, metro or bus
- reference number/name
- pickup/origin
- destination/drop
- relative travel date
- passenger count
- large/checked luggage
- cabin/small luggage
- travel preference

The backend validates and normalizes the structured result before using it to build the journey plan.

If the model is unavailable or returns invalid output, a deterministic fallback keeps the demo usable.

## Demo data note

The current hackathon demo uses clearly labelled **demo transport adapters** for flight, train, metro and bus timing. These are not claimed to be live real-world status feeds.

Hotels, food, transport options and vehicle prices are also mock data. The adapter structure is intentionally separated so real providers can be connected later without changing the core journey workflow.

## Tech stack

- React 19 + Vite
- Node.js + Express
- Google GenAI SDK
- **Gemma 4 26B MoE IT** (gemma-4-26b-a4b-it)
- Structured JSON output
- Journey intent extraction and validation
- Editable passenger/luggage requirements
- Vehicle option matching
- Mock booking workflow
- MIT License

## Run locally

Requirements: Node.js 20+ and a Google AI Studio/Gemini API key with access to Gemma 4.

```bash
git clone https://github.com/VegirajuMahaveerVarma/StormBreakers.git
cd StormBreakers
npm install
cp .env.example .env
```

Add your key to .env:

```env
GEMINI_API_KEY=your_key_here
GEMMA_MODEL=gemma-4-26b-a4b-it
PORT=8787
```

Then run:

```bash
npm run dev
```

Open http://localhost:5173.

## Demo flow

1. Enter a natural-language journey.
2. Let Gemma 4 extract the route, date, passengers and luggage.
3. Show the dashboard with clean pickup/drop and travel date.
4. Edit passengers or luggage if needed.
5. Compare Bike, Auto, Sedan, SUV and XL Van options.
6. Select a suitable ride.
7. Confirm the mock transfer.
8. Open My Trips and Notifications to show the connected workflow.

Suggested demo request:

> I'm travelling from Hyderabad to Dubai next Friday. My flight is AI 542 and I'm travelling with my parents. We have 3 large suitcases and 2 cabin bags. We need an airport pickup.



## License

MIT. See LICENSE.

Vehicle prices, transport timing and booking confirmation are intentionally mocked for the hackathon demo. No real cab provider, payment system or passenger service is connected.
