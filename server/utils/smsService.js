/**
 * smsService.js  —  Twilio SMS wrapper
 * All functions are fire-and-forget (never crash main flow)
 *
 * Set in backend/.env:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=your_token
 *   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
 *
 * Free alternative: leave env vars empty → SMS silently skipped,
 * console shows the message that WOULD have been sent.
 */
const twilio = require('twilio');

const SID   = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM  = process.env.TWILIO_PHONE_NUMBER;

const getClient = () => {
  if (!SID || !TOKEN || !FROM) return null;
  return twilio(SID, TOKEN);
};

// Normalize phone → E.164 (+91xxxxxxxxxx for India)
const normalizePhone = (phone) => {
  if (!phone) return null;
  let p = phone.toString().trim().replace(/\s+/g, '');
  if (p.startsWith('+')) return p;
  p = p.replace(/\D/g, '');
  if (p.length === 10)                        return '+91' + p;
  if (p.length === 12 && p.startsWith('91'))  return '+' + p;
  if (p.length === 11 && p.startsWith('0'))   return '+91' + p.slice(1);
  return '+' + p;
};

// ── Core send ─────────────────────────────────────────────────────
const sendSMS = async (phone, message) => {
  const to = normalizePhone(phone);
  if (!to) return;

  const client = getClient();
  if (!client) {
    // Dev mode: just log
    console.log(`📱 [SMS DEV] To: ${to}\n${message}\n${'─'.repeat(50)}`);
    return;
  }
  try {
    const r = await client.messages.create({ body: message, from: FROM, to });
    console.log(`✅ SMS → ${to} | SID: ${r.sid}`);
    return r;
  } catch (err) {
    console.error(`❌ SMS failed → ${to}: ${err.message}`);
  }
};

// ═══════════════════════════════════════════════════════
//   SMS TEMPLATES
// ═══════════════════════════════════════════════════════

// 1. Order placed (COD)
const sendOrderPlacedSMS = (customer, order) => {
  const items = order.items.map(i=>`${i.name}(${i.quantity}${i.unit})`).join(', ');
  return sendSMS(customer.phone,
    `Dear ${customer.name},\n` +
    `✅ Order #${order._id.toString().slice(-8).toUpperCase()} placed!\n` +
    `Items: ${items}\n` +
    `Total: ₹${order.totalAmount} | Pay: Cash on Delivery\n` +
    `Track live in E-Ration App. -E-Ration`
  );
};

// 2. Payment received (Stripe)
const sendPaymentSuccessSMS = (customer, order) => {
  const items = order.items.map(i=>`${i.name}(${i.quantity}${i.unit})`).join(', ');
  return sendSMS(customer.phone,
    `Dear ${customer.name},\n` +
    `💳 Payment ₹${order.totalAmount} received!\n` +
    `Order #${order._id.toString().slice(-8).toUpperCase()}\n` +
    `Items: ${items}\n` +
    `Your ration will be delivered soon. -E-Ration`
  );
};

// 3. Order confirmed by admin
const sendOrderConfirmedSMS = (customer, order) => {
  return sendSMS(customer.phone,
    `Dear ${customer.name},\n` +
    `✅ Order #${order._id.toString().slice(-8).toUpperCase()} CONFIRMED.\n` +
    `₹${order.totalAmount} | Being packed now.\n` +
    `-E-Ration`
  );
};

// 4. Out for delivery
const sendOutForDeliverySMS = (customer, order, distributor) => {
  const distInfo = distributor ? `Agent: ${distributor.name}${distributor.phone?' | '+distributor.phone:''}` : '';
  const payNote  = order.paymentMethod === 'cod'
    ? `Please keep ₹${order.totalAmount} ready (Cash).`
    : `Payment already received. ✅`;
  return sendSMS(customer.phone,
    `Dear ${customer.name},\n` +
    `🛵 Your ration #${order._id.toString().slice(-8).toUpperCase()} is OUT FOR DELIVERY!\n` +
    `${distInfo}\n` +
    `${payNote}\n` +
    `Track live in E-Ration App. -E-Ration`
  );
};

// 5. ✅ Order DELIVERED — rich message
const sendOrderDeliveredSMS = (customer, order) => {
  const payLine = order.paymentMethod === 'cod'
    ? (order.paymentStatus === 'paid'
        ? `Payment: ₹${order.totalAmount} collected. ✅`
        : `Payment: ₹${order.totalAmount} COD — please pay the agent.`)
    : `Payment: ₹${order.totalAmount} — Online (Paid). ✅`;

  return sendSMS(customer.phone,
    `Dear ${customer.name},\n` +
    `🎉 Your ration has been DELIVERED!\n` +
    `Order #${order._id.toString().slice(-8).toUpperCase()}\n` +
    `${payLine}\n` +
    `Thank you for using E-Ration! -E-Ration`
  );
};

// 6. COD cash collected by distributor
const sendCODPaidSMS = (customer, order) => {
  return sendSMS(customer.phone,
    `Dear ${customer.name},\n` +
    `💵 Cash payment ₹${order.totalAmount} collected for\n` +
    `Order #${order._id.toString().slice(-8).toUpperCase()}.\n` +
    `Receipt recorded. Thank you! -E-Ration`
  );
};

// 7. Order cancelled
const sendOrderCancelledSMS = (customer, order) => {
  return sendSMS(customer.phone,
    `Dear ${customer.name},\n` +
    `❌ Order #${order._id.toString().slice(-8).toUpperCase()} has been CANCELLED.\n` +
    `Amount: ₹${order.totalAmount}\n` +
    `Contact support for help. -E-Ration`
  );
};

// 8. Stock approved (for distributor)
const sendStockApprovedSMS = (distributor, product, qty) => {
  return sendSMS(distributor.phone,
    `Dear ${distributor.name},\n` +
    `✅ Stock request APPROVED.\n` +
    `${product.name}: ${qty} ${product.unit} added to your account.\n` +
    `-E-Ration Admin`
  );
};

module.exports = {
  sendSMS,
  sendOrderPlacedSMS,
  sendPaymentSuccessSMS,
  sendOrderConfirmedSMS,
  sendOutForDeliverySMS,
  sendOrderDeliveredSMS,
  sendOrderCancelledSMS,
  sendCODPaidSMS,
  sendStockApprovedSMS,
};