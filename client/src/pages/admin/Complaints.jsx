import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiUsers, FiTruck, FiPackage, FiShoppingCart, FiAlertCircle, FiMessageSquare } from 'react-icons/fi';
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

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [responseForm, setResponseForm] = useState({ adminResponse: '', status: 'in_progress' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => API.get('/admin/complaints').then(({ data }) => setComplaints(data.complaints)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleRespond = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.put(`/admin/complaints/${selected._id}`, responseForm);
      toast.success('Response submitted!');
      setSelected(null);
      load();
    } catch {
      toast.error('Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Customer Complaints</h1>
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Subject</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {complaints.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{c.customer?.name}</td>
                    <td className="table-td">{c.subject}</td>
                    <td className="table-td capitalize">{c.category}</td>
                    <td className="table-td"><Badge status={c.status} /></td>
                    <td className="table-td text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <button onClick={() => { setSelected(c); setResponseForm({ adminResponse: c.adminResponse || '', status: c.status }); }} className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
                        <FiMessageSquare /> Respond
                      </button>
                    </td>
                  </tr>
                ))}
                {complaints.length === 0 && <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No complaints</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Respond to Complaint">
          {selected && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <p><span className="font-medium">From:</span> {selected.customer?.name}</p>
                <p><span className="font-medium">Subject:</span> {selected.subject}</p>
                <p className="text-gray-600">{selected.description}</p>
              </div>
              <form onSubmit={handleRespond} className="space-y-4">
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={responseForm.status} onChange={e => setResponseForm({ ...responseForm, status: e.target.value })}>
                    {['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Admin Response</label>
                  <textarea className="input" rows={4} value={responseForm.adminResponse} onChange={e => setResponseForm({ ...responseForm, adminResponse: e.target.value })} required />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setSelected(null)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Submitting...' : 'Send Response'}</button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}
