

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiUsers, FiTruck, FiPackage, FiShoppingCart,
  FiAlertCircle, FiCheck, FiX, FiEye, FiFile,
  FiCheckCircle, FiXCircle, FiClock,
} from 'react-icons/fi';
import { MdDashboard, MdInventory, MdFamilyRestroom, MdVerified } from 'react-icons/md';

const adminLinks = [
  { href: '/admin/dashboard',    label: 'Dashboard',        icon: <MdDashboard /> },
  { href: '/admin/distributors', label: 'Distributors',     icon: <FiTruck /> },
  { href: '/admin/products',     label: 'Products',         icon: <FiPackage /> },
  { href: '/admin/stock',        label: 'Stock Management', icon: <MdInventory /> },
  { href: '/admin/customers',    label: 'Customers',        icon: <FiUsers /> },
  { href: '/admin/orders',       label: 'Orders',           icon: <FiShoppingCart /> },
  { href: '/admin/complaints',   label: 'Complaints',       icon: <FiAlertCircle /> },
  { href: '/admin/ration-cards', label: 'Ration Cards',     icon: <MdFamilyRestroom /> },
  { href: '/admin/documents',    label: 'Documents',        icon: <MdVerified /> },
];

const DOC_LABELS = {
  aadhar:  '🪪 Aadhaar Card',
  pan:     '💳 PAN Card',
  tenth:   '📄 10th Certificate',
  twelfth: '📄 12th Certificate',
  other:   '📎 Other',
};

