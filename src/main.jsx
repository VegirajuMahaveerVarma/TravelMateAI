import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const examples=[
  "Track flight AI 1234 arriving at Hyderabad today. We are 3 people with 3 large suitcases and 2 cabin bags going to Banjara Hills.",
  "My flight 6E 6421 is arriving at HYD. We are 2 passengers with 2 suitcases and 2 backpacks. Drop us at Hitech City."
];

function vehicleFor(intent){
  const seats=Number(intent?.passengers||1), large=Number(intent?.large_bags||0), small=Number(intent?.small_bags||0), bags=large+small;
  if(seats<=1&&large===0&&small<=1)return{type:"Bike",icon:"🏍️",fare:199,capacity:"1 passenger · 1 small bag"};
  if(seats<=3&&large<=1&&small<=2)return{type:"Auto",icon:"🛺",fare:299,capacity:"3 passengers · 2 bags"};
  if(seats<=3&&large<=1&&small<=3)return{type:"Sedan",icon:"🚘",fare:549,capacity:"3 passengers · 3 bags"};
  if(seats<=5&&large<=3&&small<=5)return{type:"SUV",icon:"🚙",fare:749,capacity:"5 passengers · 5 bags"};
  return{type:"XL Van",icon:"🚐",fare:999,capacity:"7 passengers · 8 bags"};
}
function vehicleIcon(type){return ({Bike:"🏍️",Auto:"🛺",Sedan:"🚘",SUV:"🚙","XL Van":"🚐"}[type]||"🚘");}
function displayDate(value){
  if(!value)return "Today";
  return String(value).replace(/\b(next|this)\s+([a-z])/i,(_,prefix,letter)=>prefix+" "+letter.toUpperCase()+String(value).slice(String(value).toLowerCase().indexOf(letter)+1));
}

