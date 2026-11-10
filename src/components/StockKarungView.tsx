import React, { useState, useMemo, useEffect } from "react";
import { 
  Package, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Building2, 
  Calendar, 
  Edit3, 
  Check, 
  X,
  FileSpreadsheet,
  HelpCircle,
  RefreshCw,
  ClipboardList,
  Clock,
  History,
  FileText,
  Tag,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Save,
  Upload,
  Signature as SignatureIcon
} from "lucide-react";
import { KarungItem, KarungReport, KarungCategory, KarungInboundLog, KarungOutboundLog, DEFAULT_KARUNG_SEED, DEFAULT_INBOUND_LOGS_SEED, DEFAULT_OUTBOUND_LOGS_SEED, calculateAgeInDays, formatDDMMYY } from "../types/karung";
import { OfficialLaporanPembungkusView } from "./OfficialLaporanPembungkusView";
import { SignatureModal } from "./SignatureModal";

interface StockKarungViewProps {
  report: KarungReport;
  selectedDate: string;
  onUpdateReport: (updatedReport: KarungReport) => void;
  showNotification: (message: string, type?: "success" | "error" | "info") => void;
  onDateChange?: (date: string) => void;
  onSyncFromPreviousDay?: () => void;
  previousReportDate?: string | null;
  onSaveStock?: () => void;
  canEditReport?: boolean;
  isGuest?: boolean;
}

