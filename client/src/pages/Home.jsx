import { Link } from 'react-router-dom';
import { FiShoppingBag, FiTruck, FiShield, FiUsers } from 'react-icons/fi';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900">
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-xl">🌾</div>
          <span className="text-white font-bold text-xl">E-Ration</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="px-5 py-2 text-white/80 hover:text-white transition-colors font-medium">Login</Link>
          <Link to="/register" className="px-5 py-2 bg-white text-emerald-800 rounded-lg font-semibold hover:bg-white/90 transition-colors">Register</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-20 text-center">
        <div className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-white/80 text-sm font-medium mb-6">
          Government Public Distribution System
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          E-Ration Management<br />
          <span className="text-emerald-300">Made Simple</span>
        </h1>
        <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
          Digitize your ration distribution. Book rations online, track delivery, manage stock — all in one platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="px-8 py-4 bg-white text-emerald-800 rounded-xl font-bold text-lg hover:bg-white/90 transition-colors shadow-xl">
            Get Started Free
          </Link>
          <Link to="/login" className="px-8 py-4 bg-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-colors border border-white/20">
            Login to Account
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-16 grid md:grid-cols-4 gap-6">
        {[
          { icon: <FiShoppingBag />, title: 'Book Online', desc: 'Order ration items from home easily' },
          { icon: <FiTruck />, title: 'Track Delivery', desc: 'Real-time order status tracking' },
          { icon: <FiShield />, title: 'Secure Payments', desc: 'Stripe & Cash on Delivery' },
          { icon: <FiUsers />, title: 'Multi-Role', desc: 'Admin, Distributor & Customer portals' },
        ].map((f, i) => (
          <div key={i} className="bg-white/10 rounded-2xl p-6 text-center backdrop-blur-sm border border-white/10">
            <div className="text-3xl text-emerald-300 mb-3 flex justify-center">{f.icon}</div>
            <h3 className="text-white font-bold mb-2">{f.title}</h3>
            <p className="text-white/60 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center py-8 text-white/40 text-sm border-t border-white/10">
        <p>Admin: admin@eration.com / Admin@123</p>
      </div>
    </div>
  );
}
