import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiDownload, FiRefreshCw, FiPieChart, FiBarChart2 } from 'react-icons/fi';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const adminLinks = [
  // ... existing links
  { href: '/admin/reports', label: 'Reports', icon: <FiBarChart2 /> },
];

const COLORS = ['#FC8019', '#22C55E', '#3B82F6', '#A855F7', '#EF4444'];

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [regionData, setRegionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      API.get('/reports?year=' + selectedYear),
      API.get('/reports/region-analysis')
    ]).then(([reportsRes, regionRes]) => {
      setReports(reportsRes.data.reports);
      setRegionData(regionRes.data.regionData);
    }).catch(() => toast.error('Failed to load reports')).finally(() => setLoading(false));
  };

  const generateReport = async () => {
    try {
      await API.post('/reports/generate', { year: selectedYear, month: new Date().getMonth() + 1 });
      toast.success('Report generated');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const exportCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportPDF = (data, title) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
    
    const tableData = data.map(item => Object.values(item));
    const headers = [Object.keys(data[0] || {})];
    
    doc.autoTable({
      startY: 35,
      head: headers,
      body: tableData,
      theme: 'striped',
    });
    doc.save(`${title.replace(/\s/g, '_')}.pdf`);
  };

  const chartData = reports.map(r => ({ month: r.month, orders: r.data.totalOrders, revenue: r.data.totalRevenue }));
  const revenueByCategory = reports.reduce((acc, r) => {
    if (r.data.revenueByCategory) {
      Object.entries(r.data.revenueByCategory).forEach(([cat, val]) => {
        acc[cat] = (acc[cat] || 0) + val;
      });
    }
    return acc;
  }, {});
  const pieData = Object.entries(revenueByCategory).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <div className="flex gap-3">
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="input w-32">
              {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
            </select>
            <button onClick={generateReport} className="btn-secondary flex items-center gap-2"><FiRefreshCw /> Generate</button>
          </div>
        </div>
        
        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><FiBarChart2 /> Monthly Orders & Revenue</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#FC8019" name="Orders" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#22C55E" name="Revenue (₹)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><FiPieChart /> Revenue by Category</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-400 py-12">No data available</p>}
          </div>
        </div>
        
        {/* Region Analysis */}
        {regionData.length > 0 && (
          <div className="card mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Region-wise Analysis</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100"><tr><th className="table-th">Region</th><th className="table-th">Orders</th><th className="table-th">Revenue</th><th className="table-th">Customers</th><th className="table-th">Action</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {regionData.map(r => (
                    <tr key={r.region} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{r.region}</td>
                      <td className="table-td">{r.orders}</td>
                      <td className="table-td">₹{r.revenue.toLocaleString()}</td>
                      <td className="table-td">{r.customers}</td>
                      <td className="table-td"><button onClick={() => exportCSV([r], `region_${r.region}`)} className="text-primary-600 text-sm">Export</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Monthly Reports Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Monthly Reports</h2>
            {reports.length > 0 && (
              <div className="flex gap-2">
                <button onClick={() => exportCSV(reports.map(r => ({ month: r.month, orders: r.data.totalOrders, revenue: r.data.totalRevenue })), `reports_${selectedYear}`)} className="btn-secondary text-sm py-1">CSV</button>
                <button onClick={() => exportExcel(reports.map(r => ({ month: r.month, orders: r.data.totalOrders, revenue: r.data.totalRevenue })), `reports_${selectedYear}`)} className="btn-secondary text-sm py-1">Excel</button>
                <button onClick={() => exportPDF(reports.map(r => ({ month: r.month, orders: r.data.totalOrders, revenue: r.data.totalRevenue })), `E-Ration_Report_${selectedYear}`)} className="btn-secondary text-sm py-1">PDF</button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100"><tr><th className="table-th">Month</th><th className="table-th">Orders</th><th className="table-th">Revenue</th><th className="table-th">Products Sold</th><th className="table-th">Top Product</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? <tr><td colSpan={5} className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" /></td></tr> :
                  reports.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{new Date(0, r.month - 1).toLocaleString('default', { month: 'long' })} {r.year}</td>
                      <td className="table-td">{r.data.totalOrders}</td>
                      <td className="table-td font-semibold">₹{r.data.totalRevenue?.toLocaleString()}</td>
                      <td className="table-td">{r.data.totalProductsSold}</td>
                      <td className="table-td">{r.data.topProducts?.[0]?.name || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}