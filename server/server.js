const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');
const http       = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', methods: ['GET','POST'], credentials: true },
  transports: ['polling','websocket'],
});
app.set('io', io);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Auth, admin, distributor, customer, product routes ───────────
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/admin',       require('./routes/adminRoutes'));
app.use('/api/distributor', require('./routes/distributorRoutes'));
app.use('/api/customer',    require('./routes/customerRoutes'));
app.use('/api/products',    require('./routes/productRoutes'));
app.use('/api/orders',      require('./routes/orderRoutes'));
app.use('/api/payment',     require('./routes/paymentRoutes'));
app.use('/api/complaints',  require('./routes/complaintRoutes'));
app.use('/api/stock',       require('./routes/stockRoutes'));
app.use('/api/chatbot',     require('./routes/chatbotRoutes'));

app.get('/api/health', (_, res) => res.json({ status: 'OK', time: new Date() }));

// ── Models + helpers used by tracking endpoints ──────────────────
const Order = require('./models/Order');
const User  = require('./models/User');
const { haversine, etaFromDistance } = require('./utils/shopFinder');
const { protect, authorize }         = require('./middleware/auth');
const {
  sendOutForDeliverySMS,
  sendOrderDeliveredSMS,
  sendCODPaidSMS,
} = require('./utils/smsService');

// ════════════════════════════════════════════════════════════════
// TRACKING ENDPOINTS — defined directly here (specific before generic)
// POST routes MUST come before GET /:orderId to avoid param swallowing
// ════════════════════════════════════════════════════════════════

