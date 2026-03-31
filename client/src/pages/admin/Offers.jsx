import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiPlus, FiSend, FiHome ,FiTrash2  } from 'react-icons/fi';

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <FiHome /> },
  // ... existing links
  { href: '/admin/offers', label: 'Offers', icon: <FiSend /> },
];

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', discountType: 'percentage',
    discountValue: '', validFrom: '', validUntil: '', sendSMS: true
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.get('/offers/admin/all').then(({ data }) => setOffers(data.offers)).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/offers', form);
      toast.success('Offer created' + (form.sendSMS ? ' and SMS sent!' : ''));
      setShowModal(false);
      setForm({ title: '', description: '', discountType: 'percentage', discountValue: '', validFrom: '', validUntil: '', sendSMS: true });
      API.get('/offers/admin/all').then(({ data }) => setOffers(data.offers));
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Offers & Announcements</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><FiPlus /> Create Offer</button>
        </div>
        
        <div className="grid gap-4">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : offers.map(offer => (
            <div key={offer._id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{offer.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
                  <p className="text-xs text-orange-600 font-semibold mt-1">
                    {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Valid: {new Date(offer.validFrom).toLocaleDateString()} - {new Date(offer.validUntil).toLocaleDateString()}
                  </p>
                  {offer.sentViaSMS && (
                    <p className="text-xs text-green-600 mt-1">📱 SMS sent on {new Date(offer.sentAt).toLocaleString()}</p>
                  )}
                </div>
                <span className={`badge-${offer.isActive ? 'success' : 'danger'}`}>
                  {offer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Offer">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">Title</label><input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Discount Type</label><select className="input" value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})}><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
              <div><label className="label">Discount Value</label><input type="number" className="input" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Valid From</label><input type="date" className="input" value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} required /></div>
              <div><label className="label">Valid Until</label><input type="date" className="input" value={form.validUntil} onChange={e => setForm({...form, validUntil: e.target.value})} required /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="sendSMS" checked={form.sendSMS} onChange={e => setForm({...form, sendSMS: e.target.checked})} className="w-4 h-4" />
              <label htmlFor="sendSMS" className="text-sm">Send SMS to all customers</label>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Creating...' : 'Create Offer'}</button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}