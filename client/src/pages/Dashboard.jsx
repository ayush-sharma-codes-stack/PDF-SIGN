import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Calendar, PenTool, CheckCircle, Download, ExternalLink, Loader, ArrowRight, Trash2 } from 'lucide-react';

const Dashboard = ({ setCurrentPage, setSelectedDocId }) => {
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
      
      // Fetch signature status for each document
      const sigsData = {};
      for (const doc of response.data) {
        try {
          const sigsResponse = await axios.get(`${API_URL}/signatures/doc/${doc._id}`);
          sigsData[doc._id] = sigsResponse.data;
        } catch (e) {
          console.error('Error fetching signatures for doc', doc._id, e);
        }
      }
      setDocSignatures(sigsData);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload only PDF documents');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/docs/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'File upload failed');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const getDocStatus = (docId) => {
    const sigs = docSignatures[docId] || [];
    if (sigs.length === 0) return { text: 'No Fields', color: 'text-slate-400 bg-slate-900 border-slate-800' };
    const pendingCount = sigs.filter(s => s.status === 'pending').length;
    if (pendingCount > 0) {
      return { 
        text: `${pendingCount} Pending`, 
        color: 'text-amber-400 bg-amber-950/20 border-amber-900/30' 
      };
    }
    return { text: 'Signed / Completed', color: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30' };
  };

  const downloadDoc = (docId, filename) => {
    axios({
      url: `${API_URL}/docs/${docId}/download`,
      method: 'GET',
      responseType: 'blob',
    }).then((response) => {
      const href = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = href;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    }).catch(err => {
      console.error('Download failed', err);
      alert('Could not download file');
    });
  };

  const openEditor = (docId) => {
    setSelectedDocId(docId);
    setCurrentPage('editor');
  };

  // Stats calculation
  const totalDocs = documents.length;
  let signedDocs = 0;
  let pendingDocs = 0;
  
  Object.keys(docSignatures).forEach(docId => {
    const sigs = docSignatures[docId];
    if (sigs.length > 0) {
      const pending = sigs.some(s => s.status === 'pending');
      if (pending) pendingDocs++;
      else signedDocs++;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Workspace</h1>
          <p className="text-slate-400 text-sm">Upload, prepare and sign PDF documents digitally</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-950/30 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm flex items-center gap-3">
          <CheckCircle className="text-red-400 shrink-0 transform rotate-180" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout: Dropzone Left, Stats Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Dropzone Panel */}
        <div className="lg:col-span-2">
          <form 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`glass-card rounded-2xl p-8 text-center border-2 border-dashed transition-all relative overflow-hidden h-[240px] flex flex-col justify-center items-center ${
              dragActive ? 'border-brand-500 bg-brand-500/5' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".pdf"
              onChange={handleFileChange}
            />
            
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader size={36} className="text-brand-400 animate-spin" />
                <p className="text-slate-300 font-semibold">Uploading PDF document...</p>
                <p className="text-slate-500 text-xs">Securing and building preview coordinates</p>
              </div>
            ) : (
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4 group">
                <div className="bg-slate-900 group-hover:bg-brand-500/10 p-4 rounded-xl border border-white/5 group-hover:border-brand-500/20 text-slate-400 group-hover:text-brand-400 transition-all shadow-md">
                  <Upload size={28} />
                </div>
                <div>
                  <p className="text-slate-200 font-semibold text-base group-hover:text-brand-400 transition-colors">
                    Click to upload or drag & drop a PDF
                  </p>
                  <p className="text-slate-500 text-xs mt-1">PDF file formats up to 10MB</p>
                </div>
              </label>
            )}
          </form>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
          <div className="glass-card rounded-xl p-5 flex items-center justify-between border-l-4 border-l-brand-500">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Documents</p>
              <h3 className="text-3xl font-extrabold text-white mt-1.5">{totalDocs}</h3>
            </div>
            <div className="bg-slate-900 border border-white/5 p-3 rounded-lg text-slate-400">
              <FileText size={20} />
            </div>
          </div>
          <div className="glass-card rounded-xl p-5 flex items-center justify-between border-l-4 border-l-amber-500">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Signature</p>
              <h3 className="text-3xl font-extrabold text-white mt-1.5">{pendingDocs}</h3>
            </div>
            <div className="bg-slate-900 border border-white/5 p-3 rounded-lg text-amber-500/80">
              <PenTool size={20} />
            </div>
          </div>
          <div className="glass-card rounded-xl p-5 flex items-center justify-between border-l-4 border-l-emerald-500">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed / Signed</p>
              <h3 className="text-3xl font-extrabold text-white mt-1.5">{signedDocs}</h3>
            </div>
            <div className="bg-slate-900 border border-white/5 p-3 rounded-lg text-emerald-500/80">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Document Library Section */}
      <h2 className="text-xl font-bold text-white tracking-tight mb-4 flex items-center gap-2">
        <FileText size={18} className="text-slate-400" />
        <span>Document Library</span>
      </h2>

      {loading ? (
        <div className="glass-card rounded-2xl p-16 flex flex-col justify-center items-center text-center">
          <Loader size={36} className="text-brand-400 animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Fetching document library...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center border border-dashed border-white/5">
          <div className="bg-slate-900/50 p-4 rounded-full w-fit mx-auto border border-white/5 text-slate-500 mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-300">No documents found</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6">Get started by uploading your first PDF document above</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">File Name</th>
                  <th className="py-4 px-6">Uploaded</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.map((doc) => {
                  const status = getDocStatus(doc._id);
                  const isSigned = status.text.includes('Signed');
                  return (
                    <tr key={doc._id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 font-medium text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="bg-brand-500/10 text-brand-400 p-2 rounded-lg border border-brand-500/20">
                            <FileText size={16} />
                          </div>
                          <span className="truncate max-w-xs md:max-w-md" title={doc.originalName}>
                            {doc.originalName}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-500" />
                          <span>{new Date(doc.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => openEditor(doc._id)}
                            className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition-all shadow shadow-brand-500/10"
                          >
                            <span>Open Editor</span>
                            <ArrowRight size={13} />
                          </button>
                          
                          <button
                            onClick={() => downloadDoc(doc._id, doc.originalName)}
                            title="Download PDF"
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/5 hover:border-white/10 p-2 rounded-lg transition-colors"
                          >
                            <Download size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
