/**
 * rationCardController.js
 *
 * Customer endpoints:
 *   GET    /api/ration-card/me                  → get own card
 *   POST   /api/ration-card/create              → create card (1 per user)
 *   POST   /api/ration-card/members/request     → submit add/remove request
 *   GET    /api/ration-card/members/requests    → list own requests
 *
 * Admin endpoints:
 *   GET    /api/ration-card/admin/all           → all ration cards
 *   GET    /api/ration-card/admin/requests      → all pending requests
 *   PUT    /api/ration-card/admin/requests/:id  → approve / reject
 */

const RationCard = require('../models/RationCard');
const User       = require('../models/User');
const { cloudinary } = require('../config/cloudinary');

// Helper: upload a buffer to Cloudinary, returns secure_url or ''
async function uploadBufferToCloudinary(buffer, mimetype, originalname) {
  try {
    const isPdf = mimetype === 'application/pdf';
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        'eration_member_docs',
          resource_type: isPdf ? 'raw' : 'image',
          public_id:     isPdf ? `${Date.now()}_${originalname}` : undefined,
        },
        (err, res) => err ? reject(err) : resolve(res)
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, fileType: isPdf ? 'pdf' : 'image' };
  } catch (err) {
    console.error('[Cloudinary member doc]', err.message);
    return { url: '', fileType: 'image' };
  }
}

// ════════════════════════════════════════════════════════════════
// CUSTOMER
// ════════════════════════════════════════════════════════════════

/**
 * GET /api/ration-card/me
 * Returns the logged-in customer's ration card (populated with user info).
 */
