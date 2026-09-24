export type LabelCategory = string;

/**
 * Safely parse date strings in various formats:
 * - "YYYY-MM-DD"
 * - "DD/MM/YYYY" or "DD/MM/YY"
 * - "YYYY/MM/DD"
 * - ISO string
 */
export function parseDateStringToDate(dateStr?: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === "-") return null;

  // Handle DD/MM/YYYY or DD/MM/YY
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) {
        year += 2000;
      }
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  // Handle YYYY-MM-DD or DD-MM-YYYY
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      } else if (parts[2].length === 4 || parts[2].length === 2) {
        // DD-MM-YYYY or DD-MM-YY
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
  }

  const standardParsed = new Date(trimmed);
  if (!isNaN(standardParsed.getTime())) {
    return standardParsed;
  }

  return null;
}

/**
 * Calculates age in full calendar days between targetDate and referenceDate.
 * Age = Math.floor((refDate - targetDate) / 1 day)
 */
export function calculateAgeInDays(targetDateStr?: string, referenceDateStr?: string): number {
  if (!targetDateStr) return 0;
  const targetDate = parseDateStringToDate(targetDateStr);
  if (!targetDate) return 0;

  const refDate = referenceDateStr ? parseDateStringToDate(referenceDateStr) : new Date();
  if (!refDate) return 0;

  targetDate.setHours(0, 0, 0, 0);
  refDate.setHours(0, 0, 0, 0);

  const diffMs = refDate.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Format date to standard DD/MM/YY format
 */
export function formatDDMMYY(dateStr?: string): string {
  if (!dateStr) return "-";
  const parsed = parseDateStringToDate(dateStr);
  if (parsed) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = String(parsed.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export interface LabelFIFOLot {
  id: string;
  kav: string; // e.g. "Rak L-01" or "3002"
  tglMasuk: string; // e.g. "2026-07-01" or "01/07/26"
  umurHari?: number; // e.g. 14 Hari
  jmlLembar: number; // e.g. 15000 Lembar/Pcs
  suplier?: string;
  startNoLabel?: number;
  endNoLabel?: number;
}

export interface LabelItem {
  id: string;
  kode: string; // e.g. "LBL-BR1-50"
  namaLabel: string; // e.g. "LABEL BR-1 SUPER CRUMBLE 50KG"
  kategori?: string;
  warna: string; // e.g. "Kuning (Pantone 109C)"
  spesifikasi: string; // e.g. "Art Paper 150 GSM | 8 x 14 cm | Lubang Tag"
  satuan: "Lembar" | "Pcs" | "Roll" | "Cone";
  
  // Tanggal & Umur Pemakaian Terakhir
  tglPemakaianTerakhir?: string;
  umurPemakaianHari?: number;

  // Mutasi Stok (Satuan Lembar / Pcs)
  stockAwal: number;

  // Rincian Penerimaan (Satuan Lembar / Pcs)
  pembelian?: number;
  returProduksi?: number;
  masukLainLain?: number;
  masuk: number; // Subtotal Penerimaan

  // Rincian Pengeluaran (Satuan Lembar / Pcs)
  bonProduksi?: number; // Pemakaian line jahit / bagging
  gudangKeluar?: number; // Pengeluaran sample / antar gudang
  rusak?: number; // Reject / Sobek / Basah
  keluarLainLain?: number;
  keluar: number; // Subtotal Pengeluaran

  // FIFO Urutan Pemakaian Multi-Lot
  fifoLots?: LabelFIFOLot[];

  // Nomor Label Otomatis (Sequential Label Numbers)
  startNoLabel?: number; // Nomor Awal (dapat terhitung otomatis dari noAkhir - stockAkhir)
  endNoLabel?: number;   // Nomor Akhir
  baseEndNoLabel?: number; // Nomor Akhir Dasar (sebelum penambahan masuk hari ini)

  // Info Gudang & Suplier
  gudangKav: string; // e.g. "Lemari A - Rak 01"
  suplier: string; // e.g. "PT. Prima Grafika Packaging"
  tglMasuk: string;
  minStock: number; // Batas minimum persediaan
  keterangan?: string;
  checked?: boolean;
}

/**
 * Calculate sequential label numbers (No Label Otomatis)
 * Sesuai aturan:
 * 1. "rumus no awal no akhir di - stok akhir": noAwal = noAkhir - stockAkhir
 * 2. "untuk setiap jumlah masuk automatis menambahkan ke no akhir": noAkhir = baseEndNo + totalMasuk
 */
export function getLabelNoRange(item: LabelItem): {
  startNo: number;
  endNo: number;
  baseEndNo: number;
  totalMasuk: number;
  stockAkhir: number;
  formattedStart: string;
  formattedEnd: string;
  formattedText: string;
} {
  const numAwal = Number(item.stockAwal) || 0;
  const numPem = Number(item.pembelian) || 0;
  const numRet = Number(item.returProduksi) || 0;
  const numMskLain = Number(item.masukLainLain) || 0;
  const subtotalMasuk = (item.masuk !== undefined && item.masuk !== null)
    ? Number(item.masuk) || 0
    : (numPem + numRet + numMskLain);

  const numBon = Number(item.bonProduksi) || 0;
  const numGdg = Number(item.gudangKeluar) || 0;
  const numRsk = Number(item.rusak) || 0;
  const numKlrLain = Number(item.keluarLainLain) || 0;
  const subtotalKeluar = (item.keluar !== undefined && item.keluar !== null)
    ? Number(item.keluar) || 0
    : (numBon + numGdg + numRsk + numKlrLain);

  const stockAkhir = Math.max(0, numAwal + subtotalMasuk - subtotalKeluar);

  // Hanya proses jika item memiliki satuan Lembar / Pcs atau memiliki konfigurasi nomor label
  const isLabelUnit = !item.satuan || item.satuan.toLowerCase() === "lembar" || item.satuan.toLowerCase() === "pcs";
  if (!isLabelUnit && !item.baseEndNoLabel && !item.endNoLabel && !item.startNoLabel) {
    return {
      startNo: 0,
      endNo: 0,
      baseEndNo: 0,
      totalMasuk: subtotalMasuk,
      stockAkhir,
      formattedStart: "-",
      formattedEnd: "-",
      formattedText: "-"
    };
  }

  // Tentukan Nomor Akhir Dasar (Base End No)
  let baseEnd = Number(item.baseEndNoLabel) || 0;
  if (baseEnd <= 0) {
    if (item.endNoLabel && Number(item.endNoLabel) > 0) {
      baseEnd = Number(item.endNoLabel);
    } else if (item.startNoLabel && Number(item.startNoLabel) > 0) {
      // Jika hanya ada startNoLabel sebelumnya, konversi: baseEnd = startNoLabel + stockAwal
      baseEnd = Number(item.startNoLabel) + numAwal;
    } else {
      // Deterministic base end number based on item id / code
      let hash = 0;
      const str = item.kode || item.id || "1";
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 37 + str.charCodeAt(i)) % 800000;
      }
      baseEnd = 300000 + Math.abs(hash);
    }
  }

  // Aturan 2: Untuk setiap jumlah masuk otomatis menambahkan ke no akhir
  const endNo = baseEnd + subtotalMasuk;

  // Aturan 1: Rumus no awal no akhir di - stok akhir
  const startNo = stockAkhir > 0 ? Math.max(0, endNo - stockAkhir) : 0;

  if (stockAkhir === 0) {
    return {
      startNo: 0,
      endNo,
      baseEndNo: baseEnd,
      totalMasuk: subtotalMasuk,
      stockAkhir: 0,
      formattedStart: "-",
      formattedEnd: endNo.toLocaleString("id-ID"),
      formattedText: `-\n${endNo.toLocaleString("id-ID")}`
    };
  }

  const formattedStart = startNo.toLocaleString("id-ID");
  const formattedEnd = endNo.toLocaleString("id-ID");
  const formattedText = `${formattedStart}\n${formattedEnd}`;

  return {
    startNo,
    endNo,
    baseEndNo: baseEnd,
    totalMasuk: subtotalMasuk,
    stockAkhir,
    formattedStart,
    formattedEnd,
    formattedText
  };
}

export interface LabelInboundLog {
  id: string;
  tanggal: string; // "YYYY-MM-DD"
  waktu: string; // "HH:mm:ss"
  itemId: string;
  kode: string;
  namaLabel: string;
  kategori?: string;
  sloct: string;
  kolom: "pembelian" | "returProduksi" | "masukLainLain";
  jmlLembar: number;
  supplier?: string;
  kavling?: string;
  catatan?: string;
  operator?: string;
}

export interface LabelOutboundLog {
  id: string;
  tanggal: string; // "YYYY-MM-DD"
  waktu: string; // "HH:mm:ss"
  itemId: string;
  kode: string;
  namaLabel: string;
  kategori?: string;
  sloct: string;
  kolom: "bonProduksi" | "gudangKeluar" | "rusak" | "keluarLainLain";
  jmlLembar: number;
  spk?: string;
  catatan?: string;
  operator?: string;
}

export interface LabelReport {
  date: string;
  gudangSLoct: string; // e.g. "3002" or "Gudang & Lemari Label"
  docCode: string; // e.g. "PLT - WRH - FM – 03 - 02"
  nomorDokumen?: string; // e.g. "FRM-WHR-LBL-002"
  companyName: string; // e.g. "PT. Japfa Comfeed Indonesia.Tbk – UNIT LPG"
  title?: string; // e.g. "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS"
  subTitle?: string; // e.g. "LABEL PAKAN & AKSESORIS KEMASAN"
  items: LabelItem[];
  inboundLogs?: LabelInboundLog[];
  outboundLogs?: LabelOutboundLog[];
  dibuatOlehName: string;
  dibuatOlehRole: string;
  dibuatOlehSignature: string | null;
  mengetahuiName: string;
  mengetahuiRole: string;
  mengetahuiSignature: string | null;
  namaDibuat?: string;
  namaDiperiksa?: string;
  namaDiketahui?: string;
  namaDiterima?: string;
  ttdDibuat?: string | null;
  ttdDiperiksa?: string | null;
  ttdDiketahui?: string | null;
  ttdDiterima?: string | null;
  status?: string;
}

export const DEFAULT_LABEL_SEED: LabelItem[] = [
  {
    id: "lbl-1",
    kode: "700901010010",
    namaLabel: "LABEL BR-1 SUPER CRUMBLE 50KG",
    kategori: "Label Broiler",
    warna: "Kuning (Pantone 109C)",
    spesifikasi: "Art Paper 150 GSM | 8 x 14 cm | Lubang Tag 5mm",
    satuan: "Lembar",
    tglPemakaianTerakhir: "2026-07-14",
    umurPemakaianHari: 13,
    stockAwal: 45000,
    pembelian: 20000,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 20000,
    bonProduksi: 12500,
    gudangKeluar: 0,
    rusak: 50,
    keluarLainLain: 0,
    keluar: 12550,
    baseEndNoLabel: 500000,
    endNoLabel: 520000,
    fifoLots: [
      { id: "lot-lbl-1a", kav: "Rak A-01", tglMasuk: "2026-06-20", umurHari: 24, jmlLembar: 15000, suplier: "PT. Prima Grafika Packaging" },
      { id: "lot-lbl-1b", kav: "Rak A-01", tglMasuk: "2026-07-01", umurHari: 13, jmlLembar: 37450, suplier: "PT. Prima Grafika Packaging" }
    ],
    gudangKav: "Rak A-01",
    suplier: "PT. Prima Grafika Packaging",
    tglMasuk: "2026-07-01",
    minStock: 8000,
    keterangan: "Label standar bagging BR-1 Starter Super",
    checked: true
  },
  {
    id: "lbl-2",
    kode: "700901010020",
    namaLabel: "LABEL BR-2 FINISHER PELLET 50KG",
    kategori: "Label Broiler",
    warna: "Hijau Daun (Pantone 355C)",
    spesifikasi: "Art Paper 150 GSM | 8 x 14 cm | Lubang Tag 5mm",
    satuan: "Lembar",
    tglPemakaianTerakhir: "2026-07-13",
    umurPemakaianHari: 26,
    stockAwal: 32000,
    pembelian: 0,
    returProduksi: 500,
    masukLainLain: 0,
    masuk: 500,
    bonProduksi: 8000,
    gudangKeluar: 0,
    rusak: 30,
    keluarLainLain: 0,
    keluar: 8030,
    baseEndNoLabel: 200000,
    endNoLabel: 200500,
    fifoLots: [
      { id: "lot-lbl-2a", kav: "Rak A-02", tglMasuk: "2026-06-18", umurHari: 26, jmlLembar: 24470, suplier: "PT. Prima Grafika Packaging" }
    ],
    gudangKav: "Rak A-02",
    suplier: "PT. Prima Grafika Packaging",
    tglMasuk: "2026-06-18",
    minStock: 6000,
    keterangan: "Stok mencukupi untuk line bagging 2",
    checked: true
  },
  {
    id: "lbl-3",
    kode: "700902010010",
    namaLabel: "LABEL PAR-L LAYER PETELUR 50KG",
    kategori: "Label Layer",
    warna: "Merah Cerah (Pantone 485C)",
    spesifikasi: "Art Paper 150 GSM | 8 x 14 cm | Lubang Tag 5mm",
    satuan: "Lembar",
    tglPemakaianTerakhir: "2026-07-14",
    umurPemakaianHari: 11,
    stockAwal: 28000,
    pembelian: 15000,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 15000,
    bonProduksi: 9500,
    gudangKeluar: 0,
    rusak: 25,
    keluarLainLain: 0,
    keluar: 9525,
    baseEndNoLabel: 350000,
    endNoLabel: 365000,
    fifoLots: [
      { id: "lot-lbl-3a", kav: "Rak B-01", tglMasuk: "2026-06-25", umurHari: 19, jmlLembar: 8000, suplier: "CV. Mandiri Print Mandiri" },
      { id: "lot-lbl-3b", kav: "Rak B-01", tglMasuk: "2026-07-03", umurHari: 11, jmlLembar: 25475, suplier: "CV. Mandiri Print Mandiri" }
    ],
    gudangKav: "Rak B-01",
    suplier: "CV. Mandiri Print Mandiri",
    tglMasuk: "2026-07-03",
    minStock: 5000,
    keterangan: "Label pakan petelur layer fase produksi",
    checked: true
  },
  {
    id: "lbl-4",
    kode: "700902010030",
    namaLabel: "LABEL KL-1 LAYER GROWER DARA 50KG",
    kategori: "Label Layer",
    warna: "Biru Muda (Pantone 298C)",
    spesifikasi: "Art Paper 150 GSM | 8 x 14 cm | Lubang Tag 5mm",
    satuan: "Lembar",
    tglPemakaianTerakhir: "2026-07-10",
    umurPemakaianHari: 20,
    stockAwal: 18000,
    pembelian: 0,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 0,
    bonProduksi: 4000,
    gudangKeluar: 0,
    rusak: 15,
    keluarLainLain: 0,
    keluar: 4015,
    baseEndNoLabel: 180000,
    endNoLabel: 180000,
    fifoLots: [
      { id: "lot-lbl-4a", kav: "Rak B-02", tglMasuk: "2026-06-24", umurHari: 20, jmlLembar: 13985, suplier: "CV. Mandiri Print Mandiri" }
    ],
    gudangKav: "Rak B-02",
    suplier: "CV. Mandiri Print Mandiri",
    tglMasuk: "2026-06-24",
    minStock: 4000,
    keterangan: "Aman, re-order saat stock < 4000",
    checked: true
  },
  {
    id: "lbl-5",
    kode: "700903010010",
    namaLabel: "LABEL BEBEK PEDAGING STARTER 50KG",
    kategori: "Label Bebek & Unggas",
    warna: "Oranye (Pantone 021C)",
    spesifikasi: "Art Paper 150 GSM | 8 x 14 cm | Lubang Tag 5mm",
    satuan: "Lembar",
    tglPemakaianTerakhir: "2026-07-12",
    umurPemakaianHari: 16,
    stockAwal: 12000,
    pembelian: 5000,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 5000,
    bonProduksi: 3000,
    gudangKeluar: 0,
    rusak: 10,
    keluarLainLain: 0,
    keluar: 3010,
    baseEndNoLabel: 550000,
    endNoLabel: 555000,
    fifoLots: [
      { id: "lot-lbl-5a", kav: "Rak C-01", tglMasuk: "2026-06-28", umurHari: 16, jmlLembar: 13990, suplier: "PT. Prima Grafika Packaging" }
    ],
    gudangKav: "Rak C-01",
    suplier: "PT. Prima Grafika Packaging",
    tglMasuk: "2026-06-28",
    minStock: 3000,
    keterangan: "Pakan bebek pedaging fase starter",
    checked: true
  },
  {
    id: "lbl-6",
    kode: "700905010010",
    namaLabel: "LABEL THERMAL BARCODE PALLET 100X150 MM",
    kategori: "Label Barcode & Thermal",
    warna: "Putih Doff / Thermal",
    spesifikasi: "Direct Thermal Roll | 500 pcs/roll | Gap 3mm | Core 1 inch",
    satuan: "Roll",
    tglPemakaianTerakhir: "2026-07-14",
    umurPemakaianHari: 15,
    stockAwal: 120,
    pembelian: 50,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 50,
    bonProduksi: 25,
    gudangKeluar: 5,
    rusak: 1,
    keluarLainLain: 0,
    keluar: 31,
    fifoLots: [
      { id: "lot-lbl-6a", kav: "Rak D-01", tglMasuk: "2026-06-29", umurHari: 15, jmlLembar: 139, suplier: "PT. Barcode Indotech Global" }
    ],
    gudangKav: "Rak D-01",
    suplier: "PT. Barcode Indotech Global",
    tglMasuk: "2026-06-29",
    minStock: 25,
    keterangan: "Untuk printer barcode zebra & tag pallet gudang",
    checked: true
  },
  {
    id: "lbl-7",
    kode: "700906010010",
    namaLabel: "BENANG JAHIT KARUNG POLYESTER 20/6 PUTIH",
    kategori: "Benang & Aksesoris",
    warna: "Putih Natural",
    spesifikasi: "100% Spun Polyester Cone 5000 meter High Tenacity",
    satuan: "Cone",
    tglPemakaianTerakhir: "2026-07-14",
    umurPemakaianHari: 22,
    stockAwal: 160,
    pembelian: 80,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 80,
    bonProduksi: 45,
    gudangKeluar: 0,
    rusak: 0,
    keluarLainLain: 0,
    keluar: 45,
    fifoLots: [
      { id: "lot-lbl-7a", kav: "Rak E-01", tglMasuk: "2026-06-22", umurHari: 22, jmlLembar: 195, suplier: "PT. Jaya Thread Industrial" }
    ],
    gudangKav: "Rak E-01",
    suplier: "PT. Jaya Thread Industrial",
    tglMasuk: "2026-06-22",
    minStock: 35,
    keterangan: "Untuk mesin jahit portable & station Newlong",
    checked: true
  },
  {
    id: "lbl-8",
    kode: "700906010020",
    namaLabel: "BENANG JAHIT KARUNG POLYESTER 20/6 MERAH",
    kategori: "Benang & Aksesoris",
    warna: "Merah Red",
    spesifikasi: "100% Spun Polyester Cone 5000 meter High Tenacity",
    satuan: "Cone",
    tglPemakaianTerakhir: "2026-07-11",
    umurPemakaianHari: 25,
    stockAwal: 85,
    pembelian: 0,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 0,
    bonProduksi: 20,
    gudangKeluar: 0,
    rusak: 0,
    keluarLainLain: 0,
    keluar: 20,
    fifoLots: [
      { id: "lot-lbl-8a", kav: "Rak E-02", tglMasuk: "2026-06-19", umurHari: 25, jmlLembar: 65, suplier: "PT. Jaya Thread Industrial" }
    ],
    gudangKav: "Rak E-02",
    suplier: "PT. Jaya Thread Industrial",
    tglMasuk: "2026-06-19",
    minStock: 20,
    keterangan: "Benang warna aksen penanda kemasan khusus",
    checked: true
  }
];

export const DEFAULT_LABEL_INBOUND_SEED: LabelInboundLog[] = [
  {
    id: "lbl-in-1",
    tanggal: "2026-07-14",
    waktu: "09:15:00",
    itemId: "lbl-1",
    kode: "700901010010",
    namaLabel: "LABEL BR-1 SUPER CRUMBLE 50KG",
    kategori: "Label Broiler",
    sloct: "3002",
    kolom: "pembelian",
    jmlLembar: 20000,
    supplier: "PT. Prima Grafika Packaging",
    kavling: "Rak A-01",
    catatan: "Penerimaan PO-2607-4481 Surat Jalan SJ-7718",
    operator: "Sabto A"
  },
  {
    id: "lbl-in-2",
    tanggal: "2026-07-14",
    waktu: "10:30:20",
    itemId: "lbl-3",
    kode: "700902010010",
    namaLabel: "LABEL PAR-L LAYER PETELUR 50KG",
    kategori: "Label Layer",
    sloct: "3002",
    kolom: "pembelian",
    jmlLembar: 15000,
    supplier: "CV. Mandiri Print Mandiri",
    kavling: "Rak B-01",
    catatan: "Penerimaan PO Regular Kemasan Layer",
    operator: "Sabto A"
  },
  {
    id: "lbl-in-3",
    tanggal: "2026-07-14",
    waktu: "13:45:00",
    itemId: "lbl-7",
    kode: "700906010010",
    namaLabel: "BENANG JAHIT KARUNG POLYESTER 20/6 PUTIH",
    kategori: "Benang & Aksesoris",
    sloct: "3002",
    kolom: "pembelian",
    jmlLembar: 80,
    supplier: "PT. Jaya Thread Industrial",
    kavling: "Rak E-01",
    catatan: "Pasokan benang jahit 80 cones",
    operator: "Sabto A"
  }
];

export const DEFAULT_LABEL_OUTBOUND_SEED: LabelOutboundLog[] = [
  {
    id: "lbl-out-1",
    tanggal: "2026-07-14",
    waktu: "11:20:00",
    itemId: "lbl-1",
    kode: "700901010010",
    namaLabel: "LABEL BR-1 SUPER CRUMBLE 50KG",
    kategori: "Label Broiler",
    sloct: "3002",
    kolom: "bonProduksi",
    jmlLembar: 12500,
    spk: "SPK-4401 Line Bagging 1",
    catatan: "Bon pemakaian jahit pakan broiler starter",
    operator: "Operator Bagging 1"
  },
  {
    id: "lbl-out-2",
    tanggal: "2026-07-14",
    waktu: "14:10:00",
    itemId: "lbl-3",
    kode: "700902010010",
    namaLabel: "LABEL PAR-L LAYER PETELUR 50KG",
    kategori: "Label Layer",
    sloct: "3002",
    kolom: "bonProduksi",
    jmlLembar: 9500,
    spk: "SPK-4405 Line Bagging 2",
    catatan: "Bon pemakaian jahit pakan petelur PAR-L",
    operator: "Operator Bagging 2"
  }
];