function StatusBadge({ status }) {
  const map = {
    pending:  { cls: 'bg-amber-100 text-amber-700',   icon: <FiClock size={10} />,       label: 'Pending'  },
    verified: { cls: 'bg-emerald-100 text-emerald-700', icon: <FiCheckCircle size={10} />, label: 'Verified' },
    rejected: { cls: 'bg-red-100 text-red-700',       icon: <FiXCircle size={10} />,     label: 'Rejected' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

export default function DocumentVerificationAdmin() {
  const [all,       setAll]       = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('pending');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);  // doc to verify
  const [adminNote, setAdminNote] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [viewing,   setViewing]   = useState(null);  // doc to preview

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      API.get('/documents/admin/all?status=pending'),
      API.get('/documents/admin/all?status=verified'),
      API.get('/documents/admin/all?status=rejected'),
    ])
      .then(([p, v, r]) => {
        const combined = [
          ...(p.data.documents || []),
          ...(v.data.documents || []),
          ...(r.data.documents || []),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAll(combined);
      })
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const counts = {
    pending:  all.filter(d => d.status === 'pending').length,
    verified: all.filter(d => d.status === 'verified').length,
    rejected: all.filter(d => d.status === 'rejected').length,
  };

  const filtered = all
    .filter(d => d.status === filter)
    .filter(d => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (d.user?.name              || '').toLowerCase().includes(s) ||
        (d.user?.rationCardNumber  || '').toLowerCase().includes(s) ||
        (d.user?.email             || '').toLowerCase().includes(s)
      );
    });

  const handleDecision = async (decision) => {
    setSaving(true);
    try {
      await API.put(`/documents/admin/${selected._id}/verify`, {
        status:    decision,
        adminNote: adminNote.trim(),
      });
      toast.success(`Document ${decision}!`);
      setSelected(null);
      setAdminNote('');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { key: 'pending',  label: 'Pending Review', bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700'   },
    { key: 'verified', label: 'Verified',        bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    { key: 'rejected', label: 'Rejected',        bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700'     },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdVerified className="text-emerald-600 text-2xl" />
            Document Verification
          </h1>
          <p className="text-gray-500 text-sm mt-1">Review and verify customer uploaded documents</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {statCards.map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`p-4 rounded-xl border text-left transition-all ${s.bg} ${s.border} ${
                filter === s.key ? 'ring-2 ring-emerald-500 shadow-md' : 'opacity-80 hover:opacity-100 hover:shadow-sm'
              }`}
            >
              <p className={`text-3xl font-black ${s.text}`}>{counts[s.key]}</p>
              <p className={`text-xs font-bold mt-1 ${s.text}`}>{s.label}</p>
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            className="input max-w-xs"
            placeholder="Search name, ration no, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            {statCards.map(s => (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  filter === s.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label} ({counts[s.key]})
              </button>
            ))}
          </div>
        </div>

        {/* Documents table */}
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No {filter} documents</p>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  {['Customer', 'Ration No.', 'Document', 'Type', 'Uploaded', 'Status', 'Action'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(d => (
                  <tr key={d._id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(d.user?.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{d.user?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{d.user?.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td font-mono text-xs text-emerald-700 font-bold">
                      {d.user?.rationCardNumber || '—'}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        <FiFile className="text-gray-400" size={13} />
                        <span className="text-sm text-gray-700 truncate max-w-[140px]">
                          {d.fileName || d.docLabel || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="table-td text-sm">
                      {DOC_LABELS[d.docType] || d.docType}
                    </td>
                    <td className="table-td text-gray-400 text-xs">
                      {new Date(d.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewing(d)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <FiEye size={13} /> View
                        </button>
                        {d.status === 'pending' && (
                          <button
                            onClick={() => { setSelected(d); setAdminNote(''); }}
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                          >
                            <FiCheck size={13} /> Verify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Preview Modal ── */}
        <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Document Preview" size="2xl">
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Customer',    value: viewing.user?.name },
                  { label: 'Ration No.', value: viewing.user?.rationCardNumber || '—' },
                  { label: 'Doc Type',   value: DOC_LABELS[viewing.docType] || viewing.docType },
                  { label: 'Uploaded',   value: new Date(viewing.createdAt).toLocaleString('en-IN') },
                ].map((f, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">{f.label}</p>
                    <p className="font-semibold text-gray-900">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* File viewer */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50" style={{ minHeight: 320 }}>
                {viewing.fileType === 'pdf' ? (
                  <iframe
                    src={viewing.fileUrl}
                    title="Document"
                    className="w-full"
                    style={{ height: 420, border: 'none' }}
                  />
                ) : (
                  <img
                    src={viewing.fileUrl}
                    alt="Document"
                    className="w-full object-contain"
                    style={{ maxHeight: 420 }}
                  />
                )}
              </div>

              <div className="flex justify-between items-center">
                <a
                  href={viewing.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Open in new tab ↗
                </a>
                <StatusBadge status={viewing.status} />
              </div>

              {viewing.adminNote && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <span className="font-semibold text-gray-600">Admin Note: </span>{viewing.adminNote}
                </div>
              )}

              {/* Quick verify from preview */}
              {viewing.status === 'pending' && (
                <div className="flex gap-3 justify-end border-t pt-4">
                  <button
                    onClick={() => { setViewing(null); setSelected(viewing); setAdminNote(''); }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <FiCheck size={13} /> Verify / Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* ── Verify/Reject Modal ── */}
        <Modal isOpen={!!selected} onClose={() => { setSelected(null); setAdminNote(''); }} title="Verify Document">
          {selected && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-bold text-gray-900 mb-2">{DOC_LABELS[selected.docType] || selected.docType}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-xs text-gray-500 block">Customer</span><p className="font-semibold">{selected.user?.name}</p></div>
                  <div><span className="text-xs text-gray-500 block">Ration No.</span><p className="font-mono font-bold text-emerald-700">{selected.user?.rationCardNumber || '—'}</p></div>
                  <div className="col-span-2"><span className="text-xs text-gray-500 block">File</span><p className="text-gray-700">{selected.fileName || selected.docLabel}</p></div>
                </div>
                <a
                  href={selected.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2 font-medium"
                >
                  <FiEye size={11} /> Open document ↗
                </a>
              </div>

              <div>
                <label className="label">Note to customer (optional)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="e.g. Document is clear and valid. / Please re-upload a clearer copy."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => { setSelected(null); setAdminNote(''); }} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => handleDecision('rejected')}
                  disabled={saving}
                  className="btn-danger flex items-center gap-2"
                >
                  <FiX size={13} /> {saving ? 'Saving…' : 'Reject'}
                </button>
                <button
                  onClick={() => handleDecision('verified')}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  <FiCheck size={13} /> {saving ? 'Saving…' : 'Verify'}
                </button>
              </div>
            </div>
          )}
        </Modal>

      </main>
    </div>
  );
}