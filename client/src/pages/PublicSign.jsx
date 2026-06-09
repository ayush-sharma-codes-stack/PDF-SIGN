import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  PenTool, CheckCircle2, XCircle, Loader, AlertCircle,
  FileText, User, Clock, Pencil, Type, RotateCcw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Signature Canvas ──────────────────────────────────────────────────────────
const SignatureCanvas = ({ canvasRef, onClear, onDraw }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    setIsDrawing(true);
    lastPos.current = pos;
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    if (onDraw) onDraw();
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-teal-500/30 bg-white">
        <canvas
          ref={canvasRef}
          width={480}
          height={140}
          className="w-full touch-none cursor-crosshair block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={(e) => { endDraw(); if (onDraw) onDraw(); }}
        />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400 pointer-events-none select-none">
          Draw your signature here
        </div>
      </div>
      <button
        type="button"
        onClick={clearCanvas}
        className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <RotateCcw size={12} /> Clear
      </button>
    </div>
  );
};

// ── Main PublicSign Page ──────────────────────────────────────────────────────
const PublicSign = ({ token }) => {
  const [step, setStep] = useState('loading'); // loading | form | success | error
  const [sigContext, setSigContext] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sigMode, setSigMode] = useState('draw'); // 'draw' | 'text'
  const [typedName, setTypedName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef(null);

  // Load token context
  useEffect(() => {
    if (!token) { setErrorMsg('No signing token provided.'); setStep('error'); return; }

    axios.get(`${API_URL}/signatures/public/${token}`)
      .then(r => { setSigContext(r.data); setStep('form'); })
      .catch(err => {
        setErrorMsg(err.response?.data?.message || 'Invalid or expired link.');
        setStep('error');
      });
  }, [token]);

  const getSignaturePayload = () => {
    if (sigMode === 'text') {
      if (!typedName.trim()) return null;
      return { signatureType: 'text', signatureData: typedName.trim() };
    } else {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return null;
      return { signatureType: 'draw', signatureData: canvas.toDataURL('image/png') };
    }
  };

  const handleSubmit = async () => {
    const payload = getSignaturePayload();
    if (!payload) {
      setErrorMsg(sigMode === 'text' ? 'Please type your name.' : 'Please draw your signature first.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/signatures/${sigContext.signatureId}/sign`, payload);
      setStep('success');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit signature. Please try again.');
    } finally { setSubmitting(false); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (step === 'loading') return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl animate-pulse" />
          <Loader size={32} className="relative text-teal-400 animate-spin" />
        </div>
        <p className="text-slate-400 text-sm">Validating signing link…</p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (step === 'error') return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <XCircle size={28} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Link Unavailable</h1>
        <p className="text-slate-400 text-sm">{errorMsg}</p>
        <p className="text-slate-600 text-xs mt-4">This link may have expired or already been used. Please contact the sender for a new link.</p>
      </div>
    </div>
  );

  // ── Success ──────────────────────────────────────────────────────────────
  if (step === 'success') return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center fade-in">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Document Signed!</h1>
        <p className="text-slate-400 text-sm">
          Your signature has been recorded for <strong className="text-slate-200">{sigContext?.document?.originalName}</strong>.
        </p>
        <p className="text-slate-600 text-xs mt-4">You may now close this window. A copy will be available to the document owner.</p>
      </div>
    </div>
  );

  // ── Signing Form ─────────────────────────────────────────────────────────
  const expiry = sigContext?.expiresAt ? new Date(sigContext.expiresAt) : null;

  return (
    <div className="min-h-screen bg-surface-900 py-10 px-4">
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
      <div className="relative max-w-lg mx-auto fade-in">

        {/* Brand header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30">
            <PenTool size={18} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-wide">
            PDF<span className="text-teal-400">Sign</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-surface-800/80 border border-teal-500/15 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">

          {/* Header stripe */}
          <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/5 border-b border-teal-500/10 px-6 py-5">
            <p className="text-[11px] font-semibold text-teal-400 uppercase tracking-widest mb-1">Signature Request</p>
            <h1 className="text-lg font-bold text-white leading-tight">
              {sigContext?.document?.originalName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <User size={12} className="text-slate-500" />
                {sigContext?.signerInfo?.name}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <FileText size={12} className="text-slate-500" />
                Page {sigContext?.coordinates?.page}
              </span>
              {expiry && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock size={12} /> Expires {expiry.toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">

            {/* Mode toggle */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Signature Type</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSigMode('draw')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all
                    ${sigMode === 'draw'
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                      : 'bg-surface-700/40 border-teal-500/10 text-slate-500 hover:text-slate-300 hover:border-teal-500/20'}`}
                >
                  <Pencil size={13} /> Draw
                </button>
                <button
                  onClick={() => setSigMode('text')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all
                    ${sigMode === 'text'
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                      : 'bg-surface-700/40 border-teal-500/10 text-slate-500 hover:text-slate-300 hover:border-teal-500/20'}`}
                >
                  <Type size={13} /> Type Name
                </button>
              </div>
            </div>

            {/* Signature input */}
            {sigMode === 'draw' ? (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Draw Signature</p>
                <SignatureCanvas
                  canvasRef={canvasRef}
                  onClear={() => setHasDrawn(false)}
                  onDraw={() => setHasDrawn(true)}
                />
                <p className="text-[11px] text-slate-600 mt-2">
                  Click and drag inside the box above to draw your signature
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Type Your Name</p>
                <input
                  type="text"
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  placeholder={sigContext?.signerInfo?.name || 'Your full name'}
                  className="w-full glass-input text-lg font-bold italic"
                  style={{ fontFamily: 'Georgia, serif', color: '#1d4ed8' }}
                />
                <p className="text-[11px] text-slate-600 mt-2">This will appear as a typed signature on the document</p>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/20 text-red-300 rounded-xl p-3 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm mt-2"
            >
              {submitting ? (
                <><Loader size={16} className="animate-spin" /> Submitting…</>
              ) : (
                <><CheckCircle2 size={16} /> Confirm & Sign Document</>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-5">
          By signing, you agree that this constitutes a valid electronic signature.
        </p>
      </div>
    </div>
  );
};

export default PublicSign;
