import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiUsers, FiTruck, FiPackage, FiShoppingCart, FiAlertCircle, FiPlus, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
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

export default function AdminDistributors() {
  const [distributors, setDistributors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    API.get('/admin/distributors').then(({ data }) => setDistributors(data.distributors)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/admin/distributors', form);
      toast.success('Distributor added!');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', phone: '', address: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add distributor');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await API.put(`/admin/distributors/${id}/toggle`);
      toast.success('Status updated');
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Distributors</h1>
            <p className="text-gray-500 text-sm mt-1">Manage ration distributors</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add Distributor
          </button>
        </div>
        <div className="card">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="table-th">Name</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Phone</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {distributors.map(d => (
                    <tr key={d._id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{d.name}</td>
                      <td className="table-td">{d.email}</td>
                      <td className="table-td">{d.phone || '-'}</td>
                      <td className="table-td">
                        <span className={d.isActive ? 'badge-success' : 'badge-danger'}>{d.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="table-td">
                        <button onClick={() => toggleStatus(d._id)} className={`flex items-center gap-1 text-sm font-medium ${d.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
                          {d.isActive ? <><FiToggleRight className="text-lg" /> Deactivate</> : <><FiToggleLeft className="text-lg" /> Activate</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {distributors.length === 0 && (
                    <tr><td colSpan={5} className="table-td text-center text-gray-400 py-8">No distributors found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Distributor">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea className="input" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Adding...' : 'Add Distributor'}</button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
