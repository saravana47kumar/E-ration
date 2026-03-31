const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

// POST /api/chatbot/message
router.post('/message', protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const user = req.user;

    // ── Build real-time context from DB ──────────────────────────────
    let contextData = '';

    try {
      if (user.role === 'customer') {
        const recentOrders = await Order.find({ customer: user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('items.product', 'name');

        const openComplaints = await Complaint.find({
          customer: user._id,
          status: { $in: ['open', 'in_progress'] }
        }).limit(3);

        const products = await Product.find({ isActive: true })
          .limit(10)
          .select('name category price unit availableStock');

        contextData = `
CUSTOMER DATA:
- Name: ${user.name}
- Email: ${user.email}
- Ration Card: ${user.rationCardNumber || 'Not set'}
- Address: ${user.address || 'Not set'}

RECENT ORDERS (last 5):
${recentOrders.length === 0
  ? 'No orders yet.'
  : recentOrders.map(o =>
      `  • Order #${o._id.toString().slice(-8).toUpperCase()} | Status: ${o.orderStatus} | Payment: ${o.paymentStatus} | Amount: Rs.${o.totalAmount} | Date: ${new Date(o.createdAt).toLocaleDateString()} | Items: ${o.items.map(i => i.name).join(', ')}`
    ).join('\n')}

OPEN COMPLAINTS:
${openComplaints.length === 0
  ? 'No open complaints.'
  : openComplaints.map(c =>
      `  • [${c.status}] ${c.subject} (${new Date(c.createdAt).toLocaleDateString()})`
    ).join('\n')}

AVAILABLE PRODUCTS (sample):
${products.map(p =>
  `  • ${p.name} | ${p.category} | Rs.${p.price}/${p.unit} | Stock: ${p.availableStock}`
).join('\n')}`;

      } else if (user.role === 'distributor') {
        const myOrders = await Order.find({ distributor: user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('customer', 'name phone');

        const pendingCount = await Order.countDocuments({
          distributor: user._id,
          orderStatus: { $in: ['confirmed', 'processing', 'out_for_delivery'] }
        });
        const deliveredCount = await Order.countDocuments({
          distributor: user._id,
          orderStatus: 'delivered'
        });

        contextData = `
DISTRIBUTOR DATA:
- Name: ${user.name}
- Email: ${user.email}

ORDER SUMMARY:
- Pending deliveries: ${pendingCount}
- Delivered orders: ${deliveredCount}

RECENT ORDERS:
${myOrders.length === 0
  ? 'No orders assigned.'
  : myOrders.map(o =>
      `  • Order #${o._id.toString().slice(-8).toUpperCase()} | Customer: ${o.customer?.name} | Status: ${o.orderStatus} | Rs.${o.totalAmount}`
    ).join('\n')}`;

      } else if (user.role === 'admin') {
        const totalCustomers   = await User.countDocuments({ role: 'customer' });
        const totalDistributors = await User.countDocuments({ role: 'distributor' });
        const totalOrders      = await Order.countDocuments();
        const pendingOrders    = await Order.countDocuments({ orderStatus: 'placed' });
        const openComplaints   = await Complaint.countDocuments({ status: 'open' });

        contextData = `
ADMIN DATA:
- Total Customers: ${totalCustomers}
- Total Distributors: ${totalDistributors}
- Total Orders: ${totalOrders}
- Pending Orders: ${pendingOrders}
- Open Complaints: ${openComplaints}`;
      }
    } catch (dbErr) {
      console.error('DB context error:', dbErr.message);
    }

    // ── System prompt ────────────────────────────────────────────────
    const systemPrompt = `You are RationBot, a helpful AI assistant for the E-Ration Management System — a government Public Distribution System (PDS) portal for India.

You help users with:
- Checking order status and delivery updates
- Understanding payment methods (Stripe online payment & Cash on Delivery)
- Booking ration items (Rice, Wheat, Sugar, Oil, Kerosene, Pulses)
- Submitting and tracking complaints
- Profile and ration card management
- Stock availability and product information
- Navigation guidance within the portal

Current logged-in user: ${user.name} (Role: ${user.role})
${contextData}

IMPORTANT RULES:
1. Always be polite, concise, and helpful in simple English
2. Use the live data above to give specific, accurate answers
3. For order status questions, refer to the RECENT ORDERS data above
4. If you don't know something specific, guide the user to the right page in the app
5. Never make up order IDs, amounts, or dates — only use data provided above
6. Keep responses under 150 words unless a detailed explanation is needed
7. Use bullet points for lists to keep things readable

Navigation guide:
- Book ration items → /customer/book-ration
- View cart → /customer/cart
- Order history → /customer/my-ration
- Submit complaint → /customer/complaints
- Edit profile → /customer/profile`;

    // ── Build messages array ─────────────────────────────────────────
    // Groq uses OpenAI-compatible format: system goes inside messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      // last 10 turns of history
      ...history.slice(-10).filter(t => t.role && t.content),
      { role: 'user', content: message.trim() },
    ];

    // ── Call Groq API (FREE — llama-3.3-70b-versatile) ───────────────
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',   // free, fast, smart
        max_tokens: 512,
        temperature: 0.7,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText);
      return res.status(502).json({
        success: false,
        message: 'AI service temporarily unavailable. Please try again.'
      });
    }

    const groqData = await response.json();
    const reply =
      groqData.choices?.[0]?.message?.content ||
      'Sorry, I could not generate a response. Please try again.';

    res.json({ success: true, reply });

  } catch (error) {
    console.error('Chatbot error:', error.message);
    res.status(500).json({ success: false, message: 'Chatbot error. Please try again.' });
  }
});

module.exports = router;