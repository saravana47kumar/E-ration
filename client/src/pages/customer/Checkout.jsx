/**
 * Checkout.jsx
 * Customer selects delivery location by clicking on Leaflet/OSM map
 * Lat/Lng saved → sent to backend → nearest shop auto-assigned
 * NO Google Maps API key required
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { customerLinks } from './links';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiCreditCard, FiTruck, FiMapPin, FiNavigation, FiCheck } from 'react-icons/fi';

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// ── Load Leaflet (CDN, idempotent) ────────────────────────────────
function loadLeaflet() {
  return new Promise(resolve => {
    if (window.L?.map) return resolve(window.L);
    if (!document.getElementById('lf-css')) {
      const l=document.createElement('link');
      l.id='lf-css'; l.rel='stylesheet';
      l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    const s=document.createElement('script');
    s.id='lf-js-co'; s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload=()=>resolve(window.L);
    document.head.appendChild(s);
  });
}

// Reverse-geocode with Nominatim (free, no key)
async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    return d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

const C = {
  orange:'#FC8019', orangeHot:'#E87010', orangePale:'#FFF3EA',
  orangeBdr:'#FDE8CC', black:'#1C1C1C', mid:'#686B78', line:'#D4D5D9',
};

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [paymentMethod,    setPaymentMethod]    = useState('cod');
  const [deliveryAddress,  setDeliveryAddress]  = useState(user?.address || '');
  const [deliveryLocation, setDeliveryLocation] = useState(null); // { lat, lng }
  const [loading,  setLoading]  = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [pinSet,   setPinSet]   = useState(false);

  const mapRef    = useRef(null);
  const mapObj    = useRef(null);
  const markerRef = useRef(null);

  // ── Load Leaflet ──────────────────────────────────────────────
  useEffect(() => {
    loadLeaflet().then(() => setMapReady(true));
  }, []);

  // ── Init map ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapObj.current) return;
    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [11.0168, 76.9558], // Coimbatore default
      zoom: 13,
      zoomControl: true,
    });
    mapObj.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Try to center on user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.setView([lat, lng], 15);
        placeMarker(L, map, lat, lng);
      }, () => {});
    }

    // Click to place marker
    map.on('click', e => {
      placeMarker(L, map, e.latlng.lat, e.latlng.lng);
    });
  }, [mapReady]);

  const placeMarker = async (L, map, lat, lng) => {
    // Custom pin icon
    const icon = L.divIcon({
      className: '',
      iconSize: [40,52], iconAnchor:[20,52],
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="
            background:#FC8019;color:#fff;width:36px;height:36px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;font-size:18px;
            border:3px solid #fff;box-shadow:0 4px 12px rgba(252,128,25,.6);
            animation:pinBounce .4s ease;
          ">📍</div>
          <div style="
            width:0;height:0;
            border-left:5px solid transparent;border-right:5px solid transparent;
            border-top:8px solid #FC8019;margin-top:-1px;
          "></div>
        </div>`,
    });

    if (markerRef.current) map.removeLayer(markerRef.current);
    markerRef.current = L.marker([lat,lng], { icon }).addTo(map);

    setDeliveryLocation({ lat, lng });
    setPinSet(true);

    // Reverse geocode for address
    const addr = await reverseGeocode(lat, lng);
    setDeliveryAddress(addr);
    toast.success('📍 Location pinned!', { duration: 2000 });
  };

  // ── Use my GPS location ───────────────────────────────────────
  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const L = window.L, map = mapObj.current;
      if (!L || !map) return;
      map.setView([lat, lng], 16);
      placeMarker(L, map, lat, lng);
    }, () => toast.error('Could not get location'));
  };

  // ── Place COD order ───────────────────────────────────────────
  const placeCOD = async () => {
    if (!deliveryLocation) return toast.error('Please pin your delivery location on the map');
    if (!deliveryAddress.trim()) return toast.error('Delivery address is required');
    setLoading(true);
    try {
      const { data } = await API.post('/customer/orders', {
        items:           cart.map(i=>({ product:i._id, name:i.name, image:i.image, price:i.price, quantity:i.quantity, unit:i.unit })),
        totalAmount:     cartTotal,
        paymentMethod:   'cod',
        deliveryAddress: deliveryAddress.trim(),
        deliveryLocation,
        rationCardNumber: user?.rationCardNumber || '',
      });
      clearCart();
      toast.success('Order placed successfully! 🎉');
      navigate(`/customer/orders/${data.order._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally { setLoading(false); }
  };

  // ── Stripe payment ────────────────────────────────────────────
  const payStripe = async () => {
    if (!deliveryLocation) return toast.error('Please pin your delivery location on the map');
    if (!deliveryAddress.trim()) return toast.error('Delivery address is required');
    setLoading(true);
    try {
      const { data } = await API.post('/payment/create-checkout-session', {
        items:           cart.map(i=>({ product:i._id, name:i.name, image:i.image, price:i.price, quantity:i.quantity, unit:i.unit })),
        totalAmount:     cartTotal,
        deliveryAddress: deliveryAddress.trim(),
        deliveryLocation,
        rationCardNumber: user?.rationCardNumber || '',
      });
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment error');
    } finally { setLoading(false); }
  };

  if (!cart.length) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar links={customerLinks} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-gray-500 text-lg font-semibold">Your cart is empty</p>
            <button onClick={()=>navigate('/customer/book')}
              className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600">
              Shop Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ fontFamily:"'Poppins','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        @keyframes pinBounce{0%{transform:scale(0) translateY(-20px)}80%{transform:scale(1.15)}100%{transform:scale(1)}}
      `}</style>
      <Sidebar links={customerLinks} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900">Checkout</h1>
            <p className="text-sm text-gray-500 mt-1">{cart.length} item{cart.length>1?'s':''} · ₹{cartTotal}</p>
          </div>

          {/* ── MAP SECTION ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
            <div style={{ background:`linear-gradient(130deg,${C.orange},${C.orangeHot})`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div className="flex items-center gap-2">
                <FiMapPin className="text-white" size={18}/>
                <span style={{ color:'#fff', fontWeight:800, fontSize:15 }}>Pin Delivery Location</span>
              </div>
              <button onClick={useMyLocation}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition">
                <FiNavigation size={12}/> My Location
              </button>
            </div>

            {/* Instruction */}
            <div style={{ background:C.orangePale, borderBottom:`1px solid ${C.orangeBdr}`, padding:'8px 16px', fontSize:12, color:C.mid, fontWeight:500 }}>
              {pinSet
                ? <span style={{ color:C.orange, fontWeight:700 }}>✅ Location pinned! You can drag the map or click to repin.</span>
                : '👆 Click anywhere on the map to drop your delivery pin'}
            </div>

            {/* Leaflet map */}
            <div ref={mapRef} style={{ height:280 }}/>

            {/* Address input */}
            <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.line}` }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.mid, display:'block', marginBottom:5 }}>
                DELIVERY ADDRESS
              </label>
              <textarea
                value={deliveryAddress}
                onChange={e=>setDeliveryAddress(e.target.value)}
                rows={2}
                placeholder="Address auto-filled when you pin · or type manually"
                style={{
                  width:'100%', fontSize:13, color:C.black, fontWeight:500,
                  border:`1.5px solid ${C.line}`, borderRadius:10, padding:'8px 12px',
                  outline:'none', resize:'none', fontFamily:'inherit',
                }}
                onFocus={e=>e.target.style.borderColor=C.orange}
                onBlur={e=>e.target.style.borderColor=C.line}
              />
              {deliveryLocation && (
                <p style={{ fontSize:11, color:C.mid, marginTop:4 }}>
                  📍 {deliveryLocation.lat.toFixed(6)}, {deliveryLocation.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          {/* ── ORDER SUMMARY ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-5">
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.line}` }}>
              <p style={{ fontWeight:800, fontSize:14, color:C.black }}>Order Summary</p>
            </div>
            <div style={{ padding:'8px 16px' }}>
              {cart.map((item,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom: i<cart.length-1?`1px solid ${C.line}`:'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {item.image && <img src={item.image} alt={item.name} style={{ width:36,height:36,borderRadius:8,objectFit:'cover' }}/>}
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:C.black, margin:0 }}>{item.name}</p>
                      <p style={{ fontSize:11, color:C.mid, margin:0 }}>× {item.quantity} {item.unit}</p>
                    </div>
                  </div>
                  <p style={{ fontSize:13, fontWeight:700, color:C.black }}>₹{(item.price*item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:800, fontSize:15, color:C.black }}>Total</span>
              <span style={{ fontWeight:900, fontSize:17, color:C.orange }}>₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* ── PAYMENT METHOD ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-5 overflow-hidden">
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.line}` }}>
              <p style={{ fontWeight:800, fontSize:14, color:C.black }}>Payment Method</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, padding:16 }}>
              {[
                { key:'cod',    icon:'💵', label:'Cash on Delivery', sub:'Pay when delivered' },
                { key:'stripe', icon:'💳', label:'Pay Online',       sub:'Card / UPI / Wallet' },
              ].map(opt => (
                <button key={opt.key} onClick={()=>setPaymentMethod(opt.key)} style={{
                  border:`2px solid ${paymentMethod===opt.key?C.orange:C.line}`,
                  background: paymentMethod===opt.key?C.orangePale:'#fff',
                  borderRadius:14, padding:'12px 10px',
                  textAlign:'left', cursor:'pointer', position:'relative',
                  transition:'all .2s',
                }}>
                  {paymentMethod===opt.key && (
                    <div style={{ position:'absolute',top:8,right:8,width:18,height:18,borderRadius:'50%',background:C.orange,display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <FiCheck size={11} color="#fff"/>
                    </div>
                  )}
                  <div style={{ fontSize:22, marginBottom:4 }}>{opt.icon}</div>
                  <p style={{ fontSize:12, fontWeight:800, color:C.black, margin:0 }}>{opt.label}</p>
                  <p style={{ fontSize:10, color:C.mid, margin:'2px 0 0' }}>{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── PLACE ORDER BUTTON ── */}
          <button
            onClick={paymentMethod==='cod' ? placeCOD : payStripe}
            disabled={loading || !pinSet}
            style={{
              width:'100%', padding:'15px',
              background: loading||!pinSet
                ? C.line
                : `linear-gradient(130deg,${C.orange},${C.orangeHot})`,
              color: loading||!pinSet ? C.mid : '#fff',
              border:'none', borderRadius:16,
              fontWeight:900, fontSize:16,
              cursor: loading||!pinSet ? 'not-allowed' : 'pointer',
              boxShadow: loading||!pinSet ? 'none' : `0 4px 16px rgba(252,128,25,.42)`,
              fontFamily:'inherit', letterSpacing:'-.2px',
              transition:'all .2s',
            }}>
            {loading
              ? '⏳ Processing…'
              : !pinSet
                ? '📍 Please pin your location first'
                : paymentMethod==='cod'
                  ? `🛵 Place Order · ₹${cartTotal.toFixed(2)}`
                  : `💳 Pay ₹${cartTotal.toFixed(2)}`
            }
          </button>

          <p style={{ textAlign:'center', fontSize:11, color:C.mid, marginTop:10 }}>
            🔒 Nearest ration shop auto-assigned after order
          </p>
        </div>
      </div>
    </div>
  );
}