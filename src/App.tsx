import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  Download, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Settings, 
  X, 
  Check, 
  RotateCcw, 
  BookOpen, 
  AlertCircle, 
  FileDown, 
  FileSpreadsheet,
  Sparkles, 
  Signature as SignatureIcon,
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  MapPin,
  Search,
  Pencil,
  Undo2,
  Redo2,
  Layers,
  Tag,
  CheckCircle2,
  Cloud,
  Upload,
  LogOut,
  User,
  Shield
} from "lucide-react";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { db, auth, firebaseSignOut, onAuthStateChanged } from "./lib/firebase";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { StockKarungView } from "./components/StockKarungView";
import { StockLabelView } from "./components/StockLabelView";
import { OfficialLaporanPembungkusView } from "./components/OfficialLaporanPembungkusView";
import { WarehouseVisualizations } from "./components/WarehouseVisualizations";
import { SignatureModal } from "./components/SignatureModal";
import { LoginPage } from "./components/LoginPage";
import { LoginSystemSettingsModal } from "./components/LoginSystemSettingsModal";
import { UserProfile, isGuestUser, canEditReportData, canSaveData, canDeleteData } from "./types/auth";
import { JapfaLogo } from "./components/JapfaLogo";
import { KarungReport, KarungItem, DEFAULT_KARUNG_SEED, DEFAULT_INBOUND_LOGS_SEED, DEFAULT_OUTBOUND_LOGS_SEED } from "./types/karung";
import { LabelReport, LabelItem, DEFAULT_LABEL_SEED, DEFAULT_LABEL_INBOUND_SEED, DEFAULT_LABEL_OUTBOUND_SEED, getLabelNoRange } from "./types/label";

// ==========================================
// TYPES & INTERFACES
// ==========================================

interface OutboundReduction {
  id: string;
  timestamp: string; // e.g. "14:32:05"
  qtyKg: number;
  qtyColly: number;
  reason: string;
}

export interface FeedAddOutboundLog {
  id: string;
  itemId: string;
  kode: string;
  namaMaterial: string;
  gudangKav: string;
  collyKeluar: number;
  waktuKeluar: string;
  tanggalKeluar: string;
  batch: string;
  keperluan: string;
  tonaseKg: number;
}

interface StockItem {
  id: string;
  kode: string;
  namaMaterial: string;
  stockAwal: number;       // In kg / Tonase
  stockAwalColly: number;  // In bag/colly count
  masuk: number;
  masukColly: number;
  keluar: number;
  keluarColly: number;
  packagingDesc: string;   // e.g. "@ 25 Kg" or "160 coly"
  beratPerColly?: number;  // Weight per colly (Kg)
  
  // Info Kavling (Lot Details)
  gudangKav: string;       // e.g. "2002"
  suplier: string;         // e.g. "QILU PHARMACEUTICAL INDONESIA"
  tonase?: number;         // Lot Tonase final (optional)
  colly?: number;          // Lot Colly count final (optional)
  tglMasuk: string;        // "YYYY-MM-DD"
  batch: string;           // e.g. "260603"
  mfgDate: string;         // "YYYY-MM-DD"
  expDate: string;         // "YYYY-MM-DD"
  reductions?: OutboundReduction[]; // Historical list of outbound stock reductions / returns
  keterangan?: string;     // Column Keterangan
  checked?: boolean;       // Column Cek
}

interface DailyReport {
  date: string;            // Key format: "YYYY-MM-DD"
  stockAwalDate?: string;  // Custom editable transaction date for Stock Awal (and Masuk, Keluar, Stock Akhir)
  gudangSLoct: string;     // e.g. "2001 - 2002"
  docCode: string;         // e.g. "PLT - WRH - FM - 02 - 03"
  companyName: string;     // e.g. "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG"
  items: StockItem[];
  feedAddOutboundLogs?: FeedAddOutboundLog[];
  dibuatOlehName: string;
  dibuatOlehRole: string;
  dibuatOlehSignature: string | null; // base64 data URL
  mengetahuiName: string;
  mengetahuiRole: string;
  mengetahuiSignature: string | null; // base64 data URL
  status?: string;         // e.g. "VERIFIED OK", "PENDING"
}

interface MasterMaterial {
  kode: string;
  namaMaterial: string;
  packagingDesc: string;
  gudangKavDefault: string;
  suplierDefault: string;
}

// ==========================================
// INITIAL DEMO DATA SEEDS
// ==========================================

const DEFAULT_MASTER_MATERIALS: MasterMaterial[] = [
  { kode: "11200400", namaMaterial: "DL - METHIONINE (99%)", packagingDesc: "@ 1000 Kg", gudangKavDefault: "2001", suplierDefault: "ANNONA PTE LTD" },
  { kode: "11200240", namaMaterial: "LYSINE SULPHATE 70%", packagingDesc: "@ 25 Kg", gudangKavDefault: "2001", suplierDefault: "DIAN CIPTA PERKASA,PT" },
  { kode: "11200640", namaMaterial: "RHODIMET 88", packagingDesc: "@ 1200 Kg", gudangKavDefault: "2001", suplierDefault: "ADISSEO ASIA PACIFIC PTE LTD" },
  { kode: "11234120", namaMaterial: "AXTRA XAP 101 TPT", packagingDesc: "@ 25 Kg", gudangKavDefault: "2002", suplierDefault: "DANISCO ANIMAL NUTRITION" },
  { kode: "11214420", namaMaterial: "CHOLINE CHLORIDE 60%", packagingDesc: "@ 25 Kg", gudangKavDefault: "2001", suplierDefault: "BASF INDONESIA" },
  { kode: "11218700", namaMaterial: "ESKALIN 500", packagingDesc: "@ 25 Kg", gudangKavDefault: "2001", suplierDefault: "PHIBRO ANIMAL HEALTH" },
  { kode: "11234210", namaMaterial: "HOSTAZYME X 15000 EPU", packagingDesc: "@ 20 Kg", gudangKavDefault: "2002", suplierDefault: "HUVEPHARMA EOOD" },
  { kode: "11200800", namaMaterial: "L - THREONINE (98,5%)", packagingDesc: "@ 25 Kg", gudangKavDefault: "2001", suplierDefault: "CJ CHEILJEDANG CORP" },
  { kode: "11213600", namaMaterial: "L-ASCORBATE-2-MONOPHOSPHATE 35%", packagingDesc: "@ 25 Kg", gudangKavDefault: "2002", suplierDefault: "DSM NUTRITIONAL PRODUCTS" },
  { kode: "11223980", namaMaterial: "ANQOL 1%", packagingDesc: "@ 25 Kg", gudangKavDefault: "2002", suplierDefault: "QILU PHARMACEUTICAL INDONESIA" },
  { kode: "11224155", namaMaterial: "DICALCIUM PHOSPHATE 18%", packagingDesc: "@ 50 Kg", gudangKavDefault: "2001", suplierDefault: "YUNNAN PHOSPHATE LTD" },
  { kode: "11225091", namaMaterial: "L-LYSINE SULPHATE 70%", packagingDesc: "@ 25 Kg", gudangKavDefault: "2002", suplierDefault: "CJ INCO LTD" },
  { kode: "11223800", namaMaterial: "CHOLINE CHLORIDE 60% COB", packagingDesc: "@ 25 Kg", gudangKavDefault: "2001", suplierDefault: "BASF INDONESIA" },
  { kode: "11221122", namaMaterial: "METHIONINE 99%", packagingDesc: "@ 25 Kg", gudangKavDefault: "2003", suplierDefault: "SUMITOMO CHEMICAL" },
  { kode: "11226077", namaMaterial: "VITAMIN PREMIX G-02", packagingDesc: "@ 10 Kg", gudangKavDefault: "2002", suplierDefault: "DSM NUTRITION INDONESIA" },
  { kode: "11220045", namaMaterial: "CALCIUM CARBONATE GRIT", packagingDesc: "@ 50 Kg", gudangKavDefault: "2001", suplierDefault: "LOKAL KARYA MANDIRI" }
];

const SEED_DATE = "2026-07-14"; // Default date as in metadata/prompt screenshot

export const DEFAULT_FEED_ADD_OUTBOUND_LOGS: FeedAddOutboundLog[] = [
  {
    id: "out-1",
    itemId: "item-cc60",
    kode: "11214420",
    namaMaterial: "CHOLINE CHLORIDE 60%",
    gudangKav: "2001",
    collyKeluar: 50,
    waktuKeluar: "11.44.46",
    tanggalKeluar: "2026-09-09",
    batch: "260530",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 1250
  },
  {
    id: "out-2",
    itemId: "item-esk",
    kode: "11218700",
    namaMaterial: "ESKALIN 500",
    gudangKav: "2001",
    collyKeluar: 3,
    waktuKeluar: "11.48.06",
    tanggalKeluar: "2026-09-09",
    batch: "250603",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 75
  },
  {
    id: "out-3",
    itemId: "item-host",
    kode: "11234210",
    namaMaterial: "HOSTAZYME X 15000 EPU",
    gudangKav: "2002",
    collyKeluar: 4,
    waktuKeluar: "11.47.25",
    tanggalKeluar: "2026-09-09",
    batch: "260724",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 80
  },
  {
    id: "out-4",
    itemId: "item-threo",
    kode: "11200800",
    namaMaterial: "L - THREONINE (98,5%)",
    gudangKav: "2001",
    collyKeluar: 50,
    waktuKeluar: "11.45.23",
    tanggalKeluar: "2026-09-09",
    batch: "260610",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 1250
  },
  {
    id: "out-5",
    itemId: "item-ascor",
    kode: "11213600",
    namaMaterial: "L-ASCORBATE-2-MONOPHOSPHATE 35%",
    gudangKav: "2002",
    collyKeluar: 4,
    waktuKeluar: "11.47.36",
    tanggalKeluar: "2026-09-09",
    batch: "260708",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 100
  },
  {
    id: "out-6",
    itemId: "item-meth",
    kode: "11221122",
    namaMaterial: "METHIONINE 99%",
    gudangKav: "2003",
    collyKeluar: 60,
    waktuKeluar: "10.15.20",
    tanggalKeluar: "2026-09-09",
    batch: "260512",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 1500
  },
  {
    id: "out-7",
    itemId: "item-lys",
    kode: "11225091",
    namaMaterial: "L-LYSINE SULPHATE 70%",
    gudangKav: "2002",
    collyKeluar: 50,
    waktuKeluar: "10.30.12",
    tanggalKeluar: "2026-09-09",
    batch: "260618",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 1250
  },
  {
    id: "out-8",
    itemId: "item-2",
    kode: "11224155",
    namaMaterial: "DICALCIUM PHOSPHATE 18%",
    gudangKav: "2001",
    collyKeluar: 50,
    waktuKeluar: "09.45.00",
    tanggalKeluar: "2026-09-09",
    batch: "260515",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 1250
  },
  {
    id: "out-9",
    itemId: "item-1",
    kode: "11223980",
    namaMaterial: "ANQOL 1%",
    gudangKav: "2002",
    collyKeluar: 40,
    waktuKeluar: "09.20.15",
    tanggalKeluar: "2026-09-09",
    batch: "260603",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 1000
  },
  {
    id: "out-10",
    itemId: "item-4",
    kode: "11223800",
    namaMaterial: "CHOLINE CHLORIDE 60% COB",
    gudangKav: "2001",
    collyKeluar: 40,
    waktuKeluar: "08.55.10",
    tanggalKeluar: "2026-09-09",
    batch: "260701",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 1000
  },
  {
    id: "out-11",
    itemId: "item-vit",
    kode: "11226077",
    namaMaterial: "VITAMIN PREMIX G-02",
    gudangKav: "2002",
    collyKeluar: 34,
    waktuKeluar: "08.30.22",
    tanggalKeluar: "2026-09-09",
    batch: "260620",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 850
  },
  {
    id: "out-12",
    itemId: "item-calc",
    kode: "11220045",
    namaMaterial: "CALCIUM CARBONATE GRIT",
    gudangKav: "2001",
    collyKeluar: 30,
    waktuKeluar: "08.10.45",
    tanggalKeluar: "2026-09-09",
    batch: "260525",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 750
  },
  {
    id: "out-13",
    itemId: "item-axtra",
    kode: "11234120",
    namaMaterial: "AXTRA XAP 101 TPT",
    gudangKav: "2002",
    collyKeluar: 20,
    waktuKeluar: "07.45.10",
    tanggalKeluar: "2026-09-09",
    batch: "260708",
    keperluan: "Pengeluaran Outbound",
    tonaseKg: 500
  }
];

const DEFAULT_ITEMS_SEED: StockItem[] = [
  {
    id: "item-meth-lot1",
    kode: "11200400",
    namaMaterial: "DL - METHIONINE (99%)",
    stockAwal: 120000,
    stockAwalColly: 120,
    masuk: 0,
    masukColly: 0,
    keluar: 0,
    keluarColly: 0,
    packagingDesc: "@ 1000 Kg",
    beratPerColly: 1000,
    gudangKav: "2001",
    suplier: "ANNONA PTE LTD",
    tglMasuk: "2026-08-07",
    batch: "260807",
    mfgDate: "2026-05-10",
    expDate: "2028-05-10",
    tonase: 120000,
    colly: 120
  },
  {
    id: "item-meth-lot2",
    kode: "11200400",
    namaMaterial: "DL - METHIONINE (99%)",
    stockAwal: 60000,
    stockAwalColly: 60,
    masuk: 0,
    masukColly: 0,
    keluar: 0,
    keluarColly: 0,
    packagingDesc: "@ 1000 Kg",
    beratPerColly: 1000,
    gudangKav: "2001",
    suplier: "ANNONA PTE LTD",
    tglMasuk: "2026-08-08",
    batch: "260808",
    mfgDate: "2026-05-11",
    expDate: "2028-05-11",
    tonase: 60000,
    colly: 60
  },
  {
    id: "item-lysine-lot1",
    kode: "11200240",
    namaMaterial: "LYSINE SULPHATE 70%",
    stockAwal: 53000,
    stockAwalColly: 2120,
    masuk: 0,
    masukColly: 0,
    keluar: 0,
    keluarColly: 0,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2001",
    suplier: "DIAN CIPTA PERKASA,PT",
    tglMasuk: "2026-08-27",
    batch: "260827",
    mfgDate: "2026-06-15",
    expDate: "2028-06-15",
    tonase: 53000,
    colly: 2120
  },
  {
    id: "item-rhodimet-lot1",
    kode: "11200640",
    namaMaterial: "RHODIMET 88",
    stockAwal: 48000,
    stockAwalColly: 40,
    masuk: 0,
    masukColly: 0,
    keluar: 0,
    keluarColly: 0,
    packagingDesc: "@ 1200 Kg",
    beratPerColly: 1200,
    gudangKav: "2001",
    suplier: "ADISSEO ASIA PACIFIC PTE LTD",
    tglMasuk: "2026-08-01",
    batch: "260801",
    mfgDate: "2026-05-01",
    expDate: "2028-05-01",
    tonase: 48000,
    colly: 40
  },
  {
    id: "item-axtra",
    kode: "11234120",
    namaMaterial: "AXTRA XAP 101 TPT",
    stockAwal: 1725,
    stockAwalColly: 69,
    masuk: 0,
    masukColly: 0,
    keluar: 500,
    keluarColly: 20,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2002",
    suplier: "DANISCO ANIMAL NUTRITION",
    tglMasuk: "2026-07-08",
    batch: "260708",
    mfgDate: "2026-04-10",
    expDate: "2028-04-10",
    tonase: 1225,
    colly: 49
  },
  {
    id: "item-cc60",
    kode: "11214420",
    namaMaterial: "CHOLINE CHLORIDE 60%",
    stockAwal: 5000,
    stockAwalColly: 200,
    masuk: 0,
    masukColly: 0,
    keluar: 1250,
    keluarColly: 50,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2001",
    suplier: "BASF INDONESIA",
    tglMasuk: "2026-05-30",
    batch: "260530",
    mfgDate: "2026-02-15",
    expDate: "2028-02-15",
    tonase: 3750,
    colly: 150
  },
  {
    id: "item-esk",
    kode: "11218700",
    namaMaterial: "ESKALIN 500",
    stockAwal: 1000,
    stockAwalColly: 40,
    masuk: 0,
    masukColly: 0,
    keluar: 75,
    keluarColly: 3,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2001",
    suplier: "PHIBRO ANIMAL HEALTH",
    tglMasuk: "2026-06-03",
    batch: "250603",
    mfgDate: "2025-06-01",
    expDate: "2027-06-01",
    tonase: 925,
    colly: 37
  },
  {
    id: "item-host",
    kode: "11234210",
    namaMaterial: "HOSTAZYME X 15000 EPU",
    stockAwal: 800,
    stockAwalColly: 40,
    masuk: 0,
    masukColly: 0,
    keluar: 80,
    keluarColly: 4,
    packagingDesc: "@ 20 Kg",
    beratPerColly: 20,
    gudangKav: "2002",
    suplier: "HUVEPHARMA EOOD",
    tglMasuk: "2026-07-24",
    batch: "260724",
    mfgDate: "2026-04-12",
    expDate: "2028-04-12",
    tonase: 720,
    colly: 36
  },
  {
    id: "item-threo",
    kode: "11200800",
    namaMaterial: "L - THREONINE (98,5%)",
    stockAwal: 6000,
    stockAwalColly: 240,
    masuk: 0,
    masukColly: 0,
    keluar: 1250,
    keluarColly: 50,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2001",
    suplier: "CJ CHEILJEDANG CORP",
    tglMasuk: "2026-06-10",
    batch: "260610",
    mfgDate: "2026-03-01",
    expDate: "2028-03-01",
    tonase: 4750,
    colly: 190
  },
  {
    id: "item-ascor",
    kode: "11213600",
    namaMaterial: "L-ASCORBATE-2-MONOPHOSPHATE 35%",
    stockAwal: 1500,
    stockAwalColly: 60,
    masuk: 0,
    masukColly: 0,
    keluar: 100,
    keluarColly: 4,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2002",
    suplier: "DSM NUTRITIONAL PRODUCTS",
    tglMasuk: "2026-07-08",
    batch: "260708",
    mfgDate: "2026-04-05",
    expDate: "2028-04-05",
    tonase: 1400,
    colly: 56
  },
  {
    id: "item-1",
    kode: "11223980",
    namaMaterial: "ANQOL 1%",
    stockAwal: 4000,
    stockAwalColly: 160,
    masuk: 0,
    masukColly: 0,
    keluar: 1000,
    keluarColly: 40,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2002",
    suplier: "QILU PHARMACEUTICAL INDONESIA,",
    tglMasuk: "2026-06-03",
    batch: "260603",
    mfgDate: "2026-03-24",
    expDate: "2028-03-24",
    tonase: 3000,
    colly: 120
  },
  {
    id: "item-2",
    kode: "11224155",
    namaMaterial: "DICALCIUM PHOSPHATE 18%",
    stockAwal: 15000,
    stockAwalColly: 300,
    masuk: 5000,
    masukColly: 100,
    keluar: 3750,
    keluarColly: 100,
    packagingDesc: "@ 50 Kg",
    beratPerColly: 50,
    gudangKav: "2001",
    suplier: "YUNNAN PHOSPHATE LTD",
    tglMasuk: "2026-05-15",
    batch: "YN-260515",
    mfgDate: "2026-02-10",
    expDate: "2029-02-10",
    tonase: 16250,
    colly: 300
  },
  {
    id: "item-3",
    kode: "11225091",
    namaMaterial: "L-LYSINE SULPHATE 70%",
    stockAwal: 8000,
    stockAwalColly: 320,
    masuk: 0,
    masukColly: 0,
    keluar: 2450,
    keluarColly: 98,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2002",
    suplier: "CJ INCO LTD",
    tglMasuk: "2026-06-10",
    batch: "CJ-0610-26",
    mfgDate: "2026-04-01",
    expDate: "2028-04-01",
    tonase: 5550,
    colly: 222
  },
  {
    id: "item-4",
    kode: "11223800",
    namaMaterial: "CHOLINE CHLORIDE 60% COB",
    stockAwal: 6000,
    stockAwalColly: 240,
    masuk: 10000,
    masukColly: 400,
    keluar: 5000,
    keluarColly: 200,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2001",
    suplier: "BASF INDONESIA",
    tglMasuk: "2026-07-01",
    batch: "BF-260701",
    mfgDate: "2026-05-01",
    expDate: "2028-05-01",
    tonase: 11000,
    colly: 440
  },
  {
    id: "item-meth",
    kode: "11221122",
    namaMaterial: "METHIONINE 99%",
    stockAwal: 5000,
    stockAwalColly: 200,
    masuk: 0,
    masukColly: 0,
    keluar: 1500,
    keluarColly: 60,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2003",
    suplier: "SUMITOMO CHEMICAL",
    tglMasuk: "2026-05-12",
    batch: "260512",
    mfgDate: "2026-03-10",
    expDate: "2028-03-10",
    tonase: 3500,
    colly: 140
  },
  {
    id: "item-vit",
    kode: "11226077",
    namaMaterial: "VITAMIN PREMIX G-02",
    stockAwal: 2000,
    stockAwalColly: 80,
    masuk: 0,
    masukColly: 0,
    keluar: 850,
    keluarColly: 34,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2002",
    suplier: "DSM NUTRITION INDONESIA",
    tglMasuk: "2026-06-20",
    batch: "260620",
    mfgDate: "2026-04-15",
    expDate: "2028-04-15",
    tonase: 1150,
    colly: 46
  },
  {
    id: "item-calc",
    kode: "11220045",
    namaMaterial: "CALCIUM CARBONATE GRIT",
    stockAwal: 4000,
    stockAwalColly: 160,
    masuk: 0,
    masukColly: 0,
    keluar: 750,
    keluarColly: 30,
    packagingDesc: "@ 25 Kg",
    beratPerColly: 25,
    gudangKav: "2001",
    suplier: "LOKAL KARYA MANDIRI",
    tglMasuk: "2026-05-25",
    batch: "260525",
    mfgDate: "2026-03-01",
    expDate: "2028-03-01",
    tonase: 3250,
    colly: 130
  }
];

// Helper function to format date YYYY-MM-DD to YYMMDD
const formatDateToYYMMDD = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parts[0].slice(-2);
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    return `${year}${month}${day}`;
  }
  return dateStr;
};

// ==========================================
// COMPONENT: EDIT LOT MODAL
// ==========================================

interface EditLotModalProps {
  item: StockItem | null;
  onClose: () => void;
  onSave: (updatedItem: StockItem) => void;
}

