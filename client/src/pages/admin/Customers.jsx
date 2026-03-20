import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import API from '../../utils/api';
import { FiUsers, FiTruck, FiPackage, FiShoppingCart, FiAlertCircle } from 'react-icons/fi';
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

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    API.get('/admin/customers').then(({ data }) => setCustomers(data.customers)).finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.rationCardNumber || '').includes(search)
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Customers</h1>
        <p className="text-gray-500 text-sm mb-6">Manage registered customers</p>
        <div className="mb-4">
          <input className="input max-w-sm" placeholder="Search by name, email, ration card..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Ration Card</th>
                  <th className="table-th">Address</th>
                  <th className="table-th">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{c.name}</td>
                    <td className="table-td">{c.email}</td>
                    <td className="table-td">{c.phone || '-'}</td>
                    <td className="table-td">{c.rationCardNumber || '-'}</td>
                    <td className="table-td text-gray-500 max-w-xs truncate">{c.address || '-'}</td>
                    <td className="table-td text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No customers found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
