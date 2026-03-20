import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { distributorLinks } from './links';
import API from '../../utils/api';
import { FiPackage, FiShoppingCart, FiClock, FiCheckCircle } from 'react-icons/fi';

export default function DistributorDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/distributor/dashboard').then(({ data }) => {
      setStats(data.stats);
      setRecentOrders(data.recentOrders);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={distributorLinks} role="distributor" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Distributor Dashboard</h1>
        <p className="text-gray-500 text-sm mb-8">Overview of your distribution activities</p>
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Stock" value={`${stats?.totalAllocated} units`} icon={<FiPackage />} color="blue" />
              <StatCard title="Available" value={`${stats?.totalAvailable} units`} icon={<FiPackage />} color="green" />
              <StatCard title="Pending Deliveries" value={stats?.pendingDeliveries} icon={<FiClock />} color="orange" />
              <StatCard title="Delivered" value={stats?.deliveredOrders} icon={<FiCheckCircle />} color="green" />
            </div>
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Recent Orders</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="table-th">Customer</th>
                      <th className="table-th">Phone</th>
                      <th className="table-th">Amount</th>
                      <th className="table-th">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map(o => (
                      <tr key={o._id} className="hover:bg-gray-50">
                        <td className="table-td font-medium">{o.customer?.name}</td>
                        <td className="table-td">{o.customer?.phone || '-'}</td>
                        <td className="table-td">₹{o.totalAmount.toLocaleString()}</td>
                        <td className="table-td"><Badge status={o.orderStatus} /></td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && <tr><td colSpan={4} className="table-td text-center text-gray-400 py-8">No orders assigned yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
