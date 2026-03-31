/**
 * RationCardAdmin.jsx — Admin view
 * Route: /admin/ration-cards
 */

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiUsers, FiTruck, FiPackage, FiShoppingCart,
  FiAlertCircle, FiCheck, FiX, FiEye, FiFileText, FiFile,
} from 'react-icons/fi';
import { MdDashboard, MdInventory, MdFamilyRestroom } from 'react-icons/md';

const adminLinks = [
  { href: '/admin/dashboard',    label: 'Dashboard',        icon: <MdDashboard /> },
  { href: '/admin/distributors', label: 'Distributors',     icon: <FiTruck /> },
  { href: '/admin/products',     label: 'Products',         icon: <FiPackage /> },
  { href: '/admin/stock',        label: 'Stock Management', icon: <MdInventory /> },
  { href: '/admin/customers',    label: 'Customers',        icon: <FiUsers /> },
  { href: '/admin/orders',       label: 'Orders',           icon: <FiShoppingCart /> },
  { href: '/admin/complaints',   label: 'Complaints',       icon: <FiAlertCircle /> },
  { href: '/admin/ration-cards', label: 'Ration Cards',     icon: <MdFamilyRestroom /> },
];

const CARD_TYPE_COLORS = {
  PHH:  'bg-emerald-100 text-emerald-800',
  AAY:  'bg-amber-100 text-amber-800',
  NPHH: 'bg-blue-100 text-blue-800',
  APL:  'bg-purple-100 text-purple-800',
};

