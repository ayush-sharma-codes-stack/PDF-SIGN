import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Upload, FileText, Calendar, PenTool, CheckCircle2, Download,
  ArrowRight, Loader, TrendingUp, Clock, Files, CloudUpload,
  AlertCircle, Sparkles, XCircle, Filter, RefreshCw,
  Shield, Mail, ChevronRight, Eye, Trash2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://pdf-sign-12xc.onrender.com/api');

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://pdf-sign-12xc.onrender.com');

// ── Status helpers ───────────────────────────────────────────────────────────
const getDocStatus = (sigs = []) => {
  if (sigs.length === 0) return { key: 'empty',    text: 'No Fields',  badge: 'badge badge-empty',   dot: 'bg-slate-600' };
  if (sigs.some(s => s.status === 'rejected'))  return { key: 'rejected', text: 'Rejected',   badge: 'badge badge-rejected', dot: 'bg-red-400'   };
  if (sigs.some(s => s.status === 'pending'))   return { key: 'pending',  text: 'Pending',    badge: 'badge badge-pending',  dot: 'bg-amber-400' };
  return { key: 'signed', text: 'Completed', badge: 'badge badge-signed',  dot: 'bg-emerald-400' };
};

// ── Filter Tab component ─────────────────────────────────────────────────────
const FilterTab = ({ label, count, active, onClick, color = 'teal' }) => {
  const colorMap = {
    teal:    'bg-teal-500/15 border-teal-500/40 text-teal-300',
    amber:   'bg-amber-500/15 border-amber-500/40 text-amber-300',
    emerald: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    red:     'bg-red-500/15 border-red-500/40 text-red-300',
    slate:   'bg-slate-700/60 border-slate-600/40 text-slate-300',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200
        ${active ? colorMap[color] : 'bg-surface-800/40 border-teal-500/10 text-slate-500 hover:text-slate-300 hover:border-teal-500/20'}`}
    >
      {label}
      {count !== undefined && (
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
          ${active ? 'bg-white/15' : 'bg-surface-700'}`}>
          {count}
        </span>
      )}
    </button>
  );
};

