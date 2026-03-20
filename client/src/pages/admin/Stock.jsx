import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiUsers, FiTruck, FiPackage, FiShoppingCart, FiAlertCircle, FiPlus } from 'react-icons/fi';
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

export default function AdminStock() {
  const [tab, setTab] = useState('add');
  const [products, setProducts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [addForm, setAddForm] = useState({ productId: '', quantity: '' });
  const [allocForm, setAllocForm] = useState({ distributorId: '', productId: '', quantity: '' });
  const [handleModal, setHandleModal] = useState(null);
  const [handleForm, setHandleForm] = useState({ status: 'approved', adminNote: '', approvedQuantity: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.get('/admin/products').then(({ data }) => setProducts(data.products));
    API.get('/admin/distributors').then(({ data }) => setDistributors(data.distributors));
    API.get('/admin/stock/details').then(({ data }) => setStocks(data.stocks));
    API.get('/admin/stock/requests').then(({ data }) => setRequests(data.requests));
  }, []);

  const handleAddStock = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/admin/stock/add', addForm);
      toast.success('Stock added!');
      setAddForm({ productId: '', quantity: '' });
      API.get('/admin/products').then(({ data }) => setProducts(data.products));
      API.get('/admin/stock/details').then(({ data }) => setStocks(data.stocks));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/admin/stock/allocate', allocForm);
      toast.success('Stock allocated!');
      setAllocForm({ distributorId: '', productId: '', quantity: '' });
      API.get('/admin/stock/details').then(({ data }) => setStocks(data.stocks));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.put(`/admin/stock/requests/${handleModal._id}`, handleForm);
      toast.success('Request handled!');
      setHandleModal(null);
      API.get('/admin/stock/requests').then(({ data }) => setRequests(data.requests));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Stock Management</h1>
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {['add', 'allocate', 'details', 'requests'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'add' ? 'Add Stock' : t === 'allocate' ? 'Allocate Stock' : t === 'details' ? 'Stock Details' : 'Stock Requests'}
            </button>
          ))}
        </div>

        {tab === 'add' && (
          <div className="max-w-md">
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Add Stock to Product</h2>
              <form onSubmit={handleAddStock} className="space-y-4">
                <div>
                  <label className="label">Product</label>
                  <select className="input" value={addForm.productId} onChange={e => setAddForm({ ...addForm, productId: e.target.value })} required>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} (Current: {p.availableStock} {p.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity to Add</label>
                  <input type="number" className="input" value={addForm.quantity} onChange={e => setAddForm({ ...addForm, quantity: e.target.value })} required min={1} />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Adding...' : 'Add Stock'}</button>
              </form>
            </div>
          </div>
        )}

        {tab === 'allocate' && (
          <div className="max-w-md">
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Allocate Stock to Distributor</h2>
              <form onSubmit={handleAllocate} className="space-y-4">
                <div>
                  <label className="label">Distributor</label>
                  <select className="input" value={allocForm.distributorId} onChange={e => setAllocForm({ ...allocForm, distributorId: e.target.value })} required>
                    <option value="">Select distributor...</option>
                    {distributors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Product</label>
                  <select className="input" value={allocForm.productId} onChange={e => setAllocForm({ ...allocForm, productId: e.target.value })} required>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} (Available: {p.availableStock} {p.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input type="number" className="input" value={allocForm.quantity} onChange={e => setAllocForm({ ...allocForm, quantity: e.target.value })} required min={1} />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Allocating...' : 'Allocate Stock'}</button>
              </form>
            </div>
          </div>
        )}

        {tab === 'details' && (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th">Distributor</th>
                  <th className="table-th">Allocated</th>
                  <th className="table-th">Used</th>
                  <th className="table-th">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stocks.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{s.product?.name}</td>
                    <td className="table-td">{s.distributor?.name}</td>
                    <td className="table-td">{s.allocatedQuantity} {s.product?.unit}</td>
                    <td className="table-td">{s.usedQuantity} {s.product?.unit}</td>
                    <td className="table-td text-green-600 font-medium">{s.availableQuantity} {s.product?.unit}</td>
                  </tr>
                ))}
                {stocks.length === 0 && <tr><td colSpan={5} className="table-td text-center text-gray-400 py-8">No stock allocated yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'requests' && (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-th">Distributor</th>
                  <th className="table-th">Product</th>
                  <th className="table-th">Requested</th>
                  <th className="table-th">Reason</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{r.distributor?.name}</td>
                    <td className="table-td">{r.product?.name}</td>
                    <td className="table-td">{r.requestedQuantity} {r.product?.unit}</td>
                    <td className="table-td text-gray-500">{r.reason || '-'}</td>
                    <td className="table-td"><Badge status={r.status} /></td>
                    <td className="table-td">
                      {r.status === 'pending' && (
                        <button onClick={() => { setHandleModal(r); setHandleForm({ status: 'approved', adminNote: '', approvedQuantity: r.requestedQuantity }); }} className="text-primary-600 hover:underline text-sm font-medium">Handle</button>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No requests</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={!!handleModal} onClose={() => setHandleModal(null)} title="Handle Stock Request">
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="label">Decision</label>
              <select className="input" value={handleForm.status} onChange={e => setHandleForm({ ...handleForm, status: e.target.value })}>
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
              </select>
            </div>
            {handleForm.status === 'approved' && (
              <div>
                <label className="label">Approved Quantity</label>
                <input type="number" className="input" value={handleForm.approvedQuantity} onChange={e => setHandleForm({ ...handleForm, approvedQuantity: e.target.value })} min={1} required />
              </div>
            )}
            <div>
              <label className="label">Admin Note</label>
              <textarea className="input" rows={2} value={handleForm.adminNote} onChange={e => setHandleForm({ ...handleForm, adminNote: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setHandleModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Submit Decision'}</button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
