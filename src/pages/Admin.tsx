import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { initialProducts } from '../data/products';
import { effectivePrice, formatPrice } from '../utils/pricing';
import {
  Database,
  Package,
  ShoppingCart,
  RefreshCw,
  Save,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  FileCode,
  Search,
  Eye,
  Check,
  Code2,
  KeyRound,
  ShieldCheck,
  EyeOff,
  Smartphone,
  ArrowRight,
  LogOut
} from 'lucide-react';

const STORAGE_KEY = 'gemtide-admin-products';
const AUTH_SESSION_KEY = 'gemtide_admin_authenticated';

const loadProducts = (): Product[] => {
  if (typeof window === 'undefined') return initialProducts;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialProducts;
    const parsed = JSON.parse(stored) as Product[];
    if (!Array.isArray(parsed)) return initialProducts;
    return parsed;
  } catch {
    return initialProducts;
  }
};

const AdminPage: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
  });

  const [authStep, setAuthStep] = useState<'key' | 'otp'>('key');
  const [securityKey, setSecurityKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifyingKey, setIsVerifyingKey] = useState<boolean>(false);

  // OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpCountdown, setOtpCountdown] = useState<number>(30);
  const otpInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Application Tabs & Data State
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'database'>('inventory');
  const [dbSubTab, setDbSubTab] = useState<'editor' | 'inspect' | 'import-export'>('editor');
  
  const [products, setProducts] = useState<Product[]>(() => loadProducts());
  const [orders, setOrders] = useState<any[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>('All');

  // Database raw state & inspector state
  const [rawDbJson, setRawDbJson] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dbSearch, setDbSearch] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // OTP Countdown timer effect
  useEffect(() => {
    let timer: any;
    if (authStep === 'otp' && otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [authStep, otpCountdown]);

  const fetchFullDb = () => {
    fetch('/api/db')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch DB');
        return res.json();
      })
      .then(data => {
        setRawDbJson(JSON.stringify(data, null, 2));
        setJsonError(null);
        if (Array.isArray(data.products)) setProducts(data.products);
        if (Array.isArray(data.orders)) setOrders(data.orders);
        setLastSynced(new Date().toLocaleTimeString());
      })
      .catch(err => {
        console.error('Failed to load database:', err);
        const fallback = { products, orders };
        setRawDbJson(JSON.stringify(fallback, null, 2));
      });
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFullDb();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  }, [products]);

  // Auth Functions
  const handleVerifySecurityKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityKey.trim()) {
      setAuthError('Please enter the Admin Security Key.');
      return;
    }

    setIsVerifyingKey(true);
    setAuthError(null);

    fetch('/api/admin/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: securityKey.trim() })
    })
      .then(res => res.json())
      .then(data => {
        setIsVerifyingKey(false);
        if (data.success) {
          setGeneratedOtp(data.otp);
          setAuthStep('otp');
          setOtpCountdown(30);
          setOtpDigits(['', '', '', '', '', '']);
          setTimeout(() => otpInputRefs[0].current?.focus(), 100);
        } else {
          setAuthError(data.error || 'Invalid Security Key. Please try again.');
        }
      })
      .catch(() => {
        setIsVerifyingKey(false);
        // Fallback offline key check (Default: GEMTIDE2026)
        if (securityKey.trim() === 'GEMTIDE2026' || securityKey.trim() === 'admin123') {
          const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(fallbackOtp);
          setAuthStep('otp');
          setOtpCountdown(30);
          setOtpDigits(['', '', '', '', '', '']);
          setTimeout(() => otpInputRefs[0].current?.focus(), 100);
        } else {
          setAuthError('Invalid Security Key. (Default: GEMTIDE2026)');
        }
      });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input box
    if (value && index < 5) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const handleResendOtp = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtpCountdown(30);
    setOtpDigits(['', '', '', '', '', '']);
    setAuthError(null);
    otpInputRefs[0].current?.focus();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length < 6) {
      setAuthError('Please enter all 6 digits of the OTP.');
      return;
    }

    if (enteredOtp === generatedOtp) {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError('Incorrect OTP. Please check the code and try again.');
    }
  };

  const handleLockPortal = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setIsAuthenticated(false);
    setAuthStep('key');
    setSecurityKey('');
    setOtpDigits(['', '', '', '', '', '']);
    setAuthError(null);
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChange = (
    id: number,
    field: keyof Product,
    value: string | boolean
  ) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
            ...p,
            [field]:
              field === 'stock' || field === 'price' || field === 'offer'
                ? Number(value) || 0
                : value,
          }
          : p
      )
    );
  };

  const handleToggleActive = (id: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const handleImageUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        handleChange(id, 'image', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setProducts(initialProducts);
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialProducts)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast('Products reset to default catalog.');
          fetchFullDb();
        } else {
          showToast('Reset locally, but failed to sync to server.', 'error');
        }
      })
      .catch(() => showToast('Reset locally, server error.', 'error'));
  };

  const handleSaveInventory = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast('Inventory saved and synced to db.json.');
          fetchFullDb();
        } else {
          showToast('Saved locally, failed to update db.json file.', 'error');
        }
      })
      .catch(() => showToast('Saved locally, server error.', 'error'));
  };

  const handleRawJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawDbJson(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleBeautifyJson = () => {
    try {
      const parsed = JSON.parse(rawDbJson);
      setRawDbJson(JSON.stringify(parsed, null, 2));
      setJsonError(null);
      showToast('JSON formatted successfully.');
    } catch (err: any) {
      setJsonError('Cannot format invalid JSON: ' + err.message);
      showToast('Invalid JSON syntax.', 'error');
    }
  };

  const handleSaveDatabase = () => {
    try {
      const parsed = JSON.parse(rawDbJson);
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast('Database file (db.json) successfully saved & updated!');
            if (Array.isArray(parsed.products)) setProducts(parsed.products);
            if (Array.isArray(parsed.orders)) setOrders(parsed.orders);
            setLastSynced(new Date().toLocaleTimeString());
          } else {
            showToast('Failed to write database file: ' + (data.error || 'Unknown error'), 'error');
          }
        })
        .catch(err => showToast('Network error saving database: ' + err.message, 'error'));
    } catch (err: any) {
      setJsonError(err.message);
      showToast('Fix JSON syntax errors before saving.', 'error');
    }
  };

  const handleExportDb = () => {
    const blob = new Blob([rawDbJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemtide-db-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('db.json downloaded.');
  };

  const handleImportDb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          setRawDbJson(JSON.stringify(parsed, null, 2));
          setJsonError(null);
          showToast('Imported file into editor. Click "Save to db.json" to commit.');
        } catch (err: any) {
          showToast('Imported file contains invalid JSON!', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawDbJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Copied JSON to clipboard.');
  };

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  // ----------------------------------------------------------------------
  // UNAUTHENTICATED: RENDER 2FA SECURITY GUARD SCREEN
  // ----------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        
        {/* Glowing Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-green/10 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/10 blur-[150px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          
          {/* Brand Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 rounded-full border border-brand-green/40 items-center justify-center text-brand-green font-serif text-xl font-bold bg-brand-green/10 shadow-lg mb-4">
              GT
            </div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">GemTide Admin Security</h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">Restricted Merchant Portal · 2-Factor Auth Required</p>
          </div>

          {/* Auth Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
            
            {/* Step Indicators */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className={`flex items-center gap-2 text-xs font-bold ${authStep === 'key' ? 'text-brand-green' : 'text-slate-500'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${authStep === 'key' ? 'bg-brand-green text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  1
                </div>
                Security Key
              </div>
              <div className="h-[1px] w-8 bg-slate-800" />
              <div className={`flex items-center gap-2 text-xs font-bold ${authStep === 'otp' ? 'text-brand-green' : 'text-slate-500'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${authStep === 'otp' ? 'bg-brand-green text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  2
                </div>
                6-Digit OTP
              </div>
            </div>

            {/* Error Notification */}
            {authError && (
              <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* STEP 1: SECURITY KEY FORM */}
            {authStep === 'key' && (
              <form onSubmit={handleVerifySecurityKey} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-brand-green" />
                    Enter Security Key
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={securityKey}
                      onChange={(e) => setSecurityKey(e.target.value)}
                      placeholder="Enter Admin Security Key..."
                      autoFocus
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Default Key: <code className="text-brand-green bg-slate-950 px-1 py-0.5 rounded font-mono">GEMTIDE2026</code></span>
                    <button
                      type="button"
                      onClick={() => setSecurityKey('GEMTIDE2026')}
                      className="text-brand-green hover:underline"
                    >
                      Auto-fill
                    </button>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingKey}
                  className="w-full py-3.5 rounded-2xl bg-brand-green hover:bg-brand-green-dark text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isVerifyingKey ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verify Security Key</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: OTP VERIFICATION FORM */}
            {authStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                
                {/* Simulated SMS/Device OTP Notification Banner */}
                <div className="p-4 rounded-2xl bg-brand-green/10 border border-brand-green/30 text-emerald-300 text-xs space-y-1 text-center animate-in fade-in">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-brand-green uppercase text-[10px] tracking-wider">
                    <Smartphone className="w-3.5 h-3.5" />
                    Secure OTP Dispatched
                  </div>
                  <p className="text-[11px] text-slate-300">Enter this 6-digit code to complete login:</p>
                  <div className="text-xl font-mono font-bold tracking-[0.3em] text-white bg-slate-950/80 py-1.5 px-4 rounded-xl border border-brand-green/40 inline-block mt-1">
                    {generatedOtp}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-3 text-center">
                    Enter 6-Digit One-Time Password
                  </label>
                  
                  {/* Segmented OTP Boxes */}
                  <div className="flex justify-between gap-1.5 sm:gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={otpInputRefs[idx]}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-9 h-11 sm:w-11 sm:h-12 text-center bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-lg font-bold font-mono text-brand-green outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthStep('key')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    ← Change Key
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpCountdown > 0}
                    className={`font-semibold ${otpCountdown > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-brand-green hover:underline'}`}
                  >
                    {otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : 'Resend OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-brand-green hover:bg-brand-green-dark text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Verify OTP & Access Portal
                </button>
              </form>
            )}

          </div>

          {/* Footer Back Link */}
          <div className="text-center mt-6">
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Return to GemTide Storefront
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // AUTHENTICATED: RENDER FULL ADMIN PORTAL
  // ----------------------------------------------------------------------
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 overflow-x-hidden font-sans pb-16">
      
      {/* Background Blurs */}
      <div className="absolute top-0 left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[160px] ambient-glow-1 pointer-events-none z-0" />
      <div className="absolute top-[60vh] right-[-10%] w-[55vw] h-[55vw] rounded-full blur-[180px] ambient-glow-2 pointer-events-none z-0" />

      {/* Header - Modern Glassmorphic */}
      <header className="relative z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl py-3.5 sm:py-4 shadow-sm sticky top-0">
        <nav className="mx-auto flex flex-col md:flex-row max-w-[1400px] items-stretch md:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 md:px-12">
          <div className="flex items-center justify-between md:justify-start gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="GemTide" className="h-9 w-9 rounded-xl object-cover border border-brand-green/20 shadow-xs shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold tracking-[0.15em] text-slate-900 font-serif uppercase">
                    GemTide Portal
                  </span>
                  <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    2FA
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-sans tracking-[0.05em]">
                  Control Center
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <Link
                to="/"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-slate-700"
              >
                Store
              </Link>
              <button
                onClick={handleLockPortal}
                className="p-1.5 rounded-full bg-red-50 text-red-700 border border-red-200"
                title="Lock Portal"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
              </button>
            </div>
          </div>
          
          {/* Main Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner overflow-x-auto scrollbar-none justify-center">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'inventory'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-brand-green" />
              Inventory ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
              Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'database'
                  ? 'bg-brand-green text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Database
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs font-sans">
            <span className="hidden lg:inline-block rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-slate-650 tracking-wider uppercase text-[10px]">
              Live Stock: <span className="text-brand-green font-bold">{totalStock} pcs</span>
            </span>
            <Link
              to="/"
              className="rounded-full border border-slate-200 hover:border-brand-green hover:text-brand-green bg-white/60 backdrop-blur-md px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700 transition-all duration-300 shadow-xs"
            >
              View Store
            </Link>

            {/* Lock / Sign Out Button */}
            <button
              onClick={handleLockPortal}
              className="flex items-center gap-1.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-4 py-2 text-[9px] font-bold uppercase tracking-wider transition-all shadow-xs"
              title="Lock Admin Portal & Require 2FA"
            >
              <LogOut className="w-3 h-3 text-red-600" />
              Lock Portal
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 md:px-12 py-6 sm:py-8">

        {/* Global Toast Message */}
        {message && (
          <div className={`mb-6 rounded-2xl border px-5 sm:px-6 py-3.5 text-xs font-sans tracking-wide shadow-sm flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 ${
            message.type === 'error' 
              ? 'border-red-200 bg-red-50 text-red-700' 
              : 'border-brand-green/20 bg-emerald-50 text-brand-green'
          }`}>
            {message.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-brand-green shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* TAB 1: INVENTORY & PRODUCTS */}
        {activeTab === 'inventory' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif text-slate-900 tracking-wide font-bold">Merchant Inventory</h1>
                <p className="mt-1 text-xs text-slate-500 max-w-xl font-sans tracking-wide">
                  Update live prices, active discount offers, and warehouse stock levels. Modifications sync directly to store catalog via <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">db.json</code>.
                </p>
              </div>
              <div className="flex items-center gap-2.5 text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase">
                <button
                  onClick={handleSaveInventory}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-dark text-white px-5 sm:px-7 py-2.5 sm:py-3 transition-all duration-300 shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-full border border-slate-200 bg-white hover:border-red-500 hover:text-red-650 text-slate-700 px-4 sm:px-7 py-2.5 sm:py-3 transition-all duration-300 shadow-xs"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Section Organizer Bar */}
            <div className="mt-6 flex flex-col gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-tech font-bold uppercase tracking-wider text-slate-700">
                  ✦ Section & Category Organizer
                </span>
                <span className="text-[10px] text-slate-400 font-sans">
                  Define which section each item displays in (Rings, Chains, Watches, Apparel, Bags, T-Shirts, Artifacts)
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                {['All', 'Rings', 'Chains', 'Watches', 'Apparel', 'Bags', 'T-Shirts', 'Artifacts'].map((sec) => {
                  const count = sec === 'All'
                    ? products.length
                    : products.filter(p => (p.category || '').toLowerCase() === sec.toLowerCase()).length;

                  return (
                    <button
                      key={sec}
                      onClick={() => setSectionFilter(sec)}
                      className={`px-3.5 py-1.5 rounded-full text-[10px] font-tech font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border ${
                        sectionFilter === sec
                          ? 'bg-brand-green border-brand-green text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {sec} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Cards View for Inventory (Screen width < 1024px) */}
            <div className="mt-6 space-y-4 lg:hidden">
              {products
                .filter(p => sectionFilter === 'All' || (p.category || '').toLowerCase() === sectionFilter.toLowerCase())
                .map((p) => {
                  const finalPrice = effectivePrice(p.price, p.offer);
                  return (
                    <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                      <div className="flex items-start gap-3">
                        {p.image && (
                          <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0" />
                        )}
                        <div className="flex-grow space-y-2">
                          <div className="flex justify-between items-start">
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => handleChange(p.id, 'name', e.target.value)}
                              className="font-serif font-bold text-slate-900 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-xl text-xs w-full mr-2 focus:outline-none focus:border-brand-green"
                            />
                            <button
                              onClick={() => handleToggleActive(p.id)}
                              className={`rounded-full px-3 py-1 text-[8px] font-tech font-bold uppercase tracking-wider shrink-0 border ${
                                p.active
                                  ? 'bg-brand-green/10 text-brand-green border-brand-green/30'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {p.active ? 'Active' : 'Hidden'}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer rounded-full border border-slate-200 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-700 px-3 py-1">
                              Upload Photo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageUpload(p.id, e)}
                              />
                            </label>
                            <span className="text-[10px] text-slate-400 font-tech">♥ {p.likes || 0} Likes</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-tech font-bold text-slate-400 uppercase tracking-wider mb-1">Target Section / Category</label>
                        <select
                          value={p.category || 'Rings'}
                          onChange={(e) => handleChange(p.id, 'category', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-tech font-bold text-slate-800 outline-none focus:border-brand-green"
                        >
                          <option value="Rings">Rings Section</option>
                          <option value="Chains">Chains Section</option>
                          <option value="Watches">Watches Section</option>
                          <option value="Apparel">Apparel Section</option>
                          <option value="Bags">Bags Section</option>
                          <option value="T-Shirts">T-Shirts Section</option>
                          <option value="Artifacts">Artifacts Section</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-tech font-bold text-slate-400 uppercase tracking-wider mb-1">Tagline</label>
                        <input
                          type="text"
                          value={p.tag}
                          onChange={(e) => handleChange(p.id, 'tag', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] font-tech uppercase tracking-wider">
                        <div>
                          <label className="block text-slate-400 mb-1">Base Price (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={p.price}
                            onChange={(e) => handleChange(p.id, 'price', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-center text-xs font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Offer %</label>
                          <input
                            type="number"
                            min={0}
                            max={90}
                            value={p.offer}
                            onChange={(e) => handleChange(p.id, 'offer', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-center text-xs font-bold text-brand-green"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Stock (pcs)</label>
                          <input
                            type="number"
                            min={0}
                            value={p.stock}
                            onChange={(e) => handleChange(p.id, 'stock', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-center text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-[10px] font-tech uppercase text-slate-400">Effective Selling Price</span>
                        <span className="font-bold text-brand-green">{formatPrice(finalPrice)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Desktop Product Table Container (Screen width >= 1024px) */}
            <div className="mt-8 hidden lg:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-xs font-sans">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-tech tracking-[0.2em] text-slate-650 uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Section / Category</th>
                    <th className="px-6 py-4">Showcase</th>
                    <th className="px-6 py-4">Tagline</th>
                    <th className="px-6 py-4">Base Price (₹)</th>
                    <th className="px-6 py-4">Offer %</th>
                    <th className="px-6 py-4">Effective Price</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Likes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-250/50">
                  {products
                    .filter(p => sectionFilter === 'All' || (p.category || '').toLowerCase() === sectionFilter.toLowerCase())
                    .map((p) => {
                      const finalPrice = effectivePrice(p.price, p.offer);

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/50 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 align-top">
                            <input
                              className="w-44 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand-green focus:bg-white transition-all font-serif"
                              value={p.name}
                              onChange={(e) =>
                                handleChange(p.id, 'name', e.target.value)
                              }
                            />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <select
                              value={p.category || 'Rings'}
                              onChange={(e) => handleChange(p.id, 'category', e.target.value)}
                              className="w-32 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-tech font-bold text-slate-800 outline-none focus:border-brand-green focus:bg-white transition-all"
                            >
                              <option value="Rings">Rings</option>
                              <option value="Chains">Chains</option>
                              <option value="Watches">Watches</option>
                              <option value="Apparel">Apparel</option>
                              <option value="Bags">Bags</option>
                              <option value="T-Shirts">T-Shirts</option>
                              <option value="Artifacts">Artifacts</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-col items-start gap-2">
                              {p.image && (
                                <img
                                  src={p.image}
                                  alt="preview"
                                  className="h-12 w-12 rounded-xl object-cover border border-slate-200 shadow-xs"
                                />
                              )}
                              <label className="cursor-pointer rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-brand-green text-[9px] font-bold uppercase tracking-wider text-slate-700 px-3 py-1.5 transition-all shadow-xs">
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(p.id, e)}
                                />
                              </label>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <textarea
                              className="h-16 w-60 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-green focus:bg-white transition-all font-sans"
                              value={p.tag}
                              onChange={(e) =>
                                handleChange(p.id, 'tag', e.target.value)
                              }
                            />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <input
                              type="number"
                              min={0}
                              className="w-24 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-green focus:bg-white transition-all font-sans text-center"
                              value={p.price}
                              onChange={(e) =>
                                handleChange(p.id, 'price', e.target.value)
                              }
                            />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <input
                              type="number"
                              min={0}
                              max={90}
                              className="w-16 rounded-full border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none focus:border-brand-green focus:bg-white transition-all font-sans text-center"
                              value={p.offer}
                              onChange={(e) =>
                                handleChange(p.id, 'offer', e.target.value)
                              }
                            />
                          </td>
                          <td className="px-6 py-4 align-top text-slate-850 font-sans">
                            <div className="flex flex-col">
                              <span className="font-bold text-brand-green">{formatPrice(finalPrice)}</span>
                              {p.offer > 0 && (
                                <span className="text-[10px] text-slate-400 line-through mt-0.5">
                                  {formatPrice(p.price)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <input
                              type="number"
                              min={0}
                              className="w-16 rounded-full border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none focus:border-brand-green focus:bg-white transition-all font-sans text-center"
                              value={p.stock}
                              onChange={(e) =>
                                handleChange(p.id, 'stock', e.target.value)
                              }
                            />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <button
                              onClick={() => handleToggleActive(p.id)}
                              className={`rounded-full px-4 py-2 text-[9px] font-tech font-bold uppercase tracking-wider transition-all duration-300 shadow-xs border ${
                                p.active
                                  ? 'bg-brand-green/10 text-brand-green border-brand-green/30 hover:bg-brand-green/20'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/70 hover:text-slate-800'
                              }`}
                            >
                              {p.active ? 'Active' : 'Hidden'}
                            </button>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center gap-1.5 mt-2 font-bold text-slate-700">
                              <span className="text-red-500 text-sm">♥</span>
                              <span className="font-sans text-xs">{p.likes || 0}</span>
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

        {/* TAB 2: ORDERS & INQUIRIES */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-3xl font-serif text-slate-900 tracking-wide font-bold">Customer Orders & Inquiries</h1>
                <p className="mt-1 text-xs text-slate-500 max-w-xl font-sans tracking-wide">
                  View recent checkout orders stored in <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">db.json</code>.
                </p>
              </div>
              <button
                onClick={fetchFullDb}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-brand-green" />
                Refresh Orders
              </button>
            </div>

            <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-xs font-sans">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-tech tracking-[0.2em] text-slate-650 uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">Order ID & Date</th>
                    <th className="px-6 py-4">Customer Info</th>
                    <th className="px-6 py-4">Shipping Address</th>
                    <th className="px-6 py-4">Items Ordered</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-sans">
                        No customer orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, idx) => (
                      <tr key={order.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 align-top font-tech font-bold text-slate-700 whitespace-nowrap">
                          <div className="text-brand-green">{order.id}</div>
                          <div className="text-[9px] text-slate-400 font-normal font-sans mt-0.5">
                            {order.date ? new Date(order.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-bold text-slate-800 font-serif">{order.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{order.customerPhone}</div>
                        </td>
                        <td className="px-6 py-4 align-top text-slate-500 max-w-xs leading-relaxed font-sans text-[11px] normal-case">
                          {order.customerAddress}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1 text-slate-700 text-[11px]">
                            {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between gap-4">
                                <span>{item.name} <span className="text-slate-400 font-mono">x{item.quantity}</span></span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top font-bold text-brand-green">
                          {order.paymentMethod}
                        </td>
                        <td className="px-6 py-4 align-top font-bold text-slate-800 text-sm whitespace-nowrap">
                          {formatPrice(order.grandTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DATABASE MANAGER (OBSERVER & EDITOR) */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            
            {/* Header & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-serif text-slate-900 tracking-wide font-bold">Database Control & Observer</h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live File: db.json
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 max-w-2xl font-sans tracking-wide">
                  Observe and directly modify the disk-backed database (<code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[11px]">db.json</code>). Changes saved here immediately take effect across the entire application.
                </p>
              </div>

              {/* DB Quick Stats Cards */}
              <div className="flex items-center gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-center shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Products</div>
                  <div className="text-lg font-bold text-brand-green font-mono">{products.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-center shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Orders</div>
                  <div className="text-lg font-bold text-amber-600 font-mono">{orders.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-center shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Synced At</div>
                  <div className="text-xs font-bold text-slate-700 font-mono mt-1">{lastSynced || 'Just now'}</div>
                </div>
              </div>
            </div>

            {/* Sub Tabs for Database Manager */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDbSubTab('editor')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    dbSubTab === 'editor'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Code2 className="w-4 h-4 text-brand-green" />
                  Raw JSON Editor
                </button>
                <button
                  onClick={() => setDbSubTab('inspect')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    dbSubTab === 'inspect'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Live Collection Inspector
                </button>
                <button
                  onClick={() => setDbSubTab('import-export')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    dbSubTab === 'import-export'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  Backup & Import
                </button>
              </div>

              {/* Action buttons for Raw Editor */}
              {dbSubTab === 'editor' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchFullDb}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium"
                    title="Reload from server db.json"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-brand-green" />
                    Reload DB
                  </button>
                  <button
                    onClick={handleBeautifyJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium"
                    title="Format JSON with indentation"
                  >
                    Format JSON
                  </button>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Code2 className="w-3.5 h-3.5" />}
                    Copy JSON
                  </button>
                  <button
                    onClick={handleSaveDatabase}
                    disabled={!!jsonError}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                      jsonError
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-brand-green hover:bg-brand-green-dark text-white'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    Save to db.json
                  </button>
                </div>
              )}
            </div>

            {/* SUB-TAB 1: RAW JSON EDITOR */}
            {dbSubTab === 'editor' && (
              <div className="space-y-3">
                {jsonError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">JSON Syntax Error detected: </span>
                      <span className="font-mono">{jsonError}</span>
                      <p className="mt-1 text-[11px] text-red-600">Please correct syntax errors before saving to db.json.</p>
                    </div>
                  </div>
                )}

                <div className="relative rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
                      <span className="ml-2 text-slate-300 font-bold">db.json (Live Code Editor)</span>
                    </div>
                    <div className="text-[10px]">
                      Length: <span className="text-brand-green">{rawDbJson.length.toLocaleString()}</span> chars
                    </div>
                  </div>
                  
                  <textarea
                    value={rawDbJson}
                    onChange={handleRawJsonChange}
                    spellCheck={false}
                    className="w-full h-[550px] p-6 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed outline-none resize-none selection:bg-brand-green/30 selection:text-white"
                    placeholder="Enter JSON structure..."
                  />
                </div>
              </div>
            )}

            {/* SUB-TAB 2: LIVE COLLECTION INSPECTOR */}
            {dbSubTab === 'inspect' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Filter database records by keyword..."
                      value={dbSearch}
                      onChange={(e) => setDbSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-brand-green focus:bg-white transition-all font-sans"
                    />
                  </div>
                  <button
                    onClick={fetchFullDb}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-brand-green" />
                    Refresh Observer
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Products Collection */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-brand-green" />
                        <h3 className="font-serif font-bold text-slate-900 text-base">"products" collection</h3>
                      </div>
                      <span className="text-xs font-mono font-bold text-brand-green bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        {products.length} records
                      </span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                      {products
                        .filter(p => JSON.stringify(p).toLowerCase().includes(dbSearch.toLowerCase()))
                        .map((p) => (
                          <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 hover:border-brand-green/50 transition-all">
                            <div className="flex items-center justify-between text-slate-800 font-bold mb-1">
                              <span>#{p.id} {p.name}</span>
                              <span className="text-brand-green font-sans text-xs">₹{effectivePrice(p.price, p.offer)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-sans line-clamp-1">{p.tag}</div>
                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-200/40">
                              <span>Stock: {p.stock}</span>
                              <span>Likes: {p.likes || 0}</span>
                              <span>Offer: {p.offer}%</span>
                              <span className={p.active ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{p.active ? 'Active' : 'Hidden'}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Orders Collection */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-amber-600" />
                        <h3 className="font-serif font-bold text-slate-900 text-base">"orders" collection</h3>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                        {orders.length} records
                      </span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                      {orders.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-sans text-xs">
                          No order records currently in db.json
                        </div>
                      ) : (
                        orders
                          .filter(o => JSON.stringify(o).toLowerCase().includes(dbSearch.toLowerCase()))
                          .map((o, idx) => (
                            <div key={o.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 hover:border-amber-400 transition-all">
                              <div className="flex items-center justify-between text-slate-800 font-bold mb-1">
                                <span>{o.id} ({o.customerName})</span>
                                <span className="text-slate-900 font-sans font-bold">₹{o.grandTotal}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-sans">{o.customerPhone} · {o.paymentMethod}</div>
                              <div className="mt-2 text-[10px] text-slate-600 font-sans">
                                Items: {Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} (x${it.quantity})`).join(', ') : 'None'}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SUB-TAB 3: BACKUP & IMPORT */}
            {dbSubTab === 'import-export' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-slate-900">Export db.json Backup</h3>
                    <p className="mt-1 text-xs text-slate-500 font-sans">
                      Download a local JSON backup snapshot of all products, stock counts, discount structures, and customer orders.
                    </p>
                  </div>
                  <button
                    onClick={handleExportDb}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download db.json
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-slate-900">Import & Restore Database</h3>
                    <p className="mt-1 text-xs text-slate-500 font-sans">
                      Upload a `.json` backup file to load into the Raw JSON Editor for inspection before committing to disk.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    Select JSON File
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportDb}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 tracking-wider font-sans">
              Disk location: <strong className="text-brand-green font-bold">db.json</strong> (root directory). API endpoints active: <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[10px]">GET /api/db</code> and <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[10px]">POST /api/db</code>.
            </p>

          </div>
        )}

      </main>
    </div>
  );
};

export default AdminPage;
