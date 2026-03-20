import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';
import { customerLinks } from './links';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiPlus } from 'react-icons/fi';

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'other' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => API.get('/customer/complaints').then(({ data }) => setComplaints(data.complaints)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/customer/complaints', form);
      toast.success('Complaint submitted!');
      setShowForm(false);
      setForm({ subject: '', description: '', category: 'other' });
      load();
    } catch { toast.error('Failed to submit'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks} role="customer" />
      <main className="flex-1 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Complaints</h1>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><FiPlus /> Add Complaint</button>
        </div>
        {showForm && (
          <div className="card mb-6 border-2 border-primary-100">
            <h2 className="font-bold text-gray-900 mb-4">New Complaint</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Subject</label>
                  <input className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required placeholder="Brief subject" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {['delivery', 'quality', 'payment', 'distributor', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required placeholder="Describe your issue in detail..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Submitting...' : 'Submit Complaint'}</button>
              </div>
            </form>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
        ) : (
          <div className="space-y-4">
            {complaints.map(c => (
              <div key={c._id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.subject}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(c.createdAt).toLocaleString()} • {c.category}</p>
                    <p className="text-sm text-gray-600 mt-2">{c.description}</p>
                    {c.adminResponse && (
                      <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm">
                        <p className="font-medium text-blue-700 text-xs mb-1">Admin Response:</p>
                        <p className="text-blue-800">{c.adminResponse}</p>
                      </div>
                    )}
                  </div>
                  <Badge status={c.status} />
                </div>
              </div>
            ))}
            {complaints.length === 0 && <p className="text-center text-gray-400 py-10">No complaints submitted</p>}
          </div>
        )}
      </main>
    </div>
  );
}
