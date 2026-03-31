import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { distributorLinks } from './links';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiPlus } from 'react-icons/fi';

export default function DistributorStock() {
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState('stock');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ productId: '', requestedQuantity: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    API.get('/distributor/stock').then(({ data }) => setStocks(data.stocks));
    API.get('/distributor/stock/requests').then(({ data }) => setRequests(data.requests)).finally(() => setLoading(false));
    API.get('/products').then(({ data }) => setProducts(data.products));
  };

  useEffect(() => { load(); }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/distributor/stock/request', form);
      toast.success('Stock request submitted!');
      setShowModal(false);
      setForm({ productId: '', requestedQuantity: '', reason: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={distributorLinks} role="distributor" />
      <main className="flex-1 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><FiPlus /> Request Stock</button>
        </div>
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {['stock', 'requests'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'stock' ? 'Available Stock' : 'Stock Requests'}
            </button>
          ))}
        </div>

        {tab === 'stock' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map(s => (
              <div key={s._id} className="card">
                {s.product?.image && <img src={s.product.image} alt={s.product.name} className="w-full h-32 object-cover rounded-lg mb-3" />}
                <h3 className="font-bold text-gray-900">{s.product?.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{s.product?.category}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-blue-50 rounded-lg p-2 text-center"><p className="text-blue-600 font-bold">{s.allocatedQuantity}</p><p className="text-gray-500 text-xs">Allocated</p></div>
                  <div className="bg-green-50 rounded-lg p-2 text-center"><p className="text-green-600 font-bold">{s.availableQuantity}</p><p className="text-gray-500 text-xs">Available</p></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Unit: {s.product?.unit}</p>
              </div>
            ))}
            {stocks.length === 0 && !loading && <div className="col-span-3 text-center py-10 text-gray-400">No stock allocated yet</div>}
          </div>
        )}

        {tab === 'requests' && (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th">Requested</th>
                  <th className="table-th">Approved</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Note</th>
                  <th className="table-th">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{r.product?.name}</td>
                    <td className="table-td">{r.requestedQuantity} {r.product?.unit}</td>
                    <td className="table-td">{r.approvedQuantity || '-'}</td>
                    <td className="table-td"><Badge status={r.status} /></td>
                    <td className="table-td text-gray-500">{r.adminNote || '-'}</td>
                    <td className="table-td text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {requests.length === 0 && <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No requests</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Additional Stock">
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="label">Product</label>
              <select className="input" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} required>
                <option value="">Select product...</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.unit})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Quantity Needed</label>
              <input type="number" className="input" value={form.requestedQuantity} onChange={e => setForm({ ...form, requestedQuantity: e.target.value })} required min={1} />
            </div>
            <div>
              <label className="label">Reason</label>
              <textarea className="input" rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Why do you need more stock?" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Submitting...' : 'Submit Request'}</button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
