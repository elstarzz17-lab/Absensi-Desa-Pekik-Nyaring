"use client";

import { useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Crosshair,
  Download,
  Info,
  Layers3,
  MapPin,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  Route,
  SlidersHorizontal,
  Trees,
} from "lucide-react";
import styles from "./page.module.css";

type LayerKey = "area" | "habitat" | "access" | "path" | "plg";

const layerOptions: { id: LayerKey; label: string; color: string }[] = [
  { id: "area", label: "Kawasan studi (ilustrasi)", color: "areaSwatch" },
  { id: "habitat", label: "Tutupan habitat contoh", color: "habitatSwatch" },
  { id: "access", label: "Sungai & akses contoh", color: "accessSwatch" },
  { id: "path", label: "Koridor model (ilustrasi)", color: "pathSwatch" },
  { id: "plg", label: "PLG Seblat · konteks", color: "plgSwatch" },
];

const workflow = [
  {
    number: "01",
    title: "Tentukan batas studi",
    detail: "Tetapkan area kajian dan unit analisis bersama pembimbing.",
    state: "Perlu ditetapkan",
  },
  {
    number: "02",
    title: "Siapkan data terverifikasi",
    detail: "Kumpulkan tutupan lahan, elevasi, sungai, jalan, dan sumbernya.",
    state: "Data belum tersedia",
  },
  {
    number: "03",
    title: "Susun permukaan biaya",
    detail: "Dokumentasikan asumsi resistansi setiap kelas tutupan lahan.",
    state: "Menunggu input",
  },
  {
    number: "04",
    title: "Evaluasi & validasi",
    detail: "Tinjau hasil model dengan ahli dan bukti lapangan yang layak.",
    state: "Belum dimulai",
  },
];

