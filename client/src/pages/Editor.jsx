import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ArrowLeft, Save, Plus, ChevronLeft, ChevronRight, PenTool, Type, 
  User, Mail, Check, Trash2, X, Download, Loader, Info, ShieldAlert
} from 'lucide-react';

// Configure PDFJS Worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Editor = ({ docId, setCurrentPage }) => {
  const [documentMeta, setDocumentMeta] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [placeholders, setPlaceholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingField, setSigningField] = useState(null); // The placeholder currently being signed
  const [signatureType, setSignatureType] = useState('text'); // 'text' or 'draw'
  const [typedSignature, setTypedSignature] = useState('');
  const [activePlaceholderId, setActivePlaceholderId] = useState(null);
  const [error, setError] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // Signer form inputs for active placeholder
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');

  const containerRef = useRef(null);
  const pageRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    let currentBlobUrl = null;

    const loadDocData = async () => {
      try {
        setLoading(true);
        // 1. Fetch document metadata
        const docRes = await axios.get(`${API_URL}/docs/${docId}`);
        setDocumentMeta(docRes.data);

        // 2. Fetch the actual PDF file securely as a blob using Axios (which includes authorization headers)
        const fileRes = await axios.get(`${API_URL}/docs/${docId}/download`, {
          responseType: 'blob',
        });
        currentBlobUrl = URL.createObjectURL(fileRes.data);
        setPdfBlobUrl(currentBlobUrl);

        // 3. Fetch existing placeholders for document
        const sigsRes = await axios.get(`${API_URL}/signatures/doc/${docId}`);
        // Map backend schema to editor state
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

    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [docId]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // Add a new signature placeholder field to current page
  const addSignatureField = () => {
    const newField = {
      id: 'temp-' + Date.now(),
      x: 35, // percent from left
      y: 40, // percent from top
      width: 150,
      height: 50,
      page: pageNumber,
      signerName: '',
      signerEmail: '',
      status: 'pending',
      saved: false
    };
    setPlaceholders([...placeholders, newField]);
    setActivePlaceholderId(newField.id);
    setSignerName('');
    setSignerEmail('');
  };

  // Delete a placeholder
  const deleteField = (id) => {
    setPlaceholders(placeholders.filter(p => p.id !== id));
    if (activePlaceholderId === id) {
      setActivePlaceholderId(null);
    }
  };

  // Update position when placeholder is dragged
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', item.id);
    // Find the offset from clicked point to top-left of placeholder
    const rect = e.target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    e.dataTransfer.setData('offsetX', offsetX);
    e.dataTransfer.setData('offsetY', offsetY);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const offsetX = parseFloat(e.dataTransfer.getData('offsetX') || 0);
    const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || 0);

    const pageContainer = pageRef.current;
    if (!pageContainer) return;

    const rect = pageContainer.getBoundingClientRect();
    
    // Calculate new position
    let newX = e.clientX - rect.left - offsetX;
    let newY = e.clientY - rect.top - offsetY;

    // Convert to percentage
    let xPct = (newX / rect.width) * 100;
    let yPct = (newY / rect.height) * 100;

    // Boundary constraints
    if (xPct < 0) xPct = 0;
    if (xPct > 80) xPct = 80;
    if (yPct < 0) yPct = 0;
    if (yPct > 90) yPct = 90;

    setPlaceholders(placeholders.map(p => {
      if (p.id === id) {
        return { ...p, x: parseFloat(xPct.toFixed(2)), y: parseFloat(yPct.toFixed(2)) };
      }
      return p;
    }));
  };

  // Selection change
  const selectPlaceholder = (p) => {
    setActivePlaceholderId(p.id);
    setSignerName(p.signerName);
    setSignerEmail(p.signerEmail);
  };

  // Save changes to active placeholder
  const saveSignerDetails = () => {
    if (!activePlaceholderId) return;
    setPlaceholders(placeholders.map(p => {
      if (p.id === activePlaceholderId) {
        return { ...p, signerName, signerEmail };
      }
      return p;
    }));
    setActivePlaceholderId(null);
  };

  // Submit all new placeholders to server
  const saveAllPlaceholders = async () => {
    setSaving(true);
    setError('');
    try {
      const unsaved = placeholders.filter(p => !p.saved);
      
      for (const p of unsaved) {
        if (!p.signerName || !p.signerEmail) {
          setError(`Please fill signer details for all signature fields first.`);
          setSaving(false);
          return;
        }

        const payload = {
          fileRef: docId,
          coordinates: {
            x: p.x,
            y: p.y,
            page: p.page,
            width: p.width,
            height: p.height
          },
          signerInfo: {
            name: p.signerName,
            email: p.signerEmail
          }
        };
        await axios.post(`${API_URL}/signatures`, payload);
      }

      // Re-load all placeholders to get official database IDs
      const sigsRes = await axios.get(`${API_URL}/signatures/doc/${docId}`);
      const remapped = sigsRes.data.map(sig => ({
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
      setPlaceholders(remapped);
      alert('All signature fields saved successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error saving signature positions');
    } finally {
      setSaving(false);
    }
  };

  // Drawing Canvas Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Support touch and mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.strokeStyle = '#0f2963'; // Rich signature blue ink
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Send the actual signature details to the backend to burn on PDF
  const applySignature = async () => {
    if (!signingField) return;
    
    let sigData = '';
    
    if (signatureType === 'text') {
      if (!typedSignature.trim()) {
        alert('Please type your signature');
        return;
      }
      sigData = typedSignature;
    } else {
      // Draw signature type
      const canvas = canvasRef.current;
      if (!canvas) return;
      sigData = canvas.toDataURL('image/png');
    }

    setSaving(true);
    try {
      await axios.post(`${API_URL}/signatures/${signingField.id}/sign`, {
        signatureType,
        signatureData: sigData
      });

      // Close modal and reload
      setSigningField(null);
      setTypedSignature('');
      
      // Reload placeholders
      const sigsRes = await axios.get(`${API_URL}/signatures/doc/${docId}`);
      const remapped = sigsRes.data.map(sig => ({
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
      setPlaceholders(remapped);
      alert('Document signed successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error signing document');
    } finally {
      setSaving(false);
    }
  };

  const downloadSignedPdf = () => {
    axios({
      url: `${API_URL}/docs/${docId}/download`,
      method: 'GET',
      responseType: 'blob',
    }).then((response) => {
      const href = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = href;
      link.setAttribute('download', `Signed-${documentMeta?.originalName || 'document.pdf'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    }).catch(err => {
      console.error('Download failed', err);
      alert('Could not download signed file');
    });
  };

  // Helpers
  const activePlaceholder = placeholders.find(p => p.id === activePlaceholderId);
  const pagePlaceholders = placeholders.filter(p => p.page === pageNumber);

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex flex-col md:flex-row relative">
      {/* Editor Main Workspace */}
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between mb-6 glass p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="text-slate-400 hover:text-white bg-slate-900/60 p-2 rounded-lg border border-white/5"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Document Workspace</h2>
              <h1 className="text-base font-extrabold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {documentMeta?.originalName || 'Loading document...'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveAllPlaceholders}
              disabled={saving || placeholders.filter(p => !p.saved).length === 0}
              className="bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Save size={14} />
              <span>Save Fields</span>
            </button>

            <button
              onClick={downloadSignedPdf}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* PDF Viewer Scroll Area */}
        <div 
          ref={containerRef}
          className="flex-1 min-h-[400px] flex justify-center items-start bg-slate-900/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 mt-24">
              <Loader size={36} className="text-brand-400 animate-spin" />
              <p className="text-slate-400 text-sm">Opening document stream...</p>
            </div>
          ) : (
            <div 
              ref={pageRef}
              className="relative select-none"
            >
              <Document
                file={pdfBlobUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center justify-center p-12 gap-2">
                    <Loader size={24} className="text-brand-400 animate-spin" />
                    <p className="text-slate-400 text-xs">Parsing pages...</p>
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

              {/* Rendering Placed Fields on Current Page */}
              {pagePlaceholders.map((p) => {
                const isSelected = p.id === activePlaceholderId;
                const isSigned = p.status === 'signed';
                
                return (
                  <div
                    key={p.id}
                    draggable={!isSigned}
                    onDragStart={(e) => handleDragStart(e, p)}
                    onClick={() => selectPlaceholder(p)}
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: `${p.width}px`,
                      height: `${p.height}px`,
                    }}
                    className={`absolute rounded border flex flex-col justify-center items-center cursor-pointer transition-all duration-150 group p-1.5 ${
                      isSelected 
                        ? 'border-brand-500 bg-brand-500/20 shadow-md shadow-brand-500/10' 
                        : isSigned
                          ? 'border-emerald-600/40 bg-emerald-950/20 cursor-default'
                          : 'border-slate-600 bg-slate-900/80 hover:border-brand-500/50 hover:bg-slate-900'
                    }`}
                  >
                    {!isSigned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(p.id);
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X size={10} />
                      </button>
                    )}

                    {isSigned ? (
                      <div className="text-center w-full">
                        <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wide flex items-center justify-center gap-1">
                          <Check size={10} />
                          <span>Signed</span>
                        </span>
                        <p className="text-[8px] text-slate-400 truncate w-full">{p.signerName}</p>
                      </div>
                    ) : (
                      <div className="text-center w-full">
                        <span className="text-[9px] text-brand-400 font-bold uppercase tracking-wider block">Signature Field</span>
                        {p.signerName ? (
                          <p className="text-[9px] text-slate-200 font-medium truncate mt-0.5" title={p.signerName}>
                            {p.signerName}
                          </p>
                        ) : (
                          <p className="text-[8px] text-slate-500 italic mt-0.5">Unassigned</p>
                        )}
                      </div>
                    )}
                    
                    {/* Action button inside field: Click to Sign */}
                    {p.saved && !isSigned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSigningField(p);
                        }}
                        className="mt-1 bg-brand-600 hover:bg-brand-500 text-white font-bold text-[8px] px-2 py-0.5 rounded transition-all active:scale-95"
                      >
                        Sign Field
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Pagination controls */}
        {numPages && (
          <div className="flex items-center justify-center gap-4 mt-4 glass py-3 px-6 rounded-xl w-fit mx-auto">
            <button
              onClick={() => setPageNumber(Math.max(pageNumber - 1, 1))}
              disabled={pageNumber === 1}
              className="text-slate-400 hover:text-white disabled:text-slate-700 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => setPageNumber(Math.min(pageNumber + 1, numPages))}
              disabled={pageNumber === numPages}
              className="text-slate-400 hover:text-white disabled:text-slate-700 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Editor Side Panel (Control Center) */}
      <div className="w-full md:w-80 glass border-l border-white/5 flex flex-col">
        {/* Editor Info Panel */}
        <div className="p-6 border-b border-white/5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Field Controls</h3>
          <button
            onClick={addSignatureField}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-brand-500/40 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus size={15} className="text-brand-400" />
            <span>Add Signature Field</span>
          </button>
        </div>

        {/* Selected Field Customizer */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activePlaceholder ? (
            <div className="space-y-5 fade-in">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <PenTool size={14} className="text-brand-400" />
                  <span>Configure Field</span>
                </h4>
                {activePlaceholder.status === 'signed' ? (
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                    Locked
                  </span>
                ) : (
                  <button
                    onClick={() => deleteField(activePlaceholder.id)}
                    className="text-red-400 hover:text-red-300 p-1 bg-red-950/10 hover:bg-red-950/20 border border-red-900/10 hover:border-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {activePlaceholder.status === 'signed' ? (
                <div className="space-y-4 bg-slate-900/50 p-4 border border-white/5 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <User size={13} className="text-slate-400" />
                    <span><strong>Signer:</strong> {activePlaceholder.signerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail size={13} className="text-slate-400" />
                    <span><strong>Email:</strong> {activePlaceholder.signerEmail}</span>
                  </div>
                  <div className="bg-emerald-950/10 border border-emerald-900/20 p-2.5 rounded-lg text-emerald-300 text-[10px] flex items-start gap-1.5 mt-2">
                    <ShieldAlert size={14} className="shrink-0 text-emerald-400" />
                    <span>This field has been signed digitally. Coordinates and details are locked.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Signer Name</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="w-full glass-input text-xs"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Signer Email</label>
                    <input
                      type="email"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      className="w-full glass-input text-xs"
                      placeholder="e.g. john@example.com"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900/40 p-3 rounded-lg border border-white/5 text-[10px] text-slate-500">
                    <Info size={14} className="shrink-0 text-brand-400" />
                    <span>Drag overlay to move it, or fill out details and save positions below.</span>
                  </div>

                  <button
                    onClick={saveSignerDetails}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors mt-2"
                  >
                    Apply Settings
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center text-slate-500 border border-dashed border-white/5 rounded-2xl p-6">
              <PenTool size={28} className="mb-3 text-slate-600" />
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Field Selected</h4>
              <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">
                Click an existing field overlay on the page to customize, or add a field using the button above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Signature Capture Modal */}
      {signingField && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg glass-card rounded-2xl p-6 relative overflow-hidden">
            <button
              onClick={() => {
                setSigningField(null);
                setTypedSignature('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white tracking-tight mb-1">Apply Digital Signature</h3>
            <p className="text-slate-400 text-xs mb-5">
              Signing field for <strong className="text-slate-200">{signingField.signerName}</strong> ({signingField.signerEmail})
            </p>

            {/* Signature Method Toggle */}
            <div className="flex gap-2 p-1 bg-slate-900 border border-white/5 rounded-lg mb-5">
              <button
                type="button"
                onClick={() => setSignatureType('text')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                  signatureType === 'text' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Type size={14} />
                <span>Type Signature</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignatureType('draw');
                  // Quick timeout to let DOM render canvas before initialization
                  setTimeout(() => clearDrawing(), 50);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                  signatureType === 'draw' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PenTool size={14} />
                <span>Draw Signature</span>
              </button>
            </div>

            {/* Signature Interface */}
            {signatureType === 'text' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full glass-input text-lg font-medium text-center"
                  placeholder="Type your signature here..."
                />
                {typedSignature.trim() && (
                  <div className="bg-slate-900/60 border border-white/5 rounded-xl p-8 flex items-center justify-center">
                    {/* Simulated script rendering preview */}
                    <span 
                      style={{ fontFamily: 'Georgia, serif' }} 
                      className="text-4xl text-brand-400 italic font-bold tracking-wide select-none"
                    >
                      {typedSignature}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950">
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
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Sign with your mouse or trackpad inside the canvas</span>
                  <button
                    type="button"
                    onClick={clearDrawing}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold hover:underline"
                  >
                    Clear Drawing
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setSigningField(null);
                  setTypedSignature('');
                }}
                className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-white/5 hover:border-white/10 px-4.5 py-2.5 rounded-lg text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={applySignature}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
              >
                <Check size={14} />
                <span>Apply & Sign</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
