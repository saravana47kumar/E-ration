import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import API from '../../utils/api';
import { FiUsers, FiTruck, FiPackage, FiShoppingCart, FiDollarSign, FiAlertCircle } from 'react-icons/fi';
import { MdDashboard, MdInventory } from 'react-icons/md';

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <MdDashboard /> },
  { href: '/admin/distributors', label: 'Distributors', icon: <FiTruck /> },
  { href: '/admin/products', label: 'Products', icon: <FiPackage /> },
  { href: '/admin/stock', label: 'Stock Management', icon: <MdInventory /> },
  { href: '/admin/customers', label: 'Customers', icon: <FiUsers /> },
  { href: '/admin/orders', label: 'Orders', icon: <FiShoppingCart /> },
  { href: '/admin/complaints', label: 'Complaints', icon: <FiAlertCircle /> },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/admin/dashboard').then(({ data }) => {
      setStats(data.stats);
      setRecentOrders(data.recentOrders);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">E-Ration Management System Overview</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <StatCard title="Customers" value={stats?.totalCustomers} icon={<FiUsers />} color="blue" />
              <StatCard title="Distributors" value={stats?.totalDistributors} icon={<FiTruck />} color="purple" />
              <StatCard title="Products" value={stats?.totalProducts} icon={<FiPackage />} color="green" />
              <StatCard title="Total Orders" value={stats?.totalOrders} icon={<FiShoppingCart />} color="orange" />
              <StatCard title="Pending Orders" value={stats?.pendingOrders} icon={<FiAlertCircle />} color="red" />
              <StatCard title="Revenue" value={`₹${stats?.totalRevenue?.toLocaleString()}`} icon={<FiDollarSign />} color="green" />
            </div>
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Recent Orders</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="table-th">Customer</th>
                      <th className="table-th">Amount</th>
                      <th className="table-th">Payment</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map(order => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="table-td font-medium">{order.customer?.name}</td>
                        <td className="table-td">₹{order.totalAmount.toLocaleString()}</td>
                        <td className="table-td"><Badge status={order.paymentStatus} /></td>
                        <td className="table-td"><Badge status={order.orderStatus} /></td>
                        <td className="table-td text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && (
                      <tr><td colSpan={5} className="table-td text-center text-gray-400 py-8">No orders yet</td></tr>
                    )}
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
