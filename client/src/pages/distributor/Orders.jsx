/**
 * Distributor Orders.jsx
 *
 * KEY FEATURE:
 *  - "Go Live" captures distributor's REAL GPS every 4s
 *  - Scooter on map moves SLOWLY & SMOOTHLY from distributor → customer
 *  - Auto-rotates bearing (faces direction of travel)
 *  - Pulsing ripple rings under scooter
 *  - Orange dashed marching-ants route: distributor → customer
 *  - Broadcasts via Socket.IO to customer's LiveTracking in real time
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';
import { distributorLinks } from './links';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiNavigation, FiMapPin, FiCheck, FiRadio, FiWifi } from 'react-icons/fi';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';

// ── Design tokens ────────────────────────────────────────────────
const C = {
  orange:    '#FC8019',
  orangeHot: '#E87010',
  orangePale:'#FFF3EA',
  orangeBdr: '#FDE8CC',
  green:     '#60B246',
  black:     '#1C1C1C',
  mid:       '#686B78',
  line:      '#D4D5D9',
  bg:        '#F2F2F7',
};

// ── Load Leaflet from CDN (idempotent) ───────────────────────────
function loadLeaflet() {
  return new Promise(resolve => {
    if (window.L?.map) return resolve(window.L);
    if (!document.getElementById('lf-css')) {
      const l = document.createElement('link');
      l.id = 'lf-css'; l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    if (!document.getElementById('lf-js-d')) {
      const s = document.createElement('script');
      s.id = 'lf-js-d';
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => resolve(window.L);
      document.head.appendChild(s);
    } else {
      const t = setInterval(() => { if (window.L?.map) { clearInterval(t); resolve(window.L); } }, 80);
    }
  });
}

// ── Compass bearing (0° = North, clockwise) ──────────────────────
function calcBearing(from, to) {
  const D = Math.PI / 180, R = 180 / Math.PI;
  const dL = (to.lng - from.lng) * D;
  const φ1 = from.lat * D, φ2 = to.lat * D;
  const y = Math.sin(dL) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dL);
  return (Math.atan2(y, x) * R + 360) % 360;
}

// ── Shortest-path angle lerp (avoids 359°→1° going the long way) ─
function lerpAngle(a, b, t) {
  const diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}

// ── Haversine metres ─────────────────────────────────────────────
function distM(a, b) {
  const R = 6371000, D = Math.PI / 180;
  const dLat = (b.lat - a.lat) * D, dLng = (b.lng - a.lng) * D;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*D)*Math.cos(b.lat*D)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

// ── Inject CSS (once) ────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('dist-track-css')) {
  const s = document.createElement('style');
  s.id = 'dist-track-css';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
    .dt-ring{position:absolute;top:50%;left:50%;border-radius:50%;pointer-events:none;}
    .dt-r1{width:54px;height:54px;background:rgba(252,128,25,.22);animation:dtRing 2s ease-out infinite;}
    .dt-r2{width:54px;height:54px;background:rgba(252,128,25,.12);animation:dtRing 2s ease-out .6s infinite;}
    @keyframes dtRing{0%{transform:translate(-50%,-50%) scale(.6);opacity:.8}100%{transform:translate(-50%,-50%) scale(3.4);opacity:0}}
    @keyframes dtBlink{0%,100%{opacity:1}50%{opacity:.2}}
    .dt-blink{animation:dtBlink 1.2s ease-in-out infinite;}
    .leaflet-container:focus{outline:none;}
  `;
  document.head.appendChild(s);
}

// ── Scooter DivIcon ──────────────────────────────────────────────
function makeScooterIcon(L, angle = 0) {
  return L.divIcon({
    className: '',
    iconSize:  [62, 76],
    iconAnchor:[31, 38],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div class="dt-ring dt-r1"></div>
        <div class="dt-ring dt-r2"></div>
        <div style="
          width:48px;height:48px;border-radius:50%;
          background:radial-gradient(circle at 35% 35%,#FF9F42,${C.orange});
          border:3.5px solid #fff;
          box-shadow:0 5px 20px rgba(252,128,25,.65),inset 0 -2px 5px rgba(0,0,0,.12);
          display:flex;align-items:center;justify-content:center;
          position:relative;z-index:2;
          transform:rotate(${angle}deg);
          transition:transform 1.1s ease;
        ">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L7 12h3.5v8h3v-8H17L12 2z" fill="white" opacity=".95"/>
            <circle cx="8.5"  cy="21.5" r="1.9" fill="white"/>
            <circle cx="15.5" cy="21.5" r="1.9" fill="white"/>
            <rect x="9.5" y="12" width="5" height="1.8" rx=".9" fill="white" opacity=".55"/>
          </svg>
        </div>
        <div style="
          margin-top:4px;background:${C.orange};color:#fff;
          font-size:8px;font-weight:900;letter-spacing:.4px;
          padding:2px 9px;border-radius:7px;
          box-shadow:0 2px 6px rgba(0,0,0,.2);
          white-space:nowrap;font-family:'Poppins',sans-serif;
        ">● LIVE</div>
      </div>`,
  });
}

// ── Customer home pin ────────────────────────────────────────────
function makeHomeIcon(L) {
  return L.divIcon({
    className: '',
    iconSize:  [46, 58],
    iconAnchor:[23, 58],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="
          background:#1D4ED8;color:#fff;width:38px;height:38px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;font-size:18px;
          border:3px solid #fff;box-shadow:0 3px 12px rgba(29,78,216,.45);
        ">🏠</div>
        <div style="
          background:#1D4ED8;color:#fff;font-size:8px;font-weight:800;
          padding:2px 7px;border-radius:5px;margin-top:2px;
          font-family:'Poppins',sans-serif;
        ">Customer</div>
        <div style="width:0;height:0;border-left:5px solid transparent;
          border-right:5px solid transparent;border-top:7px solid #1D4ED8;margin-top:-1px;"></div>
      </div>`,
  });
}

// ════════════════════════════════════════════════════════════════
export default function DistributorOrders() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [pings,    setPings]    = useState(0);
  const [distKm,   setDistKm]   = useState(null);
  const [gpsAcc,   setGpsAcc]   = useState(null);
  const [leafletOk,setLeafletOk]= useState(false);
  const [liveAngle,setLiveAngle]= useState(0);

  // Map refs
  const mapRef     = useRef(null);
  const mapObj     = useRef(null);
  const scooterMk  = useRef(null);
  const homeMk     = useRef(null);
  const remLine    = useRef(null);   // dashed remaining route
  const doneLine   = useRef(null);   // faded done path

  // Motion refs
  const animRef    = useRef(null);
  const prevLL     = useRef(null);
  const prevBrg    = useRef(0);

  // Socket + GPS refs
  const socketRef  = useRef(null);
  const gpsTimer   = useRef(null);
  const dashTimer  = useRef(null);
  const dashOff    = useRef(0);
  const activeOrder= useRef(null);   // full order object while live

  // ── Load Leaflet ───────────────────────────────────────────────
  useEffect(() => {
    loadLeaflet().then(() => setLeafletOk(true));
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await API.get('/distributor/orders');
      setOrders(data.orders || []);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  // ── Update order status ────────────────────────────────────────
  const updateStatus = async (orderId, status) => {
    try {
      await API.put(`/distributor/orders/${orderId}/status`, { status });
      toast.success(`✅ Marked: ${status.replace(/_/g,' ')}`);
      fetchOrders();
    } catch { toast.error('Failed to update'); }
  };

  // ── Build map with customer home marker ───────────────────────
  const buildMap = useCallback((order) => {
    if (!leafletOk || !mapRef.current) return;

    // Destroy old map
    if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; }
    scooterMk.current = null;
    homeMk.current    = null;
    remLine.current   = null;
    doneLine.current  = null;
    prevLL.current    = null;
    prevBrg.current   = 0;

    const L    = window.L;
    const dLat = parseFloat(order.deliveryLocation?.lat);
    const dLng = parseFloat(order.deliveryLocation?.lng);
    const hasHome = isFinite(dLat) && isFinite(dLng);
    const center  = hasHome ? [dLat, dLng] : [11.0168, 76.9558];

    const map = L.map(mapRef.current, {
      center, zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });
    mapObj.current = map;

    // OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // 🏠 Customer home marker
    if (hasHome) {
      homeMk.current = L.marker([dLat, dLng], {
        icon: makeHomeIcon(L),
        zIndexOffset: 100,
      }).addTo(map);
    }

    // Route line (dashed, filled when scooter moves)
    remLine.current = L.polyline([], {
      color: C.orange, weight: 4, opacity: 1,
      dashArray: '8 5', dashOffset: '0',
      lineCap: 'round', lineJoin: 'round',
    }).addTo(map);

    // Glow
    L.polyline([], {
      color: C.orange, weight: 12, opacity: 0.10,
      lineCap: 'round',
    }).addTo(map);

    // Marching ants
    if (dashTimer.current) clearInterval(dashTimer.current);
    dashTimer.current = setInterval(() => {
      dashOff.current = (dashOff.current + 0.65) % 13;
      try { remLine.current?.setStyle({ dashOffset: String(dashOff.current) }); } catch {}
    }, 35);

  }, [leafletOk]);

  // ── Animate scooter: SLOW ease-in-out from A to B ─────────────
  const animateScooter = useCallback((from, to, angle) => {
    const L   = window.L;
    const map = mapObj.current;
    if (!L || !map || !scooterMk.current) return;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const t0   = performance.now();
    const dur  = 3000;   // ← 3 seconds — very smooth, slow glide
    const dLat = to.lat - from.lat;
    const dLng = to.lng - from.lng;

    const step = now => {
      const p    = Math.min((now - t0) / dur, 1);
      // Ease-in-out cubic
      const ease = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
      scooterMk.current?.setLatLng([
        from.lat + dLat * ease,
        from.lng + dLng * ease,
      ]);
      if (p < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);

    // Update icon rotation separately (CSS transition handles smooth turn)
    scooterMk.current.setIcon(makeScooterIcon(L, angle));
    setLiveAngle(angle);
  }, []);

  // ── Place / update scooter on map ─────────────────────────────
  const placeScooter = useCallback((lat, lng) => {
    const L   = window.L;
    const map = mapObj.current;
    if (!L || !map) return;

    const newLL = { lat, lng };

    // Calculate bearing
    let hdg = prevBrg.current;
    if (prevLL.current) {
      const d = distM(prevLL.current, newLL);
      if (d > 3) {  // ignore micro-jitter < 3 m
        const raw  = calcBearing(prevLL.current, newLL);
        hdg = lerpAngle(prevBrg.current, raw, 0.72);
        prevBrg.current = hdg;
      }
    }

    if (!scooterMk.current) {
      // First placement — no animation
      scooterMk.current = L.marker([lat, lng], {
        icon: makeScooterIcon(L, hdg),
        zIndexOffset: 999,
      }).addTo(map);
      setLiveAngle(hdg);
      map.setView([lat, lng], 15);
    } else if (prevLL.current) {
      // Smooth animated move
      animateScooter(prevLL.current, newLL, hdg);
    }

    prevLL.current = newLL;

    // Update dashed route: scooter → customer home
    const home = homeMk.current?.getLatLng();
    if (home && remLine.current) {
      remLine.current.setLatLngs([[lat, lng], [home.lat, home.lng]]);
    }

    // Compute & show distance
    if (home) {
      const d = distM(newLL, { lat: home.lat, lng: home.lng });
      setDistKm(d >= 1000 ? `${(d/1000).toFixed(2)} km` : `${Math.round(d)} m`);
    }

    // Pan map smoothly to center between scooter and home
    if (home) {
      const midLat = (lat + home.lat) / 2;
      const midLng = (lng + home.lng) / 2;
      map.panTo([midLat, midLng], { animate: true, duration: 1.8 });
    } else {
      map.panTo([lat, lng], { animate: true, duration: 1.8 });
    }

  }, [animateScooter]);

  // ── Start GPS broadcasting ────────────────────────────────────
  const startTracking = useCallback((order) => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported on this device');

    activeOrder.current = order;
    setActiveId(order._id);
    setPings(0);
    setDistKm(null);

    // Connect Socket.IO
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 15,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('agent_join', order._id);
      toast.success('🛵 Live tracking started!');
    });
    socket.on('disconnect', () => toast('📡 Socket disconnected'));

    // Update DB status → out_for_delivery
    API.post(`/tracking/${order._id}/start`).catch(() => {});

    // Build the map (give DOM 200ms to mount)
    setTimeout(() => buildMap(order), 200);

    // ── GPS loop every 4 seconds ──────────────────────────────
    const sendGPS = () => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;

          // 1. Move scooter on distributor's own map
          placeScooter(lat, lng);

          // 2. Broadcast to server → customer receives via Socket.IO
          socket.emit('agent_location_update', {
            orderId: order._id,
            lat, lng,
          });

          setPings(p => p + 1);
          setGpsAcc(Math.round(accuracy));
        },
        err => console.warn('GPS error:', err.message),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
      );
    };

    sendGPS();  // immediate first ping
    gpsTimer.current = setInterval(sendGPS, 4000);

  }, [buildMap, placeScooter]);

  // ── Stop GPS broadcasting ─────────────────────────────────────
  const stopTracking = useCallback(() => {
    clearInterval(gpsTimer.current);
    clearInterval(dashTimer.current);
    if (animRef.current)  cancelAnimationFrame(animRef.current);
    if (socketRef.current){ socketRef.current.disconnect(); socketRef.current = null; }
    if (mapObj.current)   { mapObj.current.remove(); mapObj.current = null; }
    scooterMk.current = null;
    prevLL.current    = null;
    prevBrg.current   = 0;
    activeOrder.current = null;
    setActiveId(null);
    setPings(0);
    setDistKm(null);
    setGpsAcc(null);
    toast('Tracking stopped');
  }, []);

  // ── Mark delivered + SMS ─────────────────────────────────────
  const markDelivered = async (orderId) => {
    try {
      const { data } = await API.post(`/tracking/${orderId}/deliver`);
      const isCOD = data.paymentMethod === 'cod';
      toast.success(
        isCOD
          ? `🎉 Delivered! Collect ₹${data.totalAmount} cash from customer.`
          : '🎉 Delivered! Online payment already received ✅',
        { duration: 5000 }
      );
      stopTracking();
      fetchOrders();
    } catch { toast.error('Failed to mark delivered'); }
  };

  // ── Collect COD cash payment ──────────────────────────────────
  const collectPayment = async (orderId, amount) => {
    try {
      await API.post(`/tracking/${orderId}/collect`);
      toast.success(`💵 ₹${amount} collected! SMS sent to customer ✅`, { duration: 4000 });
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => () => {
    clearInterval(gpsTimer.current);
    clearInterval(dashTimer.current);
    if (animRef.current)   cancelAnimationFrame(animRef.current);
    if (socketRef.current) socketRef.current.disconnect();
    if (mapObj.current)    mapObj.current.remove();
  }, []);

  const nextStatus = {
    placed:      'confirmed',
    confirmed:   'processing',
    processing:  'out_for_delivery',
  };

  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];
  const compassLabel = deg => DIRS[Math.round(((deg%360)+360)%360/45)%8];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50"
         style={{ fontFamily:"'Poppins','Segoe UI',sans-serif" }}>
      <Sidebar links={distributorLinks}/>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {orders.length} order{orders.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
            {activeId && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                   style={{ background:C.orangePale, borderColor:C.orangeBdr }}>
                <span className="dt-blink w-2 h-2 rounded-full inline-block"
                      style={{ background:C.orange }}/>
                <span style={{ fontSize:12, fontWeight:700, color:C.orange }}>
                  Broadcasting · {pings} ping{pings!==1?'s':''}
                </span>
              </div>
            )}
          </div>

          {/* ── LIVE TRACKING MAP (shown while broadcasting) ── */}
          {activeId && (
            <div className="rounded-2xl overflow-hidden shadow-sm mb-5 border-2"
                 style={{ borderColor:C.orange }}>

              {/* Map header */}
              <div style={{ background:`linear-gradient(130deg,${C.orange},${C.orangeHot})`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div className="flex items-center gap-2">
                  <FiRadio className="text-white animate-pulse" size={16}/>
                  <span style={{ color:'#fff', fontWeight:800, fontSize:14 }}>Live Broadcasting</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => markDelivered(activeId)}
                    style={{ background:C.green, color:'#fff', border:'none', borderRadius:20, padding:'5px 14px', fontSize:11, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                    <FiCheck size={11}/> Delivered
                  </button>
                  <button onClick={stopTracking}
                    style={{ background:'rgba(255,255,255,.2)', color:'#fff', border:'none', borderRadius:20, padding:'5px 12px', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                    Stop
                  </button>
                </div>
              </div>

              {/* Stats bar */}
              <div style={{ background:C.orangePale, borderBottom:`1px solid ${C.orangeBdr}`, display:'grid', gridTemplateColumns:'1fr 1px 1fr 1px 1fr 1px 1fr' }}>
                {[
                  { icon:'📡', label:'Pings',    val: pings },
                  null,
                  { icon:'📏', label:'Distance', val: distKm ?? '…' },
                  null,
                  { icon:'🧭', label:'Heading',  val: `${Math.round(((liveAngle%360)+360)%360)}° ${compassLabel(liveAngle)}` },
                  null,
                  { icon:'📶', label:'GPS Acc',  val: gpsAcc ? `±${gpsAcc}m` : '…' },
                ].map((it, i) =>
                  it === null
                    ? <div key={i} style={{ background:C.orangeBdr, width:1 }}/>
                    : (
                      <div key={i} style={{ textAlign:'center', padding:'8px 4px' }}>
                        <div style={{ fontSize:13 }}>{it.icon}</div>
                        <div style={{ fontSize:8.5, fontWeight:700, color:C.orange, marginTop:1 }}>{it.label}</div>
                        <div style={{ fontSize:11, fontWeight:900, color:C.black, marginTop:1 }}>{it.val}</div>
                      </div>
                    )
                )}
              </div>

              {/* Leaflet map */}
              <div ref={mapRef} style={{ height: 280 }}/>

              {/* Footer tip */}
              <div style={{ background:C.bg, padding:'8px 14px', fontSize:11, color:C.mid, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span>🛵 Scooter rotates to face direction of travel · GPS every 4s</span>
                <span style={{ color:C.orange, fontWeight:700 }}>OSM + OSRM</span>
              </div>
            </div>
          )}

          {/* ── ORDERS LIST ── */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                   style={{ borderColor:`${C.orange} transparent ${C.orange} ${C.orange}` }}/>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-14 text-center shadow-sm border border-gray-100">
              <p className="text-5xl mb-3">📦</p>
              <p className="font-semibold text-gray-500">No orders assigned yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const isActive = activeId === order._id;
                const isDone   = order.orderStatus === 'delivered';
                const next     = nextStatus[order.orderStatus];

                return (
                  <div key={order._id}
                       className="bg-white rounded-2xl shadow-sm overflow-hidden border transition-all"
                       style={{ borderColor: isActive ? C.orange : '#E5E7EB', borderWidth: isActive ? 2 : 1 }}>

                    {/* Order header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <div>
                        <p className="font-black text-gray-900 text-sm">
                          #{order._id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge status={order.orderStatus}/>
                    </div>

                    {/* Delivery info */}
                    <div className="px-4 py-3 border-b border-gray-50">
                      <div className="flex items-start gap-2 text-xs text-gray-600">
                        <FiMapPin size={12} className="text-orange-400 mt-0.5 flex-shrink-0"/>
                        <span className="font-medium leading-relaxed">{order.deliveryAddress}</span>
                      </div>
                      {order.deliveryLocation?.lat && (
                        <p className="text-xs text-gray-400 mt-1 ml-4">
                          📍 {parseFloat(order.deliveryLocation.lat).toFixed(5)}, {parseFloat(order.deliveryLocation.lng).toFixed(5)}
                        </p>
                      )}
                      {order.assignedShop && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 ml-4">
                          <span>🏪 From:</span>
                          <span className="font-semibold">{order.assignedShop.name}</span>
                          <span style={{ color:C.orange, fontWeight:700 }}>
                            ({(order.assignedShop.distance/1000).toFixed(1)} km)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
                      <p className="text-xs text-gray-600">
                        {order.items.map((it,i) => (
                          <span key={i}>{it.name} ×{it.quantity}{i<order.items.length-1?', ':''}</span>
                        ))}
                      </p>
                      <span style={{ color:C.orange, fontWeight:900, fontSize:13 }}>
                        ₹{order.totalAmount}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="p-3 flex gap-2 flex-wrap">

                      {/* Advance status */}
                      {next && !isActive && (
                        <button onClick={() => updateStatus(order._id, next)}
                          style={{ background:C.orangePale, color:C.orange, border:`1.5px solid ${C.orangeBdr}`, borderRadius:10, padding:'7px 13px', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                          {next === 'out_for_delivery' ? '📦 Ready to Deliver' : `✅ Mark ${next.replace(/_/g,' ')}`}
                        </button>
                      )}

                      {/* GO LIVE button */}
                      {order.orderStatus === 'out_for_delivery' && !isDone && !isActive && (
                        <button onClick={() => startTracking(order)}
                          style={{
                            background:`linear-gradient(130deg,${C.orange},${C.orangeHot})`,
                            color:'#fff', border:'none', borderRadius:10,
                            padding:'7px 16px', fontSize:12, fontWeight:800,
                            cursor:'pointer', fontFamily:'inherit',
                            boxShadow:`0 4px 14px rgba(252,128,25,.42)`,
                            display:'flex', alignItems:'center', gap:6,
                          }}>
                          <FiNavigation size={13}/> Go Live 🛵
                        </button>
                      )}

                      {/* Active controls */}
                      {isActive && (
                        <>
                          <button onClick={() => markDelivered(order._id)}
                            style={{ background:C.green, color:'#fff', border:'none', borderRadius:10, padding:'7px 14px', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                            <FiCheck size={12}/> Mark Delivered
                          </button>
                          <button onClick={stopTracking}
                            style={{ background:'#FEF2F2', color:'#EF4444', border:'1.5px solid #FECACA', borderRadius:10, padding:'7px 12px', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                            Stop GPS
                          </button>
                          <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.orange, fontWeight:700, padding:'7px 0' }}>
                            <FiWifi size={12}/> Sending to customer…
                          </span>
                        </>
                      )}

                      {isDone && (
                        <>
                          {/* Delivered badge */}
                          <span style={{ background:'#F0FDF4', color:C.green, border:'1.5px solid #BBF7D0', borderRadius:10, padding:'7px 12px', fontSize:11, fontWeight:800, display:'inline-flex', alignItems:'center', gap:5 }}>
                            🎉 Delivered
                          </span>

                          {/* COD: collect payment button */}
                          {order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' && (
                            <button onClick={() => collectPayment(order._id, order.totalAmount)}
                              style={{ background:`linear-gradient(130deg,#f59e0b,#d97706)`, color:'#fff', border:'none', borderRadius:10, padding:'7px 16px', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 3px 10px rgba(245,158,11,.4)', display:'flex', alignItems:'center', gap:6 }}>
                              💵 Collect ₹{order.totalAmount}
                            </button>
                          )}

                          {/* COD paid badge */}
                          {order.paymentMethod === 'cod' && order.paymentStatus === 'paid' && (
                            <span style={{ background:'#FFFBEB', color:'#D97706', border:'1.5px solid #FDE68A', borderRadius:10, padding:'7px 12px', fontSize:11, fontWeight:800, display:'inline-flex', alignItems:'center', gap:5 }}>
                              💵 ₹{order.totalAmount} Collected ✅
                            </span>
                          )}

                          {/* Stripe paid badge */}
                          {order.paymentMethod === 'stripe' && (
                            <span style={{ background:'#EFF6FF', color:'#3B82F6', border:'1.5px solid #BFDBFE', borderRadius:10, padding:'7px 12px', fontSize:11, fontWeight:800, display:'inline-flex', alignItems:'center', gap:5 }}>
                              💳 Online Paid ✅
                            </span>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}