function EditLotModal({ item, onClose, onSave }: EditLotModalProps) {
  if (!item) return null;

  const [formData, setFormData] = useState<StockItem>({ ...item });

  useEffect(() => {
    setFormData({ ...item });
  }, [item]);

  const handleChange = (field: keyof StockItem, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "tglMasuk") {
        updated.batch = formatDateToYYMMDD(value);
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white border-2 border-[#1A1A1A] rounded-lg shadow-xl w-full max-w-xl overflow-hidden my-8">
        <div className="bg-[#1A1A1A] text-white px-5 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-400" />
            <h3 className="font-serif italic font-bold text-base">Edit Detail Lot Kavling</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50/60 border border-amber-200 rounded p-3 text-xs flex justify-between items-center">
            <div>
              <span className="font-mono font-bold text-neutral-600 block">{formData.kode}</span>
              <span className="font-bold text-neutral-800 text-sm">{formData.namaMaterial}</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold uppercase">
              Lot ID: {formData.id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Gudang / Kavling</label>
              <input
                type="text"
                value={formData.gudangKav || ""}
                onChange={(e) => handleChange("gudangKav", e.target.value)}
                placeholder="Contoh: 2002"
                className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Supplier / Pabrik</label>
              <input
                type="text"
                value={formData.suplier || ""}
                onChange={(e) => handleChange("suplier", e.target.value)}
                placeholder="Nama Supplier"
                className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-sans rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Stock Awal (Kg / Tonase)</label>
              <input
                type="number"
                value={formData.stockAwal ?? 0}
                onChange={(e) => handleChange("stockAwal", Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Stock Awal (Colly / Bag)</label>
              <input
                type="number"
                value={formData.stockAwalColly ?? 0}
                onChange={(e) => handleChange("stockAwalColly", Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Tanggal Masuk</label>
              <input
                type="date"
                value={formData.tglMasuk || ""}
                onChange={(e) => handleChange("tglMasuk", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                Batch / No Lot <span className="text-[8px] text-emerald-700 italic">(Otomatis YYMMDD)</span>
              </label>
              <input
                type="text"
                value={formData.batch || ""}
                onChange={(e) => handleChange("batch", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Tanggal MFG (Manufacturing)</label>
              <input
                type="date"
                value={formData.mfgDate || ""}
                onChange={(e) => handleChange("mfgDate", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Tanggal EXP (Expired)</label>
              <input
                type="date"
                value={formData.expDate || ""}
                onChange={(e) => handleChange("expDate", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Keterangan / Catatan</label>
              <input
                type="text"
                value={formData.keterangan || ""}
                onChange={(e) => handleChange("keterangan", e.target.value)}
                placeholder="Catatan khusus untuk lot ini..."
                className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-sans rounded focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold rounded cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1A1A1A] text-white hover:bg-[#333333] text-xs font-semibold rounded shadow cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================

export default function App() {
  // User Authentication & Session State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("japfa_warehouse_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isLoginSettingsModalOpen, setIsLoginSettingsModalOpen] = useState<boolean>(false);

  // User Permission Flags based on user identity
  // 1. Akun atas nama tamu hanya bisa melihat, tidak bisa mengedit, hapus, dan simpan semua data
  // 2. Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan
  const isGuest = isGuestUser(currentUser);
  const canEditReport = canEditReportData(currentUser);
  const canSave = canSaveData(currentUser);
  const canDelete = canDeleteData(currentUser);

  const handleOpenLoginSettings = () => {
    if (isGuest) {
      setToast({
        message: "Akses Ditolak: Akun Tamu tidak memiliki izin administrator.",
        type: "error"
      });
      return;
    }
    setIsLoginSettingsModalOpen(true);
  };

  const [selectedDate, setSelectedDate] = useState<string>(SEED_DATE);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "stock" | "stock-karung" | "stock-label" | "laporan-resmi" | "masuk" | "keluar" | "kavling">("dashboard");
  const [feedAddSubTab, setFeedAddSubTab] = useState<"table" | "masuk" | "keluar" | "kavling">("table");

  // Helper synchronization for STOK FEED ADD
  const effectiveFeedAddSubTab: "table" | "masuk" | "keluar" | "kavling" = 
    (activeTab === "masuk" || activeTab === "keluar" || activeTab === "kavling")
      ? (activeTab as "masuk" | "keluar" | "kavling")
      : feedAddSubTab;

  const isStockFeedAddActive = activeTab === "stock" || activeTab === "masuk" || activeTab === "keluar" || activeTab === "kavling";
  const [reports, setReports] = useState<Record<string, DailyReport>>(() => ({
    [SEED_DATE]: {
      date: SEED_DATE,
      gudangSLoct: "2001 - 2002",
      docCode: "PLT - WRH - FM - 02 - 03",
      companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
      items: DEFAULT_ITEMS_SEED,
      dibuatOlehName: "Sabto A",
      dibuatOlehRole: "Admin Gudang",
      dibuatOlehSignature: null,
      mengetahuiName: "Antonius Andri Waroto",
      mengetahuiRole: "Head Of Wrh Sub.Dept",
      mengetahuiSignature: null,
      feedAddOutboundLogs: DEFAULT_FEED_ADD_OUTBOUND_LOGS
    }
  }));
  const [karungReports, setKarungReports] = useState<Record<string, KarungReport>>(() => ({
    [SEED_DATE]: {
      date: SEED_DATE,
      gudangSLoct: "Gudang Kemasan & Sacks",
      docCode: "FR-WHS-KRG-01",
      companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
      items: DEFAULT_KARUNG_SEED,
      dibuatOlehName: "Sabto A",
      dibuatOlehRole: "Admin Gudang",
      dibuatOlehSignature: null,
      mengetahuiName: "Antonius Andri Waroto",
      mengetahuiRole: "Head Of Wrh Sub.Dept",
      mengetahuiSignature: null
    }
  }));
  const [labelReports, setLabelReports] = useState<Record<string, LabelReport>>(() => ({
    [SEED_DATE]: {
      date: SEED_DATE,
      gudangSLoct: "3002",
      docCode: "PLT - WRH - FM – 03 - 02",
      companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
      title: "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS",
      subTitle: "LABEL PAKAN & AKSESORIS KEMASAN",
      items: DEFAULT_LABEL_SEED,
      inboundLogs: DEFAULT_LABEL_INBOUND_SEED,
      outboundLogs: DEFAULT_LABEL_OUTBOUND_SEED,
      dibuatOlehName: "Sabto A",
      dibuatOlehRole: "Admin Gudang",
      dibuatOlehSignature: null,
      mengetahuiName: "Antonius Andri Waroto",
      mengetahuiRole: "Head Of Wrh Sub.Dept",
      mengetahuiSignature: null
    }
  }));
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>(DEFAULT_MASTER_MATERIALS);
  
  // Undo / Redo history state
  const [history, setHistory] = useState<Record<string, DailyReport>[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyRef = useRef<Record<string, DailyReport>[]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);
  
  // Modals / Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [editingLotItem, setEditingLotItem] = useState<StockItem | null>(null);
  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean;
    role: "dibuat" | "mengetahui";
    title: string;
    defaultName: string;
  } | null>(null);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  // State for manual / global save features
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  });

  // Custom confirmation state for reset and delete all
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);

  // State to track if PDF file is being generated
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrinterType, setSelectedPrinterType] = useState<"standard" | "pdf_virtual" | "dotmatrix" | "thermal">("standard");
  const [printMethod, setPrintMethod] = useState<"system" | "pdf">("system");

  // Quick edit mode (Inline Table editing)
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: keyof StockItem } | null>(null);

  // Form state for Incoming Stock Addition (Tambah Stock Masuk)
  const [addKg, setAddKg] = useState<string>("");
  const [addColly, setAddColly] = useState<string>("");
  const [addBeratPerColly, setAddBeratPerColly] = useState<string>("");

  // ==========================================
  // STATE FOR NEW 9-COLUMN RECEIPT (PENERIMAAN) FEATURE
  // ==========================================
  const [rcvIsNewItem, setRcvIsNewItem] = useState<boolean>(false);
  const [rcvSelectedItemId, setRcvSelectedItemId] = useState<string>("");
  const [rcvMasterKode, setRcvMasterKode] = useState<string>("");
  const [rcvCustomKode, setRcvCustomKode] = useState<string>("");
  const [rcvNamaMaterial, setRcvNamaMaterial] = useState<string>("");
  const [rcvSupplier, setRcvSupplier] = useState<string>("");
  const [rcvGudangKav, setRcvGudangKav] = useState<string>("");
  const [rcvColly, setRcvColly] = useState<string>("");
  const [rcvKgPerColly, setRcvKgPerColly] = useState<string>("25");
  const [rcvTotalKg, setRcvTotalKg] = useState<string>("");
  const [rcvTanggalMasuk, setRcvTanggalMasuk] = useState<string>("");
  const [rcvBatch, setRcvBatch] = useState<string>("");
  const [rcvMfgDate, setRcvMfgDate] = useState<string>("");
  const [rcvExpDate, setRcvExpDate] = useState<string>("");
  
  // Tab inner state for Penerimaan screen: 'log' for 9-column log, 'stok' for Active Inventory
  const [penerimaanTab, setPenerimaanTab] = useState<"log" | "stok">("log");

  // Tab inner state for Pengeluaran (Outbound) screen: 'log' for 9-column log, 'stok' for Active Inventory
  const [outboundTab, setOutboundTab] = useState<"log" | "stok">("log");
  const [outboundFilter, setOutboundFilter] = useState<string>("all");
  const [outCatatan, setOutCatatan] = useState<string>("");

  // Form state for Outgoing Stock (Isi Pengeluaran)
  const [outKg, setOutKg] = useState<string>("");
  const [outColly, setOutColly] = useState<string>("");
  const [outBeratPerColly, setOutBeratPerColly] = useState<string>("");

  // Effect to update outBeratPerColly when activeItemId changes
  useEffect(() => {
    const currentReport = reports[selectedDate] || { items: [] };
    const currentItem = currentReport.items.find(item => item.id === activeItemId);
    if (currentItem) {
      const defaultBerat = currentItem.beratPerColly !== undefined ? currentItem.beratPerColly : (() => {
        if (!currentItem.packagingDesc) return 25;
        const match = currentItem.packagingDesc.match(/(\d+)/);
        return match ? Number(match[1]) : 25;
      })();
      setOutBeratPerColly(String(defaultBerat));
    }
  }, [activeItemId, selectedDate, reports]);

  // Effect to pre-populate or reset receiving form fields dynamically
  useEffect(() => {
    const currentReport = reports[selectedDate] || { items: [] };
    if (!rcvIsNewItem) {
      // Existing item mode
      // If we don't have a selection but we have items, default to activeItemId or the first item
      const targetId = rcvSelectedItemId || activeItemId || (currentReport.items[0]?.id || "");
      if (targetId && rcvSelectedItemId !== targetId) {
        setRcvSelectedItemId(targetId);
      }
      
      const currentItem = currentReport.items.find(item => item.id === targetId);
      if (currentItem) {
        setRcvNamaMaterial(currentItem.namaMaterial);
        setRcvSupplier(currentItem.suplier || "");
        setRcvGudangKav(currentItem.gudangKav || "");
        const tglMasukVal = currentItem.tglMasuk || selectedDate;
        setRcvTanggalMasuk(tglMasukVal);
        setRcvBatch(currentItem.batch || formatDateToYYMMDD(tglMasukVal));
        setRcvMfgDate(currentItem.mfgDate || "");
        setRcvExpDate(currentItem.expDate || "");
        const defaultBerat = currentItem.beratPerColly !== undefined ? currentItem.beratPerColly : (() => {
          if (!currentItem.packagingDesc) return 25;
          const match = currentItem.packagingDesc.match(/(\d+)/);
          return match ? Number(match[1]) : 25;
        })();
        setRcvKgPerColly(String(defaultBerat));
      }
    } else {
      // New item mode
      if (rcvMasterKode === "custom") {
        // Leave fields open for custom input
        if (rcvNamaMaterial === "ANQOL 1%" || !rcvNamaMaterial) {
          setRcvNamaMaterial("");
          setRcvSupplier("");
          setRcvGudangKav("");
          setRcvKgPerColly("25");
          setRcvTanggalMasuk(selectedDate);
          setRcvBatch(formatDateToYYMMDD(selectedDate));
          setRcvMfgDate("");
          setRcvExpDate("");
        }
      } else if (rcvMasterKode) {
        const master = masterMaterials.find(m => m.kode === rcvMasterKode);
        if (master) {
          setRcvNamaMaterial(master.namaMaterial);
          setRcvSupplier(master.suplierDefault);
          setRcvGudangKav(master.gudangKavDefault);
          const defaultBerat = (() => {
            if (!master.packagingDesc) return 25;
            const match = master.packagingDesc.match(/(\d+)/);
            return match ? Number(match[1]) : 25;
          })();
          setRcvKgPerColly(String(defaultBerat));
          setRcvTanggalMasuk(selectedDate);
          setRcvBatch(formatDateToYYMMDD(selectedDate));
          setRcvMfgDate("");
          setRcvExpDate("");
        }
      } else {
        // Default to first master material on toggle
        if (masterMaterials.length > 0) {
          setRcvMasterKode(masterMaterials[0].kode);
        }
      }
    }
  }, [rcvIsNewItem, rcvSelectedItemId, rcvMasterKode, activeItemId, reports, selectedDate, masterMaterials]);

  // Helper functions for auto-calculating in 9-column Receipt form
  const handleRcvCollyChange = (val: string) => {
    setRcvColly(val);
    const collyNum = Number(val);
    const beratNum = Number(rcvKgPerColly) || 0;
    if (val === "") {
      setRcvTotalKg("");
    } else if (!isNaN(collyNum)) {
      setRcvTotalKg(String(collyNum * beratNum));
    }
  };

  const handleRcvKgPerCollyChange = (val: string) => {
    setRcvKgPerColly(val);
    const beratNum = Number(val);
    const collyNum = Number(rcvColly) || 0;
    if (rcvColly !== "" && !isNaN(beratNum)) {
      setRcvTotalKg(String(collyNum * beratNum));
    }
  };

  // Reset forms when selected item changes
  useEffect(() => {
    setAddKg("");
    setAddColly("");
    setOutKg("");
    setOutColly("");

    // Find current active item to set default weight per colly
    const currentReport = reports[selectedDate];
    const currentItem = currentReport?.items?.find(item => item.id === activeItemId);
    if (currentItem) {
      const defaultBerat = currentItem.beratPerColly !== undefined ? currentItem.beratPerColly : (() => {
        if (!currentItem.packagingDesc) return 25;
        const match = currentItem.packagingDesc.match(/(\d+)/);
        return match ? Number(match[1]) : 25;
      })();
      setAddBeratPerColly(String(defaultBerat));
      setOutBeratPerColly(String(defaultBerat));
    } else {
      setAddBeratPerColly("25");
      setOutBeratPerColly("25");
    }
  }, [activeItemId, reports, selectedDate]);

  // Helper functions for auto-calculating in Stock In form
  const handleAddCollyChange = (val: string) => {
    setAddColly(val);
    const collyNum = Number(val);
    const beratNum = Number(addBeratPerColly) || 0;
    if (val === "") {
      setAddKg("");
    } else if (!isNaN(collyNum)) {
      setAddKg(String(collyNum * beratNum));
    }
  };

  const handleAddBeratPerCollyChange = (val: string) => {
    setAddBeratPerColly(val);
    const beratNum = Number(val);
    const collyNum = Number(addColly) || 0;
    if (addColly !== "" && !isNaN(beratNum)) {
      setAddKg(String(collyNum * beratNum));
    }
  };

  // Helper functions for auto-calculating in Stock Out form
  const handleOutCollyChange = (val: string) => {
    setOutColly(val);
    const collyNum = Number(val);
    const beratNum = Number(outBeratPerColly) || 0;
    if (val === "") {
      setOutKg("");
    } else if (!isNaN(collyNum)) {
      setOutKg(String(collyNum * beratNum));
    }
  };

  const handleOutBeratPerCollyChange = (val: string) => {
    setOutBeratPerColly(val);
    const beratNum = Number(val);
    const collyNum = Number(outColly) || 0;
    if (outColly !== "" && !isNaN(beratNum)) {
      setOutKg(String(collyNum * beratNum));
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const saveCatalogToFirestore = async (updatedCatalog: MasterMaterial[]) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menyimpan data!", "error");
      return;
    }
    setMasterMaterials(updatedCatalog);
    try {
      await setDoc(doc(db, "settings", "catalog"), { items: updatedCatalog });
    } catch (e) {
      console.error("Gagal menyimpan katalog ke Firestore:", e);
    }
  };

  // Comprehensive Save Feature for All Stock & Reports
  const handleSaveAllStock = async () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menyimpan data!", "error");
      return;
    }
    setIsSaving(true);
    try {
      // 1. Simpan laporan aktif Bahan Pembantu
      const currentReport = reports[selectedDate] || {
        date: selectedDate,
        gudangSLoct: "2001 - 2002",
        docCode: "PLT - WRH - FM - 02 - 03",
        companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
        items: [],
        dibuatOlehName: "Sabto A",
        dibuatOlehRole: "Admin Gudang",
        dibuatOlehSignature: null,
        mengetahuiName: "Antonius Andri Waroto",
        mengetahuiRole: "Head Of Wrh Sub.Dept",
        mengetahuiSignature: null
      };
      await setDoc(doc(db, "reports", selectedDate), currentReport);

      // 2. Simpan laporan Stock Karung
      const currentKarung = karungReports[selectedDate] || getActiveKarungReport();
      if (currentKarung) {
        await setDoc(doc(db, "karung_reports", selectedDate), currentKarung);
      }

      // 3. Simpan laporan Stock Label
      const currentLabel = labelReports[selectedDate] || getActiveLabelReport();
      if (currentLabel) {
        await setDoc(doc(db, "label_reports", selectedDate), currentLabel);
      }

      // 4. Simpan Master Materials catalog
      if (masterMaterials && masterMaterials.length > 0) {
        await setDoc(doc(db, "settings", "catalog"), { items: masterMaterials });
      }

      // Snapshot ke LocalStorage untuk backup offline
      try {
        localStorage.setItem(`japfa_stock_backup_${selectedDate}`, JSON.stringify({
          report: currentReport,
          karung: currentKarung,
          label: currentLabel,
          savedAt: new Date().toISOString()
        }));
      } catch (err) {
        console.warn("LocalStorage backup skip:", err);
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedTime(timeStr);
      showNotification(`Seluruh data stock tanggal ${selectedDate} berhasil disimpan ke database cloud! (${timeStr})`, "success");
    } catch (e) {
      console.error("Gagal simpan data stock ke Firestore:", e);
      showNotification("Gagal menyimpan data stock. Pastikan koneksi internet aktif.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Global Keyboard Shortcut: Ctrl+S / Cmd+S untuk Simpan Stock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveAllStock();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDate, reports, karungReports, labelReports, masterMaterials]);

  // Initialize and listen to real-time data from Firebase Firestore
  useEffect(() => {
    // 1. Listen to 'reports' collection in Firestore
    const reportsRef = collection(db, "reports");
    const unsubscribeReports = onSnapshot(reportsRef, (snapshot) => {
      const firestoreReports: Record<string, DailyReport> = {};
      snapshot.forEach((docSnap) => {
        firestoreReports[docSnap.id] = docSnap.data() as DailyReport;
      });

      if (Object.keys(firestoreReports).length > 0) {
        setReports(firestoreReports);
        setHistory(prev => (prev.length === 0 ? [firestoreReports] : prev));
        setHistoryIndex(prev => (prev === -1 ? 0 : prev));
      } else {
        // Seed default initial report if collection is empty
        const initialReport: DailyReport = {
          date: SEED_DATE,
          gudangSLoct: "2001 - 2002",
          docCode: "PLT - WRH - FM - 02 - 03",
          companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
          items: DEFAULT_ITEMS_SEED,
          dibuatOlehName: "Sabto A",
          dibuatOlehRole: "Admin Gudang",
          dibuatOlehSignature: null,
          mengetahuiName: "Antonius Andri Waroto",
          mengetahuiRole: "Head Of Wrh Sub.Dept",
          mengetahuiSignature: null
        };
        const initialMap = { [SEED_DATE]: initialReport };
        setReports(initialMap);
        setHistory([initialMap]);
        setHistoryIndex(0);
        setDoc(doc(db, "reports", SEED_DATE), initialReport).catch(e =>
          console.error("Gagal seed report awal ke Firestore:", e)
        );
      }
    }, (error) => {
      console.error("Firestore reports listener error:", error);
    });

    // 2. Listen to 'catalog' document in Firestore
    const catalogRef = doc(db, "settings", "catalog");
    const unsubscribeCatalog = onSnapshot(catalogRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) {
        setMasterMaterials(docSnap.data().items as MasterMaterial[]);
      } else {
        setMasterMaterials(DEFAULT_MASTER_MATERIALS);
        setDoc(catalogRef, { items: DEFAULT_MASTER_MATERIALS }).catch(e =>
          console.error("Gagal seed catalog ke Firestore:", e)
        );
      }
    }, (error) => {
      console.error("Firestore catalog listener error:", error);
    });

    // 3. Listen to 'karung_reports' collection in Firestore
    const karungRef = collection(db, "karung_reports");
    const unsubscribeKarung = onSnapshot(karungRef, (snapshot) => {
      const kReports: Record<string, KarungReport> = {};
      snapshot.forEach((docSnap) => {
        kReports[docSnap.id] = docSnap.data() as KarungReport;
      });

      if (Object.keys(kReports).length > 0) {
        setKarungReports(kReports);
      } else {
        const initialKarungReport: KarungReport = {
          date: SEED_DATE,
          gudangSLoct: "Gudang Kemasan & Sacks",
          docCode: "FR-WHS-KRG-01",
          companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
          items: DEFAULT_KARUNG_SEED,
          dibuatOlehName: "Sabto A",
          dibuatOlehRole: "Admin Gudang",
          dibuatOlehSignature: null,
          mengetahuiName: "Antonius Andri Waroto",
          mengetahuiRole: "Head Of Wrh Sub.Dept",
          mengetahuiSignature: null
        };
        setKarungReports({ [SEED_DATE]: initialKarungReport });
        setDoc(doc(db, "karung_reports", SEED_DATE), initialKarungReport).catch(e =>
          console.error("Gagal seed karung report ke Firestore:", e)
        );
      }
    }, (error) => {
      console.error("Firestore karung_reports listener error:", error);
    });

    // 4. Listen to 'label_reports' collection in Firestore
    const labelRef = collection(db, "label_reports");
    const unsubscribeLabel = onSnapshot(labelRef, (snapshot) => {
      const lReports: Record<string, LabelReport> = {};
      snapshot.forEach((docSnap) => {
        lReports[docSnap.id] = docSnap.data() as LabelReport;
      });

      if (Object.keys(lReports).length > 0) {
        setLabelReports(lReports);
      } else {
        const initialLabelReport: LabelReport = {
          date: SEED_DATE,
          gudangSLoct: "3002",
          docCode: "PLT - WRH - FM – 03 - 02",
          companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
          title: "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS",
          subTitle: "LABEL PAKAN & AKSESORIS KEMASAN",
          items: DEFAULT_LABEL_SEED,
          inboundLogs: DEFAULT_LABEL_INBOUND_SEED,
          outboundLogs: DEFAULT_LABEL_OUTBOUND_SEED,
          dibuatOlehName: "Sabto A",
          dibuatOlehRole: "Admin Gudang",
          dibuatOlehSignature: null,
          mengetahuiName: "Antonius Andri Waroto",
          mengetahuiRole: "Head Of Wrh Sub.Dept",
          mengetahuiSignature: null
        };
        setLabelReports({ [SEED_DATE]: initialLabelReport });
        setDoc(doc(db, "label_reports", SEED_DATE), initialLabelReport).catch(e =>
          console.error("Gagal seed label report ke Firestore:", e)
        );
      }
    }, (error) => {
      console.error("Firestore label_reports listener error:", error);
    });

    return () => {
      unsubscribeReports();
      unsubscribeCatalog();
      unsubscribeKarung();
      unsubscribeLabel();
    };
  }, []);

  // Sync auth state with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setCurrentUser((prev) => {
          if (prev && prev.loginMethod !== "google") {
            return prev;
          }
          let role: UserProfile["role"] = "Admin Gudang";
          if (fbUser.email?.toLowerCase().includes("sabtoagito") || fbUser.email?.toLowerCase().includes("supervisor")) {
            role = "Supervisor Gudang";
          } else if (fbUser.email?.toLowerCase().includes("kepala") || fbUser.email?.toLowerCase().includes("manager")) {
            role = "Kepala Bagian Gudang";
          }
          const userProfile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "Petugas Japfa",
            email: fbUser.email || "user@japfa.com",
            role,
            nik: "JPF-SSO-" + fbUser.uid.substring(0, 5).toUpperCase(),
            photoURL: fbUser.photoURL || undefined,
            loginMethod: "google",
            lastLoginAt: new Date().toISOString()
          };
          try {
            localStorage.setItem("japfa_warehouse_user", JSON.stringify(userProfile));
          } catch (e) {
            console.error("Storage error:", e);
          }
          return userProfile;
        });
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    // Optionally auto-populate author name & role in current report if default
    setReports((prev) => {
      const currentReport = prev[selectedDate];
      if (currentReport) {
        return {
          ...prev,
          [selectedDate]: {
            ...currentReport,
            dibuatOlehName: user.name,
            dibuatOlehRole: user.role
          }
        };
      }
      return prev;
    });
    setToast({
      message: `Selamat bertugas, ${user.name}! (${user.role})`,
      type: "success"
    });
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem("japfa_warehouse_user");
    setCurrentUser(null);
    setIsLogoutModalOpen(false);
    setToast({
      message: "Sesi telah berakhir. Anda telah keluar dari sistem.",
      type: "info"
    });
  };

  // Helpers for Stock Karung & Stock Label
  const getPreviousKarungReportDate = (currentDate: string): string | null => {
    const dates = Object.keys(karungReports).filter((d) => d < currentDate).sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  };

  const computeCarriedKarungReport = (targetDate: string, sourceReport: KarungReport): KarungReport => {
    const carriedItems: KarungItem[] = sourceReport.items.map((prev) => {
      const stockAkhir = (prev.stockAwal || 0) + (prev.masuk || 0) - (prev.keluar || 0) - (prev.afkir || 0);
      const lembarPerBal = prev.lembarPerBal || 500;
      const stockAwalBal = Math.round((stockAkhir / lembarPerBal) * 10) / 10;

      // Carry forward remaining fifo lots
      let remainingLots = (prev.fifoLots || []).filter((l) => (l.jmlLembar || 0) > 0);
      if (remainingLots.length === 0 && stockAkhir > 0) {
        remainingLots = [
          {
            id: `lot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            kav: prev.gudangKav || "3001",
            tglMasuk: prev.tglMasuk || targetDate,
            umurHari: (prev.umurPemakaianHari || 0) + 1,
            jmlLembar: stockAkhir
          }
        ];
      }

      return {
        ...prev,
        stockAwal: stockAkhir,
        stockAwalBal: stockAwalBal,
        // Reset daily transactions for the new date:
        masuk: 0,
        masukBal: 0,
        pembelian: 0,
        returProduksi: 0,
        masukLainLain: 0,
        keluar: 0,
        keluarBal: 0,
        bonProduksi: 0,
        gudangKeluar: 0,
        overZak: 0,
        keluarLainLain: 0,
        afkir: 0,
        fifoLots: remainingLots,
        keterangan: ""
      };
    });

    return {
      date: targetDate,
      gudangSLoct: sourceReport.gudangSLoct || "3001",
      docCode: sourceReport.docCode || "PLT - WRH - FM – 03 - 01",
      companyName: sourceReport.companyName || "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
      title: sourceReport.title || "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS",
      subTitle: sourceReport.subTitle || "KARUNG PLASTIK",
      items: carriedItems,
      inboundLogs: [],
      outboundLogs: [],
      dibuatOlehName: sourceReport.dibuatOlehName || "Sabto A",
      dibuatOlehRole: sourceReport.dibuatOlehRole || "Admin Gudang",
      dibuatOlehSignature: sourceReport.dibuatOlehSignature || null,
      mengetahuiName: sourceReport.mengetahuiName || "Antonius Andri Waroto",
      mengetahuiRole: sourceReport.mengetahuiRole || "Head Of Wrh Sub.Dept",
      mengetahuiSignature: sourceReport.mengetahuiSignature || null
    };
  };

  const getActiveKarungReport = (): KarungReport => {
    if (karungReports[selectedDate]) {
      return karungReports[selectedDate];
    }
    const prevDate = getPreviousKarungReportDate(selectedDate);
    if (prevDate && karungReports[prevDate]) {
      return computeCarriedKarungReport(selectedDate, karungReports[prevDate]);
    }
    return {
      date: selectedDate,
      gudangSLoct: "Gudang Kemasan & Sacks",
      docCode: "FR-WHS-KRG-01",
      companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
      items: DEFAULT_KARUNG_SEED,
      inboundLogs: DEFAULT_INBOUND_LOGS_SEED,
      outboundLogs: DEFAULT_OUTBOUND_LOGS_SEED,
      dibuatOlehName: "Sabto A",
      dibuatOlehRole: "Admin Gudang",
      dibuatOlehSignature: null,
      mengetahuiName: "Antonius Andri Waroto",
      mengetahuiRole: "Head Of Wrh Sub.Dept",
      mengetahuiSignature: null
    };
  };

  const handleSyncKarungFromPreviousDay = () => {
    const prevDate = getPreviousKarungReportDate(selectedDate);
    if (!prevDate || !karungReports[prevDate]) {
      showNotification(`Tidak ditemukan data laporan sebelum tanggal ${selectedDate}`, "error");
      return;
    }
    const current = getActiveKarungReport();
    const prevReport = karungReports[prevDate];

    // Map existing items to update only stockAwal from prevReport's stockAkhir, retaining current day's entered transactions if any
    const syncedItems = current.items.map((item) => {
      const prevItem = prevReport.items.find((p) => p.id === item.id || p.kode === item.kode);
      if (!prevItem) return item;
      const prevStockAkhir = (prevItem.stockAwal || 0) + (prevItem.masuk || 0) - (prevItem.keluar || 0) - (prevItem.afkir || 0);
      const conv = item.lembarPerBal || 500;
      return {
        ...item,
        stockAwal: prevStockAkhir,
        stockAwalBal: Math.round((prevStockAkhir / conv) * 10) / 10
      };
    });

    const updatedReport = {
      ...current,
      items: syncedItems
    };

    handleUpdateKarungReport(updatedReport);
    showNotification(`Stok Awal berhasil disinkronisasi dari Stok Akhir tanggal ${prevDate}!`, "success");
  };

  const handleUpdateKarungReport = async (updated: KarungReport) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengubah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const newMap = { ...karungReports, [selectedDate]: updated };
    setKarungReports(newMap);
    try {
      await setDoc(doc(db, "karung_reports", selectedDate), updated);
    } catch (e) {
      console.error("Gagal simpan karung report ke Firestore:", e);
    }
  };

  const getPreviousLabelReportDate = (currentDate: string): string | null => {
    const dates = Object.keys(labelReports).filter((d) => d < currentDate).sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  };

  const computeCarriedLabelReport = (targetDate: string, sourceReport: LabelReport): LabelReport => {
    const carriedItems: LabelItem[] = sourceReport.items.map((prev) => {
      const stockAkhir = (prev.stockAwal || 0) + (prev.masuk || 0) - (prev.keluar || 0) - (prev.rusak || 0);
      const prevRange = getLabelNoRange(prev);

      // Carry forward remaining fifo lots
      let remainingLots = (prev.fifoLots || []).filter((l) => (l.jmlLembar || 0) > 0);
      if (remainingLots.length === 0 && stockAkhir > 0) {
        remainingLots = [
          {
            id: `lot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            kav: prev.gudangKav || "3002",
            tglMasuk: prev.tglMasuk || targetDate,
            umurHari: (prev.umurPemakaianHari || 0) + 1,
            jmlLembar: stockAkhir
          }
        ];
      }

      return {
        ...prev,
        stockAwal: stockAkhir,
        // No Label: nomor akhir tanggal sebelumnya menjadi base nomor akhir tanggal berikutnya
        baseEndNoLabel: prevRange.endNo > 0 ? prevRange.endNo : prev.baseEndNoLabel,
        endNoLabel: prevRange.endNo > 0 ? prevRange.endNo : prev.endNoLabel,
        startNoLabel: prevRange.startNo > 0 ? prevRange.startNo : prev.startNoLabel,
        // Reset daily transactions for the new date:
        masuk: 0,
        pembelian: 0,
        returProduksi: 0,
        masukLainLain: 0,
        keluar: 0,
        bonProduksi: 0,
        gudangKeluar: 0,
        rusak: 0,
        keluarLainLain: 0,
        fifoLots: remainingLots,
        keterangan: ""
      };
    });

    return {
      date: targetDate,
      gudangSLoct: sourceReport.gudangSLoct || "3002",
      docCode: sourceReport.docCode || "PLT - WRH - FM – 03 - 02",
      companyName: sourceReport.companyName || "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
      title: sourceReport.title || "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS",
      subTitle: sourceReport.subTitle || "LABEL PAKAN & AKSESORIS KEMASAN",
      items: carriedItems,
      inboundLogs: [],
      outboundLogs: [],
      dibuatOlehName: sourceReport.dibuatOlehName || "Sabto A",
      dibuatOlehRole: sourceReport.dibuatOlehRole || "Admin Gudang",
      dibuatOlehSignature: sourceReport.dibuatOlehSignature || null,
      mengetahuiName: sourceReport.mengetahuiName || "Antonius Andri Waroto",
      mengetahuiRole: sourceReport.mengetahuiRole || "Head Of Wrh Sub.Dept",
      mengetahuiSignature: sourceReport.mengetahuiSignature || null
    };
  };

  const getActiveLabelReport = (): LabelReport => {
    if (labelReports[selectedDate]) {
      return labelReports[selectedDate];
    }
    const prevDate = getPreviousLabelReportDate(selectedDate);
    if (prevDate && labelReports[prevDate]) {
      return computeCarriedLabelReport(selectedDate, labelReports[prevDate]);
    }
    return {
      date: selectedDate,
      gudangSLoct: "3002",
      docCode: "PLT - WRH - FM – 03 - 02",
      companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
      title: "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS",
      subTitle: "LABEL PAKAN & AKSESORIS KEMASAN",
      items: DEFAULT_LABEL_SEED,
      inboundLogs: DEFAULT_LABEL_INBOUND_SEED,
      outboundLogs: DEFAULT_LABEL_OUTBOUND_SEED,
      dibuatOlehName: "Sabto A",
      dibuatOlehRole: "Admin Gudang",
      dibuatOlehSignature: null,
      mengetahuiName: "Antonius Andri Waroto",
      mengetahuiRole: "Head Of Wrh Sub.Dept",
      mengetahuiSignature: null
    };
  };

  const handleSyncLabelFromPreviousDay = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengubah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const prevDate = getPreviousLabelReportDate(selectedDate);
    if (!prevDate || !labelReports[prevDate]) {
      showNotification(`Tidak ditemukan data laporan label sebelum tanggal ${selectedDate}`, "error");
      return;
    }
    const current = getActiveLabelReport();
    const prevReport = labelReports[prevDate];

    const syncedItems = current.items.map((item) => {
      const prevItem = prevReport.items.find((p) => p.id === item.id || p.kode === item.kode);
      if (!prevItem) return item;
      const prevStockAkhir = (prevItem.stockAwal || 0) + (prevItem.masuk || 0) - (prevItem.keluar || 0) - (prevItem.rusak || 0);
      return {
        ...item,
        stockAwal: prevStockAkhir
      };
    });

    const updatedReport = {
      ...current,
      items: syncedItems
    };

    handleUpdateLabelReport(updatedReport);
    showNotification(`Stok Awal label berhasil disinkronisasi dari Stok Akhir tanggal ${prevDate}!`, "success");
  };

  const handleUpdateLabelReport = async (updated: LabelReport) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengubah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const newMap = { ...labelReports, [selectedDate]: updated };
    setLabelReports(newMap);
    try {
      await setDoc(doc(db, "label_reports", selectedDate), updated);
    } catch (e) {
      console.error("Gagal simpan label report ke Firestore:", e);
    }
  };

  // Sync to Firestore and record history stack
  const saveReportsToStorage = async (updatedReports: Record<string, DailyReport>, recordHistory = true) => {
    if (isGuest) {
      return;
    }
    if (!canEditReport) {
      return;
    }
    setReports(updatedReports);

    try {
      for (const [dateKey, reportData] of Object.entries(updatedReports)) {
        await setDoc(doc(db, "reports", dateKey), reportData);
      }
    } catch (e) {
      console.error("Gagal update Firestore report:", e);
    }

    if (recordHistory) {
      const currentIndex = historyIndexRef.current;
      const currentHistory = historyRef.current;
      const newHistory = [...currentHistory.slice(0, currentIndex + 1), updatedReports];
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      const newIndex = newHistory.length - 1;
      setHistory(newHistory);
      setHistoryIndex(newIndex);
    }
  };

  // Undo & Redo Handlers
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = async () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const targetState = history[newIndex];
      setHistoryIndex(newIndex);
      setReports(targetState);
      try {
        for (const [dateKey, reportData] of Object.entries(targetState)) {
          await setDoc(doc(db, "reports", dateKey), reportData);
        }
      } catch (e) {
        console.error("Gagal restore state ke Firestore pada Undo:", e);
      }
      showNotification("Undo berhasil!", "info");
    }
  };

  const handleRedo = async () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const targetState = history[newIndex];
      setHistoryIndex(newIndex);
      setReports(targetState);
      try {
        for (const [dateKey, reportData] of Object.entries(targetState)) {
          await setDoc(doc(db, "reports", dateKey), reportData);
        }
      } catch (e) {
        console.error("Gagal restore state ke Firestore pada Redo:", e);
      }
      showNotification("Redo berhasil!", "info");
    }
  };

  // Global Keyboard Shortcuts for Undo (Ctrl+Z) & Redo (Ctrl+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditingInput = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.tagName === "SELECT"
      );

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (!isEditingInput && canUndo) {
          e.preventDefault();
          handleUndo();
        }
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        if (!isEditingInput && canRedo) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, historyIndex, canUndo, canRedo]);

  // Helper: Retrieve active report or create standard skeleton
  const getActiveReport = (): DailyReport => {
    if (reports[selectedDate]) {
      return reports[selectedDate];
    }
    
    // Skeleton fallback
    return {
      date: selectedDate,
      gudangSLoct: "2001 - 2002",
      docCode: "PLT - WRH - FM - 02 - 03",
      companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
      items: [],
      feedAddOutboundLogs: [],
      dibuatOlehName: "Sabto A",
      dibuatOlehRole: "Admin Gudang",
      dibuatOlehSignature: null,
      mengetahuiName: "Antonius Andri Waroto",
      mengetahuiRole: "Head Of Wrh Sub.Dept",
      mengetahuiSignature: null
    };
  };

  const activeReport = getActiveReport();

  // Highlight first item on start (default to AXTRA XAP 101 TPT if available)
  useEffect(() => {
    if (activeReport.items.length > 0 && !activeItemId) {
      const axtraItem = activeReport.items.find(i => i.kode === "11234120");
      setActiveItemId(axtraItem ? axtraItem.id : activeReport.items[0].id);
    }
  }, [activeReport.items, activeItemId]);

  // Helper: Format to short date DD/MM/YY
  const formatToShortDate = (dateString: string): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "-";
    }
  };

  // Set default selected date formatted text
  const getFormattedDate = (dateStr: string): string => {
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
      return new Date(dateStr).toLocaleDateString("id-ID", options);
    } catch (e) {
      return dateStr;
    }
  };

  // Age Calculator helper (Tanggal Masuk -> Report Date)
  const calculateAge = (tglMasuk: string, reportDate: string): string => {
    if (!tglMasuk) return "-";
    try {
      const start = new Date(tglMasuk);
      const end = new Date(reportDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (isNaN(diffDays)) return "-";
      return `Umur ${diffDays >= 0 ? diffDays : 0} hr`;
    } catch (e) {
      return "-";
    }
  };

  // ==========================================
  // LOGIC: RECORD ACTIONS (ADD, EDIT, DELETE)
  // ==========================================

  const updateActiveReport = (updates: Partial<DailyReport>) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengubah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const updated = {
      ...activeReport,
      ...updates
    };
    const newReports = {
      ...reports,
      [selectedDate]: updated
    };
    saveReportsToStorage(newReports);
  };

  const updateItemValue = (itemId: string, fields: Partial<StockItem>) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengubah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const updatedItems = activeReport.items.map(item => {
      if (item.id === itemId) {
        const merged = { ...item, ...fields };
        
        // Auto calculations for final stocks (Tonase & Colly)
        const stockAwalNum = Number(merged.stockAwal) || 0;
        const masukNum = Math.abs(Number(merged.masuk) || 0);
        const keluarNum = Math.abs(Number(merged.keluar) || 0);
        
        const stockAwalCollyNum = Number(merged.stockAwalColly) || 0;
        const masukCollyNum = Math.abs(Number(merged.masukColly) || 0);
        const keluarCollyNum = Math.abs(Number(merged.keluarColly) || 0);

        // Get Berat per Colly
        const beratPerCollyVal = merged.beratPerColly !== undefined 
          ? merged.beratPerColly 
          : (() => {
              if (!merged.packagingDesc) return 25;
              const match = merged.packagingDesc.match(/(\d+)/);
              return match ? Number(match[1]) : 25;
            })();

        // If the user input colly or beratPerColly, calculate tonase automatically
        if (fields.colly !== undefined || fields.beratPerColly !== undefined) {
          const currentColly = fields.colly !== undefined 
            ? fields.colly 
            : (merged.colly !== undefined ? merged.colly : (stockAwalCollyNum + masukCollyNum - keluarCollyNum));
          fields.tonase = currentColly * beratPerCollyVal;
        }

        // If the user explicitly edited tonase or colly (or if it was auto-calculated above), calculate corresponding keluar
        let finalKeluar = keluarNum;
        if (fields.tonase !== undefined) {
          finalKeluar = stockAwalNum + masukNum - Number(fields.tonase);
        }
        let finalKeluarColly = keluarCollyNum;
        if (fields.colly !== undefined) {
          finalKeluarColly = stockAwalCollyNum + masukCollyNum - Number(fields.colly);
        }

        // Recalculate final tonase and colly
        const tonaseFinal = stockAwalNum + masukNum - finalKeluar;
        const collyFinal = stockAwalCollyNum + masukCollyNum - finalKeluarColly;

        return {
          ...merged,
          stockAwal: stockAwalNum,
          masuk: masukNum,
          keluar: finalKeluar,
          stockAwalColly: stockAwalCollyNum,
          masukColly: masukCollyNum,
          keluarColly: finalKeluarColly,
          beratPerColly: beratPerCollyVal,
          // Synchronize Info Kavling parameters which are tied to final stock
          tonase: tonaseFinal,
          colly: collyFinal
        };
      }
      return item;
    });

    updateActiveReport({ items: updatedItems });
  };

  const handleAddStockMasuk = (itemId: string) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menambah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const kgToAdd = Number(addKg) || 0;
    const collyToAdd = Number(addColly) || 0;

    if (kgToAdd < 0 || collyToAdd < 0) {
      showNotification("Jumlah pengisian stock masuk tidak boleh bernilai negatif!", "error");
      return;
    }

    if (kgToAdd === 0 && collyToAdd === 0) {
      showNotification("Masukkan jumlah Kg atau Colly yang valid untuk ditambahkan!", "error");
      return;
    }

    const updatedItems = activeReport.items.map(item => {
      if (item.id === itemId) {
        const newMasuk = (item.masuk || 0) + kgToAdd;
        const newMasukColly = (item.masukColly || 0) + collyToAdd;

        // Recalculate Stock Akhir
        const stockAwalNum = Number(item.stockAwal) || 0;
        const keluarNum = Number(item.keluar) || 0;
        const stockAwalCollyNum = Number(item.stockAwalColly) || 0;
        const keluarCollyNum = Number(item.keluarColly) || 0;

        const tonaseFinal = stockAwalNum + newMasuk - keluarNum;
        const collyFinal = stockAwalCollyNum + newMasukColly - keluarCollyNum;

        return {
          ...item,
          masuk: newMasuk,
          masukColly: newMasukColly,
          tonase: tonaseFinal,
          colly: collyFinal
        };
      }
      return item;
    });

    updateActiveReport({ items: updatedItems });
    setAddKg("");
    setAddColly("");
    showNotification("Stock masuk berhasil ditambahkan!", "success");
  };

  const handleProcessPenerimaan = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menambah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const collyCount = Number(rcvColly) || 0;
    const kgWeight = Number(rcvTotalKg) || 0;
    
    // Determine the item code and name
    let itemKode = "";
    let itemNama = rcvNamaMaterial;
    
    if (rcvIsNewItem) {
      if (rcvMasterKode === "custom") {
        itemKode = rcvCustomKode;
      } else {
        itemKode = rcvMasterKode;
      }
    } else {
      const currentReport = reports[selectedDate] || { items: [] };
      const currentItem = currentReport.items.find(item => item.id === rcvSelectedItemId);
      if (currentItem) {
        itemKode = currentItem.kode;
        itemNama = currentItem.namaMaterial;
      }
    }

    if (!itemKode) {
      showNotification("Silakan tentukan Kode Barang!", "error");
      return;
    }
    if (!itemNama) {
      showNotification("Silakan tentukan Nama Material!", "error");
      return;
    }
    if (collyCount <= 0) {
      showNotification("Jumlah Colly masuk harus lebih dari 0!", "error");
      return;
    }

    const currentReport = getActiveReport();
    let updatedItems = [...currentReport.items];

    const currentItem = updatedItems.find(item => item.id === rcvSelectedItemId);
    const finalTglMasuk = rcvTanggalMasuk 
      ? rcvTanggalMasuk 
      : (!rcvIsNewItem && currentItem?.tglMasuk ? currentItem.tglMasuk : selectedDate);
    const finalBatch = rcvBatch || formatDateToYYMMDD(finalTglMasuk);

    if (!rcvIsNewItem) {
      // Update existing item in the report
      updatedItems = updatedItems.map(item => {
        if (item.id === rcvSelectedItemId) {
          const newMasukColly = (item.masukColly || 0) + collyCount;
          const newMasukKg = (item.masuk || 0) + kgWeight;
          
          const stockAwalNum = Number(item.stockAwal) || 0;
          const keluarNum = Number(item.keluar) || 0;
          const stockAwalCollyNum = Number(item.stockAwalColly) || 0;
          const keluarCollyNum = Number(item.keluarColly) || 0;

          return {
            ...item,
            suplier: rcvSupplier,
            gudangKav: rcvGudangKav,
            masuk: newMasukKg,
            masukColly: newMasukColly,
            tglMasuk: finalTglMasuk,
            batch: finalBatch,
            mfgDate: rcvMfgDate,
            expDate: rcvExpDate,
            tonase: stockAwalNum + newMasukKg - keluarNum,
            colly: stockAwalCollyNum + newMasukColly - keluarCollyNum
          };
        }
        return item;
      });
    } else {
      // Adding a new item to the active daily report
      const newItem: StockItem = {
        id: `item-${Date.now()}`,
        kode: itemKode,
        namaMaterial: itemNama,
        stockAwal: 0,
        stockAwalColly: 0,
        masuk: kgWeight,
        masukColly: collyCount,
        keluar: 0,
        keluarColly: 0,
        packagingDesc: `@ ${rcvKgPerColly} Kg`,
        beratPerColly: Number(rcvKgPerColly) || 25,
        gudangKav: rcvGudangKav,
        suplier: rcvSupplier,
        tglMasuk: finalTglMasuk,
        batch: finalBatch,
        mfgDate: rcvMfgDate,
        expDate: rcvExpDate,
        tonase: kgWeight,
        colly: collyCount
      };

      // If it's a completely custom material code, save to Master Catalog too
      if (rcvMasterKode === "custom") {
        const isMasterExist = masterMaterials.some(m => m.kode.toUpperCase() === rcvCustomKode.toUpperCase());
        if (!isMasterExist) {
          const newMaster: MasterMaterial = {
            kode: rcvCustomKode,
            namaMaterial: itemNama,
            packagingDesc: `@ ${rcvKgPerColly} Kg`,
            gudangKavDefault: rcvGudangKav || "2001",
            suplierDefault: rcvSupplier || "GENERAL SUPPLIER"
          };
          const updatedCatalog = [...masterMaterials, newMaster];
          saveCatalogToFirestore(updatedCatalog);
        }
      }

      updatedItems.push(newItem);
    }

    updateActiveReport({ items: updatedItems });
    
    // Clear inputs
    setRcvColly("");
    setRcvTotalKg("");
    setRcvBatch(formatDateToYYMMDD(finalTglMasuk));
    setRcvMfgDate("");
    setRcvExpDate("");
    
    showNotification("Penerimaan stock berhasil dicatat!", "success");
  };

  const handleResetPenerimaanItem = (itemId: string) => {
    const updatedItems = activeReport.items.map(item => {
      if (item.id === itemId) {
        const stockAwalNum = Number(item.stockAwal) || 0;
        const keluarNum = Number(item.keluar) || 0;
        const stockAwalCollyNum = Number(item.stockAwalColly) || 0;
        const keluarCollyNum = Number(item.keluarColly) || 0;

        return {
          ...item,
          masuk: 0,
          masukColly: 0,
          tonase: stockAwalNum - keluarNum,
          colly: stockAwalCollyNum - keluarCollyNum
        };
      }
      return item;
    });

    updateActiveReport({ items: updatedItems });
    showNotification("Penerimaan barang berhasil dibatalkan!", "info");
  };

  const handleResetPengeluaranItem = (itemId: string) => {
    const updatedItems = activeReport.items.map(item => {
      if (item.id === itemId) {
        const stockAwalNum = Number(item.stockAwal) || 0;
        const masukNum = Number(item.masuk) || 0;
        const stockAwalCollyNum = Number(item.stockAwalColly) || 0;
        const masukCollyNum = Number(item.masukColly) || 0;

        return {
          ...item,
          keluar: 0,
          keluarColly: 0,
          tonase: stockAwalNum + masukNum,
          colly: stockAwalCollyNum + masukCollyNum
        };
      }
      return item;
    });

    updateActiveReport({ items: updatedItems });
    showNotification("Pengeluaran barang berhasil dibatalkan!", "info");
  };

  const handleDeleteOutboundLog = (logId: string) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menghapus data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const activeOutLogs = activeReport.feedAddOutboundLogs !== undefined ? activeReport.feedAddOutboundLogs : DEFAULT_FEED_ADD_OUTBOUND_LOGS;
    const logToDelete = activeOutLogs.find(l => l.id === logId);
    if (!logToDelete) return;

    const remainingLogs = activeOutLogs.filter(l => l.id !== logId);

    const updatedItems = activeReport.items.map(item => {
      if (item.id === logToDelete.itemId || item.kode === logToDelete.kode) {
        const newKeluar = Math.max(0, (item.keluar || 0) - logToDelete.tonaseKg);
        const newKeluarColly = Math.max(0, (item.keluarColly || 0) - logToDelete.collyKeluar);

        const stockAwalNum = Number(item.stockAwal) || 0;
        const masukNum = Number(item.masuk) || 0;
        const stockAwalCollyNum = Number(item.stockAwalColly) || 0;
        const masukCollyNum = Number(item.masukColly) || 0;

        const tonaseFinal = stockAwalNum + masukNum - newKeluar;
        const collyFinal = stockAwalCollyNum + masukCollyNum - newKeluarColly;

        return {
          ...item,
          keluar: newKeluar,
          keluarColly: newKeluarColly,
          tonase: tonaseFinal,
          colly: collyFinal
        };
      }
      return item;
    });

    updateActiveReport({
      items: updatedItems,
      feedAddOutboundLogs: remainingLogs
    });

    showNotification("Log pengeluaran berhasil dihapus!", "info");
  };

  const handleAddStockKeluar = (itemId: string) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengeluarkan data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const kgToOut = Number(outKg) || 0;
    const collyToOut = Number(outColly) || 0;

    if (kgToOut < 0 || collyToOut < 0) {
      showNotification("Jumlah pengeluaran tidak boleh bernilai negatif!", "error");
      return;
    }

    if (kgToOut === 0 && collyToOut === 0) {
      showNotification("Masukkan jumlah Kg atau Colly yang valid untuk dikeluarkan!", "error");
      return;
    }

    const item = activeReport.items.find(i => i.id === itemId);
    if (!item) {
      showNotification("Material belum dipilih!", "error");
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const waktuStr = `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;

    const newLog: FeedAddOutboundLog = {
      id: `out-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: item.id,
      kode: item.kode,
      namaMaterial: item.namaMaterial,
      gudangKav: item.gudangKav || "2001",
      collyKeluar: collyToOut,
      waktuKeluar: waktuStr,
      tanggalKeluar: selectedDate,
      batch: item.batch || "-",
      keperluan: outCatatan.trim() || "Pengeluaran Outbound",
      tonaseKg: kgToOut
    };

    const currentLogs = activeReport.feedAddOutboundLogs !== undefined ? activeReport.feedAddOutboundLogs : DEFAULT_FEED_ADD_OUTBOUND_LOGS;

    const updatedItems = activeReport.items.map(it => {
      if (it.id === itemId) {
        const newKeluar = (it.keluar || 0) + kgToOut;
        const newKeluarColly = (it.keluarColly || 0) + collyToOut;

        // Recalculate Stock Akhir
        const stockAwalNum = Number(it.stockAwal) || 0;
        const masukNum = Number(it.masuk) || 0;
        const stockAwalCollyNum = Number(it.stockAwalColly) || 0;
        const masukCollyNum = Number(it.masukColly) || 0;

        const tonaseFinal = stockAwalNum + masukNum - newKeluar;
        const collyFinal = stockAwalCollyNum + masukCollyNum - newKeluarColly;

        return {
          ...it,
          keluar: newKeluar,
          keluarColly: newKeluarColly,
          tonase: tonaseFinal,
          colly: collyFinal
        };
      }
      return it;
    });

    updateActiveReport({
      items: updatedItems,
      feedAddOutboundLogs: [newLog, ...currentLogs]
    });
    setOutKg("");
    setOutColly("");
    setOutCatatan("");
    showNotification(`Pengeluaran ${item.namaMaterial} (${collyToOut} Colly / ${kgToOut.toLocaleString("id-ID")} Kg) berhasil diproses!`, "success");
  };

  const handleAddNewItem = (master: MasterMaterial) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menambah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const newItem: StockItem = {
      id: `item-${Date.now()}`,
      kode: master.kode,
      namaMaterial: master.namaMaterial,
      stockAwal: 1000,
      stockAwalColly: 40,
      masuk: 0,
      masukColly: 0,
      keluar: 0,
      keluarColly: 0,
      packagingDesc: master.packagingDesc,
      gudangKav: master.gudangKavDefault,
      suplier: master.suplierDefault,
      tglMasuk: selectedDate, // defaults to current date
      batch: `BT-${Math.floor(100000 + Math.random() * 900000)}`,
      mfgDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split("T")[0],
      expDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split("T")[0],
      tonase: 1000,
      colly: 40
    };

    const updatedItems = [...activeReport.items, newItem];
    updateActiveReport({ items: updatedItems });
    setActiveItemId(newItem.id);
  };

  const handleAddNewCustomItem = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menambah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const newItem: StockItem = {
      id: `item-${Date.now()}`,
      kode: "NEW-CODE",
      namaMaterial: "BARANG BARU",
      stockAwal: 0,
      stockAwalColly: 0,
      masuk: 0,
      masukColly: 0,
      keluar: 0,
      keluarColly: 0,
      packagingDesc: "@ 25 Kg",
      gudangKav: "2001",
      suplier: "PABRIK SUPLIER",
      tglMasuk: selectedDate,
      batch: "BATCH-1234",
      mfgDate: selectedDate,
      expDate: selectedDate,
      tonase: 0,
      colly: 0
    };

    const updatedItems = [...activeReport.items, newItem];
    updateActiveReport({ items: updatedItems });
    setActiveItemId(newItem.id);
  };

  const handleDeleteItem = (itemId: string) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menghapus data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const updatedItems = activeReport.items.filter(item => item.id !== itemId);
    updateActiveReport({ items: updatedItems });
    if (activeItemId === itemId) {
      setActiveItemId(updatedItems.length > 0 ? updatedItems[0].id : null);
    }
  };

  const handleDeleteAllItems = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menghapus data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    if (!activeReport.items || activeReport.items.length === 0) {
      showNotification("Tidak ada item untuk dihapus!", "info");
      return;
    }
    setDeleteAllConfirmOpen(true);
  };

  const executeDeleteAllItems = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menghapus data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    updateActiveReport({ items: [] });
    setActiveItemId(null);
    setDeleteAllConfirmOpen(false);
    showNotification("Semua item laporan berhasil dihapus!", "info");
  };

  const handleSaveEditedLot = (updatedItem: StockItem) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengubah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const stockAwalNum = Number(updatedItem.stockAwal) || 0;
    const stockAwalCollyNum = Number(updatedItem.stockAwalColly) || 0;
    const masukNum = Number(updatedItem.masuk) || 0;
    const masukCollyNum = Number(updatedItem.masukColly) || 0;
    const keluarNum = Number(updatedItem.keluar) || 0;
    const keluarCollyNum = Number(updatedItem.keluarColly) || 0;

    const tonaseFinal = stockAwalNum + masukNum - keluarNum;
    const collyFinal = stockAwalCollyNum + masukCollyNum - keluarCollyNum;

    const itemToSave: StockItem = {
      ...updatedItem,
      tonase: tonaseFinal,
      colly: collyFinal
    };

    const updatedItems = activeReport.items.map(item => 
      item.id === itemToSave.id ? itemToSave : item
    );

    updateActiveReport({ items: updatedItems });
    setEditingLotItem(null);
    showNotification("Detail lot kavling berhasil diperbarui!", "success");
  };

  // ==========================================
  // LOGIC: COPY PREVIOUS DAY REPORT
  // ==========================================
  const handleCopyFromPreviousDay = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengubah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    // Find prior date with records
    const dates = Object.keys(reports).sort();
    const curIndex = dates.indexOf(selectedDate);
    
    let previousReport: DailyReport | null = null;
    
    if (curIndex > 0) {
      // Find directly adjacent prior recorded report
      previousReport = reports[dates[curIndex - 1]];
    } else {
      // Look for any date strictly prior to current date
      const priorDates = dates.filter(d => d < selectedDate);
      if (priorDates.length > 0) {
        previousReport = reports[priorDates[priorDates.length - 1]];
      }
    }

    if (!previousReport) {
      showNotification("Tidak ditemukan laporan dari hari-hari sebelumnya untuk disalin.", "error");
      return;
    }

    // Map yesterday's final stock to today's initial stock
    const carriedItems = previousReport.items.map(prev => {
      const stockAkhirVal = prev.stockAwal + prev.masuk - prev.keluar;
      const stockAkhirCollyVal = prev.stockAwalColly + prev.masukColly - prev.keluarColly;

      return {
        ...prev,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // new dynamic id
        stockAwal: stockAkhirVal,
        stockAwalColly: stockAkhirCollyVal,
        masuk: 0,
        masukColly: 0,
        keluar: 0,
        keluarColly: 0,
        tonase: stockAkhirVal,
        colly: stockAkhirCollyVal,
        tglMasuk: prev.tglMasuk || selectedDate // keep original entry date on carryover to next date
      };
    });

    updateActiveReport({
      gudangSLoct: previousReport.gudangSLoct,
      docCode: previousReport.docCode,
      companyName: previousReport.companyName,
      items: carriedItems,
      dibuatOlehName: previousReport.dibuatOlehName,
      dibuatOlehRole: previousReport.dibuatOlehRole,
      mengetahuiName: previousReport.mengetahuiName,
      mengetahuiRole: previousReport.mengetahuiRole
    });

    if (carriedItems.length > 0) {
      setActiveItemId(carriedItems[0].id);
    }

    showNotification(`Berhasil menyalin data! Total ${carriedItems.length} barang disalin.`, "success");
  };

  // Create empty report template
  const handleCreateEmptyReport = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengubah data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    updateActiveReport({
      items: [],
      gudangSLoct: "2001 - 2002",
      docCode: "PLT - WRH - FM - 02 - 03"
    });
    setActiveItemId(null);
  };

  // Reset to default factory seeded data for current date
  const handleResetToSeeded = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menyetel ulang data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    setResetConfirmOpen(true);
  };

  const executeResetToSeeded = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menyetel ulang data!", "error");
      return;
    }
    if (!canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const resetReport: DailyReport = {
      date: selectedDate,
      gudangSLoct: "2001 - 2002",
      docCode: "PLT - WRH - FM - 02 - 03",
      companyName: "PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG",
      items: DEFAULT_ITEMS_SEED.map(i => ({ ...i, id: `seed-${Date.now()}-${Math.random()}` })),
      dibuatOlehName: "Siti Nurhaliza",
      dibuatOlehRole: "Admin Gudang",
      dibuatOlehSignature: null,
      mengetahuiName: "Andika Pratama",
      mengetahuiRole: "Site Manager",
      mengetahuiSignature: null
    };

    const newReports = {
      ...reports,
      [selectedDate]: resetReport
    };
    saveReportsToStorage(newReports);
    if (resetReport.items.length > 0) {
      setActiveItemId(resetReport.items[0].id);
    }
    setResetConfirmOpen(false);
    showNotification("Data berhasil disetel ulang ke contoh bawaan pabrik.", "success");
  };

  // Navigation helpers for dates
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // ==========================================
  // EXPORT / PRINT ACTIONS
  // ==========================================

  // System Print via OS/Browser Dialog (Select Physical or Virtual Printer)
  const handleSystemPrint = async () => {
    const originalTab = activeTab;
    const originalSubTab = effectiveFeedAddSubTab;
    if (!isStockFeedAddActive || effectiveFeedAddSubTab !== "table") {
      setActiveTab("stock");
      setFeedAddSubTab("table");
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    showNotification("Membuka dialog cetak... Silakan pilih printer yang digunakan.", "info");
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Direct High-Res PDF File Download
  const handleDownloadPDF = async () => {
    const originalTab = activeTab;
    const originalSubTab = effectiveFeedAddSubTab;
    if (!isStockFeedAddActive || effectiveFeedAddSubTab !== "table") {
      setActiveTab("stock");
      setFeedAddSubTab("table");
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const element = document.getElementById("report-paper-canvas");
    if (!element) {
      showNotification("Elemen laporan tidak ditemukan!", "error");
      if (originalTab !== "stock") {
        setActiveTab(originalTab);
      }
      if (originalSubTab !== "table") {
        setFeedAddSubTab(originalSubTab);
      }
      return;
    }

    setIsGeneratingPDF(true);
    showNotification("Sedang membuat file PDF... Mohon tunggu sebentar.", "info");

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#F2F0ED",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 297; // A4 Landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      const pageHeight = 210; // A4 Landscape height in mm

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Laporan_Stok_Kavling_${selectedDate}.pdf`);
      showNotification("PDF berhasil diunduh sebagai file!", "success");
    } catch (err) {
      console.error("PDF Generation error:", err);
      showNotification("Gagal membuat PDF. Silakan coba kembali atau gunakan cetak printer.", "error");
    } finally {
      setIsGeneratingPDF(false);
      if (originalTab !== "stock") {
        setActiveTab(originalTab);
      }
      if (originalSubTab !== "table") {
        setFeedAddSubTab(originalSubTab);
      }
    }
  };

  const executePrintAction = async () => {
    setIsPrintModalOpen(false);
    if (printMethod === "pdf") {
      await handleDownloadPDF();
    } else {
      await handleSystemPrint();
    }
  };

  const handleExportCSV = () => {
    if (activeReport.items.length === 0) {
      showNotification("Tidak ada data bahan pembantu untuk diekspor pada tanggal ini.", "error");
      return;
    }

    let csvContent = "\ufeff"; // Add UTF-8 BOM so Excel opens it with correct character sets
    csvContent += `LAPORAN INFO KAVLING HARIAN & STOCK BAHAN PEMBANTU\r\n`;
    csvContent += `Gudang S.Loct,${activeReport.gudangSLoct || "2001 - 2002"}\r\n`;
    csvContent += `Tanggal,${selectedDate}\r\n`;
    csvContent += `Kode,Nama Material,Stok Awal Kg,Stok Awal Colly,Masuk Kg,Masuk Colly,Keluar Kg,Keluar Colly,Stok Akhir Kg,Stok Akhir Colly,Berat Per Colly,Gudang/Kav,Suplier,Batch,Tgl Masuk,Umur (hari),MFG,EXP,Keterangan,Cek Status\r\n`;

    activeReport.items.forEach(i => {
      const stockAkhir = (i.stockAwal || 0) + (i.masuk || 0) - (i.keluar || 0);
      const stockAkhirColly = (i.stockAwalColly || 0) + (i.masukColly || 0) - (i.keluarColly || 0);
      const ageStr = calculateAge(i.tglMasuk, selectedDate).replace("Umur ", "").replace(" hr", "");
      csvContent += `"${i.kode || ""}","${i.namaMaterial || ""}","${i.stockAwal || 0}","${i.stockAwalColly || 0}","${i.masuk || 0}","${i.masukColly || 0}","${i.keluar || 0}","${i.keluarColly || 0}","${stockAkhir}","${stockAkhirColly}","${i.beratPerColly ?? 25}","${i.gudangKav || ""}","${i.suplier || ""}","${i.batch || ""}","${i.tglMasuk || ""}","${ageStr}","${i.mfgDate || ""}","${i.expDate || ""}","${i.keterangan || ""}","${i.checked ? "OK" : "-"}"\r\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Stok_Kavling_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("Berhasil mengekspor data ke format CSV!", "success");
  };

  const handleExportExcel = () => {
    if (activeReport.items.length === 0) {
      showNotification("Tidak ada data bahan pembantu untuk diekspor pada tanggal ini.", "error");
      return;
    }

    const effectiveStockAwalDate = activeReport.stockAwalDate || activeReport.date || selectedDate;
    const title = "LAPORAN INFO KAVLING HARIAN & STOCK BAHAN PEMBANTU";
    const subTitle = activeReport.gudangSLoct ? `GUDANG / S. LOCT : ${activeReport.gudangSLoct}` : "GUDANG / S. LOCT : 2001 - 2002";
    const dateStr = `Tanggal: ${formatToShortDate(effectiveStockAwalDate)}`;
    const docCode = `Doc Code: ${activeReport.docCode || "FRM-WRH-05"}`;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Stok</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          .title { font-size: 14px; font-weight: bold; text-align: center; }
          .subtitle { font-size: 11px; text-align: center; color: #555555; }
          table { border-collapse: collapse; width: 100%; }
          th { border: 1px solid #000000; padding: 6px; background-color: #f3f4f6; font-size: 11px; font-weight: bold; text-align: center; }
          td { border: 1px solid #1a1a1a; padding: 6px; font-size: 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bg-header-1 { background-color: #e5e7eb; }
          .bg-header-2 { background-color: #f9fafb; }
          .bg-amber { background-color: #fef3c7; }
          .bg-emerald { background-color: #d1fae5; }
          .bg-rose { background-color: #fee2e2; }
          .bg-blue { background-color: #dbeafe; }
          .font-bold { font-weight: bold; }
          .font-italic { font-style: italic; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="10" class="title" style="border:none;">${title}</td></tr>
          <tr><td colspan="10" class="subtitle" style="border:none;">${subTitle}</td></tr>
          <tr><td colspan="10" class="subtitle" style="border:none;">${dateStr} | ${docCode}</td></tr>
          <tr><td colspan="10" style="border:none; height: 10px;"></td></tr>
          
          <thead>
            <tr>
              <th colspan="6" class="bg-header-1">STOCK FEED ADD</th>
              <th colspan="1" class="bg-header-2">INFO KAVLING FEED ADD</th>
              <th rowspan="2">TOTAL (Kg)</th>
              <th rowspan="2">Keterangan</th>
              <th rowspan="2">Cek Status</th>
            </tr>
            <tr>
              <th class="bg-header-2">Kode</th>
              <th class="bg-header-2" style="text-align:left;">Nama Material</th>
              <th class="bg-amber">Stock Awal</th>
              <th class="bg-emerald">Masuk</th>
              <th class="bg-rose">Keluar</th>
              <th class="bg-blue">Stock Akhir</th>
              <th class="bg-header-2" style="text-align:left;">Detail Kavling & Mutasi</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Group activeReport.items by kode (fallback to namaMaterial)
    const groupedItemsMap: { [key: string]: StockItem[] } = {};
    const groupKeysList: string[] = [];
    activeReport.items.forEach(item => {
      const key = item.kode ? item.kode.trim() : item.namaMaterial.trim();
      if (!groupedItemsMap[key]) {
        groupedItemsMap[key] = [];
        groupKeysList.push(key);
      }
      groupedItemsMap[key].push(item);
    });

    // Sort material groups alphabetically ascending by namaMaterial
    groupKeysList.sort((a, b) => {
      const nameA = groupedItemsMap[a][0]?.namaMaterial || "";
      const nameB = groupedItemsMap[b][0]?.namaMaterial || "";
      return nameA.localeCompare(nameB, "id", { sensitivity: "base" });
    });

    groupKeysList.forEach(key => {
      const itemsInGroup = groupedItemsMap[key];
      const firstItem = itemsInGroup[0];
      const calculatedAkhirSum = itemsInGroup.reduce((sum, item) => sum + ((item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0)), 0);
      const calculatedAkhirCollySum = itemsInGroup.reduce((sum, item) => sum + ((item.stockAwalColly || 0) + (item.masukColly || 0) - (item.keluarColly || 0)), 0);
      const calculatedAwalSum = itemsInGroup.reduce((sum, item) => sum + (item.stockAwal || 0), 0);
      const calculatedAwalCollySum = itemsInGroup.reduce((sum, item) => sum + (item.stockAwalColly || 0), 0);
      const calculatedMasukSum = itemsInGroup.reduce((sum, item) => sum + (item.masuk || 0), 0);
      const calculatedMasukCollySum = itemsInGroup.reduce((sum, item) => sum + (item.masukColly || 0), 0);
      const calculatedKeluarSum = itemsInGroup.reduce((sum, item) => sum + (item.keluar || 0), 0);
      const calculatedKeluarCollySum = itemsInGroup.reduce((sum, item) => sum + (item.keluarColly || 0), 0);
      const allReductions = itemsInGroup.flatMap(item => item.reductions || []);
      const totalReductionQty = allReductions.reduce((sum, r) => sum + r.qtyKg, 0);

      // Render single consolidated row for Stock Awal, Masuk, Keluar, Stock Akhir
      const stockAwalHtml = `
        <b>${calculatedAwalSum.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b><br/>
        <span style="color: #6b7280; font-size: 9px;">${calculatedAwalCollySum.toLocaleString("id-ID")} coly</span>
      `;

      const masukHtml = `
        <b style="color: #047857;">${calculatedMasukSum.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b><br/>
        <span style="color: #059669; font-size: 9px;">${calculatedMasukCollySum.toLocaleString("id-ID")} coly</span>
      `;

      const keluarHtml = `
        <b style="color: #dc2626;">${calculatedKeluarSum.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b><br/>
        <span style="color: #e11d48; font-size: 9px;">${calculatedKeluarCollySum.toLocaleString("id-ID")} coly</span>
      `;

      const stockAkhirHtml = `
        <b style="color: #2563eb;">${calculatedAkhirSum.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b><br/>
        <span style="color: #3b82f6; font-size: 9px;">${calculatedAkhirCollySum.toLocaleString("id-ID")} Colly</span>
      `;

      // Excel inline table for Detail Kavling & Mutasi
      const isSingleTglMasukExport = new Set(itemsInGroup.map(subItem => subItem.tglMasuk).filter(Boolean)).size <= 1;
      const exportAlignStyle = isSingleTglMasukExport ? "text-align: left; padding-left: 6px;" : "text-align: center;";

      const detailKavlingTable = `
        <table border="1" style="border-collapse: collapse; font-size: 9px; width: 100%;">
          <tr>
            <td style="font-weight: bold; background-color: #f3f4f6; padding: 2px;">Gudang/Kav</td>
            ${itemsInGroup.map(subItem => `<td style="${exportAlignStyle} font-weight: bold; color: #7e22ce; padding: 2px;">${subItem.gudangKav || "-"}</td>`).join("")}
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f3f4f6; padding: 2px;">Suplyer</td>
            ${itemsInGroup.map(subItem => `<td style="${exportAlignStyle} color: #7e22ce; font-style: italic; padding: 2px;">${subItem.suplier || "-"}</td>`).join("")}
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f3f4f6; padding: 2px;">Tonase</td>
            ${itemsInGroup.map(subItem => {
              const subAkhir = (subItem.stockAwal || 0) + (subItem.masuk || 0) - (subItem.keluar || 0);
              return `<td style="${exportAlignStyle} font-weight: bold; color: #2563eb; padding: 2px;">${subAkhir.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>`;
            }).join("")}
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f3f4f6; padding: 2px;">Colly</td>
            ${itemsInGroup.map(subItem => {
              const subAkhirColly = (subItem.stockAwalColly || 0) + (subItem.masukColly || 0) - (subItem.keluarColly || 0);
              return `<td style="${exportAlignStyle} font-weight: bold; color: #2563eb; padding: 2px;">${subAkhirColly.toLocaleString("id-ID")}</td>`;
            }).join("")}
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f3f4f6; padding: 2px;">Tgl masuk</td>
            ${itemsInGroup.map(subItem => `<td style="${exportAlignStyle} color: #2563eb; padding: 2px;">${subItem.tglMasuk ? formatToShortDate(subItem.tglMasuk) : "-"}</td>`).join("")}
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f3f4f6; padding: 2px;">Batch</td>
            ${itemsInGroup.map(subItem => `<td style="${exportAlignStyle} font-weight: bold; color: #dc2626; padding: 2px;">${subItem.batch || "-"}</td>`).join("")}
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f3f4f6; padding: 2px;">Umur</td>
            ${itemsInGroup.map(subItem => `<td style="${exportAlignStyle} font-weight: bold; color: #2563eb; padding: 2px;">${calculateAge(subItem.tglMasuk, selectedDate)}</td>`).join("")}
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f3f4f6; padding: 2px;">MFG</td>
            ${itemsInGroup.map(subItem => `<td style="${exportAlignStyle} color: #2563eb; padding: 2px;">${subItem.mfgDate ? formatToShortDate(subItem.mfgDate) : "-"}</td>`).join("")}
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f3f4f6; padding: 2px;">Exp. Date</td>
            ${itemsInGroup.map(subItem => `<td style="${exportAlignStyle} color: #2563eb; padding: 2px;">${subItem.expDate ? formatToShortDate(subItem.expDate) : "-"}</td>`).join("")}
          </tr>
        </table>
      `;

      html += `
        <tr>
          <td class="text-center font-bold" style="color: #dc2626; vertical-align: middle;">${firstItem.kode || "-"}</td>
          <td class="font-bold" style="color: #047857; vertical-align: middle;">
            ${firstItem.namaMaterial || "-"}
            ${totalReductionQty > 0 ? ` [RETUR -${totalReductionQty} Kg]` : ""}
          </td>
          <td class="text-right" style="vertical-align: middle;">
            ${stockAwalHtml}
          </td>
          <td class="text-right" style="background-color: #ecfdf5; vertical-align: middle;">
            ${masukHtml}
          </td>
          <td class="text-right" style="background-color: #fff1f2; vertical-align: middle;">
            ${keluarHtml}
          </td>
          <td class="text-right" style="background-color: #eff6ff; vertical-align: middle;">
            ${stockAkhirHtml}
          </td>
          <td style="background-color: #fafafa; font-size: 9px; line-height: 1.3; vertical-align: middle; padding: 2px;">
            ${detailKavlingTable}
          </td>
          <td class="text-right font-bold" style="color: #e11d48; vertical-align: middle;">
            ${(() => {
              const totalLotSum = itemsInGroup.reduce((sum, item) => sum + (item.tonase !== undefined ? item.tonase : ((item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0))), 0);
              return totalLotSum.toLocaleString("id-ID", { minimumFractionDigits: 2 });
            })()}
          </td>
          <td style="vertical-align: middle;">${firstItem.keterangan || ""}</td>
          <td class="text-center font-bold" style="vertical-align: middle;">
            ${(() => {
              const totalLotSum = itemsInGroup.reduce((sum, item) => sum + (item.tonase !== undefined ? item.tonase : ((item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0))), 0);
              const diff = calculatedAkhirSum - totalLotSum;
              return Math.abs(diff) < 0.001 ? "0.00" : `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`;
            })()}
          </td>
        </tr>
      `;
    });

    // Total Row
    html += `
        <tr class="bg-header-1 font-bold">
          <td colspan="2" class="text-right"><b>TOTAL BAHAN PEMBANTU :</b></td>
          <td class="text-right">
            <b>${totalStkAwal.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b><br/>
            <span style="font-size: 9px; font-weight: normal;">${totalStkAwalColly.toLocaleString("id-ID")} coly</span>
          </td>
          <td class="text-right" style="background-color: #ecfdf5;">
            <b style="color: #047857;">${totalMasuk.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b><br/>
            <span style="font-size: 9px; font-weight: normal;">${totalMasukColly.toLocaleString("id-ID")} coly</span>
          </td>
          <td class="text-right" style="background-color: #fff1f2;">
            <b style="color: #dc2626;">${totalKeluar.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b><br/>
            <span style="font-size: 9px; font-weight: normal;">${totalKeluarColly.toLocaleString("id-ID")} coly</span>
          </td>
          <td class="text-right" style="background-color: #eff6ff;">
            <b style="color: #2563eb;">${totalStkAkhir.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b><br/>
            <span style="font-size: 9px; color: #3b82f6;">${totalStkAkhirColly.toLocaleString("id-ID")} coly</span>
          </td>
          <td class="text-center">-</td>
          <td class="text-right" style="color: #dc2626;"><b>${totalStkAkhir.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b></td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
    
    <br/><br/>
    <!-- Signatures -->
    <table style="border: none; width: 100%;">
      <tr>
        <td style="border: none; width: 50%; text-align: center;">
          Dibuat Oleh,<br/><br/><br/><br/>
          <u><b>${activeReport.dibuatOlehName || "Sabto A"}</b></u><br/>
          <span style="font-size: 10px; color: #555555; text-transform: uppercase; font-weight: bold;">${activeReport.dibuatOlehRole || "Admin Gudang"}</span>
        </td>
        <td style="border: none; width: 50%; text-align: center;">
          Mengetahui,<br/><br/><br/><br/>
          <u><b>${activeReport.mengetahuiName || "Antonius Andri Waroto"}</b></u><br/>
          <span style="font-size: 10px; color: #555555; text-transform: uppercase; font-weight: bold;">${activeReport.mengetahuiRole || "Head Of Wrh Sub.Dept"}</span>
        </td>
      </tr>
    </table>
    </body>
    </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Stok_Kavling_Excel_${selectedDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("Berhasil mengekspor data ke Spreadsheet Excel (.xls)!", "success");
  };

  // ==========================================
  // CALCULATED VALUES
  // ==========================================

  // Global report totals
  const totalStkAwal = activeReport.items.reduce((sum, item) => sum + (item.stockAwal || 0), 0);
  const totalStkAwalColly = activeReport.items.reduce((sum, item) => sum + (item.stockAwalColly || 0), 0);
  const totalMasuk = activeReport.items.reduce((sum, item) => sum + (item.masuk || 0), 0);
  const totalMasukColly = activeReport.items.reduce((sum, item) => sum + (item.masukColly || 0), 0);
  const totalKeluar = activeReport.items.reduce((sum, item) => sum + (item.keluar || 0), 0);
  const totalKeluarColly = activeReport.items.reduce((sum, item) => sum + (item.keluarColly || 0), 0);
  const totalStkAkhir = totalStkAwal + totalMasuk - totalKeluar;
  const totalStkAkhirColly = totalStkAwalColly + totalMasukColly - totalKeluarColly;

  const renderDashboard = () => {
    const totalMaterialsCount = activeReport.items.length;
    
    const lowStockItems = activeReport.items.filter(item => {
      const stockAkhir = (item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0);
      return stockAkhir < 150 || (item.stockAwal > 0 && stockAkhir / item.stockAwal < 0.15);
    });

    const topMaterials = [...activeReport.items]
      .sort((a, b) => {
        const aAkhir = (a.stockAwal || 0) + (a.masuk || 0) - (a.keluar || 0);
        const bAkhir = (b.stockAwal || 0) + (b.masuk || 0) - (b.keluar || 0);
        return bAkhir - aAkhir;
      })
      .slice(0, 5);

    return (
      <div className="flex-grow flex flex-col gap-6 print:hidden animate-fade-in font-sans w-full">
        
        {/* WELCOME BANNER */}
        <div className="bg-white border-2 border-[#1A1A1A] p-6 rounded shadow-sm relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-5 pointer-events-none">
            <BookOpen className="w-32 h-32 text-[#1A1A1A]" />
          </div>
          <div className="flex items-center gap-2 text-[#E65100] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" /> Sistem Manajemen Pergudangan JAPFA
          </div>
          <h2 className="font-serif italic text-2xl md:text-3xl font-black text-neutral-800 leading-tight">
            Selamat Datang di Portal Admin Laporan Harian
          </h2>
          <p className="text-xs text-neutral-600 mt-2 max-w-xl leading-relaxed">
            Gunakan portal ini untuk merekam penerimaan, pengeluaran, dan memantau status persediaan bahan pembantu Unit LPG harian Anda secara real-time.
          </p>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-neutral-50 border border-neutral-200 px-4 py-2.5 rounded flex items-center gap-3">
              <Calendar className="w-5 h-5 text-neutral-500" />
              <div>
                <div className="text-[9px] uppercase font-bold text-neutral-400">Tanggal Aktif</div>
                <div className="text-xs font-bold font-mono">{selectedDate}</div>
              </div>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 px-4 py-2.5 rounded flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-neutral-500" />
              <div>
                <div className="text-[9px] uppercase font-bold text-neutral-400">Kode Laporan</div>
                <div className="text-xs font-bold font-mono">{activeReport.docCode || "PLT – WRH – FM – 02 – 03"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* METRIC CARDS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CARD 1: TOTAL ITEM */}
          <div className="bg-white border-2 border-neutral-800 p-4 rounded shadow-sm hover:translate-y-[-2px] transition-transform duration-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Total Material</span>
              <Package className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="font-serif text-3xl font-black text-neutral-800 leading-none mb-1">
              {totalMaterialsCount}
            </div>
            <div className="text-[10px] text-neutral-500 font-medium">
              Bahan pembantu aktif hari ini
            </div>
          </div>

          {/* CARD 2: STOK AWAL */}
          <div className="bg-amber-50/50 border-2 border-amber-600/40 p-4 rounded shadow-sm hover:translate-y-[-2px] transition-transform duration-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Total Stok Awal</span>
              <span className="text-[9px] font-mono bg-amber-100 text-amber-800 px-1 border border-amber-300 rounded font-bold font-mono">Inisial</span>
            </div>
            <div className="font-mono text-lg font-bold text-amber-900 leading-tight">
              {totalStkAwal.toLocaleString("id-ID")} <span className="text-xs font-sans text-neutral-500 font-normal">Kg</span>
            </div>
            <div className="text-[10px] text-amber-700 font-bold mt-1.5 flex items-center gap-1 font-mono">
              📦 {totalStkAwalColly} Colly
            </div>
          </div>

          {/* CARD 3: PENERIMAAN (MASUK) */}
          <div className="bg-emerald-50/50 border-2 border-emerald-600/40 p-4 rounded shadow-sm hover:translate-y-[-2px] transition-transform duration-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Barang Masuk (In)</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-mono text-lg font-bold text-emerald-900 leading-tight">
              {totalMasuk.toLocaleString("id-ID")} <span className="text-xs font-sans text-neutral-500 font-normal">Kg</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1 font-mono">
              📥 {totalMasukColly} Colly
            </div>
          </div>

          {/* CARD 4: PENGELUARAN (KELUAR) */}
          <div className="bg-rose-50/50 border-2 border-rose-600/40 p-4 rounded shadow-sm hover:translate-y-[-2px] transition-transform duration-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Barang Keluar (Out)</span>
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <div className="font-mono text-lg font-bold text-rose-900 leading-tight">
              {totalKeluar.toLocaleString("id-ID")} <span className="text-xs font-sans text-neutral-500 font-normal">Kg</span>
            </div>
            <div className="text-[10px] text-rose-700 font-bold mt-1.5 flex items-center gap-1 font-mono">
              📤 {totalKeluarColly} Colly
            </div>
          </div>

        </div>

        {/* INTEGRATED WAREHOUSE VISUALIZATIONS: FEED ADD, STOK KARUNG & STOK LABEL */}
        <WarehouseVisualizations
          feedAddReport={activeReport}
          karungReport={getActiveKarungReport()}
          labelReport={getActiveLabelReport()}
          onNavigate={(tab, sub) => {
            setActiveTab(tab);
            if (sub) setFeedAddSubTab(sub);
          }}
        />

        {/* QUICK SHORTCUTS ROW */}
        <div className="bg-neutral-50 border border-neutral-300 p-5 rounded flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h4 className="font-serif italic font-bold text-sm text-neutral-800">Navigasi Cepat Modul Pergudangan</h4>
            <p className="text-[11px] text-neutral-500">Pilih salah satu menu shortcut di sebelah kanan untuk langsung melompat ke modul atau form pencatatan khusus.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => {
                setActiveTab("stock");
                setFeedAddSubTab("table");
              }}
              className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-400" /> Stok Feed Add
            </button>
            <button 
              onClick={() => {
                setActiveTab("stock");
                setFeedAddSubTab("masuk");
              }}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" /> Masuk Feed Add
            </button>
            <button 
              onClick={() => {
                setActiveTab("stock");
                setFeedAddSubTab("keluar");
              }}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" /> Keluar Feed Add
            </button>
            <button 
              onClick={() => {
                setActiveTab("stock");
                setFeedAddSubTab("kavling");
              }}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <MapPin className="w-4 h-4" /> Kavling Feed Add
            </button>
            <button 
              onClick={() => setActiveTab("stock-karung")}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Layers className="w-4 h-4" /> Stock Karung
            </button>
            <button 
              onClick={() => setActiveTab("stock-label")}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Tag className="w-4 h-4" /> Stock Label
            </button>
          </div>
        </div>

      </div>
    );
  };

  const renderBarangMasuk = () => {
    const selectedItem = activeReport.items.find(item => item.id === (rcvIsNewItem ? "" : rcvSelectedItemId));
    const receivedItems = activeReport.items.filter(item => (item.masukColly || 0) > 0 || (item.masuk || 0) > 0);

    return (
      <div className="flex-grow flex flex-col xl:flex-row gap-6 print:hidden animate-fade-in font-sans w-full">
        
        {/* LEFT COLUMN: LIST OF MATERIALS AND THE 9-COLUMN LOG */}
        <div className="flex-grow bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
            <div>
              <h2 className="font-serif italic text-lg font-bold text-neutral-800 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                Manajemen Penerimaan Barang Masuk (Inbound)
              </h2>
              <p className="text-[10px] text-neutral-500">Rekam dan lacak log penambahan pasokan material pembantu secara detail</p>
            </div>

            {/* Inner Sub-tab Switch */}
            <div className="flex bg-neutral-100 p-1 border border-neutral-300 rounded text-[11px] font-bold self-start sm:self-auto">
              <button
                onClick={() => setPenerimaanTab("log")}
                className={`px-3 py-1 rounded transition-colors ${
                  penerimaanTab === "log"
                    ? "bg-[#1A1A1A] text-white shadow-sm"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                Log Penerimaan (9 Kolom)
              </button>
              <button
                onClick={() => setPenerimaanTab("stok")}
                className={`px-3 py-1 rounded transition-colors ${
                  penerimaanTab === "stok"
                    ? "bg-[#1A1A1A] text-white shadow-sm"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                Seluruh Stok Gudang
              </button>
            </div>
          </div>

          {penerimaanTab === "log" ? (
            /* ==========================================
               SUB-TAB: 9-COLUMN RECEIPT LOG
               ========================================== */
            <div className="flex-grow flex flex-col">
              {receivedItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-neutral-200 bg-white text-[11px]">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-300">
                        <th className="p-2 font-bold text-neutral-700 border-r border-neutral-200">Kode Barang</th>
                        <th className="p-2 font-bold text-neutral-700 border-r border-neutral-200">Nama Material</th>
                        <th className="p-2 font-bold text-neutral-700 border-r border-neutral-200">Supplier</th>
                        <th className="p-2 font-bold text-neutral-700 border-r border-neutral-200 text-center">Gudang/Kavling</th>
                        <th className="p-2 font-bold text-emerald-800 border-r border-neutral-200 text-right bg-emerald-50/20">Colly</th>
                        <th className="p-2 font-bold text-neutral-700 border-r border-neutral-200 text-center">Tanggal Masuk</th>
                        <th className="p-2 font-bold text-neutral-700 border-r border-neutral-200 text-center">Batch</th>
                        <th className="p-2 font-bold text-neutral-700 border-r border-neutral-200 text-center">MFG Date</th>
                        <th className="p-2 font-bold text-neutral-700 border-r border-neutral-200 text-center">EXP DATE</th>
                        <th className="p-2 font-bold text-emerald-800 border-r border-neutral-200 text-right bg-emerald-50/20">Tonase (Kg)</th>
                        <th className="p-2 font-bold text-neutral-700 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivedItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-neutral-200 hover:bg-neutral-50/50 transition-colors"
                        >
                          <td className="p-2 font-mono font-bold text-neutral-700 border-r border-neutral-200">
                            {item.kode}
                          </td>
                          <td className="p-2 font-semibold text-neutral-800 border-r border-neutral-200">
                            {item.namaMaterial}
                          </td>
                          <td className="p-2 text-neutral-600 border-r border-neutral-200 truncate max-w-[120px]" title={item.suplier}>
                            {item.suplier || "-"}
                          </td>
                          <td className="p-2 font-mono font-bold text-neutral-700 text-center border-r border-neutral-200">
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                              {item.gudangKav || "-"}
                            </span>
                          </td>
                          <td className="p-2 font-mono font-bold text-emerald-700 text-right border-r border-neutral-200 bg-emerald-50/10">
                            {item.masukColly || 0}
                          </td>
                          <td className="p-2 font-mono text-center text-neutral-600 border-r border-neutral-200">
                            {item.tglMasuk || "-"}
                          </td>
                          <td className="p-2 font-mono text-center text-neutral-700 font-bold border-r border-neutral-200">
                            {item.batch || "-"}
                          </td>
                          <td className="p-2 font-mono text-center text-neutral-500 border-r border-neutral-200">
                            {item.mfgDate || "-"}
                          </td>
                          <td className="p-2 font-mono text-center text-neutral-500 border-r border-neutral-200">
                            {item.expDate || "-"}
                          </td>
                          <td className="p-2 font-mono font-bold text-emerald-700 text-right border-r border-neutral-200 bg-emerald-50/10">
                            {(item.masuk || 0).toLocaleString("id-ID")} Kg
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleResetPenerimaanItem(item.id)}
                              className="p-1 hover:bg-red-50 text-red-600 hover:text-red-800 rounded transition-colors"
                              title="Batalkan / Reset Penerimaan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center py-16 text-center bg-neutral-50 border border-dashed border-neutral-300 rounded-lg">
                  <div className="bg-emerald-50 p-4 rounded-full border border-emerald-100 mb-3 text-emerald-600 animate-pulse">
                    <ArrowDownLeft className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif italic text-sm font-bold text-neutral-800">Belum Ada Penerimaan Terdaftar</h4>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    Silakan gunakan form input di kolom sebelah kanan untuk mencatat penerimaan barang baru atau menambahkan kuantitas masuk.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ==========================================
               SUB-TAB: ACTIVE MATERIALS STOCK
               ========================================== */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-neutral-200 bg-white text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-300">
                    <th className="p-2 font-bold text-neutral-600">Kode</th>
                    <th className="p-2 font-bold text-neutral-600">Nama Material</th>
                    <th className="p-2 font-bold text-neutral-600">Kavling</th>
                    <th className="p-2 text-right font-bold text-neutral-600 bg-amber-50/30">Stock Awal</th>
                    <th className="p-2 text-right font-bold text-neutral-600 bg-emerald-50/30 w-24">Masuk Colly</th>
                    <th className="p-2 text-right font-bold text-neutral-600 bg-emerald-50/30 w-28">Masuk Kg</th>
                    <th className="p-2 text-right font-bold text-neutral-600 bg-blue-50/30 w-28">Stok Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReport.items.map((item) => {
                    const isSelected = !rcvIsNewItem && item.id === rcvSelectedItemId;
                    const stockAkhir = (item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0);
                    const isFilled = (item.masukColly || 0) > 0 || (item.masuk || 0) > 0;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setRcvIsNewItem(false);
                          setRcvSelectedItemId(item.id);
                        }}
                        className={`border-b border-neutral-200 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-400 font-semibold"
                            : isFilled
                              ? "bg-emerald-50/10 hover:bg-neutral-50"
                              : "hover:bg-neutral-50"
                        }`}
                      >
                        <td className="p-2 font-mono font-bold text-neutral-700">{item.kode}</td>
                        <td className="p-2 font-medium text-neutral-800 flex items-center justify-between">
                          <span>{item.namaMaterial}</span>
                          {isFilled && (
                            <span className="ml-2 text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded uppercase">
                              Ada Masuk
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-mono text-neutral-500">
                          <span className="font-bold text-neutral-700 bg-neutral-100 border px-1 rounded text-[10px]">
                            {item.gudangKav || "-"}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono text-neutral-500 bg-amber-50/10">
                          {item.stockAwalColly || 0} C / {(item.stockAwal || 0).toLocaleString("id-ID")} Kg
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10">
                          {item.masukColly || 0}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10">
                          {(item.masuk || 0).toLocaleString("id-ID")} Kg
                        </td>
                        <td className="p-2 text-right font-mono text-neutral-800 bg-blue-50/10">
                          {stockAkhir.toLocaleString("id-ID")} Kg
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAILED INBOUND FORM */}
        <div className="w-full xl:max-w-[32%] flex flex-col gap-4 shrink-0">
          <div className="bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm">
            <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-center">
              <div>
                <h3 className="font-serif italic text-base font-bold text-neutral-800">Form Penerimaan Stock</h3>
                <p className="text-[9px] text-neutral-400 mt-0.5">Input log detail penerimaan barang</p>
              </div>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>

            {/* Inbound Mode Switcher */}
            <div className="grid grid-cols-2 bg-neutral-100 p-1 border border-neutral-300 rounded text-[10px] font-bold mb-4">
              <button
                type="button"
                onClick={() => setRcvIsNewItem(false)}
                className={`py-1.5 rounded transition-all ${
                  !rcvIsNewItem
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                1. Update Stok Terdaftar
              </button>
              <button
                type="button"
                onClick={() => {
                  setRcvIsNewItem(true);
                  if (!rcvMasterKode && masterMaterials.length > 0) {
                    setRcvMasterKode(masterMaterials[0].kode);
                  }
                }}
                className={`py-1.5 rounded transition-all ${
                  rcvIsNewItem
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                2. Penerimaan Barang Baru
              </button>
            </div>

            <div className="flex flex-col gap-4 font-sans text-xs">
              
              {/* Mode-Specific Selectors */}
              {!rcvIsNewItem ? (
                /* UPDATE EXISTING ITEM SELECTOR */
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-1.5">
                    Pilih Material Terdaftar
                  </label>
                  <select
                    value={rcvSelectedItemId}
                    onChange={(e) => setRcvSelectedItemId(e.target.value)}
                    className="w-full p-2 text-xs border border-[#1A1A1A] bg-white font-sans focus:outline-none rounded"
                  >
                    <option value="" disabled>-- Pilih Material --</option>
                    {activeReport.items
                      .slice()
                      .sort((a, b) => (a.namaMaterial || "").localeCompare(b.namaMaterial || "", "id", { sensitivity: "base" }))
                      .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.kode} - {item.namaMaterial} ({item.gudangKav || "No Kav"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* INBOUND OF A NEW MATERIAL (FROM CATALOG OR CUSTOM) */
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-1.5">
                      Pilih Material dari Katalog Master
                    </label>
                    <select
                      value={rcvMasterKode}
                      onChange={(e) => setRcvMasterKode(e.target.value)}
                      className="w-full p-2 text-xs border border-[#1A1A1A] bg-white font-sans focus:outline-none rounded"
                    >
                      <option value="" disabled>-- Pilih Katalog --</option>
                      {masterMaterials.map((m) => (
                        <option key={m.kode} value={m.kode}>
                          {m.kode} - {m.namaMaterial}
                        </option>
                      ))}
                      <option value="custom" className="text-emerald-700 font-bold">+ BUAT KODE BARANG BARU</option>
                    </select>
                  </div>

                  {rcvMasterKode === "custom" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-l-2 border-emerald-500 pl-3 py-1">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-500 mb-1">Kode Barang Baru</label>
                        <input
                          type="text"
                          value={rcvCustomKode}
                          onChange={(e) => setRcvCustomKode(e.target.value.toUpperCase())}
                          placeholder="Contoh: 11223400"
                          className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono focus:outline-none rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-500 mb-1">Nama Material</label>
                        <input
                          type="text"
                          value={rcvNamaMaterial}
                          onChange={(e) => setRcvNamaMaterial(e.target.value.toUpperCase())}
                          placeholder="Contoh: VITAMIN C 99%"
                          className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white focus:outline-none rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SHARED 7 FIELDS */}
              <div className="border-t border-dashed border-neutral-200 pt-3 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 mb-1">Supplier</label>
                    <input
                      type="text"
                      value={rcvSupplier}
                      onChange={(e) => setRcvSupplier(e.target.value)}
                      placeholder="Masukkan nama supplier"
                      className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white focus:outline-none rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 mb-1">Gudang / Kavling</label>
                    <input
                      type="text"
                      value={rcvGudangKav}
                      onChange={(e) => setRcvGudangKav(e.target.value)}
                      placeholder="Contoh: 2002"
                      className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono focus:outline-none rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 mb-1">Tanggal Masuk</label>
                    <input
                      type="date"
                      value={rcvTanggalMasuk}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setRcvTanggalMasuk(newDate);
                        setRcvBatch(formatDateToYYMMDD(newDate));
                      }}
                      className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono focus:outline-none rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 mb-1">
                      Batch / No Lot <span className="text-[8px] font-normal text-emerald-700 italic">(Otomatis YYMMDD)</span>
                    </label>
                    <input
                      type="text"
                      value={rcvBatch}
                      onChange={(e) => setRcvBatch(e.target.value)}
                      placeholder="Format YYMMDD"
                      className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono focus:outline-none rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 mb-1">MFG Date (Tgl Produksi)</label>
                    <input
                      type="date"
                      value={rcvMfgDate}
                      onChange={(e) => setRcvMfgDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono focus:outline-none rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 mb-1">EXP DATE (Tgl Kedaluwarsa)</label>
                    <input
                      type="date"
                      value={rcvExpDate}
                      onChange={(e) => setRcvExpDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-white font-mono focus:outline-none rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-2.5 rounded border border-neutral-200 mt-1">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-600 mb-1">Jumlah Colly</label>
                    <input
                      type="number"
                      value={rcvColly}
                      onChange={(e) => handleRcvCollyChange(e.target.value)}
                      placeholder="Pcs/Bags"
                      className="w-full px-1.5 py-1 border border-[#1A1A1A] bg-white font-mono focus:outline-none rounded text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-600 mb-1">Kg / Colly</label>
                    <input
                      type="number"
                      value={rcvKgPerColly}
                      onChange={(e) => handleRcvKgPerCollyChange(e.target.value)}
                      placeholder="Kg/Colly"
                      className="w-full px-1.5 py-1 border border-[#1A1A1A] bg-white font-mono focus:outline-none rounded text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-600 mb-1">Total Kg</label>
                    <input
                      type="number"
                      value={rcvTotalKg}
                      onChange={(e) => setRcvTotalKg(e.target.value)}
                      placeholder="Otomatis"
                      className="w-full px-1.5 py-1 border border-emerald-600/50 bg-emerald-50/20 font-mono focus:outline-none rounded text-center text-xs font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProcessPenerimaan}
                className="w-full mt-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold uppercase text-[10px] tracking-wider rounded transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Proses Penerimaan Stock
              </button>
            </div>
          </div>
        </div>

      </div>
    );
  };

  const renderBarangKeluar = () => {
    const selectedItem = activeReport.items.find(item => item.id === activeItemId) || activeReport.items[0];

    const outboundLogs: FeedAddOutboundLog[] = activeReport.feedAddOutboundLogs !== undefined
      ? activeReport.feedAddOutboundLogs
      : DEFAULT_FEED_ADD_OUTBOUND_LOGS;

    const filteredLogs = outboundFilter === "all"
      ? outboundLogs
      : outboundLogs.filter(log => log.kode === outboundFilter || log.namaMaterial === outboundFilter);

    const totalCollyKeluar = filteredLogs.reduce((acc, curr) => acc + (Number(curr.collyKeluar) || 0), 0);
    const totalKgKeluar = filteredLogs.reduce((acc, curr) => acc + (Number(curr.tonaseKg) || 0), 0);

    // List of distinct materials in outbound logs for filter dropdown
    const distinctMaterials = Array.from(new Set(outboundLogs.map(l => l.kode))).map(kode => {
      const match = outboundLogs.find(l => l.kode === kode);
      return { kode, namaMaterial: match?.namaMaterial || kode };
    });

    const availableColly = selectedItem
      ? (selectedItem.stockAwalColly || 0) + (selectedItem.masukColly || 0) - (selectedItem.keluarColly || 0)
      : 0;

    const availableKg = selectedItem
      ? (selectedItem.stockAwal || 0) + (selectedItem.masuk || 0) - (selectedItem.keluar || 0)
      : 0;

    return (
      <div className="flex-grow flex flex-col xl:flex-row gap-6 print:hidden animate-fade-in font-sans w-full">
        
        {/* LEFT COLUMN: 9-COLUMN OUTBOUND LOG OR ALL WAREHOUSE STOCK */}
        <div className="flex-grow bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-rose-600 shrink-0 stroke-[2.5]" />
              <div>
                <h2 className="font-serif italic text-lg font-bold text-neutral-800">
                  Manajemen Pengeluaran Barang (Outbound)
                </h2>
                <p className="text-[10px] text-neutral-500 font-medium">
                  Rekam dan lacak log pengurangan pasokan material pembantu secara detail
                </p>
              </div>
            </div>

            {/* Sub-tabs switch */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setOutboundTab("log")}
                className={`py-1.5 px-3 rounded text-xs font-bold transition-all cursor-pointer ${
                  outboundTab === "log"
                    ? "bg-[#1A1A1A] text-white shadow-sm"
                    : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300"
                }`}
              >
                Log Pengeluaran (9 Kolom)
              </button>
              <button
                type="button"
                onClick={() => setOutboundTab("stok")}
                className={`py-1.5 px-3 rounded text-xs font-bold transition-all cursor-pointer ${
                  outboundTab === "stok"
                    ? "bg-[#1A1A1A] text-white shadow-sm"
                    : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300"
                }`}
              >
                Seluruh Stok Gudang
              </button>
            </div>
          </div>

          {outboundTab === "log" ? (
            <>
              {/* Summary and Filter Banner */}
              <div className="bg-rose-50/40 border border-rose-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center text-neutral-700">
                    <span className="font-medium text-[11px]">Total Riwayat Log:</span>
                    <span className="border border-rose-300 bg-white text-rose-700 font-bold px-2 py-0.5 rounded-full text-[11px] ml-1.5 shadow-2xs">
                      {filteredLogs.length} Transaksi
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-700">
                    <span>Total Colly:</span>
                    <strong className="text-rose-600 font-bold ml-1 mr-3 font-mono">
                      {totalCollyKeluar} C
                    </strong>
                    <span>Total Kg:</span>
                    <strong className="text-rose-600 font-bold ml-1 font-mono">
                      {totalKgKeluar.toLocaleString("id-ID")} Kg
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-[11px] text-neutral-700 tracking-wider">FILTER:</span>
                  <select
                    value={outboundFilter}
                    onChange={(e) => setOutboundFilter(e.target.value)}
                    className="bg-white border border-neutral-300 rounded px-2.5 py-1 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                  >
                    <option value="all">Semua Material ({activeReport.items.length || 131})</option>
                    {distinctMaterials.map(mat => (
                      <option key={mat.kode} value={mat.kode}>
                        {mat.kode} - {mat.namaMaterial}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table with 9 Columns */}
              <div className="overflow-x-auto border border-neutral-200 rounded">
                <table className="w-full text-left border-collapse bg-white text-xs">
                  <thead>
                    <tr className="bg-neutral-50/90 border-b border-neutral-300 text-[11px]">
                      <th className="p-2.5 font-bold text-neutral-800 border-r border-neutral-200 whitespace-nowrap">Kode Barang</th>
                      <th className="p-2.5 font-bold text-neutral-800 border-r border-neutral-200 whitespace-nowrap">Nama Material</th>
                      <th className="p-2.5 font-bold text-neutral-800 border-r border-neutral-200 text-center whitespace-nowrap">Gudang/Kavling</th>
                      <th className="p-2.5 font-bold text-rose-600 border-r border-neutral-200 text-center whitespace-nowrap">Colly Keluar</th>
                      <th className="p-2.5 font-bold text-neutral-800 border-r border-neutral-200 text-center whitespace-nowrap">Waktu Keluar</th>
                      <th className="p-2.5 font-bold text-neutral-800 border-r border-neutral-200 text-center whitespace-nowrap">Tanggal Keluar</th>
                      <th className="p-2.5 font-bold text-neutral-800 border-r border-neutral-200 text-center whitespace-nowrap">Batch / Lot</th>
                      <th className="p-2.5 font-bold text-neutral-800 border-r border-neutral-200 text-center whitespace-nowrap">Keperluan / Purpose</th>
                      <th className="p-2.5 font-bold text-rose-600 border-r border-neutral-200 text-right whitespace-nowrap">Tonase (Kg)</th>
                      <th className="p-2.5 font-bold text-neutral-800 text-center w-12 whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-neutral-400 italic">
                          Belum ada data log pengeluaran untuk filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b border-neutral-200 hover:bg-neutral-50/60 transition-colors text-xs"
                        >
                          <td className="p-2.5 font-mono font-bold text-neutral-800 border-r border-neutral-200 whitespace-nowrap">
                            {log.kode}
                          </td>
                          <td className="p-2.5 font-bold text-neutral-900 border-r border-neutral-200">
                            {log.namaMaterial}
                          </td>
                          <td className="p-2.5 text-center border-r border-neutral-200 whitespace-nowrap">
                            <span className="border border-amber-300 bg-amber-50 text-amber-900 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                              {log.gudangKav || "2001"}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-rose-600 border-r border-neutral-200 whitespace-nowrap">
                            {log.collyKeluar} C
                          </td>
                          <td className="p-2.5 text-center font-mono text-neutral-600 border-r border-neutral-200 whitespace-nowrap">
                            {log.waktuKeluar}
                          </td>
                          <td className="p-2.5 text-center font-mono text-neutral-600 border-r border-neutral-200 whitespace-nowrap">
                            {log.tanggalKeluar}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-neutral-800 border-r border-neutral-200 whitespace-nowrap">
                            {log.batch}
                          </td>
                          <td className="p-2.5 text-center border-r border-neutral-200 whitespace-nowrap">
                            <span className="border border-neutral-200 bg-neutral-50 text-neutral-600 px-2 py-0.5 rounded text-[10px]">
                              {log.keperluan}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-600 border-r border-neutral-200 whitespace-nowrap">
                            {log.tonaseKg.toLocaleString("id-ID")} Kg
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteOutboundLog(log.id)}
                              className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-colors inline-block cursor-pointer"
                              title="Hapus Log Pengeluaran"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* WAREHOUSE STOCK VIEW */
            <div className="overflow-x-auto border border-neutral-200 rounded">
              <table className="w-full text-left border-collapse bg-white text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-300 text-[11px]">
                    <th className="p-2.5 font-bold text-neutral-700">Kode</th>
                    <th className="p-2.5 font-bold text-neutral-700">Nama Material</th>
                    <th className="p-2.5 font-bold text-neutral-700 text-center">Kavling</th>
                    <th className="p-2.5 text-right font-bold text-neutral-700 bg-amber-50/40">Stock Awal</th>
                    <th className="p-2.5 text-right font-bold text-neutral-700 bg-rose-50/40">Keluar Colly</th>
                    <th className="p-2.5 text-right font-bold text-neutral-700 bg-rose-50/40">Keluar Kg</th>
                    <th className="p-2.5 text-right font-bold text-neutral-700 bg-blue-50/40">Stok Akhir</th>
                    <th className="p-2.5 text-center font-bold text-neutral-700 w-24">Pilih Form</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReport.items
                    .slice()
                    .sort((a, b) => (a.namaMaterial || "").localeCompare(b.namaMaterial || "", "id", { sensitivity: "base" }))
                    .map((item) => {
                      const isActive = item.id === activeItemId;
                      const stockAkhirColly = (item.stockAwalColly || 0) + (item.masukColly || 0) - (item.keluarColly || 0);
                      const stockAkhirKg = (item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setActiveItemId(item.id)}
                          className={`border-b border-neutral-200 cursor-pointer transition-colors ${
                            isActive
                              ? "bg-rose-50 border-rose-400 font-semibold"
                              : "hover:bg-neutral-50"
                          }`}
                        >
                          <td className="p-2.5 font-mono font-bold text-neutral-800">{item.kode}</td>
                          <td className="p-2.5 font-bold text-neutral-900">{item.namaMaterial}</td>
                          <td className="p-2.5 text-center">
                            <span className="border border-amber-300 bg-amber-50 text-amber-900 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                              {item.gudangKav || "2001"}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono text-neutral-700 bg-amber-50/20">
                            {item.stockAwalColly || 0} C / {(item.stockAwal || 0).toLocaleString("id-ID")} Kg
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-600 bg-rose-50/20">
                            {item.keluarColly || 0} C
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-600 bg-rose-50/20">
                            {(item.keluar || 0).toLocaleString("id-ID")} Kg
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-neutral-900 bg-blue-50/20">
                            {stockAkhirColly} C / {stockAkhirKg.toLocaleString("id-ID")} Kg
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveItemId(item.id);
                              }}
                              className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-[10px] font-bold uppercase transition-colors"
                            >
                              Pilih
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: FORM PENGELUARAN STOCK */}
        <div className="w-full xl:max-w-[340px] 2xl:max-w-[380px] shrink-0">
          <div className="bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm flex flex-col gap-4">
            <div className="border-b-2 border-black pb-2 flex justify-between items-center">
              <div>
                <h3 className="font-serif italic text-base font-bold text-neutral-800">
                  Form Pengeluaran Stock
                </h3>
                <p className="text-[10px] text-neutral-500 font-medium">
                  Input log detail pengeluaran barang
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-rose-600 stroke-[2.5]" />
            </div>

            {/* Dropdown Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase text-neutral-700 tracking-wider mb-1.5">
                PILIH MATERIAL DARI STOK GUDANG
              </label>
              <select
                value={selectedItem?.id || ""}
                onChange={(e) => setActiveItemId(e.target.value)}
                className="w-full p-2.5 text-xs font-semibold border border-neutral-800 rounded bg-white focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
              >
                {activeReport.items
                  .slice()
                  .sort((a, b) => (a.namaMaterial || "").localeCompare(b.namaMaterial || "", "id", { sensitivity: "base" }))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kode} - {item.namaMaterial} ({item.gudangKav || "2001"})
                    </option>
                  ))}
              </select>
            </div>

            {selectedItem ? (
              <div className="flex flex-col gap-4">
                {/* Active Info Metadata Box */}
                <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between items-center text-neutral-600">
                    <span className="font-medium text-[11px]">Gudang/Kavling:</span>
                    <span className="border border-amber-300 bg-amber-50 text-amber-900 font-mono font-bold px-2 py-0.5 rounded text-xs">
                      {selectedItem.gudangKav || "2001"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-600">
                    <span className="font-medium text-[11px]">Stok Tersedia Saat Ini:</span>
                    <span className="font-mono font-bold text-neutral-900">
                      {availableColly} C / {availableKg.toLocaleString("id-ID")} Kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-600">
                    <span className="font-medium text-[11px]">Berat Standard:</span>
                    <span className="font-mono text-neutral-700">
                      {selectedItem.beratPerColly ?? 25} Kg / Colly
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-600">
                    <span className="font-medium text-[11px]">Batch / Lot:</span>
                    <span className="font-mono font-bold text-neutral-900">
                      {selectedItem.batch || "-"}
                    </span>
                  </div>
                </div>

                {/* Form Inputs */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                        Keluar Colly
                      </label>
                      <input
                        type="number"
                        value={outColly}
                        onChange={(e) => handleOutCollyChange(e.target.value)}
                        placeholder="Contoh: 5"
                        className="w-full px-2.5 py-1.5 border border-neutral-700 bg-white font-mono rounded text-xs focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                        Kg / Colly
                      </label>
                      <input
                        type="number"
                        value={outBeratPerColly}
                        onChange={(e) => handleOutBeratPerCollyChange(e.target.value)}
                        placeholder="Contoh: 25"
                        className="w-full px-2.5 py-1.5 border border-neutral-700 bg-white font-mono rounded text-xs focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                      Total Keluar Kg (Tonase)
                    </label>
                    <input
                      type="number"
                      value={outKg}
                      onChange={(e) => setOutKg(e.target.value)}
                      placeholder="Otomatis dihitung / isi manual"
                      className="w-full px-2.5 py-2 border-2 border-rose-300 bg-rose-50/10 font-mono rounded text-xs font-bold text-rose-700 focus:outline-none focus:border-rose-500 placeholder:text-rose-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                      Catatan / Keperluan Pengeluaran
                    </label>
                    <input
                      type="text"
                      value={outCatatan}
                      onChange={(e) => setOutCatatan(e.target.value)}
                      placeholder="Contoh: Produksi Line 1 / Shift A / Uji Lab"
                      className="w-full px-2.5 py-2 border border-neutral-700 bg-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddStockKeluar(selectedItem.id)}
                  className="w-full py-2.5 bg-[#C81E3D] hover:bg-[#A81832] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  + PROSES PENGELUARAN STOCK
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400 italic">
                Pilih barang untuk memulai pencatatan pengeluaran.
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  const renderKavling = () => {
    const selectedItem = activeReport.items.find(item => item.id === activeItemId);

    return (
      <div className="flex-grow flex flex-col xl:flex-row gap-6 print:hidden animate-fade-in font-sans w-full">
        
        {/* LEFT COLUMN: LIST OF MATERIALS WITH KAVLING INFO */}
        <div className="flex-grow bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm">
          <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
            <div>
              <h2 className="font-serif italic text-lg font-bold text-neutral-800">Manajemen Kavling & Identitas Lot</h2>
              <p className="text-[10px] text-neutral-500 font-medium">Daftar pemetaan lokasi kavling gudang dan tanggal kedaluwarsa</p>
            </div>
            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-800 border border-neutral-300 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" /> Lot Mapping
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-neutral-200 bg-white text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-300">
                  <th className="p-2 font-bold text-neutral-600">Kode</th>
                  <th className="p-2 font-bold text-neutral-600">Nama Material</th>
                  <th className="p-2 font-bold text-neutral-600 text-center">Kavling</th>
                  <th className="p-2 font-bold text-neutral-600">No. Batch/Lot</th>
                  <th className="p-2 font-bold text-neutral-600">Supplier</th>
                  <th className="p-2 font-bold text-neutral-600 text-center">Tgl Masuk</th>
                  <th className="p-2 font-bold text-neutral-600 text-center">Umur Lot</th>
                  <th className="p-2 font-bold text-neutral-600 text-center">Exp Date</th>
                  <th className="p-2 font-bold text-neutral-600 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {activeReport.items
                  .slice()
                  .sort((a, b) => (a.namaMaterial || "").localeCompare(b.namaMaterial || "", "id", { sensitivity: "base" }))
                  .map((item) => {
                  const isActive = item.id === activeItemId;
                  const lotAgeStr = calculateAge(item.tglMasuk || "", selectedDate);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setActiveItemId(item.id)}
                      className={`border-b border-neutral-200 cursor-pointer transition-colors ${
                        isActive
                          ? "bg-amber-50 border-amber-400 font-semibold"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      <td className="p-2 font-mono font-bold text-neutral-700">{item.kode}</td>
                      <td className="p-2 font-medium text-neutral-800">{item.namaMaterial}</td>
                      <td className="p-2 text-center font-mono font-bold text-[#E65100]">
                        {item.gudangKav || "-"}
                      </td>
                      <td className="p-2 font-mono text-neutral-600">{item.batch || "-"}</td>
                      <td className="p-2 text-neutral-500 font-serif italic">{item.suplier || "-"}</td>
                      <td className="p-2 text-center font-mono text-neutral-500">
                        {item.tglMasuk || "-"}
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700">
                        {lotAgeStr}
                      </td>
                      <td className="p-2 text-center font-mono text-red-600 font-bold">
                        {item.expDate || "-"}
                      </td>
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus lot ini untuk "${item.namaMaterial}" (Batch: ${item.batch || "-"})?`)) {
                              handleDeleteItem(item.id);
                            }
                          }}
                          className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors inline-block cursor-pointer"
                          title="Hapus lot ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED KAVLING FORM */}
        <div className="w-full xl:max-w-[30%] flex flex-col gap-4">
          <div className="bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm">
            <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-center">
              <h3 className="font-serif italic text-base font-bold text-neutral-800">Edit Detail Kavling</h3>
              <MapPin className="w-4 h-4 text-[#E65100]" />
            </div>

            {/* Dropdown Selector */}
            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase text-neutral-400 tracking-wider mb-1.5">
                Pilih Material
              </label>
              <select
                value={activeItemId || ""}
                onChange={(e) => setActiveItemId(e.target.value)}
                className="w-full p-2 text-xs border border-[#1A1A1A] bg-white focus:outline-none rounded font-sans"
              >
                <option value="" disabled>-- Pilih Barang --</option>
                {activeReport.items
                  .slice()
                  .sort((a, b) => (a.namaMaterial || "").localeCompare(b.namaMaterial || "", "id", { sensitivity: "base" }))
                  .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.kode} - {item.namaMaterial}
                  </option>
                ))}
              </select>
            </div>

            {selectedItem ? (
              <div className="flex flex-col gap-4 animate-fade-in text-xs">
                {/* Active Info Metadata */}
                <div className="bg-neutral-50 border border-neutral-200 p-3 rounded">
                  <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Bahan Pembantu Aktif</div>
                  <div className="font-serif italic font-black text-sm text-[#1A1A1A] mt-0.5 leading-tight">
                    {selectedItem.namaMaterial}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 mt-1 flex justify-between">
                    <span>Kode: {selectedItem.kode}</span>
                    <span>Kemasan: {selectedItem.packagingDesc}</span>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="flex flex-col gap-3.5">
                  
                  {/* Nama Bahan & Kode Barang */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Nama Bahan Pembantu</label>
                      <input
                        type="text"
                        value={selectedItem.namaMaterial}
                        onChange={(e) => updateItemValue(selectedItem.id, { namaMaterial: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-neutral-800 font-bold"
                        placeholder="Nama Bahan"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Kode Barang</label>
                      <input
                        type="text"
                        value={selectedItem.kode}
                        onChange={(e) => updateItemValue(selectedItem.id, { kode: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-neutral-800 font-mono"
                        placeholder="Kode Barang"
                      />
                    </div>
                  </div>

                  {/* Gudang/Kav & Batch */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Kavling / Gudang</label>
                      <input
                        type="text"
                        value={selectedItem.gudangKav || ""}
                        onChange={(e) => updateItemValue(selectedItem.id, { gudangKav: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-neutral-800"
                        placeholder="e.g. 2002"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">No. Batch / Lot</label>
                      <input
                        type="text"
                        value={selectedItem.batch || ""}
                        onChange={(e) => updateItemValue(selectedItem.id, { batch: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-neutral-800 font-mono text-red-600 font-bold"
                        placeholder="e.g. 260603"
                      />
                    </div>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Suplier (Pabrik Pembuat)</label>
                    <input
                      type="text"
                      value={selectedItem.suplier || ""}
                      onChange={(e) => updateItemValue(selectedItem.id, { suplier: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-neutral-800 font-serif italic"
                      placeholder="e.g. Qilu Pharmaceutical"
                    />
                  </div>

                  {/* Tgl Masuk (Recalculates lot age!) */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                      Tanggal Masuk Gudang <span className="text-emerald-700">(Mempengaruhi Umur Lot)</span>
                    </label>
                    <input
                      type="date"
                      value={selectedItem.tglMasuk || ""}
                      onChange={(e) => updateItemValue(selectedItem.id, { tglMasuk: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none focus:ring-1 focus:ring-neutral-800 font-mono"
                    />
                    <div className="mt-1 text-[10px] text-neutral-400 font-medium italic flex justify-between">
                      <span>Tanggal Laporan: {selectedDate}</span>
                      <span className="text-emerald-700 font-bold">Terhitung: {calculateAge(selectedItem.tglMasuk || "", selectedDate)}</span>
                    </div>
                  </div>

                  {/* MFG & Exp Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Mfg Date (Produksi)</label>
                      <input
                        type="date"
                        value={selectedItem.mfgDate || ""}
                        onChange={(e) => updateItemValue(selectedItem.id, { mfgDate: e.target.value })}
                        className="w-full px-2 py-1 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Exp Date (Kedaluwarsa)</label>
                      <input
                        type="date"
                        value={selectedItem.expDate || ""}
                        onChange={(e) => updateItemValue(selectedItem.id, { expDate: e.target.value })}
                        className="w-full px-2 py-1 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                </div>

                <div className="mt-2 text-neutral-400 text-[10px] leading-tight italic bg-neutral-50 p-2 border border-neutral-200 rounded">
                  ℹ️ Perubahan detail kavling akan langsung disimpan secara real-time ke dalam database internal untuk tanggal laporan aktif.
                </div>

                <div className="border-t border-dashed border-neutral-200 pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      showNotification("Perubahan detail kavling berhasil disimpan!", "success");
                      setActiveItemId(null);
                    }}
                    className="flex-1 py-2 bg-[#1A1A1A] hover:bg-black text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" /> Simpan Perubahan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveItemId(null);
                    }}
                    className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400 italic">
                Pilih barang di tabel sebelah kiri atau dropdown di atas untuk mulai mengedit detail Kavling.
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  const selectedItem = activeReport.items.find(item => item.id === activeItemId) || null;
  const effectiveStockAwalDate = activeReport.stockAwalDate || activeReport.date || selectedDate;

  // AUTH GUARD: Check if checking session or user not logged in
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F2F0ED] flex flex-col items-center justify-center font-sans p-4">
        <div className="bg-white p-8 rounded-lg border-2 border-[#1A1A1A] shadow-xl text-center max-w-sm w-full animate-fade-in">
          <div className="flex justify-center mb-4">
            <JapfaLogo className="h-12" />
          </div>
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="font-serif font-bold text-sm text-neutral-800">Memeriksa Sesi Petugas...</h2>
          <p className="text-[11px] text-neutral-500 mt-1">Sistem Informasi Pergudangan PT. Japfa Comfeed Indonesia Tbk</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans pb-16 flex flex-col">
      
      {/* Toast Notifications */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in print:hidden">
          <div className={`flex items-center gap-3 px-4 py-3 border-2 border-[#1A1A1A] shadow-lg rounded bg-white text-[#1A1A1A] ${
            toast.type === "success" 
              ? "border-emerald-500 bg-emerald-50/95" 
              : toast.type === "error"
                ? "border-rose-500 bg-rose-50/95"
                : "border-[#1A1A1A] bg-white"
          }`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              toast.type === "success" 
                ? "text-emerald-800" 
                : toast.type === "error"
                  ? "text-rose-800"
                  : "text-neutral-800"
            }`}>{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="text-xs font-black ml-2 text-neutral-400 hover:text-black transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for resetting */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-[#FAF9F6] border-2 border-[#1A1A1A] w-full max-w-md shadow-2xl p-6 rounded">
            <h3 className="font-serif italic text-xl font-bold mb-2 text-[#1A1A1A]">Setel Ulang Laporan?</h3>
            <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menyetel ulang seluruh data laporan pada tanggal <span className="font-mono font-bold text-black">{selectedDate}</span> ke contoh bawaan pabrik? Seluruh perubahan saat ini akan diganti dengan data seed awal.
            </p>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button 
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded text-neutral-700"
              >
                Batal
              </button>
              <button 
                onClick={executeResetToSeeded}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded shadow-sm"
              >
                Ya, Setel Ulang
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* HEADER CONTROL DASHBOARD (HIDDEN ON PRINT) */}
      <header className="bg-white border-b border-[#1A1A1A]/10 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* App Brand & Date Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-[#D32F2F]">JAPFA</span>
              <div className="border-l border-neutral-300 pl-3 ml-1.5">
                <h1 className="text-xs font-bold tracking-tight uppercase text-neutral-600 leading-none">Dashboard Gudang</h1>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={handlePrevDay} className="p-1 hover:bg-neutral-100 rounded text-neutral-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="relative flex items-center">
                  <Calendar className="w-3.5 h-3.5 absolute left-2 text-neutral-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-8 pr-2 py-0.5 text-xs font-bold font-mono border border-neutral-300 focus:outline-none focus:border-neutral-800 bg-[#FAF9F6]"
                  />
                </div>
                <button onClick={handleNextDay} className="p-1 hover:bg-neutral-100 rounded text-neutral-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Info & State Indicator */}
          <div className="hidden lg:flex items-center gap-5 border-l border-r border-neutral-200 px-6 py-1">
            <div className="text-center">
              <div className="text-[9px] uppercase font-bold text-neutral-400">Total Material</div>
              <div className="font-serif font-bold text-lg">{activeReport.items.length} Barang</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] uppercase font-bold text-neutral-400">Total Stok Akhir</div>
              <div className="font-mono font-bold text-lg text-emerald-700">
                {totalStkAkhir.toLocaleString("id-ID", { minimumFractionDigits: 2 })} Kg
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] uppercase font-bold text-neutral-400">Peta Kavling</div>
              <div className="text-xs font-bold flex items-center gap-1 mt-0.5 text-neutral-600 bg-[#F2F0ED] px-2 py-0.5 rounded border border-neutral-300">
                <Sparkles className="w-3 h-3 text-amber-600" /> Auto-Umur Active
              </div>
            </div>
          </div>

          {/* Toolbar Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Dedicated Simpan Stock Action */}
            <button
              onClick={handleSaveAllStock}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ring-2 ring-emerald-400/40"
              title="Simpan semua data stock ke database cloud (Pintasan: Ctrl+S)"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Simpan Stock</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-emerald-900/60 text-emerald-200 text-[9px] rounded font-mono font-normal">
                    Ctrl+S
                  </kbd>
                </>
              )}
            </button>

            {lastSavedTime && (
              <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-1 rounded" title="Data tersimpan otomatis di database">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Tersimpan {lastSavedTime}</span>
              </span>
            )}

            {/* Undo & Redo Group */}
            <div className="flex items-center border border-neutral-300 rounded overflow-hidden bg-white shadow-xs">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="px-2.5 py-1.5 hover:bg-neutral-100 disabled:opacity-35 disabled:hover:bg-white text-xs font-bold flex items-center gap-1 border-r border-neutral-200 transition-colors cursor-pointer disabled:cursor-not-allowed text-neutral-800"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 text-neutral-600" />
                <span className="hidden sm:inline">Undo</span>
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="px-2.5 py-1.5 hover:bg-neutral-100 disabled:opacity-35 disabled:hover:bg-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed text-neutral-800"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5 text-neutral-600" />
                <span className="hidden sm:inline">Redo</span>
              </button>
            </div>
            {/* Create Actions */}
            {activeReport.items.length === 0 && (
              <div className="flex items-center gap-1 mr-2 bg-amber-50 border border-amber-200 p-1 rounded">
                <span className="text-[10px] text-amber-800 font-bold px-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Laporan Kosong
                </span>
                <button
                  onClick={handleCopyFromPreviousDay}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-2 py-1 rounded shadow transition-colors"
                  title="Ambil sisa stok kemarin sebagai stok awal hari ini"
                >
                  🚀 Salin Stok Kemarin
                </button>
                <button
                  onClick={handleResetToSeeded}
                  className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-bold px-2 py-1 rounded transition-colors"
                >
                  Load Demo Data
                </button>
              </div>
            )}

            {/* Quick Master Catalog Access */}
            <button
              onClick={handleAddNewCustomItem}
              disabled={!canEditReport}
              className={`px-3 py-1.5 border rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                !canEditReport 
                  ? "opacity-50 cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-400" 
                  : "border-neutral-300 hover:border-[#1A1A1A] hover:bg-[#F2F0ED] cursor-pointer"
              }`}
              title={!canEditReport ? "Hanya akun atas nama Sabto dan Antonius yang dapat menambah barang" : "Tambah material baru langsung ke tabel"}
            >
              <Plus className="w-4 h-4 text-emerald-600" /> Tambah Barang
            </button>

            {/* Config & Settings */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 border border-neutral-300 hover:bg-neutral-100 rounded transition-colors"
              title="Pengaturan Kop Surat & Identitas Laporan"
            >
              <Settings className="w-4 h-4" />
            </button>

             {/* Print & Download Action Group */}
            <div className="flex items-center gap-1.5 border border-neutral-300 bg-neutral-50/50 p-1 rounded-md">
              <button
                onClick={handleDeleteAllItems}
                disabled={!canEditReport}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                  !canEditReport 
                    ? "opacity-50 cursor-not-allowed bg-neutral-300 text-neutral-500" 
                    : "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                }`}
                title={!canEditReport ? "Hanya akun atas nama Sabto dan Antonius yang dapat menghapus data" : "Hapus semua item laporan pada tanggal ini"}
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
              </button>

              <button
                onClick={() => setIsPrintModalOpen(true)}
                disabled={isGeneratingPDF}
                className="px-2.5 py-1 bg-[#1A1A1A] text-white hover:bg-[#333333] disabled:bg-neutral-500 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                title="Cetak Laporan & Pilih Printer"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Proses...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5" /> Cetak PDF
                  </>
                )}
              </button>

              <button
                onClick={handleExportExcel}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                title="Ekspor Laporan ke Spreadsheet Excel (.xls)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>

              <button
                onClick={handleExportCSV}
                className="px-2.5 py-1 border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Ekspor Laporan ke CSV (.csv)"
              >
                <FileDown className="w-3.5 h-3.5 text-neutral-500" /> CSV
              </button>
            </div>

            {/* User Profile Pill & Logout Button in Header */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-neutral-300">
                <div className="hidden sm:flex items-center gap-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 py-1 px-2.5 rounded transition-all">
                  <div className="w-7 h-7 rounded-full bg-red-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[11px] font-bold text-neutral-900 truncate max-w-[130px] leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[9px] font-bold text-red-700 uppercase tracking-tight leading-tight flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>{currentUser.role}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLoginSettingsModalOpen(true)}
                  className="px-2.5 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Buka Pengaturan Sistem Login & Akun Petugas"
                >
                  <Settings className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden lg:inline text-[11px]">Pengaturan Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="px-2.5 py-1.5 border border-red-300 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Keluar dari sesi sistem gudang"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden md:inline text-[11px]">Keluar</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* SUB HEADER WARNING BLOCK (HIDDEN ON PRINT) */}
      <div className="bg-[#F2F0ED] border-b border-[#1A1A1A]/5 py-2 px-4 text-center text-xs text-neutral-600 print:hidden flex justify-center items-center gap-2 flex-wrap">
        <span>💡 <strong>Tips Interaktif:</strong> Klik baris tabel manapun untuk mengedit detail Kavling di panel kanan. Double-klik kolom angka untuk mengedit isi stok secara instan!</span>
        {activeReport.items.length > 0 && (
          <button 
            onClick={handleResetToSeeded} 
            className="text-[10px] text-red-600 underline font-semibold ml-2 hover:text-red-800"
          >
            Reset Laporan Tanggal Ini
          </button>
        )}
      </div>

      {/* ACCESS AUTHORITY BANNER (READ-ONLY FOR GUEST & RESTRICTED EDITORS) */}
      {isGuest ? (
        <div className="bg-amber-500 text-black px-4 py-2.5 text-xs font-bold shadow-xs print:hidden border-b-2 border-amber-600">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-black" />
              <span>
                <strong>AKUN TAMU (HANYA LIHAT):</strong> Anda masuk sebagai akun <u>Tamu</u>. Anda hanya dapat melihat data laporan (Read-Only). 
                Dilarang keras mengedit, menghapus, atau menyimpan data apapun.
              </span>
            </div>
            <span className="bg-black/15 text-black px-2 py-0.5 rounded text-[10px] font-mono shrink-0 uppercase tracking-wider font-extrabold">
              Akses Terbatas
            </span>
          </div>
        </div>
      ) : !canEditReport ? (
        <div className="bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-xs print:hidden border-b-2 border-blue-800">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0 text-amber-300" />
              <span>
                <strong>MODE PEMBACA LAPORAN:</strong> Anda login sebagai <u>{currentUser?.name}</u> ({currentUser?.role}). 
                Sesuai kebijakan, <strong>hanya akun atas nama Sabto dan Antonius</strong> yang dapat mengedit isi data laporan.
              </span>
            </div>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-mono shrink-0 uppercase tracking-wider">
              Lihat Sahaja
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-800 text-white px-4 py-1.5 text-[11px] font-semibold shadow-xs print:hidden border-b border-emerald-900">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
              <span>
                <strong>Wewenang Penuh:</strong> Login sebagai <strong>{currentUser?.name}</strong> ({currentUser?.role}). Anda memiliki wewenang penuh untuk mengedit, menambah, dan menghapus isi data laporan.
              </span>
            </div>
            <span className="bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded text-[9px] font-mono shrink-0 uppercase font-bold tracking-wider">
              Otoritas Aktif
            </span>
          </div>
        </div>
      )}

      {/* ==========================================
          MAIN LAYOUT CONTAINER
          ========================================== */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6 print:p-0 print:gap-0 print:max-w-none">
        
        {/* SIDEBAR MAIN NAVIGATION (HIDDEN ON PRINT) */}
        <aside className="w-full xl:w-56 shrink-0 print:hidden flex flex-col gap-4 font-sans">
          
          {/* PETUGAS AKTIF CARD IN SIDEBAR */}
          {currentUser && (
            <div className="bg-white border-2 border-[#1A1A1A] p-3 shadow-xs rounded">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 mb-2">
                <span className="text-[9px] font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded uppercase font-extrabold border border-red-200">
                  PETUGAS AKTIF
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">
                  {currentUser.shift || "Shift 1"}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-700 text-white font-black text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-900 truncate leading-tight">{currentUser.name}</p>
                  <span className="text-[10px] font-semibold text-red-700 block leading-tight mt-0.5">{currentUser.role}</span>
                  {currentUser.nik && (
                    <span className="text-[9px] font-mono text-neutral-400 block leading-tight">{currentUser.nik}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION MENU CARD */}
          <div className="bg-white border-2 border-[#1A1A1A] p-4 shadow-sm rounded">
            <div className="border-b-2 border-black pb-2 mb-3">
              <span className="text-[10px] font-mono bg-[#1A1A1A] text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                MENU UTAMA
              </span>
              <h2 className="font-serif italic text-base font-bold mt-1 text-neutral-800">Navigasi Gudang</h2>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* BUTTON 1: DASHBOARD */}
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`w-full text-left p-2.5 rounded border transition-all flex items-start gap-3 ${
                  activeTab === "dashboard"
                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow"
                    : "bg-white hover:bg-neutral-50 text-neutral-700 hover:text-black border-neutral-200"
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === "dashboard" ? "text-[#FFB300]" : "text-neutral-500"}`} />
                <div>
                  <div className="text-xs font-bold leading-tight uppercase">1. Dashboard</div>
                  <div className={`text-[9px] leading-none mt-0.5 ${activeTab === "dashboard" ? "text-neutral-300" : "text-neutral-400"}`}>
                    Ringkasan & Analisis
                  </div>
                </div>
              </button>

              {/* BUTTON 2: STOK FEED ADD */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("stock");
                    if (!isStockFeedAddActive) {
                      setFeedAddSubTab("table");
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded border transition-all flex items-start gap-3 cursor-pointer ${
                    isStockFeedAddActive
                      ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow"
                      : "bg-white hover:bg-neutral-50 text-neutral-700 hover:text-black border-neutral-200"
                  }`}
                >
                  <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isStockFeedAddActive ? "text-[#FFB300]" : "text-neutral-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold leading-tight uppercase flex items-center justify-between">
                      <span>2. STOK FEED ADD</span>
                      {isStockFeedAddActive && (
                        <span className="text-[8px] font-mono bg-amber-400 text-black px-1 py-0.2 rounded font-black tracking-tight shrink-0">
                          AKTIF
                        </span>
                      )}
                    </div>
                    <div className={`text-[9px] leading-none mt-0.5 ${isStockFeedAddActive ? "text-neutral-300" : "text-neutral-400"}`}>
                      Stok, Masuk, Keluar & Kavling
                    </div>
                  </div>
                </button>

                {/* NESTED SUB-MENU: BARANG MASUK, BARANG KELUAR, EDIT KAVLING */}
                {isStockFeedAddActive && (
                  <div className="ml-3 pl-2.5 border-l-2 border-[#1A1A1A] mt-1.5 flex flex-col gap-1 py-1 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("stock");
                        setFeedAddSubTab("table");
                      }}
                      className={`text-left px-2 py-1.5 rounded text-[11px] font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        effectiveFeedAddSubTab === "table"
                          ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold shadow-2xs"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Tabel Stok Feed Add</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("stock");
                        setFeedAddSubTab("masuk");
                      }}
                      className={`text-left px-2 py-1.5 rounded text-[11px] font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        effectiveFeedAddSubTab === "masuk"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold shadow-2xs"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Barang Masuk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("stock");
                        setFeedAddSubTab("keluar");
                      }}
                      className={`text-left px-2 py-1.5 rounded text-[11px] font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        effectiveFeedAddSubTab === "keluar"
                          ? "bg-rose-100 text-rose-900 border border-rose-300 font-extrabold shadow-2xs"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                      <span>Barang Keluar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("stock");
                        setFeedAddSubTab("kavling");
                      }}
                      className={`text-left px-2 py-1.5 rounded text-[11px] font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        effectiveFeedAddSubTab === "kavling"
                          ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold shadow-2xs"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Edit Kavling</span>
                    </button>
                  </div>
                )}
              </div>

              {/* BUTTON 3: STOCK KARUNG */}
              <button
                type="button"
                onClick={() => setActiveTab("stock-karung")}
                className={`w-full text-left p-2.5 rounded border transition-all flex items-start gap-3 cursor-pointer ${
                  activeTab === "stock-karung"
                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow"
                    : "bg-white hover:bg-neutral-50 text-neutral-700 hover:text-black border-neutral-200"
                }`}
              >
                <Layers className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === "stock-karung" ? "text-amber-400 font-bold" : "text-amber-600"}`} />
                <div>
                  <div className="text-xs font-bold leading-tight uppercase">3. Stock Karung</div>
                  <div className={`text-[9px] leading-none mt-0.5 ${activeTab === "stock-karung" ? "text-amber-200" : "text-neutral-400"}`}>
                    Persediaan Karung & Sacks
                  </div>
                </div>
              </button>

              {/* BUTTON 4: STOCK LABEL */}
              <button
                type="button"
                onClick={() => setActiveTab("stock-label")}
                className={`w-full text-left p-2.5 rounded border transition-all flex items-start gap-3 cursor-pointer ${
                  activeTab === "stock-label"
                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow"
                    : "bg-white hover:bg-neutral-50 text-neutral-700 hover:text-black border-neutral-200"
                }`}
              >
                <Tag className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === "stock-label" ? "text-blue-400 font-bold" : "text-blue-600"}`} />
                <div>
                  <div className="text-xs font-bold leading-tight uppercase">4. Stock Label</div>
                  <div className={`text-[9px] leading-none mt-0.5 ${activeTab === "stock-label" ? "text-blue-200" : "text-neutral-400"}`}>
                    Persediaan Label Kemasan
                  </div>
                </div>
              </button>

              {/* BUTTON 5: PENGATURAN LOGIN */}
              <button
                type="button"
                onClick={() => setIsLoginSettingsModalOpen(true)}
                className="w-full text-left p-2.5 rounded border transition-all flex items-start gap-3 cursor-pointer bg-neutral-50 hover:bg-neutral-100 text-neutral-700 hover:text-black border-neutral-300 mt-2 shadow-2xs"
                title="Buka Pengaturan Sistem Login & Akun Petugas"
              >
                <Settings className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <div>
                  <div className="text-xs font-bold leading-tight uppercase flex items-center gap-1.5">
                    <span>Pengaturan Login</span>
                  </div>
                  <div className="text-[9px] leading-none mt-0.5 text-neutral-500">
                    Akun Petugas & Keamanan
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* QUICK SUMMARY MINI-WIDGET IN SIDEBAR */}
          <div className="hidden xl:block bg-neutral-50 border border-neutral-300 p-3.5 rounded">
            <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">RINGKASAN TANGGAL</span>
            <div className="text-xs font-bold font-serif text-neutral-800 italic underline decoration-1 mb-2">
              {getFormattedDate(selectedDate)}
            </div>
            <div className="h-[1px] bg-neutral-200 my-2"></div>
            <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono mb-1">
              <span>Total Item:</span>
              <span className="font-bold text-neutral-800">{activeReport.items.length}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono">
              <span>Stok Akhir:</span>
              <span className="font-bold text-emerald-700">{totalStkAkhir.toLocaleString("id-ID")} Kg</span>
            </div>
          </div>
        </aside>

        {/* CONTROLLER SWITCH PAGE FOR OTHER TABS */}
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "stock-karung" && (
          <StockKarungView
            report={getActiveKarungReport()}
            selectedDate={selectedDate}
            onUpdateReport={handleUpdateKarungReport}
            showNotification={showNotification}
            onDateChange={(newDate) => setSelectedDate(newDate)}
            onSyncFromPreviousDay={handleSyncKarungFromPreviousDay}
            previousReportDate={getPreviousKarungReportDate(selectedDate)}
            onSaveStock={handleSaveAllStock}
            canEditReport={canEditReport}
            isGuest={isGuest}
          />
        )}
        {activeTab === "stock-label" && (
          <StockLabelView
            report={getActiveLabelReport()}
            selectedDate={selectedDate}
            onUpdateReport={handleUpdateLabelReport}
            showNotification={showNotification}
            onDateChange={(newDate) => setSelectedDate(newDate)}
            onSyncFromPreviousDay={handleSyncLabelFromPreviousDay}
            previousReportDate={getPreviousLabelReportDate(selectedDate)}
            onSaveStock={handleSaveAllStock}
            canEditReport={canEditReport}
            isGuest={isGuest}
          />
        )}
        {activeTab === "laporan-resmi" && (
          <OfficialLaporanPembungkusView
            report={getActiveKarungReport()}
            selectedDate={selectedDate}
            onUpdateReport={handleUpdateKarungReport}
            showNotification={showNotification}
            canEditReport={canEditReport}
            isGuest={isGuest}
          />
        )}
        {/* ============================================================== */}
        {/* MODUL STOK FEED ADD (TABEL STOK, BARANG MASUK, BARANG KELUAR, EDIT KAVLING) */}
        {/* ============================================================== */}
        {isStockFeedAddActive && (
          <div className="flex-grow flex flex-col w-full print:w-full">
            
            {/* SUB-NAVIGATION HEADER BAR (PRINT: HIDDEN) */}
            <div className="bg-white border-2 border-[#1A1A1A] p-3 rounded shadow-xs mb-4 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-[#1A1A1A] text-amber-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    STOK FEED ADD
                  </span>
                  <h2 className="font-serif italic text-base font-bold text-neutral-800">
                    Sistem Manajemen Bahan Pembantu & Premix
                  </h2>
                </div>
                <div className="text-[11px] font-mono text-neutral-500">
                  Gudang / S.Loct: <span className="font-bold text-neutral-900">{activeReport.gudangSLoct || "2001 - 2002"}</span>
                </div>
              </div>

              {/* 4 SUB-TABS */}
              <div className="flex flex-wrap gap-2 pt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("stock");
                    setFeedAddSubTab("table");
                  }}
                  className={`px-3.5 py-2 text-xs font-bold transition-all rounded flex items-center gap-2 cursor-pointer ${
                    effectiveFeedAddSubTab === "table"
                      ? "bg-[#1A1A1A] text-white shadow font-black border border-[#1A1A1A]"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200"
                  }`}
                >
                  <FileText className={`w-4 h-4 ${effectiveFeedAddSubTab === "table" ? "text-amber-400" : "text-neutral-500"}`} />
                  <span>Tabel Stok Feed Add</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("stock");
                    setFeedAddSubTab("masuk");
                  }}
                  className={`px-3.5 py-2 text-xs font-bold transition-all rounded flex items-center gap-2 cursor-pointer ${
                    effectiveFeedAddSubTab === "masuk"
                      ? "bg-emerald-700 text-white shadow font-black border border-emerald-800"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>Barang Masuk (Inbound)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("stock");
                    setFeedAddSubTab("keluar");
                  }}
                  className={`px-3.5 py-2 text-xs font-bold transition-all rounded flex items-center gap-2 cursor-pointer ${
                    effectiveFeedAddSubTab === "keluar"
                      ? "bg-rose-700 text-white shadow font-black border border-rose-800"
                      : "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <span>Barang Keluar (Outbound)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("stock");
                    setFeedAddSubTab("kavling");
                  }}
                  className={`px-3.5 py-2 text-xs font-bold transition-all rounded flex items-center gap-2 cursor-pointer ${
                    effectiveFeedAddSubTab === "kavling"
                      ? "bg-amber-700 text-white shadow font-black border border-amber-800"
                      : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Edit Kavling & Lot</span>
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: BARANG MASUK */}
            {effectiveFeedAddSubTab === "masuk" && renderBarangMasuk()}

            {/* SUB-VIEW 2: BARANG KELUAR */}
            {effectiveFeedAddSubTab === "keluar" && renderBarangKeluar()}

            {/* SUB-VIEW 3: EDIT KAVLING */}
            {effectiveFeedAddSubTab === "kavling" && renderKavling()}

            {/* SUB-VIEW 4: TABEL BUKU BESAR / REPORT CANVAS */}
            <div className={`flex-grow flex-col items-center w-full print:max-w-none print:w-full ${
              effectiveFeedAddSubTab === "table" ? "flex" : "hidden print:flex"
            }`}>
          
          <div 
            id="report-paper-canvas"
            className="bg-[#F2F0ED] text-[#1A1A1A] w-full max-w-[1024px] min-h-[720px] flex flex-col p-6 md:p-10 border border-[#1A1A1A] shadow-lg print:shadow-none print:border-none print:p-0 bg-paper-texture"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            
            {/* PAPER HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start border-b border-[#1A1A1A] pb-4 mb-6">
              
              {/* Brand Logo & Unit Info */}
              <div className="flex flex-col mb-4 md:mb-0">
                <span className="text-xl font-black tracking-wider text-[#D32F2F] leading-none">JAPFA</span>
                <div className="text-[8px] font-sans uppercase font-bold tracking-tight text-neutral-500 max-w-[200px] leading-tight mt-1">
                  {activeReport.companyName || "PT. Japfa Comfeed Indonesia.Tbk – UNIT LPG"}
                </div>
              </div>

              {/* Title & Document Code */}
              <div className="flex flex-col md:items-center text-left md:text-center flex-1 px-4">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-neutral-500 mb-1">Stock Ledger Ledger</span>
                <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight leading-none mb-1 text-[#1A1A1A]">
                  LAPORAN INFO KAVLING HARIAN & STOCK BAHAN PEMBANTU
                </h2>
                <div className="text-xs font-sans tracking-widest text-neutral-600 font-bold uppercase">
                  {activeReport.gudangSLoct ? `GUDANG / S. LOCT : ${activeReport.gudangSLoct}` : "GUDANG / S. LOCT : 2001 - 2002"}
                </div>
              </div>

              {/* Document ID Tag */}
              <div className="flex flex-col items-end text-right">
                <span className="text-[9px] font-sans uppercase text-neutral-400 font-bold">Document Code</span>
                <span className="font-mono text-xs font-bold bg-white/50 px-2 py-0.5 border border-[#1A1A1A]/10 rounded">
                  {activeReport.docCode || "PLT – WRH – FM – 02 – 03"}
                </span>
                <div className="mt-2 text-[9px] font-sans text-neutral-400">Ver 1.4</div>
              </div>

            </header>

            {/* DATE SUBHEADER ROW */}
            <div className="flex justify-between items-baseline border-b-2 border-black pb-2 mb-6 font-sans">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold uppercase tracking-wider text-neutral-500">Hari / Tanggal :</span>
                <span className="text-base font-bold font-serif italic text-neutral-800 underline decoration-double">
                  {getFormattedDate(selectedDate)}
                </span>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handleSaveAllStock}
                  disabled={isSaving}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-70"
                  title="Simpan data stock ke database (Ctrl+S)"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Stock</span>
                </button>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Kode, Material, Kavling, Batch..."
                    className="pl-8 pr-7 py-1 text-xs border border-neutral-300 focus:outline-none focus:border-[#1A1A1A] bg-white rounded shadow-xs w-64 font-sans"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 text-neutral-400 hover:text-black text-xs font-bold"
                      title="Bersihkan Pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="hidden print:block text-xs font-mono text-neutral-500">
                {searchQuery ? `Hasil Pencarian: "${searchQuery}"` : "Kolom Pencarian Aktif"}
              </div>
            </div>

            {/* TABLE CONTAINER */}
            <div className="flex-grow overflow-x-auto">
              
              {/* STOCK TABLE TITLE */}
              <div className="flex justify-between items-center bg-[#1A1A1A] text-white py-1.5 px-3 mb-2 font-sans rounded-t">
                <span className="text-xs font-black uppercase tracking-widest">STOCK FEED ADD (BAHAN PEMBANTU)</span>
                <span className="text-[10px] font-mono text-neutral-300">Unit: Colly & Tonase (Kg)</span>
              </div>

              <table id="stock-material-table" className="w-full text-left border-collapse border border-[#1A1A1A] bg-white font-sans text-xs">
                
                {/* Column Headers */}
                <thead>
                  <tr className="bg-neutral-100 border-b-2 border-[#1A1A1A] font-bold text-center">
                    <th colSpan={6} className="border-r border-[#1A1A1A] p-2 text-xs uppercase bg-neutral-100/80">
                      STOCK FEED ADD
                    </th>
                    <th colSpan={1} className="border-r border-[#1A1A1A] p-2 text-xs uppercase bg-neutral-50">
                      INFO KAVLING FEED ADD
                    </th>
                    <th rowSpan={2} className="border-r border-[#1A1A1A] p-2 text-xs uppercase text-center w-24">
                      TOTAL
                    </th>
                    <th rowSpan={2} className="border-r border-[#1A1A1A] p-2 text-xs uppercase text-left">
                      Keterangan
                    </th>
                    <th rowSpan={2} className="border-r border-[#1A1A1A] p-2 text-xs uppercase text-center w-12">
                      Cek
                    </th>
                    <th rowSpan={2} className="p-2 text-center w-12 print:hidden">Aksi</th>
                  </tr>
                  <tr className="bg-neutral-50 border-b border-[#1A1A1A] text-[10px] text-center font-bold">
                    <th className="border-r border-[#1A1A1A] p-1.5 w-24">Kode</th>
                    <th className="border-r border-[#1A1A1A] p-1.5 text-left">Nama Material</th>
                    <th className="border-r border-[#1A1A1A] p-1 text-right bg-amber-50/20">
                      <div className="flex flex-col items-end">
                        <span>Stock Awal</span>
                        <div className="mt-0.5 inline-flex items-center gap-1">
                          <input
                            type="date"
                            value={effectiveStockAwalDate}
                            onChange={(e) => {
                              if (e.target.value) {
                                updateActiveReport({ stockAwalDate: e.target.value });
                                showNotification(`Tanggal transaksi Stock Awal diubah menjadi ${formatToShortDate(e.target.value)}`, "success");
                              }
                            }}
                            className="text-[9px] font-mono font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 rounded px-1 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 print:hidden text-center"
                            title="Klik untuk mengubah tanggal transaksi Stock Awal"
                          />
                          <span className="hidden print:inline text-[9px] font-mono font-normal text-neutral-600">
                            {formatToShortDate(effectiveStockAwalDate)}
                          </span>
                        </div>
                      </div>
                    </th>
                    <th className="border-r border-[#1A1A1A] p-1 text-right bg-emerald-50/20">
                      <div>Masuk</div>
                      <span className="text-[9px] font-mono font-normal text-neutral-500 block mt-0.5">
                        {formatToShortDate(effectiveStockAwalDate)}
                      </span>
                    </th>
                    <th className="border-r border-[#1A1A1A] p-1 text-right bg-rose-50/20">
                      <div>Keluar</div>
                      <span className="text-[9px] font-mono font-normal text-neutral-500 block mt-0.5">
                        {formatToShortDate(effectiveStockAwalDate)}
                      </span>
                    </th>
                    <th className="border-r border-[#1A1A1A] p-1 text-right bg-blue-50/20">
                      <div>Stock Akhir</div>
                      <span className="text-[9px] font-mono font-normal text-neutral-500 block mt-0.5">
                        {formatToShortDate(effectiveStockAwalDate)}
                      </span>
                    </th>
                    <th className="border-r border-[#1A1A1A] p-1.5 text-left font-serif italic text-neutral-600 bg-neutral-50/50">
                      Detail Kavling & Mutasi
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {activeReport.items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-neutral-400 font-serif italic bg-neutral-50">
                        Tidak ada data bahan pembantu untuk tanggal ini. Klik "Tambah Barang" di panel kanan atau gunakan Master Katalog.
                      </td>
                    </tr>
                  ) : (() => {
                    // Filter items based on searchQuery
                    const filteredItems = activeReport.items.filter((item) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase().trim();
                      return (
                        (item.kode && item.kode.toLowerCase().includes(q)) ||
                        (item.namaMaterial && item.namaMaterial.toLowerCase().includes(q)) ||
                        (item.gudangKav && item.gudangKav.toLowerCase().includes(q)) ||
                        (item.suplier && item.suplier.toLowerCase().includes(q)) ||
                        (item.batch && item.batch.toLowerCase().includes(q)) ||
                        (item.keterangan && item.keterangan.toLowerCase().includes(q))
                      );
                    });

                    if (filteredItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-neutral-400 font-serif italic bg-neutral-50">
                            Tidak ditemukan bahan pembantu yang sesuai dengan pencarian "{searchQuery}".
                            <button
                              onClick={() => setSearchQuery("")}
                              className="ml-2 text-xs font-bold text-amber-700 underline cursor-pointer"
                            >
                              Reset Pencarian
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    // Group items by kode (fallback to namaMaterial)
                    const grouped: { [key: string]: StockItem[] } = {};
                    const orderKeys: string[] = [];

                    filteredItems.forEach((item) => {
                      const key = item.kode ? item.kode.trim() : item.namaMaterial.trim();
                      if (!grouped[key]) {
                        grouped[key] = [];
                        orderKeys.push(key);
                      }
                      grouped[key].push(item);
                    });

                    // Sort material groups alphabetically ascending by namaMaterial
                    orderKeys.sort((a, b) => {
                      const nameA = grouped[a][0]?.namaMaterial || "";
                      const nameB = grouped[b][0]?.namaMaterial || "";
                      return nameA.localeCompare(nameB, "id", { sensitivity: "base" });
                    });

                    return orderKeys.map((groupKey) => {
                      const itemsInGroup = grouped[groupKey];
                      const firstItem = itemsInGroup[0];
                      const isAnyItemActive = itemsInGroup.some(item => item.id === activeItemId);
                      const calculatedAkhirSum = itemsInGroup.reduce((sum, item) => sum + ((item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0)), 0);
                      const calculatedAkhirCollySum = itemsInGroup.reduce((sum, item) => sum + ((item.stockAwalColly || 0) + (item.masukColly || 0) - (item.keluarColly || 0)), 0);
                      const calculatedAwalSum = itemsInGroup.reduce((sum, item) => sum + (item.stockAwal || 0), 0);
                      const calculatedAwalCollySum = itemsInGroup.reduce((sum, item) => sum + (item.stockAwalColly || 0), 0);
                      const calculatedMasukSum = itemsInGroup.reduce((sum, item) => sum + (item.masuk || 0), 0);
                      const calculatedMasukCollySum = itemsInGroup.reduce((sum, item) => sum + (item.masukColly || 0), 0);
                      const calculatedKeluarSum = itemsInGroup.reduce((sum, item) => sum + (item.keluar || 0), 0);
                      const calculatedKeluarCollySum = itemsInGroup.reduce((sum, item) => sum + (item.keluarColly || 0), 0);
                      const isGroupChecked = itemsInGroup.every(item => item.checked);

                      // Calculate Total from Kavling Lots (sum of tonase or stock akhir)
                      const calculatedTotalSum = itemsInGroup.reduce((sum, item) => {
                        const lotTonase = item.tonase !== undefined ? item.tonase : ((item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0));
                        return sum + lotTonase;
                      }, 0);

                      // Cek = Pengurangan Stock Akhir dikurang Total
                      const selisihPengurangan = calculatedAkhirSum - calculatedTotalSum;

                      const allReductions = itemsInGroup.flatMap(item => item.reductions || []);
                      const totalReductionQty = allReductions.reduce((sum, r) => sum + r.qtyKg, 0);

                      const isEditingKode = editingCell && editingCell.field === "kode" && itemsInGroup.some(item => item.id === editingCell.itemId);
                      const isEditingNama = editingCell && editingCell.field === "namaMaterial" && itemsInGroup.some(item => item.id === editingCell.itemId);

                      return (
                        <tr 
                          key={groupKey}
                          onClick={() => {
                            // Default to selecting the first item of the group
                            if (!isAnyItemActive) {
                              setActiveItemId(firstItem.id);
                            }
                          }}
                          className={`group border-b border-[#1A1A1A] transition-colors ${
                            isAnyItemActive 
                              ? "bg-[#FAF8F5] text-black border-l-4 border-amber-500" 
                              : "hover:bg-neutral-50/40 bg-white"
                          }`}
                        >
                          {/* Kode */}
                          <td className="border-r border-[#1A1A1A] p-2 font-mono text-center font-bold text-red-600 align-middle">
                            {isEditingKode ? (
                              <input
                                type="text"
                                value={firstItem.kode}
                                onChange={(e) => {
                                  const newKode = e.target.value;
                                  itemsInGroup.forEach(item => {
                                    updateItemValue(item.id, { kode: newKode });
                                  });
                                }}
                                onBlur={() => setEditingCell(null)}
                                className="w-full text-center bg-white text-black text-xs p-0.5 border border-black font-mono focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span 
                                onDoubleClick={() => {
                                  if (!canEditReport) {
                                    showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
                                    return;
                                  }
                                  setEditingCell({ itemId: firstItem.id, field: "kode" });
                                }} 
                                className={canEditReport ? "cursor-pointer hover:underline" : "cursor-default"}
                              >
                                {firstItem.kode || "-"}
                              </span>
                            )}
                          </td>

                          {/* Nama Material */}
                          <td className="border-r border-[#1A1A1A] p-2 font-sans font-bold text-emerald-700 align-middle">
                            {isEditingNama ? (
                              <input
                                type="text"
                                value={firstItem.namaMaterial}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  itemsInGroup.forEach(item => {
                                    updateItemValue(item.id, { namaMaterial: newName });
                                  });
                                }}
                                onBlur={() => setEditingCell(null)}
                                className="w-full bg-white text-black text-xs p-0.5 border border-black focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <div className="flex flex-col leading-tight">
                                <span 
                                  onDoubleClick={() => {
                                    if (!canEditReport) {
                                      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
                                      return;
                                    }
                                    setEditingCell({ itemId: firstItem.id, field: "namaMaterial" });
                                  }}
                                  className={`font-serif italic font-bold text-xs ${canEditReport ? "cursor-pointer hover:underline" : "cursor-default"}`}
                                >
                                  {firstItem.namaMaterial || "Tulis Nama..."}
                                </span>
                                {totalReductionQty > 0 && (
                                  <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-black px-1.5 py-0.5 rounded border mt-1 self-start leading-none print:bg-white print:text-black">
                                    📉 RETUR / KOREKSI KELUAR (-{totalReductionQty.toLocaleString("id-ID")} Kg)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Stock Awal */}
                          <td className="border-r border-[#1A1A1A] p-2 text-right font-mono align-middle">
                            <div className="flex flex-col leading-tight">
                              <span className="font-bold text-neutral-800">
                                {calculatedAwalSum.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                {calculatedAwalCollySum.toLocaleString("id-ID")} coly
                              </span>
                            </div>
                          </td>

                          {/* Masuk */}
                          <td className="border-r border-[#1A1A1A] p-2 text-right font-mono bg-emerald-50/10 align-middle">
                            <div className="flex flex-col leading-tight">
                              <span className="font-bold text-emerald-700">
                                {calculatedMasukSum.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-semibold">
                                {calculatedMasukCollySum.toLocaleString("id-ID")} coly
                              </span>
                            </div>
                          </td>

                          {/* Keluar */}
                          <td className="border-r border-[#1A1A1A] p-2 text-right font-mono bg-rose-50/10 align-middle">
                            <div className="flex flex-col leading-tight">
                              <span className="font-bold text-rose-600">
                                {calculatedKeluarSum.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-rose-500">
                                {calculatedKeluarCollySum.toLocaleString("id-ID")} coly
                              </span>
                            </div>
                          </td>

                          {/* Stock Akhir */}
                          <td className="border-r border-[#1A1A1A] p-2 text-right font-mono bg-blue-50/10 align-middle">
                            <div className="flex flex-col leading-tight">
                              <span className="font-bold text-blue-600">
                                {calculatedAkhirSum.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[9px] text-neutral-500 font-normal">
                                {firstItem.packagingDesc || `@ ${firstItem.beratPerColly ?? 25} Kg`}
                              </span>
                              <span className="text-[10px] text-blue-500 font-bold mt-1.5">
                                {calculatedAkhirCollySum.toLocaleString("id-ID")} Colly
                              </span>
                            </div>
                          </td>

                          {/* Detail Kavling & Mutasi */}
                          <td className="border-r border-[#1A1A1A] p-0.5 bg-neutral-50/30 text-left align-middle">
                            {(() => {
                              const isSingleTglMasuk = new Set(itemsInGroup.map(subItem => subItem.tglMasuk).filter(Boolean)).size <= 1;
                              const alignClass = isSingleTglMasuk ? "text-left pl-2" : "text-center px-1.5";

                              return (
                                <table className="w-full text-[10px] border-collapse border border-neutral-300">
                                  <tbody>
                                    <tr className="border-b border-neutral-300">
                                      <td className="font-bold text-neutral-500 bg-neutral-50 px-1 py-0.5 border-r border-neutral-300 w-20">Gudang/Kav</td>
                                      {itemsInGroup.map(subItem => (
                                        <td 
                                          key={subItem.id} 
                                          onClick={(e) => { e.stopPropagation(); setActiveItemId(subItem.id); }}
                                          className={`font-bold font-mono py-0.5 border-r border-neutral-300 last:border-r-0 cursor-pointer hover:bg-amber-100/50 transition-colors ${alignClass} ${subItem.id === activeItemId ? "bg-amber-100 text-amber-800" : "text-purple-700 bg-white"}`}
                                        >
                                          {subItem.gudangKav || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr className="border-b border-neutral-300">
                                      <td className="font-bold text-neutral-500 bg-neutral-50 px-1 py-0.5 border-r border-neutral-300 w-20">Suplyer</td>
                                      {itemsInGroup.map(subItem => (
                                        <td 
                                          key={subItem.id} 
                                          onClick={(e) => { e.stopPropagation(); setActiveItemId(subItem.id); }}
                                          className={`font-serif italic font-bold py-0.5 border-r border-neutral-300 last:border-r-0 cursor-pointer hover:bg-amber-100/50 transition-colors truncate max-w-[120px] ${alignClass} ${subItem.id === activeItemId ? "bg-amber-100 text-amber-800" : "text-purple-700 bg-white"}`}
                                          title={subItem.suplier}
                                        >
                                          {subItem.suplier || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr className="border-b border-neutral-300">
                                      <td className="font-bold text-neutral-500 bg-neutral-50 px-1 py-0.5 border-r border-neutral-300 w-20">Tonase</td>
                                      {itemsInGroup.map(subItem => {
                                        const subAkhir = (subItem.stockAwal || 0) + (subItem.masuk || 0) - (subItem.keluar || 0);
                                        return (
                                          <td 
                                            key={subItem.id} 
                                            onClick={(e) => { e.stopPropagation(); setActiveItemId(subItem.id); }}
                                            className={`font-bold font-mono py-0.5 border-r border-neutral-300 last:border-r-0 cursor-pointer hover:bg-amber-100/50 transition-colors ${alignClass} ${subItem.id === activeItemId ? "bg-amber-100 text-amber-800" : "text-blue-600 bg-white"}`}
                                          >
                                            {subAkhir.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                    <tr className="border-b border-neutral-300">
                                      <td className="font-bold text-neutral-500 bg-neutral-50 px-1 py-0.5 border-r border-neutral-300 w-20">Colly</td>
                                      {itemsInGroup.map(subItem => {
                                        const subAkhirColly = (subItem.stockAwalColly || 0) + (subItem.masukColly || 0) - (subItem.keluarColly || 0);
                                        return (
                                          <td 
                                            key={subItem.id} 
                                            onClick={(e) => { e.stopPropagation(); setActiveItemId(subItem.id); }}
                                            className={`font-bold font-mono py-0.5 border-r border-neutral-300 last:border-r-0 cursor-pointer hover:bg-amber-100/50 transition-colors ${alignClass} ${subItem.id === activeItemId ? "bg-amber-100 text-amber-800" : "text-blue-600 bg-white"}`}
                                          >
                                            {subAkhirColly.toLocaleString("id-ID")}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                    <tr className="border-b border-neutral-300">
                                      <td className="font-bold text-neutral-500 bg-neutral-50 px-1 py-0.5 border-r border-neutral-300 w-20">Tgl masuk</td>
                                      {itemsInGroup.map(subItem => (
                                        <td 
                                          key={subItem.id} 
                                          onClick={(e) => { e.stopPropagation(); setActiveItemId(subItem.id); }}
                                          className={`font-bold font-mono py-0.5 border-r border-neutral-300 last:border-r-0 cursor-pointer hover:bg-amber-100/50 transition-colors ${alignClass} ${subItem.id === activeItemId ? "bg-amber-100 text-amber-800" : "text-blue-600 bg-white"}`}
                                        >
                                          {subItem.tglMasuk ? formatToShortDate(subItem.tglMasuk) : "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr className="border-b border-neutral-300">
                                      <td className="font-bold text-neutral-500 bg-neutral-50 px-1 py-0.5 border-r border-neutral-300 w-20">Batch</td>
                                      {itemsInGroup.map(subItem => (
                                        <td 
                                          key={subItem.id} 
                                          onClick={(e) => { e.stopPropagation(); setActiveItemId(subItem.id); }}
                                          className={`font-bold font-mono py-0.5 border-r border-neutral-300 last:border-r-0 cursor-pointer hover:bg-amber-100/50 transition-colors ${alignClass} ${subItem.id === activeItemId ? "bg-amber-100 text-amber-800" : "text-red-600 bg-white"}`}
                                        >
                                          {subItem.batch || "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr className="border-b border-neutral-300">
                                      <td className="font-bold text-neutral-500 bg-neutral-50 px-1 py-0.5 border-r border-neutral-300 w-20">Umur</td>
                                      {itemsInGroup.map(subItem => (
                                        <td 
                                          key={subItem.id} 
                                          onClick={(e) => { e.stopPropagation(); setActiveItemId(subItem.id); }}
                                          className={`font-bold py-0.5 border-r border-neutral-300 last:border-r-0 cursor-pointer hover:bg-amber-100/50 transition-colors whitespace-nowrap ${alignClass} ${subItem.id === activeItemId ? "bg-amber-100 text-amber-800" : "text-blue-600 bg-white"}`}
                                        >
                                          {calculateAge(subItem.tglMasuk, selectedDate)}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr className="border-b border-neutral-300">
                                      <td className="font-bold text-neutral-500 bg-neutral-50 px-1 py-0.5 border-r border-neutral-300 w-20">MFG</td>
                                      {itemsInGroup.map(subItem => (
                                        <td 
                                          key={subItem.id} 
                                          onClick={(e) => { e.stopPropagation(); setActiveItemId(subItem.id); }}
                                          className={`font-bold font-mono py-0.5 border-r border-neutral-300 last:border-r-0 cursor-pointer hover:bg-amber-100/50 transition-colors ${alignClass} ${subItem.id === activeItemId ? "bg-amber-100 text-amber-800" : "text-blue-600 bg-white"}`}
                                        >
                                          {subItem.mfgDate ? formatToShortDate(subItem.mfgDate) : "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr className="border-b border-neutral-300 last:border-b-0">
                                      <td className="font-bold text-neutral-500 bg-neutral-50 px-1 py-0.5 border-r border-neutral-300 w-20">Exp. Date</td>
                                      {itemsInGroup.map(subItem => (
                                        <td 
                                          key={subItem.id} 
                                          onClick={(e) => { e.stopPropagation(); setActiveItemId(subItem.id); }}
                                          className={`font-bold font-mono py-0.5 border-r border-neutral-300 last:border-r-0 cursor-pointer hover:bg-amber-100/50 transition-colors ${alignClass} ${subItem.id === activeItemId ? "bg-amber-100 text-amber-800" : "text-blue-600 bg-white"}`}
                                        >
                                          {subItem.expDate ? formatToShortDate(subItem.expDate) : "-"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr className="print:hidden bg-neutral-50">
                                      <td className="font-bold text-neutral-500 px-1 py-1 border-r border-neutral-300 w-20">Aksi Lot</td>
                                  {itemsInGroup.map(subItem => (
                                    <td 
                                      key={subItem.id} 
                                      className={`text-center px-1 py-1 border-r border-neutral-300 last:border-r-0 ${subItem.id === activeItemId ? "bg-amber-50" : "bg-neutral-50/50"}`}
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!canEditReport) {
                                              showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
                                              return;
                                            }
                                            setEditingLotItem(subItem);
                                          }}
                                          disabled={!canEditReport}
                                          className={`p-1 rounded transition-colors inline-block ${
                                            !canEditReport 
                                              ? "opacity-30 cursor-not-allowed text-neutral-300" 
                                              : "text-neutral-500 hover:text-amber-700 hover:bg-amber-100 cursor-pointer"
                                          }`}
                                          title={!canEditReport ? "Hanya Sabto dan Antonius yang dapat mengedit lot" : "Edit detail lot kavling"}
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!canEditReport) {
                                              showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
                                              return;
                                            }
                                            handleDeleteItem(subItem.id);
                                          }}
                                          disabled={!canEditReport}
                                          className={`p-1 rounded transition-colors inline-block ${
                                            !canEditReport 
                                              ? "opacity-30 cursor-not-allowed text-neutral-300" 
                                              : "text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                          }`}
                                          title={!canEditReport ? "Hanya Sabto dan Antonius yang dapat menghapus lot" : "Hapus lot ini"}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          );
                        })()}
                      </td>

                          {/* TOTAL */}
                          <td className="border-r border-[#1A1A1A] p-2 text-right font-mono font-bold text-rose-600 text-[11px] bg-neutral-50/20 align-middle">
                            {calculatedTotalSum.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Keterangan */}
                          <td className="border-r border-[#1A1A1A] p-1 text-left bg-white align-middle">
                            <textarea
                              value={firstItem.keterangan || ""}
                              readOnly={!canEditReport}
                              onChange={(e) => {
                                if (!canEditReport) return;
                                const val = e.target.value;
                                itemsInGroup.forEach(item => {
                                  updateItemValue(item.id, { keterangan: val });
                                });
                              }}
                              placeholder={canEditReport ? "Tambah catatan..." : "-"}
                              rows={3}
                              className={`w-full text-[10px] p-1 border-none bg-transparent resize-none font-sans print:p-0 print:placeholder-transparent ${
                                canEditReport ? "focus:outline-none focus:bg-neutral-50" : "cursor-default select-text"
                              }`}
                            />
                          </td>

                          {/* Cek (Pengurangan Stock Akhir - Total) */}
                          <td className="border-r border-[#1A1A1A] p-1.5 text-center bg-white align-middle font-mono">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span 
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                  Math.abs(selisihPengurangan) < 0.001
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : "bg-rose-50 text-rose-800 border-rose-300 font-black"
                                }`}
                                title={`Pengurangan: Stock Akhir (${calculatedAkhirSum.toLocaleString("id-ID")}) - Total (${calculatedTotalSum.toLocaleString("id-ID")}) = ${selisihPengurangan}`}
                              >
                                {Math.abs(selisihPengurangan) < 0.001 ? "0.00" : `${selisihPengurangan > 0 ? "+" : ""}${selisihPengurangan.toLocaleString("id-ID", { minimumFractionDigits: 2 })}`}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!canEditReport) {
                                    showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
                                    return;
                                  }
                                  const nextChecked = !isGroupChecked;
                                  itemsInGroup.forEach(item => {
                                    updateItemValue(item.id, { checked: nextChecked });
                                  });
                                }}
                                disabled={!canEditReport}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors print:hidden ${
                                  !canEditReport
                                    ? "cursor-not-allowed opacity-40 border-neutral-300 bg-neutral-100"
                                    : isGroupChecked 
                                      ? "bg-[#1A1A1A] border-[#1A1A1A] text-white cursor-pointer" 
                                      : "border-neutral-300 hover:border-[#1A1A1A] bg-transparent text-transparent cursor-pointer"
                                }`}
                                title={!canEditReport ? "Hanya Sabto dan Antonius yang dapat mengubah status cek" : (isGroupChecked ? "Tersertifikasi OK" : "Tandai Cek")}
                              >
                                <svg className="w-3 h-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            </div>
                          </td>

                          {/* Action (Delete entire group) */}
                          <td className="p-1 text-center print:hidden border-l border-neutral-300 align-middle">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canEditReport) {
                                  showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
                                  return;
                                }
                                if (confirm(`Hapus seluruh data untuk material "${firstItem.namaMaterial}" (${itemsInGroup.length} lot)?`)) {
                                  itemsInGroup.forEach(item => {
                                    handleDeleteItem(item.id);
                                  });
                                }
                              }}
                              disabled={!canEditReport}
                              className={`p-1 rounded transition-colors ${
                                !canEditReport 
                                  ? "opacity-30 cursor-not-allowed text-neutral-300" 
                                  : "text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              }`}
                              title={!canEditReport ? "Hanya Sabto dan Antonius yang dapat menghapus material" : "Hapus seluruh material ini (semua lot)"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {/* Summary row */}

                  {/* Summary row */}
                  {activeReport.items.length > 0 && (
                    <tr className="bg-neutral-100 font-bold border-t-2 border-[#1A1A1A] font-sans text-xs">
                      <td colSpan={2} className="border-r border-[#1A1A1A] p-2 text-right uppercase tracking-wider text-xs">
                        TOTAL BAHAN PEMBANTU :
                      </td>
                      <td className="border-r border-[#1A1A1A] p-2 text-right font-mono text-neutral-800">
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold">{totalStkAwal.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] font-normal text-neutral-500">{totalStkAwalColly.toLocaleString("id-ID")} coly</span>
                        </div>
                      </td>
                      <td className="border-r border-[#1A1A1A] p-2 text-right font-mono text-emerald-800 bg-emerald-50/10">
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold">{totalMasuk.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] font-semibold text-emerald-600">{totalMasukColly.toLocaleString("id-ID")} coly</span>
                        </div>
                      </td>
                      <td className="border-r border-[#1A1A1A] p-2 text-right font-mono text-rose-700 bg-rose-50/10">
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold">{totalKeluar.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] text-rose-500">{totalKeluarColly.toLocaleString("id-ID")} coly</span>
                        </div>
                      </td>
                      <td className="border-r border-[#1A1A1A] p-2 text-right font-mono text-blue-800 bg-blue-50/10">
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold">{totalStkAkhir.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] text-blue-500 font-bold">{totalStkAkhirColly.toLocaleString("id-ID")} coly</span>
                        </div>
                      </td>
                      <td className="border-r border-[#1A1A1A] p-2 text-center text-neutral-400 bg-neutral-50 font-normal italic">
                        -
                      </td>
                      <td className="border-r border-[#1A1A1A] p-2 text-right font-mono text-rose-600 font-black text-sm bg-neutral-100">
                        {totalStkAkhir.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 bg-neutral-100 border-r border-[#1A1A1A]"></td>
                      <td className="p-1.5 text-center font-mono font-bold text-xs bg-neutral-100 border-r border-[#1A1A1A]">
                        <span className="text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">0.00</span>
                      </td>
                      <td className="print:hidden border-l border-neutral-300 bg-neutral-100"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SIGNATURES SECTION (DIBUAT OLEH & MENGETAHUI) */}
            <footer className="flex flex-col sm:flex-row justify-around items-end gap-12 md:gap-24 pt-10 mt-auto border-t border-dashed border-[#1A1A1A]/30 w-full max-w-3xl mx-auto print:pt-6">
              
              {/* Dibuat Oleh (Admin Gudang) */}
              <div className="flex flex-col items-center text-center w-56 sm:w-64">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 block">
                  Dibuat Oleh,
                </span>
                
                {/* Signature Ink Area */}
                <div 
                  className="h-20 w-full border border-dashed border-neutral-300 hover:border-[#1A1A1A] hover:bg-[#1A1A1A]/5 rounded flex items-center justify-center transition-all relative overflow-hidden bg-white/40 group print:border-none print:bg-transparent"
                  title="Klik untuk membuat atau mengunggah file tanda tangan"
                >
                  {activeReport.dibuatOlehSignature ? (
                    <div 
                      onClick={() => setSignatureModal({
                        isOpen: true,
                        role: "dibuat",
                        title: "Tanda Tangan - Pembuat Laporan (Admin Gudang)",
                        defaultName: activeReport.dibuatOlehName || "Sabto A"
                      })}
                      className="w-full h-full flex items-center justify-center cursor-pointer p-1"
                    >
                      <img 
                        src={activeReport.dibuatOlehSignature} 
                        alt="Tanda Tangan Pembuat" 
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    </div>
                  ) : (
                    <div 
                      onClick={() => setSignatureModal({
                        isOpen: true,
                        role: "dibuat",
                        title: "Tanda Tangan - Pembuat Laporan (Admin Gudang)",
                        defaultName: activeReport.dibuatOlehName || "Sabto A"
                      })}
                      className="text-[10px] font-sans font-semibold text-neutral-400 group-hover:text-neutral-800 flex flex-col items-center gap-1 cursor-pointer w-full h-full justify-center print:hidden"
                    >
                      <div className="flex items-center gap-1.5 text-neutral-500 group-hover:text-emerald-700">
                        <Upload className="w-3.5 h-3.5" />
                        <SignatureIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold tracking-tight">UPLOAD / TTD DIGITAL</span>
                    </div>
                  )}

                  {activeReport.dibuatOlehSignature && (
                    <div className="absolute right-1 top-1 flex items-center gap-1 print:hidden">
                      <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 py-0.5 rounded border border-emerald-300">
                        Signed
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateActiveReport({ dibuatOlehSignature: null });
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-0.5 rounded border border-red-200 cursor-pointer"
                        title="Hapus tanda tangan"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-[1.5px] bg-[#1A1A1A] w-full mt-2 mb-2"></div>
                
                {/* Signee Metadata - Name and Role BELOW Name */}
                <div className="flex flex-col items-center gap-1 font-sans w-full text-center">
                  <input
                    type="text"
                    value={activeReport.dibuatOlehName ?? "Sabto A"}
                    onChange={(e) => updateActiveReport({ dibuatOlehName: e.target.value })}
                    className="text-xs font-bold font-serif italic text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-[#1A1A1A] focus:outline-none text-center w-full p-0 font-serif print:border-none"
                    placeholder="Sabto A"
                    title="Klik untuk mengedit nama"
                  />
                  <input
                    type="text"
                    value={activeReport.dibuatOlehRole ?? "Admin Gudang"}
                    onChange={(e) => updateActiveReport({ dibuatOlehRole: e.target.value })}
                    className="text-[9px] uppercase font-bold text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-[#1A1A1A] focus:outline-none text-center w-full p-0 font-sans print:border-none"
                    placeholder="Admin Gudang"
                    title="Klik untuk mengedit jabatan"
                  />
                </div>
              </div>

              {/* Mengetahui (Head Of Wrh Sub.Dept) */}
              <div className="flex flex-col items-center text-center w-56 sm:w-64">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 block">
                  Mengetahui,
                </span>
                
                {/* Signature Ink Area */}
                <div 
                  className="h-20 w-full border border-dashed border-neutral-300 hover:border-[#1A1A1A] hover:bg-[#1A1A1A]/5 rounded flex items-center justify-center transition-all relative overflow-hidden bg-white/40 group print:border-none print:bg-transparent"
                  title="Klik untuk membuat atau mengunggah file tanda tangan"
                >
                  {activeReport.mengetahuiSignature ? (
                    <div 
                      onClick={() => setSignatureModal({
                        isOpen: true,
                        role: "mengetahui",
                        title: "Tanda Tangan - Pihak Mengetahui (Head Of Wrh Sub.Dept)",
                        defaultName: activeReport.mengetahuiName || "Antonius Andri Waroto"
                      })}
                      className="w-full h-full flex items-center justify-center cursor-pointer p-1"
                    >
                      <img 
                        src={activeReport.mengetahuiSignature} 
                        alt="Tanda Tangan Mengetahui" 
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    </div>
                  ) : (
                    <div 
                      onClick={() => setSignatureModal({
                        isOpen: true,
                        role: "mengetahui",
                        title: "Tanda Tangan - Pihak Mengetahui (Head Of Wrh Sub.Dept)",
                        defaultName: activeReport.mengetahuiName || "Antonius Andri Waroto"
                      })}
                      className="text-[10px] font-sans font-semibold text-neutral-400 group-hover:text-neutral-800 flex flex-col items-center gap-1 cursor-pointer w-full h-full justify-center print:hidden"
                    >
                      <div className="flex items-center gap-1.5 text-neutral-500 group-hover:text-emerald-700">
                        <Upload className="w-3.5 h-3.5" />
                        <SignatureIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold tracking-tight">UPLOAD / TTD DIGITAL</span>
                    </div>
                  )}

                  {activeReport.mengetahuiSignature && (
                    <div className="absolute right-1 top-1 flex items-center gap-1 print:hidden">
                      <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 py-0.5 rounded border border-emerald-300">
                        Signed
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateActiveReport({ mengetahuiSignature: null });
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-0.5 rounded border border-red-200 cursor-pointer"
                        title="Hapus tanda tangan"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-[1.5px] bg-[#1A1A1A] w-full mt-2 mb-2"></div>
                
                {/* Signee Metadata - Name and Role BELOW Name */}
                <div className="flex flex-col items-center gap-1 font-sans w-full text-center">
                  <input
                    type="text"
                    value={activeReport.mengetahuiName ?? "Antonius Andri Waroto"}
                    onChange={(e) => updateActiveReport({ mengetahuiName: e.target.value })}
                    className="text-xs font-bold font-serif italic text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-[#1A1A1A] focus:outline-none text-center w-full p-0 font-serif print:border-none"
                    placeholder="Antonius Andri Waroto"
                    title="Klik untuk mengedit nama"
                  />
                  <input
                    type="text"
                    value={activeReport.mengetahuiRole ?? "Head Of Wrh Sub.Dept"}
                    onChange={(e) => updateActiveReport({ mengetahuiRole: e.target.value })}
                    className="text-[9px] uppercase font-bold text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-[#1A1A1A] focus:outline-none text-center w-full p-0 font-sans print:border-none"
                    placeholder="Head Of Wrh Sub.Dept"
                    title="Klik untuk mengedit jabatan"
                  />
                </div>
              </div>

            </footer>

          </div>
        </div>

          </div>
        )}


      </main>

      {/* ==========================================
          MODALS & SETTINGS DRAWER
          ========================================== */}

      {/* GLOBAL SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#F2F0ED] border-2 border-[#1A1A1A] w-full max-w-md shadow-2xl rounded">
            <div className="p-4 border-b border-[#1A1A1A] flex justify-between items-center bg-white rounded-t">
              <h3 className="font-serif italic text-lg font-bold">Identitas Laporan</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-neutral-100 rounded text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4 text-xs">
              
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Nama Perusahaan (Kop Kiri)</label>
                <input
                  type="text"
                  value={activeReport.companyName}
                  onChange={(e) => updateActiveReport({ companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none"
                  placeholder="PT. Japfa Comfeed Indonesia.Tbk - UNIT LPG"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Gudang / S. LOCT (Kop Tengah)</label>
                <input
                  type="text"
                  value={activeReport.gudangSLoct}
                  onChange={(e) => updateActiveReport({ gudangSLoct: e.target.value })}
                  className="w-full px-3 py-2 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none"
                  placeholder="2001 - 2002"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Kode Dokumen (Kop Kanan)</label>
                <input
                  type="text"
                  value={activeReport.docCode}
                  onChange={(e) => updateActiveReport({ docCode: e.target.value })}
                  className="w-full px-3 py-2 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none font-mono"
                  placeholder="PLT - WRH - FM - 02 - 03"
                />
              </div>

              <div className="h-[1px] bg-neutral-300 my-1"></div>

              {/* Roles Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Pembuat Laporan</label>
                  <input
                    type="text"
                    value={activeReport.dibuatOlehName}
                    onChange={(e) => updateActiveReport({ dibuatOlehName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none font-serif italic"
                    placeholder="Nama Admin"
                  />
                  <input
                    type="text"
                    value={activeReport.dibuatOlehRole}
                    onChange={(e) => updateActiveReport({ dibuatOlehRole: e.target.value })}
                    className="w-full px-3 py-1 border border-neutral-300 bg-[#FAF9F6] mt-1 text-[10px]"
                    placeholder="Jabatan"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Mengetahui (Pimpinan)</label>
                  <input
                    type="text"
                    value={activeReport.mengetahuiName}
                    onChange={(e) => updateActiveReport({ mengetahuiName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#1A1A1A] bg-[#FAF9F6] focus:outline-none font-serif italic"
                    placeholder="Nama Site Manager"
                  />
                  <input
                    type="text"
                    value={activeReport.mengetahuiRole}
                    onChange={(e) => updateActiveReport({ mengetahuiRole: e.target.value })}
                    className="w-full px-3 py-1 border border-neutral-300 bg-[#FAF9F6] mt-1 text-[10px]"
                    placeholder="Jabatan"
                  />
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-[#1A1A1A] bg-neutral-100 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#333333] text-xs font-bold rounded"
              >
                Terapkan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}



      {/* SIGNATURE DRAWER INJECTOR */}
      {signatureModal?.isOpen && (
        <SignatureModal
          isOpen={signatureModal.isOpen}
          title={signatureModal.title}
          defaultName={signatureModal.defaultName}
          onClose={() => setSignatureModal(null)}
          onSave={(dataUrl) => {
            if (signatureModal.role === "dibuat") {
              updateActiveReport({ dibuatOlehSignature: dataUrl });
            } else {
              updateActiveReport({ mengetahuiSignature: dataUrl });
            }
          }}
        />
      )}

      {/* DELETE ALL CONFIRMATION MODAL */}
      {deleteAllConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-rose-600 max-w-md w-full rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-rose-600 text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Trash2 className="w-5 h-5 text-rose-200" />
                <span>Konfirmasi Hapus Semua Item</span>
              </div>
              <button 
                onClick={() => setDeleteAllConfirmOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-rose-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 text-xs text-neutral-700 space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-900 font-medium">
                Apakah Anda yakin ingin <strong>MENGHAPUS SEMUA ({activeReport.items.length}) item</strong> pada laporan tanggal <strong>{selectedDate}</strong>?
              </div>
              <p className="text-neutral-500 text-[11px]">
                Tindakan ini akan mengosongkan seluruh baris material pada laporan ini.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteAllConfirmOpen(false)}
                className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteAllItems}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET TO SEEDED CONFIRMATION MODAL */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-[#1A1A1A] max-w-md w-full rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-[#1A1A1A] text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span>Konfirmasi Reset Laporan</span>
              </div>
              <button 
                onClick={() => setResetConfirmOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 text-xs text-neutral-700 space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 font-medium">
                Apakah Anda yakin ingin menyetel ulang data laporan tanggal <strong>{selectedDate}</strong> ke sampel data awal bawaan?
              </div>
            </div>

            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end items-center gap-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeResetToSeeded}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span>Ya, Setel Ulang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT & PRINTER SELECTION MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-[#1A1A1A] max-w-lg w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#1A1A1A] text-white px-5 py-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Cetak PDF & Opsi Printer</h3>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs text-neutral-800">
              
              {/* Output Method Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-2">
                  1. Pilih Metode Cetak / Output
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrintMethod("system")}
                    className={`p-3 border-2 rounded-lg text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      printMethod === "system"
                        ? "border-[#1A1A1A] bg-amber-50/60 ring-2 ring-amber-500/20"
                        : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-xs">
                        <Printer className="w-4 h-4 text-neutral-800" />
                        <span>Dialog System Printer</span>
                      </div>
                      {printMethod === "system" && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                    </div>
                    <p className="text-[10px] text-neutral-600 leading-tight">
                      Membuka dialog cetak OS/browser untuk memilih printer fisik atau Microsoft Print to PDF.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintMethod("pdf")}
                    className={`p-3 border-2 rounded-lg text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      printMethod === "pdf"
                        ? "border-[#1A1A1A] bg-amber-50/60 ring-2 ring-amber-500/20"
                        : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-xs">
                        <FileDown className="w-4 h-4 text-neutral-800" />
                        <span>Unduh File PDF Direct</span>
                      </div>
                      {printMethod === "pdf" && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                    </div>
                    <p className="text-[10px] text-neutral-600 leading-tight">
                      Langsung mengunduh file laporan format PDF (.pdf) beresolusi tinggi ke folder simpan.
                    </p>
                  </button>
                </div>
              </div>

              {/* Printer Type Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-2">
                  2. Pilih Jenis / Driver Printer Yang Digunakan
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "standard",
                      title: "Printer Laser / Inkjet Standard (Epson, Canon, HP, Brother)",
                      desc: "Format A4 / F4 Landscape. Garis tabel presisi dengan resolusi cetak optimal.",
                      tag: "Desktop Office"
                    },
                    {
                      id: "pdf_virtual",
                      title: "Virtual Printer / Save as PDF (Microsoft / Adobe / CutePDF)",
                      desc: "Pilihan terbaik untuk menyimpan dokumen digital PDF ke Komputer / Flashdisk.",
                      tag: "PDF Printer"
                    },
                    {
                      id: "dotmatrix",
                      title: "Printer Continuous Form / Dot Matrix (Epson LX-310 / LQ-2190)",
                      desc: "Pencetakan pita continuous form. Kompatibel cetak rangkap kasir / gudang.",
                      tag: "Continuous"
                    },
                    {
                      id: "thermal",
                      title: "Printer POS / Label Thermal Wide Format",
                      desc: "Pencetakan thermal roll lebar atau kertas stiker resi gudang.",
                      tag: "POS Thermal"
                    }
                  ].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPrinterType(p.id as any)}
                      className={`p-2.5 border rounded-md cursor-pointer transition-all flex items-start gap-3 ${
                        selectedPrinterType === p.id
                          ? "border-[#1A1A1A] bg-neutral-100/80 shadow-xs"
                          : "border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="printerType"
                        checked={selectedPrinterType === p.id}
                        onChange={() => setSelectedPrinterType(p.id as any)}
                        className="mt-0.5 text-neutral-900 focus:ring-neutral-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-neutral-900">{p.title}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded font-semibold whitespace-nowrap">
                            {p.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Information Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2 text-[11px] text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Informasi:</span>
                  <p className="mt-0.5 text-[10px] leading-tight text-amber-800">
                    {printMethod === "system"
                      ? "Ketika menekan 'Lanjutkan Cetak', dialog printer bawaan Windows/Mac akan terbuka untuk memilih printer fisik aktif Anda."
                      : "File PDF landscape A4 siap pakai akan langsung diproses dan diunduh ke komputer Anda."}
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-100 border-t border-[#1A1A1A] flex justify-end items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-200 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executePrintAction}
                disabled={isGeneratingPDF}
                className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:bg-neutral-400"
              >
                <Printer className="w-4 h-4" />
                <span>{printMethod === "system" ? "Lanjutkan Cetak (Dialog Printer)" : "Unduh File PDF"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT LOT MODAL */}
      <EditLotModal
        item={editingLotItem}
        onClose={() => setEditingLotItem(null)}
        onSave={handleSaveEditedLot}
      />

      {/* LOGOUT CONFIRMATION MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in print:hidden">
          <div className="bg-white border-2 border-[#1A1A1A] rounded-lg shadow-2xl max-w-sm w-full p-6 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-inner">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-black text-lg text-neutral-900">Konfirmasi Keluar</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
              Apakah Anda yakin ingin keluar dari sesi <strong>{currentUser?.name}</strong>? Seluruh data laporan gudang Anda tetap tersimpan aman di database cloud.
            </p>
            <div className="mt-6 flex justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 rounded text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ya, Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PENGATURAN SISTEM LOGIN MODAL */}
      <LoginSystemSettingsModal
        isOpen={isLoginSettingsModalOpen}
        onClose={() => setIsLoginSettingsModalOpen(false)}
        currentUserName={currentUser?.name}
        currentRole={currentUser?.role}
      />

      {/* CUSTOM CSS FOR GENERAL PRINT WORKFLOW */}
      <style>{`
        /* Custom styles to mimic the exact editorial grid visual */
        .bg-paper-texture {
          background-image: radial-gradient(#1A1A1A 0.5px, transparent 0.5px), radial-gradient(#1A1A1A 0.5px, #F2F0ED 0.5px);
          background-size: 20px 20px;
          background-position: 0 0, 10px 10px;
          background-color: #F2F0ED;
          /* Subtly blend texture */
          background-blend-mode: soft-light;
        }

        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* High quality prints on A4 Landscape */
        @media print {
          body {
            background-color: #FFFFFF !important;
            color: #000000 !important;
            font-size: 10pt;
            margin: 0 !important;
            padding: 0 !important;
          }
          #report-paper-canvas {
            border: none !important;
            box-shadow: none !important;
            background-color: #FFFFFF !important;
            background-image: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            border-color: #000000 !important;
          }
          th, td {
            border-color: #000000 !important;
          }
          .print-bg-white {
            background-color: #FFFFFF !important;
          }
        }
      `}</style>

    </div>
  );
}
