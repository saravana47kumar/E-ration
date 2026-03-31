const twilio = require('twilio');

// Initialize Twilio client only if credentials exist
let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Helper to format phone number to E.164 format (India)
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  // Remove any non-digit characters
  let cleaned = phone.toString().replace(/\D/g, '');
  // Add +91 for Indian numbers if not present
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 13 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  // If already has + prefix, return as is
  if (phone.toString().startsWith('+')) {
    return phone.toString();
  }
  return phone.toString();
};

// Generic SMS sender with error handling
const sendSMS = async (to, body) => {
  const formattedNumber = formatPhoneNumber(to);
  if (!formattedNumber) {
    console.log('SMS skipped: No valid phone number');
    return { success: false, error: 'No valid phone number' };
  }

  // Mock mode for development/testing when no Twilio credentials
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log(`[SMS MOCK] To: ${formattedNumber}`);
    console.log(`[SMS MOCK] Body: ${body}`);
    console.log(`[SMS MOCK] ========================================`);
    return { success: true, mock: true, to: formattedNumber };
  }

  try {
    const message = await client.messages.create({
      body: body,
      to: formattedNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
    console.log(`SMS sent to ${formattedNumber}, SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('SMS send error:', error.message);
    return { success: false, error: error.message };
  }
};

// Helper to safely get order ID string
const getOrderIdString = (order) => {
  if (!order || !order._id) return 'unknown';
  // Convert ObjectId to string
  const idStr = order._id.toString();
  // Return last 8 characters
  return idStr.slice(-8).toUpperCase();
};

// Order Placed SMS
const sendOrderPlacedSMS = async (customer, order) => {
  if (!customer?.phone) {
    console.log('Order placed SMS skipped: No customer phone');
    return;
  }
  const orderId = getOrderIdString(order);
  const message = `🌾 E-Ration: Your order #${orderId} has been placed for ₹${order.totalAmount}. You will receive updates shortly. - E-Ration System`;
  return sendSMS(customer.phone, message);
};

// Order Confirmed SMS
const sendOrderConfirmedSMS = async (customer, order) => {
  if (!customer?.phone) {
    console.log('Order confirmed SMS skipped: No customer phone');
    return;
  }
  const orderId = getOrderIdString(order);
  const message = `✅ E-Ration: Order #${orderId} confirmed! Your items will be processed soon. - E-Ration System`;
  return sendSMS(customer.phone, message);
};

// Out for Delivery SMS
const sendOutForDeliverySMS = async (customer, order, distributor) => {
  if (!customer?.phone) {
    console.log('Out for delivery SMS skipped: No customer phone');
    return;
  }
  const orderId = getOrderIdString(order);
  const message = `🛵 E-Ration: Your order #${orderId} is out for delivery! ${distributor?.name || 'Delivery agent'} is on the way. Track live in the app. - E-Ration System`;
  return sendSMS(customer.phone, message);
};

// Order Delivered SMS
const sendOrderDeliveredSMS = async (customer, order) => {
  if (!customer?.phone) {
    console.log('Order delivered SMS skipped: No customer phone');
    return;
  }
  const orderId = getOrderIdString(order);
  const message = `🎉 E-Ration: Order #${orderId} delivered! Thank you for choosing E-Ration. Rate your experience in the app. - E-Ration System`;
  return sendSMS(customer.phone, message);
};

// Order Cancelled SMS
const sendOrderCancelledSMS = async (customer, order) => {
  if (!customer?.phone) {
    console.log('Order cancelled SMS skipped: No customer phone');
    return;
  }
  const orderId = getOrderIdString(order);
  const message = `⚠️ E-Ration: Order #${orderId} has been cancelled. Contact support if you have questions. - E-Ration System`;
  return sendSMS(customer.phone, message);
};

// COD Payment Collected SMS
const sendCODPaidSMS = async (customer, order) => {
  if (!customer?.phone) {
    console.log('COD paid SMS skipped: No customer phone');
    return;
  }
  const orderId = getOrderIdString(order);
  const message = `💰 E-Ration: Payment of ₹${order.totalAmount} received for order #${orderId}. Thank you! - E-Ration System`;
  return sendSMS(customer.phone, message);
};

// Payment Success SMS (Stripe)
const sendPaymentSuccessSMS = async (customer, order) => {
  if (!customer?.phone) {
    console.log('Payment success SMS skipped: No customer phone');
    return;
  }
  const orderId = getOrderIdString(order);
  const message = `💳 E-Ration: Payment of ₹${order.totalAmount} successful for order #${orderId}. Your order is confirmed! - E-Ration System`;
  return sendSMS(customer.phone, message);
};

// Stock Approved SMS
const sendStockApprovedSMS = async (distributor, product, approvedQuantity) => {
  if (!distributor?.phone) {
    console.log('Stock approved SMS skipped: No distributor phone');
    return;
  }
  const message = `📦 Stock Request Approved: ${approvedQuantity} ${product.unit} of ${product.name} has been allocated to you. - E-Ration System`;
  return sendSMS(distributor.phone, message);
};

// Offer SMS (for sending to multiple customers)
const sendOfferSMS = async (phoneNumber, message) => {
  if (!phoneNumber) {
    console.log('Offer SMS skipped: No phone number');
    return;
  }
  return sendSMS(phoneNumber, message);
};

module.exports = {
  sendOrderPlacedSMS,
  sendOrderConfirmedSMS,
  sendOutForDeliverySMS,
  sendOrderDeliveredSMS,
  sendOrderCancelledSMS,
  sendCODPaidSMS,
  sendPaymentSuccessSMS,
  sendStockApprovedSMS,
  sendOfferSMS,
};