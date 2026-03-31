/**
 * DocumentsPage.jsx — Customer view
 * Route: /customer/documents
 *
 * Customer can:
 *   - Upload Aadhaar, PAN, 10th, 12th, Other as PDF or image
 *   - View status of each uploaded document (pending / verified / rejected)
 *   - Delete a pending document and re-upload
 */

import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { customerLinks } from './links';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiUpload, FiTrash2, FiFile, FiCheckCircle,
  FiXCircle, FiClock, FiEye, FiPlus,
} from 'react-icons/fi';

// ── Document type config ─────────────────────────────────────────
const DOC_TYPES = [
  { key: 'aadhar',  label: 'Aadhaar Card',      icon: '🪪', desc: 'Front & back scan or PDF'       },
  { key: 'pan',     label: 'PAN Card',           icon: '💳', desc: 'Clear scan or PDF'              },
  { key: 'tenth',   label: '10th Certificate',   icon: '📄', desc: 'Mark sheet PDF or scan'         },
  { key: 'twelfth', label: '12th Certificate',   icon: '📄', desc: 'Mark sheet PDF or scan'         },
  { key: 'other',   label: 'Other Document',     icon: '📎', desc: 'Any supporting document'        },
];

// ── Status badge ─────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:  { bg: 'bg-amber-100',   text: 'text-amber-700',   icon: <FiClock    size={11} />, label: 'Pending'  },
    verified: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <FiCheckCircle size={11} />, label: 'Verified' },
    rejected: { bg: 'bg-red-100',     text: 'text-red-700',     icon: <FiXCircle  size={11} />, label: 'Rejected' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ── Upload form for one doc type ─────────────────────────────────
function UploadCard({ docType, existing, onUploaded, onDeleted }) {
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState('');
  const [busy,     setBusy]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error('Max 10 MB per file'); return; }
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : '');
  };

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file',    file);
      fd.append('docType', docType.key);
      fd.append('docLabel', docType.label);
      const { data } = await API.post('/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${docType.label} uploaded!`);
      setFile(null);
      setPreview('');
      if (inputRef.current) inputRef.current.value = '';
      onUploaded(data.document);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    setDeleting(true);
    try {
      await API.delete(`/documents/${existing._id}`);
      toast.success('Document removed');
      onDeleted(existing._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const statusColor = {
    pending:  'border-amber-300   bg-amber-50',
    verified: 'border-emerald-300 bg-emerald-50',
    rejected: 'border-red-300     bg-red-50',
  };

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${existing ? statusColor[existing.status] : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{docType.icon}</span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{docType.label}</p>
            <p className="text-xs text-gray-400">{docType.desc}</p>
          </div>
        </div>
        {existing && <StatusBadge status={existing.status} />}
      </div>

      {/* Already uploaded */}
      {existing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-100">
            <FiFile className="text-gray-400 flex-shrink-0" size={14} />
            <span className="text-xs text-gray-600 truncate flex-1">{existing.fileName || existing.docLabel}</span>
            <a
              href={existing.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
            >
              <FiEye size={12} /> View
            </a>
          </div>

          {existing.adminNote && (
            <div className={`text-xs px-3 py-2 rounded-lg ${existing.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              <span className="font-semibold">Admin: </span>{existing.adminNote}
            </div>
          )}

          {/* Allow re-upload only if rejected or pending */}
          {existing.status !== 'verified' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
            >
              <FiTrash2 size={11} /> {deleting ? 'Removing…' : 'Remove & re-upload'}
            </button>
          )}
        </div>
      ) : (
        /* Upload area */
        <div>
          {file ? (
            <div className="space-y-2">
              {preview && (
                <img src={preview} alt="" className="w-full h-28 object-cover rounded-lg" />
              )}
              {!preview && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <FiFile className="text-gray-400" size={14} />
                  <span className="text-xs text-gray-600 truncate">{file.name}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setFile(null); setPreview(''); if (inputRef.current) inputRef.current.value = ''; }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                >
                  <FiUpload size={12} /> {busy ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 hover:border-emerald-400 rounded-lg py-4 flex flex-col items-center gap-1 transition-colors group"
            >
              <FiPlus size={18} className="text-gray-400 group-hover:text-emerald-500" />
              <span className="text-xs text-gray-500 group-hover:text-emerald-600 font-medium">Click to upload</span>
              <span className="text-xs text-gray-400">PDF, JPG, PNG · Max 10 MB</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    API.get('/documents/my')
      .then(({ data }) => setDocuments(data.documents || []))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  // Map docType → existing document (latest one if multiple)
  const docByType = {};
  documents.forEach(d => {
    if (!docByType[d.docType] || new Date(d.createdAt) > new Date(docByType[d.docType].createdAt)) {
      docByType[d.docType] = d;
    }
  });

  const handleUploaded = (doc) => {
    setDocuments(prev => [doc, ...prev.filter(d => d.docType !== doc.docType)]);
  };

  const handleDeleted = (id) => {
    setDocuments(prev => prev.filter(d => d._id !== id));
  };

  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const totalRequired = 2; // Aadhaar + PAN are the minimum

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks} role="customer" />
      <main className="flex-1 p-6 lg:p-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
          <p className="text-gray-500 text-sm mt-1">Upload your identity documents for ration card verification</p>
        </div>

        {/* Progress banner */}
        <div className="card mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-emerald-800 text-sm">Verification Progress</p>
            <p className="text-xs text-emerald-600 font-bold">{verifiedCount} of {DOC_TYPES.length} verified</p>
          </div>
          <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(verifiedCount / DOC_TYPES.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-emerald-700 mt-2">
            {verifiedCount >= totalRequired
              ? '✅ Minimum documents verified. Your ration card is confirmed.'
              : `⚠️ Please upload at least Aadhaar and PAN card for verification.`}
          </p>
        </div>

        {/* Document cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOC_TYPES.map(dt => (
              <UploadCard
                key={dt.key}
                docType={dt}
                existing={docByType[dt.key] || null}
                onUploaded={handleUploaded}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 card bg-blue-50 border-blue-200">
          <p className="text-sm font-semibold text-blue-800 mb-2">📋 Instructions</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Upload clear, readable scans or photographs of your documents</li>
            <li>PDF format is preferred for certificates and mark sheets</li>
            <li>Maximum file size is 10 MB per document</li>
            <li>Admin will review and verify your documents within 2–3 working days</li>
            <li>You will be notified once verification is complete</li>
            <li>Rejected documents can be removed and re-uploaded with correct files</li>
          </ul>
        </div>

      </main>
    </div>
  );
}