const getMyCard = async (req, res) => {
  try {
    const card = await RationCard.findOne({ user: req.user._id })
      .populate('user', 'name email phone profileImage rationCardNumber');

    if (!card) {
      return res.status(404).json({ success: false, message: 'Ration card not found. Please create one.' });
    }

    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/ration-card/create
 * Creates a new ration card for the logged-in customer.
 *
 * rationCardNumber comes from User.rationCardNumber (set at registration).
 * The head member's aadhaar is required and entered by the user in the form.
 *
 * Body: { cardType, dob, address, aadhar, photo? }
 */
const createCard = async (req, res) => {
  try {
    const { cardType, dob, address, aadhar } = req.body;

    // Validate required fields
    if (!dob)    return res.status(400).json({ success: false, message: 'Date of birth is required.' });
    if (!address) return res.status(400).json({ success: false, message: 'Address is required.' });
    if (!aadhar) return res.status(400).json({ success: false, message: 'Aadhaar number is required.' });

    // One card per user
    const existing = await RationCard.findOne({ user: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ration card already exists for this user.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Use ration card number from form (editable), fallback to user profile
    const rationCardNumber = (req.body.rationCardNumber || '').trim() || user.rationCardNumber;
    if (!rationCardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Ration card number is required.',
      });
    }

    // Check no other RationCard document already claimed this number
    const numTaken = await RationCard.findOne({ rationCardNumber });
    if (numTaken) {
      return res.status(400).json({
        success: false,
        message: 'This ration card number is already registered in the system.',
      });
    }

    const photo = req.file ? req.file.path : (user.profileImage || '');

    const card = await RationCard.create({
      user:             req.user._id,
      rationCardNumber,               // from user's account — NOT auto-generated
      cardType:         cardType || 'PHH',
      dob:              new Date(dob),
      address:          address.trim(),
      photo,
      familyMembers: [{
        name:     user.name,
        relation: 'Self',
        dob:      new Date(dob),
        aadhar:   aadhar.trim(),      // head member aadhaar entered in form
        isHead:   true,
      }],
    });

    // Sync rationCardNumber to User model so order/chatbot logic works
    await User.findByIdAndUpdate(req.user._id, { rationCardNumber });

    // Safe populate — works in Mongoose 6, 7, and 8
    await card.populate('user', 'name email phone profileImage rationCardNumber');

    res.status(201).json({ success: true, card });
  } catch (err) {
    console.error('[createCard]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/ration-card/members/request
 * Submit a request to add or remove a family member.
 *
 * Body (add):    { type:'add',    memberName, relation, dob, aadhar }
 * Body (remove): { type:'remove', memberId, reason }
 */
const submitMemberRequest = async (req, res) => {
  try {
    const card = await RationCard.findOne({ user: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Ration card not found.' });

    const { type, memberName, relation, dob, aadhar, memberId, reason } = req.body;

    if (!['add', 'remove'].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'add' or 'remove'" });
    }

    if (type === 'add') {
      if (!memberName || !relation || !dob || !aadhar) {
        return res.status(400).json({ success: false, message: 'memberName, relation, dob and aadhar are required.' });
      }

      // Prevent duplicate
      const dup = card.memberRequests.find(r =>
        r.type === 'add' && r.status === 'pending' &&
        r.memberName.toLowerCase() === memberName.toLowerCase()
      );
      if (dup) return res.status(400).json({ success: false, message: 'A pending request for this member already exists.' });

      // Upload doc to Cloudinary if file was attached
      let docUrl = '', docFileName = '', docType = 'image';
      if (req.file && req.file.buffer) {
        const uploaded = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname || 'doc'
        );
        docUrl      = uploaded.url;
        docType     = uploaded.fileType;
        docFileName = req.file.originalname || '';
      }

      card.memberRequests.push({
        type: 'add',
        memberName: memberName.trim(),
        relation,
        dob:    new Date(dob),
        aadhar: aadhar.trim(),
        docUrl,
        docFileName,
        docType,
      });

    } else {
      // remove
      if (!memberId || !reason) {
        return res.status(400).json({ success: false, message: 'memberId and reason are required.' });
      }

      const memberIdStr = memberId.toString();
      const member = card.familyMembers.find(m => m._id.toString() === memberIdStr);
      if (!member) return res.status(404).json({ success: false, message: 'Family member not found.' });
      if (member.isHead) return res.status(400).json({ success: false, message: 'Card holder cannot be removed.' });

      const dup = card.memberRequests.find(r =>
        r.type === 'remove' && r.status === 'pending' &&
        r.memberId?.toString() === memberIdStr
      );
      if (dup) return res.status(400).json({ success: false, message: 'A pending removal request for this member already exists.' });

      card.memberRequests.push({
        type: 'remove',
        memberId: memberIdStr,
        memberName: member.name,
        reason: reason.trim(),
      });
    }

    await card.save();
    const newReq = card.memberRequests[card.memberRequests.length - 1];
    res.status(201).json({ success: true, message: 'Request submitted for admin approval.', request: newReq });

  } catch (err) {
    console.error('[submitMemberRequest]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/ration-card/members/requests
 * Returns all member requests for the logged-in customer's card.
 */
const getMyRequests = async (req, res) => {
  try {
    const card = await RationCard.findOne({ user: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Ration card not found.' });

    const requests = [...card.memberRequests].sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════════════

/**
 * GET /api/ration-card/admin/all
 * Returns all ration cards with user details.
 */
const getAllCards = async (req, res) => {
  try {
    const cards = await RationCard.find()
      .populate('user', 'name email phone profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, cards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/ration-card/admin/requests
 * Returns all cards that have at least one pending member request.
 * Groups requests by card for the admin panel.
 */
const getAllPendingRequests = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const cards = await RationCard.find({
      'memberRequests.status': status,
    }).populate('user', 'name email phone');

    // Flatten into individual requests with card context
    const requests = [];
    cards.forEach(card => {
      card.memberRequests
        .filter(r => r.status === status)
        .forEach(r => {
          requests.push({
            _id:              r._id,
            cardId:           card._id,
            rationCardNumber: card.rationCardNumber || card.user?.rationCardNumber || '',
            userName:         card.user?.name,
            userEmail:        card.user?.email,
            userPhone:        card.user?.phone,
            type:             r.type,
            status:           r.status,
            adminNote:        r.adminNote,
            resolvedAt:       r.resolvedAt,
            // add fields
            memberName:  r.memberName,
            relation:    r.relation,
            dob:         r.dob,
            aadhar:      r.aadhar,
            docUrl:      r.docUrl      || '',
            docFileName: r.docFileName || '',
            docType:     r.docType     || 'image',
            // remove fields
            memberId: r.memberId,
            reason:   r.reason,
            createdAt: r.createdAt,
          });
        });
    });

    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/ration-card/admin/requests/:id
 * Approve or reject a member request.
 *
 * Body: { cardId, status: 'approved'|'rejected', adminNote? }
 *
 * On approval:
 *   - 'add':    push new member into familyMembers
 *   - 'remove': pull member from familyMembers
 */
const handleMemberRequest = async (req, res) => {
  try {
    const { cardId, status, adminNote = '' } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
    }

    const card = await RationCard.findById(cardId);
    if (!card) return res.status(404).json({ success: false, message: 'Ration card not found.' });

    const request = card.memberRequests.id(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request has already been resolved.' });
    }

    request.status     = status;
    request.adminNote  = adminNote;
    request.resolvedAt = new Date();

    if (status === 'approved') {
      if (request.type === 'add') {
        card.familyMembers.push({
          name:     request.memberName,
          relation: request.relation,
          dob:      request.dob,
          aadhar:   request.aadhar,
          isHead:   false,
        });
      } else if (request.type === 'remove') {
        // Remove by sub-document id
        card.familyMembers = card.familyMembers.filter(
          m => m._id.toString() !== request.memberId?.toString()
        );
      }
    }

    await card.save();
    res.json({ success: true, message: `Request ${status}.`, card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/ration-card/head-aadhar
 * Customer updates their own (head of family) Aadhaar directly.
 * No admin approval needed — it's their own data.
 *
 * Body: { aadhar }
 */
const updateHeadAadhar = async (req, res) => {
  try {
    const { aadhar } = req.body;
    if (!aadhar || !aadhar.trim()) {
      return res.status(400).json({ success: false, message: 'Aadhaar number is required.' });
    }

    const card = await RationCard.findOne({ user: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Ration card not found.' });

    const head = card.familyMembers.find(m => m.isHead);
    if (!head) return res.status(404).json({ success: false, message: 'Head member not found.' });

    head.aadhar = aadhar.trim();
    await card.save();

    res.json({ success: true, message: 'Aadhaar updated.', card });
  } catch (err) {
    console.error('[updateHeadAadhar]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  // customer
  getMyCard,
  createCard,
  updateHeadAadhar,
  submitMemberRequest,
  getMyRequests,
  // admin
  getAllCards,
  getAllPendingRequests,
  handleMemberRequest,
};