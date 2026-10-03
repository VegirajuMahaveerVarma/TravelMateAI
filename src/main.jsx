import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const examples = [
  "Track flight AI 1234 arriving at Hyderabad today. We are 3 people with 3 large suitcases and 2 cabin bags going to Banjara Hills.",
  "My flight 6E 6421 is arriving at HYD. We are 2 passengers with 2 suitcases and 2 backpacks. Drop us at Hitech City.",
  "Track UK 878 to Hyderabad. Five passengers, 6 large bags, destination Jubilee Hills."
];

function recommendVehicle(intent) {
  const seats = Number(intent.passengers || 1);
  const bags = Number(intent.large_bags || 0) + Number(intent.small_bags || 0);
  if (seats <= 3 && bags <= 3) return { type: "Sedan", icon: "🚘", capacity: "Up to 3 passengers • 3 bags", fare: "₹549" };
  if (seats <= 5 && bags <= 5) return { type: "SUV", icon: "🚙", capacity: "Up to 5 passengers • 5 bags", fare: "₹749" };
  return { type: "XL Van", icon: "🚐", capacity: "Up to 7 passengers • 8 bags", fare: "₹999" };
}

function App() {
  const [message, setMessage] = useState("");
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState("");
  const vehicle = useMemo(() => plan ? recommendVehicle(plan.intent) : null, [plan]);

  async function trackAndPlan() {
    if (!message.trim()) return;
    setLoading(true); setBooked(false); setError("");
    try {
      const response = await fetch("/api/track-flight", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not plan the airport transfer.");
      setPlan(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally { setLoading(false); }
  }

  function useExample(example) {
    setMessage(example); setPlan(null); setBooked(false); setError("");
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
            <div className="eyebrow">AI FLIGHT-TO-RIDE ASSISTANT</div>
            <h1>Track the flight.<br /><em>Time the ride.</em></h1>
            <p>Give TravelMate your flight and travel details. Gemma 4 extracts the trip intent, the flight tracker supplies the arrival status, and the app schedules a cab pickup around touchdown.</p>
            <div className="trust-row"><span>✦ Natural language</span><span>✈ Flight tracking</span><span>↗ Arrival-based ride</span></div>
          </div>
          <div className="hero-card">
            <div className="card-label">HOW IT WORKS</div>
            <div className="flow">
              <div><b>01</b><span>Traveller gives flight details</span></div><i>↓</i>
              <div><b>02</b><span>Gemma extracts trip intent</span></div><i>↓</i>
              <div><b>03</b><span>Arrival status is tracked</span></div><i>↓</i>
              <div><b>04</b><span>Cab pickup is timed</span></div>
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="input-panel panel">
            <div className="panel-heading">
              <div><span className="step">01</span><div><h2>Track my flight & plan my ride</h2><p>No booking forms. Just describe your flight and destination.</p></div></div>
              <span className="ai-badge">GEMMA 4</span>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Example: Track flight AI 1234 arriving at Hyderabad today. We’re 3 people with 3 large suitcases and 2 cabin bags going to Banjara Hills..." rows="6" />
            <div className="examples"><span>Try an example</span>{examples.map((example, index) => <button key={index} onClick={() => useExample(example)}>Example {index + 1}</button>)}</div>
            <button className="primary-btn" onClick={trackAndPlan} disabled={loading || !message.trim()}>
              {loading ? <><span className="spinner" /> Tracking flight & planning…</> : <>Track flight & plan my ride <span>→</span></>}
            </button>
            {error && <div className="error-box">{error}</div>}
          </div>

          <div className="result-panel panel">
            {!plan ? (
              <div className="empty-state">
                <div className="radar"><span>✈</span></div>
                <h3>Your arrival-based ride plan will appear here</h3>
                <p>TravelMateAI combines Gemma's structured trip understanding with flight arrival timing before recommending the cab.</p>
                <div className="mini-code">Flight → ETA → Pickup window → Vehicle → Booking</div>
              </div>
            ) : booked ? (
              <div className="booking-success">
                <div className="success-icon">✓</div>
                <div className="card-label">BOOKING CONFIRMED</div>
                <h2>Your airport transfer is ready.</h2>
                <p>{vehicle.type} • {plan.intent.passengers} passengers • {plan.intent.destination}</p>
                <div className="booking-code">TM-DEMO-{plan.flight.flight_number.replace(/\W/g, "").slice(-4) || "RIDE"}</div>
                <p className="booking-note">Pickup is timed for {plan.pickup_window.start}–{plan.pickup_window.end}, based on the tracked arrival.</p>
                <button className="secondary-btn" onClick={() => setBooked(false)}>View ride details</button>
              </div>
            ) : (
              <div className="result-content">
                <div className="panel-heading result-heading">
                  <div><span className="step">02</span><div><h2>AI + flight understanding</h2><p>Gemma extracts the request, then the flight feed sets the pickup timing.</p></div></div>
                  <span className="live-dot">{plan.flight.mode === "live" ? "LIVE" : "DEMO FEED"}</span>
                </div>
                <div className="flight-card">
                  <div className="flight-top"><div><span className="card-label">FLIGHT TRACKING</span><h2>✈ {plan.flight.flight_number}</h2><p>{plan.flight.route}</p></div><span className="status-badge">{plan.flight.status}</span></div>
                  <div className="flight-stats">
                    <div><span>EST. ARRIVAL</span><strong>{plan.flight.arrival_time}</strong></div>
                    <div><span>ARRIVAL AIRPORT</span><strong>{plan.intent.pickup}</strong></div>
                    <div><span>LAST UPDATE</span><strong>{plan.flight.updated_at}</strong></div>
                  </div>
                </div>
                <div className="intent-grid">
                  <div><span>PASSENGERS</span><strong>{plan.intent.passengers}</strong></div>
                  <div><span>LARGE BAGS</span><strong>{plan.intent.large_bags}</strong></div>
                  <div><span>SMALL BAGS</span><strong>{plan.intent.small_bags}</strong></div>
                  <div className="wide"><span>DESTINATION</span><strong>{plan.intent.destination}</strong></div>
                </div>
                <div className="pickup-window">
                  <div><span className="card-label">ARRIVAL-BASED PICKUP WINDOW</span><h2>{plan.pickup_window.start} – {plan.pickup_window.end}</h2><p>{plan.pickup_window.reason}</p></div>
                  <div className="window-icon">⌁</div>
                </div>
                <div className="json-preview">
                  <div className="json-header"><span>GEMMA MODEL OUTPUT</span><span>application/json</span></div>
                  <pre>{JSON.stringify(plan.intent, null, 2)}</pre>
                </div>
                <div className="recommendation">
                  <div className="recommendation-copy"><span className="step">03</span><div><span className="card-label">RECOMMENDED FOR YOU</span><h2>{vehicle.icon} {vehicle.type}</h2><p>{vehicle.capacity} • pickup after flight arrival</p></div></div>
                  <strong className="fare">{vehicle.fare}</strong>
                </div>
                <button className="primary-btn booking-btn" onClick={() => setBooked(true)}>Confirm airport transfer <span>→</span></button>
              </div>
            )}
          </div>
        </section>

        <section className="architecture">
          <div className="section-label">WHY THE AI MATTERS</div>
          <h2>Flight status changes the booking decision.</h2>
          <div className="arch-flow">
            <div className="arch-node"><span>01</span><b>Flight details</b><small>Traveller gives flight + trip</small></div><div className="arrow">→</div>
            <div className="arch-node active"><span>02</span><b>Gemma 4</b><small>Extracts structured intent</small></div><div className="arrow">→</div>
            <div className="arch-node"><span>03</span><b>Arrival tracking</b><small>Calculates pickup window</small></div><div className="arrow">→</div>
            <div className="arch-node"><span>04</span><b>Cab booking</b><small>Matches vehicle + timing</small></div>
          </div>
        </section>
      </main>
      <footer><span>TravelMateAI</span><span>Built for React Hyderabad Hack Day 2026 • Open Source</span></footer>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
