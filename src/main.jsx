import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const examples=[
  "Track flight AI 1234 arriving at Hyderabad today. We are 3 people with 3 large suitcases and 2 cabin bags going to Banjara Hills.",
  "My flight 6E 6421 is arriving at HYD. We are 2 passengers with 2 suitcases and 2 backpacks. Drop us at Hitech City."
];

function vehicleFor(intent){
  const seats=Number(intent.passengers||1), bags=Number(intent.large_bags||0)+Number(intent.small_bags||0);
  if(seats<=3&&bags<=3)return{type:"Sedan",icon:"🚘",fare:"₹549",capacity:"3 passengers · 3 bags"};
  if(seats<=5&&bags<=5)return{type:"SUV",icon:"🚙",fare:"₹749",capacity:"5 passengers · 5 bags"};
  return{type:"XL Van",icon:"🚐",fare:"₹999",capacity:"7 passengers · 8 bags"};
}

function App(){
  const [message,setMessage]=useState("");
  const [plan,setPlan]=useState(null);
  const [loading,setLoading]=useState(false);
  const [booked,setBooked]=useState(false);
  const [error,setError]=useState("");
  const vehicle=useMemo(()=>plan?vehicleFor(plan.intent):null,[plan]);

  async function planRide(){
    if(!message.trim())return;
    setLoading(true);setError("");setBooked(false);
    try{
      const r=await fetch("/api/track-flight",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:message.trim()})});
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||"Unable to plan this journey.");
      setPlan(data);
    }catch(e){setError(e.message||"Something went wrong.");}
    finally{setLoading(false);}
  }

  function jump(id){document.getElementById(id)?.scrollIntoView({behavior:"smooth"});}
  const progress=plan?100:72;

  return <div className="dashboard">
    <aside className="sidebar">
      <div className="side-brand"><div className="side-logo">✦</div><div><b>travelmate<span>AI</span></b><small>YOUR JOURNEY, CONNECTED</small></div></div>
      <div className="side-label">WORKSPACE</div>
      {[
        ["⌂","Home","home"],
        ["▣","My Trips","trips"],
        ["＋","Plan Journey","planner"],
        ["↗","Transport","planner"],
        ["⌂","Hotels","trips"],
        ["♟","Food","trips"],
        ["✦","Live Journey","tracking"],
        ["✳","AI Support","support"],
        ["♧","Notifications","home"],
        ["▤","Documents","home"],
        ["＋","Emergency","support"]
      ].map(([icon,label,target],i)=><button className={"side-item "+(i===0?"active":"")} key={label} onClick={()=>jump(target)}><span>{icon}</span>{label}{label==="Notifications"&&<em>3</em>}</button>)}
      <div className="side-bottom"><div className="status-dot"/> AI travel assistant online</div>
    </aside>

    <div className="main-area">
      <header className="topbar">
        <div className="crumb">Workspace <span>/</span> <b>Home</b></div>
        <div className="top-actions"><div className="search">⌕ <span>Search anything...</span><kbd>⌘ K</kbd></div><span className="bell">♧</span><div className="avatar">A</div></div>
      </header>

      <main className="content" id="home">
        <section className="welcome-grid">
          <div className="welcome-card">
            <div className="date-label">SATURDAY, 03 OCTOBER 2026</div>
            <h1>Good afternoon, traveller ✦</h1>
            <p>Where are you going next? We'll help with every step.</p>
            <div className="journey-bar">
              <div><small>FROM</small><strong>Hyderabad</strong></div><div className="swap">⇄</div><div><small>TO</small><strong>{plan?.intent?.destination||"Your destination"}</strong></div>
              <div><small>TRAVEL DATE</small><strong>Today</strong></div>
              <button onClick={()=>jump("planner")}>Plan journey →</button>
            </div>
          </div>
          <div className="readiness card">
            <div className="card-title"><b>Journey readiness</b><strong>{progress}<small>%</small></strong></div>
            <div className="progress"><i style={{width:progress+"%"}}/></div>
            <div className="checks"><span>✓ Flight details {plan?"ready":"saved"}</span><span>✓ Arrival pickup</span><span>✓ Vehicle matching</span><span>◌ Local transport</span><span>✓ AI support</span><span>◌ Hotel & food</span></div>
            <small className="note">A planning estimate, not a safety guarantee.</small>
          </div>
        </section>

        <section className="section-head" id="trips"><div><h2>Your next journey</h2><p>One place for your flight, arrival and ride.</p></div><button>All trips →</button></section>
        <section className="trip-grid">
          <div className="trip-card card">
            <div className="trip-top"><div className="trip-icon">✈</div><div><b>{plan?.flight?.flight_number||"HYD ARRIVAL"}</b><small>Hyderabad → {plan?.intent?.destination||"Destination"}</small></div><span>AI planned</span></div>
            <div className="timeline"><div className="done">✓</div><div className="line"/><div className={plan?"done":"current"}>{plan?"✓":"2"}</div><div className="line"/><div className={plan?"done":"pending"}>{plan?"✓":"3"}</div><div className="line"/><div className="pending">4</div></div>
            <div className="timeline-labels"><span>Flight<br/><small>{plan?"Tracked":"Ready"}</small></span><span>Pickup<br/><small>{plan?"Timed":"Plan"}</small></span><span>Vehicle<br/><small>{plan?"Matched":"Select"}</small></span><span>Local ride<br/><small>To arrange</small></span></div>
            <button className="open-btn" onClick={()=>jump("planner")}>Open journey →</button>
          </div>
          <div className="suggestions">
            <h2>Suggested next step <small>FOR YOUR TRIP</small></h2>
            <div className="suggestion card" onClick={()=>jump("planner")}><div>🚕</div><section><b>Plan your airport pickup</b><small>Track arrival and match a vehicle around touchdown.</small></section><button>Explore</button></div>
            <div className="quick"><h3>Quick access</h3><div><article onClick={()=>jump("trips")}>▤<b>Travel docs<small>3 ready</small></b></article><article onClick={()=>jump("tracking")}>♧<b>Updates<small>{plan?"Live plan":"3 updates"}</small></b></article></div></div>
          </div>
        </section>

        <section className="planner-section" id="planner">
          <div className="section-head"><div><h2>AI journey planner</h2><p>Describe your flight and needs naturally. Gemma turns it into an actionable ride plan.</p></div><span className="gemma-tag">✦ GEMMA 4</span></div>
          <div className="planner-grid">
            <div className="planner-input card">
              <label>YOUR TRAVEL REQUEST</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Example: Track AI 1234 arriving at Hyderabad. We are 3 people with 3 large bags going to Banjara Hills..." rows="6"/>
              <div className="examples">{examples.map((x,i)=><button key={i} onClick={()=>setMessage(x)}>Example {i+1}</button>)}</div>
              <button className="plan-btn" disabled={loading||!message.trim()} onClick={planRide}>{loading?"Understanding & tracking…":"Plan my journey →"}</button>
              {error&&<div className="error-box">{error}</div>}
            </div>
            <div className="plan-result card">
              {!plan&&!booked?<div className="empty"><div>✈</div><h3>Your live plan will appear here</h3><p>Flight → Gemma intent → arrival timing → pickup → vehicle</p></div>:
              booked?<div className="confirmed"><div>✓</div><label>BOOKING CONFIRMED</label><h2>Airport transfer ready</h2><p>{vehicle.type} · {plan.intent.destination}</p><b>TM-DEMO-{plan.flight.flight_number.replace(/\W/g,"").slice(-4)||"RIDE"}</b><button onClick={()=>setBooked(false)}>View ride details</button></div>:
              <div className="result"><div className="result-top"><div><label>FLIGHT TRACKING</label><h2>✈ {plan.flight.flight_number}</h2><small>{plan.flight.status} · {plan.flight.arrival_time} arrival</small></div><span>DEMO FEED</span></div>
                <div className="stat-row"><div><small>PASSENGERS</small><b>{plan.intent.passengers}</b></div><div><small>BAGS</small><b>{Number(plan.intent.large_bags)+Number(plan.intent.small_bags)}</b></div><div><small>PICKUP</small><b>{plan.pickup_window.start}–{plan.pickup_window.end}</b></div></div>
                <div className="route-row"><span>{plan.intent.pickup}</span><b>→</b><span>{plan.intent.destination}</span></div>
                <div className="vehicle-row"><div><label>AI VEHICLE MATCH</label><h2>{vehicle.icon} {vehicle.type}</h2><small>{vehicle.capacity}</small></div><strong>{vehicle.fare}</strong></div>
                <button className="plan-btn" onClick={()=>setBooked(true)}>Confirm airport pickup →</button>
              </div>}
            </div>
          </div>
        </section>

        <section className="live-section" id="tracking"><div className="section-head"><div><h2>Live journey</h2><p>Arrival-aware travel assistance, not just a chatbot.</p></div><span className="live-chip">● {plan?"PLAN READY":"STANDBY"}</span></div><div className="live-cards"><article className="card"><span>FLIGHT</span><b>{plan?.flight?.flight_number||"Waiting for flight"}</b><small>{plan?.flight?.status||"Add a flight in the planner"}</small></article><article className="card"><span>PICKUP WINDOW</span><b>{plan?.pickup_window?plan.pickup_window.start+" – "+plan.pickup_window.end:"—"}</b><small>Based on estimated touchdown</small></article><article className="card"><span>AI SUPPORT</span><b>Ready 24/7</b><small>Natural-language travel planning</small></article></div></section>
      </main>
    </div>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);
