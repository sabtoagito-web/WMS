export type KarungCategory = string;

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
        year += 2000; // e.g. 26 -> 2026
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
 * Calculates age in full calendar days between targetDate and referenceDate (e.g. selected report date).
 * Age = Math.floor((refDate - targetDate) / 1 day)
 */
export function calculateAgeInDays(targetDateStr?: string, referenceDateStr?: string): number {
  if (!targetDateStr) return 0;
  const targetDate = parseDateStringToDate(targetDateStr);
  if (!targetDate) return 0;

  const refDate = referenceDateStr ? parseDateStringToDate(referenceDateStr) : new Date();
  if (!refDate) return 0;

  // Normalize hours to midnight for clean calendar day difference
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

export interface FIFOLot {
  id: string;
  kav: string; // e.g. "3001" or "K-01"
  tglMasuk: string; // e.g. "24/06/26" or "2026-06-24"
  umurHari?: number; // e.g. 57 Hari
  jmlLembar: number; // e.g. 1602
}

export interface KarungItem {
  id: string;
  kode: string; // e.g. "700511020010"
  namaKarung: string; // e.g. "ABS CRUMBLE"
  kategori?: string;
  spesifikasi: string; // e.g. "070X107 10/10 800 2C"
  lembarPerBal: number; // e.g. 500 lembar / Bal
  
  // Tanggal & Umur Pemakaian Terakhir
  tglPemakaianTerakhir?: string; // e.g. "13/08/26"
  umurPemakaianHari?: number; // e.g. 7 (hari)

  // Mutasi Stok (Satuan Lembar)
  stockAwal: number;
  stockAwalBal?: number;

  // Rincian Penerimaan (Satuan Lembar)
  pembelian?: number; // e.g. 0
  returProduksi?: number; // e.g. 0
  masukLainLain?: number; // e.g. 0
  masuk: number; // Subtotal Penerimaan
  masukBal?: number;

  // Rincian Pengeluaran (Satuan Lembar)
  bonProduksi?: number; // e.g. 0
  gudangKeluar?: number; // e.g. 0
  overZak?: number; // e.g. 10
  keluarLainLain?: number; // e.g. 0
  keluar: number; // Subtotal Pengeluaran
  keluarBal?: number;

  afkir: number; // Rusak / Reject / Sobek
  
  // FIFO Urutan Pemakaian
  fifoLots?: FIFOLot[];

  // Info Gudang & Suplier
  gudangKav: string; // e.g. "3001"
  suplier: string; // e.g. "PT. Kencana Maju Lestari"
  batch: string; // e.g. "PO-88291"
  tglMasuk: string;
  minStock: number; // Batas minimum
  keterangan?: string;
  checked?: boolean;
}

export interface KarungInboundLog {
  id: string;
  tanggal: string; // "YYYY-MM-DD"
  waktu: string; // "HH:mm:ss"
  itemId: string;
  kode: string;
  namaKarung: string;
  kategori?: string;
  sloct: string;
  kolom: "pembelian" | "returProduksi" | "masukLainLain";
  jmlLembar: number;
  jmlBal?: number;
  catatan?: string;
  operator?: string;
}

export interface KarungOutboundLog {
  id: string;
  tanggal: string; // "YYYY-MM-DD"
  waktu: string; // "HH:mm:ss"
  itemId: string;
  kode: string;
  namaKarung: string;
  kategori?: string;
  sloct: string;
  kolom: "bonProduksi" | "gudangKeluar" | "overZak" | "keluarLainLain";
  jmlLembar: number;
  jmlBal?: number;
  catatan?: string;
  operator?: string;
}

export interface KarungReport {
  date: string;
  gudangSLoct: string; // e.g. "3001" or "Gudang Kemasan & Sacks"
  docCode: string; // e.g. "PLT - WRH - FM – 03 - 01"
  companyName: string; // e.g. "PT. Japfa Comfeed Indonesia.Tbk – UNIT LPG"
  title?: string; // e.g. "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS"
  subTitle?: string; // e.g. "KARUNG PLASTIK"
  items: KarungItem[];
  inboundLogs?: KarungInboundLog[];
  outboundLogs?: KarungOutboundLog[];
  dibuatOlehName: string;
  dibuatOlehRole: string;
  dibuatOlehSignature: string | null;
  mengetahuiName: string;
  mengetahuiRole: string;
  mengetahuiSignature: string | null;
  status?: string;
}

export const DEFAULT_OUTBOUND_LOGS_SEED: KarungOutboundLog[] = [
  {
    id: "outbound-log-1",
    tanggal: "2026-08-18",
    waktu: "11:20:00",
    itemId: "krg-img-1",
    kode: "700511020010",
    namaKarung: "ABS CRUMBLE",
    kategori: "Karung 50 Kg",
    sloct: "3001",
    kolom: "bonProduksi",
    jmlLembar: 2500,
    jmlBal: 5,
    catatan: "SPK-4401 Line Bagging 1",
    operator: "Operator Bagging"
  }
];

export const DEFAULT_INBOUND_LOGS_SEED: KarungInboundLog[] = [
  {
    id: "inbound-log-1",
    tanggal: "2026-08-18",
    waktu: "09:30:15",
    itemId: "krg-img-6",
    kode: "700502021025",
    namaKarung: "BROILER 1 SUPER CRUMBLE",
    kategori: "Karung 50 Kg",
    sloct: "3001",
    kolom: "pembelian",
    jmlLembar: 5000,
    jmlBal: 10,
    catatan: "Penerimaan PO Supplier PT. Kencana Maju Lestari",
    operator: "Admin Warehouse"
  },
  {
    id: "inbound-log-2",
    tanggal: "2026-08-18",
    waktu: "14:15:00",
    itemId: "krg-img-4",
    kode: "700502021011",
    namaKarung: "BROILER 0 FINECRmed",
    kategori: "Karung 50 Kg",
    sloct: "3001",
    kolom: "returProduksi",
    jmlLembar: 500,
    jmlBal: 1,
    catatan: "Sisa pemakaian dari bagging line 2",
    operator: "Operator Bagging"
  },
  {
    id: "inbound-log-3",
    tanggal: "2026-08-19",
    waktu: "10:45:20",
    itemId: "krg-img-2",
    kode: "700503020007",
    namaKarung: "BESTFEED BLL TEPUNG",
    kategori: "Karung 50 Kg",
    sloct: "3001",
    kolom: "pembelian",
    jmlLembar: 2500,
    jmlBal: 5,
    catatan: "Pengiriman tambahan supplier",
    operator: "Admin Warehouse"
  }
];

// Exact Seed matching the user's official report image
export const DEFAULT_KARUNG_SEED: KarungItem[] = [
  {
    id: "krg-img-1",
    kode: "700511020010",
    namaKarung: "ABS CRUMBLE",
    kategori: "Karung 50 Kg",
    spesifikasi: "070X107 10/10 800 2C",
    lembarPerBal: 500,
    tglPemakaianTerakhir: "13/08/26",
    umurPemakaianHari: 7,
    stockAwal: 5102,
    stockAwalBal: 10,
    pembelian: 0,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 0,
    bonProduksi: 0,
    gudangKeluar: 0,
    overZak: 0,
    keluarLainLain: 0,
    keluar: 0,
    afkir: 0,
    fifoLots: [
      { id: "lot-1-1", kav: "3001", tglMasuk: "24/06/26", umurHari: 57, jmlLembar: 1602 },
      { id: "lot-1-2", kav: "3001", tglMasuk: "31/07/26", umurHari: 20, jmlLembar: 3500 }
    ],
    gudangKav: "3001",
    suplier: "PT. Poliplas Indah",
    batch: "PO-2606-24",
    tglMasuk: "2026-06-24",
    minStock: 2000,
    keterangan: ""
  },
  {
    id: "krg-img-2",
    kode: "700503020007",
    namaKarung: "BESTFEED BLL TEPUNG",
    kategori: "Karung 50 Kg",
    spesifikasi: "065X100 10/10 8002C",
    lembarPerBal: 500,
    tglPemakaianTerakhir: "13/08/26",
    umurPemakaianHari: 7,
    stockAwal: 44916,
    stockAwalBal: 90,
    pembelian: 0,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 0,
    bonProduksi: 0,
    gudangKeluar: 0,
    overZak: 0,
    keluarLainLain: 0,
    keluar: 0,
    afkir: 0,
    fifoLots: [
      { id: "lot-2-1", kav: "3001", tglMasuk: "08/06/26", umurHari: 73, jmlLembar: 11416 },
      { id: "lot-2-2", kav: "3001", tglMasuk: "01/07/26", umurHari: 50, jmlLembar: 15000 },
      { id: "lot-2-3", kav: "3001", tglMasuk: "31/07/26", umurHari: 20, jmlLembar: 18500 }
    ],
    gudangKav: "3001",
    suplier: "PT. Kencana Maju Lestari",
    batch: "PO-2606-08",
    tglMasuk: "2026-06-08",
    minStock: 5000,
    keterangan: ""
  },
  {
    id: "krg-img-3",
    kode: "700503020025",
    namaKarung: "BLL SUPER RED",
    kategori: "Karung 50 Kg",
    spesifikasi: "065X100 10/10 800 2C",
    lembarPerBal: 500,
    tglPemakaianTerakhir: "04/04/26",
    umurPemakaianHari: 138,
    stockAwal: 5705,
    stockAwalBal: 11,
    pembelian: 0,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 0,
    bonProduksi: 0,
    gudangKeluar: 0,
    overZak: 0,
    keluarLainLain: 0,
    keluar: 0,
    afkir: 0,
    fifoLots: [
      { id: "lot-3-1", kav: "3001", tglMasuk: "27/05/25", umurHari: 450, jmlLembar: 2705 },
      { id: "lot-3-2", kav: "3001", tglMasuk: "10/07/25", umurHari: 406, jmlLembar: 3000 }
    ],
    gudangKav: "3001",
    suplier: "PT. Daiwabo Garment",
    batch: "PO-2505-27",
    tglMasuk: "2025-05-27",
    minStock: 2000,
    keterangan: ""
  },
  {
    id: "krg-img-4",
    kode: "700502021011",
    namaKarung: "BROILER 0 FINECRmed",
    kategori: "Karung 50 Kg",
    spesifikasi: "065X100 10/10 800 2C",
    lembarPerBal: 500,
    tglPemakaianTerakhir: "19/08/26",
    umurPemakaianHari: 1,
    stockAwal: 9959,
    stockAwalBal: 20,
    pembelian: 0,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 0,
    bonProduksi: 0,
    gudangKeluar: 0,
    overZak: 10,
    keluarLainLain: 0,
    keluar: 10,
    afkir: 0,
    fifoLots: [
      { id: "lot-4-1", kav: "3001", tglMasuk: "24/06/26", umurHari: 57, jmlLembar: 2949 },
      { id: "lot-4-2", kav: "3001", tglMasuk: "24/06/26", umurHari: 57, jmlLembar: 7000 }
    ],
    gudangKav: "3001",
    suplier: "PT. Kencana Maju Lestari",
    batch: "PO-2606-24",
    tglMasuk: "2026-06-24",
    minStock: 3000,
    keterangan: ""
  },
  {
    id: "krg-img-5",
    kode: "700503020021",
    namaKarung: "BROILER 0 FINE CR B",
    kategori: "Karung 50 Kg",
    spesifikasi: "065X100 10/10 800 2C",
    lembarPerBal: 500,
    tglPemakaianTerakhir: "08/10/24",
    umurPemakaianHari: 681,
    stockAwal: 142,
    stockAwalBal: 0,
    pembelian: 0,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 0,
    bonProduksi: 0,
    gudangKeluar: 0,
    overZak: 0,
    keluarLainLain: 0,
    keluar: 0,
    afkir: 0,
    fifoLots: [
      { id: "lot-5-1", kav: "3001", tglMasuk: "26/07/24", umurHari: 755, jmlLembar: 142 }
    ],
    gudangKav: "3001",
    suplier: "PT. Poliplas Indah",
    batch: "PO-2407-26",
    tglMasuk: "2024-07-26",
    minStock: 500,
    keterangan: ""
  },
  {
    id: "krg-img-6",
    kode: "700502021025",
    namaKarung: "BROILER 1 SUPER CRUMBLE",
    kategori: "Karung 50 Kg",
    spesifikasi: "065X100 10/10 800 2C",
    lembarPerBal: 500,
    tglPemakaianTerakhir: "18/08/26",
    umurPemakaianHari: 2,
    stockAwal: 12400,
    stockAwalBal: 24,
    pembelian: 5000,
    returProduksi: 0,
    masukLainLain: 0,
    masuk: 5000,
    bonProduksi: 3500,
    gudangKeluar: 0,
    overZak: 0,
    keluarLainLain: 0,
    keluar: 3500,
    afkir: 0,
    fifoLots: [
      { id: "lot-6-1", kav: "3001", tglMasuk: "15/07/26", umurHari: 36, jmlLembar: 8900 },
      { id: "lot-6-2", kav: "3001", tglMasuk: "18/08/26", umurHari: 2, jmlLembar: 5000 }
    ],
    gudangKav: "3001",
    suplier: "PT. Kencana Maju Lestari",
    batch: "PO-2608-18",
    tglMasuk: "2026-08-18",
    minStock: 4000,
    keterangan: ""
  }
];
