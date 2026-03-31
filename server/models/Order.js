const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:     String,
  image:    String,
  price:    Number,
  quantity: Number,
  unit:     String,
});

const geoSchema = new mongoose.Schema({
  lat:       { type: Number, default: null },
  lng:       { type: Number, default: null },
  updatedAt: { type: Date,   default: null },
}, { _id: false });

const shopSchema = new mongoose.Schema({
  placeId:  String,
  name:     String,
  address:  String,
  lat:      Number,
  lng:      Number,
  distance: Number, // metres
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  distributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  items:       [orderItemSchema],
  totalAmount: { type: Number, required: true },

  paymentMethod: { type: String, enum: ['stripe','cod'], required: true },
  paymentStatus: { type: String, enum: ['pending','paid','failed'], default: 'pending' },
  orderStatus:   {
    type:    String,
    enum:    ['placed','confirmed','processing','out_for_delivery','delivered','cancelled'],
    default: 'placed',
  },

  stripeSessionId:       { type: String, default: '' },
  stripePaymentIntentId: { type: String, default: '' },

  deliveryAddress:  { type: String, required: true },
  // lat/lng clicked on map by customer
  deliveryLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },

  // nearest ration shop auto-assigned at order time
  assignedShop: shopSchema,

  rationCardNumber: { type: String, default: '' },
  notes:            { type: String, default: '' },
  deliveredAt:      { type: Date },

  // live GPS from distributor (persisted on every Socket ping)
  agentLocation: geoSchema,

  // ETA in minutes — recomputed on each GPS ping
  etaMinutes: { type: Number, default: null },

  // OSRM route coords saved to avoid refetching
  routeCoords: { type: [[Number]], default: [] }, // [[lat,lng], ...]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);