// ── Audit Log Panel ──────────────────────────────────────────────────────────
const AuditLogPanel = ({ docId, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const actionMeta = {
    uploaded:     { icon: Upload,       color: 'text-teal-400',    label: 'Uploaded' },
    field_placed: { icon: PenTool,      color: 'text-violet-400',  label: 'Field Placed' },
    signed:       { icon: CheckCircle2, color: 'text-emerald-400', label: 'Signed' },
    rejected:     { icon: XCircle,      color: 'text-red-400',     label: 'Rejected' },
    link_sent:    { icon: Mail,         color: 'text-amber-400',   label: 'Invite Sent' },
    link_opened:  { icon: Eye,          color: 'text-sky-400',     label: 'Link Opened' },
    downloaded:   { icon: Download,     color: 'text-slate-400',   label: 'Downloaded' },
  };

  useEffect(() => {
    axios.get(`${API_URL}/audit/${docId}`)
      .then(r => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [docId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-surface-800 border border-teal-500/15 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-500/10 bg-surface-700/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <Shield size={16} className="text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Audit Trail</p>
              <p className="text-[11px] text-slate-500">{logs.length} events recorded</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-surface-600 transition-colors">
            <XCircle size={18} />
          </button>
        </div>

        {/* Logs */}
        <div className="overflow-y-auto max-h-[420px] divide-y divide-teal-500/5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={24} className="text-teal-400 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No audit events found</div>
          ) : logs.map((log) => {
            const meta = actionMeta[log.action] || { icon: Shield, color: 'text-slate-400', label: log.action };
            const Icon = meta.icon;
            return (
              <div key={log._id} className="flex items-start gap-3 px-6 py-3.5 hover:bg-teal-500/3 transition-colors">
                <div className={`mt-0.5 flex-shrink-0 ${meta.color}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200">{meta.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {log.userId?.name || log.signerEmail || 'External signer'} · {log.ipAddress}
                  </p>
                </div>
                <p className="flex-shrink-0 text-[11px] text-slate-600">
                  {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Document Card (mobile) ────────────────────────────────────────────────────
const DocCard = ({ doc, status, onOpenEditor, onDownload, onDownloadSigned, onViewAudit, onInvite, onDelete }) => (
  <div className="bg-surface-800/60 border border-teal-500/10 rounded-2xl p-4 hover:border-teal-500/20 transition-all duration-200">
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
        <FileText size={18} className="text-teal-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 truncate">{doc.originalName}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={status.badge}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.text}
          </span>
          <span className="text-[11px] text-slate-600">
            {new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-teal-500/8">
      <button
        onClick={() => onOpenEditor(doc._id)}
        className="flex items-center gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg transition-all active:scale-95"
      >
        <PenTool size={12} /> Open Editor <ChevronRight size={12} />
      </button>
      <button
        onClick={() => onDownload(doc._id, doc.originalName)}
        title="Download original"
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-700 border border-teal-500/10 text-slate-400 hover:text-teal-400 hover:border-teal-500/25 transition-all"
      >
        <Download size={12} /> Original
      </button>
      {doc.signedFilePath && (
        <button
          onClick={() => onDownloadSigned(doc.signedFilePath)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
        >
          <Download size={12} /> Signed
        </button>
      )}
      <button
        onClick={() => onViewAudit(doc._id)}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-700 border border-teal-500/10 text-slate-400 hover:text-violet-400 hover:border-violet-500/25 transition-all"
      >
        <Shield size={12} /> Audit
      </button>
      <button
        onClick={() => onDelete(doc._id)}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-700 border border-teal-500/10 text-slate-400 hover:text-red-400 hover:border-red-500/25 transition-all"
      >
        <Trash2 size={12} /> Delete
      </button>
    </div>
  </div>
);

// ── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = ({ setCurrentPage, setSelectedDocId }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [docSignatures, setDocSignatures] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [auditDocId, setAuditDocId] = useState(null);
  const [invitingId, setInvitingId] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/docs`);
      setDocuments(response.data);
      const sigsData = {};
      await Promise.all(
        response.data.map(async (doc) => {
          try {
            const r = await axios.get(`${API_URL}/signatures/doc/${doc._id}`);
            sigsData[doc._id] = r.data;
          } catch { sigsData[doc._id] = []; }
        })
      );
      setDocSignatures(sigsData);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = async (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) await uploadFile(e.dataTransfer.files[0]);
  };

  const uploadFile = async (file) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload only PDF documents'); return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true); setError('');
    try {
      await axios.post(`${API_URL}/docs/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'File upload failed');
    } finally { setUploading(false); }
  };

  const downloadDoc = (docId, filename) => {
    axios({ url: `${API_URL}/docs/${docId}/download`, method: 'GET', responseType: 'blob' })
      .then((response) => {
        const href = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = href; link.setAttribute('download', filename);
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(href);
      })
      .catch(() => setError('Could not download file'));
  };

  const downloadSigned = (signedPath) => {
    window.open(`${SERVER_URL}${signedPath}`, '_blank');
  };

  const sendInvite = async (signatureId) => {
    setInvitingId(signatureId);
    try {
      const r = await axios.post(`${API_URL}/signatures/${signatureId}/invite`);
      alert(`✅ Invite sent!\nLink: ${r.data.inviteLink}\nExpires: ${new Date(r.data.expiresAt).toLocaleDateString()}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invite');
    } finally { setInvitingId(null); }
  };

  const openEditor = (docId) => { setSelectedDocId(docId); setCurrentPage('editor'); };

  const deleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/docs/${docId}`);
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete document');
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = { total: documents.length, pending: 0, signed: 0, rejected: 0 };
  documents.forEach(doc => {
    const sigs = docSignatures[doc._id] || [];
    const s = getDocStatus(sigs);
    if (s.key === 'pending')  stats.pending++;
    if (s.key === 'signed')   stats.signed++;
    if (s.key === 'rejected') stats.rejected++;
  });

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredDocs = documents.filter(doc => {
    if (activeFilter === 'all') return true;
    const sigs = docSignatures[doc._id] || [];
    return getDocStatus(sigs).key === activeFilter;
  });

  const firstName = user?.name?.split(' ')[0] || 'there';

  const statCards = [
    { label: 'Total',    value: stats.total,    icon: Files,        color: 'text-teal-400',    bg: 'bg-teal-500/10',    border: 'border-teal-500/15' },
    { label: 'Pending',  value: stats.pending,  icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/15' },
    { label: 'Signed',   value: stats.signed,   icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/15' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-surface-900">
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10 fade-in">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-teal-400 text-xs font-semibold tracking-widest uppercase mb-1 flex items-center gap-2">
              <Sparkles size={13} /> Your Workspace
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Good to see you, <span className="gradient-text">{firstName}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage, prepare and sign your PDF documents</p>
          </div>
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-teal-400 bg-surface-800/60 border border-teal-500/10 hover:border-teal-500/20 px-3.5 py-2 rounded-xl transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300"><XCircle size={15} /></button>
          </div>
        )}

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="stat-card rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <p className={`text-3xl sm:text-4xl font-bold mt-1.5 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`${stat.bg} border ${stat.border} p-2 sm:p-2.5 rounded-xl`}>
                  <stat.icon size={18} className={stat.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Upload + Tips ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          {/* Upload Dropzone */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <CloudUpload size={15} className="text-teal-400" />
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Upload Document</h2>
            </div>
            <label
              htmlFor="file-upload"
              onDragEnter={handleDrag} onDragOver={handleDrag}
              onDragLeave={handleDrag} onDrop={handleDrop}
              className={`relative rounded-2xl h-48 flex flex-col justify-center items-center text-center transition-all duration-300 overflow-hidden cursor-pointer
                ${dragActive
                  ? 'bg-teal-500/8 border-2 border-teal-500/60 shadow-lg shadow-teal-500/10'
                  : 'bg-surface-800/60 border-2 border-dashed border-teal-500/15 hover:border-teal-500/30 hover:bg-teal-500/4'}`}
            >
              <input type="file" id="file-upload" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} disabled={uploading} />
              {/* Corner accents */}
              {['top-3 left-3 border-t-2 border-l-2 rounded-tl-lg', 'top-3 right-3 border-t-2 border-r-2 rounded-tr-lg',
                'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg', 'bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg'].map((c, i) => (
                <div key={i} className={`absolute w-4 h-4 ${c} border-teal-500/30`} />
              ))}
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-lg animate-pulse" />
                    <Loader size={28} className="relative text-teal-400 animate-spin" />
                  </div>
                  <p className="text-slate-300 font-semibold text-sm">Uploading document...</p>
                  <p className="text-slate-600 text-xs">Processing and securing your file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 group select-none">
                  <div className={`relative p-4 rounded-2xl border transition-all duration-300
                    ${dragActive ? 'bg-teal-500/20 border-teal-500/40' : 'bg-surface-700 border-teal-500/10 group-hover:bg-teal-500/10 group-hover:border-teal-500/30'}`}>
                    <Upload size={24} className={`transition-colors duration-300 ${dragActive ? 'text-teal-300' : 'text-slate-500 group-hover:text-teal-400'}`} />
                  </div>
                  <div>
                    <p className={`font-semibold text-sm transition-colors ${dragActive ? 'text-teal-300' : 'text-slate-300 group-hover:text-white'}`}>
                      {dragActive ? 'Release to upload' : 'Click to upload or drag & drop'}
                    </p>
                    <p className="text-slate-600 text-xs mt-1">PDF files only · Up to 15 MB</p>
                  </div>
                </div>
              )}
            </label>
          </div>

          {/* Quick Tips */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-teal-400" />
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Quick Guide</h2>
            </div>
            <div className="rounded-2xl bg-surface-800/60 border border-teal-500/10 p-5 h-48 flex flex-col justify-center">
              <ol className="space-y-3">
                {[
                  'Upload your PDF document',
                  'Open Editor → place signature fields',
                  'Send invite link to signers',
                  'Download signed PDF when done',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/15 border border-teal-500/25 text-teal-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-xs text-slate-400 leading-relaxed">{text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* ── Document Library ─────────────────────────────────────────────── */}
        <div>
          {/* Library Header + Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-teal-400" />
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Document Library</h2>
              {documents.length > 0 && (
                <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:ml-auto flex-wrap">
              <Filter size={12} className="text-slate-600 mr-0.5" />
              <FilterTab label="All"      count={stats.total}    active={activeFilter === 'all'}      onClick={() => setActiveFilter('all')}      color="teal" />
              <FilterTab label="Pending"  count={stats.pending}  active={activeFilter === 'pending'}  onClick={() => setActiveFilter('pending')}  color="amber" />
              <FilterTab label="Signed"   count={stats.signed}   active={activeFilter === 'signed'}   onClick={() => setActiveFilter('signed')}   color="emerald" />
              <FilterTab label="Rejected" count={stats.rejected} active={activeFilter === 'rejected'} onClick={() => setActiveFilter('rejected')} color="red" />
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="rounded-2xl bg-surface-800/60 border border-teal-500/10 p-16 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-teal-500/15 rounded-full blur-lg animate-pulse" />
                <Loader size={28} className="relative text-teal-400 animate-spin" />
              </div>
              <p className="text-slate-500 text-sm">Loading your documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="rounded-2xl bg-surface-800/60 border border-dashed border-teal-500/10 p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/8 border border-teal-500/15 flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">
                {activeFilter === 'all' ? 'No documents yet' : `No ${activeFilter} documents`}
              </h3>
              <p className="text-slate-600 text-xs mt-2 max-w-xs mx-auto">
                {activeFilter === 'all'
                  ? 'Upload your first PDF above to get started.'
                  : `Try switching to a different filter.`}
              </p>
            </div>
          ) : (
            <>
              {/* ── Desktop Table (md+) ── */}
              <div className="hidden md:block rounded-2xl overflow-hidden bg-surface-800/60 border border-teal-500/10">
                <div className="grid grid-cols-[1fr_130px_110px_320px] bg-surface-700/60 border-b border-teal-500/8 px-6 py-3.5">
                  {['File Name', 'Uploaded', 'Status', 'Actions'].map((col, i) => (
                    <span key={col} className={`text-[11px] font-semibold text-slate-500 uppercase tracking-widest ${i === 3 ? 'text-right' : ''}`}>
                      {col}
                    </span>
                  ))}
                </div>
                <div className="divide-y divide-teal-500/5">
                  {filteredDocs.map((doc) => {
                    const sigs = docSignatures[doc._id] || [];
                    const status = getDocStatus(sigs);
                    const pendingSigs = sigs.filter(s => s.status === 'pending');
                    return (
                      <div key={doc._id} className="group grid grid-cols-[1fr_130px_110px_320px] items-center px-6 py-4 hover:bg-teal-500/3 transition-colors">
                        {/* File Name */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                            <FileText size={15} className="text-teal-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate" title={doc.originalName}>{doc.originalName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[11px] text-slate-600 font-mono">PDF</p>
                              {doc.signedFilePath && (
                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                  ✓ Signed copy
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Calendar size={12} className="text-slate-600" />
                          <span>{new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>

                        {/* Status */}
                        <div>
                          <span className={status.badge}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.text}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Invite button — only if there are pending sigs */}
                          {pendingSigs.length > 0 && (
                            <button
                              onClick={() => sendInvite(pendingSigs[0]._id)}
                              disabled={invitingId === pendingSigs[0]._id}
                              title="Send signing invite"
                              className="flex items-center gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg transition-all shadow-md shadow-amber-500/15 hover:shadow-amber-500/25 active:scale-95 disabled:opacity-50"
                            >
                              {invitingId === pendingSigs[0]._id ? <Loader size={12} className="animate-spin" /> : <Mail size={12} />}
                              <span>Invite</span>
                            </button>
                          )}
                          <button
                            onClick={() => setAuditDocId(doc._id)}
                            title="Audit trail"
                            className="p-2 rounded-lg bg-surface-700 border border-teal-500/10 text-slate-400 hover:text-violet-400 hover:border-violet-500/25 hover:bg-violet-500/8 transition-all"
                          >
                            <Shield size={13} />
                          </button>
                          <button
                            onClick={() => openEditor(doc._id)}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded-lg transition-all shadow-md shadow-teal-500/15 hover:shadow-teal-500/25 active:scale-95"
                          >
                            <PenTool size={12} /> Editor <ArrowRight size={12} />
                          </button>
                          <button
                            onClick={() => downloadDoc(doc._id, doc.originalName)}
                            title="Download original"
                            className="p-2 rounded-lg bg-surface-700 border border-teal-500/10 text-slate-400 hover:text-teal-400 hover:border-teal-500/25 hover:bg-teal-500/8 transition-all"
                          >
                            <Download size={13} />
                          </button>
                          {doc.signedFilePath && (
                            <button
                              onClick={() => downloadSigned(doc.signedFilePath)}
                              title="Download signed PDF"
                              className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteDoc(doc._id)}
                            title="Delete document"
                            className="p-2 rounded-lg bg-surface-700 border border-teal-500/10 text-slate-400 hover:text-red-400 hover:border-red-500/25 hover:bg-red-500/8 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Mobile Cards (< md) ── */}
              <div className="md:hidden space-y-3">
                {filteredDocs.map((doc) => {
                  const sigs = docSignatures[doc._id] || [];
                  const status = getDocStatus(sigs);
                  const pendingSigs = sigs.filter(s => s.status === 'pending');
                  return (
                    <DocCard
                      key={doc._id}
                      doc={doc}
                      status={status}
                      onOpenEditor={openEditor}
                      onDownload={downloadDoc}
                      onDownloadSigned={downloadSigned}
                      onViewAudit={setAuditDocId}
                      onInvite={() => pendingSigs.length > 0 && sendInvite(pendingSigs[0]._id)}
                      onDelete={deleteDoc}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Audit Log Modal ──────────────────────────────────────────────── */}
      {auditDocId && <AuditLogPanel docId={auditDocId} onClose={() => setAuditDocId(null)} />}
    </div>
  );
};

export default Dashboard;