// POST /api/tracking/:orderId/start  — out for delivery + SMS
app.post('/api/tracking/:orderId/start', protect, authorize('distributor','admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('customer','name phone');
    if (!order) return res.status(404).json({ success:false, message:'Order not found' });
    order.orderStatus = 'out_for_delivery';
    await order.save();
    io.to(`order_${order._id}`).emit('status_update', { orderId:order._id.toString(), status:'out_for_delivery' });
    const distributor = await User.findById(req.user._id).select('name phone');
    if (order.customer?.phone) sendOutForDeliverySMS(order.customer, order, distributor).catch(()=>{});
    res.json({ success:true, message:'Delivery started — SMS sent' });
  } catch(err){ res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/tracking/:orderId/deliver — delivered + SMS + auto-pay Stripe
app.post('/api/tracking/:orderId/deliver', protect, authorize('distributor','admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('customer','name phone');
    if (!order) return res.status(404).json({ success:false, message:'Order not found' });
    order.orderStatus = 'delivered';
    order.deliveredAt = new Date();
    if (order.paymentMethod === 'stripe') order.paymentStatus = 'paid';
    await order.save();
    io.to(`order_${order._id}`).emit('order_delivered', {
      orderId:       order._id.toString(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      totalAmount:   order.totalAmount,
      ts:            Date.now(),
    });
    if (order.customer?.phone) sendOrderDeliveredSMS(order.customer, order).catch(()=>{});
    res.json({ success:true, message:'Delivered — SMS sent', paymentMethod:order.paymentMethod, paymentStatus:order.paymentStatus, totalAmount:order.totalAmount });
  } catch(err){ res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/tracking/:orderId/collect — COD cash collected + SMS
app.post('/api/tracking/:orderId/collect', protect, authorize('distributor','admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('customer','name phone');
    if (!order) return res.status(404).json({ success:false, message:'Order not found' });
    if (order.paymentMethod !== 'cod')
      return res.status(400).json({ success:false, message:'Not a COD order' });
    if (order.paymentStatus === 'paid')
      return res.status(400).json({ success:false, message:'Payment already collected' });
    order.paymentStatus = 'paid';
    await order.save();
    io.to(`order_${order._id}`).emit('payment_collected', {
      orderId:     order._id.toString(),
      totalAmount: order.totalAmount,
      ts:          Date.now(),
    });
    if (order.customer?.phone) sendCODPaidSMS(order.customer, order).catch(()=>{});
    res.json({ success:true, message:`COD ₹${order.totalAmount} collected — SMS sent to customer` });
  } catch(err){ res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/tracking/:orderId — LAST (generic param must be after all specific routes)
app.get('/api/tracking/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select('agentLocation orderStatus deliveryLocation assignedShop customer distributor etaMinutes paymentMethod paymentStatus totalAmount');
    if (!order) return res.status(404).json({ success:false, message:'Order not found' });
    const uid = req.user._id.toString();
    const ok  = order.customer.toString() === uid
             || order.distributor?.toString() === uid
             || req.user.role === 'admin';
    if (!ok) return res.status(403).json({ success:false, message:'Not authorized' });
    let eta = order.etaMinutes;
    const aL=order.agentLocation, dL=order.deliveryLocation;
    if (aL?.lat!=null && dL?.lat!=null) eta = etaFromDistance(haversine(aL.lat,aL.lng,dL.lat,dL.lng));
    res.json({ success:true, agentLocation:order.agentLocation, orderStatus:order.orderStatus, deliveryLocation:order.deliveryLocation, assignedShop:order.assignedShop, etaMinutes:eta, paymentMethod:order.paymentMethod, paymentStatus:order.paymentStatus, totalAmount:order.totalAmount });
  } catch(err){ res.status(500).json({ success:false, message:err.message }); }
});

// ════════════════════════════════════════════════════════════════
// Socket.IO — Real-time GPS tracking
// ════════════════════════════════════════════════════════════════
const agentSockets = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on('join_order_room', (orderId) => {
    socket.join(`order_${orderId}`);
    socket.emit('room_joined', { orderId, status:'ok' });
    console.log(`👤 Customer joined: order_${orderId}`);
  });

  socket.on('agent_join', (orderId) => {
    socket.join(`order_${orderId}`);
    agentSockets.set(orderId, socket.id);
    console.log(`🛵 Agent joined: order_${orderId}`);
  });

  socket.on('agent_location_update', async ({ orderId, lat, lng }) => {
    if (!orderId || lat==null || lng==null) return;
    const pLat=parseFloat(lat), pLng=parseFloat(lng);
    if (!isFinite(pLat)||!isFinite(pLng)) return;
    try {
      const order = await Order.findById(orderId).select('deliveryLocation');
      let eta = null;
      if (order?.deliveryLocation?.lat!=null) {
        eta = etaFromDistance(haversine(pLat, pLng, order.deliveryLocation.lat, order.deliveryLocation.lng));
      }
      await Order.findByIdAndUpdate(orderId, { agentLocation:{ lat:pLat, lng:pLng, updatedAt:new Date() }, ...(eta!==null&&{ etaMinutes:eta }) });
      io.to(`order_${orderId}`).emit('location_update', { lat:pLat, lng:pLng, ts:Date.now(), eta });
    } catch(err){ console.error('GPS update error:', err.message); }
  });

  socket.on('mark_delivered', async ({ orderId }) => {
    try {
      await Order.findByIdAndUpdate(orderId, { orderStatus:'delivered', deliveredAt:new Date() });
      io.to(`order_${orderId}`).emit('order_delivered', { orderId, ts:Date.now() });
    } catch(err){ console.error('mark_delivered error:', err.message); }
  });

  socket.on('disconnect', () => {
    for (const [oid, sid] of agentSockets.entries()) {
      if (sid === socket.id) {
        agentSockets.delete(oid);
        io.to(`order_${oid}`).emit('agent_offline', { orderId:oid });
      }
    }
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// ── Error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status||500).json({ success:false, message:err.message||'Server Error' });
});

// ── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await require('./utils/seedAdmin')();
    server.listen(PORT, () => console.log(`✅ Server → http://localhost:${PORT}`));
  })
  .catch(err => { console.error('❌ MongoDB:', err); process.exit(1); });