export function StockKarungView({
  report,
  selectedDate,
  onUpdateReport,
  showNotification,
  onDateChange,
  onSyncFromPreviousDay,
  previousReportDate,
  onSaveStock,
  canEditReport,
  isGuest
}: StockKarungViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"table" | "inbound" | "outbound" | "print">("table");
  const [inboundViewMode, setInboundViewMode] = useState<"log" | "stock">("log");
  const [inboundStockSearch, setInboundStockSearch] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  
  // Selection for edit or transactions
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KarungItem | null>(null);

  // Deletion Confirmation States
  const [itemToDelete, setItemToDelete] = useState<KarungItem | null>(null);
  const [inboundLogToDelete, setInboundLogToDelete] = useState<KarungInboundLog | null>(null);
  const [outboundLogToDelete, setOutboundLogToDelete] = useState<KarungOutboundLog | null>(null);

  // Signature Modal State
  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean;
    role: "dibuat" | "mengetahui";
    title: string;
    defaultName: string;
  } | null>(null);

  // Inbound Form States
  const [inboundTanggal, setInboundTanggal] = useState<string>(selectedDate);
  const [inboundItemId, setInboundItemId] = useState<string>("");
  const [inboundKolom, setInboundKolom] = useState<"pembelian" | "returProduksi" | "masukLainLain">("pembelian");
  const [inboundBal, setInboundBal] = useState<string>("");
  const [inboundLembar, setInboundLembar] = useState<string>("");
  const [inboundBatch, setInboundBatch] = useState<string>("");
  const [inboundSuplier, setInboundSuplier] = useState<string>("");
  const [inboundKavling, setInboundKavling] = useState<string>("");
  const [inboundCatatan, setInboundCatatan] = useState<string>("");

  // Sync inbound date when report date changes
  useEffect(() => {
    setInboundTanggal(selectedDate);
  }, [selectedDate]);

  // + Buat Kode Baru State (inside Inbound form)
  const [isCreatingNewCode, setIsCreatingNewCode] = useState<boolean>(false);
  const [newCodeKode, setNewCodeKode] = useState<string>("");
  const [newCodeNama, setNewCodeNama] = useState<string>("");
  const [newCodeKategori, setNewCodeKategori] = useState<KarungCategory>("Karung 50 Kg");
  const [newCodeSpesifikasi, setNewCodeSpesifikasi] = useState<string>("065X100 10/10 800 2C");
  const [newCodeLembarPerBal, setNewCodeLembarPerBal] = useState<number>(500);
  const [newCodeSloct, setNewCodeSloct] = useState<string>("3001");
  const [newCodeSupplier, setNewCodeSupplier] = useState<string>("PT. Kencana Maju Lestari");

  // Log Penerimaan States
  const [logFilterDateMode, setLogFilterDateMode] = useState<"all" | "today" | "custom">("today");
  const [logCustomDate, setLogCustomDate] = useState<string>(selectedDate);
  const [logFilterKolom, setLogFilterKolom] = useState<"all" | "pembelian" | "returProduksi" | "masukLainLain">("all");
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");

  // Outbound Form States
  const [outboundTanggal, setOutboundTanggal] = useState<string>(selectedDate);
  const [outboundViewMode, setOutboundViewMode] = useState<"log" | "stock">("log");
  const [outboundStockSearch, setOutboundStockSearch] = useState<string>("");
  const [outboundMaterialFilter, setOutboundMaterialFilter] = useState<string>("all");
  const [outboundItemId, setOutboundItemId] = useState<string>("");
  const [outboundKolom, setOutboundKolom] = useState<"bonProduksi" | "gudangKeluar" | "overZak" | "keluarLainLain">("bonProduksi");
  const [outboundLembar, setOutboundLembar] = useState<string>("");
  const [outboundCatatan, setOutboundCatatan] = useState<string>("");

  // Sync outbound date when report date changes
  useEffect(() => {
    setOutboundTanggal(selectedDate);
  }, [selectedDate]);

  // New Item Form State (for general modal)
  const [newItem, setNewItem] = useState<Partial<KarungItem>>({
    kode: "",
    namaKarung: "",
    kategori: "Karung 50 Kg",
    spesifikasi: "",
    lembarPerBal: 500,
    stockAwal: 0,
    masuk: 0,
    keluar: 0,
    afkir: 0,
    gudangKav: "Kav K-01",
    suplier: "PT. Kencana Maju Lestari",
    batch: "",
    tglMasuk: selectedDate,
    minStock: 3000,
    keterangan: ""
  });

  const items = report.items || [];
  const inboundLogs = report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED;

  // KPI Calculations
  const metrics = useMemo(() => {
    let totalStockAwal = 0;
    let totalMasuk = 0;
    let totalKeluar = 0;
    let totalAfkir = 0;
    let totalStockAkhir = 0;
    let lowStockCount = 0;

    items.forEach((item) => {
      const awal = item.stockAwal || 0;
      const masuk = item.masuk || 0;
      const keluar = item.keluar || 0;
      const afkir = item.afkir || 0;
      const akhir = awal + masuk - keluar - afkir;

      totalStockAwal += awal;
      totalMasuk += masuk;
      totalKeluar += keluar;
      totalAfkir += afkir;
      totalStockAkhir += akhir;

      if (akhir <= (item.minStock || 0)) {
        lowStockCount++;
      }
    });

    return {
      totalItems: items.length,
      totalStockAwal,
      totalMasuk,
      totalKeluar,
      totalAfkir,
      totalStockAkhir,
      lowStockCount
    };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        item.namaKarung.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.suplier || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.gudangKav || "").toLowerCase().includes(searchQuery.toLowerCase());

      const stockAkhir = (item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0) - (item.afkir || 0);
      const matchLowStock = !filterLowStockOnly || stockAkhir <= (item.minStock || 0);

      return matchSearch && matchLowStock;
    });
  }, [items, searchQuery, filterLowStockOnly]);

  // Date Shift Helper
  const handleOffsetDate = (days: number) => {
    if (!onDateChange) return;
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() + days);
      const ny = dateObj.getFullYear();
      const nm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const nd = String(dateObj.getDate()).padStart(2, "0");
      onDateChange(`${ny}-${nm}-${nd}`);
    } catch (e) {
      console.error("Date shift error:", e);
    }
  };

  // Handlers for Items
  const updateItem = (id: string, updates: Partial<KarungItem>) => {
    const updated = items.map((it) => (it.id === id ? { ...it, ...updates } : it));
    onUpdateReport({ ...report, items: updated });
  };

  const executeDeleteItem = (id: string) => {
    const target = items.find((it) => it.id === id);
    const updated = items.filter((it) => it.id !== id);
    onUpdateReport({ ...report, items: updated });
    showNotification(`Item karung ${target?.kode ? `[${target.kode}]` : ""} "${target?.namaKarung || "Karung"}" berhasil dihapus dari daftar.`, "info");
    if (selectedItemId === id) setSelectedItemId(null);
    if (editingItem?.id === id) {
      setIsEditModalOpen(false);
      setEditingItem(null);
    }
    setItemToDelete(null);
  };

  const handleDeleteItem = (id: string) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menghapus data!", "error");
      return;
    }
    if (canEditReport !== undefined && !canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    const item = items.find((it) => it.id === id);
    if (item) {
      setItemToDelete(item);
    } else {
      executeDeleteItem(id);
    }
  };

  const handleAddNewItem = () => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menambah data!", "error");
      return;
    }
    if (canEditReport !== undefined && !canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    if (!newItem.kode || !newItem.namaKarung) {
      showNotification("Kode dan Nama Karung wajib diisi!", "error");
      return;
    }

    const id = `krg-${Date.now()}`;
    const lembarPerBal = newItem.lembarPerBal || 500;
    const stockAwal = Number(newItem.stockAwal) || 0;
    const itemTglMasuk = newItem.tglMasuk || selectedDate;
    const initialLotAge = calculateAgeInDays(itemTglMasuk, selectedDate);
    
    const createdItem: KarungItem = {
      id,
      kode: (newItem.kode || "").toUpperCase().trim(),
      namaKarung: newItem.namaKarung.trim(),
      kategori: (newItem.kategori as KarungCategory) || "Karung 50 Kg",
      spesifikasi: newItem.spesifikasi || "",
      lembarPerBal,
      stockAwal,
      stockAwalBal: Math.round((stockAwal / lembarPerBal) * 10) / 10,
      masuk: Number(newItem.masuk) || 0,
      keluar: Number(newItem.keluar) || 0,
      afkir: Number(newItem.afkir) || 0,
      gudangKav: newItem.gudangKav || "3001",
      suplier: newItem.suplier || "PT. Japfa Supplier",
      batch: newItem.batch || "",
      tglMasuk: itemTglMasuk,
      minStock: Number(newItem.minStock) || 1000,
      fifoLots: [
        {
          id: `lot-${Date.now()}`,
          kav: newItem.gudangKav || "3001",
          tglMasuk: formatDDMMYY(itemTglMasuk),
          umurHari: initialLotAge,
          jmlLembar: stockAwal
        }
      ],
      keterangan: newItem.keterangan || ""
    };

    let updatedInboundLogs = report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    if (createdItem.masuk && createdItem.masuk > 0) {
      const newLog: KarungInboundLog = {
        id: `inbound-${Date.now()}`,
        tanggal: selectedDate,
        waktu: timeStr,
        itemId: createdItem.id,
        kode: createdItem.kode,
        namaKarung: createdItem.namaKarung,
        kategori: createdItem.kategori,
        sloct: createdItem.gudangKav || "3001",
        kolom: "pembelian",
        jmlLembar: createdItem.masuk,
        jmlBal: Math.round((createdItem.masuk / lembarPerBal) * 10) / 10,
        catatan: `Input item baru: ${createdItem.keterangan || ""}`,
        operator: report.dibuatOlehName || "Admin Warehouse"
      };
      updatedInboundLogs = [newLog, ...updatedInboundLogs];
    }

    onUpdateReport({
      ...report,
      items: [...items, createdItem],
      inboundLogs: updatedInboundLogs
    });

    setIsAddModalOpen(false);
    setNewItem({
      kode: "",
      namaKarung: "",
      kategori: "Karung 50 Kg",
      spesifikasi: "",
      lembarPerBal: 500,
      stockAwal: 0,
      masuk: 0,
      keluar: 0,
      afkir: 0,
      gudangKav: "Kav K-01",
      suplier: "PT. Kencana Maju Lestari",
      batch: "",
      tglMasuk: selectedDate,
      minStock: 3000,
      keterangan: ""
    });
    showNotification("Item Karung baru berhasil ditambahkan!", "success");
  };

  const handleSaveEditItem = () => {
    if (!editingItem) return;
    const orig = items.find((it) => it.id === editingItem.id);
    const lembarPerBal = editingItem.lembarPerBal || 500;
    const updatedWithBal: KarungItem = {
      ...editingItem,
      stockAwalBal: Math.round(((editingItem.stockAwal || 0) / lembarPerBal) * 10) / 10,
      masukBal: Math.round(((editingItem.masuk || 0) / lembarPerBal) * 10) / 10,
      keluarBal: Math.round(((editingItem.keluar || 0) / lembarPerBal) * 10) / 10
    };

    let updatedInboundLogs = report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED;
    const diffMasuk = (editingItem.masuk || 0) - (orig?.masuk || 0);

    if (diffMasuk > 0) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      const newLog: KarungInboundLog = {
        id: `inbound-${Date.now()}-edit`,
        tanggal: selectedDate,
        waktu: timeStr,
        itemId: editingItem.id,
        kode: editingItem.kode,
        namaKarung: editingItem.namaKarung,
        kategori: editingItem.kategori,
        sloct: editingItem.gudangKav || "3001",
        kolom: "pembelian",
        jmlLembar: diffMasuk,
        jmlBal: Math.round((diffMasuk / lembarPerBal) * 10) / 10,
        catatan: `Penyesuaian stok masuk (Edit Item): +${diffMasuk} lbr`,
        operator: report.dibuatOlehName || "Admin Warehouse"
      };
      updatedInboundLogs = [newLog, ...updatedInboundLogs];
    }

    const updated = items.map((it) => (it.id === editingItem.id ? updatedWithBal : it));
    onUpdateReport({ ...report, items: updated, inboundLogs: updatedInboundLogs });
    setIsEditModalOpen(false);
    setEditingItem(null);
    showNotification("Data item karung berhasil diperbarui!", "success");
  };

  // + Buat Kode Baru Handler
  const handleSaveNewCode = () => {
    if (!newCodeKode.trim()) {
      showNotification("Masukkan Kode Barang Baru!", "error");
      return;
    }
    if (!newCodeNama.trim()) {
      showNotification("Masukkan Nama Barang!", "error");
      return;
    }

    // Check if code already exists
    const existing = items.find(
      (it) => it.kode.trim().toLowerCase() === newCodeKode.trim().toLowerCase()
    );
    if (existing) {
      setInboundItemId(existing.id);
      setInboundSuplier(existing.suplier || "");
      setInboundKavling(existing.gudangKav || newCodeSloct || "3001");
      setIsCreatingNewCode(false);
      showNotification(
        `Kode barang ${existing.kode} (${existing.namaKarung}) sudah terdaftar dan otomatis dipilih!`,
        "info"
      );
      return;
    }

    const createdItem: KarungItem = {
      id: `krg-${Date.now()}`,
      kode: newCodeKode.trim().toUpperCase(),
      namaKarung: newCodeNama.trim().toUpperCase(),
      kategori: newCodeKategori,
      spesifikasi: newCodeSpesifikasi.trim() || "065X100 10/10 800 2C",
      lembarPerBal: newCodeLembarPerBal || 500,
      stockAwal: 0,
      stockAwalBal: 0,
      masuk: 0,
      masukBal: 0,
      pembelian: 0,
      returProduksi: 0,
      masukLainLain: 0,
      bonProduksi: 0,
      gudangKeluar: 0,
      overZak: 0,
      keluarLainLain: 0,
      keluar: 0,
      keluarBal: 0,
      afkir: 0,
      gudangKav: newCodeSloct.trim() || "3001",
      suplier: newCodeSupplier.trim() || "PT. Kencana Maju Lestari",
      batch: `PO-${selectedDate.replace(/-/g, "").slice(2)}`,
      tglMasuk: selectedDate,
      minStock: 3000,
      fifoLots: [
        {
          id: `lot-${Date.now()}`,
          kav: newCodeSloct.trim() || "3001",
          tglMasuk: selectedDate,
          umurHari: 0,
          jmlLembar: 0
        }
      ],
      keterangan: "Kode baru dibuat dari form penerimaan"
    };

    const updatedItems = [...items, createdItem];
    onUpdateReport({ ...report, items: updatedItems });

    setInboundItemId(createdItem.id);
    setInboundSuplier(createdItem.suplier || "");
    setInboundKavling(createdItem.gudangKav || "3001");
    setIsCreatingNewCode(false);

    // Reset fields
    setNewCodeKode("");
    setNewCodeNama("");

    showNotification(
      `Kode Barang Baru [${createdItem.kode}] - ${createdItem.namaKarung} berhasil dibuat dan langsung dipilih!`,
      "success"
    );
  };

  // Inbound Handler (with Log Recording)
  const handleProcessInbound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboundItemId) {
      showNotification("Pilih jenis karung terlebih dahulu!", "error");
      return;
    }

    const item = items.find((it) => it.id === inboundItemId);
    if (!item) return;

    const lembarPerBal = item.lembarPerBal || 500;
    let addedLembar = Number(inboundLembar) || 0;
    if (inboundBal && Number(inboundBal) > 0 && addedLembar === 0) {
      addedLembar = Number(inboundBal) * lembarPerBal;
    }

    if (addedLembar <= 0) {
      showNotification("Masukkan jumlah Lembar atau Bal masuk!", "error");
      return;
    }

    // Allocate to selected Inbound Column
    let newPembelian = item.pembelian || 0;
    let newReturProduksi = item.returProduksi || 0;
    let newMasukLainLain = item.masukLainLain || 0;
    let kolomTitle = "Pembelian";

    if (inboundKolom === "pembelian") {
      newPembelian += addedLembar;
      kolomTitle = "Pembelian (PO Supplier)";
    } else if (inboundKolom === "returProduksi") {
      newReturProduksi += addedLembar;
      kolomTitle = "Retur Produksi";
    } else {
      newMasukLainLain += addedLembar;
      kolomTitle = "Lain-lain Masuk";
    }

    const newMasuk = newPembelian + newReturProduksi + newMasukLainLain;
    const newMasukBal = Math.round((newMasuk / lembarPerBal) * 10) / 10;
    const targetSloc = inboundKavling.trim() || item.gudangKav || "3001";

    // FIFO Lot Update Logic:
    // If Retur Produksi or Lain-lain -> add directly to the active/used FIFO lot
    // If Pembelian (new supplier batch) -> append as a new FIFO lot
    const existingLots = item.fifoLots || [];
    let updatedLots = [...existingLots];

    const transactionDate = inboundTanggal || selectedDate;

    if (inboundKolom === "returProduksi" || inboundKolom === "masukLainLain") {
      if (existingLots.length > 0) {
        const matchIdx = existingLots.findIndex(
          (l) => l.kav.trim().toLowerCase() === targetSloc.trim().toLowerCase()
        );
        const targetIdx = matchIdx >= 0 ? matchIdx : 0;
        
        updatedLots = existingLots.map((lot, idx) => {
          if (idx === targetIdx) {
            return {
              ...lot,
              jmlLembar: (lot.jmlLembar || 0) + addedLembar,
              kav: targetSloc || lot.kav
            };
          }
          return lot;
        });
      } else {
        const lotTgl = item.tglMasuk || transactionDate;
        updatedLots = [
          {
            id: `lot-${Date.now()}`,
            kav: targetSloc,
            tglMasuk: formatDDMMYY(lotTgl),
            umurHari: calculateAgeInDays(lotTgl, selectedDate),
            jmlLembar: addedLembar
          }
        ];
      }
    } else {
      const newLot = {
        id: `lot-${Date.now()}`,
        kav: targetSloc,
        tglMasuk: formatDDMMYY(transactionDate),
        umurHari: calculateAgeInDays(transactionDate, selectedDate),
        jmlLembar: addedLembar
      };
      updatedLots = [...existingLots, newLot];
    }

    // Generate new Inbound Log entry
    const newLog: KarungInboundLog = {
      id: `inb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tanggal: transactionDate,
      waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      itemId: item.id,
      kode: item.kode,
      namaKarung: item.namaKarung,
      kategori: item.kategori,
      sloct: targetSloc,
      kolom: inboundKolom,
      jmlLembar: addedLembar,
      jmlBal: Math.round((addedLembar / lembarPerBal) * 10) / 10,
      catatan: inboundCatatan.trim() || `Penerimaan ${kolomTitle}`,
      operator: report.dibuatOlehName || "Admin Gudang"
    };

    const updatedItem: KarungItem = {
      ...item,
      pembelian: newPembelian,
      returProduksi: newReturProduksi,
      masukLainLain: newMasukLainLain,
      masuk: newMasuk,
      masukBal: newMasukBal,
      gudangKav: targetSloc,
      batch: inboundBatch || item.batch,
      suplier: inboundSuplier || item.suplier,
      tglMasuk: transactionDate,
      fifoLots: updatedLots,
      keterangan: inboundCatatan
        ? `${item.keterangan || ""} | [${kolomTitle}] ${inboundCatatan}`.trim()
        : item.keterangan
    };

    const updatedItems = items.map((it) => (it.id === updatedItem.id ? updatedItem : it));
    const currentLogs = report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED;
    const updatedLogs = [newLog, ...currentLogs];

    onUpdateReport({
      ...report,
      items: updatedItems,
      inboundLogs: updatedLogs
    });

    setInboundBal("");
    setInboundLembar("");
    setInboundBatch("");
    setInboundCatatan("");
    showNotification(
      `Penerimaan [${kolomTitle}] +${addedLembar.toLocaleString("id-ID")} lbr (${item.namaKarung}) ke Sloct ${targetSloc} berhasil dicatat & masuk Log!`,
      "success"
    );
  };

  // Log Handlers & Filtering
  const executeDeleteInboundLog = (logId: string) => {
    const currentLogs = report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED;
    const updatedLogs = currentLogs.filter((l) => l.id !== logId);
    onUpdateReport({ ...report, inboundLogs: updatedLogs });
    showNotification("Catatan log penerimaan berhasil dihapus", "info");
    setInboundLogToDelete(null);
  };

  const handleDeleteInboundLog = (logId: string) => {
    const log = (report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED).find((l) => l.id === logId);
    if (log) {
      setInboundLogToDelete(log);
    } else {
      executeDeleteInboundLog(logId);
    }
  };

  const filteredInboundLogs = useMemo(() => {
    const allLogs = report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED;
    return allLogs.filter((log) => {
      // Date filter
      if (logFilterDateMode === "today" && log.tanggal !== selectedDate) {
        return false;
      }
      if (logFilterDateMode === "custom" && log.tanggal !== logCustomDate) {
        return false;
      }

      // Column filter
      if (logFilterKolom !== "all" && log.kolom !== logFilterKolom) {
        return false;
      }

      // Search
      if (logSearchQuery.trim() !== "") {
        const query = logSearchQuery.toLowerCase();
        const matchCode = log.kode.toLowerCase().includes(query);
        const matchName = log.namaKarung.toLowerCase().includes(query);
        const matchSloct = (log.sloct || "").toLowerCase().includes(query);
        const matchNote = (log.catatan || "").toLowerCase().includes(query);
        const matchOp = (log.operator || "").toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchSloct && !matchNote && !matchOp) {
          return false;
        }
      }

      return true;
    });
  }, [report.inboundLogs, logFilterDateMode, selectedDate, logCustomDate, logFilterKolom, logSearchQuery]);

  const logMetrics = useMemo(() => {
    let totalLembar = 0;
    let totalBal = 0;
    let totalPembelian = 0;
    let totalRetur = 0;
    let totalLainLain = 0;

    filteredInboundLogs.forEach((l) => {
      const lembar = l.jmlLembar || 0;
      totalLembar += lembar;
      totalBal += l.jmlBal || 0;

      if (l.kolom === "pembelian") {
        totalPembelian += lembar;
      } else if (l.kolom === "returProduksi") {
        totalRetur += lembar;
      } else {
        totalLainLain += lembar;
      }
    });

    return {
      count: filteredInboundLogs.length,
      totalLembar,
      totalBal: Math.round(totalBal * 10) / 10,
      totalPembelian,
      totalRetur,
      totalLainLain
    };
  }, [filteredInboundLogs]);

  const handleExportLogCSV = () => {
    const headers = [
      "No",
      "Tanggal",
      "Waktu",
      "Kode Barang",
      "Nama Karung",
      "Kategori",
      "SLoct / Kavling",
      "Klasifikasi Masuk",
      "Jumlah Lembar",
      "Jumlah Bal",
      "Catatan / PO",
      "Petugas / Operator"
    ];

    const rows = filteredInboundLogs.map((log, idx) => {
      const kolomLabel =
        log.kolom === "pembelian"
          ? "Pembelian (PO)"
          : log.kolom === "returProduksi"
          ? "Retur Produksi"
          : "Lain-lain";

      return [
        idx + 1,
        `"${log.tanggal}"`,
        `"${log.waktu || "-"}"`,
        `"${log.kode}"`,
        `"${log.namaKarung}"`,
        `"${log.kategori || "-"}"`,
        `"${log.sloct || "-"}"`,
        `"${kolomLabel}"`,
        log.jmlLembar,
        log.jmlBal || 0,
        `"${(log.catatan || "").replace(/"/g, '""')}"`,
        `"${log.operator || "-"}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Log_Penerimaan_Karung_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Data Log Penerimaan berhasil diexport ke CSV!", "success");
  };

  // Outbound Logs List and Filter
  const outboundLogs = report.outboundLogs || DEFAULT_OUTBOUND_LOGS_SEED;

  // Filter Outbound Logs by Selected Date (Automatically empty on next day / new date) & Material
  const filteredOutboundLogs = useMemo(() => {
    return outboundLogs.filter((log) => {
      // Must match active date
      if (log.tanggal !== selectedDate) return false;
      // Filter by material if selected
      if (outboundMaterialFilter !== "all" && log.itemId !== outboundMaterialFilter && log.kode !== outboundMaterialFilter) {
        return false;
      }
      return true;
    });
  }, [outboundLogs, selectedDate, outboundMaterialFilter]);

  const outboundMetrics = useMemo(() => {
    let totalLembar = 0;
    let totalBal = 0;
    let totalBonProduksi = 0;
    let totalGudang = 0;
    let totalOverZak = 0;
    let totalLainLain = 0;

    filteredOutboundLogs.forEach((l) => {
      const qty = l.jmlLembar || 0;
      totalLembar += qty;
      totalBal += l.jmlBal || 0;
      if (l.kolom === "bonProduksi") totalBonProduksi += qty;
      else if (l.kolom === "gudangKeluar") totalGudang += qty;
      else if (l.kolom === "overZak") totalOverZak += qty;
      else if (l.kolom === "keluarLainLain") totalLainLain += qty;
    });

    return {
      totalTransaksi: filteredOutboundLogs.length,
      totalLembar,
      totalBal: Math.round(totalBal * 10) / 10,
      totalBonProduksi,
      totalGudang,
      totalOverZak,
      totalLainLain
    };
  }, [filteredOutboundLogs]);

  // Outbound Handler
  const handleProcessOutbound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outboundItemId) {
      showNotification("Pilih jenis karung terlebih dahulu!", "error");
      return;
    }

    const item = items.find((it) => it.id === outboundItemId);
    if (!item) return;

    const usedLembar = Number(outboundLembar) || 0;
    if (usedLembar <= 0) {
      showNotification("Masukkan Jumlah (Lembar) yang valid!", "error");
      return;
    }

    const currentStock = (item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0) - (item.afkir || 0);

    // Update specific outbound column
    const newBonProduksi = (item.bonProduksi || 0) + (outboundKolom === "bonProduksi" ? usedLembar : 0);
    const newGudangKeluar = (item.gudangKeluar || 0) + (outboundKolom === "gudangKeluar" ? usedLembar : 0);
    const newOverZak = (item.overZak || 0) + (outboundKolom === "overZak" ? usedLembar : 0);
    const newKeluarLainLain = (item.keluarLainLain || 0) + (outboundKolom === "keluarLainLain" ? usedLembar : 0);

    const subTotalKeluar = newBonProduksi + newGudangKeluar + newOverZak + newKeluarLainLain;
    const lembarPerBal = item.lembarPerBal || 500;
    const subTotalKeluarBal = Math.round((subTotalKeluar / lembarPerBal) * 10) / 10;
    const jmlBalThisTransaction = Math.round((usedLembar / lembarPerBal) * 10) / 10;

    // FIFO Lots Deduction
    let remainingToDeduct = usedLembar;
    let updatedLots = (item.fifoLots || []).map((lot) => ({ ...lot }));

    if (updatedLots.length > 0) {
      updatedLots = updatedLots
        .map((lot) => {
          if (remainingToDeduct <= 0) return lot;
          if (lot.jmlLembar <= remainingToDeduct) {
            remainingToDeduct -= lot.jmlLembar;
            return { ...lot, jmlLembar: 0 };
          } else {
            const newQty = lot.jmlLembar - remainingToDeduct;
            remainingToDeduct = 0;
            return { ...lot, jmlLembar: newQty };
          }
        })
        .filter((lot) => lot.jmlLembar > 0);
    }

    const kolomLabelMap: Record<string, string> = {
      bonProduksi: "Bon Produksi",
      gudangKeluar: "Gudang",
      overZak: "Over Sak",
      keluarLainLain: "Lain-lain"
    };
    const labelKolom = kolomLabelMap[outboundKolom] || "Pengeluaran";

    const transactionDate = outboundTanggal || selectedDate;
    const formattedLastUsed = formatDDMMYY(transactionDate);
    const usageAge = calculateAgeInDays(transactionDate, selectedDate);

    // Create current timestamp HH:mm:ss
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const newLog: KarungOutboundLog = {
      id: `outbound-${Date.now()}`,
      tanggal: transactionDate,
      waktu: timeStr,
      itemId: item.id,
      kode: item.kode,
      namaKarung: item.namaKarung,
      kategori: item.kategori,
      sloct: item.gudangKav || "3001",
      kolom: outboundKolom,
      jmlLembar: usedLembar,
      jmlBal: jmlBalThisTransaction,
      catatan: outboundCatatan,
      operator: report.dibuatOlehName || "Admin Warehouse"
    };

    const updatedItems = items.map((it) => {
      if (it.id !== item.id) return it;
      return {
        ...it,
        bonProduksi: newBonProduksi,
        gudangKeluar: newGudangKeluar,
        overZak: newOverZak,
        keluarLainLain: newKeluarLainLain,
        keluar: subTotalKeluar,
        keluarBal: subTotalKeluarBal,
        tglPemakaianTerakhir: formattedLastUsed,
        umurPemakaianHari: usageAge,
        fifoLots: updatedLots.length > 0 ? updatedLots : it.fifoLots,
        keterangan: outboundCatatan
          ? `${it.keterangan || ""} | [${labelKolom}] ${outboundCatatan}`.trim()
          : it.keterangan
      };
    });

    onUpdateReport({
      ...report,
      items: updatedItems,
      outboundLogs: [newLog, ...outboundLogs]
    });

    setOutboundLembar("");
    setOutboundCatatan("");
    showNotification(
      `Pengeluaran [${labelKolom}] -${usedLembar.toLocaleString("id-ID")} Lembar (${item.namaKarung}) berhasil dicatat!`,
      "success"
    );
  };

  const executeDeleteOutboundLog = (logId: string) => {
    const logToDelete = outboundLogs.find((l) => l.id === logId);
    if (!logToDelete) {
      setOutboundLogToDelete(null);
      return;
    }

    const targetItem = items.find((it) => it.id === logToDelete.itemId || it.kode === logToDelete.kode);
    let updatedItems = items;

    if (targetItem) {
      const qty = logToDelete.jmlLembar || 0;
      const newBon = logToDelete.kolom === "bonProduksi" ? Math.max(0, (targetItem.bonProduksi || 0) - qty) : targetItem.bonProduksi;
      const newGudang = logToDelete.kolom === "gudangKeluar" ? Math.max(0, (targetItem.gudangKeluar || 0) - qty) : targetItem.gudangKeluar;
      const newOver = logToDelete.kolom === "overZak" ? Math.max(0, (targetItem.overZak || 0) - qty) : targetItem.overZak;
      const newLain = logToDelete.kolom === "keluarLainLain" ? Math.max(0, (targetItem.keluarLainLain || 0) - qty) : targetItem.keluarLainLain;

      const totalKeluar = (newBon || 0) + (newGudang || 0) + (newOver || 0) + (newLain || 0);
      const lembarPerBal = targetItem.lembarPerBal || 500;

      updatedItems = items.map((it) => {
        if (it.id !== targetItem.id) return it;
        return {
          ...it,
          bonProduksi: newBon,
          gudangKeluar: newGudang,
          overZak: newOver,
          keluarLainLain: newLain,
          keluar: totalKeluar,
          keluarBal: Math.round((totalKeluar / lembarPerBal) * 10) / 10
        };
      });
    }

    const updatedLogs = outboundLogs.filter((l) => l.id !== logId);
    onUpdateReport({
      ...report,
      items: updatedItems,
      outboundLogs: updatedLogs
    });

    showNotification("Catatan log pengeluaran berhasil dihapus & stok mutasi dikembalikan.", "info");
    setOutboundLogToDelete(null);
  };

  const handleDeleteOutboundLog = (logId: string) => {
    const log = outboundLogs.find((l) => l.id === logId);
    if (log) {
      setOutboundLogToDelete(log);
    } else {
      executeDeleteOutboundLog(logId);
    }
  };

  const handleExportOutboundLogCSV = () => {
    const headers = [
      "No",
      "Tanggal",
      "Waktu",
      "Kode Barang",
      "Nama Karung",
      "Kategori",
      "SLoct / Kavling",
      "Kolom Pengeluaran",
      "Jumlah Lembar",
      "Jumlah Bal",
      "Catatan / SPK",
      "Petugas"
    ];

    const rows = filteredOutboundLogs.map((log, idx) => {
      const kolomLabel =
        log.kolom === "bonProduksi"
          ? "Bon Produksi"
          : log.kolom === "gudangKeluar"
          ? "Gudang"
          : log.kolom === "overZak"
          ? "Over Sak"
          : "Lain-lain";

      return [
        idx + 1,
        `"${log.tanggal}"`,
        `"${log.waktu || "-"}"`,
        `"${log.kode}"`,
        `"${log.namaKarung}"`,
        `"${log.kategori || "-"}"`,
        `"${log.sloct || "-"}"`,
        `"${kolomLabel}"`,
        log.jmlLembar,
        log.jmlBal || 0,
        `"${(log.catatan || "").replace(/"/g, '""')}"`,
        `"${log.operator || "-"}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Log_Pengeluaran_Karung_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Data Log Pengeluaran berhasil diexport ke CSV!", "success");
  };

  // Export Excel (.xls) matching Official Print Layout
  const handleExportOfficialExcel = () => {
    const sLoc = report.gudangSLoct || "3001";
    const companyTitle = report.companyName || "PT JAPFA COMFEED INDONESIA TBK";
    const mainTitle = report.title || "LAPORAN INFO KAVLING & STOK";
    const subTitle = report.subTitle || "BAHAN PEMBUNGKUS";
    const docCode = report.docCode || "FM-03-01";
    const dibuatOleh = report.dibuatOlehName || "M. Nurul Rohman";
    const dibuatRole = report.dibuatOlehRole || "Adm. Warehouse & Sacks";
    const mengetahui = report.mengetahuiName || "Puguh Prasetyo";
    const mengetahuiRole = report.mengetahuiRole || "Head of WH - Raw Material & Feed Sacks";

    let totalStockAwal = 0;
    let totalPembelian = 0;
    let totalRetur = 0;
    let totalMasukLain = 0;
    let totalSubMasuk = 0;
    let totalBon = 0;
    let totalGudang = 0;
    let totalOver = 0;
    let totalKeluarLain = 0;
    let totalSubKeluar = 0;
    let totalStockAkhir = 0;
    const maxFifo = Math.max(3, ...items.map(i => (i.fifoLots || []).length));
    const fifoLotsTotalQty = Array(maxFifo).fill(0);

    items.forEach((it) => {
      const pembelian = it.pembelian || 0;
      const retur = it.returProduksi || 0;
      const masukLain = it.masukLainLain || 0;
      const subMasuk = pembelian + retur + masukLain;

      const bon = it.bonProduksi || 0;
      const gudang = it.gudangKeluar || 0;
      const over = it.overZak || 0;
      const keluarLain = it.keluarLainLain || 0;
      const subKeluar = bon + gudang + over + keluarLain;

      const stockAwal = it.stockAwal || 0;
      const stockAkhir = stockAwal + subMasuk - subKeluar - (it.afkir || 0);

      totalStockAwal += stockAwal;
      totalPembelian += pembelian;
      totalRetur += retur;
      totalMasukLain += masukLain;
      totalSubMasuk += subMasuk;
      totalBon += bon;
      totalGudang += gudang;
      totalOver += over;
      totalKeluarLain += keluarLain;
      totalSubKeluar += subKeluar;
      totalStockAkhir += stockAkhir;

      (it.fifoLots || []).forEach((l, idx) => {
        if (idx < maxFifo) {
          fifoLotsTotalQty[idx] += (l.jmlLembar || 0);
        }
      });
    });

    const totalCols = 15 + maxFifo + 1;

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${docCode} - Format Cetak</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10pt; }
          th, td { border: 1px solid #000000; padding: 4px 6px; }
          .header-title { font-size: 13pt; font-weight: bold; text-align: center; }
          .header-meta { font-size: 9pt; font-weight: bold; }
          .bg-header { background-color: #F3F4F6; font-weight: bold; text-align: center; }
          .bg-subgroup { background-color: #E5E7EB; font-weight: bold; text-align: center; }
          .bg-category { background-color: #FEF08A; font-weight: bold; font-size: 11pt; }
          .bg-total { background-color: #F3F4F6; font-weight: bold; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .text-red { color: #E00000; font-weight: bold; }
          .text-blue { color: #0044EE; font-weight: bold; }
          .text-spec { color: #0055FF; font-size: 8.5pt; font-weight: normal; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="4" class="header-meta text-left" style="vertical-align: top; border: none;">
              <strong style="font-size: 11pt;">${companyTitle}</strong><br/>
              <span>Hari / Tanggal : ${formatDDMMYY(selectedDate)}</span>
            </td>
            <td colspan="${totalCols - 6}" class="header-title" style="border: none;">
              ${mainTitle}<br/>
              ${subTitle}<br/>
              <span style="font-size: 10pt;">GUDANG/S. LOC : ${sLoc} &nbsp;&nbsp; ( Satuan Lembar )</span>
            </td>
            <td colspan="2" class="header-meta text-right" style="vertical-align: top; border: none; font-size: 11pt; font-family: monospace;">
              <strong>${docCode}</strong>
            </td>
          </tr>
          <tr><td colspan="${totalCols}" style="border: none; height: 8px;"></td></tr>

          <tr>
            <th rowspan="2" class="bg-header" style="width: 35px;">NO</th>
            <th rowspan="2" class="bg-header" style="width: 90px;">KODE</th>
            <th rowspan="2" class="bg-header" style="width: 220px;">JENIS BARANG</th>
            <th rowspan="2" class="bg-header" style="width: 100px;">TGL PEMAKAIAN<br/>TERAKHIR</th>
            <th rowspan="2" class="bg-header" style="width: 80px;">STOCK<br/>AWAL</th>
            <th colspan="3" class="bg-subgroup">PENERIMAAN</th>
            <th rowspan="2" class="bg-header" style="width: 75px;">SUB TOTAL</th>
            <th colspan="4" class="bg-subgroup">PENGELUARAN</th>
            <th rowspan="2" class="bg-header" style="width: 75px;">SUB TOTAL</th>
            <th rowspan="2" class="bg-header" style="width: 85px;">STOCK AKHIR</th>
            <th colspan="${1 + maxFifo}" class="bg-subgroup">URUTAN PEMAKAIAN SESUAI FIFO ( KAV, TANGGAL MASUK, UMUR, JML LEMBAR )</th>
            <th rowspan="2" class="bg-header" style="width: 130px;">KETERANGAN</th>
          </tr>

          <tr>
            <th class="bg-header" style="width: 70px;">PEMBELIAN</th>
            <th class="bg-header" style="width: 75px;">RETUR PRODUKSI</th>
            <th class="bg-header" style="width: 70px;">LAIN LAIN</th>
            <th class="bg-header" style="width: 70px;">BON PRODUKSI</th>
            <th class="bg-header" style="width: 70px;">GUDANG</th>
            <th class="bg-header" style="width: 70px;">OVER ZAK</th>
            <th class="bg-header" style="width: 70px;">LAIN LAIN</th>
            <th class="bg-header" style="width: 75px; font-size: 8.5pt;">PARAMETER</th>
            ${Array.from({ length: maxFifo }).map((_, i) => `<th class="bg-header" style="width: 80px;">LOT ${i + 1}</th>`).join("")}
          </tr>

          <tr>
            <td colspan="${totalCols}" class="bg-category"><strong>I. KARUNG</strong></td>
          </tr>

          ${items.map((it, idx) => {
            const pembelian = it.pembelian || 0;
            const retur = it.returProduksi || 0;
            const masukLain = it.masukLainLain || 0;
            const subMasuk = pembelian + retur + masukLain;

            const bon = it.bonProduksi || 0;
            const gudang = it.gudangKeluar || 0;
            const over = it.overZak || 0;
            const keluarLain = it.keluarLainLain || 0;
            const subKeluar = bon + gudang + over + keluarLain;

            const stockAwal = it.stockAwal || 0;
            const stockAkhir = stockAwal + subMasuk - subKeluar - (it.afkir || 0);

            const usageDateStr = it.tglPemakaianTerakhir ? formatDDMMYY(it.tglPemakaianTerakhir) : "-";
            const usageAge = it.tglPemakaianTerakhir ? calculateAgeInDays(it.tglPemakaianTerakhir, selectedDate) : (it.umurPemakaianHari || 0);
            const usageCell = it.tglPemakaianTerakhir ? `<strong>${usageDateStr}</strong><br/><span style="font-size: 8.5pt; color: #555;">${usageAge} hari</span>` : "-";

            const lots = it.fifoLots || [];
            const paramCell = "Kav.<br/>Tgl.Masuk<br/>Umur<br/>Jumlah Lembar";

            return `
              <!-- SUB-ROW 1: Kav. -->
              <tr>
                <td rowspan="4" class="text-center bold" style="vertical-align: middle;">${idx + 1}</td>
                <td rowspan="4" class="text-center bold" style="mso-number-format:'\\@'; vertical-align: middle; font-family: monospace;">${it.kode}</td>
                <td rowspan="4" class="text-left" style="vertical-align: middle;">
                  <strong>${it.namaKarung}</strong>
                  ${it.spesifikasi ? `<br/><span class="text-spec">${it.spesifikasi}</span>` : ""}
                </td>
                <td rowspan="4" class="text-center" style="vertical-align: middle;">${usageCell}</td>
                <td rowspan="4" class="text-right bold" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${stockAwal.toLocaleString("id-ID")}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${pembelian > 0 ? pembelian.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${retur > 0 ? retur.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${masukLain > 0 ? masukLain.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right bold" style="vertical-align: middle; background-color: #FAFAFA; mso-number-format:'\\#\\,\\#\\#0';">${subMasuk.toLocaleString("id-ID")}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${bon > 0 ? bon.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${gudang > 0 ? gudang.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${over > 0 ? over.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${keluarLain > 0 ? keluarLain.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right bold" style="vertical-align: middle; background-color: #FAFAFA; mso-number-format:'\\#\\,\\#\\#0';">${subKeluar.toLocaleString("id-ID")}</td>
                <td rowspan="4" class="text-right bold" style="vertical-align: middle; background-color: #F3F4F6; mso-number-format:'\\#\\,\\#\\#0';">${stockAkhir.toLocaleString("id-ID")}</td>
                <td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px;">Kav.</td>
                ${Array.from({ length: maxFifo }).map((_, lIdx) => {
                  const lot = lots[lIdx];
                  return `<td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px; font-family: monospace;">${lot ? (lot.kav || sLoc) : "-"}</td>`;
                }).join("")}
                <td rowspan="4" class="text-left" style="vertical-align: middle; font-size: 8.5pt;">${it.keterangan || "-"}</td>
              </tr>

              <!-- SUB-ROW 2: Tgl.Masuk -->
              <tr>
                <td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px;">Tgl.Masuk</td>
                ${Array.from({ length: maxFifo }).map((_, lIdx) => {
                  const lot = lots[lIdx];
                  const lotDate = lot && lot.tglMasuk ? formatDDMMYY(lot.tglMasuk) : "-";
                  return `<td class="text-center bold text-red" style="vertical-align: middle; color: #DC2626; border: 1px solid #000000; padding: 3px 6px; font-family: monospace;">${lotDate}</td>`;
                }).join("")}
              </tr>

              <!-- SUB-ROW 3: Umur -->
              <tr>
                <td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px;">Umur</td>
                ${Array.from({ length: maxFifo }).map((_, lIdx) => {
                  const lot = lots[lIdx];
                  const lotAge = lot ? (lot.tglMasuk ? calculateAgeInDays(lot.tglMasuk, selectedDate) : (lot.umurHari || 0)) : null;
                  const lotAgeStr = lotAge !== null ? `${lotAge} Hari` : "-";
                  return `<td class="text-center bold text-blue" style="vertical-align: middle; color: #2563EB; border: 1px solid #000000; padding: 3px 6px; font-family: monospace;">${lotAgeStr}</td>`;
                }).join("")}
              </tr>

              <!-- SUB-ROW 4: Jumlah Lembar -->
              <tr>
                <td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px;">Jumlah Lembar</td>
                ${Array.from({ length: maxFifo }).map((_, lIdx) => {
                  const lot = lots[lIdx];
                  const lotQty = lot && lot.jmlLembar ? lot.jmlLembar.toLocaleString("id-ID") : "-";
                  return `<td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px; font-family: monospace; mso-number-format:'\\#\\,\\#\\#0';">${lotQty}</td>`;
                }).join("")}
              </tr>
            `;
          }).join("")}

          <tr class="bg-total">
            <td colspan="4" class="text-center bold">TOTAL KESELURUHAN</td>
            <td class="text-right bold">${totalStockAwal.toLocaleString("id-ID")}</td>
            <td class="text-right bold">${totalPembelian > 0 ? totalPembelian.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold">${totalRetur > 0 ? totalRetur.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold">${totalMasukLain > 0 ? totalMasukLain.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold">${totalSubMasuk.toLocaleString("id-ID")}</td>
            <td class="text-right bold">${totalBon > 0 ? totalBon.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold">${totalGudang > 0 ? totalGudang.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold">${totalOver > 0 ? totalOver.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold">${totalKeluarLain > 0 ? totalKeluarLain.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold">${totalSubKeluar.toLocaleString("id-ID")}</td>
            <td class="text-right bold">${totalStockAkhir.toLocaleString("id-ID")}</td>
            <td class="text-center bold">Total Qty</td>
            ${fifoLotsTotalQty.map((q) => `<td class="text-center bold">${q > 0 ? q.toLocaleString("id-ID") : "-"}</td>`).join("")}
            <td class="text-center">-</td>
          </tr>

          <tr><td colspan="${totalCols}" style="border: none; height: 25px;"></td></tr>
          <tr>
            <td colspan="4" class="text-center" style="border: none;">
              <strong>Dibuat Oleh,</strong><br/><br/><br/><br/>
              <u><strong>${dibuatOleh}</strong></u><br/>
              <span style="font-size: 8.5pt;">${dibuatRole}</span>
            </td>
            <td colspan="${totalCols - 8}" class="text-center" style="border: none;">
              <strong>Diperiksa Oleh,</strong><br/><br/><br/><br/>
              <u><strong>Supervisor Gudang</strong></u><br/>
              <span style="font-size: 8.5pt;">Spv. Warehouse & Sacks</span>
            </td>
            <td colspan="4" class="text-center" style="border: none;">
              <strong>Mengetahui,</strong><br/><br/><br/><br/>
              <u><strong>${mengetahui}</strong></u><br/>
              <span style="font-size: 8.5pt;">${mengetahuiRole}</span>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + excelHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Format_Cetak_${sLoc}_${selectedDate}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Format Cetak Laporan berhasil diekspor ke Excel (.xls)!", "success");
  };

  // Export CSV Format Cetak Resmi
  const handleExportCSV = () => {
    const sLoc = report.gudangSLoct || "3001";
    const companyTitle = report.companyName || "PT JAPFA COMFEED INDONESIA TBK";
    const mainTitle = report.title || "LAPORAN INFO KAVLING & STOK";
    const subTitle = report.subTitle || "BAHAN PEMBUNGKUS";
    const docCode = report.docCode || "FM-03-01";
    const maxFifo = Math.max(3, ...items.map(i => (i.fifoLots || []).length));
    
    let csv = "";
    csv += `"${companyTitle}"\n`;
    csv += `"${mainTitle} - ${subTitle}"\n`;
    csv += `"GUDANG/S. LOC : ${sLoc}","( Satuan Lembar )","No Form : ${docCode}"\n`;
    csv += `"Hari / Tanggal : ${formatDDMMYY(selectedDate)}"\n\n`;

    let headerRow1 = "NO,KODE,JENIS BARANG,SPESIFIKASI,TGL PEMAKAIAN TERAKHIR,UMUR (HARI),STOCK AWAL,PENERIMAAN,PENERIMAAN,PENERIMAAN,SUB TOTAL MASUK,PENGELUARAN,PENGELUARAN,PENGELUARAN,PENGELUARAN,SUB TOTAL KELUAR,STOCK AKHIR";
    let headerRow2 = ",,,,,,PEMBELIAN,RETUR PRODUKSI,LAIN LAIN,,,BON PRODUKSI,GUDANG,OVER ZAK,LAIN LAIN,,";

    for (let i = 1; i <= maxFifo; i++) {
      headerRow1 += `,URUTAN FIFO LOT ${i},LOT ${i} TGL MASUK,LOT ${i} UMUR (HARI),LOT ${i} JML (LBR)`;
      headerRow2 += ",KAV,TGL MASUK,UMUR,JML LEMBAR";
    }
    headerRow1 += ",KETERANGAN\n";
    headerRow2 += ",\n";

    csv += headerRow1 + headerRow2;
    csv += `"I. KARUNG",,,,,,,,,,,,,,,,,,,,,,,,,,,,\n`;

    let totalStockAwal = 0;
    let totalPembelian = 0;
    let totalRetur = 0;
    let totalMasukLain = 0;
    let totalSubMasuk = 0;
    let totalBon = 0;
    let totalGudang = 0;
    let totalOver = 0;
    let totalKeluarLain = 0;
    let totalSubKeluar = 0;
    let totalStockAkhir = 0;
    const fifoLotsTotalQty = Array(maxFifo).fill(0);

    items.forEach((it, idx) => {
      const pembelian = it.pembelian || 0;
      const retur = it.returProduksi || 0;
      const masukLain = it.masukLainLain || 0;
      const subMasuk = pembelian + retur + masukLain;

      const bon = it.bonProduksi || 0;
      const gudang = it.gudangKeluar || 0;
      const over = it.overZak || 0;
      const keluarLain = it.keluarLainLain || 0;
      const subKeluar = bon + gudang + over + keluarLain;

      const stockAwal = it.stockAwal || 0;
      const stockAkhir = stockAwal + subMasuk - subKeluar - (it.afkir || 0);

      totalStockAwal += stockAwal;
      totalPembelian += pembelian;
      totalRetur += retur;
      totalMasukLain += masukLain;
      totalSubMasuk += subMasuk;
      totalBon += bon;
      totalGudang += gudang;
      totalOver += over;
      totalKeluarLain += keluarLain;
      totalSubKeluar += subKeluar;
      totalStockAkhir += stockAkhir;

      const autoUsageAge = it.tglPemakaianTerakhir ? calculateAgeInDays(it.tglPemakaianTerakhir, selectedDate) : (it.umurPemakaianHari || 0);
      const lots = it.fifoLots || [];

      let row = `"${idx + 1}","${it.kode}","${it.namaKarung.replace(/"/g, '""')}","${(it.spesifikasi || "").replace(/"/g, '""')}","${it.tglPemakaianTerakhir ? formatDDMMYY(it.tglPemakaianTerakhir) : "-"}","${autoUsageAge}","${stockAwal}","${pembelian}","${retur}","${masukLain}","${subMasuk}","${bon}","${gudang}","${over}","${keluarLain}","${subKeluar}","${stockAkhir}"`;

      for (let i = 0; i < maxFifo; i++) {
        const lot = lots[i];
        if (lot) {
          const autoLotAge = lot.tglMasuk ? calculateAgeInDays(lot.tglMasuk, selectedDate) : (lot.umurHari || 0);
          fifoLotsTotalQty[i] += (lot.jmlLembar || 0);
          row += `,"${lot.kav || sLoc}","${lot.tglMasuk ? formatDDMMYY(lot.tglMasuk) : "-"}","${autoLotAge}","${lot.jmlLembar || 0}"`;
        } else {
          row += `,"-","-","-","0"`;
        }
      }

      row += `,"${(it.keterangan || "").replace(/"/g, '""')}"\n`;
      csv += row;
    });

    let sumRow = `"TOTAL KESELURUHAN",,,,,,"${totalStockAwal}","${totalPembelian}","${totalRetur}","${totalMasukLain}","${totalSubMasuk}","${totalBon}","${totalGudang}","${totalOver}","${totalKeluarLain}","${totalSubKeluar}","${totalStockAkhir}"`;
    for (let i = 0; i < maxFifo; i++) {
      sumRow += `,"","","","${fifoLotsTotalQty[i]}"`;
    }
    sumRow += `,""\n\n`;
    csv += sumRow;

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Format_Cetak_${sLoc}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Format Cetak Laporan berhasil diexport ke CSV!", "success");
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in font-sans">
      {/* TOP HEADER CONTROLS */}
      <div className="bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif italic text-xl font-black text-neutral-900">
                  Manajemen & Mutasi Stock Karung
                </h2>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Feed Sack Inventory
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Monitoring kemasan karung pakan 50kg, 25kg, inner plastik, jumbo bag, dan reject pabrik.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (isGuest) {
                  showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menyimpan data!", "error");
                  return;
                }
                if (onSaveStock) {
                  onSaveStock();
                } else {
                  onUpdateReport(report);
                  showNotification("Data Stock Karung berhasil disimpan!", "success");
                }
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Simpan data stock karung ke database"
            >
              <Save className="w-4 h-4 text-amber-100" /> Simpan Stock Karung
            </button>
            <button
              onClick={() => {
                if (isGuest) {
                  showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menambah data!", "error");
                  return;
                }
                if (canEditReport !== undefined && !canEditReport) {
                  showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
                  return;
                }
                setIsAddModalOpen(true);
              }}
              disabled={canEditReport === false || isGuest}
              className={`px-3.5 py-2 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-xs ${
                canEditReport === false || isGuest 
                  ? "bg-neutral-400 opacity-60 cursor-not-allowed" 
                  : "bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
              }`}
              title={canEditReport === false || isGuest ? "Hanya akun atas nama Sabto dan Antonius yang dapat menambah karung" : "Tambah karung baru"}
            >
              <Plus className="w-4 h-4" /> Tambah Karung Baru
            </button>
            <button
              onClick={handleExportOfficialExcel}
              className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download Excel (.xls) dengan format cetak resmi lengkap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> Ekspor Excel (Format Cetak)
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV dengan format cetak resmi"
            >
              <Download className="w-4 h-4 text-neutral-700" /> Ekspor CSV (Format Cetak)
            </button>
            <button
              onClick={() => setActiveSubTab(activeSubTab === "print" ? "table" : "print")}
              className={`px-3 py-2 text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer border ${
                activeSubTab === "print"
                  ? "bg-[#1A1A1A] text-white border-black"
                  : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300"
              }`}
            >
              <Printer className="w-4 h-4 text-neutral-700" /> 
              {activeSubTab === "print" ? "Kembali ke Tabel" : "Cetak Laporan Karung"}
            </button>
          </div>
        </div>

        {/* DATE NAVIGATION & STOCK MUTASI CARRY-OVER STATUS BAR */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-[#FAF9F6] border-2 border-neutral-800 p-3 rounded">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 bg-white border border-neutral-300 rounded p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => handleOffsetDate(-1)}
                disabled={!onDateChange}
                title="Pindah ke Hari Sebelumnya"
                className="p-1 hover:bg-neutral-100 disabled:opacity-30 rounded text-neutral-700 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange && e.target.value && onDateChange(e.target.value)}
                  className="font-mono font-bold text-xs bg-transparent border-0 focus:outline-none cursor-pointer text-neutral-900"
                />
              </div>
              <button
                type="button"
                onClick={() => handleOffsetDate(1)}
                disabled={!onDateChange}
                title="Pindah ke Hari Berikutnya"
                className="p-1 hover:bg-neutral-100 disabled:opacity-30 rounded text-neutral-700 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300 px-2.5 py-1.5 rounded text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Stok Akhir otomatis dibawa ke Stok Awal tanggal berikutnya</span>
            </div>
          </div>

          {onSyncFromPreviousDay && (
            <button
              type="button"
              onClick={onSyncFromPreviousDay}
              className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-400 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Sinkronkan ulang Stok Awal hari ini dari Stok Akhir hari sebelumnya"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
              <span>Sinkronkan Stok dari {previousReportDate || "Kemarin"}</span>
            </button>
          )}
        </div>

        {/* KPI METRIC CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-[#FAF9F6] border border-neutral-300 p-3 rounded">
            <div className="text-[10px] font-bold uppercase text-neutral-500">Total Jenis Karung</div>
            <div className="text-xl font-bold font-serif text-neutral-900 mt-1">
              {metrics.totalItems} <span className="text-xs font-sans font-normal text-neutral-500">Item</span>
            </div>
          </div>

          <div className="bg-[#FAF9F6] border border-neutral-300 p-3 rounded">
            <div className="text-[10px] font-bold uppercase text-neutral-500">Stok Awal Total</div>
            <div className="text-xl font-bold font-mono text-neutral-800 mt-1">
              {metrics.totalStockAwal.toLocaleString("id-ID")} <span className="text-[10px] font-sans text-neutral-500">Lbr</span>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-300/80 p-3 rounded">
            <div className="text-[10px] font-bold uppercase text-emerald-800">Total Masuk (PO)</div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              +{metrics.totalMasuk.toLocaleString("id-ID")} <span className="text-[10px] font-sans text-emerald-800">Lbr</span>
            </div>
          </div>

          <div className="bg-rose-50/50 border border-rose-300/80 p-3 rounded">
            <div className="text-[10px] font-bold uppercase text-rose-800">Pakai Produksi</div>
            <div className="text-xl font-bold font-mono text-rose-700 mt-1">
              -{metrics.totalKeluar.toLocaleString("id-ID")} <span className="text-[10px] font-sans text-rose-800">Lbr</span>
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-300/80 p-3 rounded">
            <div className="text-[10px] font-bold uppercase text-amber-800">Afkir / Rusak</div>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">
              {metrics.totalAfkir.toLocaleString("id-ID")} <span className="text-[10px] font-sans text-amber-800">Lbr</span>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-300/80 p-3 rounded">
            <div className="text-[10px] font-bold uppercase text-blue-900">Sisa Stok Akhir</div>
            <div className="text-xl font-bold font-mono text-blue-800 mt-1">
              {metrics.totalStockAkhir.toLocaleString("id-ID")} <span className="text-[10px] font-sans text-blue-900">Lbr</span>
            </div>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="flex flex-wrap border-b border-neutral-200 mt-5 gap-2">
          <button
            onClick={() => setActiveSubTab("table")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "table"
                ? "border-amber-600 text-amber-800 font-extrabold bg-amber-50/30"
                : "border-transparent text-neutral-600 hover:text-black"
            }`}
          >
            <Layers className="w-4 h-4" /> Tabel Mutasi Karung
          </button>
          <button
            onClick={() => setActiveSubTab("inbound")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "inbound"
                ? "border-emerald-600 text-emerald-800 font-extrabold bg-emerald-50/30"
                : "border-transparent text-neutral-600 hover:text-black"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> Penerimaan Karung (Inbound)
          </button>
          <button
            onClick={() => setActiveSubTab("outbound")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "outbound"
                ? "border-rose-600 text-rose-800 font-extrabold bg-rose-50/30"
                : "border-transparent text-neutral-600 hover:text-black"
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" /> Form Pemakaian & Afkir
          </button>
          <button
            onClick={() => setActiveSubTab("print")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "print"
                ? "border-neutral-900 text-neutral-900 font-extrabold bg-neutral-100"
                : "border-transparent text-neutral-600 hover:text-black"
            }`}
          >
            <Printer className="w-4 h-4 text-neutral-700" /> Format Cetak / Laporan Resmi
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: TABLE VIEW */}
      {activeSubTab === "table" && (
        <div className="bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm print:hidden">
          {/* SEARCH & CATEGORY FILTER */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode, nama, kavling..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:border-neutral-800"
                />
              </div>

              <button
                onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                className={`px-3 py-1.5 text-xs font-bold rounded border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  filterLowStockOnly
                    ? "bg-rose-100 border-rose-300 text-rose-800"
                    : "bg-neutral-50 border-neutral-300 text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Stok Kritis ({metrics.lowStockCount})</span>
              </button>
            </div>

            <div className="text-xs text-neutral-500 font-mono">
              Menampilkan {filteredItems.length} dari {items.length} karung
            </div>
          </div>

          {/* TABLE MUTASI KARUNG */}
          <div className="overflow-x-auto border border-neutral-200 rounded">
            <table className="w-full text-left border-collapse bg-white text-xs">
              <thead>
                <tr className="bg-neutral-100/80 border-b border-neutral-300 text-neutral-700">
                  <th className="p-2.5 font-bold w-10 text-center">No</th>
                  <th className="p-2.5 font-bold w-24">Kode</th>
                  <th className="p-2.5 font-bold">Nama & Spesifikasi Karung</th>
                  <th className="p-2.5 font-bold text-center w-20">Kavling</th>
                  <th className="p-2.5 font-bold text-right bg-amber-50/40 w-28">Stok Awal (Lbr)</th>
                  <th className="p-2.5 font-bold text-right bg-emerald-50/40 w-24 text-emerald-800">Masuk (+)</th>
                  <th className="p-2.5 font-bold text-right bg-rose-50/40 w-24 text-rose-800">Keluar (-)</th>
                  <th className="p-2.5 font-bold text-right bg-amber-50/40 w-20 text-amber-800">Afkir</th>
                  <th className="p-2.5 font-bold text-right bg-blue-50/50 w-28 text-blue-900 font-mono">Stok Akhir</th>
                  <th className="p-2.5 font-bold text-center w-24">Konversi Bal</th>
                  <th className="p-2.5 font-bold text-center w-20">Status</th>
                  <th className="p-2.5 font-bold text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-neutral-400 italic">
                      Tidak ada data stock karung yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const stockAkhir = (item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0) - (item.afkir || 0);
                    const lembarPerBal = item.lembarPerBal || 500;
                    const stockAkhirBal = Math.round((stockAkhir / lembarPerBal) * 10) / 10;
                    const isLowStock = stockAkhir <= (item.minStock || 0);

                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="p-2.5 text-center font-mono text-neutral-500">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-neutral-800">{item.kode}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-neutral-900">{item.namaKarung}</div>
                          <div className="text-[10px] text-neutral-500">{item.spesifikasi}</div>
                          <div className="text-[9px] font-mono text-neutral-400 mt-0.5">
                            Supplier: {item.suplier || "-"} | PO: {item.batch || "-"}
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-amber-800">
                          {item.gudangKav || "-"}
                        </td>
                        <td className="p-2.5 text-right font-mono text-neutral-600 bg-amber-50/10">
                          {(item.stockAwal || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10">
                          {(item.masuk || 0) > 0 ? `+${(item.masuk || 0).toLocaleString("id-ID")}` : "0"}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-700 bg-rose-50/10">
                          {(item.keluar || 0) > 0 ? `-${(item.keluar || 0).toLocaleString("id-ID")}` : "0"}
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-700 bg-amber-50/10">
                          {item.afkir || 0}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                          {stockAkhir.toLocaleString("id-ID")} Lbr
                        </td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-neutral-600">
                          {stockAkhirBal} Bal
                        </td>
                        <td className="p-2.5 text-center">
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-800 rounded border border-rose-300 uppercase">
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> Kritis
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-300 uppercase">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aman
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (isGuest) {
                                  showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan mengedit data!", "error");
                                  return;
                                }
                                if (canEditReport !== undefined && !canEditReport) {
                                  showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
                                  return;
                                }
                                setEditingItem(item);
                                setIsEditModalOpen(true);
                              }}
                              disabled={canEditReport === false || isGuest}
                              className={`p-1 rounded transition-colors ${
                                canEditReport === false || isGuest 
                                  ? "opacity-30 cursor-not-allowed text-neutral-300" 
                                  : "text-neutral-500 hover:text-black hover:bg-neutral-100 cursor-pointer"
                              }`}
                              title={canEditReport === false || isGuest ? "Hanya akun atas nama Sabto dan Antonius yang dapat mengedit" : "Edit item karung"}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={canEditReport === false || isGuest}
                              className={`p-1 rounded transition-colors ${
                                canEditReport === false || isGuest 
                                  ? "opacity-30 cursor-not-allowed text-neutral-300" 
                                  : "text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              }`}
                              title={canEditReport === false || isGuest ? "Hanya akun atas nama Sabto dan Antonius yang dapat menghapus" : "Hapus karung"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* OFFICIAL SIGNATURE BLOCK FOR KARUNG */}
          <footer className="flex flex-col sm:flex-row justify-around items-end gap-8 md:gap-16 pt-8 mt-6 border-t border-dashed border-[#1A1A1A]/30 w-full max-w-3xl mx-auto print:pt-6">
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
                {report.dibuatOlehSignature ? (
                  <div 
                    onClick={() => setSignatureModal({
                      isOpen: true,
                      role: "dibuat",
                      title: "Tanda Tangan - Pembuat Laporan Karung (Admin Gudang)",
                      defaultName: report.dibuatOlehName || "Sabto A"
                    })}
                    className="w-full h-full flex items-center justify-center cursor-pointer p-1"
                  >
                    <img 
                      src={report.dibuatOlehSignature} 
                      alt="Tanda Tangan Pembuat" 
                      className="max-h-full max-w-full object-contain mix-blend-multiply"
                    />
                  </div>
                ) : (
                  <div 
                    onClick={() => setSignatureModal({
                      isOpen: true,
                      role: "dibuat",
                      title: "Tanda Tangan - Pembuat Laporan Karung (Admin Gudang)",
                      defaultName: report.dibuatOlehName || "Sabto A"
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

                {report.dibuatOlehSignature && (
                  <div className="absolute right-1 top-1 flex items-center gap-1 print:hidden">
                    <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 py-0.5 rounded border border-emerald-300">
                      Signed
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateReport({ ...report, dibuatOlehSignature: null });
                        showNotification("Tanda tangan pembuat dihapus", "info");
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
              
              {/* Signee Metadata */}
              <div className="flex flex-col items-center gap-1 font-sans w-full text-center">
                <input
                  type="text"
                  value={report.dibuatOlehName ?? "Sabto A"}
                  onChange={(e) => onUpdateReport({ ...report, dibuatOlehName: e.target.value })}
                  className="text-xs font-bold font-serif italic text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-[#1A1A1A] focus:outline-none text-center w-full p-0 font-serif print:border-none"
                  placeholder="Sabto A"
                  title="Klik untuk mengedit nama"
                />
                <input
                  type="text"
                  value={report.dibuatOlehRole ?? "Admin Gudang"}
                  onChange={(e) => onUpdateReport({ ...report, dibuatOlehRole: e.target.value })}
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
                {report.mengetahuiSignature ? (
                  <div 
                    onClick={() => setSignatureModal({
                      isOpen: true,
                      role: "mengetahui",
                      title: "Tanda Tangan - Pihak Mengetahui (Head Of Wrh Sub.Dept)",
                      defaultName: report.mengetahuiName || "Antonius Andri Waroto"
                    })}
                    className="w-full h-full flex items-center justify-center cursor-pointer p-1"
                  >
                    <img 
                      src={report.mengetahuiSignature} 
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
                      defaultName: report.mengetahuiName || "Antonius Andri Waroto"
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

                {report.mengetahuiSignature && (
                  <div className="absolute right-1 top-1 flex items-center gap-1 print:hidden">
                    <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 py-0.5 rounded border border-emerald-300">
                      Signed
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateReport({ ...report, mengetahuiSignature: null });
                        showNotification("Tanda tangan mengetahui dihapus", "info");
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
              
              {/* Signee Metadata */}
              <div className="flex flex-col items-center gap-1 font-sans w-full text-center">
                <input
                  type="text"
                  value={report.mengetahuiName ?? "Antonius Andri Waroto"}
                  onChange={(e) => onUpdateReport({ ...report, mengetahuiName: e.target.value })}
                  className="text-xs font-bold font-serif italic text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-[#1A1A1A] focus:outline-none text-center w-full p-0 font-serif print:border-none"
                  placeholder="Antonius Andri Waroto"
                  title="Klik untuk mengedit nama"
                />
                <input
                  type="text"
                  value={report.mengetahuiRole ?? "Head Of Wrh Sub.Dept"}
                  onChange={(e) => onUpdateReport({ ...report, mengetahuiRole: e.target.value })}
                  className="text-[9px] uppercase font-bold text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-[#1A1A1A] focus:outline-none text-center w-full p-0 font-sans print:border-none"
                  placeholder="Head Of Wrh Sub.Dept"
                  title="Klik untuk mengedit jabatan"
                />
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* SUB-VIEW 2: INBOUND MANAGEMENT WORKSPACE */}
      {activeSubTab === "inbound" && (
        <div className="bg-white border-2 border-[#1A1A1A] p-5 sm:p-6 rounded shadow-sm print:hidden w-full font-sans">
          
          {/* TOP HEADER MATCHING USER DESIGN SPECIFICATION */}
          <div className="border-b-2 border-black pb-4 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100/80 border border-emerald-300 rounded-md text-emerald-700 shrink-0 mt-0.5">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-serif italic text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
                  Manajemen Penerimaan Barang Masuk (Inbound)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Rekam dan lacak log penambahan pasokan material pembantu secara detail
                </p>
              </div>
            </div>

            {/* SEGMENTED TOGGLE SWITCH */}
            <div className="inline-flex p-1 bg-neutral-100 border border-neutral-300 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setInboundViewMode("log")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  inboundViewMode === "log"
                    ? "bg-[#1A1A1A] text-white shadow-xs"
                    : "text-neutral-700 hover:text-black hover:bg-neutral-200/60"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
                <span>Log Penerimaan (9 Kolom)</span>
                {filteredInboundLogs.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[10px] font-mono font-bold">
                    {filteredInboundLogs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInboundViewMode("stock")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  inboundViewMode === "stock"
                    ? "bg-[#1A1A1A] text-white shadow-xs"
                    : "text-neutral-700 hover:text-black hover:bg-neutral-200/60"
                }`}
              >
                <Package className="w-3.5 h-3.5 text-neutral-400" />
                <span>Seluruh Stok Gudang</span>
              </button>
            </div>
          </div>

          {/* MAIN WORKSPACE GRID: LEFT (LOG/STOCK VIEW) & RIGHT (INPUT FORM) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: 9-KOLOM LOG ATAU STOK GUDANG OVERVIEW */}
            <div className="lg:col-span-7 space-y-4">
              {inboundViewMode === "log" ? (
                <>
                  {filteredInboundLogs.length === 0 ? (
                    /* EXACT EMPTY STATE MATCHING USER SPECIFICATION & SCREENSHOT */
                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-10 sm:p-14 text-center bg-[#FAF9F6]/60 flex flex-col items-center justify-center min-h-[380px]">
                      <div className="w-16 h-16 rounded-full bg-emerald-100/80 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600">
                        <ArrowDownLeft className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h4 className="font-serif italic text-base sm:text-lg font-bold text-neutral-800 mb-1.5">
                        Belum Ada Penerimaan Terdaftar
                      </h4>
                      <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                        Silakan gunakan form input di kolom sebelah kanan untuk mencatat penerimaan barang baru atau menambahkan kuantitas masuk.
                      </p>
                    </div>
                  ) : (
                    /* POPULATED 9-COLUMN LOG VIEW */
                    <div className="space-y-3">
                      {/* SUMMARY HEADER & DATE FILTER & CSV EXPORT */}
                      <div className="flex flex-col gap-2.5 bg-[#FAF9F6] border border-neutral-300 p-3 rounded">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-800 font-serif italic">
                              Riwayat Penerimaan: <span className="underline decoration-emerald-500 font-mono font-bold text-emerald-800">
                                {logFilterDateMode === "today" 
                                  ? formatDDMMYY(selectedDate)
                                  : logFilterDateMode === "custom"
                                  ? formatDDMMYY(logCustomDate)
                                  : "Semua Tanggal"}
                              </span>
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                              {filteredInboundLogs.length} Transaksi
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleExportLogCSV}
                            className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Export CSV</span>
                          </button>
                        </div>

                        {/* DATE FILTER PILLS */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-200">
                          <span className="text-[11px] font-bold text-neutral-600">Filter Tanggal:</span>
                          <button
                            type="button"
                            onClick={() => setLogFilterDateMode("today")}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                              logFilterDateMode === "today"
                                ? "bg-emerald-700 text-white shadow-2xs"
                                : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                            }`}
                          >
                            Hari Ini ({formatDDMMYY(selectedDate)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogFilterDateMode("all")}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                              logFilterDateMode === "all"
                                ? "bg-emerald-700 text-white shadow-2xs"
                                : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                            }`}
                          >
                            Semua Tanggal
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setLogFilterDateMode("custom")}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                logFilterDateMode === "custom"
                                  ? "bg-emerald-700 text-white shadow-2xs"
                                  : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              Pilih Tanggal:
                            </button>
                            {logFilterDateMode === "custom" && (
                              <input
                                type="date"
                                value={logCustomDate}
                                onChange={(e) => setLogCustomDate(e.target.value)}
                                className="px-2 py-0.5 text-xs font-mono font-bold border border-emerald-500 bg-white rounded focus:outline-none"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* MINI METRICS BAR */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded">
                          <div className="text-[9px] uppercase font-bold text-emerald-800">Total Masuk</div>
                          <div className="font-mono font-bold text-base text-emerald-700">
                            +{logMetrics.totalLembar.toLocaleString("id-ID")} <span className="text-[9px] font-sans">Lbr</span>
                          </div>
                        </div>
                        <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded">
                          <div className="text-[9px] uppercase font-bold text-emerald-800">Setara Bal</div>
                          <div className="font-mono font-bold text-base text-emerald-700">
                            {logMetrics.totalBal.toLocaleString("id-ID")} <span className="text-[9px] font-sans">Bal</span>
                          </div>
                        </div>
                        <div className="p-2 bg-blue-50/70 border border-blue-200 rounded">
                          <div className="text-[9px] uppercase font-bold text-blue-800">Pembelian PO</div>
                          <div className="font-mono font-bold text-base text-blue-700">
                            {logMetrics.totalPembelian.toLocaleString("id-ID")} <span className="text-[9px] font-sans">Lbr</span>
                          </div>
                        </div>
                        <div className="p-2 bg-amber-50/70 border border-amber-200 rounded">
                          <div className="text-[9px] uppercase font-bold text-amber-800">Retur / Lain</div>
                          <div className="font-mono font-bold text-base text-amber-700">
                            {(logMetrics.totalRetur + logMetrics.totalLainLain).toLocaleString("id-ID")} <span className="text-[9px] font-sans">Lbr</span>
                          </div>
                        </div>
                      </div>

                      {/* 10-COLUMN LOG TABLE (WITH TANGGAL DD/MM/YY) */}
                      <div className="border border-neutral-300 rounded overflow-x-auto bg-white shadow-2xs">
                        <table className="w-full border-collapse text-left text-xs font-sans">
                          <thead>
                            <tr className="bg-neutral-800 text-white uppercase text-[9px] tracking-wider font-mono">
                              <th className="p-2 text-center w-7 border-r border-neutral-700">No</th>
                              <th className="p-2 border-r border-neutral-700 whitespace-nowrap">Tanggal</th>
                              <th className="p-2 border-r border-neutral-700">Jam</th>
                              <th className="p-2 border-r border-neutral-700">Kode Barang</th>
                              <th className="p-2 border-r border-neutral-700">Nama Karung</th>
                              <th className="p-2 text-center border-r border-neutral-700">Kolom</th>
                              <th className="p-2 text-center border-r border-neutral-700">SLoct</th>
                              <th className="p-2 text-right border-r border-neutral-700">Lembar</th>
                              <th className="p-2 text-right border-r border-neutral-700">Bal</th>
                              <th className="p-2 text-center w-8">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200">
                            {filteredInboundLogs.map((log, idx) => {
                              const isPembelian = log.kolom === "pembelian";
                              const isRetur = log.kolom === "returProduksi";

                              return (
                                <tr key={log.id} className="hover:bg-emerald-50/30 transition-colors">
                                  <td className="p-2 text-center text-neutral-500 font-mono text-[11px] border-r border-neutral-200">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2 border-r border-neutral-200 font-mono text-[11px] text-emerald-900 font-bold whitespace-nowrap">
                                    {formatDDMMYY(log.tanggal)}
                                  </td>
                                  <td className="p-2 border-r border-neutral-200 font-mono text-[11px] text-neutral-700 whitespace-nowrap">
                                    {log.waktu ? log.waktu : "-"}
                                  </td>
                                  <td className="p-2 border-r border-neutral-200 font-mono font-bold text-blue-900 text-[11px]">
                                    {log.kode}
                                  </td>
                                  <td className="p-2 border-r border-neutral-200">
                                    <div className="font-bold text-neutral-900 leading-tight">{log.namaKarung}</div>
                                    {log.catatan && (
                                      <div className="text-[10px] text-neutral-500 italic mt-0.5">{log.catatan}</div>
                                    )}
                                  </td>
                                  <td className="p-2 text-center border-r border-neutral-200">
                                    {isPembelian ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 font-mono">
                                        Pembelian
                                      </span>
                                    ) : isRetur ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-900 border border-blue-200 font-mono">
                                        Retur
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200 font-mono">
                                        Lain-lain
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center font-mono font-bold text-emerald-800 border-r border-neutral-200">
                                    {log.sloct || "3001"}
                                  </td>
                                  <td className="p-2 text-right font-mono font-black text-emerald-700 border-r border-neutral-200">
                                    +{(log.jmlLembar || 0).toLocaleString("id-ID")}
                                  </td>
                                  <td className="p-2 text-right font-mono text-neutral-700 border-r border-neutral-200">
                                    {log.jmlBal ? `${log.jmlBal}` : "-"}
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInboundLog(log.id)}
                                      title="Hapus Catatan Log"
                                      className="text-neutral-400 hover:text-red-700 p-1 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
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
                  )}
                </>
              ) : (
                /* WAREHOUSE STOCK OVERVIEW */
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 bg-[#FAF9F6] border border-neutral-300 p-3 rounded">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={inboundStockSearch}
                        onChange={(e) => setInboundStockSearch(e.target.value)}
                        placeholder="Cari kode atau nama karung di gudang..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 bg-white rounded focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div className="text-xs font-mono text-neutral-600 shrink-0">
                      Total {items.length} Item
                    </div>
                  </div>

                  <div className="border border-neutral-300 rounded overflow-x-auto bg-white max-h-[460px] overflow-y-auto">
                    <table className="w-full border-collapse text-left text-xs font-sans">
                      <thead className="sticky top-0 bg-neutral-800 text-white uppercase text-[9px] tracking-wider font-mono">
                        <tr>
                          <th className="p-2 border-r border-neutral-700">Kode</th>
                          <th className="p-2 border-r border-neutral-700">Nama Karung</th>
                          <th className="p-2 text-center border-r border-neutral-700">SLoct</th>
                          <th className="p-2 text-right border-r border-neutral-700">Stok Awal</th>
                          <th className="p-2 text-right border-r border-neutral-700">Masuk Hari Ini</th>
                          <th className="p-2 text-right border-r border-neutral-700">Sisa Stok</th>
                          <th className="p-2 text-center w-16">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {items
                          .filter((it) => {
                            if (!inboundStockSearch.trim()) return true;
                            const q = inboundStockSearch.toLowerCase();
                            return it.kode.toLowerCase().includes(q) || it.namaKarung.toLowerCase().includes(q);
                          })
                          .map((it) => {
                            const isSelected = inboundItemId === it.id;
                            const sisaStok = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.afkir || 0);

                            return (
                              <tr 
                                key={it.id} 
                                className={`hover:bg-neutral-50 transition-colors ${
                                  isSelected ? "bg-emerald-50/60 font-semibold" : ""
                                }`}
                              >
                                <td className="p-2 font-mono font-bold text-blue-900 border-r border-neutral-200">
                                  {it.kode}
                                </td>
                                <td className="p-2 border-r border-neutral-200">
                                  <div className="font-bold text-neutral-900">{it.namaKarung}</div>
                                  <div className="text-[10px] text-neutral-500">{it.kategori}</div>
                                </td>
                                <td className="p-2 text-center font-mono text-emerald-800 font-bold border-r border-neutral-200">
                                  {it.gudangKav || "3001"}
                                </td>
                                <td className="p-2 text-right font-mono text-neutral-700 border-r border-neutral-200">
                                  {(it.stockAwal || 0).toLocaleString("id-ID")}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-emerald-700 border-r border-neutral-200">
                                  {(it.masuk || 0) > 0 ? `+${(it.masuk || 0).toLocaleString("id-ID")}` : "-"}
                                </td>
                                <td className="p-2 text-right font-mono font-black text-neutral-900 border-r border-neutral-200">
                                  {sisaStok.toLocaleString("id-ID")}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInboundItemId(it.id);
                                      setInboundKavling(it.gudangKav || "3001");
                                      showNotification(`Item "${it.namaKarung}" dipilih di form input`, "info");
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                      isSelected
                                        ? "bg-emerald-700 text-white"
                                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300"
                                    }`}
                                  >
                                    {isSelected ? "Terpilih" : "Pilih"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: FORM INPUT PENERIMAAN */}
            <div className="lg:col-span-5 bg-[#FAF9F6] border-2 border-neutral-300 p-4 sm:p-5 rounded-lg shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-300">
                <div>
                  <h4 className="font-serif italic text-base font-bold text-neutral-900 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-700" />
                    <span>Form Input Penerimaan</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Input kedatangan karung (PO Pembelian, Retur, Lain-lain)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px] font-bold uppercase">
                    Inbound
                  </span>
                </div>
              </div>

              <form onSubmit={handleProcessInbound} className="space-y-4 text-xs">
                
                {/* 0. TANGGAL TRANSAKSI PENERIMAAN (DAPAT DIRUBAH) */}
                <div className="bg-white border-2 border-emerald-600/70 p-3 rounded-md shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-[11px] font-black text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Tanggal Transaksi Penerimaan <span className="text-red-600">*</span></span>
                    </label>
                    {inboundTanggal !== selectedDate && (
                      <button
                        type="button"
                        onClick={() => setInboundTanggal(selectedDate)}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                        title="Kembalikan ke tanggal laporan aktif"
                      >
                        Reset ({selectedDate})
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={inboundTanggal}
                        onChange={(e) => setInboundTanggal(e.target.value)}
                        className="w-full p-2 text-xs font-mono font-bold border-2 border-neutral-800 bg-[#FAF9F6] rounded focus:outline-none focus:bg-white text-neutral-900 shadow-inner"
                        required
                      />
                    </div>
                    {onDateChange && inboundTanggal !== selectedDate && (
                      <button
                        type="button"
                        onClick={() => onDateChange(inboundTanggal)}
                        className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Pindah tampilan tabel mutasi ke tanggal transaksi ini"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Buka Tanggal Ini</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
                    <span>Transaksi akan tercatat pada tanggal: <strong className="font-mono text-emerald-800">{formatDDMMYY(inboundTanggal)}</strong></span>
                    {inboundTanggal && (
                      <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Target {formatDDMMYY(inboundTanggal)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. PILIH JENIS KARUNG */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wide flex items-center gap-1">
                      <span>1. Pilih Jenis Karung <span className="text-red-600">*</span></span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewCode(!isCreatingNewCode)}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      {isCreatingNewCode ? "Tutup" : "+ Buat Kode Baru"}
                    </button>
                  </div>

                  {/* INLINE FORM: BUAT KODE BARANG BARU */}
                  {isCreatingNewCode && (
                    <div className="mb-3 p-3 bg-amber-50/95 border-2 border-amber-500 rounded-lg shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                        <div className="flex items-center gap-1.5 font-black text-amber-950 text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Buat Kode & Nama Barang Baru</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCreatingNewCode(false)}
                          className="text-neutral-500 hover:text-black text-[11px] font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-900 uppercase mb-0.5">
                            Kode Barang Baru <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={newCodeKode}
                            onChange={(e) => setNewCodeKode(e.target.value)}
                            placeholder="CONTOH: 700502021099"
                            className="w-full p-1.5 border border-amber-600 bg-white rounded font-mono font-bold text-neutral-900 focus:outline-none uppercase text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-900 uppercase mb-0.5">
                            Nama Barang / Jenis Karung <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={newCodeNama}
                            onChange={(e) => setNewCodeNama(e.target.value)}
                            placeholder="CONTOH: CONFEED 50KG 60X100"
                            className="w-full p-1.5 border border-amber-600 bg-white rounded font-bold text-neutral-900 focus:outline-none uppercase text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-700 uppercase mb-0.5">
                              Kategori
                            </label>
                            <select
                              value={newCodeKategori}
                              onChange={(e) => setNewCodeKategori(e.target.value as KarungCategory)}
                              className="w-full p-1.5 border border-neutral-300 bg-white rounded text-xs font-medium"
                            >
                              <option value="Karung 50 Kg">Karung 50 Kg</option>
                              <option value="Karung 25 Kg">Karung 25 Kg</option>
                              <option value="Karung 20 Kg">Karung 20 Kg</option>
                              <option value="Karung 10 Kg">Karung 10 Kg</option>
                              <option value="Karung 5 Kg">Karung 5 Kg</option>
                              <option value="Jumbo Bag">Jumbo Bag</option>
                              <option value="Karung Polos / Non-Print">Karung Polos</option>
                              <option value="Inner Plastik">Inner Plastik</option>
                              <option value="Lainnya">Lainnya</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-neutral-700 uppercase mb-0.5">
                              SLoct Simpan
                            </label>
                            <input
                              type="text"
                              list="sloct-options"
                              value={newCodeSloct}
                              onChange={(e) => setNewCodeSloct(e.target.value)}
                              placeholder="3001"
                              className="w-full p-1.5 border border-neutral-300 bg-white rounded font-mono font-bold text-xs"
                            />
                            <datalist id="sloct-options">
                              <option value="3001">3001 - Gudang Kemasan & Sacks</option>
                              <option value="3002">3002 - Gudang WIP / Transit</option>
                              <option value="3003">3003 - Buffer Stock</option>
                              <option value="3004">3004 - Gudang Bahan Baku</option>
                              <option value="K-01">Kavling K-01</option>
                              <option value="K-02">Kavling K-02</option>
                              <option value="K-03">Kavling K-03</option>
                            </datalist>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveNewCode}
                          className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan Master Kode & Pilih</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SELECT EXISTING ITEM */}
                  <select
                    value={inboundItemId}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setIsCreatingNewCode(true);
                        return;
                      }
                      setInboundItemId(e.target.value);
                      const selected = items.find((it) => it.id === e.target.value);
                      if (selected) {
                        setInboundSuplier(selected.suplier || "");
                        setInboundKavling(selected.gudangKav || "3001");
                      }
                    }}
                    className="w-full p-2.5 text-xs border-2 border-[#1A1A1A] bg-white rounded font-sans focus:outline-none focus:ring-1 focus:ring-black font-semibold"
                  >
                    <option value="">-- Pilih Jenis Karung --</option>
                    <option value="__NEW__" className="font-bold text-amber-700 bg-amber-50">
                      + [Buat Kode Barang Baru...]
                    </option>
                    {items.map((it) => {
                      const sisa = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.afkir || 0);
                      return (
                        <option key={it.id} value={it.id}>
                          {it.kode} - {it.namaKarung} (Stok: {sisa.toLocaleString("id-ID")} Lbr)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. TENTUKAN MASUK KOLOM */}
                <div>
                  <label className="block text-[11px] font-black text-neutral-800 uppercase tracking-wide mb-1.5">
                    2. Tentukan Masuk Kolom <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInboundKolom("pembelian")}
                      className={`p-2 border rounded text-center transition-all cursor-pointer ${
                        inboundKolom === "pembelian"
                          ? "bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-400 font-bold"
                          : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">📦 Pembelian</div>
                      <div className="text-[9px] opacity-80 mt-0.5">PO Supplier</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInboundKolom("returProduksi");
                        const found = items.find((it) => it.id === inboundItemId);
                        if (found) {
                          const usedKav = found.fifoLots?.[0]?.kav || found.gudangKav || "3001";
                          setInboundKavling(usedKav);
                        }
                      }}
                      className={`p-2 border rounded text-center transition-all cursor-pointer ${
                        inboundKolom === "returProduksi"
                          ? "bg-blue-800 text-white border-blue-900 ring-2 ring-blue-400 font-bold"
                          : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">🔄 Retur</div>
                      <div className="text-[9px] opacity-80 mt-0.5">Dari Bagging</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInboundKolom("masukLainLain");
                        const found = items.find((it) => it.id === inboundItemId);
                        if (found) {
                          const usedKav = found.fifoLots?.[0]?.kav || found.gudangKav || "3001";
                          setInboundKavling(usedKav);
                        }
                      }}
                      className={`p-2 border rounded text-center transition-all cursor-pointer ${
                        inboundKolom === "masukLainLain"
                          ? "bg-amber-800 text-white border-amber-900 ring-2 ring-amber-400 font-bold"
                          : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">✨ Lain-lain</div>
                      <div className="text-[9px] opacity-80 mt-0.5">Adjusment</div>
                    </button>
                  </div>
                </div>

                {/* 3. SLOCT & GUDANG SIMPAN */}
                <div>
                  <label className="block text-[11px] font-black text-neutral-800 uppercase tracking-wide mb-1">
                    3. SLoct / Lokasi Simpan
                  </label>
                  <input
                    type="text"
                    value={inboundKavling}
                    onChange={(e) => setInboundKavling(e.target.value)}
                    placeholder="Contoh: 3001 atau Gudang Sacks"
                    className="w-full p-2 border border-neutral-300 bg-white rounded font-mono font-bold text-xs"
                  />
                </div>

                {/* 4. JUMLAH MASUK (LEMBAR) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wide">
                      4. Jumlah Masuk (Lembar) <span className="text-red-600">*</span>
                    </label>
                    {inboundItemId && (
                      <span className="text-[10px] text-neutral-500 font-mono">
                        1 Bal = {items.find((it) => it.id === inboundItemId)?.lembarPerBal || 500} Lbr
                      </span>
                    )}
                  </div>

                  <input
                    type="number"
                    value={inboundLembar}
                    onChange={(e) => setInboundLembar(e.target.value)}
                    placeholder="Contoh: 5000"
                    min="1"
                    className="w-full p-2.5 border-2 border-emerald-600 focus:border-emerald-700 bg-white rounded font-mono font-bold text-emerald-800 text-sm focus:outline-none"
                  />

                  {/* PRESET SHORTCUT BUTTONS */}
                  <div className="grid grid-cols-5 gap-1 mt-1.5">
                    {[500, 1000, 2500, 5000, 10000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setInboundLembar(String(preset))}
                        className="py-1 bg-white hover:bg-neutral-100 border border-neutral-300 rounded text-[10px] font-mono font-bold text-neutral-700 cursor-pointer transition-colors"
                      >
                        +{preset >= 1000 ? `${preset/1000}k` : preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. CATATAN / NO PO */}
                <div>
                  <label className="block text-[11px] font-black text-neutral-800 uppercase tracking-wide mb-1">
                    5. Catatan / No PO Supplier
                  </label>
                  <input
                    type="text"
                    value={inboundCatatan}
                    onChange={(e) => setInboundCatatan(e.target.value)}
                    placeholder="Contoh: PO-2026/08/901 PT Kencana"
                    className="w-full p-2 border border-neutral-300 bg-white rounded text-xs"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Simpan Penerimaan Stock</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: OUTBOUND / PENGELUARAN LOG & FORM */}
      {activeSubTab === "outbound" && (
        <div className="bg-white border-2 border-[#1A1A1A] p-5 sm:p-6 rounded shadow-sm print:hidden w-full font-sans">
          
          {/* 1. HEADER DENGAN ICON MERAH, TITLE ITALIC & SEGMENTED SWITCH */}
          <div className="border-b border-black pb-3.5 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="text-rose-600 mt-0.5 sm:mt-0">
                <ArrowUpRight className="w-6 h-6 text-rose-600 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-serif italic text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
                  Pencatatan Barang Keluar (Outbound)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pencatatan transaksi dan log detail pengeluaran stok material harian
                </p>
              </div>
            </div>

            {/* Segmented Switch: Log Pengeluaran vs Seluruh Stock Gudang */}
            <div className="flex items-center p-1 bg-neutral-100 border border-neutral-300 rounded shadow-2xs self-start md:self-auto">
              <button
                type="button"
                onClick={() => setOutboundViewMode("log")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  outboundViewMode === "log"
                    ? "bg-[#1A1A1A] text-white shadow-xs"
                    : "text-neutral-700 hover:text-black hover:bg-neutral-200/60"
                }`}
              >
                <span>Log Pengeluaran</span>
                {filteredOutboundLogs.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    outboundViewMode === "log" ? "bg-rose-500 text-white" : "bg-neutral-300 text-neutral-800"
                  }`}>
                    {filteredOutboundLogs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOutboundViewMode("stock")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                  outboundViewMode === "stock"
                    ? "bg-[#1A1A1A] text-white shadow-xs"
                    : "text-neutral-700 hover:text-black hover:bg-neutral-200/60"
                }`}
              >
                Seluruh Stock Gudang
              </button>
            </div>
          </div>

          {/* 2. SUMMARY / FILTER BAR (PINK / ROSE CONTAINER) */}
          <div className="p-3 bg-rose-50/60 border border-rose-200 rounded flex flex-wrap items-center justify-between gap-3 text-xs mb-5">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <span className="font-serif italic font-bold text-rose-900 text-xs sm:text-sm">
                Total Riwayat Log:
              </span>

              {/* Transaksi Box */}
              <div className="px-2.5 py-1 bg-white border border-rose-300 rounded text-center shadow-2xs min-w-[75px]">
                <div className="font-mono font-bold text-rose-800 text-xs sm:text-sm leading-none">
                  {outboundMetrics.totalTransaksi}
                </div>
                <div className="text-[9px] font-bold text-rose-700 uppercase tracking-tight mt-0.5">
                  Transaksi
                </div>
              </div>

              {/* Total Colly / Bal */}
              <div className="text-xs text-rose-900 flex items-center gap-1">
                <span className="text-neutral-600 font-medium">Total Colly:</span>
                <strong className="font-mono font-bold text-rose-900">
                  {outboundMetrics.totalBal}
                </strong>
                <span className="text-rose-700 font-semibold text-[11px]">C</span>
              </div>

              {/* Total Lembar / Qty */}
              <div className="text-xs text-rose-900 flex items-center gap-1">
                <span className="text-neutral-600 font-medium">Total Lembar:</span>
                <strong className="font-mono font-bold text-rose-900">
                  {outboundMetrics.totalLembar.toLocaleString("id-ID")}
                </strong>
                <span className="text-rose-700 font-semibold text-[11px]">Lbr</span>
              </div>
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <span className="font-mono font-bold text-[10px] text-neutral-600 uppercase tracking-wider">
                FILTER:
              </span>
              <select
                value={outboundMaterialFilter}
                onChange={(e) => setOutboundMaterialFilter(e.target.value)}
                className="px-2 py-1 bg-white border border-neutral-300 hover:border-neutral-400 rounded text-xs text-neutral-800 font-medium focus:outline-none focus:ring-1 focus:ring-black shadow-2xs cursor-pointer max-w-[220px] truncate"
              >
                <option value="all">Semua Material ({items.length})</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.kode} - {it.namaKarung}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. MAIN WORKSPACE (2 COLUMNS: LEFT LOG/STOCK VIEW, RIGHT OUTBOUND FORM) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: LOG VIEW OR STOCK LIST */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {outboundViewMode === "log" ? (
                filteredOutboundLogs.length === 0 ? (
                  /* EMPTY STATE MATCHING USER SCREENSHOT EXACTLY */
                  <div className="border border-dashed border-rose-200/90 rounded-lg p-10 sm:p-14 text-center bg-[#FAF9F6]/50 flex flex-col items-center justify-center min-h-[380px] h-full shadow-2xs">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-50 border border-rose-200/80 flex items-center justify-center mx-auto mb-4 text-rose-400">
                      <ArrowUpRight className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500 stroke-[2.2]" />
                    </div>
                    <h4 className="font-serif italic text-base sm:text-lg font-bold text-neutral-800 mb-1.5">
                      Belum Ada Log Pengeluaran
                    </h4>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                      Gunakan Form Pengeluaran Stock di sebelah kanan untuk memproses dan mencatat pengeluaran stok barang hari ini.
                    </p>
                  </div>
                ) : (
                  /* LOG TABLE WITH COMPLETE COLUMNS & CSV EXPORT */
                  <div className="bg-white border border-neutral-300 rounded shadow-xs overflow-hidden">
                    <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-serif italic font-bold text-xs text-neutral-900">
                          Riwayat Pengeluaran ({selectedDate})
                        </span>
                        <span className="text-[10px] bg-rose-100 text-rose-900 border border-rose-200 font-mono font-bold px-2 py-0.5 rounded">
                          {filteredOutboundLogs.length} Entri
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportOutboundLogCSV}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-700" /> Export CSV
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#1A1A1A] text-white text-[10px] uppercase font-mono tracking-wider">
                          <tr>
                            <th className="p-2 text-center w-8">No</th>
                            <th className="p-2">Waktu</th>
                            <th className="p-2">Material / Karung</th>
                            <th className="p-2 text-center">Kolom</th>
                            <th className="p-2 text-center">SLoct</th>
                            <th className="p-2 text-right">Lembar</th>
                            <th className="p-2 text-right">Bal</th>
                            <th className="p-2">Catatan / SPK</th>
                            <th className="p-2 text-center w-10">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 font-sans">
                          {filteredOutboundLogs.map((log, idx) => {
                            const kolomConfig = {
                              bonProduksi: { label: "Bon Produksi", bg: "bg-rose-100 text-rose-900 border-rose-300" },
                              gudangKeluar: { label: "Gudang", bg: "bg-blue-100 text-blue-900 border-blue-300" },
                              overZak: { label: "Over Sak", bg: "bg-amber-100 text-amber-900 border-amber-300" },
                              keluarLainLain: { label: "Lain-lain", bg: "bg-purple-100 text-purple-900 border-purple-300" }
                            }[log.kolom] || { label: "Outbound", bg: "bg-neutral-100 text-neutral-800 border-neutral-300" };

                            return (
                              <tr key={log.id} className="hover:bg-rose-50/30 transition-colors">
                                <td className="p-2 text-center font-mono text-neutral-400">{idx + 1}</td>
                                <td className="p-2 font-mono text-neutral-600 whitespace-nowrap text-[11px]">
                                  {log.waktu || "-"}
                                </td>
                                <td className="p-2">
                                  <div className="font-bold text-neutral-900 leading-tight">{log.namaKarung}</div>
                                  <div className="font-mono text-[10px] text-neutral-500">{log.kode}</div>
                                </td>
                                <td className="p-2 text-center">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${kolomConfig.bg}`}>
                                    {kolomConfig.label}
                                  </span>
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-neutral-700">
                                  {log.sloct || "3001"}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                                  -{(log.jmlLembar || 0).toLocaleString("id-ID")}
                                </td>
                                <td className="p-2 text-right font-mono text-neutral-700 whitespace-nowrap">
                                  {log.jmlBal || 0}
                                </td>
                                <td className="p-2 text-neutral-600 max-w-[140px] truncate text-[11px]" title={log.catatan}>
                                  {log.catatan || "-"}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOutboundLog(log.id)}
                                    title="Hapus log pengeluaran & kembalikan stok"
                                    className="p-1 hover:bg-rose-100 text-neutral-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
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
                )
              ) : (
                /* STOCK LIST VIEW WITH QUICK SELECTION */
                <div className="bg-white border border-neutral-300 rounded shadow-xs overflow-hidden">
                  <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-serif italic font-bold text-xs text-neutral-900">
                      Seluruh Stok Gudang Karung
                    </span>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={outboundStockSearch}
                        onChange={(e) => setOutboundStockSearch(e.target.value)}
                        placeholder="Cari kode / nama karung..."
                        className="pl-8 pr-2.5 py-1 text-xs border border-neutral-300 rounded bg-white font-sans focus:outline-none focus:ring-1 focus:ring-black w-48 sm:w-60"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#1A1A1A] text-white text-[10px] uppercase font-mono tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="p-2 text-center w-8">No</th>
                          <th className="p-2">Kode Barang</th>
                          <th className="p-2">Nama Karung</th>
                          <th className="p-2 text-center">SLoct</th>
                          <th className="p-2 text-right">Sisa Stok</th>
                          <th className="p-2 text-center w-16">Pilih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 font-sans">
                        {items
                          .filter((it) => {
                            if (!outboundStockSearch.trim()) return true;
                            const q = outboundStockSearch.toLowerCase();
                            return (
                              it.namaKarung.toLowerCase().includes(q) ||
                              it.kode.toLowerCase().includes(q) ||
                              (it.gudangKav || "").toLowerCase().includes(q)
                            );
                          })
                          .map((it, idx) => {
                            const sisa = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.afkir || 0);
                            const isLow = sisa <= (it.minStock || 0);
                            const isSelected = outboundItemId === it.id;

                            return (
                              <tr key={it.id} className={`hover:bg-neutral-50 transition-colors ${isSelected ? "bg-rose-50/50" : ""}`}>
                                <td className="p-2 text-center font-mono text-neutral-400">{idx + 1}</td>
                                <td className="p-2 font-mono font-bold text-neutral-800 whitespace-nowrap">{it.kode}</td>
                                <td className="p-2">
                                  <div className="font-bold text-neutral-900 leading-tight">{it.namaKarung}</div>
                                  <div className="text-[10px] text-neutral-500">{it.spesifikasi || it.kategori}</div>
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-neutral-700">{it.gudangKav || "3001"}</td>
                                <td className="p-2 text-right">
                                  <div className={`font-mono font-bold ${isLow ? "text-red-700" : "text-emerald-800"}`}>
                                    {sisa.toLocaleString("id-ID")} Lbr
                                  </div>
                                  <div className="text-[9px] font-mono text-neutral-500">
                                    ≈ {Math.round((sisa / (it.lembarPerBal || 500)) * 10) / 10} Bal
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOutboundItemId(it.id);
                                      showNotification(`Item ${it.namaKarung} dipilih untuk form pengeluaran`, "info");
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold rounded uppercase cursor-pointer transition-all ${
                                      isSelected
                                        ? "bg-rose-700 text-white shadow-2xs"
                                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300"
                                    }`}
                                  >
                                    {isSelected ? "Dipilih" : "Pilih"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: FORM PENGELUARAN STOCK */}
            <div className="lg:col-span-5 bg-[#FAF9F6] border-2 border-[#1A1A1A] p-4 sm:p-5 rounded-lg shadow-sm space-y-4">
              <div className="border-b border-neutral-300 pb-2.5 flex items-center justify-between">
                <div>
                  <h4 className="font-serif italic font-bold text-sm sm:text-base text-neutral-900 flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-rose-700" />
                    Form Pengeluaran Stock
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Input pemakaian bon produksi, gudang, over sak, dll.
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono text-[10px] font-bold uppercase">
                  Outbound
                </span>
              </div>

              <form onSubmit={handleProcessOutbound} className="space-y-3.5 text-xs">
                
                {/* 0. TANGGAL TRANSAKSI PENGELUARAN (DAPAT DIRUBAH) */}
                <div className="bg-white border-2 border-rose-600/70 p-3 rounded-md shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-[11px] font-black text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-700" />
                      <span>Tanggal Transaksi Pengeluaran <span className="text-red-600">*</span></span>
                    </label>
                    {outboundTanggal !== selectedDate && (
                      <button
                        type="button"
                        onClick={() => setOutboundTanggal(selectedDate)}
                        className="text-[10px] text-rose-700 hover:text-rose-900 font-bold underline cursor-pointer"
                        title="Kembalikan ke tanggal laporan aktif"
                      >
                        Reset ({selectedDate})
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={outboundTanggal}
                        onChange={(e) => setOutboundTanggal(e.target.value)}
                        className="w-full p-2 text-xs font-mono font-bold border-2 border-neutral-800 bg-[#FAF9F6] rounded focus:outline-none focus:bg-white text-neutral-900 shadow-inner"
                        required
                      />
                    </div>
                    {onDateChange && outboundTanggal !== selectedDate && (
                      <button
                        type="button"
                        onClick={() => onDateChange(outboundTanggal)}
                        className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Pindah tampilan tabel mutasi ke tanggal transaksi ini"
                      >
                        <Eye className="w-3.5 h-3.5 text-rose-700" />
                        <span>Buka Tanggal Ini</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
                    <span>Transaksi pengeluaran tercatat pada tanggal: <strong className="font-mono text-rose-800">{formatDDMMYY(outboundTanggal)}</strong></span>
                    {outboundTanggal && (
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        Target {formatDDMMYY(outboundTanggal)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. PILIH JENIS KARUNG */}
                <div>
                  <label className="block text-[11px] font-black text-neutral-800 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>1. Pilih Jenis Karung <span className="text-red-600">*</span></span>
                    {outboundItemId && (() => {
                      const it = items.find(i => i.id === outboundItemId);
                      if (!it) return null;
                      const sisa = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.afkir || 0);
                      return (
                        <span className="text-[10px] text-emerald-800 font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Sisa: {sisa.toLocaleString("id-ID")} Lbr
                        </span>
                      );
                    })()}
                  </label>

                  <select
                    value={outboundItemId}
                    onChange={(e) => setOutboundItemId(e.target.value)}
                    className="w-full p-2 text-xs border border-neutral-800 bg-white rounded font-sans font-semibold focus:outline-none focus:ring-1 focus:ring-black"
                    required
                  >
                    <option value="" disabled>-- Pilih Jenis Karung --</option>
                    {items.map((it) => {
                      const sisa = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.afkir || 0);
                      return (
                        <option key={it.id} value={it.id}>
                          {it.kode} - {it.namaKarung} (Sisa: {sisa.toLocaleString("id-ID")} Lbr)
                        </option>
                      );
                    })}
                  </select>

                  {outboundItemId && (() => {
                    const it = items.find(i => i.id === outboundItemId);
                    if (!it) return null;
                    const sisa = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.afkir || 0);
                    const conv = it.lembarPerBal || 500;
                    return (
                      <div className="mt-2 bg-white p-2.5 rounded border border-neutral-200 grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase font-bold">Kode Barang</span>
                          <strong className="text-neutral-900">{it.kode}</strong>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase font-bold">SLoct / Kav</span>
                          <strong className="text-emerald-700">{it.gudangKav || "3001"}</strong>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase font-bold">Kemasan</span>
                          <strong className="text-neutral-900">{conv} Lbr / Bal</strong>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[9px] uppercase font-bold">Sisa Stok Total</span>
                          <strong className="text-emerald-700 font-bold">{sisa.toLocaleString("id-ID")} Lbr</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. TENTUKAN MASUK KOLOM (PENGELUARAN) */}
                <div>
                  <label className="block text-[11px] font-black text-neutral-800 uppercase tracking-wide mb-1.5">
                    2. Tentukan Kolom Pengeluaran <span className="text-red-600">*</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 1. Bon Produksi */}
                    <label
                      onClick={() => setOutboundKolom("bonProduksi")}
                      className={`p-2.5 rounded border cursor-pointer transition-all flex flex-col justify-between ${
                        outboundKolom === "bonProduksi"
                          ? "border-rose-600 bg-rose-50/70 text-rose-950 font-bold shadow-2xs"
                          : "border-neutral-300 bg-white hover:border-neutral-400 text-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1 text-rose-900">
                          <FileText className="w-3.5 h-3.5 text-rose-600" /> Bon Produksi
                        </span>
                        <input
                          type="radio"
                          name="outboundKolom"
                          checked={outboundKolom === "bonProduksi"}
                          onChange={() => setOutboundKolom("bonProduksi")}
                          className="accent-rose-600"
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500 mt-1 font-normal">Line bagging pakan</span>
                    </label>

                    {/* 2. Gudang */}
                    <label
                      onClick={() => setOutboundKolom("gudangKeluar")}
                      className={`p-2.5 rounded border cursor-pointer transition-all flex flex-col justify-between ${
                        outboundKolom === "gudangKeluar"
                          ? "border-blue-600 bg-blue-50/70 text-blue-950 font-bold shadow-2xs"
                          : "border-neutral-300 bg-white hover:border-neutral-400 text-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1 text-blue-900">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" /> Gudang
                        </span>
                        <input
                          type="radio"
                          name="outboundKolom"
                          checked={outboundKolom === "gudangKeluar"}
                          onChange={() => setOutboundKolom("gudangKeluar")}
                          className="accent-blue-600"
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500 mt-1 font-normal">Transfer antar gudang</span>
                    </label>

                    {/* 3. Over Sak */}
                    <label
                      onClick={() => setOutboundKolom("overZak")}
                      className={`p-2.5 rounded border cursor-pointer transition-all flex flex-col justify-between ${
                        outboundKolom === "overZak"
                          ? "border-amber-600 bg-amber-50/70 text-amber-950 font-bold shadow-2xs"
                          : "border-neutral-300 bg-white hover:border-neutral-400 text-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1 text-amber-900">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-600" /> Over Sak
                        </span>
                        <input
                          type="radio"
                          name="outboundKolom"
                          checked={outboundKolom === "overZak"}
                          onChange={() => setOutboundKolom("overZak")}
                          className="accent-amber-600"
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500 mt-1 font-normal">Repacking & bagging ulang</span>
                    </label>

                    {/* 4. Lain-lain */}
                    <label
                      onClick={() => setOutboundKolom("keluarLainLain")}
                      className={`p-2.5 rounded border cursor-pointer transition-all flex flex-col justify-between ${
                        outboundKolom === "keluarLainLain"
                          ? "border-purple-600 bg-purple-50/70 text-purple-950 font-bold shadow-2xs"
                          : "border-neutral-300 bg-white hover:border-neutral-400 text-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1 text-purple-900">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Lain-lain
                        </span>
                        <input
                          type="radio"
                          name="outboundKolom"
                          checked={outboundKolom === "keluarLainLain"}
                          onChange={() => setOutboundKolom("keluarLainLain")}
                          className="accent-purple-600"
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500 mt-1 font-normal">Sampel QC / uji coba</span>
                    </label>
                  </div>
                </div>

                {/* 3. JUMLAH (LEMBAR) */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wide">
                      3. Jumlah (Lembar) <span className="text-red-600">*</span>
                    </label>
                    {outboundItemId && outboundLembar && Number(outboundLembar) > 0 && (() => {
                      const it = items.find(i => i.id === outboundItemId);
                      const conv = it?.lembarPerBal || 500;
                      const bal = Math.round((Number(outboundLembar) / conv) * 10) / 10;
                      return (
                        <span className="text-[10px] text-rose-800 font-mono font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Setara: {bal} Bal
                        </span>
                      );
                    })()}
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      value={outboundLembar}
                      onChange={(e) => setOutboundLembar(e.target.value)}
                      placeholder="Contoh: 2500"
                      className="w-full p-2.5 text-sm border-2 border-rose-600 bg-white rounded font-mono font-bold text-rose-900 focus:outline-none focus:ring-1 focus:ring-rose-700"
                      required
                      min={1}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-neutral-500 font-mono">
                      LEMBAR
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  {outboundItemId && (() => {
                    const it = items.find(i => i.id === outboundItemId);
                    const conv = it?.lembarPerBal || 500;
                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase mr-1">Preset:</span>
                        {[1, 2, 5, 10].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setOutboundLembar(String(b * conv))}
                            className="px-2 py-0.5 bg-white border border-neutral-300 hover:border-rose-500 hover:text-rose-700 text-neutral-700 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors shadow-2xs"
                          >
                            +{ (b * conv).toLocaleString("id-ID") } ({b} Bal)
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* 4. KETERANGAN / NOMOR SPK */}
                <div>
                  <label className="block text-[11px] font-black text-neutral-800 uppercase tracking-wide mb-1">
                    4. Keterangan / No SPK / Bon Produksi <span className="text-neutral-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={outboundCatatan}
                    onChange={(e) => setOutboundCatatan(e.target.value)}
                    placeholder="Contoh: SPK-9902 Line Bagging 1 - BR 1"
                    className="w-full p-2 text-xs border border-neutral-300 bg-white rounded font-sans focus:outline-none focus:border-black"
                  />
                </div>

                {/* BUTTON SUBMIT */}
                <div className="pt-2 border-t border-neutral-300">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Proses Pengeluaran Karung</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: OFFICIAL PRINT FORMAT */}
      {activeSubTab === "print" && (
        <OfficialLaporanPembungkusView
          report={report}
          selectedDate={selectedDate}
          onUpdateReport={onUpdateReport}
          showNotification={showNotification}
        />
      )}

      {/* MODAL: ADD NEW ITEM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-lg shadow-2xl p-6 rounded animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 mb-4">
              <h3 className="font-serif italic text-lg font-bold text-neutral-900">
                Tambah Jenis Karung Baru
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Kode Karung</label>
                <input
                  type="text"
                  value={newItem.kode || ""}
                  onChange={(e) => setNewItem({ ...newItem, kode: e.target.value })}
                  placeholder="e.g. KRG-50-NEW"
                  className="w-full p-2 border border-neutral-300 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Nama Karung</label>
                <input
                  type="text"
                  value={newItem.namaKarung || ""}
                  onChange={(e) => setNewItem({ ...newItem, namaKarung: e.target.value })}
                  placeholder="e.g. Karung Woven 50 Kg - Broiler Finisher"
                  className="w-full p-2 border border-neutral-300 rounded font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Spesifikasi Ukuran & Gramasi</label>
                <input
                  type="text"
                  value={newItem.spesifikasi || ""}
                  onChange={(e) => setNewItem({ ...newItem, spesifikasi: e.target.value })}
                  placeholder="e.g. 60 x 100 cm | 80 GSM | Printing Hijau"
                  className="w-full p-2 border border-neutral-300 rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Lembar / Bal</label>
                  <input
                    type="number"
                    value={newItem.lembarPerBal || 500}
                    onChange={(e) => setNewItem({ ...newItem, lembarPerBal: Number(e.target.value) })}
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Stok Awal (Lbr)</label>
                  <input
                    type="number"
                    value={newItem.stockAwal || 0}
                    onChange={(e) => setNewItem({ ...newItem, stockAwal: Number(e.target.value) })}
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Min Stock</label>
                  <input
                    type="number"
                    value={newItem.minStock || 3000}
                    onChange={(e) => setNewItem({ ...newItem, minStock: Number(e.target.value) })}
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Lokasi Kavling</label>
                  <input
                    type="text"
                    value={newItem.gudangKav || ""}
                    onChange={(e) => setNewItem({ ...newItem, gudangKav: e.target.value })}
                    placeholder="e.g. Kav K-01"
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Supplier Rekanan</label>
                  <input
                    type="text"
                    value={newItem.suplier || ""}
                    onChange={(e) => setNewItem({ ...newItem, suplier: e.target.value })}
                    placeholder="e.g. PT. Kencana Maju"
                    className="w-full p-2 border border-neutral-300 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold cursor-pointer"
              >
                Simpan Karung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ITEM */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-lg shadow-2xl p-6 rounded animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 mb-4">
              <h3 className="font-serif italic text-lg font-bold text-neutral-900">
                Edit Data Karung: <span className="font-mono text-amber-800">{editingItem.kode}</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Nama Karung</label>
                <input
                  type="text"
                  value={editingItem.namaKarung}
                  onChange={(e) => setEditingItem({ ...editingItem, namaKarung: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Lokasi Kavling</label>
                <input
                  type="text"
                  value={editingItem.gudangKav || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, gudangKav: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Spesifikasi Ukuran</label>
                <input
                  type="text"
                  value={editingItem.spesifikasi}
                  onChange={(e) => setEditingItem({ ...editingItem, spesifikasi: e.target.value })}
                  className="w-full p-2 border border-neutral-300 rounded"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 bg-neutral-50 p-3 rounded border border-neutral-200">
                <div>
                  <label className="block font-bold text-neutral-600 uppercase mb-1 text-[10px]">Stok Awal</label>
                  <input
                    type="number"
                    value={editingItem.stockAwal || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, stockAwal: Number(e.target.value) })}
                    className="w-full p-1.5 border border-neutral-300 rounded font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-700 uppercase mb-1 text-[10px]">Masuk</label>
                  <input
                    type="number"
                    value={editingItem.masuk || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, masuk: Number(e.target.value) })}
                    className="w-full p-1.5 border border-emerald-400 bg-emerald-50/50 rounded font-mono text-center font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-rose-700 uppercase mb-1 text-[10px]">Keluar</label>
                  <input
                    type="number"
                    value={editingItem.keluar || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, keluar: Number(e.target.value) })}
                    className="w-full p-1.5 border border-rose-400 bg-rose-50/50 rounded font-mono text-center font-bold text-rose-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-700 uppercase mb-1 text-[10px]">Afkir</label>
                  <input
                    type="number"
                    value={editingItem.afkir || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, afkir: Number(e.target.value) })}
                    className="w-full p-1.5 border border-amber-400 bg-amber-50/50 rounded font-mono text-center font-bold text-amber-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Supplier Rekanan</label>
                  <input
                    type="text"
                    value={editingItem.suplier || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, suplier: e.target.value })}
                    className="w-full p-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Batas Min Stock (Alert)</label>
                  <input
                    type="number"
                    value={editingItem.minStock || 3000}
                    onChange={(e) => setEditingItem({ ...editingItem, minStock: Number(e.target.value) })}
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const item = editingItem;
                  setIsEditModalOpen(false);
                  setItemToDelete(item);
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Hapus item karung ini dari daftar mutasi"
              >
                <Trash2 className="w-4 h-4 text-rose-600" /> Hapus Karung Ini
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditItem}
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-black text-white rounded text-xs font-bold cursor-pointer shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS ITEM KARUNG */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-rose-600 w-full max-w-md shadow-2xl p-6 rounded animate-fade-in">
            <div className="flex items-start gap-3 border-b border-neutral-200 pb-3 mb-4">
              <div className="w-10 h-10 rounded bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif italic text-lg font-black text-neutral-900 leading-tight">
                  Hapus Data Karung
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Konfirmasi penghapusan jenis karung dari daftar mutasi
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded mb-4 space-y-1.5">
              <div className="text-xs font-bold text-neutral-900">
                {itemToDelete.namaKarung}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="bg-white border border-neutral-300 px-2 py-0.5 rounded text-neutral-700 font-bold">
                  Kode: {itemToDelete.kode}
                </span>
              </div>
              <div className="text-[11px] text-neutral-600 font-mono mt-1">
                Stok Saat Ini: <span className="font-bold text-neutral-900">{((itemToDelete.stockAwal || 0) + (itemToDelete.masuk || 0) - (itemToDelete.keluar || 0) - (itemToDelete.afkir || 0)).toLocaleString("id-ID")} Lbr</span> ({itemToDelete.gudangKav || "Kav K-01"})
              </div>
            </div>

            <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 p-2.5 rounded font-medium mb-5">
              ⚠️ Perhatian: Tindakan ini akan menghapus karung ini dari tabel laporan tanggal {selectedDate}.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteItem(itemToDelete.id)}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus Karung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS LOG INBOUND */}
      {inboundLogToDelete && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-rose-600 w-full max-w-md shadow-2xl p-6 rounded animate-fade-in">
            <div className="flex items-start gap-3 border-b border-neutral-200 pb-3 mb-4">
              <div className="w-10 h-10 rounded bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif italic text-lg font-black text-neutral-900 leading-tight">
                  Hapus Riwayat Penerimaan
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Hapus baris catatan log penerimaan barang masuk
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 p-3 rounded mb-4 space-y-1 text-xs">
              <div className="font-bold text-neutral-900">{inboundLogToDelete.namaKarung} ({inboundLogToDelete.kode})</div>
              <div className="font-mono text-emerald-800 font-bold">Jumlah: +{(inboundLogToDelete.jmlLembar || 0).toLocaleString("id-ID")} Lembar</div>
              <div className="text-neutral-500 text-[11px]">SLoct: {inboundLogToDelete.sloct} • Catatan: {inboundLogToDelete.catatan || "-"}</div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInboundLogToDelete(null)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteInboundLog(inboundLogToDelete.id)}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus Catatan Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS LOG OUTBOUND */}
      {outboundLogToDelete && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-rose-600 w-full max-w-md shadow-2xl p-6 rounded animate-fade-in">
            <div className="flex items-start gap-3 border-b border-neutral-200 pb-3 mb-4">
              <div className="w-10 h-10 rounded bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif italic text-lg font-black text-neutral-900 leading-tight">
                  Hapus Riwayat Pengeluaran
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Hapus log pengeluaran & kembalikan stok mutasi secara otomatis
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 p-3 rounded mb-4 space-y-1 text-xs">
              <div className="font-bold text-neutral-900">{outboundLogToDelete.namaKarung} ({outboundLogToDelete.kode})</div>
              <div className="font-mono text-rose-700 font-bold">Jumlah: -{(outboundLogToDelete.jmlLembar || 0).toLocaleString("id-ID")} Lembar</div>
              <div className="text-neutral-500 text-[11px]">SLoct: {outboundLogToDelete.sloct || "3001"} • Catatan: {outboundLogToDelete.catatan || "-"}</div>
            </div>

            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded font-medium mb-5">
              ✅ Stok keluar sebanyak {(outboundLogToDelete.jmlLembar || 0).toLocaleString("id-ID")} lembar akan dikembalikan ke stok mutasi karung tersebut.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOutboundLogToDelete(null)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteOutboundLog(outboundLogToDelete.id)}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus & Kembalikan Stok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIGNATURE MODAL WITH FILE UPLOAD */}
      {signatureModal && (
        <SignatureModal
          isOpen={signatureModal.isOpen}
          onClose={() => setSignatureModal(null)}
          onSave={(dataUrl) => {
            if (signatureModal.role === "dibuat") {
              onUpdateReport({ ...report, dibuatOlehSignature: dataUrl });
              showNotification("Tanda tangan pembuat laporan berhasil dipasang!", "success");
            } else {
              onUpdateReport({ ...report, mengetahuiSignature: dataUrl });
              showNotification("Tanda tangan pihak mengetahui berhasil dipasang!", "success");
            }
            setSignatureModal(null);
          }}
          title={signatureModal.title}
          defaultName={signatureModal.defaultName}
        />
      )}
    </div>
  );
}
