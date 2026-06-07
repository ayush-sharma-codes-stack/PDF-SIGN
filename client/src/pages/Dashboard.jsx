import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Upload, FileText, Calendar, PenTool, CheckCircle2, Download,
  ArrowRight, Loader, Trash2, TrendingUp, Clock, Files, CloudUpload,
  AlertCircle, Sparkles
} from 'lucide-react';

const Dashboard = ({ setCurrentPage, setSelectedDocId }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [docSignatures, setDocSignatures] = useState({});

  const API_URL = 'http://localhost:5000/api';

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/docs`);
      setDocuments(response.data);
      const sigsData = {};
      for (const doc of response.data) {
        try {
          const sigsResponse = await axios.get(`${API_URL}/signatures/doc/${doc._id}`);
          sigsData[doc._id] = sigsResponse.data;
        } catch (e) { console.error('Error fetching signatures for doc', doc._id, e); }
      }
      setDocSignatures(sigsData);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) await uploadFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = async (e) => {
    if (e.target.files?.[0]) await uploadFile(e.target.files[0]);
  };

  const uploadFile = async (file) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Please upload only PDF documents');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/docs/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getDocStatus = (docId) => {
    const sigs = docSignatures[docId] || [];
    if (sigs.length === 0) return { text: 'No Fields', badge: 'badge badge-empty', dot: 'bg-slate-600' };
    const pendingCount = sigs.filter(s => s.status === 'pending').length;
    if (pendingCount > 0) return { text: `${pendingCount} Pending`, badge: 'badge badge-pending', dot: 'bg-amber-400' };
    return { text: 'Completed', badge: 'badge badge-signed', dot: 'bg-emerald-400' };
  };

  const downloadDoc = (docId, filename) => {
    axios({ url: `${API_URL}/docs/${docId}/download`, method: 'GET', responseType: 'blob' })
      .then((response) => {
        const href = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = href;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
      })
      .catch(() => alert('Could not download file'));
  };

  const openEditor = (docId) => {
    setSelectedDocId(docId);
    setCurrentPage('editor');
  };

  // Stats
  const totalDocs = documents.length;
  let signedDocs = 0, pendingDocs = 0;
  Object.keys(docSignatures).forEach(docId => {
    const sigs = docSignatures[docId];
    if (sigs.length > 0) {
      if (sigs.some(s => s.status === 'pending')) pendingDocs++;
      else signedDocs++;
    }
  });

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-surface-900">
      {/* ── Page Background ── */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-10 fade-in">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-1 flex items-center gap-2">
              <Sparkles size={14} />
              Your Workspace
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Good to see you, <span className="gradient-text">{firstName}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1.5">Manage, prepare and sign your PDF documents</p>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: 'Total Documents',
              value: totalDocs,
              icon: Files,
              color: 'text-teal-400',
              bg: 'bg-teal-500/10',
              border: 'border-teal-500/15',
              glow: 'shadow-teal-500/10',
            },
            {
              label: 'Awaiting Signature',
              value: pendingDocs,
              icon: Clock,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
              border: 'border-amber-500/15',
              glow: 'shadow-amber-500/10',
            },
            {
              label: 'Completed',
              value: signedDocs,
              icon: CheckCircle2,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              border: 'border-emerald-500/15',
              glow: 'shadow-emerald-500/10',
            },
          ].map((stat) => (
            <div key={stat.label} className={`stat-card rounded-2xl p-5 shadow-lg ${stat.glow}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <p className={`text-4xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`${stat.bg} border ${stat.border} p-2.5 rounded-xl`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Upload Dropzone */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <CloudUpload size={16} className="text-teal-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Upload Document</h2>
            </div>
            <label
              htmlFor="file-upload"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-2xl h-52 flex flex-col justify-center items-center text-center transition-all duration-300 overflow-hidden cursor-pointer
                ${dragActive
                  ? 'bg-teal-500/8 border-2 border-teal-500/60 shadow-lg shadow-teal-500/10'
                  : 'bg-surface-800/60 border-2 border-dashed border-teal-500/15 hover:border-teal-500/30 hover:bg-teal-500/4'
                }`}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {/* Corner accents */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-teal-500/30 rounded-tl-lg" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-teal-500/30 rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-teal-500/30 rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-teal-500/30 rounded-br-lg" />

              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-lg animate-pulse" />
                    <Loader size={32} className="relative text-teal-400 animate-spin" />
                  </div>
                  <p className="text-slate-300 font-semibold text-sm">Uploading document...</p>
                  <p className="text-slate-600 text-xs">Processing and securing your file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 group select-none">
                  <div className={`relative p-4 rounded-2xl border transition-all duration-300 ${dragActive ? 'bg-teal-500/20 border-teal-500/40' : 'bg-surface-700 border-teal-500/10 group-hover:bg-teal-500/10 group-hover:border-teal-500/30'}`}>
                    <Upload size={28} className={`transition-colors duration-300 ${dragActive ? 'text-teal-300' : 'text-slate-500 group-hover:text-teal-400'}`} />
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

          {/* Quick Tips Panel */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-teal-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Quick Guide</h2>
            </div>
            <div className="rounded-2xl bg-surface-800/60 border border-teal-500/10 p-5 h-52 flex flex-col justify-center">
              <ol className="space-y-3.5">
                {[
                  { step: '1', text: 'Upload your PDF document above' },
                  { step: '2', text: 'Open the Editor to place signature fields' },
                  { step: '3', text: 'Assign signers and save the fields' },
                  { step: '4', text: 'Click "Sign Field" and download signed PDF' },
                ].map((item) => (
                  <li key={item.step} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/15 border border-teal-500/25 text-teal-400 text-[10px] font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                    <span className="text-xs text-slate-400 leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* ── Document Library ── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <FileText size={16} className="text-teal-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Document Library</h2>
            {documents.length > 0 && (
              <span className="text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                {documents.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="rounded-2xl bg-surface-800/60 border border-teal-500/10 p-20 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-teal-500/15 rounded-full blur-lg animate-pulse" />
                <Loader size={32} className="relative text-teal-400 animate-spin" />
              </div>
              <p className="text-slate-500 text-sm">Loading your documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-2xl bg-surface-800/60 border border-dashed border-teal-500/10 p-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/8 border border-teal-500/15 flex items-center justify-center mx-auto mb-5">
                <FileText size={28} className="text-slate-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-300">No documents yet</h3>
              <p className="text-slate-600 text-sm mt-2 max-w-xs mx-auto">Upload your first PDF above to get started with document signing.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden bg-surface-800/60 border border-teal-500/10">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_160px_140px_180px] bg-surface-700/60 border-b border-teal-500/8 px-6 py-3.5">
                {['File Name', 'Uploaded', 'Status', 'Actions'].map((col, i) => (
                  <span key={col} className={`text-[11px] font-semibold text-slate-500 uppercase tracking-widest ${i === 3 ? 'text-right' : ''}`}>
                    {col}
                  </span>
                ))}
              </div>

              {/* Table Body */}
              <div className="divide-y divide-teal-500/5">
                {documents.map((doc) => {
                  const status = getDocStatus(doc._id);
                  return (
                    <div key={doc._id} className="grid grid-cols-[1fr_160px_140px_180px] items-center px-6 py-4 hover:bg-teal-500/3 transition-colors group">
                      {/* File Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                          <FileText size={16} className="text-teal-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate" title={doc.originalName}>
                            {doc.originalName}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5 font-mono">PDF Document</p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Calendar size={13} className="text-slate-600" />
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditor(doc._id)}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 rounded-lg transition-all shadow-md shadow-teal-500/15 hover:shadow-teal-500/25 active:scale-95"
                        >
                          <PenTool size={12} />
                          <span>Open Editor</span>
                          <ArrowRight size={12} />
                        </button>
                        <button
                          onClick={() => downloadDoc(doc._id, doc.originalName)}
                          title="Download PDF"
                          className="p-2 rounded-lg bg-surface-700 border border-teal-500/10 text-slate-400 hover:text-teal-400 hover:border-teal-500/25 hover:bg-teal-500/8 transition-all"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
