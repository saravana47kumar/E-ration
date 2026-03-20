import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiUsers, FiTruck, FiPackage, FiShoppingCart, FiAlertCircle, FiEye } from 'react-icons/fi';
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

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updateForm, setUpdateForm] = useState({ orderStatus: '', paymentStatus: '', distributorId: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    API.get('/admin/orders').then(({ data }) => setOrders(data.orders)).finally(() => setLoading(false));
    API.get('/admin/distributors').then(({ data }) => setDistributors(data.distributors));
  };

  useEffect(() => { load(); }, []);

  const openModal = (order) => {
    setSelected(order);
    setUpdateForm({ orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, distributorId: order.distributor?._id || '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.put(`/admin/orders/${selected._id}`, updateForm);
      toast.success('Order updated!');
      setSelected(null);
      load();
    } catch (err) {
      toast.error('Failed to update');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders Management</h1>
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-th">Order ID</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Payment</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="table-td font-mono text-xs">{o._id.slice(-8).toUpperCase()}</td>
                    <td className="table-td font-medium">{o.customer?.name}</td>
                    <td className="table-td font-semibold">₹{o.totalAmount.toLocaleString()}</td>
                    <td className="table-td"><Badge status={o.paymentStatus} /></td>
                    <td className="table-td"><Badge status={o.orderStatus} /></td>
                    <td className="table-td text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <button onClick={() => openModal(o)} className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
                        <FiEye /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">No orders yet</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Manage Order" size="lg">
          {selected && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <p><span className="font-medium">Customer:</span> {selected.customer?.name} ({selected.customer?.email})</p>
                <p><span className="font-medium">Ration Card:</span> {selected.customer?.rationCardNumber || '-'}</p>
                <p><span className="font-medium">Amount:</span> ₹{selected.totalAmount.toLocaleString()}</p>
                <p><span className="font-medium">Payment Method:</span> {selected.paymentMethod?.toUpperCase()}</p>
                <p><span className="font-medium">Delivery Address:</span> {selected.deliveryAddress}</p>
                <div>
                  <p className="font-medium mb-1">Items:</p>
                  {selected.items?.map((item, i) => (
                    <p key={i} className="text-gray-500">• {item.name} × {item.quantity} ({item.unit}) = ₹{(item.price * item.quantity).toLocaleString()}</p>
                  ))}
                </div>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Order Status</label>
                    <select className="input" value={updateForm.orderStatus} onChange={e => setUpdateForm({ ...updateForm, orderStatus: e.target.value })}>
                      {['placed', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Payment Status</label>
                    <select className="input" value={updateForm.paymentStatus} onChange={e => setUpdateForm({ ...updateForm, paymentStatus: e.target.value })}>
                      {['pending', 'paid', 'failed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Assign Distributor</label>
                  <select className="input" value={updateForm.distributorId} onChange={e => setUpdateForm({ ...updateForm, distributorId: e.target.value })}>
                    <option value="">None</option>
                    {distributors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setSelected(null)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Update Order'}</button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}
