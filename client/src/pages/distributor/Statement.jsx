import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';
import { distributorLinks } from './links';
import API from '../../utils/api';

export default function DistributorStatement() {
  const [orders, setOrders] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState({ startDate: '', endDate: '' });

  const load = (params = '') => {
    setLoading(true);
    API.get(`/distributor/statement${params}`).then(({ data }) => {
      setOrders(data.orders);
      setTotalRevenue(data.totalRevenue);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    const q = dates.startDate && dates.endDate ? `?startDate=${dates.startDate}&endDate=${dates.endDate}` : '';
    load(q);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={distributorLinks} role="distributor" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Statement</h1>
        <div className="card mb-6">
          <form onSubmit={handleFilter} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={dates.startDate} onChange={e => setDates({ ...dates, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={dates.endDate} onChange={e => setDates({ ...dates, endDate: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary">Filter</button>
            <button type="button" onClick={() => { setDates({ startDate: '', endDate: '' }); load(); }} className="btn-secondary">Reset</button>
          </form>
        </div>
        <div className="card mb-4 bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-600 font-medium">Total Revenue (Paid Orders)</p>
          <p className="text-2xl font-bold text-blue-800">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="card overflow-x-auto">
          {loading ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Ration Card</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Payment</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="table-td text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="table-td font-medium">{o.customer?.name}</td>
                    <td className="table-td">{o.customer?.rationCardNumber || '-'}</td>
                    <td className="table-td font-semibold">₹{o.totalAmount.toLocaleString()}</td>
                    <td className="table-td uppercase text-xs font-medium">{o.paymentMethod}</td>
                    <td className="table-td"><Badge status={o.paymentStatus} /></td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No transactions</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
