const User = require('../models/User');

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: 'admin@eration.com',
        password: 'Admin@123',
        role: 'admin',
        phone: '9999999999',
        address: 'Admin Office, Government Building',
        isActive: true,
      });
      console.log('✅ Default admin created: admin@eration.com / Admin@123');
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
  }
};

module.exports = seedAdmin;
