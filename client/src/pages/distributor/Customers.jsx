import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { distributorLinks } from './links';
import API from '../../utils/api';

export default function DistributorCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { API.get('/distributor/customers').then(({ data }) => setCustomers(data.customers)).finally(() => setLoading(false)); }, []);
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={distributorLinks} role="distributor" />
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Customers</h1>
        <div className="card overflow-x-auto">
          {loading ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Ration Card</th>
                  <th className="table-th">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{c.name}</td>
                    <td className="table-td">{c.phone || '-'}</td>
                    <td className="table-td">{c.rationCardNumber || '-'}</td>
                    <td className="table-td text-gray-500">{c.address || '-'}</td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan={4} className="table-td text-center text-gray-400 py-8">No customers assigned</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
