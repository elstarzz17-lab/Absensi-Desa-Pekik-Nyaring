(() => {
  'use strict';

  const root = document.getElementById('app');
  const state = {
    admin: null,
    csrf: '',
    tab: 'scan',
    devices: [],
    devicesLoaded: false,
    dashboard: null,
    history: [],
    historyFrom: '',
    historyTo: '',
    historySearch: '',
    deviceSearch: '',
    deviceStatus: '',
    scanMode: 'DATANG',
    stream: null,
    scannerTimer: null,
    lastScan: '',
    setupRequired: false,
  };
  const tabs = [
    { id: 'scan', label: 'Pindai QR', icon: '▦' },
    { id: 'dashboard', label: 'Dashboard', icon: '◫' },
    { id: 'perangkat', label: 'Data Perangkat', icon: '♙' },
    { id: 'riwayat', label: 'Riwayat Absensi', icon: '◷' },
    { id: 'qrcode', label: 'Kartu QR', icon: '▧' },
  ];

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  const label = (value, fallback = '—') => value
    ? String(value).replace(/[-–—]/g, ' ')
    : fallback;
  const nipdLabel = (value) => String(value || '').replace(/-/g, '');
  const todayISO = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
  };
  const monthStart = () => `${todayISO().slice(0, 7)}-01`;
  const dateDisplay = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return esc(value);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric',
    }).format(date);
  };
  const timeDisplay = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit',
    }).format(date);
  };

  function notify(message, type = '') {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      document.body.appendChild(region);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  async function request(url, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && state.csrf) {
      headers.set('X-CSRF-Token', state.csrf);
    }
    const response = await fetch(url, {
      ...options, method, headers, credentials: 'same-origin', cache: 'no-store',
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      const error = new Error(data?.message || `Permintaan gagal (${response.status}).`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return { response, data };
  }

  function displayLogin(message = '', setupRequired = false) {
    stopScanner();
    state.admin = null;
    state.setupRequired = setupRequired;
    root.innerHTML = `
      <div class="login-wrap">
        <section class="login-art" aria-hidden="true">
          <div class="brand-lockup"><img class="brand-mark" src="assets/logo-desa.png" alt=""><span><strong>PEKIK NYARING</strong><small>SISTEM ADMINISTRASI DESA</small></span></div>
          <div class="login-copy"><span class="eyebrow">Tertib · Terukur · Terpercaya</span><h1>Absensi yang<br>lebih tertata.</h1><p>Pengelolaan kehadiran perangkat desa Pekik Nyaring dalam satu ruang kerja yang aman dan mudah digunakan.</p></div>
          <div class="login-foot">Desa Pekik Nyaring · Kecamatan Pondok Kelapa</div>
        </section>
        <section class="login-panel-wrap"><div class="login-panel">
          <div class="brand-lockup-mobile"><img class="brand-mark" src="assets/logo-desa.png" alt=""><span><strong>PEKIK NYARING</strong><small>SISTEM ABSENSI DESA</small></span></div>
          <span class="eyebrow">Ruang administrator</span><h2>Selamat datang</h2>
          <p class="intro">Masuk dengan akun admin untuk mengelola perangkat desa dan catatan kehadiran.</p>
          <form id="login-form" class="form-stack">
            <label class="field">Nama pengguna<input name="username" autocomplete="username" required maxlength="191" autofocus></label>
            <label class="field">Kata sandi<input name="password" type="password" autocomplete="current-password" required></label>
            <div class="error-message" role="alert">${esc(message)}</div>
            <button class="btn btn-primary" type="submit">Masuk ke aplikasi <span aria-hidden="true">→</span></button>
          </form>
          ${setupRequired ? `
          <details class="setup-area">
            <summary>Penyiapan pertama kali</summary>
            <div class="setup-warning">Hanya lakukan saat database masih kosong. Token setup rahasia harus berasal dari file config.php di hosting. Admin tidak dibuat otomatis.</div>
            <form id="setup-form" class="form-stack">
              <label class="field">Token setup<input name="setupToken" type="password" autocomplete="off" required minlength="32"></label>
              <label class="field">Nama pengguna admin<input name="username" autocomplete="username" required maxlength="191"></label>
              <label class="field">Kata sandi admin<span class="help">Gunakan minimal 12 karakter.</span><input name="password" type="password" autocomplete="new-password" required minlength="12"></label>
              <div class="error-message" role="alert"></div>
              <button class="btn btn-gold" type="submit">Buat admin dan kunci setup</button>
            </form>
          </details>` : ''}
        </div></section>
      </div>`;
    document.getElementById('login-form').addEventListener('submit', login);
    const setupForm = document.getElementById('setup-form');
    if (setupForm) setupForm.addEventListener('submit', firstRunSetup);
  }

  async function login(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const errorBox = form.querySelector('.error-message');
    button.disabled = true;
    errorBox.textContent = '';
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify(data),
      });
      state.admin = result.data.admin;
      state.csrf = result.data.csrfToken;
      state.tab = 'scan';
      renderApp();
      notify('Berhasil masuk.');
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  async function firstRunSetup(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const errorBox = form.querySelector('.error-message');
    button.disabled = true;
    errorBox.textContent = '';
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await request('/api/auth/setup', { method: 'POST', body: JSON.stringify(body) });
      displayLogin('Admin berhasil dibuat. Setup telah dikunci; silakan masuk.', false);
      notify('Admin berhasil dibuat. Simpan token setup dengan aman lalu hapus dari config.php.');
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  function navMarkup(className) {
    return `<nav class="${className}" aria-label="Navigasi utama">${tabs.map((tab) => `
      <button class="nav-item ${state.tab === tab.id ? 'active' : ''}" type="button" data-tab="${tab.id}" aria-current="${state.tab === tab.id ? 'page' : 'false'}">
        <span class="nav-icon" aria-hidden="true">${tab.icon}</span><span>${tab.label}</span>
      </button>`).join('')}</nav>`;
  }

  function renderApp() {
    stopScanner();
    const activeTab = tabs.find((tab) => tab.id === state.tab) || tabs[0];
    root.innerHTML = `
      <div class="app-layout">
        <aside class="sidebar">
          <div class="sidebar-brand"><img class="brand-mark" src="assets/logo-desa.png" alt=""><span><strong>Pekik Nyaring</strong><small>ADMINISTRASI DESA</small></span></div>
          <div class="nav-label">MENU UTAMA</div>${navMarkup('nav-list')}
          <div class="sidebar-bottom">
            <div class="admin-chip"><span class="avatar">${esc((state.admin?.username || 'A').slice(0, 1).toUpperCase())}</span><span><strong>${esc(state.admin?.username || 'Administrator')}</strong><small>Administrator</small></span></div>
            <button class="btn logout-button" id="logout-button" type="button"><span aria-hidden="true">↪</span> Keluar dengan aman</button>
          </div>
        </aside>
        <main class="main-column">
          <header class="topbar">
            <div class="topbar-left"><div><div class="crumb">Administrasi / ${activeTab.label}</div><div class="page-heading">${activeTab.label}</div></div></div>
            <div class="topbar-right"><span class="date-pill">${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium' }).format(new Date())}</span><span class="avatar">${esc((state.admin?.username || 'A').slice(0, 1).toUpperCase())}</span></div>
          </header>
          <section class="content" id="view-${state.tab}"><div class="loading">Memuat data…</div></section>
        </main>
      </div>
      ${navMarkup('mobile-nav')}
      <dialog class="dialog" id="device-dialog"></dialog>
      <div class="toast-region" aria-live="polite" aria-atomic="true"></div>`;
    root.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
      state.tab = button.dataset.tab;
      renderApp();
    }));
    document.getElementById('logout-button').addEventListener('click', logout);
    if (state.tab === 'scan') renderScanner();
    if (state.tab === 'dashboard') renderDashboard();
    if (state.tab === 'perangkat') renderDevices();
    if (state.tab === 'riwayat') renderHistory();
    if (state.tab === 'qrcode') renderQrCards();
  }

  async function logout() {
    try {
      await request('/api/auth/logout', { method: 'POST', body: '{}' });
    } catch (error) {
      if (error.status !== 401) notify(error.message, 'error');
    }
    state.csrf = '';
    state.dashboard = null;
    state.devices = [];
    state.devicesLoaded = false;
    displayLogin('Sesi administrator telah ditutup.');
  }

  async function getDevices(force = false) {
    if (!force && state.devicesLoaded) return state.devices;
    const result = await request('/api/perangkat');
    state.devices = result.data.data || [];
    state.devicesLoaded = true;
    return state.devices;
  }

  function renderScanner() {
    const view = document.getElementById('view-scan');
    view.innerHTML = `
      <div class="view-header"><div><span class="section-label">Pencatatan kehadiran</span><h1>Absensi perangkat desa</h1><p>Pindai kartu QR atau masukkan NIPD/NIK secara manual. Input manual tetap tersedia jika kamera tidak didukung.</p></div></div>
      <div class="scanner-grid">
        <article class="card scanner-card">
          <div class="scanner-head"><div class="card-title">Pindai kartu QR</div><div class="card-subtitle">Arahkan kode ke dalam bingkai. Izinkan kamera saat browser meminta akses.</div></div>
          <div class="scanner-stage" id="scanner-stage"><div class="scan-placeholder" id="scanner-placeholder">Kamera belum diaktifkan.<br>Alternatif: masukkan NIK atau NIPD pada form di samping.</div><div class="scan-reticle"></div></div>
          <div class="scanner-controls"><button class="btn btn-primary" type="button" id="camera-start">Aktifkan kamera</button><button class="btn btn-outline" type="button" id="camera-stop" disabled>Hentikan kamera</button></div>
        </article>
        <article class="card scan-form">
          <span class="section-label">Input manual</span><h3>Catat kehadiran</h3><p>Ketik NIK 16 digit atau NIPD. Tanda hubung pada NIPD boleh dihilangkan.</p>
          <div class="mode-toggle" role="group" aria-label="Pilih jenis absensi"><button class="mode-option active" data-mode="DATANG" type="button">Absen Datang</button><button class="mode-option" data-mode="PULANG" type="button">Absen Pulang</button></div>
          <form id="attendance-form" class="form-stack">
            <label class="field">NIK / NIPD<input name="identity" id="attendance-identity" autocomplete="off" placeholder="Ketik atau pindai kode" required></label>
            <button class="btn btn-gold" type="submit">Simpan absensi</button>
            <div class="error-message" id="attendance-error" role="alert"></div>
          </form>
          <div id="attendance-result"></div>
        </article>
      </div>`;
    view.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
      state.scanMode = button.dataset.mode;
      view.querySelectorAll('[data-mode]').forEach((item) => item.classList.toggle('active', item === button));
    }));
    document.getElementById('attendance-form').addEventListener('submit', submitAttendance);
    document.getElementById('camera-start').addEventListener('click', startScanner);
    document.getElementById('camera-stop').addEventListener('click', stopScanner);
  }

  async function startScanner() {
    const stage = document.getElementById('scanner-stage');
    const placeholder = document.getElementById('scanner-placeholder');
    if (!stage || !placeholder) return;
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      placeholder.textContent = 'Pemindai QR tidak didukung browser ini. Gunakan input NIK/NIPD manual — fitur ini selalu tersedia.';
      notify('Kamera QR tidak didukung; silakan gunakan input manual.', 'error');
      return;
    }
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      stage.innerHTML = '<video id="scanner-video" muted playsinline></video><div class="scan-reticle"></div>';
      const video = document.getElementById('scanner-video');
      video.srcObject = state.stream;
      await video.play();
      document.getElementById('camera-start').disabled = true;
      document.getElementById('camera-stop').disabled = false;
      const tick = async () => {
        if (!state.stream || !video.isConnected || video.readyState < 2) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length && codes[0].rawValue) {
            const value = extractIdentity(codes[0].rawValue);
            if (value && value !== state.lastScan) {
              state.lastScan = value;
              stopScanner();
              const input = document.getElementById('attendance-identity');
              if (input) {
                input.value = value;
                await submitAttendance(new Event('submit', { cancelable: true }));
              }
            }
          }
        } catch { /* Continue scanning while the camera frame is not ready. */ }
        if (state.stream) state.scannerTimer = window.setTimeout(tick, 280);
      };
      state.scannerTimer = window.setTimeout(tick, 350);
    } catch (error) {
      stopScanner();
      const currentPlaceholder = document.getElementById('scanner-placeholder');
      if (currentPlaceholder) currentPlaceholder.textContent = 'Kamera tidak dapat dibuka. Periksa izin browser atau masukkan NIK/NIPD secara manual.';
      notify(error.message || 'Kamera tidak dapat dibuka.', 'error');
    }
  }

  function stopScanner() {
    if (state.scannerTimer) window.clearTimeout(state.scannerTimer);
    state.scannerTimer = null;
    if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
    const start = document.getElementById('camera-start');
    const stop = document.getElementById('camera-stop');
    if (start) start.disabled = false;
    if (stop) stop.disabled = true;
    const stage = document.getElementById('scanner-stage');
    if (stage && !document.getElementById('scanner-placeholder')) {
      stage.innerHTML = '<div class="scan-placeholder" id="scanner-placeholder">Kamera dihentikan. Gunakan tombol kamera atau input manual.</div><div class="scan-reticle"></div>';
    }
  }

  function extractIdentity(raw) {
    const text = String(raw).trim();
    try {
      const payload = JSON.parse(text);
      return String(payload.nipd || payload.nik || '').trim();
    } catch {
      return text;
    }
  }

  async function submitAttendance(event) {
    event.preventDefault();
    const input = document.getElementById('attendance-identity');
    const errorBox = document.getElementById('attendance-error');
    const resultBox = document.getElementById('attendance-result');
    const button = document.querySelector('#attendance-form button[type="submit"]');
    if (!input || !input.value.trim()) return;
    button.disabled = true;
    errorBox.textContent = '';
    resultBox.innerHTML = '';
    try {
      const result = await request('/api/absensi', {
        method: 'POST',
        body: JSON.stringify({ nipd: input.value.trim(), tipe: state.scanMode }),
      });
      const attendance = result.data.data;
      resultBox.innerHTML = `<div class="result-box"><strong>Absensi berhasil disimpan</strong><small>${esc(label(attendance.perangkatDesa.namaLengkap))} · ${esc(state.scanMode === 'DATANG' ? 'Datang' : 'Pulang')} · ${esc(timeDisplay(attendance.tanggal))} WIB</small></div>`;
      input.value = '';
      state.lastScan = '';
      notify('Absensi berhasil disimpan.');
      if (state.tab === 'dashboard') renderDashboard();
      if (state.tab === 'riwayat') renderHistory();
    } catch (error) {
      errorBox.textContent = error.message;
      state.lastScan = '';
    } finally {
      button.disabled = false;
      input.focus();
    }
  }

  async function renderDashboard() {
    const view = document.getElementById('view-dashboard');
    try {
      const result = await request('/api/dashboard');
      state.dashboard = result.data.data;
      const data = state.dashboard;
      const max = Math.max(1, ...data.tren7Hari.map((day) => day.hadir));
      view.innerHTML = `
        <div class="view-header"><div><span class="section-label">Ringkasan kehadiran</span><h1>Dashboard</h1><p>Rekap terkini kehadiran perangkat Desa Pekik Nyaring.</p></div><button class="btn btn-outline" id="dash-refresh" type="button">↻ Perbarui</button></div>
        <div class="stats-grid">
          <article class="card stat-card"><div class="stat-label">TOTAL PERANGKAT</div><div class="stat-value">${Number(data.totalPerangkat) || 0}</div><div class="stat-note">${Number(data.totalAktif) || 0} aktif · ${Number(data.totalPasif) || 0} pasif</div></article>
          <article class="card stat-card"><div class="stat-label">HADIR HARI INI</div><div class="stat-value">${Number(data.hadirHariIni) || 0}</div><div class="stat-note">dari ${Number(data.totalPerangkat) || 0} perangkat</div></article>
          <article class="card stat-card"><div class="stat-label">ABSEN PULANG</div><div class="stat-value">${Number(data.pulangHariIni) || 0}</div><div class="stat-note">catatan pulang hari ini</div></article>
          <article class="card stat-card"><div class="stat-label">PERSENTASE HADIR</div><div class="stat-value">${Number(data.persentaseKehadiran) || 0}<span style="font-size:19px">%</span></div><div class="stat-note">perangkat tercatat hadir hari ini</div></article>
        </div>
        <div class="dashboard-grid">
          <article class="card"><div class="card-title-row"><div><div class="card-title">Tren kehadiran</div><div class="card-subtitle">Jumlah perangkat absen datang selama 7 hari terakhir</div></div><span class="badge">7 hari</span></div>
            <div class="chart">${data.tren7Hari.map((day) => `<div class="chart-item"><span class="chart-value">${Number(day.hadir) || 0}</span><div class="chart-track"><div class="chart-bar" style="height:${Math.max(3, (Number(day.hadir) || 0) / max * 100)}%"></div></div><span class="chart-label">${esc(day.hari)}</span></div>`).join('')}</div>
          </article>
          <article class="card"><div class="card-title-row"><div><div class="card-title">Aktivitas terbaru</div><div class="card-subtitle">Catatan absensi terakhir</div></div></div>
            <div class="list-compact">${data.aktivitasTerbaru.length ? data.aktivitasTerbaru.map((row) => `<div class="list-row"><div class="person"><strong>${esc(label(row.perangkatDesa.namaLengkap))}</strong><small>${esc(nipdLabel(row.perangkatDesa.nipd))} · ${esc(dateDisplay(row.tanggal))}</small></div><span class="badge ${row.tipe === 'PULANG' ? 'gold' : ''}">${row.tipe === 'PULANG' ? 'Pulang' : 'Datang'} · ${esc(timeDisplay(row.tanggal))}</span></div>`).join('') : '<div class="empty-state">Belum ada aktivitas absensi.</div>'}</div>
          </article>
          <article class="card" style="grid-column:1/-1"><div class="card-title-row"><div><div class="card-title">Absensi hari ini</div><div class="card-subtitle">${Number(data.absensiHariIni.length) || 0} catatan tersimpan</div></div></div>
            ${data.absensiHariIni.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Perangkat</th><th>NIPD</th><th>Jabatan</th><th>Jenis</th><th>Waktu</th><th>Status</th></tr></thead><tbody>${data.absensiHariIni.map((row) => `<tr><td class="main-cell">${esc(label(row.perangkatDesa.namaLengkap))}</td><td>${esc(nipdLabel(row.perangkatDesa.nipd))}</td><td>${esc(label(row.perangkatDesa.jabatan))}</td><td><span class="badge ${row.tipe === 'PULANG' ? 'gold' : ''}">${row.tipe === 'PULANG' ? 'Pulang' : 'Datang'}</span></td><td>${esc(timeDisplay(row.tanggal))} WIB</td><td><span class="badge ${row.kategori === 'PASIF' ? 'gray' : ''}">${esc(label(row.kategori))}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><div class="empty-icon">◷</div>Belum ada absensi hari ini.</div>'}
          </article>
          <article class="card" style="grid-column:1/-1"><div class="card-title-row"><div><div class="card-title">Rekap 30 hari terakhir</div><div class="card-subtitle">Jumlah catatan datang dan pulang per perangkat</div></div></div>
            ${data.rekap30Hari.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Perangkat</th><th>NIPD</th><th>Jabatan</th><th>Datang</th><th>Pulang</th><th>Status</th></tr></thead><tbody>${data.rekap30Hari.map((row) => `<tr><td class="main-cell">${esc(label(row.namaLengkap))}</td><td>${esc(nipdLabel(row.nipd))}</td><td>${esc(label(row.jabatan))}</td><td>${Number(row.hadir) || 0}</td><td>${Number(row.pulang) || 0}</td><td><span class="badge ${row.status === 'PASIF' ? 'gray' : ''}">${esc(label(row.status))}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">Belum ada perangkat terdaftar.</div>'}
          </article>
        </div>`;
      document.getElementById('dash-refresh').addEventListener('click', renderDashboard);
    } catch (error) {
      view.innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><strong>Dashboard belum dapat dimuat</strong><p>${esc(error.message)}</p><button class="btn btn-outline" id="dash-retry" type="button">Coba lagi</button></div>`;
      document.getElementById('dash-retry').addEventListener('click', renderDashboard);
    }
  }

  async function renderDevices() {
    const view = document.getElementById('view-perangkat');
    try {
      const devices = await getDevices(true);
      const rows = devices.filter((item) => {
        const terms = `${item.namaLengkap} ${item.nipd} ${item.nik || ''} ${item.jabatan}`.toLowerCase();
        return terms.includes(state.deviceSearch.toLowerCase())
          && (!state.deviceStatus || item.status === state.deviceStatus);
      });
      view.innerHTML = `
        <div class="view-header"><div><span class="section-label">Data induk</span><h1>Perangkat desa</h1><p>Kelola identitas, jabatan, status aktif, dan kartu identifikasi perangkat.</p></div><button class="btn btn-gold" id="add-device" type="button">＋ Tambah perangkat</button></div>
        <div class="card toolbar"><input class="toolbar-input" id="device-search" type="search" value="${esc(state.deviceSearch)}" placeholder="Cari nama, NIPD, NIK, atau jabatan…"><select class="toolbar-select" id="device-status"><option value="">Semua status</option><option value="AKTIF" ${state.deviceStatus === 'AKTIF' ? 'selected' : ''}>Aktif</option><option value="PASIF" ${state.deviceStatus === 'PASIF' ? 'selected' : ''}>Pasif</option><span class="badge">${rows.length} perangkat</span></div>
        <article class="card">
          ${rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Nama perangkat</th><th>NIPD</th><th>Jabatan</th><th>NIK</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map((item) => `<tr>
            <td class="main-cell">${esc(label(item.namaLengkap))}<span class="sub-cell">${esc(label(item.desa))}, ${esc(label(item.kecamatan))}</span></td>
            <td>${esc(nipdLabel(item.nipd))}</td><td>${esc(label(item.jabatan))}</td><td>${esc(item.nik || '—')}</td>
            <td><span class="badge ${item.status === 'PASIF' ? 'gray' : ''}">${item.status === 'AKTIF' ? 'Aktif' : 'Pasif'}</span></td>
            <td><div class="button-row"><button class="btn btn-soft btn-small" data-edit="${esc(item.id)}" type="button">Ubah</button><button class="btn btn-danger btn-small" data-delete="${esc(item.id)}" type="button">Hapus</button></div></td>
          </tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">♙</div>${devices.length ? 'Tidak ada perangkat sesuai pencarian.' : 'Belum ada perangkat desa.'}</div>`}
          <div class="pagination-note">${rows.length} dari ${devices.length} perangkat</div>
        </article>`;
      document.getElementById('device-search').addEventListener('input', (event) => {
        state.deviceSearch = event.target.value;
        renderDevices();
        const next = document.getElementById('device-search');
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      });
      document.getElementById('device-status').addEventListener('change', (event) => {
        state.deviceStatus = event.target.value;
        renderDevices();
      });
      document.getElementById('add-device').addEventListener('click', () => showDeviceDialog());
      view.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => {
        const device = devices.find((item) => item.id === button.dataset.edit);
        if (device) showDeviceDialog(device);
      }));
      view.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteDevice(button.dataset.delete)));
    } catch (error) {
      view.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`;
    }
  }

  function showDeviceDialog(device = null) {
    const dialog = document.getElementById('device-dialog');
    const editing = Boolean(device);
    const value = (key) => esc(device?.[key] || '');
    dialog.innerHTML = `
      <form id="device-form">
        <div class="dialog-head"><div><span class="section-label">${editing ? 'Perbarui data' : 'Data baru'}</span><h2>${editing ? 'Ubah perangkat' : 'Tambah perangkat'}</h2></div><button class="icon-button" type="button" data-close aria-label="Tutup">×</button></div>
        <div class="dialog-body">
          ${editing ? `<div class="setup-warning" style="margin-bottom:14px">NIPD dibuat saat data ditambahkan dan tidak berubah saat data diperbarui: <strong>${esc(nipdLabel(device.nipd))}</strong></div>` : ''}
          <div class="device-form-grid">
            <label class="field span-two">Nama lengkap<input name="namaLengkap" value="${value('namaLengkap')}" required maxlength="191"></label>
            <label class="field">NIK (16 digit)<input name="nik" value="${value('nik')}" inputmode="numeric" maxlength="32"></label>
            <label class="field">Tempat, tanggal lahir<input name="tempatTanggalLahir" value="${value('tempatTanggalLahir')}" placeholder="Contoh: Bengkulu, 06-08-1985"></label>
            <label class="field">Jabatan<input name="jabatan" value="${value('jabatan')}" required maxlength="191"></label>
            <label class="field">Status<select name="status"><option value="AKTIF" ${!device || device.status === 'AKTIF' ? 'selected' : ''}>Aktif</option><option value="PASIF" ${device?.status === 'PASIF' ? 'selected' : ''}>Pasif</option></select></label>
            <label class="field">Jenis kelamin<input name="jenisKelamin" value="${value('jenisKelamin')}"></label>
            <label class="field">Pendidikan terakhir<input name="pendidikanTerakhir" value="${value('pendidikanTerakhir')}"></label>
            <label class="field">Nomor SK<input name="nomorSK" value="${value('nomorSK')}"></label>
            <label class="field">Kecamatan<input name="kecamatan" value="${value('kecamatan') || 'Pondok Kelapa'}"></label>
            <label class="field">Desa<input name="desa" value="${value('desa') || 'Pekik Nyaring'}"></label>
            <label class="field span-two">Keterangan<textarea name="keterangan">${value('keterangan')}</textarea></label>
            ${!editing ? '<p class="help span-two">NIPD dibuat otomatis dari nama dan tanggal lahir, atau dari tanggal lahir dalam NIK. NIPD ditampilkan tanpa tanda hubung, kecuali pada kartu QR.</p>' : ''}
          </div>
          <div class="error-message" id="device-error" role="alert"></div>
        </div>
        <div class="dialog-foot"><button class="btn btn-outline" type="button" data-close>Batal</button><button class="btn btn-primary" type="submit">${editing ? 'Simpan perubahan' : 'Simpan perangkat'}</button></div>
      </form>`;
    dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('#device-form').addEventListener('submit', (event) => saveDevice(event, device));
    dialog.showModal();
  }

  async function saveDevice(event, current) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await request(current ? `/api/perangkat/${encodeURIComponent(current.id)}` : '/api/perangkat', {
        method: current ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      document.getElementById('device-dialog').close();
      state.devices = [];
      state.devicesLoaded = false;
      notify(current ? 'Data perangkat diperbarui.' : 'Perangkat baru berhasil ditambahkan.');
      renderDevices();
    } catch (error) {
      document.getElementById('device-error').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  async function deleteDevice(id) {
    const device = state.devices.find((item) => item.id === id);
    if (!device || !window.confirm(`Hapus data ${device.namaLengkap}? Riwayat absensinya juga akan dihapus.`)) return;
    try {
      await request(`/api/perangkat/${encodeURIComponent(id)}`, { method: 'DELETE' });
      state.devices = [];
      state.devicesLoaded = false;
      notify('Data perangkat dan riwayat terkait telah dihapus.');
      renderDevices();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function renderHistory() {
    const view = document.getElementById('view-riwayat');
    const from = state.historyFrom || monthStart();
    const to = state.historyTo || todayISO();
    state.historyFrom = from;
    state.historyTo = to;
    view.innerHTML = `
      <div class="view-header"><div><span class="section-label">Rekap kehadiran</span><h1>Riwayat absensi</h1><p>Filter catatan per periode dan unduh rekap untuk arsip desa.</p></div><div class="button-row"><button class="btn btn-outline" id="history-csv" type="button">Unduh CSV</button><button class="btn btn-gold" id="history-xlsx" type="button">↓ Unduh XLSX</button></div></div>
      <div class="card toolbar"><label class="field" style="font-size:11px">Dari<input class="toolbar-input toolbar-date" type="date" id="history-from" value="${esc(from)}"></label><label class="field" style="font-size:11px">Sampai<input class="toolbar-input toolbar-date" type="date" id="history-to" value="${esc(to)}"></label><input class="toolbar-input" id="history-search" type="search" value="${esc(state.historySearch)}" placeholder="Cari nama, NIPD, atau NIK…"><button class="btn btn-soft" id="history-filter" type="button">Terapkan filter</button></div>
      <article class="card" id="history-table"><div class="loading">Memuat riwayat…</div></article>`;
    document.getElementById('history-filter').addEventListener('click', () => {
      state.historyFrom = document.getElementById('history-from').value;
      state.historyTo = document.getElementById('history-to').value;
      state.historySearch = document.getElementById('history-search').value.trim();
      renderHistory();
    });
    document.getElementById('history-csv').addEventListener('click', () => downloadCsv(state.history));
    document.getElementById('history-xlsx').addEventListener('click', downloadXlsx);
    try {
      const params = new URLSearchParams({ from, to });
      if (state.historySearch) params.set('search', state.historySearch);
      const result = await request(`/api/absensi?${params}`);
      state.history = result.data.data || [];
      const table = document.getElementById('history-table');
      if (!table) return;
      table.innerHTML = state.history.length ? `
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal</th><th>Nama perangkat</th><th>NIPD</th><th>Jabatan</th><th>Jenis</th><th>Waktu</th><th>Kategori</th></tr></thead><tbody>
        ${state.history.map((row) => `<tr><td>${esc(dateDisplay(row.tanggal))}</td><td class="main-cell">${esc(label(row.perangkatDesa.namaLengkap))}</td><td>${esc(nipdLabel(row.perangkatDesa.nipd))}</td><td>${esc(label(row.perangkatDesa.jabatan))}</td><td><span class="badge ${row.tipe === 'PULANG' ? 'gold' : ''}">${row.tipe === 'PULANG' ? 'Pulang' : 'Datang'}</span></td><td>${esc(timeDisplay(row.tanggal))} WIB</td><td><span class="badge ${row.kategori === 'PASIF' ? 'gray' : ''}">${esc(label(row.kategori))}</span></td></tr>`).join('')}
        </tbody></table></div><div class="pagination-note">${state.history.length} catatan pada periode ini</div>` : '<div class="empty-state"><div class="empty-icon">◷</div>Tidak ada absensi pada rentang tanggal ini.</div>';
    } catch (error) {
      const table = document.getElementById('history-table');
      if (table) table.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`;
    }
  }

  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCsv(rows) {
    const values = [
      ['Tanggal', 'NIPD', 'Nama Lengkap', 'Jabatan', 'Jenis', 'Status', 'Waktu', 'GPS'],
      ...rows.map((row) => [
        dateDisplay(row.tanggal),
        row.perangkatDesa?.nipd || '',
        row.perangkatDesa?.namaLengkap || '',
        row.perangkatDesa?.jabatan || '',
        row.tipe === 'PULANG' ? 'Pulang' : 'Datang',
        row.kategori || '',
        timeDisplay(row.tanggal),
        row.gpsLat && row.gpsLng ? `${row.gpsLat}, ${row.gpsLng}` : '',
      ]),
    ];
    const csv = '\uFEFF' + values.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap-Absensi-${state.historyFrom}-sd-${state.historyTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Berkas CSV berhasil diunduh.');
  }

  async function downloadXlsx() {
    const button = document.getElementById('history-xlsx');
    button.disabled = true;
    try {
      const params = new URLSearchParams({ from: state.historyFrom, to: state.historyTo });
      if (state.historySearch) params.set('search', state.historySearch);
      const response = await fetch(`/api/absensi/export?${params}`, { credentials: 'same-origin', cache: 'no-store' });
      const type = response.headers.get('content-type') || '';
      if (response.ok && type.includes('spreadsheetml')) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Rekap-Absensi-${state.historyFrom}-sd-${state.historyTo}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        notify('Berkas Excel berhasil diunduh.');
        return;
      }
      const error = type.includes('application/json') ? await response.json() : { message: 'Ekspor XLSX gagal.' };
      notify(`${error.message || 'Ekspor XLSX gagal.'} Mengunduh CSV sebagai alternatif.`, 'error');
      downloadCsv(state.history);
    } catch (error) {
      notify(`${error.message} Mengunduh CSV sebagai alternatif.`, 'error');
      downloadCsv(state.history);
    } finally {
      button.disabled = false;
    }
  }

  async function renderQrCards() {
    const view = document.getElementById('view-qrcode');
    view.innerHTML = `
      <div class="view-header"><div><span class="section-label">Identitas perangkat</span><h1>Kartu QR perangkat</h1><p>Unduh atau cetak kartu. NIPD ditampilkan dengan tanda hubung pada kartu untuk memudahkan pembacaan.</p></div><div class="button-row"><button class="btn btn-outline" id="qr-download-all" type="button">Unduh semua PNG</button><button class="btn btn-gold" id="qr-print" type="button">Cetak kartu</button></div></div>
      <div class="card toolbar"><input class="toolbar-input" id="qr-search" type="search" placeholder="Cari nama atau NIPD…"><span class="help">QR berisi NIPD, NIK, dan nama untuk pemindaian.</span></div>
      <div class="qr-grid" id="qr-grid"><div class="card loading">Menyiapkan kartu QR…</div></div>`;
    try {
      await getDevices(true);
      const grid = document.getElementById('qr-grid');
      if (!grid) return;
      if (!window.QRCode?.toDataURL) throw new Error('Generator QR lokal tidak dapat dimuat.');
      const cards = [];
      for (const device of state.devices) {
        const payload = JSON.stringify({ nipd: device.nipd, nik: device.nik || '', nama: device.namaLengkap });
        const image = await window.QRCode.toDataURL(payload, {
          width: 220, margin: 2, color: { dark: '#173b2b', light: '#ffffff' },
        });
        cards.push(`<article class="card qr-card" data-search="${esc(`${device.namaLengkap} ${device.nipd}`.toLowerCase())}">
          <img class="qr-seal" src="${image}" alt="Kode QR ${esc(device.namaLengkap)}">
          <div class="qr-name">${esc(device.namaLengkap)}</div><div class="qr-job">${esc(device.jabatan)}</div>
          <div class="qr-code-label">${esc(device.nipd)}</div><div class="qr-meta">${esc(device.nik || 'NIK tidak dicantumkan')} · ${esc(device.desa || 'Pekik Nyaring')}</div>
          <div class="button-row qr-card-actions no-print"><button class="btn btn-soft btn-small" data-download-qr="${esc(device.id)}" type="button">Unduh PNG</button></div>
        </article>`);
      }
      grid.innerHTML = cards.length ? cards.join('') : '<div class="card empty-state">Tambahkan perangkat untuk membuat kartu QR.</div>';
      document.getElementById('qr-search').addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        grid.querySelectorAll('.qr-card').forEach((card) => {
          card.hidden = !card.dataset.search.includes(query);
        });
      });
      grid.querySelectorAll('[data-download-qr]').forEach((button) => button.addEventListener('click', () => {
        const device = state.devices.find((item) => item.id === button.dataset.downloadQr);
        const image = button.closest('.qr-card').querySelector('img').src;
        if (device) downloadDataUrl(image, `QR-${device.nipd}-${device.namaLengkap.replace(/\s+/g, '-')}.png`);
      }));
      document.getElementById('qr-download-all').addEventListener('click', async () => {
        const buttons = [...grid.querySelectorAll('[data-download-qr]')];
        buttons.forEach((button, index) => window.setTimeout(() => button.click(), index * 250));
      });
      document.getElementById('qr-print').addEventListener('click', () => window.print());
    } catch (error) {
      document.getElementById('qr-grid').innerHTML = `<div class="card empty-state">${esc(error.message)}</div>`;
    }
  }

  function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  async function boot() {
    try {
      const session = await request('/api/auth/session');
      state.admin = session.data.admin;
      state.csrf = session.data.csrfToken;
      renderApp();
    } catch (error) {
      if (error.status === 401) {
        try {
          const setup = await request('/api/auth/setup/status');
          displayLogin('', Boolean(setup.data.setupRequired));
        } catch (setupError) {
          displayLogin(setupError.message, false);
        }
      } else {
        displayLogin(error.message, false);
      }
    }
  }

  boot();
})();
