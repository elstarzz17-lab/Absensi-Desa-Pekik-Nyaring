'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// ============ TYPES ============
interface Admin {
  id: string;
  username: string;
}

interface PerangkatDesa {
  id: string;
  nipd: string;
  namaLengkap: string;
  nik: string | null;
  tempatTanggalLahir: string | null;
  jenisKelamin: string | null;
  pendidikanTerakhir: string | null;
  nomorSK: string | null;
  jabatan: string;
  kecamatan: string;
  desa: string;
  status: string;
  keterangan: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Absensi {
  id: string;
  perangkatDesaId: string;
  tipe: string;
  kategori: string;
  tanggal: string;
  waktu: string;
  gpsLat: string | null;
  gpsLng: string | null;
  gpsAccuracy: string | null;
  createdAt: string;
  updatedAt: string;
  perangkatDesa: PerangkatDesa;
}

interface DashboardData {
  totalPerangkat: number;
  totalAktif: number;
  totalPasif: number;
  hadirHariIni: number;
  pulangHariIni: number;
  persentaseKehadiran: number;
  rekap30Hari: {
    id: string;
    nipd: string;
    namaLengkap: string;
    jabatan: string;
    status: string;
    hadir: number;
    pulang: number;
  }[];
  tren7Hari: {
    tanggal: string;
    hari: string;
    hadir: number;
  }[];
  aktivitasTerbaru: Absensi[];
  absensiHariIni: Absensi[];
}

type TabType = 'scan' | 'dashboard' | 'perangkat' | 'riwayat' | 'qrcode';

// ============ GLOBAL EVENT FOR REAL-TIME UPDATES ============
function notifyAbsensiUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('absensi-updated'));
  }
}

function notifyScannerStop() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('scanner-stop'));
  }
}

function formatDisplayText(value: string | null | undefined, fallback = 'Tidak tersedia') {
  return value ? value.replace(/[-–—]/g, ' ') : fallback;
}

function formatDisplayNipd(nipd: string) {
  return nipd.replace(/-/g, '');
}

function useAbsensiListener(callback: () => void) {
  React.useEffect(() => {
    window.addEventListener('absensi-updated', callback);
    return () => window.removeEventListener('absensi-updated', callback);
  }, [callback]);
}

function useScannerStopListener(callback: () => void) {
  React.useEffect(() => {
    window.addEventListener('scanner-stop', callback);
    return () => window.removeEventListener('scanner-stop', callback);
  }, [callback]);
}

// ============ COLOR CONSTANTS ============
const COLORS = {
  primary: '#1e3a2f',
  primaryLight: '#2d5a48',
  primaryDark: '#152a22',
  accent: '#c9a961',
  accentLight: '#d4b872',
  accentDark: '#b89545',
  bg: '#f5f5f0',
  card: '#ffffff',
  text: '#1a1a1a',
  textMuted: '#6b7280',
  green: '#16a34a',
  greenLight: '#dcfce7',
  greenBg: '#f0fdf4',
  red: '#dc2626',
  redLight: '#fef2f2',
  goldLight: '#fef9e7',
  goldBg: '#fef3c7',
};

// ============ ICONS (SVG) ============
const ShieldIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const QrCodeIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/>
    <rect x="6" y="6" width="2" height="2"/><rect x="18" y="6" width="2" height="2"/><rect x="6" y="18" width="2" height="2"/>
    <path d="M14 14h2v2h-2z"/><path d="M18 14h2v2h-2z"/><path d="M14 18h2v2h-2z"/><path d="M18 18h2v2h-2z"/>
  </svg>
);

const DashboardIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const UsersIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const ClockIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const CameraIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const LogOutIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const SearchIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const PlusIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const RefreshIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

const DownloadIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const TrashIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const EyeIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const MapPinIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CheckIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ============ MAIN APP ============
function getInitialSession(): { admin: Admin | null; isAdmin: boolean } {
  if (typeof window === 'undefined') return { admin: null, isAdmin: false };
  try {
    const session = localStorage.getItem('absensi_admin');
    if (session) {
      const parsed = JSON.parse(session);
      return { admin: parsed, isAdmin: true };
    }
  } catch {
    localStorage.removeItem('absensi_admin');
  }
  return { admin: null, isAdmin: false };
}

