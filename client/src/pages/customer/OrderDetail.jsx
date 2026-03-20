/**
 * OrderDetail.jsx — Customer order detail + live tracking
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';
import LiveTracking from '../../components/LiveTracking';
import { customerLinks } from './links';
import API from '../../utils/api';
import { FiArrowLeft, FiPackage, FiMapPin, FiCreditCard } from 'react-icons/fi';

const STATUS_STEPS = ['placed','confirmed','processing','out_for_delivery','delivered'];
const STEP_META = {
  placed:          { emoji:'📋', label:'Placed',     color:'#64748b' },
  confirmed:       { emoji:'✅', label:'Confirmed',   color:'#3b82f6' },
  processing:      { emoji:'📦', label:'Packing',     color:'#f59e0b' },
  out_for_delivery:{ emoji:'🛵', label:'On the Way', color:'#FC8019' },
  delivered:       { emoji:'🎉', label:'Delivered',   color:'#22c55e' },
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/customer/orders/${id}`)
      .then(({ data }) => setOrder(data.order))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Poll for status updates when out for delivery
  useEffect(() => {
    if (!order || !['out_for_delivery','confirmed','processing'].includes(order.orderStatus)) return;
    const t = setInterval(() => {
      API.get(`/customer/orders/${id}`)
        .then(({ data }) => setOrder(data.order))
        .catch(() => {});
    }, 15000); // every 15s
    return () => clearInterval(t);
  }, [order?.orderStatus, id]);

  if (loading) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks}/>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-gray-500">Loading order…</p>
        </div>
      </div>
    </div>
  );

  if (!order) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks}/>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-gray-500">Order not found</p>
          <Link to="/customer/orders" className="mt-3 inline-block text-orange-500 font-bold">← Back to orders</Link>
        </div>
      </div>
    </div>
  );

  const stepIdx = STATUS_STEPS.indexOf(order.orderStatus);
  const progress = stepIdx >= 0 ? (stepIdx / (STATUS_STEPS.length-1))*100 : 0;

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ fontFamily:"'Poppins','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`}</style>
      <Sidebar links={customerLinks}/>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">

          {/* Back */}
          <Link to="/customer/orders" className="inline-flex items-center gap-2 text-gray-500 hover:text-orange-500 mb-5 font-semibold transition">
            <FiArrowLeft/> Back to Orders
          </Link>

          {/* Header card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
            <div style={{ background:'linear-gradient(130deg,#FC8019,#E87010)', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🛵</div>
                <div>
                  <p className="text-white font-black text-sm m-0">Order #{order._id.slice(-8).toUpperCase()}</p>
                  <p className="text-orange-100 text-xs m-0">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <Badge status={order.orderStatus}/>
            </div>

            {/* Progress stepper */}
            <div className="p-4">
              <div className="relative">
                <div className="absolute h-1 bg-gray-100 rounded-full" style={{ top:14, left:20, right:20 }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${progress}%`, background:'linear-gradient(90deg,#FC8019,#E87010)', boxShadow:'0 0 8px rgba(252,128,25,.5)' }}/>
                </div>
                <div className="flex justify-between relative">
                  {STATUS_STEPS.map((s,i) => {
                    const done=i<=stepIdx, cur=i===stepIdx, meta=STEP_META[s];
                    return (
                      <div key={s} className="flex flex-col items-center gap-1" style={{ minWidth:52 }}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all duration-300 ${done?'text-white border-orange-500':'bg-white border-gray-200 text-gray-300'} ${cur?'ring-4 ring-orange-100 scale-110':''}`}
                          style={done?{ background:meta.color, borderColor:meta.color }:{}}>
                          {done ? meta.emoji : i+1}
                        </div>
                        <span className="text-center leading-tight" style={{ fontSize:9, color:cur?meta.color:done?'#6b7280':'#d1d5db', fontWeight:cur?800:600 }}>
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── LIVE TRACKING ── only when out for delivery */}
          {['out_for_delivery','delivered'].includes(order.orderStatus) && (
            <div className="mb-5">
              <LiveTracking
                orderId={order._id}
                deliveryLocation={order.deliveryLocation}
                orderStatus={order.orderStatus}
                assignedShop={order.assignedShop}
              />
            </div>
          )}

          {/* Assigned shop info (always show if available) */}
          {order.assignedShop && !['out_for_delivery','delivered'].includes(order.orderStatus) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
              <p className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2"><span>🏪</span> Assigned Ration Shop</p>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">🏪</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{order.assignedShop.name}</p>
                  <p className="text-xs text-gray-500">{order.assignedShop.address}</p>
                </div>
                {order.assignedShop.distance && (
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-lg">
                    {(order.assignedShop.distance/1000).toFixed(1)} km
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-5 overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-gray-100">
              <FiPackage className="text-orange-500"/><p className="font-black text-gray-900 text-sm">Order Items</p>
            </div>
            {order.items.map((item,i) => (
              <div key={i} className="flex items-center gap-3 p-4" style={{ borderBottom: i<order.items.length-1?'1px solid #f3f4f6':'none' }}>
                {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover"/>}
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">× {item.quantity} {item.unit}</p>
                </div>
                <p className="font-bold text-gray-900">₹{(item.price*item.quantity).toFixed(2)}</p>
              </div>
            ))}
            <div className="flex justify-between items-center p-4 bg-orange-50 border-t border-orange-100">
              <span className="font-black text-gray-900">Total</span>
              <span className="font-black text-orange-500 text-lg">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery + Payment */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2"><FiMapPin className="text-orange-500"/><p className="font-black text-gray-900 text-xs">Delivery</p></div>
              <p className="text-xs text-gray-600 leading-relaxed">{order.deliveryAddress}</p>
              {order.deliveryLocation?.lat && (
                <p className="text-xs text-gray-400 mt-1">📍 {order.deliveryLocation.lat.toFixed(4)}, {order.deliveryLocation.lng.toFixed(4)}</p>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2"><FiCreditCard className="text-orange-500"/><p className="font-black text-gray-900 text-xs">Payment</p></div>
              <p className="text-xs font-bold text-gray-900 capitalize">{order.paymentMethod}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${order.paymentStatus==='paid'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}