// ════════════════════════════════════════════════════════════════
// Tab 1: Member Requests
// ════════════════════════════════════════════════════════════════
function MemberRequestsTab() {
  const [all,       setAll]       = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('pending');
  const [selected,  setSelected]  = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [docViewer, setDocViewer] = useState(null); // doc to preview fullscreen

  // Fetch all three statuses at once so counts are always accurate
  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      API.get('/ration-card/admin/requests?status=pending'),
      API.get('/ration-card/admin/requests?status=approved'),
      API.get('/ration-card/admin/requests?status=rejected'),
    ])
      .then(([p, a, r]) => {
        const combined = [
          ...(p.data.requests || []),
          ...(a.data.requests || []),
          ...(r.data.requests || []),
        ].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
        setAll(combined);
      })
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const counts = {
    pending:  all.filter(r => r.status === 'pending').length,
    approved: all.filter(r => r.status === 'approved').length,
    rejected: all.filter(r => r.status === 'rejected').length,
  };

  const visible = all.filter(r => r.status === filter);

  const handleDecision = async (decision) => {
    setSaving(true);
    try {
      await API.put(`/ration-card/admin/requests/${selected._id}`, {
        cardId:    selected.cardId,
        status:    decision,
        adminNote: adminNote.trim(),
      });
      toast.success(`Request ${decision}!`);
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
    { key: 'pending',  label: 'Pending',  bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700'   },
    { key: 'approved', label: 'Approved', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    { key: 'rejected', label: 'Rejected', bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700'     },
  ];

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {statCards.map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`p-4 rounded-xl border text-left transition-all ${s.bg} ${s.border} ${
              filter === s.key ? 'ring-2 ring-emerald-500 shadow-md' : 'hover:shadow-sm opacity-80 hover:opacity-100'
            }`}
          >
            <p className={`text-3xl font-black ${s.text}`}>{counts[s.key]}</p>
            <p className={`text-xs font-bold mt-1 ${s.text}`}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
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

      {/* List */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No {filter} requests</p>
        ) : (
          <div className="space-y-3">
            {visible.map(r => (
              <div
                key={r._id}
                className={`rounded-xl border p-4 ${
                  r.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                  r.status === 'rejected' ? 'bg-red-50 border-red-200' :
                  'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.type === 'add' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.type === 'add' ? '➕ ADD' : '❌ REMOVE'}
                      </span>
                      <span className="font-bold text-gray-900">{r.memberName}</span>
                      <Badge status={r.status} />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 text-sm mb-2">
                      <div>
                        <span className="text-xs text-gray-500 block">Card Holder</span>
                        <p className="font-semibold text-gray-900">{r.userName}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Ration No.</span>
                        <p className="font-mono text-xs text-emerald-700 font-bold">{r.rationCardNumber}</p>
                      </div>
                      {r.type === 'add' && (
                        <>
                          <div>
                            <span className="text-xs text-gray-500 block">Relation</span>
                            <p className="font-semibold text-gray-900">{r.relation}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">DOB</span>
                            <p className="font-semibold text-gray-900">
                              {r.dob ? new Date(r.dob).toLocaleDateString('en-IN') : '—'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-gray-500 block">Aadhaar</span>
                            <p className="font-mono text-sm text-gray-700">{r.aadhar || '—'}</p>
                          </div>
                        </>
                      )}
                      {r.type === 'remove' && (
                        <div className="col-span-2">
                          <span className="text-xs text-gray-500 block">Reason</span>
                          <p className="text-gray-700 text-sm">{r.reason}</p>
                        </div>
                      )}
                    </div>

                    {r.adminNote && (
                      <p className="text-xs text-gray-500 italic">Admin note: {r.adminNote}</p>
                    )}
                    {/* Document uploaded indicator */}
                    {r.type === 'add' && r.docUrl && (
                      <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                        <FiFile size={10} /> Document uploaded
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted: {new Date(r.createdAt).toLocaleString('en-IN')}
                      {r.resolvedAt ? ` · Resolved: ${new Date(r.resolvedAt).toLocaleString('en-IN')}` : ''}
                    </p>
                  </div>

                  {r.status === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {/* View document button — only shown if doc was uploaded */}
                      {r.docUrl && (
                        <button
                          onClick={() => setDocViewer(r)}
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-semibold whitespace-nowrap"
                        >
                          <FiFile size={13} /> View Doc
                        </button>
                      )}
                      <button
                        onClick={() => { setSelected(r); setAdminNote(''); }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-semibold whitespace-nowrap"
                      >
                        <FiEye size={13} /> Decide
                      </button>
                    </div>
                  )}
                  {r.status !== 'pending' && r.docUrl && (
                    <button
                      onClick={() => setDocViewer(r)}
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-semibold whitespace-nowrap flex-shrink-0"
                    >
                      <FiFile size={13} /> View Doc
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Decision Modal ── */}
      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setAdminNote(''); }}
        title="Review Member Request"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 text-sm border ${
              selected.type === 'add' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}>
              <p className="font-bold text-gray-900 mb-3">
                {selected.type === 'add' ? '➕ Add Member Request' : '❌ Remove Member Request'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-2">
                  <span className="text-xs text-gray-500 block">Card Holder</span>
                  <p className="font-semibold text-gray-900">{selected.userName}</p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <span className="text-xs text-gray-500 block">Ration No.</span>
                  <p className="font-mono font-bold text-emerald-700">{selected.rationCardNumber}</p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <span className="text-xs text-gray-500 block">Member Name</span>
                  <p className="font-semibold text-gray-900">{selected.memberName}</p>
                </div>
                {selected.type === 'add' && (
                  <>
                    <div className="bg-white rounded-lg p-2">
                      <span className="text-xs text-gray-500 block">Relation</span>
                      <p className="font-semibold">{selected.relation}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <span className="text-xs text-gray-500 block">Date of Birth</span>
                      <p className="font-semibold">
                        {selected.dob ? new Date(selected.dob).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <span className="text-xs text-gray-500 block">Aadhaar</span>
                      <p className="font-mono">{selected.aadhar || '—'}</p>
                    </div>
                    {/* Uploaded document */}
                    <div className="col-span-2 bg-white rounded-lg p-2">
                      <span className="text-xs text-gray-500 block mb-1">Uploaded Document</span>
                      {selected.docUrl ? (
                        <div className="space-y-2">
                          {selected.docType === 'pdf' ? (
                            <iframe
                              src={selected.docUrl}
                              title="Member document"
                              className="w-full rounded-lg border border-gray-200"
                              style={{ height: 260 }}
                            />
                          ) : (
                            <img
                              src={selected.docUrl}
                              alt="Member document"
                              className="max-h-52 rounded-lg border border-gray-200 object-contain"
                            />
                          )}
                          <a
                            href={selected.docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                          >
                            <FiEye size={11} /> Open in new tab
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No document uploaded</p>
                      )}
                    </div>
                  </>
                )}
                {selected.type === 'remove' && (
                  <div className="col-span-2 bg-white rounded-lg p-2">
                    <span className="text-xs text-gray-500 block">Reason</span>
                    <p>{selected.reason}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="label">Admin Note (optional — shown to customer)</label>
              <textarea
                className="input"
                rows={2}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="e.g. Document verified. / Insufficient proof provided."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setSelected(null); setAdminNote(''); }} className="btn-secondary">
                Cancel
              </button>
              <button onClick={() => handleDecision('rejected')} disabled={saving} className="btn-danger flex items-center gap-2">
                <FiX size={13} /> {saving ? 'Saving…' : 'Reject'}
              </button>
              <button onClick={() => handleDecision('approved')} disabled={saving} className="btn-primary flex items-center gap-2">
                <FiCheck size={13} /> {saving ? 'Saving…' : 'Approve'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Standalone Document Viewer Modal ── */}
      <Modal isOpen={!!docViewer} onClose={() => setDocViewer(null)} title="Uploaded Document" size="2xl">
        {docViewer && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500 block">Member</span>
                <p className="font-semibold text-gray-900">{docViewer.memberName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500 block">Card Holder</span>
                <p className="font-semibold text-gray-900">{docViewer.userName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500 block">Ration No.</span>
                <p className="font-mono font-bold text-emerald-700">{docViewer.rationCardNumber || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500 block">File</span>
                <p className="text-gray-700 truncate">{docViewer.docFileName || 'document'}</p>
              </div>
            </div>

            {/* Document viewer */}
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ minHeight: 400 }}>
              {docViewer.docType === 'pdf' ? (
                <iframe
                  src={docViewer.docUrl}
                  title="Member document"
                  className="w-full"
                  style={{ height: 480, border: 'none' }}
                />
              ) : (
                <div className="flex items-center justify-center p-4" style={{ minHeight: 400 }}>
                  <img
                    src={docViewer.docUrl}
                    alt="Member document"
                    className="max-w-full rounded-lg object-contain"
                    style={{ maxHeight: 460 }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href={docViewer.docUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                <FiEye size={14} /> Open in new tab ↗
              </a>
              {docViewer.status === 'pending' && (
                <button
                  onClick={() => { setDocViewer(null); setSelected(docViewer); setAdminNote(''); }}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <FiCheck size={13} /> Go to Decide
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab 2: All Ration Cards
// ════════════════════════════════════════════════════════════════
function AllCardsTab() {
  const [cards,   setCards]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [detail,  setDetail]  = useState(null);

  useEffect(() => {
    API.get('/ration-card/admin/all')
      .then(({ data }) => setCards(data.cards || []))
      .catch(() => toast.error('Failed to load ration cards'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cards.filter(c =>
    (c.user?.name       || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.rationCardNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.user?.phone      || '').includes(search) ||
    (c.user?.email      || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search name, ration number, phone, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                {['Card Holder', 'Ration Number', 'Card Type', 'Members', 'Phone', 'Created', 'Action'].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(c.user?.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{c.user?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{c.user?.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td font-mono text-xs text-emerald-700 font-bold">{c.rationCardNumber}</td>
                  <td className="table-td">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${CARD_TYPE_COLORS[c.cardType] || 'bg-gray-100 text-gray-700'}`}>
                      {c.cardType}
                    </span>
                  </td>
                  <td className="table-td text-center font-bold">{c.familyMembers?.length ?? 0}</td>
                  <td className="table-td text-gray-500">{c.user?.phone || '—'}</td>
                  <td className="table-td text-gray-400">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="table-td">
                    <button
                      onClick={() => setDetail(c)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <FiEye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-td text-center text-gray-400 py-10">
                    {cards.length === 0 ? 'No ration cards registered yet' : 'No results found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Ration Card Details" size="xl">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Card Holder',   value: detail.user?.name },
                { label: 'Ration Number', value: detail.rationCardNumber, mono: true },
                { label: 'Card Type',     value: detail.cardType },
                { label: 'Phone',         value: detail.user?.phone || '—' },
                { label: 'Email',         value: detail.user?.email || '—' },
                { label: 'Date of Birth', value: detail.dob ? new Date(detail.dob).toLocaleDateString('en-IN') : '—' },
              ].map((f, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">{f.label}</p>
                  <p className={`font-bold text-gray-900 ${f.mono ? 'font-mono text-emerald-700' : ''}`}>{f.value}</p>
                </div>
              ))}
              <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">Address</p>
                <p className="font-semibold text-gray-900">{detail.address}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1">
                <MdFamilyRestroom className="text-emerald-600" />
                Family Members ({detail.familyMembers?.length ?? 0})
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Name', 'Relation', 'DOB', 'Aadhaar'].map(h => (
                      <th key={h} className="text-left py-2 pr-4 text-xs text-gray-500 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(detail.familyMembers || []).map((m, i) => (
                    <tr key={m._id || i}>
                      <td className="py-2 pr-4 font-semibold text-gray-900">
                        {m.name}
                        {m.isHead && <span className="ml-1 text-xs text-emerald-600 font-bold">(HEAD)</span>}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{m.relation}</td>
                      <td className="py-2 pr-4 text-gray-500">{m.dob ? new Date(m.dob).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="py-2 font-mono text-xs text-gray-500">{m.aadhar || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function RationCardAdmin() {
  const [tab, setTab] = useState('requests');

  const tabs = [
    { key: 'requests', label: 'Member Requests',  icon: <FiFileText size={14} /> },
    { key: 'cards',    label: 'All Ration Cards', icon: <FiUsers    size={14} /> },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={adminLinks} role="admin" />
      <main className="flex-1 p-6 lg:p-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdFamilyRestroom className="text-emerald-600 text-2xl" />
            Ration Card Administration
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage member change requests and view all registered ration cards
          </p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'requests' && <MemberRequestsTab />}
        {tab === 'cards'    && <AllCardsTab />}

      </main>
    </div>
  );
}