export default function AbsensiApp() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('scan');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const initial = getInitialSession();
      setAdmin(initial.admin);
      setIsAdmin(initial.isAdmin);
      setSessionReady(true);
    });
    fetch('/api/auth/setup', { method: 'POST' }).catch(() => {});
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleLogin = (adminData: Admin) => {
    setAdmin(adminData);
    setIsAdmin(true);
    localStorage.setItem('absensi_admin', JSON.stringify(adminData));
  };

  const handleLogout = () => {
    setAdmin(null);
    setIsAdmin(false);
    localStorage.removeItem('absensi_admin');
  };

  if (!sessionReady) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'scan', label: 'Scan QR', icon: <QrCodeIcon size={18} /> },
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon size={18} /> },
    { key: 'perangkat', label: 'Data Perangkat', icon: <UsersIcon size={18} /> },
    { key: 'riwayat', label: 'Riwayat Absensi', icon: <ClockIcon size={18} /> },
    { key: 'qrcode', label: 'Kartu QR', icon: <QrCodeIcon size={18} /> },
  ];

  return (
    <div style={{ background: COLORS.bg }} className="min-h-screen flex flex-col">
      {/* Header */}
      <header style={{ background: COLORS.primary }} className="shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-desa.png" alt="Logo Desa" className="w-10 h-10 rounded-full flex-shrink-0 object-cover" style={{ border: `2px solid ${COLORS.accent}` }} />
            <div>
              <h1 className="text-white font-bold text-sm sm:text-base leading-tight">Absensi Perangkat Desa</h1>
              <p className="text-sm font-semibold" style={{ color: COLORS.accent }}>Pekik Nyaring</p>
              <p className="text-xs text-white/50 hidden sm:block">Kec. Pondok Kelapa &bull; Kab. Bengkulu Tengah</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-white/50">Masuk sebagai</span>
              <span className="text-sm font-semibold" style={{ color: COLORS.accent }}>Admin Desa Pekik Nyaring</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <LogOutIcon size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto pb-0 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key !== 'scan') notifyScannerStop();
                  setActiveTab(tab.key);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all rounded-t-lg ${
                  activeTab === tab.key
                    ? ''
                    : 'text-white/60 hover:text-white/90'
                }`}
                style={activeTab === tab.key ? { background: COLORS.accent, color: COLORS.primaryDark, borderRadius: '8px 8px 0 0' } : {}}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {activeTab === 'scan' && <ScanQRPage />}
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'perangkat' && <DataPerangkatPage />}
        {activeTab === 'riwayat' && <RiwayatAbsensiPage />}
        {activeTab === 'qrcode' && <KartuQRPage />}
      </main>

      {/* Footer */}
      <footer style={{ background: COLORS.primary }} className="mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-3 text-center">
          <p className="text-xs text-white/60">
            Sistem Absensi Perangkat Desa &copy; {new Date().getFullYear()}, Desa Pekik Nyaring, Kec. Pondok Kelapa, Kab. Bengkulu Tengah
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============ LOGIN PAGE ============
function LoginPage({ onLogin }: { onLogin: (admin: Admin) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.admin);
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: COLORS.primary }}>
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg" style={{ background: 'white', border: `3px solid ${COLORS.accent}` }}>
            <img src="/logo-desa.png" alt="Logo Desa Pekik Nyaring" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: COLORS.accent }}>SISTEM ABSENSI PERANGKAT DESA</h1>
          <p className="text-sm text-white/90 mb-0.5">Desa Pekik Nyaring • Kecamatan Pondok Kelapa</p>
          <p className="text-sm text-white/70">Kabupaten Bengkulu Tengah</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl shadow-2xl p-6" style={{ background: COLORS.card }}>
          <div className="flex items-center gap-2 mb-5 pb-3" style={{ borderBottom: `1px solid #e5e7eb` }}>
            <ShieldIcon size={20} />
            <h3 className="font-semibold text-gray-800">Masuk sebagai Admin</h3>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: COLORS.redLight, color: COLORS.red }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pengguna</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan nama pengguna"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: COLORS.primary }}
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Masuk →</>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Hanya administrator desa yang memiliki akses ke sistem ini.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ SCAN QR PAGE ============
function ScanQRPage() {
  const [absenMode, setAbsenMode] = useState<'DATANG' | 'PULANG'>('DATANG');
  const [manualNipd, setManualNipd] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanSuccessName, setScanSuccessName] = useState('');
  const [todayAbsensi, setTodayAbsensi] = useState<Absensi[]>([]);
  const [perangkatList, setPerangkatList] = useState<PerangkatDesa[]>([]);
  const [gpsInfo, setGpsInfo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);
  const scannerActiveRef = useRef(false);

  // Fetch perangkat list
  const fetchPerangkat = useCallback(async () => {
    try {
      const res = await fetch('/api/perangkat');
      const data = await res.json();
      if (data.success) setPerangkatList(data.data);
    } catch {}
  }, []);

  // Fetch today's absensi
  const fetchTodayAbsensi = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/absensi?from=${today}&to=${today}`);
      const data = await res.json();
      if (data.success) setTodayAbsensi(data.data);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/perangkat');
        const data = await res.json();
        if (!cancelled && data.success) setPerangkatList(data.data);
      } catch {}
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/absensi?from=${today}&to=${today}`);
        const data = await res.json();
        if (!cancelled && data.success) setTodayAbsensi(data.data);
      } catch {}
      // Enumerate cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === 'videoinput');
        if (!cancelled) setAvailableCameras(cams);
        // Auto-select back camera on mobile
        const backCam = cams.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment'));
        if (backCam && !cancelled) setSelectedCamera(backCam.deviceId);
        else if (cams.length > 0 && !cancelled) setSelectedCamera(cams[0].deviceId);
      } catch {}
    })();
    // Try to get GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (!cancelled) setGpsInfo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); },
        () => {}
      );
    }
    return () => { cancelled = true; };
  }, [fetchPerangkat, fetchTodayAbsensi]);

  const handleAbsensi = async (nipd: string) => {
    setSubmitting(true);
    try {
      const normalizedNipd = nipd.trim().replace(/-/g, '').toUpperCase();
      const perangkatByNipd = perangkatList.find(
        p => p.nipd.replace(/-/g, '').toUpperCase() === normalizedNipd
      );
      const attendanceNipd = perangkatByNipd?.nipd || nipd.trim();

      // Check for duplicate attendance today
      const alreadyExists = todayAbsensi.some(
        a => a.perangkatDesa.nipd === attendanceNipd && a.tipe === absenMode
      );
      // Also check by NIK
      const alreadyByNik = !perangkatByNipd && todayAbsensi.some(a => {
        const matchPerangkat = perangkatList.find(p => p.nik === nipd && p.id === a.perangkatDesaId);
        return matchPerangkat && a.tipe === absenMode;
      });

      if (alreadyExists || alreadyByNik) {
        const name = formatDisplayText(perangkatByNipd?.namaLengkap || nipd);
        toast.warning(`Sudah absen ${absenMode === 'DATANG' ? 'Datang' : 'Pulang'} hari ini`, {
          description: `${name} sudah tercatat ${absenMode === 'DATANG' ? 'Datang' : 'Pulang'} hari ini`,
          duration: 4000,
        });
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nipd: attendanceNipd,
          tipe: absenMode,
          gpsLat: gpsInfo?.lat,
          gpsLng: gpsInfo?.lng,
          gpsAccuracy: gpsInfo?.accuracy,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Play beep sound
        try {
          const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          if (audioCtx.state === 'suspended') await audioCtx.resume();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.15);
          // Second beep (higher pitch)
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1600, audioCtx.currentTime + 0.2);
          gain2.gain.setValueAtTime(0.5, audioCtx.currentTime + 0.2);
          osc2.start(audioCtx.currentTime + 0.2);
          osc2.stop(audioCtx.currentTime + 0.4);
        } catch (e) { console.warn('Beep error:', e); }
        // Show green success flash
        setScanSuccess(true);
        setScanSuccessName(formatDisplayText(data.data.perangkatDesa.namaLengkap));
        setTimeout(() => { setScanSuccess(false); setScanSuccessName(''); }, 3500);
        toast.success(`Absensi ${absenMode === 'DATANG' ? 'Datang' : 'Pulang'} berhasil!`, {
          description: `${formatDisplayText(data.data.perangkatDesa.namaLengkap)} (${formatDisplayNipd(attendanceNipd)})`,
          duration: 5000,
        });
        fetchTodayAbsensi();
        // Notify all other pages (Dashboard, Riwayat) to refresh in real-time
        notifyAbsensiUpdated();
      } else {
        toast.error(data.message || 'Gagal melakukan absensi');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  const startScanner = async () => {
    setScannerActive(true);
    scannerActiveRef.current = true;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;
      // Use selected camera if available, otherwise use facingMode
      const cameraConfig = selectedCamera
        ? selectedCamera
        : { facingMode };
      await html5QrCode.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          // On successful scan - stop scanner first to prevent duplicate scans
          html5QrCode.stop().catch(() => {});
          setScannerActive(false);
          scannerActiveRef.current = false;
          // Extract NIPD from QR data (format: NIPD-XXX or JSON with nipd)
          let nipd = decodedText.trim();
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.nipd) nipd = parsed.nipd.trim();
          } catch {}
          // Process the attendance then auto-restart scanner for next person
          handleAbsensi(nipd).then(() => {
            // Auto-restart scanner after 4 seconds (wait for green flash to be visible)
            setTimeout(() => {
              setScanSuccess(false);
              setScanSuccessName('');
              if (!scannerActiveRef.current) {
                startScanner();
              }
            }, 4000);
          });
        },
        () => {} // Ignore errors during scanning
      );
    } catch (err) {
      console.error('Scanner error:', err);
      toast.error('Gagal mengaktifkan kamera. Pastikan izin kamera diberikan.');
      setScannerActive(false);
      scannerActiveRef.current = false;
    }
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      (html5QrCodeRef.current as { stop: () => Promise<void> }).stop().catch(() => {});
    }
    setScannerActive(false);
    scannerActiveRef.current = false;
  };

  // Auto-stop scanner when switching to other tabs
  useScannerStopListener(stopScanner);

  // Cleanup: stop scanner when component unmounts
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        (html5QrCodeRef.current as { stop: () => Promise<void> }).stop().catch(() => {});
      }
    };
  }, []);

  // Handle file upload scan
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader-file');
      const result = await html5QrCode.scanFile(file, true);
      let nipd = result.trim();
      try {
        const parsed = JSON.parse(result);
        if (parsed.nipd) nipd = parsed.nipd.trim();
      } catch {}
      await handleAbsensi(nipd);
    } catch {
      toast.error('QR Code tidak ditemukan dalam gambar');
    }
    e.target.value = '';
  };

  const uniqueHadirToday = new Set(todayAbsensi.filter(a => a.tipe === 'DATANG').map(a => a.perangkatDesaId)).size;
  const totalPerangkat = perangkatList.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Scanner */}
      <div className="lg:col-span-2 space-y-4">
        {/* Scan QR Card */}
        <div className="rounded-xl shadow-sm p-6" style={{ background: COLORS.card }}>
          <div className="flex items-center gap-2 mb-3">
            <QrCodeIcon size={20} />
            <h3 className="font-semibold text-gray-800">Scan QR Code Perangkat Desa</h3>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            Semua perangkat absen <strong>2 kali</strong>: pilih mode <strong>Absen Datang</strong> saat tiba, lalu mode <strong>Absen Pulang</strong> saat pulang. Ini berlaku untuk perangkat AKTIF maupun PASIF. Pindai kartu QR, ketik NIK/NIPD, atau unggah gambar mengikuti mode yang dipilih.
          </p>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAbsenMode('DATANG')}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                absenMode === 'DATANG'
                  ? 'text-white'
                  : 'border-2 bg-white'
              }`}
              style={absenMode === 'DATANG'
                ? { background: COLORS.primary }
                : { borderColor: COLORS.accent, color: COLORS.accent }
              }
            >
              1 ABSEN DATANG
            </button>
            <button
              onClick={() => setAbsenMode('PULANG')}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                absenMode === 'PULANG'
                  ? 'text-white'
                  : 'border-2 bg-white'
              }`}
              style={absenMode === 'PULANG'
                ? { background: COLORS.primary }
                : { borderColor: COLORS.accent, color: COLORS.accent }
              }
            >
              2 ABSEN PULANG
            </button>
          </div>

          {/* Camera Area */}
          <div className="relative rounded-xl overflow-hidden mb-4" style={{ background: '#1a1a1a', minHeight: '280px', border: scanSuccess ? `4px solid ${COLORS.green}` : '2px dashed rgba(255,255,255,0.2)', transition: 'border-color 0.3s' }}>
            <div id="qr-reader" style={{ width: '100%', visibility: scanSuccess ? 'hidden' : 'visible' }} />
            {!scannerActive && !scanSuccess && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
                <CameraIcon size={48} />
                <p className="mt-3 text-sm text-center px-4">Kamera belum aktif. Klik tombol di bawah untuk memulai scan QR Code.</p>
              </div>
            )}
            {/* Green success overlay when scan succeeds */}
            {scanSuccess && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-50" style={{ background: 'rgba(22, 163, 74, 0.92)' }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ background: 'white' }}>
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={COLORS.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xl font-bold text-white">{scanSuccessName}</p>
                <p className="text-base font-medium mt-2 text-white/90">
                  ✓ Absen {absenMode === 'DATANG' ? 'Datang' : 'Pulang'} Berhasil!
                </p>
                <p className="text-sm mt-1 text-white/70">
                  {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                </p>
              </div>
            )}
          </div>

          {/* GPS Info */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm" style={{ background: '#f8f9fa', color: '#555' }}>
            <MapPinIcon size={16} />
            {gpsInfo ? (
              <span>Lokasi GPS aktif ±{Math.round(gpsInfo.accuracy)}m ({gpsInfo.lat.toFixed(5)}, {gpsInfo.lng.toFixed(5)}). Setiap absen akan menyimpan lokasi ini.</span>
            ) : (
              <span>GPS tidak tersedia</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 mb-3">
            {!scannerActive ? (
              <button
                onClick={startScanner}
                className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2"
                style={{ background: COLORS.primary }}
              >
                <CameraIcon size={18} /> Nyalakan Kamera & Scan
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2"
                style={{ background: COLORS.red }}
              >
                <XIcon size={18} /> Matikan Kamera
              </button>
            )}
            <label className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 cursor-pointer border-2 transition-colors hover:opacity-80"
              style={{ borderColor: COLORS.accent, color: COLORS.accent, background: COLORS.goldLight }}>
              <QrCodeIcon size={18} /> Pindai QR dari File Gambar (tanpa kamera)
              <input type="file" accept="image/*" onChange={handleFileScan} className="hidden" />
            </label>
          </div>
          <div id="qr-reader-file" className="hidden" />

          {/* Camera Selection */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Pilih Kamera</label>
            <div className="flex gap-2 items-center">
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {availableCameras.length === 0 && <option value="">Default (Kamera Belakang)</option>}
                {availableCameras.map((cam, i) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Kamera ${i + 1}`}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                title={facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
              >
                🔄 {facingMode === 'environment' ? 'Belakang' : 'Depan'}
              </button>
            </div>
          </div>
        </div>

        {/* Manual Input Card */}
        <div className="rounded-xl shadow-sm p-5" style={{ background: COLORS.card }}>
          <div className="flex items-center gap-2 mb-2">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <h3 className="font-semibold text-gray-800">Input Manual (Cadangan)</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">Ketik NIK (16 digit) atau kode NIPD (contoh: NIPD001) jika kartu QR rusak atau tertinggal.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualNipd}
              onChange={(e) => setManualNipd(e.target.value)}
              placeholder="Masukkan NIK 16 digit atau NIPD"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
            />
            <button
              onClick={() => {
                if (manualNipd.trim()) {
                  handleAbsensi(manualNipd.trim());
                  setManualNipd('');
                }
              }}
              disabled={submitting || !manualNipd.trim()}
              className="px-6 py-2.5 rounded-lg font-medium text-sm disabled:opacity-60"
              style={{ background: COLORS.accentLight, color: COLORS.primaryDark }}
            >
              Absen
            </button>
          </div>
        </div>
      </div>

      {/* Right: Today's Attendance */}
      <div className="space-y-4">
        <div className="rounded-xl shadow-sm p-6" style={{ background: COLORS.card }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ClockIcon size={20} />
              <h3 className="font-semibold text-gray-800">Absensi Hari Ini</h3>
            </div>
            <button onClick={fetchTodayAbsensi} className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity" style={{ color: COLORS.primary }}>
              <RefreshIcon size={14} /> Muat ulang
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {uniqueHadirToday} dari {totalPerangkat} perangkat desa sudah tercatat hadir.
          </p>
          <div className="w-full rounded-full h-2 mb-4" style={{ background: '#e5e7eb' }}>
            <div
              className="rounded-full h-2 transition-all"
              style={{
                width: `${totalPerangkat > 0 ? (uniqueHadirToday / totalPerangkat) * 100 : 0}%`,
                background: COLORS.green,
              }}
            />
          </div>
          {todayAbsensi.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <QrCodeIcon size={40} />
              <p className="mt-2 text-sm text-gray-400">Belum ada yang absen hari ini.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(() => {
                // Group by perangkat to show Datang/Pulang together
                const perangkatMap = new Map<string, { datang?: Absensi; pulang?: Absensi; perangkat: PerangkatDesa }>();
                for (const a of todayAbsensi) {
                  const existing = perangkatMap.get(a.perangkatDesaId) || { perangkat: a.perangkatDesa };
                  if (a.tipe === 'DATANG') existing.datang = a;
                  if (a.tipe === 'PULANG') existing.pulang = a;
                  perangkatMap.set(a.perangkatDesaId, existing);
                }
                return Array.from(perangkatMap.entries()).map(([pId, { datang, pulang, perangkat }]) => (
                  <div key={pId} className="p-3 rounded-lg" style={{ background: COLORS.bg }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{formatDisplayText(perangkat.namaLengkap)}</p>
                        <p className="text-xs text-gray-500 truncate">{formatDisplayNipd(perangkat.nipd)} • {formatDisplayText(perangkat.jabatan)}</p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        {datang && (
                          <p className="text-sm font-semibold text-gray-800">
                            Masuk {datang.waktu.slice(0, 5)}
                          </p>
                        )}
                        {pulang ? (
                          <p className="text-xs font-medium" style={{ color: COLORS.green }}>
                            Pulang {pulang.waktu.slice(0, 5)}
                          </p>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: perangkat.status === 'AKTIF' ? COLORS.greenLight : COLORS.goldLight,
                              color: perangkat.status === 'AKTIF' ? COLORS.green : COLORS.accentDark,
                            }}>
                            Belum pulang
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ DASHBOARD PAGE ============
function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboard = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/dashboard');
        const result = await res.json();
        if (!cancelled && result.success) setData(result.data);
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Listen for real-time absensi updates from QR scanning
  useAbsensiListener(fetchDashboard);

  if (loading) return <LoadingSpinner />;

  if (!data) return <div className="text-center py-12 text-gray-500">Gagal memuat data dashboard</div>;

  const kpiCards = [
    { label: 'TOTAL PERANGKAT', value: data.totalPerangkat, sub: `${data.totalAktif} aktif • ${data.totalPasif} pasif`, color: COLORS.primary, icon: <UsersIcon size={24} /> },
    { label: 'HADIR HARI INI', value: data.hadirHariIni, sub: 'perangkat desa', color: COLORS.green, icon: <CheckIcon size={24} /> },
    { label: 'PERSENTASE KEHADIRAN', value: `${data.persentaseKehadiran}%`, sub: 'dari total perangkat', color: COLORS.accentDark, icon: <DashboardIcon size={24} /> },
    { label: 'STATUS PULANG', value: `${data.pulangHariIni}/${data.hadirHariIni}`, sub: 'pulang/hadir', color: '#6366f1', icon: <ClockIcon size={24} /> },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="rounded-xl shadow-sm p-5" style={{ background: COLORS.card }}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</span>
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: kpi.color }}>{kpi.value}</div>
            <p className="text-xs text-gray-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tren 7 Hari */}
        <div className="rounded-xl shadow-sm p-5" style={{ background: COLORS.card }}>
          <h3 className="font-semibold text-gray-800 mb-4">Tren Kehadiran 7 Hari Terakhir</h3>
          <div className="space-y-2">
            {data.tren7Hari.map((d, i) => {
              const maxVal = Math.max(...data.tren7Hari.map(x => x.hadir), 1);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0">{formatDisplayText(d.hari)}, {d.tanggal.slice(5).replace('-', '/')}</span>
                  <div className="flex-1 rounded-full h-6" style={{ background: '#f0f0f0' }}>
                    <div
                      className="rounded-full h-6 flex items-center px-2 transition-all"
                      style={{
                        width: `${Math.max((d.hadir / maxVal) * 100, d.hadir > 0 ? 8 : 0)}%`,
                        background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.primaryLight})`,
                      }}
                    >
                      <span className="text-xs text-white font-medium">{d.hadir}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Komposisi Perangkat */}
        <div className="rounded-xl shadow-sm p-5" style={{ background: COLORS.card }}>
          <h3 className="font-semibold text-gray-800 mb-4">Komposisi Perangkat</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9155" fill="none"
                  stroke={COLORS.green} strokeWidth="3"
                  strokeDasharray={`${(data.totalAktif / data.totalPerangkat) * 100} ${(data.totalPasif / data.totalPerangkat) * 100}`}
                  strokeDashoffset="0" strokeLinecap="round"
                />
                <circle cx="18" cy="18" r="15.9155" fill="none"
                  stroke={COLORS.accent} strokeWidth="3"
                  strokeDasharray={`${(data.totalPasif / data.totalPerangkat) * 100} ${(data.totalAktif / data.totalPerangkat) * 100}`}
                  strokeDashoffset={`${-(data.totalAktif / data.totalPerangkat) * 100}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: COLORS.primary }}>{data.totalPerangkat}</span>
                <span className="text-xs text-gray-500">Perangkat</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS.green }} />
              <span className="text-sm text-gray-600">AKTIF ({data.totalAktif})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS.accent }} />
              <span className="text-sm text-gray-600">PASIF ({data.totalPasif})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rekap & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rekap 30 Hari */}
        <div className="rounded-xl shadow-sm p-5" style={{ background: COLORS.card }}>
          <h3 className="font-semibold text-gray-800 mb-4">Rekap Kehadiran 30 Hari</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-3 font-medium">Perangkat Desa</th>
                  <th className="pb-2 pr-3 font-medium text-center">Hadir</th>
                  <th className="pb-2 pr-3 font-medium text-center">Pulang</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rekap30Hari.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <p className="font-medium text-gray-800">{formatDisplayText(r.namaLengkap)}</p>
                      <p className="text-xs text-gray-500">{formatDisplayText(r.jabatan)}</p>
                    </td>
                    <td className="py-2 pr-3 text-center">{r.hadir}</td>
                    <td className="py-2 pr-3 text-center">{r.pulang}</td>
                    <td className="py-2 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: r.status === 'AKTIF' ? COLORS.greenLight : COLORS.goldLight,
                          color: r.status === 'AKTIF' ? COLORS.green : COLORS.accentDark,
                        }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aktivitas Terbaru */}
        <div className="rounded-xl shadow-sm p-5" style={{ background: COLORS.card }}>
          <h3 className="font-semibold text-gray-800 mb-4">Aktivitas Terbaru</h3>
          {data.aktivitasTerbaru.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ClockIcon size={32} />
              <p className="mt-2 text-sm">Belum ada aktivitas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.aktivitasTerbaru.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
                    style={{ background: a.tipe === 'DATANG' ? COLORS.green : COLORS.accent }} />
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{formatDisplayText(a.perangkatDesa.namaLengkap)}</span>
                      {' • '}
                      <span style={{ color: a.tipe === 'DATANG' ? COLORS.green : COLORS.accentDark }}>
                        {a.tipe === 'DATANG' ? 'Absen Datang' : 'Absen Pulang'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(a.tanggal).toLocaleDateString('id-ID')} • {a.waktu} WIB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Absensi Hari Ini (Langsung) */}
      <div className="rounded-xl shadow-sm p-5" style={{ background: COLORS.card }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClockIcon size={20} />
            <h3 className="font-semibold text-gray-800">Absen Hari Ini</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: COLORS.greenLight, color: COLORS.green }}>
              Langsung
            </span>
          </div>
          <span className="text-xs text-gray-500">{data.hadirHariIni} hadir dari {data.totalPerangkat} perangkat</span>
        </div>
        {data.absensiHariIni.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClockIcon size={32} />
            <p className="mt-2 text-sm">Belum ada absensi hari ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: COLORS.primary }} className="text-white text-left">
                  <th className="px-4 py-2 font-medium">Waktu</th>
                  <th className="px-4 py-2 font-medium">NIPD</th>
                  <th className="px-4 py-2 font-medium">Nama</th>
                  <th className="px-4 py-2 font-medium">Tipe</th>
                  <th className="px-4 py-2 font-medium">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {data.absensiHariIni.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs">{a.waktu} WIB</td>
                    <td className="px-4 py-2.5 text-xs">{formatDisplayNipd(a.perangkatDesa.nipd)}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800">{formatDisplayText(a.perangkatDesa.namaLengkap)}</p>
                      <p className="text-xs text-gray-500">{formatDisplayText(a.perangkatDesa.jabatan)}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: a.tipe === 'DATANG' ? COLORS.greenLight : COLORS.goldLight,
                          color: a.tipe === 'DATANG' ? COLORS.green : COLORS.accentDark,
                        }}>
                        {a.tipe === 'DATANG' ? 'Datang' : 'Pulang'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: a.kategori === 'AKTIF' ? COLORS.greenLight : COLORS.goldLight,
                          color: a.kategori === 'AKTIF' ? COLORS.green : COLORS.accentDark,
                        }}>
                        {a.kategori}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ DATA PERANGKAT PAGE ============
function DataPerangkatPage() {
  const [list, setList] = useState<PerangkatDesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [addForm, setAddForm] = useState({
    namaLengkap: '', nik: '', tempatTanggalLahir: '', jenisKelamin: 'Laki-laki',
    pendidikanTerakhir: '', nomorSK: '', jabatan: '', status: 'AKTIF',
  });

  const fetchData = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/perangkat');
        const data = await res.json();
        if (!cancelled && data.success) setList(data.data);
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const toggleStatus = async (p: PerangkatDesa) => {
    const newStatus = p.status === 'AKTIF' ? 'PASIF' : 'AKTIF';
    const newKeterangan = newStatus === 'AKTIF'
      ? 'Aktif berkegiatan di kantor desa'
      : 'Berkegiatan di dusun masing-masing';
    try {
      const res = await fetch(`/api/perangkat/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, keterangan: newKeterangan }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status ${formatDisplayText(p.namaLengkap)} diubah menjadi ${newStatus}`);
        fetchData();
      }
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const deletePerangkat = async (p: PerangkatDesa) => {
    if (!confirm(`Hapus ${formatDisplayText(p.namaLengkap)}?`)) return;
    try {
      const res = await fetch(`/api/perangkat/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`${formatDisplayText(p.namaLengkap)} dihapus`);
        fetchData();
      }
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  const startEdit = (p: PerangkatDesa) => {
    setEditingId(p.id);
    setEditForm({
      namaLengkap: p.namaLengkap,
      nik: p.nik || '',
      tempatTanggalLahir: p.tempatTanggalLahir || '',
      jenisKelamin: p.jenisKelamin || 'Laki-laki',
      pendidikanTerakhir: p.pendidikanTerakhir || '',
      nomorSK: p.nomorSK || '',
      jabatan: p.jabatan,
      status: p.status,
      keterangan: p.keterangan || '',
    });
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/perangkat/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Data perangkat desa berhasil diperbarui');
        setEditingId(null);
        setEditForm({});
        fetchData();
      } else {
        toast.error(data.message || 'Gagal memperbarui');
      }
    } catch {
      toast.error('Gagal memperbarui');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/perangkat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Perangkat desa ditambahkan');
        setShowAdd(false);
        setAddForm({
          namaLengkap: '', nik: '', tempatTanggalLahir: '', jenisKelamin: 'Laki-laki',
          pendidikanTerakhir: '', nomorSK: '', jabatan: '', status: 'AKTIF',
        });
        fetchData();
      } else {
        toast.error(data.message || 'Gagal menambahkan');
      }
    } catch {
      toast.error('Gagal menambahkan');
    }
  };

  const filtered = list.filter(p =>
    p.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
    p.nipd.toLowerCase().includes(search.toLowerCase()) ||
    (p.nik && p.nik.includes(search)) ||
    p.jabatan.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Data Perangkat Desa ({list.length})
        </h2>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            <RefreshIcon size={18} />
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: COLORS.green }}
          >
            <PlusIcon size={16} /> Tambah
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="rounded-xl shadow-sm p-5" style={{ background: COLORS.card }}>
          <h3 className="font-semibold text-gray-800 mb-4">Tambah Perangkat Desa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input placeholder="Nama Lengkap *" value={addForm.namaLengkap} onChange={e => setAddForm({...addForm, namaLengkap: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="NIK" value={addForm.nik} onChange={e => setAddForm({...addForm, nik: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Tempat, tanggal lahir (mis. Bengkulu, 06-08-1985)" value={addForm.tempatTanggalLahir} onChange={e => setAddForm({...addForm, tempatTanggalLahir: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            <select value={addForm.jenisKelamin} onChange={e => setAddForm({...addForm, jenisKelamin: e.target.value})} className="px-3 py-2 border rounded-lg text-sm">
              <option value="Laki-laki">Laki laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
            <input placeholder="Pendidikan Terakhir" value={addForm.pendidikanTerakhir} onChange={e => setAddForm({...addForm, pendidikanTerakhir: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Nomor SK" value={addForm.nomorSK} onChange={e => setAddForm({...addForm, nomorSK: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Jabatan *" value={addForm.jabatan} onChange={e => setAddForm({...addForm, jabatan: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            <select value={addForm.status} onChange={e => setAddForm({...addForm, status: e.target.value})} className="px-3 py-2 border rounded-lg text-sm">
              <option value="AKTIF">AKTIF</option>
              <option value="PASIF">PASIF</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            NIPD dibuat otomatis dari kode nama, umur, tanggal lahir, dan kode unik. Jika tanggal lahir tidak dicantumkan, isi NIK yang valid.
          </p>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: COLORS.green }}>
              Simpan
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border text-sm font-medium">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <SearchIcon size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, NIPD, NIK, atau jabatan..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
          style={{ paddingLeft: '2.5rem' }}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon size={16} />
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: COLORS.card }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: COLORS.primary }} className="text-white text-left">
                <th className="px-4 py-3 font-medium">NIPD</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">NIK</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Jabatan</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Keterangan</th>
                <th className="px-4 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: COLORS.primary }}>{formatDisplayNipd(p.nipd)}</td>
                  {editingId === p.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input value={editForm.namaLengkap || ''} onChange={e => setEditForm({...editForm, namaLengkap: e.target.value})} className="w-full px-2 py-1 border rounded text-sm mb-1" />
                        <div className="flex gap-1">
                          <select value={editForm.jenisKelamin || 'Laki-laki'} onChange={e => setEditForm({...editForm, jenisKelamin: e.target.value})} className="px-2 py-1 border rounded text-xs">
                            <option value="Laki-laki">Laki laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                          <input value={editForm.pendidikanTerakhir || ''} onChange={e => setEditForm({...editForm, pendidikanTerakhir: e.target.value})} placeholder="Pendidikan" className="flex-1 px-2 py-1 border rounded text-xs" />
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell"><input value={editForm.nik || ''} onChange={e => setEditForm({...editForm, nik: e.target.value})} className="w-full px-2 py-1 border rounded text-xs" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><input value={editForm.jabatan || ''} onChange={e => setEditForm({...editForm, jabatan: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></td>
                      <td className="px-4 py-3 text-center">
                        <select value={editForm.status || 'AKTIF'} onChange={e => setEditForm({...editForm, status: e.target.value})} className="px-2 py-1 border rounded text-xs">
                          <option value="AKTIF">AKTIF</option>
                          <option value="PASIF">PASIF</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell"><input value={editForm.keterangan || ''} onChange={e => setEditForm({...editForm, keterangan: e.target.value})} className="w-full px-2 py-1 border rounded text-xs" /></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEdit(p.id)} className="text-xs px-2 py-1 rounded text-white font-medium" style={{ background: COLORS.green }}>Simpan</button>
                          <button onClick={cancelEdit} className="text-xs px-2 py-1 rounded border font-medium">Batal</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{formatDisplayText(p.namaLengkap)}</p>
                        <p className="text-xs text-gray-500">{formatDisplayText(p.jenisKelamin)} • {formatDisplayText(p.pendidikanTerakhir)}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-600">{formatDisplayText(p.nik)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{formatDisplayText(p.jabatan)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{
                            background: p.status === 'AKTIF' ? COLORS.greenLight : COLORS.goldLight,
                            color: p.status === 'AKTIF' ? COLORS.green : COLORS.accentDark,
                          }}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{formatDisplayText(p.keterangan)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="text-xs px-2 py-1 rounded border font-medium transition-colors"
                            style={{ borderColor: COLORS.primary, color: COLORS.primary }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleStatus(p)}
                            className="text-xs px-2 py-1 rounded border font-medium transition-colors"
                            style={{
                              borderColor: p.status === 'AKTIF' ? COLORS.accent : COLORS.green,
                              color: p.status === 'AKTIF' ? COLORS.accentDark : COLORS.green,
                            }}
                          >
                            {p.status === 'AKTIF' ? 'PASIF' : 'AKTIF'}
                          </button>
                          <button
                            onClick={() => deletePerangkat(p)}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ RIWAYAT ABSENSI PAGE ============
function RiwayatAbsensiPage() {
  const [list, setList] = useState<Absensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (search) params.set('search', search);
        const res = await fetch(`/api/absensi?${params.toString()}`);
        const data = await res.json();
        if (!cancelled && data.success) setList(data.data);
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [from, to, search, refreshKey]);

  // Listen for real-time absensi updates from QR scanning
  useAbsensiListener(fetchData);

  const resetFilter = () => {
    setFrom('');
    setTo('');
    setSearch('');
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      const dateFrom = from || new Date().toISOString().split('T')[0];
      const dateTo = to || new Date().toISOString().split('T')[0];
      params.set('from', dateFrom);
      params.set('to', dateTo);
      const res = await fetch(`/api/absensi/export?${params.toString()}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap-Absensi-Desa-Pekik-Nyaring-${dateFrom}-sd-${dateTo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('File Excel berhasil diunduh');
    } catch {
      toast.error('Gagal mengekspor file');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClockIcon size={22} />
          <h2 className="text-lg font-semibold text-gray-800">Riwayat Absensi</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: COLORS.accent }}
          >
            <DownloadIcon size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl shadow-sm p-4" style={{ background: COLORS.card }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dari Tanggal</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sampai Tanggal</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cari</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama atau NIPD..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={resetFilter} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
            <XIcon size={16} /> Reset Filter
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <div className="rounded-xl shadow-sm p-12 text-center" style={{ background: COLORS.card }}>
          <div className="text-gray-300 mb-3">
            <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Tidak ada data absensi pada rentang ini.</p>
        </div>
      ) : (
        <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: COLORS.card }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: COLORS.primary }} className="text-white text-left">
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-4 py-3 font-medium">NIPD</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Tipe</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">GPS</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(a.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3">{a.waktu} WIB</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: COLORS.primary }}>{formatDisplayNipd(a.perangkatDesa.nipd)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{formatDisplayText(a.perangkatDesa.namaLengkap)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: a.tipe === 'DATANG' ? COLORS.greenLight : COLORS.goldLight,
                          color: a.tipe === 'DATANG' ? COLORS.green : COLORS.accentDark,
                        }}>
                        {a.tipe === 'DATANG' ? 'Datang' : 'Pulang'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: a.kategori === 'AKTIF' ? COLORS.greenLight : COLORS.goldLight,
                          color: a.kategori === 'AKTIF' ? COLORS.green : COLORS.accentDark,
                        }}>
                        {a.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                      {a.gpsLat && a.gpsLng ? `${parseFloat(a.gpsLat).toFixed(4)}, ${parseFloat(a.gpsLng).toFixed(4)}` : 'Tidak tersedia'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ KARTU QR PAGE ============
function KartuQRPage() {
  const [list, setList] = useState<PerangkatDesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');

  const fetchData = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load logo as data URL for print
      try {
        const logoResp = await fetch('/logo-desa.png');
        const logoBlob = await logoResp.blob();
        const reader = new FileReader();
        reader.onload = () => { if (!cancelled) setLogoDataUrl(reader.result as string); };
        reader.readAsDataURL(logoBlob);
      } catch {}

      setLoading(true);
      try {
        const res = await fetch('/api/perangkat');
        const data = await res.json();
        if (data.success) {
          if (!cancelled) setList(data.data);
          const QRCode = (await import('qrcode')).default;
          const images: Record<string, string> = {};
          for (const p of data.data) {
            try {
              // QR data contains NIPD, NIK, and Nama for richer scanning
              const qrData = JSON.stringify({
                nipd: p.nipd,
                nik: p.nik || '',
                nama: p.namaLengkap,
              });
              images[p.nipd] = await QRCode.toDataURL(qrData, {
                width: 200,
                margin: 2,
                color: { dark: COLORS.primary, light: '#ffffff' },
              });
            } catch {
              images[p.nipd] = '';
            }
          }
          if (!cancelled) setQrImages(images);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const cardCSS = `
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; }
    .card { width: 400px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: ${COLORS.primary}; padding: 8px 14px; display: flex; align-items: center; gap: 10px; }
    .header-logo { width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${COLORS.accent}; object-fit: cover; flex-shrink: 0; }
    .header-text { display: flex; flex-direction: column; }
    .header-title { color: white; font-size: 11px; font-weight: 700; margin: 0; letter-spacing: 0.5px; }
    .header-sub { color: rgba(255,255,255,0.6); font-size: 9px; margin: 2px 0 0; }
    .body { display: flex; padding: 14px; gap: 14px; background: white; }
    .body-left { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .qr-wrapper { position: relative; display: inline-block; }
    .qr-wrapper img.qr { width: 120px; height: 120px; display: block; }
    .qr-logo { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; background: white; object-fit: cover; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
    .body-right { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
    .nipd { font-family: monospace; font-size: 14px; color: #b8860b; font-weight: 700; margin: 0 0 4px; }
    .name { font-size: 16px; font-weight: 700; color: #1a1a1a; margin: 0 0 2px; }
    .jabatan { font-size: 11px; color: #6b7280; margin: 0 0 8px; }
    .status { display: inline-block; font-size: 10px; padding: 3px 10px; border-radius: 6px; font-weight: 600; }
    .status-aktif { background: #1b5e20; color: white; }
    .status-pasif { background: #c9a227; color: #3e2723; }
    .pasif-note { font-style: italic; font-size: 9px; color: #6b7280; margin: 4px 0 0; }
    .footer { background: #f9f9f9; border-top: 1px solid #eee; padding: 6px 14px; }
    .footer-nik { font-size: 10px; color: #6b7280; font-family: monospace; margin: 0; }
  `;

  const generateCardHTML = (p: PerangkatDesa) => {
    const qr = qrImages[p.nipd];
    const logo = logoDataUrl;
    const isAktif = p.status === 'AKTIF';
    return `
      <div class="card">
        <div class="header">
          ${logo ? `<img class="header-logo" src="${logo}" alt="Logo Desa" />` : ''}
          <div class="header-text">
            <p class="header-title">PEMERINTAHAN DESA PEKIK NYARING</p>
            <p class="header-sub">Kec. Pondok Kelapa — Kab. Bengkulu Tengah</p>
          </div>
        </div>
        <div class="body">
          <div class="body-left">
            <div class="qr-wrapper">
              ${qr ? `<img class="qr" src="${qr}" alt="QR Code" />` : ''}
              ${logo ? `<img class="qr-logo" src="${logo}" alt="Logo" />` : ''}
            </div>
          </div>
          <div class="body-right">
            <p class="nipd">${p.nipd}</p>
            <p class="name">${p.namaLengkap}</p>
            <p class="jabatan">${p.jabatan}</p>
            <span class="status ${isAktif ? 'status-aktif' : 'status-pasif'}">${isAktif ? 'ABSENSI AKTIF (Datang & Pulang)' : 'ABSENSI PASIF (Datang & Pulang)'}</span>
            ${!isAktif ? '<p class="pasif-note">Berkegiatan di dusun masing-masing (tidak di kantor desa)</p>' : ''}
          </div>
        </div>
        <div class="footer">
          <p class="footer-nik">NIK : ${p.nik || '-'}</p>
        </div>
      </div>`;
  };

  const drawQrToCanvas = async (p: PerangkatDesa): Promise<HTMLCanvasElement | null> => {
    const qrDataUrl = qrImages[p.nipd];
    if (!qrDataUrl) return null;
    try {
      // Load QR image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = qrDataUrl;
      });
      // Load logo image
      let logoImg: HTMLImageElement | null = null;
      if (logoDataUrl) {
        logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          (logoImg as HTMLImageElement).onload = () => resolve();
          (logoImg as HTMLImageElement).onerror = () => resolve(); // skip logo on error
          logoImg!.src = logoDataUrl;
        });
        if (!logoImg.width) logoImg = null;
      }
      const size = 400;
      const padding = 40;
      const canvas = document.createElement('canvas');
      canvas.width = size + padding * 2;
      canvas.height = size + padding * 2 + 40; // extra for NIPD text
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw QR code
      ctx.drawImage(img, padding, padding, size, size);
      // Draw logo overlay in center (matching print card design)
      if (logoImg) {
        const cx = padding + size / 2;
        const cy = padding + size / 2;
        const logoSize = 56; // matches print card 28px * 2 for high-res
        const borderRadius = logoSize / 2;
        // White circle background
        ctx.beginPath();
        ctx.arc(cx, cy, borderRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        // Draw logo clipped to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, borderRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);
        ctx.restore();
        // Border around logo
        ctx.beginPath();
        ctx.arc(cx, cy, borderRadius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      // NIPD text below QR
      ctx.fillStyle = '#1e3a2f';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.nipd, canvas.width / 2, size + padding + 28);
      return canvas;
    } catch {
      return null;
    }
  };

  const downloadQrAsJpg = async (p: PerangkatDesa) => {
    const canvas = await drawQrToCanvas(p);
    if (!canvas) {
      toast.error('QR Code belum siap');
      return;
    }
    try {
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `QR-${p.nipd}-${p.namaLengkap.replace(/\s+/g, '-')}.jpg`;
      link.href = jpegDataUrl;
      link.click();
      toast.success('QR Code berhasil diunduh sebagai JPG');
    } catch (err) {
      console.error('Download QR JPG error:', err);
      toast.error('Gagal mengunduh QR Code sebagai JPG');
    }
  };

  const downloadAllQrAsJpg = async () => {
    let count = 0;
    for (const p of list) {
      const canvas = await drawQrToCanvas(p);
      if (!canvas) continue;
      try {
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `QR-${p.nipd}-${p.namaLengkap.replace(/\s+/g, '-')}.jpg`;
        link.href = jpegDataUrl;
        link.click();
        count++;
        await new Promise(r => setTimeout(r, 300));
      } catch {}
    }
    if (count > 0) toast.success(`${count} QR Code berhasil diunduh sebagai JPG`);
    else toast.error('Tidak ada QR Code yang bisa diunduh');
  };

  const printCard = (p: PerangkatDesa) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Kartu QR - ${p.namaLengkap}</title>
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        }
        ${cardCSS}
        body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f0; }
      </style></head>
      <body>
        ${generateCardHTML(p)}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const printAllCards = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const allCardsHTML = list.map(p => generateCardHTML(p)).join('\n');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Cetak Semua Kartu QR - Desa Pekik Nyaring</title>
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
          .card { break-inside: avoid; page-break-inside: avoid; }
        }
        ${cardCSS}
        body { padding: 20px; background: #f5f5f0; }
        .cards-grid { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
        .print-header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid ${COLORS.primary}; }
        .print-header h1 { color: ${COLORS.primary}; font-size: 18px; margin: 0 0 4px; }
        .print-header p { color: #6b7280; font-size: 12px; margin: 0; }
      </style></head>
      <body>
        <div class="print-header">
          <h1>Cetak Semua Kartu QR Code Perangkat Desa</h1>
          <p>Desa Pekik Nyaring, Kec. Pondok Kelapa, Kab. Bengkulu Tengah. ${list.length} kartu</p>
        </div>
        <div class="cards-grid">
          ${allCardsHTML}
        </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="rounded-xl shadow-sm p-5" style={{ background: COLORS.card }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <QrCodeIcon size={22} />
            <h2 className="text-lg font-semibold text-gray-800">Kartu QR Code Perangkat Desa ({list.length} kartu)</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={downloadAllQrAsJpg}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: COLORS.accent }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Semua QR JPG
            </button>
            <button
              onClick={printAllCards}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: COLORS.primary }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Cetak Semua Kartu
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          Setiap QR Code berisi NIK/NIPD perangkat desa beserta nama lengkap. Logo desa ditempatkan di tengah QR Code. Level koreksi error H memastikan QR tetap dapat dipindai meskipun sebagian tertutup logo. Kartu ini dapat dicetak dan dibagikan kepada setiap perangkat desa.
        </p>
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: COLORS.goldLight, color: '#8B6914' }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span><strong>Tips:</strong> Gunakan kertas art carton atau laminasi untuk ketahanan kartu. Ukuran kartu mengikuti standar kartu identitas. Warna akan otomatis tercetak sesuai tampilan (hijau &amp; emas).</span>
        </div>
      </div>

      {/* QR Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list.map((p) => (
          <div key={p.id} id={`qr-card-${p.nipd}`} className="rounded-xl shadow-sm overflow-hidden" style={{ background: COLORS.card }}>
            {/* Card Header - horizontal */}
            <div className="px-3.5 py-2 flex items-center gap-2.5" style={{ background: COLORS.primary }}>
              <img src="/logo-desa.png" alt="Logo" className="w-9 h-9 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${COLORS.accent}` }} />
              <div className="flex flex-col">
                <p className="text-white font-bold leading-tight" style={{ fontSize: 11, letterSpacing: 0.5 }}>PEMERINTAHAN DESA PEKIK NYARING</p>
                <p className="text-white/60" style={{ fontSize: 9 }}>Kec. Pondok Kelapa — Kab. Bengkulu Tengah</p>
              </div>
            </div>
            {/* Body - two columns */}
            <div className="flex p-3.5 gap-3.5" style={{ background: 'white' }}>
              {/* Left: QR */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <div className="relative inline-block">
                  {qrImages[p.nipd] ? (
                    <img src={qrImages[p.nipd]} alt={`QR ${p.nipd}`} width={120} height={120} className="block" />
                  ) : (
                    <div className="w-[120px] h-[120px] bg-gray-100 rounded flex items-center justify-center">
                      <QrCodeIcon size={32} />
                    </div>
                  )}
                  <img src="/logo-desa.png" alt="Logo" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-white bg-white object-cover shadow" />
                </div>
              </div>
              {/* Right: Info */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <p className="font-mono font-bold mb-1" style={{ fontSize: 14, color: '#b8860b' }}>{p.nipd}</p>
                <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: 16 }}>{formatDisplayText(p.namaLengkap)}</p>
                <p className="text-gray-500 mb-2" style={{ fontSize: 11 }}>{formatDisplayText(p.jabatan)}</p>
                <span
                  className="inline-block rounded-md font-semibold w-fit"
                  style={{
                    fontSize: 10,
                    padding: '3px 10px',
                    background: p.status === 'AKTIF' ? '#1b5e20' : '#c9a227',
                    color: p.status === 'AKTIF' ? 'white' : '#3e2723',
                  }}
                >
                  {p.status === 'AKTIF' ? 'ABSENSI AKTIF (Datang & Pulang)' : 'ABSENSI PASIF (Datang & Pulang)'}
                </span>
                {p.status !== 'AKTIF' && (
                  <p className="italic text-gray-500 mt-1" style={{ fontSize: 9 }}>Berkegiatan di dusun masing-masing (tidak di kantor desa)</p>
                )}
              </div>
            </div>
            {/* Footer */}
            <div className="px-3.5 py-1.5 border-t border-gray-200" style={{ background: '#f9f9f9' }}>
              <p className="text-gray-500 font-mono" style={{ fontSize: 10 }}>NIK : {p.nik || '-'}</p>
            </div>
            {/* Action Buttons */}
            <div className="px-4 pb-4 pt-2 flex gap-2">
              <button
                onClick={() => downloadQrAsJpg(p)}
                className="flex-1 py-2 rounded-lg text-white text-xs font-medium flex items-center justify-center gap-1"
                style={{ background: COLORS.accent }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download QR JPG
              </button>
              <button
                onClick={() => printCard(p)}
                className="flex-1 py-2 rounded-lg text-white text-xs font-medium flex items-center justify-center gap-1"
                style={{ background: COLORS.primary }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Cetak Kartu
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ LOADING SPINNER ============
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#e5e7eb', borderTopColor: COLORS.primary }} />
    </div>
  );
}
