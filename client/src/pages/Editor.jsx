import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ArrowLeft, Save, Plus, ChevronLeft, ChevronRight, PenTool, Type,
  User, Mail, Check, Trash2, X, Download, Loader, Info, ShieldCheck,
  ZoomIn, ZoomOut, FileText, MousePointer2, Maximize2
} from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Editor = ({ docId, setCurrentPage }) => {
  const [documentMeta, setDocumentMeta] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [placeholders, setPlaceholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingField, setSigningField] = useState(null);
  const [signatureType, setSignatureType] = useState('text');
  const [typedSignature, setTypedSignature] = useState('');
  const [activePlaceholderId, setActivePlaceholderId] = useState(null);
  const [error, setError] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const containerRef = useRef(null);
  const pageRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    let currentBlobUrl = null;
    const loadDocData = async () => {
      try {
        setLoading(true);
        const docRes = await axios.get(`${API_URL}/docs/${docId}`);
        setDocumentMeta(docRes.data);
        const fileRes = await axios.get(`${API_URL}/docs/${docId}/download`, { responseType: 'blob' });
        currentBlobUrl = URL.createObjectURL(fileRes.data);
        setPdfBlobUrl(currentBlobUrl);
        const sigsRes = await axios.get(`${API_URL}/signatures/doc/${docId}`);
        const loadedPlaceholders = sigsRes.data.map(sig => ({
          id: sig._id,
          x: sig.coordinates.x,
          y: sig.coordinates.y,
          width: sig.coordinates.width || 150,
          height: sig.coordinates.height || 50,
          page: sig.coordinates.page,
          signerName: sig.signerInfo.name,
          signerEmail: sig.signerInfo.email,
          status: sig.status,
          signatureType: sig.signatureType,
          signatureData: sig.signatureData,
          saved: true
        }));
        setPlaceholders(loadedPlaceholders);
      } catch (err) {
        console.error(err);
        setError('Failed to load document data');
      } finally {
        setLoading(false);
      }
    };
    loadDocData();
    return () => { if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl); };
  }, [docId]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const onDocumentLoadSuccess = ({ numPages }) => { setNumPages(numPages); setPageNumber(1); };

  const addSignatureField = () => {
    const newField = {
      id: 'temp-' + Date.now(), x: 35, y: 40,
      width: 160, height: 54, page: pageNumber,
      signerName: '', signerEmail: '', status: 'pending', saved: false
    };
    setPlaceholders([...placeholders, newField]);
    setActivePlaceholderId(newField.id);
    setSignerName(''); setSignerEmail('');
  };

  const deleteField = (id) => {
    setPlaceholders(placeholders.filter(p => p.id !== id));
    if (activePlaceholderId === id) setActivePlaceholderId(null);
  };

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', item.id);
    const rect = e.target.getBoundingClientRect();
    e.dataTransfer.setData('offsetX', e.clientX - rect.left);
    e.dataTransfer.setData('offsetY', e.clientY - rect.top);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const offsetX = parseFloat(e.dataTransfer.getData('offsetX') || 0);
    const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || 0);
    const pageContainer = pageRef.current;
    if (!pageContainer) return;
    const rect = pageContainer.getBoundingClientRect();
    let xPct = ((e.clientX - rect.left - offsetX) / rect.width) * 100;
    let yPct = ((e.clientY - rect.top - offsetY) / rect.height) * 100;
    xPct = Math.min(Math.max(xPct, 0), 80);
    yPct = Math.min(Math.max(yPct, 0), 90);
    setPlaceholders(placeholders.map(p =>
      p.id === id ? { ...p, x: parseFloat(xPct.toFixed(2)), y: parseFloat(yPct.toFixed(2)) } : p
    ));
  };

  const selectPlaceholder = (p) => {
    setActivePlaceholderId(p.id);
    setSignerName(p.signerName);
    setSignerEmail(p.signerEmail);
  };

  const saveSignerDetails = () => {
    if (!activePlaceholderId) return;
    setPlaceholders(placeholders.map(p =>
      p.id === activePlaceholderId ? { ...p, signerName, signerEmail } : p
    ));
    setActivePlaceholderId(null);
  };

  const saveAllPlaceholders = async () => {
    setSaving(true); setError('');
    try {
      const unsaved = placeholders.filter(p => !p.saved);
      for (const p of unsaved) {
        if (!p.signerName || !p.signerEmail) {
          setError('Fill signer details for all fields first.');
          setSaving(false); return;
        }
        await axios.post(`${API_URL}/signatures`, {
          fileRef: docId,
          coordinates: { x: p.x, y: p.y, page: p.page, width: p.width, height: p.height },
          signerInfo: { name: p.signerName, email: p.signerEmail }
        });
      }
      const sigsRes = await axios.get(`${API_URL}/signatures/doc/${docId}`);
      setPlaceholders(sigsRes.data.map(sig => ({
        id: sig._id, x: sig.coordinates.x, y: sig.coordinates.y,
        width: sig.coordinates.width || 150, height: sig.coordinates.height || 50,
        page: sig.coordinates.page, signerName: sig.signerInfo.name,
        signerEmail: sig.signerInfo.email, status: sig.status,
        signatureType: sig.signatureType, signatureData: sig.signatureData, saved: true
      })));
      showSuccess('Signature fields saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving signature positions');
    } finally { setSaving(false); }
  };

  // Drawing
  const startDrawing = (e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#0d4f47'; ctx.lineWidth = 2.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(clientX - rect.left, clientY - rect.top);
    isDrawing.current = true;
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => { isDrawing.current = false; };
  const clearDrawing = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const applySignature = async () => {
    if (!signingField) return;
    let sigData = '';
    if (signatureType === 'text') {
      if (!typedSignature.trim()) { alert('Please type your signature'); return; }
      sigData = typedSignature;
    } else {
      sigData = canvasRef.current?.toDataURL('image/png') || '';
    }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/signatures/${signingField.id}/sign`, { signatureType, signatureData: sigData });
      setSigningField(null); setTypedSignature('');
      const sigsRes = await axios.get(`${API_URL}/signatures/doc/${docId}`);
      setPlaceholders(sigsRes.data.map(sig => ({
        id: sig._id, x: sig.coordinates.x, y: sig.coordinates.y,
        width: sig.coordinates.width || 150, height: sig.coordinates.height || 50,
        page: sig.coordinates.page, signerName: sig.signerInfo.name,
        signerEmail: sig.signerInfo.email, status: sig.status,
        signatureType: sig.signatureType, signatureData: sig.signatureData, saved: true
      })));
      showSuccess('Document signed successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error signing document');
    } finally { setSaving(false); }
  };

  const downloadSignedPdf = () => {
    axios({ url: `${API_URL}/docs/${docId}/download`, method: 'GET', responseType: 'blob' })
      .then((response) => {
        const href = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = href;
        link.setAttribute('download', `Signed-${documentMeta?.originalName || 'document.pdf'}`);
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(href);
      })
      .catch(() => alert('Could not download signed file'));
  };

  const activePlaceholder = placeholders.find(p => p.id === activePlaceholderId);
  const pagePlaceholders = placeholders.filter(p => p.page === pageNumber);
  const unsavedCount = placeholders.filter(p => !p.saved).length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-surface-900 flex flex-col md:flex-row relative overflow-hidden">
      {/* Global dot grid */}
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

      {/* ── Main Editor Area ── */}
      <div className="relative flex-1 flex flex-col p-4 md:p-5 overflow-y-auto min-w-0">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between mb-5 glass rounded-2xl px-4 py-3 border border-teal-500/10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex-shrink-0 p-2 rounded-xl bg-surface-700 border border-teal-500/10 text-slate-400 hover:text-white hover:border-teal-500/25 hover:bg-teal-500/8 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-widest">Document Editor</p>
              <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-sm" title={documentMeta?.originalName}>
                {documentMeta?.originalName || 'Loading...'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Zoom controls */}
            <div className="hidden sm:flex items-center gap-1 bg-surface-800 border border-teal-500/10 rounded-xl p-1">
              <button onClick={() => setPdfScale(s => Math.max(s - 0.1, 0.5))}
                className="p-1.5 text-slate-500 hover:text-teal-400 transition-colors rounded-lg hover:bg-teal-500/8">
                <ZoomOut size={14} />
              </button>
              <span className="text-xs font-mono text-slate-400 px-1.5 min-w-[44px] text-center">{Math.round(pdfScale * 100)}%</span>
              <button onClick={() => setPdfScale(s => Math.min(s + 0.1, 2.0))}
                className="p-1.5 text-slate-500 hover:text-teal-400 transition-colors rounded-lg hover:bg-teal-500/8">
                <ZoomIn size={14} />
              </button>
            </div>

            <button
              onClick={saveAllPlaceholders}
              disabled={saving || unsavedCount === 0}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all ${
                unsavedCount > 0
                  ? 'btn-primary'
                  : 'bg-surface-700 border border-teal-500/8 text-slate-600 cursor-not-allowed'
              }`}
            >
              <Save size={14} />
              <span>Save Fields</span>
              {unsavedCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unsavedCount}</span>
              )}
            </button>

            <button
              onClick={downloadSignedPdf}
              className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/15"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>

        {/* ── Error / Success Banners ── */}
        {error && (
          <div className="mb-4 flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 rounded-xl p-3.5 text-sm fade-in">
            <X size={14} className="shrink-0 text-red-400" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-300"><X size={14} /></button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 rounded-xl p-3.5 text-sm fade-in">
            <Check size={14} className="shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── PDF Viewer ── */}
        <div
          ref={containerRef}
          className="flex-1 min-h-[500px] flex justify-center items-start rounded-2xl bg-surface-800/40 border border-teal-500/8 p-6 relative overflow-auto"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 mt-32">
              <div className="relative">
                <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-lg animate-pulse" />
                <Loader size={36} className="relative text-teal-400 animate-spin" />
              </div>
              <p className="text-slate-500 text-sm">Opening document stream...</p>
            </div>
          ) : (
            <div ref={pageRef} className="relative select-none shadow-2xl shadow-black/60">
              <Document
                file={pdfBlobUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center justify-center p-16 gap-2">
                    <Loader size={24} className="text-teal-400 animate-spin" />
                    <p className="text-slate-500 text-xs">Parsing pages...</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={pdfScale}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </Document>

              {/* Signature Field Overlays */}
              {pagePlaceholders.map((p) => {
                const isSelected = p.id === activePlaceholderId;
                const isSigned = p.status === 'signed';
                return (
                  <div
                    key={p.id}
                    draggable={!isSigned}
                    onDragStart={(e) => handleDragStart(e, p)}
                    onClick={() => selectPlaceholder(p)}
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.width}px`, height: `${p.height}px` }}
                    className={`absolute rounded-xl flex flex-col justify-center items-center cursor-pointer transition-all duration-150 group p-2 ${
                      isSelected
                        ? 'border-2 border-teal-400 bg-teal-500/15 shadow-lg shadow-teal-500/20'
                        : isSigned
                          ? 'border border-emerald-500/40 bg-emerald-950/25 cursor-default'
                          : 'border border-teal-500/30 bg-surface-900/80 hover:border-teal-400/60 hover:bg-teal-500/8 hover:shadow-md hover:shadow-teal-500/10'
                    }`}
                  >
                    {!isSigned && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteField(p.id); }}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                      >
                        <X size={10} />
                      </button>
                    )}

                    {isSigned ? (
                      <div className="text-center w-full">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide flex items-center justify-center gap-1">
                          <Check size={9} />Signed
                        </span>
                        <p className="text-[8px] text-slate-400 truncate w-full px-1 mt-0.5">{p.signerName}</p>
                      </div>
                    ) : (
                      <div className="text-center w-full">
                        <span className="text-[9px] text-teal-400 font-bold uppercase tracking-widest block">Sig. Field</span>
                        <p className="text-[8px] mt-0.5 truncate px-1">
                          {p.signerName
                            ? <span className="text-slate-200 font-medium">{p.signerName}</span>
                            : <span className="text-slate-600 italic">Unassigned</span>
                          }
                        </p>
                      </div>
                    )}

                    {p.saved && !isSigned && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSigningField(p); }}
                        className="mt-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[8px] px-2.5 py-1 rounded-lg transition-all active:scale-95 shadow-sm"
                      >
                        Sign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Page Navigation ── */}
        {numPages && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="flex items-center gap-2 glass border border-teal-500/10 py-2.5 px-5 rounded-2xl">
              <button
                onClick={() => setPageNumber(Math.max(pageNumber - 1, 1))}
                disabled={pageNumber === 1}
                className="text-slate-500 hover:text-teal-400 disabled:text-slate-800 transition-colors p-0.5"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2 px-2">
                {Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPageNumber(p)}
                    className={`w-6 h-6 rounded-lg text-[11px] font-bold transition-all ${
                      p === pageNumber
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'text-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPageNumber(Math.min(pageNumber + 1, numPages))}
                disabled={pageNumber === numPages}
                className="text-slate-500 hover:text-teal-400 disabled:text-slate-800 transition-colors p-0.5"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Side Panel ── */}
      <div className="relative w-full md:w-72 lg:w-80 flex flex-col border-t md:border-t-0 md:border-l border-teal-500/8 bg-surface-900/80 backdrop-blur-sm">
        {/* Field Controls */}
        <div className="p-5 border-b border-teal-500/8">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Field Controls</p>
          <button
            onClick={addSignatureField}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-700 border border-teal-500/15 text-slate-300 hover:text-white hover:bg-teal-500/10 hover:border-teal-500/30 text-xs font-semibold transition-all active:scale-[0.98] group"
          >
            <div className="w-5 h-5 rounded-md bg-teal-500/15 border border-teal-500/25 flex items-center justify-center group-hover:bg-teal-500/25 transition-colors">
              <Plus size={12} className="text-teal-400" />
            </div>
            Add Signature Field
          </button>

          {/* Field count */}
          {placeholders.length > 0 && (
            <div className="mt-3 flex gap-2">
              <div className="flex-1 bg-surface-800 border border-teal-500/8 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-teal-400">{placeholders.length}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">Total Fields</p>
              </div>
              <div className="flex-1 bg-surface-800 border border-teal-500/8 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-emerald-400">{placeholders.filter(p => p.status === 'signed').length}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">Signed</p>
              </div>
            </div>
          )}
        </div>

        {/* Field Details */}
        <div className="p-5 flex-1 overflow-y-auto">
          {activePlaceholder ? (
            <div className="space-y-4 fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                    <PenTool size={12} className="text-teal-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Configure Field</h4>
                </div>
                {activePlaceholder.status === 'signed' ? (
                  <span className="badge badge-signed">
                    <ShieldCheck size={10} /> Locked
                  </span>
                ) : (
                  <button
                    onClick={() => deleteField(activePlaceholder.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-transparent hover:border-red-900/20 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {activePlaceholder.status === 'signed' ? (
                <div className="rounded-xl bg-surface-800/60 border border-teal-500/8 p-4 space-y-3">
                  <div className="flex items-center gap-2.5 text-xs">
                    <User size={13} className="text-slate-500 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase tracking-widest">Signer</p>
                      <p className="text-slate-200 font-medium">{activePlaceholder.signerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs">
                    <Mail size={13} className="text-slate-500 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase tracking-widest">Email</p>
                      <p className="text-slate-200 font-medium">{activePlaceholder.signerEmail}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/15 p-3 flex items-start gap-2 text-[10px] text-emerald-400">
                    <ShieldCheck size={13} className="flex-shrink-0 mt-0.5" />
                    <span>This field is digitally signed and locked.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Signer Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600">
                        <User size={13} />
                      </div>
                      <input
                        type="text"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        className="w-full glass-input text-xs pl-8 py-2.5"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Signer Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600">
                        <Mail size={13} />
                      </div>
                      <input
                        type="email"
                        value={signerEmail}
                        onChange={(e) => setSignerEmail(e.target.value)}
                        className="w-full glass-input text-xs pl-8 py-2.5"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-teal-500/5 border border-teal-500/10 rounded-xl p-3 text-[10px] text-slate-500">
                    <Info size={12} className="text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>Drag the overlay on the page to reposition it.</span>
                  </div>

                  <button
                    onClick={saveSignerDetails}
                    className="w-full btn-primary py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <Check size={13} />
                    Apply Settings
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/6 border border-teal-500/10 flex items-center justify-center mb-4">
                <MousePointer2 size={24} className="text-slate-700" />
              </div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">No Field Selected</h4>
              <p className="text-[11px] text-slate-700 mt-2 max-w-[180px] leading-relaxed">
                Click a field overlay on the document to edit it, or add a new one above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Signing Modal ── */}
      {signingField && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 fade-in">
          <div className="w-full max-w-lg glass-card rounded-2xl p-7 relative overflow-hidden">
            {/* Modal header accents */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 bg-teal-500/10 blur-xl pointer-events-none" />

            <button
              onClick={() => { setSigningField(null); setTypedSignature(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={16} />
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                  <PenTool size={15} className="text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Apply Signature</h3>
              </div>
              <p className="text-slate-500 text-xs ml-10">
                Signing as <span className="text-slate-300 font-semibold">{signingField.signerName}</span>
                <span className="text-slate-600"> · {signingField.signerEmail}</span>
              </p>
            </div>

            {/* Method Toggle */}
            <div className="flex gap-1 p-1 bg-surface-800/80 border border-teal-500/10 rounded-xl mb-6">
              {[
                { id: 'text', icon: Type, label: 'Type Signature' },
                { id: 'draw', icon: PenTool, label: 'Draw Signature' },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSignatureType(id);
                    if (id === 'draw') setTimeout(() => clearDrawing(), 50);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    signatureType === id
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Signature Area */}
            {signatureType === 'text' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full glass-input text-center text-base"
                  placeholder="Type your signature..."
                />
                {typedSignature.trim() && (
                  <div className="bg-white rounded-xl p-8 flex items-center justify-center border border-teal-500/10">
                    <span style={{ fontFamily: 'Georgia, serif' }} className="text-4xl text-slate-800 italic font-bold tracking-wide select-none">
                      {typedSignature}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-teal-500/15 shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={460}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair bg-white"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">Draw with your mouse or trackpad</span>
                  <button type="button" onClick={clearDrawing} className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors font-medium">
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2.5 mt-7 pt-6 border-t border-teal-500/8">
              <button
                onClick={() => { setSigningField(null); setTypedSignature(''); }}
                className="btn-secondary px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={applySignature}
                disabled={saving}
                className="btn-primary px-6 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{saving ? 'Applying...' : 'Apply & Sign'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