export default function KonektivitasGajahPage() {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    area: true,
    habitat: true,
    access: true,
    path: true,
    plg: true,
  });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [activeNav, setActiveNav] = useState("peta");
  const [notice, setNotice] = useState("");
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

  const toggleLayer = (id: LayerKey) => {
    setLayers((current) => ({ ...current, [id]: !current[id] }));
  };

  const zoomBy = (change: number) => setZoom((current) => Math.min(2.2, Math.max(0.8, current + change)));
  const resetMap = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const panMap = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.originX + event.clientX - drag.current.x,
      y: drag.current.originY + event.clientY - drag.current.y,
    });
  };

  const stopPan = () => {
    drag.current = null;
  };

  const navigateTo = (section: string) => {
    setActiveNav(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={styles.site}>
      <header className={styles.header}>
        <a className={styles.brand} href="#peta" onClick={() => setActiveNav("peta")} aria-label="Kembali ke peta">
          <span className={styles.brandMark}><Trees size={19} strokeWidth={1.8} /></span>
          <span className={styles.brandText}>
            <strong>SEBLAT</strong>
            <small>LAB KONEKTIVITAS · PROTOTIPE</small>
          </span>
        </a>
        <nav className={styles.nav} aria-label="Navigasi utama">
          {[
            ["peta", "Peta"],
            ["metode", "Metode"],
            ["data", "Data"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${styles.navItem} ${activeNav === id ? styles.navActive : ""}`}
              onClick={() => navigateTo(id)}
              aria-current={activeNav === id ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className={styles.headerMeta}>
          <span className={styles.versionDot} />
          <span>PROTOTIPE AKADEMIK</span>
          <span className={styles.headerDivider} />
          <span>TA 2026</span>
        </div>
      </header>

      <main>
        <section className={styles.intro} aria-labelledby="page-title">
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}><span>01</span> · RANCANGAN PENELITIAN GIS</p>
            <h1 id="page-title">Membaca ruang,<br /><em>merancang konektivitas.</em></h1>
            <p className={styles.introText}>
              Eksplorasi awal potensi keterhubungan habitat gajah di sekitar TWA Seblat.
              Peta ini adalah kanvas kerja, bukan gambaran kondisi lapangan.
            </p>
          </div>
          <div className={styles.introAside}>
            <span className={styles.asideLabel}>WILAYAH KONTEKS</span>
            <strong>Bengkulu Utara</strong>
            <span>Sumatera · Indonesia</span>
            <span className={styles.coordNote}>Batas studi belum ditetapkan</span>
          </div>
        </section>

        <section className={styles.noticeBanner} aria-label="Status data">
          <div className={styles.noticeIcon}><Info size={17} /></div>
          <div>
            <strong>Semua lapisan peta bersifat skematis.</strong>
            <span>Belum ada data geospasial terverifikasi atau data pergerakan gajah yang dimuat.</span>
          </div>
          <span className={styles.demoTag}>DATA DEMO</span>
        </section>

        <section id="peta" className={styles.workspace} aria-label="Ruang kerja peta">
          <div className={styles.mapColumn}>
            <div className={styles.mapHeader}>
              <div>
                <div className={styles.sectionKicker}><span className={styles.kickerLine} /> RUANG KERJA</div>
                <h2>Sketsa lanskap Seblat</h2>
              </div>
              <div className={styles.mapHeaderActions}>
                <span className={styles.mapBadge}><span /> SKEMATIS</span>
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={resetMap}
                  aria-label="Atur ulang posisi dan zoom peta"
                  title="Atur ulang peta"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            <div
              className={styles.mapViewport}
              onPointerDown={startPan}
              onPointerMove={panMap}
              onPointerUp={stopPan}
              onPointerCancel={stopPan}
              onLostPointerCapture={stopPan}
              aria-label="Peta skematis yang dapat digeser dan diperbesar. Gunakan tombol zoom untuk kontrol aksesibel."
              role="application"
              tabIndex={0}
            >
              <div
                className={styles.mapArtwork}
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
              >
                <svg className={styles.mapSvg} viewBox="0 0 1200 720" aria-hidden="true">
                  <defs>
                    <pattern id="mapGrid" width="52" height="52" patternUnits="userSpaceOnUse">
                      <path d="M52 0H0V52" fill="none" stroke="#62705a" strokeOpacity=".11" strokeWidth="1" />
                    </pattern>
                    <pattern id="forestPattern" width="24" height="24" patternUnits="userSpaceOnUse">
                      <circle cx="5" cy="7" r="2.1" fill="#507354" fillOpacity=".33" />
                      <circle cx="17" cy="16" r="1.4" fill="#507354" fillOpacity=".24" />
                    </pattern>
                    <pattern id="parkPattern" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                      <path d="M0 0V14" stroke="#82935c" strokeOpacity=".42" strokeWidth="2" />
                    </pattern>
                    <clipPath id="landClip">
                      <path d="M0 16 128 0l104 28 113-13 92 41 105-14 92 29 106-17 108 43 99-7 95 54 116-19 42 53-18 73 23 76-48 74 12 84-54 61 7 71-101 25-83-31-105 25-105-33-90 34-113-41-109 26-79-42-98 12-115-31-94 14-41-73 15-89-28-60 31-72-10-63 34-59-4-66Z" />
                    </clipPath>
                  </defs>
                  <rect width="1200" height="720" fill="#e7e6d4" />
                  <rect width="1200" height="720" fill="url(#mapGrid)" />
                  <g clipPath="url(#landClip)">
                    <path d="M0 16 128 0l104 28 113-13 92 41 105-14 92 29 106-17 108 43 99-7 95 54 116-19 42 53-18 73 23 76-48 74 12 84-54 61 7 71-101 25-83-31-105 25-105-33-90 34-113-41-109 26-79-42-98 12-115-31-94 14-41-73 15-89-28-60 31-72-10-63 34-59-4-66Z" fill="#e4e4d0" />
                    <path d="M72 40c90 33 126 25 183 74s74 83 144 98 94-19 154 9 63 67 142 79 116-13 177 11 88 73 159 72 105-38 167 12M-7 168c89 20 137-7 193 31s78 91 151 98 117-39 169-8 62 92 133 101 114-30 173-2 67 98 154 100 110-38 213 8M28 329c74-18 139-5 176 42s52 104 119 128 111-22 167 9 71 70 127 78 105-32 154-7 71 82 150 97 133-12 244 26" fill="none" stroke="#b7b99f" strokeWidth="2" opacity=".55" />
                    <path d="M-12 457c93-21 128-2 181 48s87 69 144 65 99-52 155-33 83 75 140 78 99-53 154-38 85 77 144 88 130-27 210 14M-19 537c83-15 124 14 183 48s115 39 162 9 76-62 131-51 88 69 150 74 90-46 145-43 92 53 150 65 127-17 236 24" fill="none" stroke="#c6c5a9" strokeWidth="1.5" opacity=".7" />
                    <g className={layers.habitat ? "" : styles.hiddenLayer}>
                      <path d="M46 124 170 70l116 43 76-15 102 60 6 80-55 63-90-3-63 48-105-24-97-74-41-64ZM538 84l90 25 47-39 130 50 18 71-69 46-82-24-69 35-104-46-19-62ZM302 405l72-33 105 28 47 72-32 72-104 20-74-59ZM818 324l81-50 113 25 37 78-50 71-106-6-72-50ZM635 531l79-28 87 44 11 76-62 45-109-33-29-56Z" fill="#668166" fillOpacity=".35" />
                      <path d="M46 124 170 70l116 43 76-15 102 60 6 80-55 63-90-3-63 48-105-24-97-74-41-64ZM538 84l90 25 47-39 130 50 18 71-69 46-82-24-69 35-104-46-19-62ZM302 405l72-33 105 28 47 72-32 72-104 20-74-59ZM818 324l81-50 113 25 37 78-50 71-106-6-72-50ZM635 531l79-28 87 44 11 76-62 45-109-33-29-56Z" fill="url(#forestPattern)" />
                    </g>
                    <g className={layers.access ? "" : styles.hiddenLayer} fill="none">
                      <path d="M82 20c74 70 76 109 119 156s91 61 119 116 14 87 70 119 95 29 131 84 41 107 104 131 107-2 165 40" stroke="#8ca9ad" strokeWidth="7" opacity=".8" />
                      <path d="M82 20c74 70 76 109 119 156s91 61 119 116 14 87 70 119 95 29 131 84 41 107 104 131 107-2 165 40" stroke="#dce6dd" strokeWidth="2" opacity=".9" />
                      <path d="M190 721c56-91 105-119 146-141s92-43 116-91 2-90 41-129 93-42 117-94 6-91 55-147 91-68 115-111" stroke="#bd9877" strokeWidth="3" strokeDasharray="10 9" opacity=".9" />
                      <path d="M952-2c-23 54-14 91 22 121s79 37 101 80 2 74 39 105 64 35 86 68" stroke="#c5a17d" strokeWidth="2.5" strokeDasharray="8 8" opacity=".8" />
                    </g>
                    <g className={layers.area ? "" : styles.hiddenLayer}>
                      <path d="M256 137 385 113l109 60 22 98-55 88-117 10-104-56-23-94Z" fill="url(#parkPattern)" stroke="#697a51" strokeWidth="2" strokeDasharray="7 6" />
                      <path d="m256 137 129-24 109 60 22 98-55 88-117 10-104-56-23-94Z" fill="none" stroke="#879366" strokeOpacity=".7" />
                    </g>
                    <g className={layers.path ? "" : styles.hiddenLayer}>
                      <path d="M121 515c104-57 164-42 226-103s93-96 169-89 105 73 185 69 118-81 195-67 104 88 174 93" fill="none" stroke="#f4eee0" strokeWidth="12" strokeLinecap="round" />
                      <path d="M121 515c104-57 164-42 226-103s93-96 169-89 105 73 185 69 118-81 195-67 104 88 174 93" fill="none" stroke="#c67945" strokeWidth="4" strokeDasharray="11 10" strokeLinecap="round" />
                      <circle cx="121" cy="515" r="9" fill="#f5f0df" stroke="#c67945" strokeWidth="3" />
                      <circle cx="1070" cy="418" r="9" fill="#f5f0df" stroke="#c67945" strokeWidth="3" />
                    </g>
                    <g className={layers.plg ? "" : styles.hiddenLayer}>
                      <circle cx="379" cy="249" r="15" fill="#f2e7cd" stroke="#5d6c4d" strokeWidth="2" />
                      <path d="M379 240v18m-8-9h16" stroke="#5d6c4d" strokeWidth="2" />
                    </g>
                    <g fill="#58684d" fontFamily="Georgia, serif" fontStyle="italic" fontSize="19" opacity=".8">
                      <text x="175" y="378" transform="rotate(-16 175 378)">Hulu Seblat</text>
                      <text x="719" y="198" transform="rotate(13 719 198)">Bentang alam hutan</text>
                      <text x="902" y="554" transform="rotate(-10 902 554)">Lanskap mosaik</text>
                    </g>
                  </g>
                  <path d="M48 74h38m-38 0v38" stroke="#4e5f4d" strokeWidth="2" />
                  <text x="50" y="63" fill="#455443" fontFamily="monospace" fontSize="11" letterSpacing="2">N</text>
                  <path d="M1015 666h100" stroke="#59654f" strokeWidth="2" />
                  <path d="M1015 660v12m100-12v12" stroke="#59654f" strokeWidth="2" />
                  <text x="1015" y="650" fill="#65705c" fontFamily="monospace" fontSize="10" letterSpacing="1">SKALA ILUSTRATIF</text>
                  <text x="40" y="686" fill="#78806c" fontFamily="monospace" fontSize="10" letterSpacing="1">TWA SEBLAT · REPRESENTASI NON-SPASIAL</text>
                </svg>
              </div>
              <div className={styles.mapStamp}>PETA KONSEPTUAL <span>— BUKAN DATA LAPANGAN</span></div>
              <div className={styles.mapControls} aria-label="Kontrol peta">
                <button type="button" onClick={() => zoomBy(0.16)} aria-label="Perbesar peta"><Plus size={16} /></button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => zoomBy(-0.16)} aria-label="Perkecil peta"><Minus size={16} /></button>
                <i />
                <button type="button" onClick={resetMap} aria-label="Kembalikan tampilan awal"><Crosshair size={15} /></button>
              </div>
              <div className={styles.panHint}><MousePointer2 size={13} /> Seret peta · gunakan kontrol untuk zoom</div>
            </div>

            <div className={styles.mapLegend}>
              <span className={styles.legendTitle}><Layers3 size={14} /> LEGENDA</span>
              <span><i className={styles.legendForest} /> Tutupan contoh</span>
              <span><i className={styles.legendRiver} /> Alur air ilustratif</span>
              <span><i className={styles.legendPath} /> Kandidat jalur model</span>
              <span className={styles.legendNote}>Simbol tidak merepresentasikan lokasi sebenarnya</span>
            </div>
          </div>

          <aside className={styles.sidePanel} aria-label="Panel konteks penelitian">
            <section className={styles.sideSection}>
              <div className={styles.panelHeading}>
                <span className={styles.sectionKicker}>KONTEKS STUDI</span>
                <ChevronDown size={15} />
              </div>
              <h3>Potensi konektivitas habitat</h3>
              <p className={styles.sideDescription}>
                Area kajian dan hubungan ekologis masih berupa gagasan awal. Batas dan unit analisis perlu disepakati sebelum pemodelan.
              </p>
              <div className={styles.contextList}>
                <div><span>Lokasi konteks</span><strong>TWA Seblat, Bengkulu Utara</strong></div>
                <div><span>Fokus kajian</span><strong>Habitat & konektivitas</strong></div>
                <div><span>Batas wilayah</span><em>Belum ditentukan</em></div>
              </div>
              <div className={styles.plgNote}><MapPin size={14} /><span>PLG Seblat ditampilkan sebagai konteks kawasan, <b>bukan titik asal / tujuan</b> analisis.</span></div>
            </section>

            <section className={styles.sideSection} aria-labelledby="layers-heading">
              <div className={styles.panelHeading}>
                <span id="layers-heading" className={styles.sectionKicker}>LAPISAN PETA</span>
                <span className={styles.layerCount}>5 CONTOH</span>
              </div>
              <div className={styles.layerList}>
                {layerOptions.map((layer) => (
                  <label key={layer.id} className={styles.layerRow}>
                    <input
                      type="checkbox"
                      checked={layers[layer.id]}
                      onChange={() => toggleLayer(layer.id)}
                      aria-label={`Tampilkan ${layer.label}`}
                    />
                    <span className={`${styles.layerSymbol} ${styles[layer.color]}`} />
                    <span>{layer.label}</span>
                    <span className={styles.checkboxMark}><Check size={11} /></span>
                  </label>
                ))}
              </div>
              <p className={styles.layerFootnote}>Lapisan contoh hanya untuk menjelaskan rancangan antarmuka.</p>
            </section>

            <section className={`${styles.sideSection} ${styles.modelSection}`}>
              <div className={styles.panelHeading}>
                <span className={styles.sectionKicker}>RANCANGAN MODEL</span>
                <SlidersHorizontal size={14} />
              </div>
              <div className={styles.modelTitle}><Route size={17} /><strong>Least-Cost Path</strong></div>
              <p>Memerlukan permukaan biaya dan pasangan habitat yang ditentukan melalui kajian.</p>
              <div className={styles.modelStatus}><span /> Belum dapat dijalankan · data belum ada</div>
              <button
                className={styles.modelButton}
                type="button"
                onClick={() => setNotice("Pemodelan belum tersedia. Tambahkan dan verifikasi data spasial, tetapkan area studi serta pasangan habitat, lalu dokumentasikan bobot resistansi.")}
              >
                Mengapa belum bisa dianalisis? <ArrowRight size={14} />
              </button>
            </section>
          </aside>
        </section>

        <section id="metode" className={styles.methodStrip}>
          <div className={styles.methodMark}><Compass size={20} strokeWidth={1.5} /></div>
          <div className={styles.methodCopy}>
            <span className={styles.sectionKicker}>PENTING · INTERPRETASI METODE</span>
            <p>
              Least-Cost Path menghasilkan <b>hipotesis jalur berdasarkan asumsi biaya</b>, bukan bukti pergerakan gajah.
              Nilai resistansi, sumber habitat, skala analisis, dan validasi lapangan harus dinyatakan secara transparan.
            </p>
          </div>
          <button type="button" className={styles.textLink} onClick={() => navigateTo("data")}>
            Lihat kebutuhan data <ArrowDownRight size={15} />
          </button>
        </section>

        {notice && (
          <div className={styles.inlineNotice} role="status">
            <Info size={17} /><p>{notice}</p>
            <button type="button" onClick={() => setNotice("")} aria-label="Tutup informasi">Tutup</button>
          </div>
        )}

        <section id="data" className={styles.bottomGrid}>
          <div className={styles.workflowSection}>
            <div className={styles.bottomHeading}>
              <div>
                <span className={styles.sectionKicker}><span className={styles.kickerLine} /> ALUR KERJA</span>
                <h2>Dari pertanyaan ke evaluasi</h2>
              </div>
              <span className={styles.workflowMeta}>4 TAHAP · RANCANGAN</span>
            </div>
            <div className={styles.workflow}>
              {workflow.map((step, index) => (
                <article className={styles.workflowStep} key={step.number}>
                  <div className={styles.stepTop}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    {index < workflow.length - 1 && <span className={styles.stepConnector} />}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                  <span className={styles.stepState}><i />{step.state}</span>
                </article>
              ))}
            </div>
          </div>

          <aside className={styles.readinessPanel}>
            <div className={styles.readinessHeading}>
              <div className={styles.readinessIcon}><Trees size={17} /></div>
              <div><span className={styles.sectionKicker}>KESIAPAN DATA</span><h3>Yang perlu disiapkan</h3></div>
            </div>
            <ul className={styles.readinessList}>
              <li><span className={styles.emptyCheck} /> Tutupan lahan / habitat terverifikasi</li>
              <li><span className={styles.emptyCheck} /> DEM dan variabel topografi</li>
              <li><span className={styles.emptyCheck} /> Sungai, jalan, dan gangguan manusia</li>
              <li><span className={styles.emptyCheck} /> Sumber, tahun, resolusi, lisensi data</li>
              <li><span className={styles.emptyCheck} /> Justifikasi biaya & rencana validasi</li>
            </ul>
            <p className={styles.readinessFooter}>Belum ada dataset yang dimuat atau dinilai.</p>
          </aside>
        </section>

        <section className={styles.dataNotice}>
          <div className={styles.dataNoticeIcon}><Info size={17} /></div>
          <p><strong>Data & privasi.</strong> Tidak ada lokasi individu, rekaman GPS, atau jalur pergerakan satwa di halaman ini. Setiap dataset penelitian perlu sumber yang jelas, pemeriksaan kualitas, dan penanganan sesuai sensitivitas konservasi.</p>
          <button type="button" disabled title="Ekspor tersedia setelah data penelitian dimuat"><Download size={15} /> Ekspor peta <span>belum tersedia</span></button>
        </section>
      </main>

      <footer className={styles.footer}>
        <div><span className={styles.footerMark}><Trees size={14} /></span> SEBLAT · RANCANGAN KAJIAN KONEKTIVITAS</div>
        <span>Ilustrasi konseptual · Tidak untuk navigasi, pengelolaan lapangan, atau keputusan operasional.</span>
        <a href="#peta" onClick={() => setActiveNav("peta")}>Kembali ke atas ↑</a>
      </footer>
      <span className={styles.screenReaderOnly} aria-live="polite">{Math.round(zoom * 100)} persen zoom peta</span>
    </div>
  );
}
