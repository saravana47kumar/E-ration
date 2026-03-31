/**
 * RationCardPage.jsx  — Customer view
 *
 * Route: /customer/ration-card
 *
 * Sections:
 *  1. Visual ration card (TnRationCard component)
 *  2. Card detail info panel
 *  3. Family members table (with remove request button)
 *  4. Add member form (submit → pending approval)
 *  5. My Requests history (Pending / Approved / Rejected)
 *
 * First-time users: shows CreateCardForm instead.
 */

import { useState, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import TnRationCard from '../../components/TnRationCard';
import { useRationCard } from '../../context/RationCardContext';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import { customerLinks } from './links';
import toast from 'react-hot-toast';
import {
  FiUser, FiUsers, FiPlus, FiTrash2, FiClock,
  FiShield, FiFileText, FiAlertCircle, FiCheck, FiX, FiLock,
  FiUpload,
} from 'react-icons/fi';
import { MdFamilyRestroom } from 'react-icons/md';

// ── Card type options ────────────────────────────────────────────
const CARD_TYPES  = ['PHH', 'AAY', 'NPHH', 'APL'];
const CARD_LABELS = {
  PHH:  'PHH — Priority Household',
  AAY:  'AAY — Antyodaya Anna Yojana',
  NPHH: 'NPHH — Non-Priority Household',
  APL:  'APL — Above Poverty Line',
};
const RELATIONS = ['Spouse','Son','Daughter','Father','Mother','Brother','Sister','Grandfather','Grandmother','Other'];

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

// Status badge matching existing Badge component style
function ReqBadge({ status }) {
  return <Badge status={status} />;
}

// Reusable labelled field
function Field({ label, value, mono = false, note = '' }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <p className={`font-bold text-gray-900 text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
      {note && <p className="text-xs text-emerald-600 font-semibold mt-0.5">{note}</p>}
    </div>
  );
}

// ── Create Card Form (first-time) ─────────────────────────────────
function CreateCardForm({ onCreate }) {
  const { user } = useAuth();
  const [form,    setForm]   = useState({ cardType: 'PHH', dob: '', address: user?.address || '', aadhar: '' });
  const [photo,   setPhoto]  = useState(null);
  const [busy,    setBusy]   = useState(false);
  const [rcn,     setRcn]    = useState('');
  const [rcnLoad, setRcnLoad] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dob)     return toast.error('Date of birth is required');
    if (!form.aadhar)  return toast.error('Aadhaar number is required');
    if (!form.address) return toast.error('Address is required');
    if (!rcn.trim())   return toast.error('Ration card number is required');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('rationCardNumber', rcn.trim()); // include editable rcn
      if (photo) fd.append('photo', photo);
      await onCreate(fd);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ration card');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">🌾</div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Create Your Ration Card</h2>
            <p className="text-sm text-gray-500">Fill in your details to activate your card</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Ration Card Number — user types it manually */}
          <div>
            <label className="label">Ration Card Number *</label>
            <input
              type="text"
              className="input font-mono"
              value={rcn}
              onChange={e => setRcn(e.target.value)}
              placeholder="e.g. TN2600134572"
              required
            />
          </div>

          <div>
            <label className="label">Card Type</label>
            <select className="input" value={form.cardType} onChange={set('cardType')}>
              {CARD_TYPES.map(t => <option key={t} value={t}>{CARD_LABELS[t]}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Your Date of Birth *</label>
            <input
              type="date" className="input"
              value={form.dob} onChange={set('dob')}
              required max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="label">Your Aadhaar Number *</label>
            <input
              className="input font-mono"
              value={form.aadhar} onChange={set('aadhar')}
              required placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
            />
            <p className="text-xs text-gray-400 mt-1">Head of family Aadhaar — required for card activation</p>
          </div>

          <div>
            <label className="label">Delivery Address *</label>
            <textarea
              className="input" rows={3}
              value={form.address} onChange={set('address')}
              required placeholder="Door No, Street, City, District, Pincode"
            />
          </div>

          <div>
            <label className="label">Photo (optional)</label>
            <input
              type="file" accept="image/*"
              onChange={e => setPhoto(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full py-3"
          >
            {busy ? 'Creating…' : '🌾 Create Ration Card'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Family members table ──────────────────────────────────────────
function FamilyTable({ members, onRequestRemove, onUpdateHeadAadhar }) {
  const [editingAadhar, setEditingAadhar] = useState('');
  const [aadharVal,     setAadharVal]     = useState('');
  const [saving,        setSaving]         = useState(false);

  const startEdit = (m) => {
    setEditingAadhar(m._id);
    setAadharVal(m.aadhar || '');
  };

  const saveAadhar = async (memberId) => {
    if (!aadharVal.trim()) return toast.error('Aadhaar number cannot be empty');
    setSaving(true);
    try {
      await onUpdateHeadAadhar(memberId, aadharVal.trim());
      setEditingAadhar('');
      toast.success('Aadhaar updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update Aadhaar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <MdFamilyRestroom className="text-emerald-600 text-lg" />
        <h2 className="font-bold text-gray-900">Family Members ({members.length})</h2>
      </div>
      <table className="w-full">
        <thead className="border-b border-gray-100">
          <tr>
            {['#', 'Name', 'Relation', 'Date of Birth', 'Aadhaar', 'Action'].map(h => (
              <th key={h} className="table-th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {members.map((m, i) => (
            <tr key={m._id} className="hover:bg-gray-50">
              <td className="table-td text-gray-400 font-semibold">{i + 1}</td>
              <td className="table-td">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${m.isHead ? 'bg-emerald-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                    {m.isHead && <p className="text-xs text-emerald-600 font-bold">HEAD</p>}
                  </div>
                </div>
              </td>
              <td className="table-td">{m.relation}</td>
              <td className="table-td text-gray-500">{new Date(m.dob).toLocaleDateString('en-IN')}</td>

              {/* Aadhaar — editable inline for head member if empty */}
              <td className="table-td">
                {m.isHead && editingAadhar === m._id ? (
                  <div className="flex items-center gap-1">
                    <input
                      className="border border-gray-300 rounded px-2 py-1 text-xs font-mono w-36 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      value={aadharVal}
                      onChange={e => setAadharVal(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX"
                      maxLength={14}
                      autoFocus
                    />
                    <button
                      onClick={() => saveAadhar(m._id)}
                      disabled={saving}
                      className="text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded font-semibold"
                    >
                      {saving ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingAadhar('')}
                      className="text-xs text-gray-500 hover:text-gray-700 px-1"
                    >✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs ${m.aadhar ? 'text-gray-600' : 'text-red-400 italic'}`}>
                      {m.aadhar || 'Not set'}
                    </span>
                    {/* Only head can edit their own Aadhaar inline */}
                    {m.isHead && (
                      <button
                        onClick={() => startEdit(m)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline"
                      >
                        {m.aadhar ? 'Edit' : 'Add'}
                      </button>
                    )}
                  </div>
                )}
              </td>

              <td className="table-td">
                {!m.isHead && (
                  <button
                    onClick={() => onRequestRemove(m)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    <FiTrash2 size={13} /> Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No family members</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Add member form ───────────────────────────────────────────────
function AddMemberForm({ onSubmit, onCancel }) {
  const [form,    setForm]    = useState({ memberName: '', relation: 'Spouse', dob: '', aadhar: '' });
  const [docFile, setDocFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy,    setBusy]    = useState(false);
  const fileRef = useRef(null);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error('Max 10 MB'); return; }
    setDocFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.memberName || !form.dob || !form.aadhar) {
      return toast.error('Please fill all required fields');
    }
    setBusy(true);
    try {
      // Always send as FormData so the optional file goes through multer
      const fd = new FormData();
      fd.append('type',       'add');
      fd.append('memberName', form.memberName);
      fd.append('relation',   form.relation);
      fd.append('dob',        form.dob);
      fd.append('aadhar',     form.aadhar);
      if (docFile) fd.append('docFile', docFile);
      await onSubmit(fd);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card border-2 border-emerald-200">
      <div className="flex items-center gap-2 mb-4">
        <FiPlus className="text-emerald-600" />
        <h2 className="font-bold text-gray-900">Add Family Member</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Full Name *</label>
            <input className="input" value={form.memberName} onChange={set('memberName')} required placeholder="Enter full name" />
          </div>
          <div>
            <label className="label">Relation *</label>
            <select className="input" value={form.relation} onChange={set('relation')}>
              {RELATIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date of Birth *</label>
            <input type="date" className="input" value={form.dob} onChange={set('dob')} required max={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="col-span-2">
            <label className="label">Aadhaar Number *</label>
            <input className="input font-mono" value={form.aadhar} onChange={set('aadhar')} required placeholder="XXXX-XXXX-XXXX" maxLength={14} />
          </div>

          {/* Document upload */}
          <div className="col-span-2">
            <label className="label flex items-center gap-1">
              Verification Document
              <span className="text-xs font-normal text-gray-400">(Aadhaar, Birth Certificate, etc. — PDF or image)</span>
            </label>

            {docFile ? (
              <div className="space-y-2">
                {preview && (
                  <img src={preview} alt="preview" className="h-28 rounded-lg object-cover border border-gray-200" />
                )}
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <FiFileText className="text-emerald-600 flex-shrink-0" size={14} />
                  <span className="text-xs text-gray-700 truncate flex-1">{docFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setDocFile(null); setPreview(''); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-xs text-red-500 hover:text-red-600 font-medium ml-2"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 hover:border-emerald-400 rounded-xl py-4 flex flex-col items-center gap-1 transition-colors group"
              >
                <FiUpload size={18} className="text-gray-400 group-hover:text-emerald-500" />
                <span className="text-xs text-gray-500 group-hover:text-emerald-600 font-medium">Click to upload document</span>
                <span className="text-xs text-gray-400">PDF, JPG, PNG · Max 10 MB · Optional</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          ⚠️ This request will be reviewed by the Admin. Member will be added only after approval.
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary flex items-center gap-2">
            <FiPlus size={13} /> {busy ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── My Requests panel ─────────────────────────────────────────────
function MyRequests({ requests }) {
  const [filter, setFilter] = useState('all');
  const tabs = [
    { key: 'all',      label: 'All',      count: requests.length },
    { key: 'pending',  label: 'Pending',  count: requests.filter(r => r.status === 'pending').length },
    { key: 'approved', label: 'Approved', count: requests.filter(r => r.status === 'approved').length },
    { key: 'rejected', label: 'Rejected', count: requests.filter(r => r.status === 'rejected').length },
  ];

  const visible = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <FiClock className="text-emerald-600" />
        <h2 className="font-bold text-gray-900">My Requests</h2>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filter === t.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No {filter === 'all' ? '' : filter} requests</p>
      ) : (
        <div className="space-y-3">
          {visible.map(r => (
            <div key={r._id} className={`rounded-xl p-4 border ${
              r.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
              r.status === 'rejected' ? 'bg-red-50 border-red-200' :
              'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {r.type === 'add'
                      ? <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">➕ ADD</span>
                      : <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">❌ REMOVE</span>
                    }
                    <span className="font-semibold text-gray-900 text-sm">{r.memberName}</span>
                  </div>
                  {r.type === 'add' && (
                    <p className="text-xs text-gray-600">
                      Relation: {r.relation}
                      {r.dob ? ` · DOB: ${new Date(r.dob).toLocaleDateString('en-IN')}` : ''}
                    </p>
                  )}
                  {r.type === 'remove' && r.reason && (
                    <p className="text-xs text-gray-600">Reason: {r.reason}</p>
                  )}
                  {r.adminNote && (
                    <p className="text-xs text-gray-500 mt-1">Admin: {r.adminNote}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Submitted: {new Date(r.createdAt).toLocaleString('en-IN')}
                    {r.resolvedAt ? ` · Resolved: ${new Date(r.resolvedAt).toLocaleString('en-IN')}` : ''}
                  </p>
                </div>
                <ReqBadge status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function RationCardPage() {
  const { card, requests, loading, error, createCard, submitRequest, refetch } = useRationCard();
  const { user } = useAuth();

  const [showAddForm,  setShowAddForm]  = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeReason, setRemoveReason] = useState('');

  // ── Update head Aadhaar directly (no admin approval needed) ────
  const handleUpdateHeadAadhar = async (_memberId, aadhar) => {
    await API.put('/ration-card/head-aadhar', { aadhar });
    refetch();
  };

  // ── Submit add request ──────────────────────────────────────
  const handleAddMember = async (payload) => {
    try {
      await submitRequest(payload);
      setShowAddForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
  };

  // ── Submit remove request ───────────────────────────────────
  const handleRemoveMember = async () => {
    if (!removeReason.trim()) return toast.error('Please provide a reason');
    try {
      await submitRequest({
        type:     'remove',
        memberId: String(removeTarget._id),   // ensure plain string, not ObjectId object
        reason:   removeReason.trim(),
      });
      setRemoveTarget(null);
      setRemoveReason('');
      toast.success('Removal request submitted for admin approval');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks} role="customer" />
      <main className="flex-1 p-6 lg:p-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiFileText className="text-emerald-600" /> My Ration Card
          </h1>
          <p className="text-gray-500 text-sm mt-1">Tamil Nadu Civil Supplies — E-Ration System</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="card border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {/* No card yet → create form */}
        {!loading && !error && !card && (
          <CreateCardForm onCreate={createCard} />
        )}

        {/* Card exists → full view */}
        {!loading && !error && card && (
          <div className="space-y-6">

            {/* Visual card */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Card</p>
              <TnRationCard card={card} />
            </div>

            {/* Card info grid */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FiShield className="text-emerald-600" />
                <h2 className="font-bold text-gray-900">Card Details</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Field
                  label="Ration Card Number"
                  value={card.rationCardNumber || card.user?.rationCardNumber || '—'}
                  mono
                  note="🔒 Cannot be edited"
                />
                <Field label="Card Type" value={`${card.cardType}`} />
                <Field
                  label="Date of Birth"
                  value={new Date(card.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                />
                <Field label="Name" value={card.user?.name || '—'} />
                <Field label="Phone" value={card.user?.phone || '—'} />
                <Field label="Family Members" value={card.familyMembers?.length ?? 0} />
                <div className="col-span-2 lg:col-span-3">
                  <Field label="Address" value={card.address} />
                </div>
              </div>
            </div>

            {/* Family members table */}
            <FamilyTable
              members={card.familyMembers || []}
              onRequestRemove={setRemoveTarget}
              onUpdateHeadAadhar={handleUpdateHeadAadhar}
            />

            {/* Add member */}
            {showAddForm ? (
              <AddMemberForm onSubmit={handleAddMember} onCancel={() => setShowAddForm(false)} />
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary flex items-center gap-2"
              >
                <FiPlus size={14} /> Add Family Member
              </button>
            )}

          </div>
        )}

        {/* ── Remove Confirmation Modal ── */}
        <Modal
          isOpen={!!removeTarget}
          onClose={() => { setRemoveTarget(null); setRemoveReason(''); }}
          title="Request Member Removal"
        >
          {removeTarget && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
                <p className="font-semibold text-red-800 mb-1">
                  <FiAlertCircle className="inline mr-1" />
                  Requesting removal of: <strong>{removeTarget.name}</strong> ({removeTarget.relation})
                </p>
                <p className="text-red-700 text-xs">This requires Admin Approval. The member will remain on the card until approved.</p>
              </div>
              <div>
                <label className="label">Reason for removal *</label>
                <textarea
                  className="input"
                  rows={3}
                  value={removeReason}
                  onChange={e => setRemoveReason(e.target.value)}
                  placeholder="e.g. Member married and has own ration card"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setRemoveTarget(null); setRemoveReason(''); }} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleRemoveMember} className="btn-danger flex items-center gap-2">
                  <FiTrash2 size={13} /> Submit Request
                </button>
              </div>
            </div>
          )}
        </Modal>

      </main>
    </div>
  );
}