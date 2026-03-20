import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';
import { customerLinks } from './links';
import API from '../../utils/api';

export default function MyRation() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/customer/orders').then(({ data }) => setOrders(data.orders)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks} role="customer" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Ration Orders</h1>
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No orders yet</h2>
            <Link to="/customer/book-ration" className="btn-primary inline-block mt-4">Book Your First Ration</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(o => (
              <Link key={o._id} to={`/customer/orders/${o._id}`} className="card block hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-xs text-gray-400 mb-1">#{o._id.slice(-10).toUpperCase()}</p>
                    <h3 className="font-semibold text-gray-900">{o.items.map(i => i.name).join(', ')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{o.items.length} item(s) • {o.paymentMethod.toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(o.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600 text-lg">₹{o.totalAmount.toLocaleString()}</p>
                    <div className="flex flex-col gap-1 mt-1">
                      <Badge status={o.orderStatus} />
                      <Badge status={o.paymentStatus} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
