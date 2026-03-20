/**
 * LiveTracking.jsx  ─  Swiggy-style real-time delivery tracking
 *
 * Map:      Leaflet.js + OpenStreetMap  (100 % FREE, no API key)
 * Routing:  OSRM public API             (100 % FREE, no key)
 * Realtime: Socket.IO                   (your own server)
 *
 * npm install leaflet     (in frontend)
 * Add to main.jsx:  import 'leaflet/dist/leaflet.css'
 *
 * Props:
 *   orderId          string
 *   deliveryLocation { lat, lng }
 *   orderStatus      string
 *   assignedShop     { name, address, lat, lng, distance }
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import API from '../utils/api';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ── Swiggy design tokens ──────────────────────────────────────────
const C = {
  orange:    '#FC8019',
  orangeHot: '#E87010',
  orangePale:'#FFF3EA',
  orangeBdr: '#FDE8CC',
  green:     '#60B246',
  black:     '#1C1C1C',
  mid:       '#686B78',
  soft:      '#93959F',
  line:      '#D4D5D9',
  bg:        '#F2F2F7',
  white:     '#FFFFFF',
};

// ── Math helpers ──────────────────────────────────────────────────
const toNum = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };

function haversineM(a, b) {
  const R = 6371000, D = Math.PI / 180;
  const dLat = (b.lat-a.lat)*D, dLng = (b.lng-a.lng)*D;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*D)*Math.cos(b.lat*D)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

function calcBearing(from, to) {
  const D=Math.PI/180, R=180/Math.PI;
  const dL=(to.lng-from.lng)*D, φ1=from.lat*D, φ2=to.lat*D;
  const y=Math.sin(dL)*Math.cos(φ2);
  const x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(dL);
  return (Math.atan2(y,x)*R+360)%360;
}

function lerpAngle(a,b,t){ const d=((b-a+540)%360)-180; return a+d*t; }

const DIRS = ['N','NE','E','SE','S','SW','W','NW'];
const compassLabel = deg => DIRS[Math.round(((deg%360)+360)%360/45)%8];

const fmtEta = m => {
  if (m==null) return '…';
  if (m<=0)   return 'Arriving!';
  return `${m} min${m===1?'':'s'}`;
};

// ── Status steps ──────────────────────────────────────────────────
const STATUS_STEPS = ['placed','confirmed','processing','out_for_delivery','delivered'];
const STEP_META = {
  placed:          { emoji:'📋', label:'Placed'     },
  confirmed:       { emoji:'✅', label:'Confirmed'   },
  processing:      { emoji:'📦', label:'Packing'     },
  out_for_delivery:{ emoji:'🛵', label:'On the Way'  },
  delivered:       { emoji:'🎉', label:'Delivered'   },
};

// ── Load Leaflet (idempotent, CDN) ────────────────────────────────
function loadLeaflet() {
  return new Promise(resolve => {
    if (window.L?.map) return resolve(window.L);
    if (!document.getElementById('lf-css')) {
      const l = document.createElement('link');
      l.id='lf-css'; l.rel='stylesheet';
      l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    if (!document.getElementById('lf-js')) {
      const s = document.createElement('script');
      s.id='lf-js'; s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => resolve(window.L);
      document.head.appendChild(s);
    } else {
      const poll = setInterval(()=>{ if(window.L?.map){ clearInterval(poll); resolve(window.L); }},80);
    }
  });
}

// ── Fetch real road route from OSRM (free, no key) ───────────────
async function fetchRoute(from, to) {
  try {
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/`+
      `${from.lng},${from.lat};${to.lng},${to.lat}`+
      `?overview=full&geometries=geojson`
    );
    const d = await r.json();
    if (d.code !== 'Ok') return null;
    return {
      coords:    d.routes[0].geometry.coordinates.map(([ln,la])=>[la,ln]),
      distanceM: d.routes[0].distance,
      durationS: d.routes[0].duration,
    };
  } catch { return null; }
}

// ── DivIcon builders ──────────────────────────────────────────────
function scooterIcon(L, angle=0, done=false) {
  const bg = done ? C.green : C.orange;
  return L.divIcon({
    className: '',
    iconSize:  [60,72], iconAnchor:[30,36],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;position:relative;">
        <div class="sw-ring sw-r1"></div>
        <div class="sw-ring sw-r2"></div>
        <div style="
          width:46px;height:46px;border-radius:50%;
          background:radial-gradient(circle at 35% 35%,${done?'#7BD162':'#FF9F42'},${bg});
          border:3.5px solid #fff;
          box-shadow:0 5px 18px rgba(252,128,25,.6),inset 0 -2px 5px rgba(0,0,0,.1);
          display:flex;align-items:center;justify-content:center;
          position:relative;z-index:2;
          transform:rotate(${angle}deg);
          transition:transform 1s ease;
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L7 12h3.5v8h3v-8H17L12 2z" fill="white" opacity=".95"/>
            <circle cx="8.5"  cy="21.5" r="1.9" fill="white"/>
            <circle cx="15.5" cy="21.5" r="1.9" fill="white"/>
            <rect x="9.5" y="12" width="5" height="1.8" rx=".9" fill="white" opacity=".55"/>
          </svg>
        </div>
        <div style="
          margin-top:4px;background:${bg};color:#fff;
          font-size:8px;font-weight:900;letter-spacing:.4px;
          padding:2px 8px;border-radius:7px;
          box-shadow:0 2px 6px rgba(0,0,0,.18);
          white-space:nowrap;font-family:'Poppins',sans-serif;
        ">${done?'✓ DONE':'● LIVE'}</div>
      </div>`,
  });
}

function pinIcon(L, emoji, label, bg) {
  return L.divIcon({
    className: '',
    iconSize:  [50,62], iconAnchor:[25,62],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="
          background:${bg};color:#fff;width:38px;height:38px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;font-size:18px;
          border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.28);
        ">${emoji}</div>
        <div style="
          background:${bg};color:#fff;font-size:8px;font-weight:800;
          padding:2px 6px;border-radius:5px;margin-top:2px;
          white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis;
          box-shadow:0 1px 5px rgba(0,0,0,.18);font-family:'Poppins',sans-serif;
        ">${label.slice(0,18)}</div>
        <div style="width:0;height:0;margin:-1px auto 0;
          border-left:5px solid transparent;border-right:5px solid transparent;
          border-top:7px solid ${bg};"></div>
      </div>`,
  });
}

// ── Inject CSS ────────────────────────────────────────────────────
if (typeof document!=='undefined' && !document.getElementById('sw-lt-style')) {
  const s = document.createElement('style');
  s.id = 'sw-lt-style';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
    .sw-ring{position:absolute;top:50%;left:50%;width:52px;height:52px;border-radius:50%;pointer-events:none;}
    .sw-r1{background:rgba(252,128,25,.22);animation:swRing 2s ease-out infinite;}
    .sw-r2{background:rgba(252,128,25,.12);animation:swRing 2s ease-out .55s infinite;}
    @keyframes swRing{0%{transform:translate(-50%,-50%) scale(.6);opacity:.8}100%{transform:translate(-50%,-50%) scale(3.3);opacity:0}}
    @keyframes swBlink{0%,100%{opacity:1}50%{opacity:.2}}
    @keyframes swPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    .sw-blink{animation:swBlink 1.35s ease-in-out infinite;}
    .sw-pop  {animation:swPop .32s ease both;}
    @keyframes swSlideDown{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
    .leaflet-container:focus{outline:none;}
  `;
  document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════════════
export default function LiveTracking({ orderId, deliveryLocation, orderStatus, assignedShop }) {
  // ── Refs ──────────────────────────────────────────────────────
  const mapRef      = useRef(null);
  const mapObj      = useRef(null);
  const scooterMk   = useRef(null);
  const homeMk      = useRef(null);
  const shopMk      = useRef(null);
  const glowLine    = useRef(null);
  const remLine     = useRef(null);   // dashed orange remaining route
  const doneLine    = useRef(null);   // faded done segment
  const prevLL      = useRef(null);
  const prevBrg     = useRef(0);
  const animRef     = useRef(null);
  const dashTimer   = useRef(null);
  const dashOff     = useRef(0);
  const socketRef   = useRef(null);
  const etaTick     = useRef(null);
  const routeAll    = useRef([]);     // full route [[lat,lng]]

  // ── State ─────────────────────────────────────────────────────
  const [ready,      setReady]      = useState(false);
  const [connStatus, setConnStatus] = useState('connecting');
  const [lastSeen,   setLastSeen]   = useState(null);
  const [eta,        setEta]        = useState(null);
  const [distLeft,   setDistLeft]   = useState(null);
  const [angle,      setAngle]      = useState(0);
  const [delivered,  setDelivered]  = useState(false);
  const [codCollected, setCodCollected] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const destLL = (() => {
    const lat=toNum(deliveryLocation?.lat), lng=toNum(deliveryLocation?.lng);
    return (lat!==null && lng!==null) ? {lat,lng} : null;
  })();
  const shopLL = (() => {
    const lat=toNum(assignedShop?.lat), lng=toNum(assignedShop?.lng);
    return (lat!==null && lng!==null) ? {lat,lng} : null;
  })();

  const isOut  = orderStatus === 'out_for_delivery';
  const isDone = orderStatus === 'delivered';
  const stepIdx = STATUS_STEPS.indexOf(orderStatus);

  // ── 1. Load Leaflet ───────────────────────────────────────────
  useEffect(() => { loadLeaflet().then(()=>setReady(true)); }, []);

  // ── 2. Init map ───────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    const L      = window.L;
    const center = destLL ?? shopLL ?? {lat:11.0168,lng:76.9558};

    const map = L.map(mapRef.current, {
      center:  [center.lat, center.lng],
      zoom:    14,
      zoomControl: true,
      attributionControl: true,
    });
    mapObj.current = map;

    // ── OpenStreetMap tiles ──
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // ── Static markers ───
    if (destLL) {
      homeMk.current = L.marker([destLL.lat, destLL.lng], {
        icon: pinIcon(L, '🏠', 'Your Home', '#1D4ED8'),
        zIndexOffset: 100,
      }).addTo(map);
    }
    if (shopLL) {
      shopMk.current = L.marker([shopLL.lat, shopLL.lng], {
        icon: pinIcon(L, '🏪', assignedShop?.name||'Ration Shop', '#7C3AED'),
        zIndexOffset: 90,
      }).addTo(map);
    }

    // Fit bounds
    const pts = [destLL, shopLL].filter(Boolean);
    if (pts.length > 1) map.fitBounds(pts.map(p=>[p.lat,p.lng]), { padding:[60,60] });
    else if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 14);

    // Draw initial route: shop → home
    if (shopLL && destLL) drawRoute(shopLL, destLL, map);
  }, [ready]);

  // ── Draw OSRM route ───────────────────────────────────────────
  const drawRoute = useCallback(async (from, to, mapInstance) => {
    const L   = window.L;
    const map = mapInstance || mapObj.current;
    if (!L || !map) return;

    const result = await fetchRoute(from, to);
    const coords = result?.coords ?? [[from.lat,from.lng],[to.lat,to.lng]];
    routeAll.current = coords;

    // Remove old layers
    [glowLine, remLine].forEach(r => { if(r.current){map.removeLayer(r.current);r.current=null;} });

    // Glow layer
    glowLine.current = L.polyline(coords, {
      color: C.orange, weight:10, opacity:0.10, lineCap:'round', lineJoin:'round',
    }).addTo(map);

    // Dashed marching-ants remaining route
    remLine.current = L.polyline(coords, {
      color: C.orange, weight:4, opacity:1,
      dashArray:'8 5', dashOffset:'0',
      lineCap:'round', lineJoin:'round',
    }).addTo(map);

    // Start marching ants
    if (dashTimer.current) clearInterval(dashTimer.current);
    dashTimer.current = setInterval(() => {
      dashOff.current = (dashOff.current + 0.65) % 13;
      try { remLine.current?.setStyle({ dashOffset: String(dashOff.current) }); } catch {}
    }, 35);

    if (result) {
      setEta(Math.ceil(result.durationS/60));
      setDistLeft(Math.round(result.distanceM));
    }
  }, []);

  // ── Animate scooter smoothly (ease-in-out 2.5 s) ─────────────
  const animateScooter = useCallback((from, to, hdg) => {
    const L   = window.L;
    const map = mapObj.current;
    if (!L || !map || !scooterMk.current) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const t0=performance.now(), dur=2500;
    const dLat=to.lat-from.lat, dLng=to.lng-from.lng;

    const step = now => {
      const p    = Math.min((now-t0)/dur,1);
      const ease = p<.5 ? 2*p*p : -1+(4-2*p)*p;
      scooterMk.current.setLatLng([from.lat+dLat*ease, from.lng+dLng*ease]);
      if (p<1) animRef.current=requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);

    // Update rotation icon
    scooterMk.current.setIcon(scooterIcon(L, hdg, isDone));
    setAngle(hdg);
  }, [isDone]);

  // ── Place / move scooter ──────────────────────────────────────
  const placeScooter = useCallback(({lat,lng}, animate) => {
    const L   = window.L;
    const map = mapObj.current;
    if (!L || !map) return;

    const newLL = {lat,lng};

    // Bearing (only update when moved > 4 m to avoid GPS jitter)
    let hdg = prevBrg.current;
    if (prevLL.current) {
      const d = haversineM(prevLL.current, newLL);
      if (d > 4) {
        hdg = lerpAngle(prevBrg.current, calcBearing(prevLL.current, newLL), 0.75);
        prevBrg.current = hdg;
      }
    }

    if (!scooterMk.current) {
      scooterMk.current = L.marker([lat,lng], {
        icon: scooterIcon(L, hdg, isDone),
        zIndexOffset: 999,
      }).addTo(map);
      setAngle(hdg);
    } else if (animate && prevLL.current) {
      animateScooter(prevLL.current, newLL, hdg);
    } else {
      scooterMk.current.setLatLng([lat,lng]);
      scooterMk.current.setIcon(scooterIcon(L, hdg, isDone));
      setAngle(hdg);
    }

    prevLL.current = newLL;

    // Update done-route segment
    if (routeAll.current.length > 0) {
      const map2 = mapObj.current;
      const nearest = routeAll.current.reduce((best,pt,i) => {
        const d = Math.abs(pt[0]-lat)+Math.abs(pt[1]-lng);
        return d < best.d ? {d,i} : best;
      }, {d:Infinity,i:0});
      const donePts = routeAll.current.slice(0, nearest.i+1);
      if (donePts.length > 1) {
        if (doneLine.current) map2.removeLayer(doneLine.current);
        doneLine.current = L.polyline(donePts, {
          color: C.orangeHot, weight:3, opacity:0.38, lineCap:'round',
        }).addTo(map2);
      }
    }

    // Live distance
    if (destLL) {
      setDistLeft(Math.round(haversineM(newLL, destLL)));
      // Refresh route from current scooter position
      drawRoute(newLL, destLL);
    }

    // Smooth pan
    map.panTo([lat,lng], { animate:true, duration:1.5 });
  }, [isDone, destLL, drawRoute, animateScooter]);

  // ── 3. REST: last known position ──────────────────────────────
  useEffect(() => {
    if (!orderId || !ready) return;
    API.get(`/tracking/${orderId}`).then(({data}) => {
      const lat=toNum(data.agentLocation?.lat), lng=toNum(data.agentLocation?.lng);
      if (lat!==null && lng!==null) {
        placeScooter({lat,lng}, false);
        setLastSeen(data.agentLocation?.updatedAt);
        if (data.etaMinutes!=null) setEta(data.etaMinutes);
      }
    }).catch(()=>{});
  }, [orderId, ready]);

  // ── 4. Socket.IO ──────────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return;
    const socket = io(SOCKET_URL, {
      transports:          ['polling','websocket'],
      reconnectionAttempts: 15,
      reconnectionDelay:    2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_order_room', orderId);
      setConnStatus('live');
    });
    socket.on('disconnect',    () => setConnStatus('offline'));
    socket.on('connect_error', () => setConnStatus('offline'));
    socket.on('room_joined',   () => setConnStatus('live'));

    socket.on('location_update', ({lat,lng,ts,eta:sEta}) => {
      const pLat=toNum(lat), pLng=toNum(lng);
      if (pLat===null || pLng===null) return;
      placeScooter({lat:pLat,lng:pLng}, true);
      setLastSeen(new Date(ts));
      setConnStatus('live');
      if (sEta!=null) setEta(sEta);
    });

    socket.on('status_update', ({status}) => {
      // Parent should re-fetch order; we just update ETA display
      if (status === 'delivered') setEta(0);
    });

    socket.on('order_delivered', ({ paymentMethod, paymentStatus, totalAmount }) => {
      setEta(0);
      setDelivered(true);
      setShowSuccessBanner(true);
      if (paymentMethod === 'stripe' || paymentStatus === 'paid') setCodCollected(true);
    });
    socket.on('payment_collected', ({ totalAmount }) => {
      setCodCollected(true);
      setShowSuccessBanner(true);
    });
    socket.on('agent_offline',   () => setConnStatus('offline'));

    return () => { socket.disconnect(); socketRef.current=null; };
  }, [orderId]);

  // ── 5. ETA countdown 1/min ────────────────────────────────────
  useEffect(() => {
    if (eta==null || !isOut) { clearInterval(etaTick.current); return; }
    clearInterval(etaTick.current);
    etaTick.current = setInterval(()=>setEta(e=>e<=0?0:e-1), 60000);
    return ()=>clearInterval(etaTick.current);
  }, [eta, isOut]);

  // ── Cleanup ───────────────────────────────────────────────────
  useEffect(()=>()=>{
    clearInterval(dashTimer.current);
    if(animRef.current) cancelAnimationFrame(animRef.current);
    if(mapObj.current){ mapObj.current.remove(); mapObj.current=null; }
  },[]);

  // ── Helpers ───────────────────────────────────────────────────
  const connBg = { live:C.green, offline:'#EF4444', connecting:'#F59E0B' }[connStatus];
  const distStr = distLeft!=null
    ? (distLeft>=1000 ? `${(distLeft/1000).toFixed(1)} km` : `${distLeft} m`)
    : null;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Poppins','Segoe UI',sans-serif" }}
         className="rounded-2xl overflow-hidden bg-white shadow-lg border border-gray-100">

      {/* ── DELIVERY SUCCESS BANNER ── */}
      {(isDone || delivered) && showSuccessBanner && (
        <div style={{
          background:'linear-gradient(135deg,#22c55e,#16a34a)',
          padding:'14px 18px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          animation:'swSlideDown .4s ease',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:28 }}>🎉</div>
            <div>
              <p style={{ color:'#fff', fontWeight:900, fontSize:15, margin:0 }}>Order Delivered!</p>
              <p style={{ color:'rgba(255,255,255,.82)', fontSize:11, margin:'2px 0 0' }}>
                {codCollected ? '💵 Cash payment collected ✅' : 'Your ration has arrived!'}
              </p>
            </div>
          </div>
          <button onClick={() => setShowSuccessBanner(false)}
            style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ×
          </button>
        </div>
      )}

      {/* ── COD PAYMENT PENDING BANNER ── */}
      {isDone && !codCollected && orderStatus === 'delivered' && !showSuccessBanner && (
        <div style={{
          background:'linear-gradient(135deg,#f59e0b,#d97706)',
          padding:'10px 16px',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <span style={{ fontSize:20 }}>💵</span>
          <p style={{ color:'#fff', fontWeight:700, fontSize:12, margin:0 }}>
            Please hand over the cash to your delivery agent
          </p>
        </div>
      )}

      {/* ── ORANGE HEADER ── */}
      <div style={{ background:`linear-gradient(130deg,${C.orange} 0%,${C.orangeHot} 100%)`, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:40,height:40,borderRadius:13,background:'rgba(255,255,255,.22)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:21 }}>🛵</div>
          <div>
            <p style={{ color:'#fff',fontWeight:800,fontSize:14.5,margin:0,letterSpacing:'-.2px' }}>
              {isDone ? 'Order Delivered! 🎉' : 'Order is on the way'}
            </p>
            {assignedShop?.name && (
              <p style={{ color:'rgba(255,255,255,.72)',fontSize:11,margin:'2px 0 0',fontWeight:500 }}>
                From {assignedShop.name.slice(0,28)}
              </p>
            )}
          </div>
        </div>
        {/* Live pill */}
        <div style={{ display:'flex',alignItems:'center',gap:5,background:'rgba(255,255,255,.2)',borderRadius:20,padding:'4px 11px' }}>
          <span className={connStatus!=='offline'&&!isDone?'sw-blink':''}
                style={{ width:7,height:7,borderRadius:'50%',background:isDone?C.green:connBg,display:'inline-block' }}/>
          <span style={{ color:'#fff',fontSize:11,fontWeight:700 }}>
            {isDone ? 'Delivered' : connStatus==='live' ? 'Live' : connStatus==='offline' ? 'Offline' : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* ── ETA STRIP ── */}
      {isOut && !isDone && (
        <div style={{ background:C.orangePale,borderBottom:`1px solid ${C.orangeBdr}`,display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr' }}>
          {[
            { icon:'⏱', label:'ETA',      val: fmtEta(eta) },
            null,
            { icon:'📏', label:'Distance', val: distStr??'…' },
            null,
            { icon:'🧭', label:'Heading',  val: `${Math.round(((angle%360)+360)%360)}° ${compassLabel(angle)}` },
          ].map((it,i) =>
            it===null
              ? <div key={i} style={{ background:C.orangeBdr,width:1 }}/>
              : (
                <div key={i} style={{ textAlign:'center',padding:'10px 4px' }}>
                  <div style={{ fontSize:15 }}>{it.icon}</div>
                  <div style={{ fontSize:9,fontWeight:700,color:C.orange,marginTop:1,letterSpacing:'.3px' }}>{it.label}</div>
                  <div key={it.val} className="sw-pop" style={{ fontSize:12.5,fontWeight:900,color:C.black,marginTop:1 }}>{it.val}</div>
                </div>
              )
          )}
        </div>
      )}

      {/* ── LEAFLET MAP ── */}
      <div ref={mapRef} style={{ width:'100%', height:'300px' }}/>

      {/* ── LEGEND ── */}
      <div style={{ display:'flex',alignItems:'center',gap:14,padding:'7px 14px',background:C.bg,borderTop:`1px solid ${C.line}`,fontSize:11,color:C.mid,fontWeight:600,flexWrap:'wrap' }}>
        <span>🏠 Home</span>
        {assignedShop && <span>🏪 {assignedShop.name?.slice(0,16)}</span>}
        {isOut && !isDone && <span>🛵 Agent (live)</span>}
        <span style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:4,color:C.orange }}>
          <svg width="22" height="5"><line x1="0" y1="2.5" x2="22" y2="2.5" stroke={C.orange} strokeWidth="3" strokeDasharray="5 4"/></svg>
          Route (OSRM)
        </span>
      </div>

      {/* ── SWIGGY STEPPER ── */}
      <div style={{ padding:'14px 16px 10px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',position:'relative' }}>
          {/* Track */}
          <div style={{ position:'absolute',top:13,left:20,right:20,height:3,background:C.line,borderRadius:2,zIndex:0 }}>
            <div style={{
              height:'100%',borderRadius:2,transition:'width .65s ease',
              width: stepIdx>=0 ? `${(stepIdx/(STATUS_STEPS.length-1))*100}%` : '0%',
              background:`linear-gradient(90deg,${C.orange},${C.orangeHot})`,
              boxShadow:`0 0 6px rgba(252,128,25,.45)`,
            }}/>
          </div>
          {STATUS_STEPS.map((s,i) => {
            const done_=i<=stepIdx, cur=i===stepIdx, meta=STEP_META[s];
            return (
              <div key={s} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:52,position:'relative',zIndex:1 }}>
                <div style={{
                  width:27,height:27,borderRadius:'50%',
                  background:done_?C.orange:C.white,
                  border:`2.5px solid ${done_?C.orange:C.line}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:12,transition:'all .3s',
                  transform:cur?'scale(1.22)':'scale(1)',
                  boxShadow:cur?`0 0 0 4px ${C.orangePale}`:'none',
                }}>
                  {done_
                    ? <span style={{ fontSize:11 }}>{meta.emoji}</span>
                    : <span style={{ fontSize:9,color:C.line,fontWeight:700 }}>{i+1}</span>
                  }
                </div>
                <span style={{ fontSize:8.5,fontWeight:cur?800:600,color:cur?C.orange:done_?C.mid:C.line,textAlign:'center',lineHeight:1.2,transition:'color .3s' }}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SHOP INFO STRIP ── */}
      {assignedShop && (
        <div style={{ margin:'0 14px 14px',background:C.orangePale,border:`1px solid ${C.orangeBdr}`,borderRadius:14,padding:'10px 13px',display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:38,height:38,borderRadius:12,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>🏪</div>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ fontWeight:800,fontSize:13,color:C.black,margin:0 }}>{assignedShop.name}</p>
            <p style={{ fontSize:11,color:C.mid,margin:'2px 0 0' }}>{assignedShop.address}</p>
          </div>
          {assignedShop.distance && (
            <span style={{ background:C.orange,color:'#fff',fontSize:11,fontWeight:800,padding:'4px 10px',borderRadius:20,whiteSpace:'nowrap' }}>
              {(assignedShop.distance/1000).toFixed(1)} km
            </span>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ borderTop:`1px solid ${C.bg}`,padding:'9px 16px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <span style={{ fontSize:11,color:C.soft,fontWeight:500 }}>
          {isOut&&!isDone ? '🧭 Scooter auto-rotates with travel direction'
          : isDone        ? '✅ Order delivered successfully'
          :                 '⏳ Tracking starts when out for delivery'}
        </span>
        {lastSeen && <span style={{ fontSize:10,color:C.soft }}>{new Date(lastSeen).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}