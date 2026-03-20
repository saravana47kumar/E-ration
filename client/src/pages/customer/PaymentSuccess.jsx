import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { customerLinks } from './links';
import API from '../../utils/api';
import { FiCheckCircle, FiDownload } from 'react-icons/fi';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');
    if (sessionId && orderId) {
      API.get(`/payment/verify?sessionId=${sessionId}&orderId=${orderId}`)
        .then(({ data }) => setOrder(data.order))
        .catch(() => setError('Could not verify payment'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      setError('Invalid payment parameters');
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks} role="customer" />
      <main className="flex-1 p-6 lg:p-8 flex items-start justify-center">
        <div className="w-full max-w-lg">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>
          ) : error ? (
            <div className="card text-center py-10">
              <p className="text-red-500 font-medium">{error}</p>
              <Link to="/customer/my-ration" className="btn-primary mt-4 inline-block">View Orders</Link>
            </div>
          ) : (
            <div className="card text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle className="text-4xl text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
              <p className="text-gray-500 mb-6">Your ration has been booked successfully</p>
              {order && (
                <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Receipt</p>
                  <p className="text-xs text-gray-500">Order ID: {order._id}</p>
                  <p className="text-xs text-gray-500">Date: {new Date(order.createdAt).toLocaleString()}</p>
                  <div className="mt-3 space-y-1">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.name} × {item.quantity}</span>
                        <span className="font-medium">₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-bold">
                    <span>Total Paid</span>
                    <span className="text-primary-600">₹{order.totalAmount?.toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Link to="/customer/my-ration" className="btn-secondary flex-1 py-3">View Orders</Link>
                <Link to="/customer/book-ration" className="btn-primary flex-1 py-3">Book More</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