function App(){
  const [message,setMessage]=useState("");
  const [plan,setPlan]=useState(null);
  const [loading,setLoading]=useState(false);
  const [booked,setBooked]=useState(false);
  const [error,setError]=useState("");
  const [service,setService]=useState({type:"hotels",data:null,loading:false});
  const [trips,setTrips]=useState([]);
  const [unread,setUnread]=useState(3);
  const [activeNav,setActiveNav]=useState("home");
  const [supportQuestion,setSupportQuestion]=useState("");
  const [supportAnswer,setSupportAnswer]=useState("");
  const [started,setStarted]=useState(false);
  const vehicle=useMemo(()=>plan?.selectedVehicle||vehicleFor(plan?.journey||plan?.intent),[plan]);
  function updateJourneyField(field,value){
    setPlan(prev=>{
      if(!prev?.journey)return prev;
      const journey={...prev.journey,[field]:Math.max(0,Number(value)||0)};
      if(field==="passengers")journey.passengers=Math.max(1,Math.min(12,Number(value)||1));
      if(field==="large_bags"||field==="small_bags")journey[field]=Math.min(20,Math.max(0,Number(value)||0));
      const options=prev.vehicle_options||[];
      const next=options.find(o=>o.type===prev.selectedVehicle?.type && o.available);
      return {...prev,journey,vehicle_options:options.map(o=>({...o,available:journey.passengers<=o.max_passengers&&journey.large_bags<=o.max_large_bags&&journey.small_bags<=o.max_small_bags})),selectedVehicle:next||undefined};
    });
  }
  function selectVehicle(option){
    if(!option.available)return;
    setPlan(prev=>({...prev,selectedVehicle:{type:option.type,icon:option.icon||vehicleIcon(option.type),fare:option.fare,capacity:option.capacity}}));
  }

  async function planRide(){
    if(!message.trim())return;
    setLoading(true);setError("");setBooked(false);
    try{
      const r=await fetch("/api/journey/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:message.trim()})});
      const data=await r.json(); if(!r.ok)throw new Error(data.error||"Unable to plan this journey.");
      setPlan(data); setBooked(false); setStarted(true);
    }catch(e){setError(e.message||"Something went wrong.");}finally{setLoading(false);}
  }
  function jump(id){
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function resetPlanner(){
    setMessage("");
    setPlan(null);
    setBooked(false);
    setError("");
    setActiveNav("planner");
    setTimeout(()=>document.getElementById("planner")?.scrollIntoView({behavior:"smooth",block:"start"}),0);
  }
  async function loadTrips(){
    try{
      const r=await fetch("/api/trips"); const data=await r.json();
      setTrips(data.trips||[]);
      setActiveNav("trips");
      jump("trips");
    }catch(e){setError("Could not load your trips.");}
  }
  async function loadService(type){
    setService({type,data:null,loading:true});
    try{
      const city=encodeURIComponent(plan?.journey?.destination||"Hyderabad");
      const from=encodeURIComponent(plan?.journey?.pickup||"Hyderabad Airport");
      const to=encodeURIComponent(plan?.journey?.destination||"Banjara Hills");
      const urls={hotels:"/api/hotels?city="+city,food:"/api/food?preference=popular",transport:"/api/transport/options?from="+from+"&to="+to,documents:"/api/documents",notifications:"/api/notifications"};
      const r=await fetch(urls[type]); const data=await r.json(); setService({type,data,loading:false});
      if(type==="notifications") {
        setUnread(data.unread||0);
      }
      setActiveNav("services");
      jump("services");
    }catch(e){setService({type,data:{error:e.message},loading:false});}
  }
  async function askSupport(){
    const question=supportQuestion.trim(); if(!question)return;
    const r=await fetch("/api/support",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:question})});
    const data=await r.json(); setSupportAnswer(data.answer||data.error||"Support is unavailable.");
  }
  async function emergency(){
    const r=await fetch("/api/emergency",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"Travel emergency",location:"Current journey"})});
    const data=await r.json(); alert(data.alert?.message||"Emergency request recorded.");
  }
  async function confirmBooking(){
    const r=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:plan.journey.mode,reference:plan.journey.reference,destination:plan.journey.destination,vehicle:vehicle.type,fare:vehicle.fare,pickup_window:plan.pickup_window,passengers:j.passengers,large_bags:j.large_bags,small_bags:j.small_bags})});
    if(r.ok){
      const data=await r.json();
      setBooked(true);
      setTrips(prev=>[data.booking,...prev]);
      setUnread(x=>x+1);
    } else {
      const data=await r.json().catch(()=>({}));
      setError(data.error||"Could not confirm the booking.");
    }
  }
  if(!started) return <div className="travel-intro">
    <div className="intro-glow"/>
    <header className="intro-nav">
      <div className="side-brand"><div className="side-logo">✦</div><div><b>travelmate<span>AI</span></b><small>YOUR JOURNEY, CONNECTED</small></div></div>
      <div className="intro-model">✦ POWERED BY GEMMA 4</div>
    </header>
    <main className="intro-main">
      <div className="intro-eyebrow">YOUR AI TRAVEL COMPANION</div>
      <h1>Tell us about your<br/><em>journey.</em></h1>
      <p className="intro-sub">Flights, trains, metro, buses, hotels, pickups and more. Just describe your trip naturally — TravelMateAI will figure out what you need.</p>
      <div className="intro-box">
        <div className="intro-box-top"><span>✦</span><b>Describe your travel plans</b><small>AI understands natural language</small></div>
        <textarea value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")planRide();}} placeholder="Example: I'm travelling from Hyderabad to Mumbai next Friday. My flight is AI 542 and I'm travelling with my parents. We have 3 large suitcases and 2 cabin bags. We need an airport pickup, a hotel near Andheri and local transport..." rows="7"/>
        <div className="intro-examples">
          <button onClick={()=>setMessage("I'm travelling from Hyderabad to Mumbai next Friday. My flight is AI 542 and I'm travelling with my parents. We have 3 large suitcases and 2 cabin bags. We need an airport pickup and a hotel near Andheri.")}>✈ Full trip</button>
          <button onClick={()=>setMessage("Track train 12723 arriving at Secunderabad tomorrow. We are 3 people with 2 bags and need a cab to Banjara Hills.")}>🚆 Train journey</button>
          <button onClick={()=>setMessage("Take the Hyderabad metro from Ameerpet to Hitech City for 2 passengers, then help me find a cab to my destination.")}>🚇 Metro journey</button>
        </div>
        <button className="intro-btn" disabled={loading||!message.trim()} onClick={planRide}>
          {loading?<><span className="intro-spinner"/> Understanding your journey…</>:<>Build my journey <span>→</span></>}
        </button>
        {error&&<div className="error-box">{error}</div>}
        <div className="intro-hint">Press <b>Ctrl + Enter</b> to continue</div>
      </div>
      <div className="intro-capabilities">
        <div><span>01</span><b>Understand</b><small>Gemma extracts your travel intent</small></div>
        <div><span>02</span><b>Connect</b><small>Matches transport, stays and services</small></div>
        <div><span>03</span><b>Plan</b><small>Creates one journey workspace</small></div>
      </div>
    </main>
    <footer className="intro-footer"><span>TravelMateAI</span><span>One prompt. One connected journey.</span></footer>
  </div>;

  const progress=plan?100:72, j=plan?.journey;
  return <div className="dashboard">
    <aside className="sidebar">
      <div className="side-brand"><div className="side-logo">✦</div><div><b>travelmate<span>AI</span></b><small>YOUR JOURNEY, CONNECTED</small></div></div>
      <div className="side-label">WORKSPACE</div>
      {[["⌂","Home","home"],["▣","My Trips","trips"],["＋","Plan Journey","planner"],["↗","Transport","services"],["⌂","Hotels","services"],["♟","Food","services"],["✦","Live Journey","tracking"],["✳","AI Support","support"],["♧","Notifications","services"],["▤","Documents","services"],["＋","Emergency","emergency"]].map(([icon,label,target],i)=>{
        const action=label==="My Trips"?loadTrips:label==="Hotels"?()=>loadService("hotels"):label==="Food"?()=>loadService("food"):label==="Transport"?()=>loadService("transport"):label==="Notifications"?()=>loadService("notifications"):label==="Documents"?()=>loadService("documents"):label==="Emergency"?emergency:()=>jump(target);
        return <button className={"side-item "+((activeNav===target&&i<3)||(activeNav==="services"&&["Transport","Hotels","Food","Notifications","Documents"].includes(label))||(activeNav==="emergency"&&label==="Emergency")?"active":"")} key={label} onClick={action}><span>{icon}</span>{label}{label==="Notifications"&&unread>0&&<em>{unread}</em>}</button>
      })}
      <div className="side-bottom"><div className="status-dot"/> AI travel assistant online</div>
    </aside>
    <div className="main-area">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>Home</b></div><div className="top-actions"><div className="search">⌕ <span>Search anything...</span><kbd>⌘ K</kbd></div><span className="bell">♧</span><div className="avatar">A</div></div></header>
      <main className="content" id="home">
        <section className="welcome-grid">
          <div className="welcome-card"><div className="date-label">SATURDAY, 03 OCTOBER 2026</div><h1>Good afternoon, traveller ✦</h1><p>Where are you going next? We'll help with every step.</p><div className="journey-bar"><div><small>FROM / PICKUP</small><strong>{j?.pickup||j?.origin||"Your pickup"}</strong></div><div className="swap">⇄</div><div><small>TO / DROP</small><strong>{j?.destination||"Your destination"}</strong></div><div><small>TRAVEL DATE</small><strong>{displayDate(j?.travel_date)}</strong></div><button onClick={()=>jump("planner")}>Plan journey →</button></div></div>
          <div className="readiness card"><div className="card-title"><b>Journey readiness</b><strong>{progress}<small>%</small></strong></div><div className="progress"><i style={{width:progress+"%"}}/></div><div className="checks"><span>✓ Journey details</span><span>✓ Arrival pickup</span><span>✓ Vehicle matching</span><span>✓ Local transport</span><span>✓ AI support</span><span>✓ Travel services</span></div><small className="note">A planning estimate, not a safety guarantee.</small></div>
        </section>
        <section className="section-head" id="trips"><div><h2>Your trips</h2><p>One place for flight, train, metro, bus, arrival and ride planning.</p></div><button onClick={resetPlanner}>Plan another →</button></section>
        <section className="trip-history card">
          {trips.length===0?<div className="history-empty"><b>No confirmed trips yet.</b><span>Your next confirmed transfer will appear here.</span></div>:trips.map(t=><article key={t.id} className="history-row"><div><b>{t.reference}</b><span>{String(t.mode||"").toUpperCase()} · {t.destination}</span></div><strong>{t.vehicle}</strong><span>₹{t.fare}</span><em>{t.status}</em></article>)}
        </section>
        <section className="section-head" id="next-journey"><div><h2>Your next journey</h2><p>Your active AI-planned journey and its connected services.</p></div><button onClick={resetPlanner}>Plan another →</button></section>
        <section className="trip-grid">
          <div className="trip-card card"><div className="trip-top"><div className="trip-icon">✈</div><div><b>{j?.reference||"YOUR NEXT JOURNEY"}</b><small>{j?.mode?j.mode.toUpperCase():"Flight / Train / Metro / Bus"} → {j?.destination||"Destination"}</small></div><span>AI planned</span></div><div className="timeline"><div className="done">✓</div><div className="line"/><div className={plan?"done":"current"}>{plan?"✓":"2"}</div><div className="line"/><div className={plan?"done":"pending"}>{plan?"✓":"3"}</div><div className="line"/><div className="pending">4</div></div><div className="timeline-labels"><span>Journey<br/><small>{plan?"Understood":"Ready"}</small></span><span>Arrival<br/><small>{plan?"Tracked":"Plan"}</small></span><span>Vehicle<br/><small>{plan?"Matched":"Select"}</small></span><span>Local ride<br/><small>To arrange</small></span></div><button className="open-btn" onClick={()=>jump("planner")}>Open journey →</button></div>
          <div className="suggestions"><h2>Suggested next step <small>FOR YOUR TRIP</small></h2><div className="suggestion card" onClick={()=>jump("planner")}><div>🚕</div><section><b>Plan your arrival pickup</b><small>Track flight/train arrival and match a vehicle around it.</small></section><button>Explore</button></div><div className="quick"><h3>Quick access</h3><div><article onClick={()=>loadService("documents")}>▤<b>Travel docs<small>3 ready</small></b></article><article onClick={()=>loadService("notifications")}>♧<b>Updates<small>Workspace</small></b></article></div></div></div>
        </section>
        <section className="planner-section" id="planner"><div className="section-head"><div><h2>AI journey planner</h2><p>Flights, trains, metro and buses use the same Gemma-powered backend.</p></div><span className="gemma-tag">✦ GEMMA 4</span></div>
          <div className="planner-grid"><div className="planner-input card"><label>YOUR TRAVEL REQUEST</label><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Try: Track train 12723 arriving at Secunderabad. We are 3 people going to Banjara Hills." rows="6"/><div className="examples">{examples.map((x,i)=><button key={i} onClick={()=>setMessage(x)}>Flight example {i+1}</button>)}<button onClick={()=>setMessage("Track train 12723 arriving at Secunderabad today. We are 3 people with 2 bags going to Banjara Hills.")}>Train example</button><button onClick={()=>setMessage("Take the Hyderabad metro from Ameerpet to Hitech City for 2 passengers.")}>Metro example</button></div><button className="plan-btn" disabled={loading||!message.trim()} onClick={planRide}>{loading?"Understanding journey…":"Plan my journey →"}</button>{error&&<div className="error-box">{error}</div>}</div>
            <div className="plan-result card">{!plan&&!booked?<div className="empty"><div>✈</div><h3>Your journey plan will appear here</h3><p>Gemma → mode → arrival/service timing → pickup → vehicle</p></div>:booked?<div className="confirmed"><div>✓</div><label>BOOKING CONFIRMED</label><h2>Journey transfer ready</h2><p>{vehicle.type} · {j?.destination}</p><b>TM-DEMO-{String(j?.reference||"RIDE").replace(/\W/g,"").slice(-4)}</b><button onClick={()=>setBooked(false)}>View ride details</button></div>:<div className="result"><div className="result-top"><div><label>{j?.mode?.toUpperCase()} TRACKING</label><h2>✦ {j?.reference}</h2><small>{plan.status.status} · {plan.status.arrival_time||plan.status.next_train||plan.status.next_bus||"service active"}</small></div><span>DEMO ADAPTER</span></div><div className="editable-stats">
              <div className="edit-stat"><label>PASSENGERS</label><div className="stepper"><button onClick={()=>updateJourneyField("passengers",Math.max(1,Number(j.passengers)-1))}>−</button><b>{j.passengers}</b><button onClick={()=>updateJourneyField("passengers",Math.min(12,Number(j.passengers)+1))}>+</button></div></div>
              <div className="edit-stat"><label>LARGE BAGS</label><div className="stepper"><button onClick={()=>updateJourneyField("large_bags",Math.max(0,Number(j.large_bags)-1))}>−</button><b>{j.large_bags}</b><button onClick={()=>updateJourneyField("large_bags",Math.min(20,Number(j.large_bags)+1))}>+</button></div></div>
              <div className="edit-stat"><label>CABIN BAGS</label><div className="stepper"><button onClick={()=>updateJourneyField("small_bags",Math.max(0,Number(j.small_bags)-1))}>−</button><b>{j.small_bags}</b><button onClick={()=>updateJourneyField("small_bags",Math.min(20,Number(j.small_bags)+1))}>+</button></div></div>
              <div className="edit-stat pickup-stat"><label>PICKUP</label><b>{plan.pickup_window.start}–{plan.pickup_window.end}</b></div>
            </div>
            <div className="vehicle-options"><div className="options-title"><label>CHOOSE YOUR RIDE</label><small>Options update with passengers and bags</small></div><div className="vehicle-option-grid">{(plan.vehicle_options||[vehicle]).map(option=><button key={option.type} disabled={!option.available} className={"vehicle-option "+(vehicle.type===option.type?"selected":"")+(option.available?"":" unavailable")} onClick={()=>selectVehicle(option)}><span className="vehicle-option-icon">{option.icon||vehicleIcon(option.type)}</span><span><b>{option.type}</b><small>{option.capacity}</small></span><strong>₹{option.fare}</strong></button>)}</div></div><div className="route-row"><span>{j?.pickup}</span><b>→</b><span>{j?.destination}</span></div><div className="vehicle-row"><div><label>SELECTED RIDE</label><h2>{vehicle.icon} {vehicle.type}</h2><small>{vehicle.capacity} · {plan.recommendation}</small></div><strong>₹{vehicle.fare}</strong></div><button className="plan-btn" disabled={booked} onClick={confirmBooking}>{booked?"Transfer confirmed ✓":"Confirm transfer →"}</button></div>}</div>
          </div>
        </section>
        <section className="services-section" id="services"><div className="section-head"><div><h2>Travel services</h2><p>Backend-powered features beyond transport tracking.</p></div><div className="service-tabs">{["hotels","food","transport","documents","notifications"].map(x=><button key={x} onClick={()=>loadService(x)} className={service.type===x?"selected":""}>{x}</button>)}</div></div>
          <div className="service-result card">{service.loading?<div className="empty"><div>◌</div><h3>Loading {service.type}…</h3></div>:service.data?.hotels?<div className="service-list">{service.data.hotels.map(x=><article key={x.id}><b>{x.name}</b><span>{x.area} · ★ {x.rating}</span><strong>₹{x.price}/night</strong><small>{x.amenities.join(" · ")}</small></article>)}</div>:service.data?.options?<div className="service-list">{service.data.options.map(x=><article key={x.id||x.type}><b>{x.type||x.name}</b><span>{x.best_for||x.type}</span><strong>{x.price?"₹"+x.price:x.eta}</strong><small>{x.eta||x.frequency}</small></article>)}</div>:service.data?.documents?<div className="service-list">{service.data.documents.map(x=><article key={x.id}><b>{x.name}</b><span>{x.id}</span><strong>{x.status}</strong><small>Stored in your travel workspace</small></article>)}</div>:service.data?.notifications?<div className="service-list">{service.data.notifications.map(x=><article key={x.id}><b>{x.title}</b><span>{x.unread?"Unread":"Read"}</span><small>{x.body}</small></article>)}<button className="plan-btn" onClick={async()=>{const r=await fetch("/api/notifications/read",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});const d=await r.json();setUnread(d.unread||0);setService(s=>({...s,data:{...s.data,notifications:(s.data.notifications||[]).map(n=>({...n,unread:false}))}}));}}>Mark all as read</button></div>:<div className="empty"><div>✦</div><h3>Select a travel service</h3><p>Hotels, food, transport, documents and notifications are connected to the backend.</p></div>}</div>
        </section>
        <section className="support-section" id="support"><div className="section-head"><div><h2>AI Support</h2><p>Ask about your journey, pickup, hotels, food or documents.</p></div><span className="gemma-tag">GEMMA 4</span></div><div className="support-grid"><div className="support-input card"><textarea value={supportQuestion} onChange={e=>setSupportQuestion(e.target.value)} placeholder="Ask: What should I do if my train is delayed?" rows="3"/><button className="plan-btn" onClick={askSupport}>Ask TravelMate AI →</button></div><div className="support-answer card"><label>ASSISTANT</label><p>{supportAnswer||"Your AI support response will appear here."}</p></div></div></section>
        <section className="live-section" id="tracking"><div className="section-head"><div><h2>Live journey</h2><p>Arrival-aware assistance for flights, trains and local transit.</p></div><span className="live-chip">● {plan?"PLAN READY":"STANDBY"}</span></div><div className="live-cards"><article className="card"><span>JOURNEY</span><b>{j?.reference||"Waiting for journey"}</b><small>{j?.mode||"Choose flight, train, metro or bus"}</small></article><article className="card"><span>PICKUP WINDOW</span><b>{plan?.pickup_window?plan.pickup_window.start+" – "+plan.pickup_window.end:"—"}</b><small>Based on arrival/service timing</small></article><article className="card"><span>AI SUPPORT</span><b>Ready</b><small>Natural-language travel planning</small></article></div></section>
      </main>
    </div>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);
