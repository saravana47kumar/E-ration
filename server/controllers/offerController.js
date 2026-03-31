const Offer = require('../models/Offer');
const User = require('../models/User');
const { sendOfferSMS } = require('../utils/smsService');

// Admin: create offer
const createOffer = async (req, res) => {
  try {
    const { title, description, discountType, discountValue, validFrom, validUntil, applicableTo, sendSMS } = req.body;
    const offer = await Offer.create({
      title, description, discountType, discountValue,
      validFrom: new Date(validFrom), validUntil: new Date(validUntil),
      applicableTo: applicableTo || ['all'],
    });
    
    if (sendSMS) {
      // Send SMS to all customers
      const customers = await User.find({ role: 'customer', isActive: true, phone: { $ne: '' } });
      const discountText = discountType === 'percentage' ? `${discountValue}%` : `₹${discountValue}`;
      const message = `${title}! ${description}. Get ${discountText} off. Valid till ${new Date(validUntil).toLocaleDateString()}.`;
      
      let sentCount = 0;
      for (const customer of customers) {
        if (customer.phone) {
          const result = await sendOfferSMS(customer.phone, message);
          if (result.success) sentCount++;
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      console.log(`Offers SMS sent to ${sentCount} customers`);
      
      offer.sentViaSMS = true;
      offer.sentAt = new Date();
      await offer.save();
    }
    
    res.status(201).json({ success: true, offer });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all offers
const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get active offers
const getActiveOffers = async (req, res) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    }).sort({ validUntil: 1 });
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createOffer, getAllOffers, getActiveOffers };