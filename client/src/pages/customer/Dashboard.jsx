import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';
import { customerLinks } from './links';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import API from '../../utils/api';
import { FiShoppingBag, FiShoppingCart, FiList, FiAlertCircle } from 'react-icons/fi';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { cartCount } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/customer/orders').then(({ data }) => setOrders(data.orders.slice(0, 5))).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks} role="customer" />
      <main className="flex-1 p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}! 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Ration Card: {user?.rationCardNumber || 'Not set'}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Book Ration', icon: <FiShoppingBag className="text-2xl" />, href: '/customer/book-ration', color: 'bg-emerald-500', desc: 'Order items' },
            { label: 'My Cart', icon: <FiShoppingCart className="text-2xl" />, href: '/customer/cart', color: 'bg-orange-500', desc: `${cartCount} items` },
            { label: 'My Orders', icon: <FiList className="text-2xl" />, href: '/customer/my-ration', color: 'bg-blue-500', desc: `${orders.length} total` },
            { label: 'Complaints', icon: <FiAlertCircle className="text-2xl" />, href: '/customer/complaints', color: 'bg-red-500', desc: 'Submit issue' },
          ].map((item, i) => (
            <Link key={i} to={item.href} className="card hover:shadow-md transition-shadow text-center group">
              <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-3 group-hover:scale-105 transition-transform`}>
                {item.icon}
              </div>
              <p className="font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <Link to="/customer/my-ration" className="text-sm text-primary-600 hover:underline font-medium">View all</Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <Link key={o._id} to={`/customer/orders/${o._id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{o.items.map(i => i.name).join(', ')}</p>
                    <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">₹{o.totalAmount.toLocaleString()}</p>
                    <Badge status={o.orderStatus} />
                  </div>
                </Link>
              ))}
              {orders.length === 0 && <p className="text-center text-gray-400 py-6">No orders yet. <Link to="/customer/book-ration" className="text-primary-600 font-medium hover:underline">Book your first ration!</Link></p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
