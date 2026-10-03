import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const examples = [
  "I just landed at Hyderabad airport. I’m travelling with my parents, 3 large suitcases and 2 cabin bags. We’re going to Banjara Hills.",
  "We are 2 people with 2 suitcases and 2 backpacks. Pick us up from Hyderabad airport and take us to Hitech City.",
  "I have 5 passengers and 6 large bags. We need an airport transfer from HYD to Jubilee Hills."
];

function recommendVehicle(intent) {
  const seats = Number(intent.passengers || 1);
  const bags = Number(intent.large_bags || 0) + Number(intent.small_bags || 0);
  if (seats <= 3 && bags <= 3) return { type: "Sedan", icon: "🚘", capacity: "Up to 3 passengers • 3 bags", fare: "₹549", eta: "4–7 min" };
  if (seats <= 5 && bags <= 5) return { type: "SUV", icon: "🚙", capacity: "Up to 5 passengers • 5 bags", fare: "₹749", eta: "6–9 min" };
  return { type: "XL Van", icon: "🚐", capacity: "Up to 7 passengers • 8 bags", fare: "₹999", eta: "8–12 min" };
}

function App() {
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState("");
  const vehicle = useMemo(() => intent ? recommendVehicle(intent) : null, [intent]);

  async function understandJourney() {
    if (!message.trim()) return;
    setLoading(true); setBooked(false); setError("");
    try {
      const response = await fetch("/api/understand-trip", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not understand the trip.");
      setIntent(data.intent);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally { setLoading(false); }
  }

  function useExample(example) {
    setMessage(example); setIntent(null); setBooked(false); setError("");
  }

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <div><strong>TravelMate<span>AI</span></strong><small>Touchdown to destination</small></div>
        </div>
        <div className="model-pill"><span className="pulse" /> Powered by Gemma 4</div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">AI AIRPORT TRANSFER ASSISTANT</div>
            <h1>Land. Tell us your plan.<br /><em>We’ll handle the ride.</em></h1>
            <p>Describe your journey naturally. TravelMateAI uses Gemma 4 to understand passengers, luggage, pickup and destination — then turns that intent into a vehicle recommendation.</p>
            <div className="trust-row"><span>✦ Natural language</span><span>▣ Structured intent</span><span>↗ Smart vehicle match</span></div>
          </div>
          <div className="hero-card">
            <div className="card-label">HOW IT WORKS</div>
            <div className="flow">
              <div><b>01</b><span>Traveller describes trip</span></div><i>↓</i>
              <div><b>02</b><span>Gemma extracts intent</span></div><i>↓</i>
              <div><b>03</b><span>App recommends a ride</span></div>
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="input-panel panel">
            <div className="panel-heading">
              <div><span className="step">01</span><div><h2>Tell TravelMate your journey</h2><p>No forms. Just describe what you need.</p></div></div>
              <span className="ai-badge">GEMMA 4</span>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Example: I just landed at Hyderabad airport with my parents, 3 suitcases and 2 cabin bags. We’re going to Banjara Hills..." rows="6" />
            <div className="examples"><span>Try an example</span>{examples.map((example, index) => <button key={index} onClick={() => useExample(example)}>Example {index + 1}</button>)}</div>
            <button className="primary-btn" onClick={understandJourney} disabled={loading || !message.trim()}>
              {loading ? <><span className="spinner" /> Understanding your trip…</> : <>Understand my journey <span>→</span></>}
            </button>
            {error && <div className="error-box">{error}</div>}
          </div>

          <div className="result-panel panel">
            {!intent && !booked ? (
              <div className="empty-state">
                <div className="radar"><span>✦</span></div>
                <h3>Your ride plan will appear here</h3>
                <p>Give TravelMateAI a natural-language travel request and the AI will turn it into structured trip data.</p>
                <div className="mini-code">AI → Intent JSON → Recommendation → Booking</div>
              </div>
            ) : booked ? (
              <div className="booking-success">
                <div className="success-icon">✓</div>
                <div className="card-label">BOOKING CONFIRMED</div>
                <h2>Your airport transfer is ready.</h2>
                <p>{vehicle.type} • {intent.passengers} passengers • {intent.pickup} → {intent.destination}</p>
                <div className="booking-code">TM-DEMO</div>
                <button className="secondary-btn" onClick={() => setBooked(false)}>View ride details</button>
              </div>
            ) : (
              <div className="result-content">
                <div className="panel-heading result-heading">
                  <div><span className="step">02</span><div><h2>AI trip understanding</h2><p>Structured output generated from your message.</p></div></div>
                  <span className="live-dot">LIVE</span>
                </div>
                <div className="intent-grid">
                  <div><span>PASSENGERS</span><strong>{intent.passengers}</strong></div>
                  <div><span>LARGE BAGS</span><strong>{intent.large_bags}</strong></div>
                  <div><span>SMALL BAGS</span><strong>{intent.small_bags}</strong></div>
                  <div className="wide"><span>ROUTE</span><strong>{intent.pickup} <b>→</b> {intent.destination}</strong></div>
                </div>
                <div className="json-preview">
                  <div className="json-header"><span>MODEL OUTPUT</span><span>application/json</span></div>
                  <pre>{JSON.stringify(intent, null, 2)}</pre>
                </div>
                <div className="recommendation">
                  <div className="recommendation-copy"><span className="step">03</span><div><span className="card-label">RECOMMENDED FOR YOU</span><h2>{vehicle.icon} {vehicle.type}</h2><p>{vehicle.capacity} • arrives in {vehicle.eta}</p></div></div>
                  <strong className="fare">{vehicle.fare}</strong>
                </div>
                <button className="primary-btn booking-btn" onClick={() => setBooked(true)}>Confirm airport transfer <span>→</span></button>
              </div>
            )}
          </div>
        </section>

        <section className="architecture">
          <div className="section-label">WHY THE AI MATTERS</div>
          <h2>AI is the decision layer, not decoration.</h2>
          <div className="arch-flow">
            <div className="arch-node"><span>01</span><b>Natural language</b><small>Traveller explains needs</small></div><div className="arrow">→</div>
            <div className="arch-node active"><span>02</span><b>Gemma 4</b><small>Extracts structured intent</small></div><div className="arrow">→</div>
            <div className="arch-node"><span>03</span><b>Recommendation</b><small>App chooses vehicle class</small></div><div className="arrow">→</div>
            <div className="arch-node"><span>04</span><b>Booking</b><small>Mock transfer confirmation</small></div>
          </div>
        </section>
      </main>
      <footer><span>TravelMateAI</span><span>Built for React Hyderabad Hack Day 2026 • Open Source</span></footer>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
