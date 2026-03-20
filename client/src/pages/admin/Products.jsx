import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiUsers, FiTruck, FiPackage, FiShoppingCart, FiAlertCircle, FiPlus, FiEdit } from 'react-icons/fi';
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

const categories = ['Rice', 'Wheat', 'Sugar', 'Oil', 'Kerosene', 'Pulses', 'Other'];

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Rice', price: '', unit: 'kg', description: '', minOrderQty: 1, maxOrderQty: 10 });
  const [imageFile, setImageFile] = useState(null);

  const load = () => {
    API.get('/admin/products').then(({ data }) => setProducts(data.products)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditProduct(null); setForm({ name: '', category: 'Rice', price: '', unit: 'kg', description: '', minOrderQty: 1, maxOrderQty: 10 }); setShowModal(true); };
  const openEdit = (p) => { setEditProduct(p); setForm({ name: p.name, category: p.category, price: p.price, unit: p.unit, description: p.description, minOrderQty: p.minOrderQty, maxOrderQty: p.maxOrderQty }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);
      if (editProduct) {
        await API.put(`/admin/products/${editProduct._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product updated!');
      } else {
        await API.post('/admin/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product added!');
      }
      setShowModal(false);
      load();
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ration Products</h1>
            <p className="text-gray-500 text-sm mt-1">Manage available ration items</p>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2"><FiPlus /> Add Product</button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-4 flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
          ) : products.map(p => (
            <div key={p._id} className="card hover:shadow-md transition-shadow">
              {p.image ? (
                <img src={p.image} alt={p.name} className="w-full h-40 object-cover rounded-lg mb-3" />
              ) : (
                <div className="w-full h-40 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-4xl">📦</div>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.category}</p>
                </div>
                <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg"><FiEdit className="text-gray-500" /></button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-primary-600">₹{p.price}/{p.unit}</span>
                <span className={p.isActive ? 'badge-success' : 'badge-danger'}>{p.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Stock: {p.availableStock} {p.unit}</p>
            </div>
          ))}
          {!loading && products.length === 0 && (
            <div className="col-span-4 text-center py-10 text-gray-400">No products found. Add your first product!</div>
          )}
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editProduct ? 'Edit Product' : 'Add Product'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Product Name</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Unit</label>
                <select className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  {['kg', 'litre', 'packet', 'box', 'quintal'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Price per unit (₹)</label>
                <input type="number" className="input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required min={0} />
              </div>
              <div>
                <label className="label">Max Order Qty</label>
                <input type="number" className="input" value={form.maxOrderQty} onChange={e => setForm({ ...form, maxOrderQty: e.target.value })} min={1} />
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Product Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save Product'}</button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
