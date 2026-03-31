import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiEye } from 'react-icons/fi';

const adminLinks = [
  // ... existing links
  { href: '/admin/refunds', label: 'Refunds', icon: <FiCheck /> },
];

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status: 'approved', adminNote: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.get('/refunds/admin/all').then(({ data }) => setRefunds(data.refunds)).finally(() => setLoading(false));
  }, []);

  const handleDecision = async () => {
    setSubmitting(true);
    try {
      await API.put(`/refunds/admin/${selected._id}`, form);
      toast.success(`Refund ${form.status}!`);
      setSelected(null);
      API.get('/refunds/admin/all').then(({ data }) => setRefunds(data.refunds));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Refund Requests</h1>
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr><th className="table-th">Customer</th><th className="table-th">Order ID</th><th className="table-th">Amount</th><th className="table-th">Reason</th><th className="table-th">Status</th><th className="table-th">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {refunds.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{r.customer?.name}</td>
                    <td className="table-td font-mono text-xs">{r.order?._id?.slice(-8).toUpperCase()}</td>
                    <td className="table-td font-semibold">₹{r.amount}</td>
                    <td className="table-td text-gray-500 max-w-xs truncate">{r.reason}</td>
                    <td className="table-td"><Badge status={r.status} /></td>
                    <td className="table-td">
                      {r.status === 'pending' && (
                        <button onClick={() => { setSelected(r); setForm({ status: 'approved', adminNote: '' }); }} className="text-primary-600 hover:underline text-sm font-medium">Process</button>
                      )}
                      {r.status !== 'pending' && <button onClick={() => setSelected(r)} className="flex items-center gap-1 text-gray-500 text-sm"><FiEye /> View</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Process Refund">
          {selected && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p><span className="font-medium">Customer:</span> {selected.customer?.name}</p>
                <p><span className="font-medium">Order ID:</span> {selected.order?._id}</p>
                <p><span className="font-medium">Amount:</span> ₹{selected.amount}</p>
                <p><span className="font-medium">Reason:</span> {selected.reason}</p>
              </div>
              <div><label className="label">Decision</label><select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="approved">Approve</option><option value="rejected">Reject</option></select></div>
              <div><label className="label">Admin Note</label><textarea className="input" rows={2} value={form.adminNote} onChange={e => setForm({...form, adminNote: e.target.value})} /></div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setSelected(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleDecision} disabled={submitting} className="btn-primary">{submitting ? 'Processing...' : 'Submit Decision'}</button>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}