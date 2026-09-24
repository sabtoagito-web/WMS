import React, { useState, useMemo } from "react";
import { 
  Printer, 
  Download, 
  Edit3, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Layers, 
  RefreshCw,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Sparkles,
  Upload
} from "lucide-react";
import { KarungItem, KarungReport, KarungInboundLog, KarungOutboundLog, FIFOLot, DEFAULT_KARUNG_SEED, DEFAULT_INBOUND_LOGS_SEED, DEFAULT_OUTBOUND_LOGS_SEED, calculateAgeInDays, formatDDMMYY } from "../types/karung";
import { ConfirmModal } from "./ConfirmModal";
import { SignatureModal } from "./SignatureModal";

interface OfficialLaporanPembungkusViewProps {
  report: KarungReport;
  selectedDate: string;
  onUpdateReport: (updatedReport: KarungReport) => void;
  showNotification: (message: string, type?: "success" | "error" | "info") => void;
}

export function OfficialLaporanPembungkusView({
  report,
  selectedDate,
  onUpdateReport,
  showNotification
}: OfficialLaporanPembungkusViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KarungItem | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Quick Inbound Modal States
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [inboundItemId, setInboundItemId] = useState<string>("");
  const [inboundSloct, setInboundSloct] = useState<string>("");
  const [inboundLembar, setInboundLembar] = useState<string>("");
  const [inboundBal, setInboundBal] = useState<string>("");
  const [inboundKolom, setInboundKolom] = useState<"pembelian" | "returProduksi" | "masukLainLain">("pembelian");
  const [inboundCatatan, setInboundCatatan] = useState<string>("");

  // Quick Outbound Modal States
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const [outboundItemId, setOutboundItemId] = useState<string>("");
  const [outboundKolom, setOutboundKolom] = useState<"bonProduksi" | "gudangKeluar" | "overZak" | "keluarLainLain">("bonProduksi");
  const [outboundLembar, setOutboundLembar] = useState<string>("");
  const [outboundCatatan, setOutboundCatatan] = useState<string>("");

  // Header metadata states
  const [docCode, setDocCode] = useState(report.docCode || "PLT - WRH - FM – 03 - 01");
  const [sLoc, setSLoc] = useState(report.gudangSLoct || "3001");
  const [companyTitle, setCompanyTitle] = useState(report.companyName || "PT. Japfa  Comfeed  Indonesia.Tbk – UNIT LPG");
  const [mainTitle, setMainTitle] = useState(report.title || "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS");
  const [subTitle, setSubTitle] = useState(report.subTitle || "KARUNG PLASTIK");

  // Signatures
  const [dibuatOlehName, setDibuatOlehName] = useState(report.dibuatOlehName || "Sabto A");
  const [dibuatOlehRole, setDibuatOlehRole] = useState(report.dibuatOlehRole || "Admin Gudang");
  const [mengetahuiName, setMengetahuiName] = useState(report.mengetahuiName || "Antonius Andri Waroto");
  const [mengetahuiRole, setMengetahuiRole] = useState(report.mengetahuiRole || "Head Of Wrh Sub.Dept");
  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean;
    role: "dibuat" | "mengetahui";
    title: string;
    defaultName: string;
  } | null>(null);

  // New Item State for adding
  const [newItem, setNewItem] = useState<Partial<KarungItem>>({
    kode: "",
    namaKarung: "",
    kategori: "Karung 50 Kg",
    spesifikasi: "",
    lembarPerBal: 500,
    tglPemakaianTerakhir: "",
    umurPemakaianHari: 0,
    stockAwal: 0,
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
      { id: "lot-1", kav: "3001", tglMasuk: "", umurHari: 0, jmlLembar: 0 }
    ],
    gudangKav: "3001",
    suplier: "",
    batch: "",
    tglMasuk: selectedDate,
    minStock: 2000,
    keterangan: ""
  });

  const items = report.items && report.items.length > 0 ? report.items : DEFAULT_KARUNG_SEED;

  // Format date in Indonesian: e.g. "Kamis ,20 Agustus 2026"
  const formattedIndoDate = useMemo(() => {
    try {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const months = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        const dayName = days[d.getDay()];
        const dateNum = d.getDate();
        const monthName = months[d.getMonth()];
        const year = d.getFullYear();
        return `${dayName} ,${dateNum} ${monthName} ${year}`;
      }
    } catch {
      // fallback
    }
    return `Kamis ,20 Agustus 2026`;
  }, [selectedDate]);

  // Max number of FIFO columns across items (minimum 3 for visual fidelity)
  const maxFifoLots = useMemo(() => {
    let max = 3;
    items.forEach((it) => {
      if (it.fifoLots && it.fifoLots.length > max) {
        max = it.fifoLots.length;
      }
    });
    return max;
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.namaKarung.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.spesifikasi && item.spesifikasi.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchSearch;
    });
  }, [items, searchQuery]);

  // Save full report updates
  const handleSaveHeader = () => {
    const updated: KarungReport = {
      ...report,
      docCode,
      gudangSLoct: sLoc,
      companyName: companyTitle,
      title: mainTitle,
      subTitle,
      dibuatOlehName,
      dibuatOlehRole,
      mengetahuiName,
      mengetahuiRole,
      items
    };
    onUpdateReport(updated);
    setIsEditHeaderOpen(false);
    showNotification("Header & Metadata Laporan berhasil diperbarui!", "success");
  };

  // Save edited item
  const handleSaveEditedItem = () => {
    if (!editingItem) return;
    const orig = items.find((it) => it.id === editingItem.id);

    // Recalculate subtotals & akhir
    const masukSub = (editingItem.pembelian || 0) + (editingItem.returProduksi || 0) + (editingItem.masukLainLain || 0);
    const keluarSub = (editingItem.bonProduksi || 0) + (editingItem.gudangKeluar || 0) + (editingItem.overZak || 0) + (editingItem.keluarLainLain || 0);
    
    const finalizedItem: KarungItem = {
      ...editingItem,
      masuk: masukSub,
      keluar: keluarSub
    };

    const updatedItems = items.map((it) => (it.id === finalizedItem.id ? finalizedItem : it));
    let updatedInboundLogs = report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED;

    // Check if new incoming quantity was added via edit
    const diffPembelian = (editingItem.pembelian || 0) - (orig?.pembelian || 0);
    const diffRetur = (editingItem.returProduksi || 0) - (orig?.returProduksi || 0);
    const diffLain = (editingItem.masukLainLain || 0) - (orig?.masukLainLain || 0);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    if (diffPembelian > 0) {
      const newLog: KarungInboundLog = {
        id: `inbound-${Date.now()}-pem`,
        tanggal: selectedDate,
        waktu: timeStr,
        itemId: finalizedItem.id,
        kode: finalizedItem.kode,
        namaKarung: finalizedItem.namaKarung,
        kategori: finalizedItem.kategori,
        sloct: finalizedItem.gudangKav || sLoc || "3001",
        kolom: "pembelian",
        jmlLembar: diffPembelian,
        jmlBal: Math.round((diffPembelian / (finalizedItem.lembarPerBal || 500)) * 10) / 10,
        catatan: "Penyesuaian Masuk Pembelian (Edit Tabel FM-03-01)",
        operator: dibuatOlehName || "Admin Warehouse"
      };
      updatedInboundLogs = [newLog, ...updatedInboundLogs];
    }
    if (diffRetur > 0) {
      const newLog: KarungInboundLog = {
        id: `inbound-${Date.now()}-ret`,
        tanggal: selectedDate,
        waktu: timeStr,
        itemId: finalizedItem.id,
        kode: finalizedItem.kode,
        namaKarung: finalizedItem.namaKarung,
        kategori: finalizedItem.kategori,
        sloct: finalizedItem.gudangKav || sLoc || "3001",
        kolom: "returProduksi",
        jmlLembar: diffRetur,
        jmlBal: Math.round((diffRetur / (finalizedItem.lembarPerBal || 500)) * 10) / 10,
        catatan: "Penyesuaian Masuk Retur Produksi (Edit Tabel FM-03-01)",
        operator: dibuatOlehName || "Admin Warehouse"
      };
      updatedInboundLogs = [newLog, ...updatedInboundLogs];
    }
    if (diffLain > 0) {
      const newLog: KarungInboundLog = {
        id: `inbound-${Date.now()}-oth`,
        tanggal: selectedDate,
        waktu: timeStr,
        itemId: finalizedItem.id,
        kode: finalizedItem.kode,
        namaKarung: finalizedItem.namaKarung,
        kategori: finalizedItem.kategori,
        sloct: finalizedItem.gudangKav || sLoc || "3001",
        kolom: "masukLainLain",
        jmlLembar: diffLain,
        jmlBal: Math.round((diffLain / (finalizedItem.lembarPerBal || 500)) * 10) / 10,
        catatan: "Penyesuaian Masuk Lain-lain (Edit Tabel FM-03-01)",
        operator: dibuatOlehName || "Admin Warehouse"
      };
      updatedInboundLogs = [newLog, ...updatedInboundLogs];
    }

    const updatedReport: KarungReport = {
      ...report,
      items: updatedItems,
      inboundLogs: updatedInboundLogs
    };

    onUpdateReport(updatedReport);
    setIsEditModalOpen(false);
    setEditingItem(null);
    showNotification(`Data ${finalizedItem.kode} - ${finalizedItem.namaKarung} berhasil disimpan!`, "success");
  };

  // Add new item
  const handleAddNewItem = () => {
    if (!newItem.kode || !newItem.namaKarung) {
      showNotification("Harap isi Kode dan Nama Karung!", "error");
      return;
    }

    const masukSub = (newItem.pembelian || 0) + (newItem.returProduksi || 0) + (newItem.masukLainLain || 0);
    const keluarSub = (newItem.bonProduksi || 0) + (newItem.gudangKeluar || 0) + (newItem.overZak || 0) + (newItem.keluarLainLain || 0);

    const itemToInsert: KarungItem = {
      id: `krg-${Date.now()}`,
      kode: newItem.kode || "",
      namaKarung: newItem.namaKarung || "",
      kategori: newItem.kategori || "Karung 50 Kg",
      spesifikasi: newItem.spesifikasi || "",
      lembarPerBal: newItem.lembarPerBal || 500,
      tglPemakaianTerakhir: newItem.tglPemakaianTerakhir || "",
      umurPemakaianHari: newItem.umurPemakaianHari || 0,
      stockAwal: newItem.stockAwal || 0,
      pembelian: newItem.pembelian || 0,
      returProduksi: newItem.returProduksi || 0,
      masukLainLain: newItem.masukLainLain || 0,
      masuk: masukSub,
      bonProduksi: newItem.bonProduksi || 0,
      gudangKeluar: newItem.gudangKeluar || 0,
      overZak: newItem.overZak || 0,
      keluarLainLain: newItem.keluarLainLain || 0,
      keluar: keluarSub,
      afkir: newItem.afkir || 0,
      fifoLots: newItem.fifoLots || [{ id: "lot-1", kav: sLoc, tglMasuk: "", umurHari: 0, jmlLembar: 0 }],
      gudangKav: newItem.gudangKav || sLoc,
      suplier: newItem.suplier || "",
      batch: newItem.batch || "",
      tglMasuk: newItem.tglMasuk || selectedDate,
      minStock: newItem.minStock || 2000,
      keterangan: newItem.keterangan || ""
    };

    let updatedInboundLogs = report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    if (itemToInsert.pembelian && itemToInsert.pembelian > 0) {
      const newLog: KarungInboundLog = {
        id: `inbound-${Date.now()}-pem`,
        tanggal: selectedDate,
        waktu: timeStr,
        itemId: itemToInsert.id,
        kode: itemToInsert.kode,
        namaKarung: itemToInsert.namaKarung,
        kategori: itemToInsert.kategori,
        sloct: itemToInsert.gudangKav || sLoc || "3001",
        kolom: "pembelian",
        jmlLembar: itemToInsert.pembelian,
        jmlBal: Math.round((itemToInsert.pembelian / (itemToInsert.lembarPerBal || 500)) * 10) / 10,
        catatan: `Input item baru (Pembelian): ${itemToInsert.keterangan || ""}`,
        operator: dibuatOlehName || "Admin Warehouse"
      };
      updatedInboundLogs = [newLog, ...updatedInboundLogs];
    }

    const updatedItems = [...items, itemToInsert];
    onUpdateReport({ ...report, items: updatedItems, inboundLogs: updatedInboundLogs });
    setIsAddItemModalOpen(false);
    showNotification(`Karung ${itemToInsert.kode} berhasil ditambahkan ke laporan!`, "success");
  };

  // Quick Inbound Submit Handler
  const handleQuickInboundSubmit = (e: React.FormEvent) => {
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

    let newPembelian = item.pembelian || 0;
    let newReturProduksi = item.returProduksi || 0;
    let newMasukLainLain = item.masukLainLain || 0;
    let kolomLabel = "Pembelian";

    if (inboundKolom === "pembelian") {
      newPembelian += addedLembar;
      kolomLabel = "Pembelian";
    } else if (inboundKolom === "returProduksi") {
      newReturProduksi += addedLembar;
      kolomLabel = "Retur Produksi";
    } else {
      newMasukLainLain += addedLembar;
      kolomLabel = "Lain-lain Masuk";
    }

    const newMasuk = newPembelian + newReturProduksi + newMasukLainLain;
    const targetSloc = (inboundSloct.trim() || item.gudangKav || sLoc || "3001");

    // FIFO Lot Update Logic:
    // Retur Produksi & Lain-lain -> Masuk ke kavling FIFO yang sedang dipakai (menambah saldo lot aktif)
    // Pembelian -> Menambah Lot FIFO baru (PO Supplier)
    const existingLots = item.fifoLots || [];
    let updatedLots: FIFOLot[] = [...existingLots];

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
        updatedLots = [
          {
            id: `lot-${Date.now()}`,
            kav: targetSloc,
            tglMasuk: item.tglMasuk || selectedDate,
            umurHari: item.umurPemakaianHari || 0,
            jmlLembar: addedLembar
          }
        ];
      }
    } else {
      const newLot: FIFOLot = {
        id: `lot-${Date.now()}`,
        kav: targetSloc,
        tglMasuk: selectedDate,
        umurHari: 0,
        jmlLembar: addedLembar
      };
      updatedLots = [...existingLots, newLot];
    }

    const updatedItem: KarungItem = {
      ...item,
      pembelian: newPembelian,
      returProduksi: newReturProduksi,
      masukLainLain: newMasukLainLain,
      masuk: newMasuk,
      gudangKav: targetSloc,
      tglMasuk: selectedDate,
      fifoLots: updatedLots,
      keterangan: inboundCatatan
        ? `${item.keterangan || ""} | [${kolomLabel}] ${inboundCatatan}`.trim()
        : item.keterangan
    };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const newLog: KarungInboundLog = {
      id: `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tanggal: selectedDate,
      waktu: timeStr,
      itemId: item.id,
      kode: item.kode,
      namaKarung: item.namaKarung,
      kategori: item.kategori,
      sloct: targetSloc,
      kolom: inboundKolom,
      jmlLembar: addedLembar,
      jmlBal: Math.round((addedLembar / lembarPerBal) * 10) / 10,
      catatan: inboundCatatan ? `[${kolomLabel}] ${inboundCatatan}` : `Penerimaan ${kolomLabel}`,
      operator: dibuatOlehName || "Admin Warehouse"
    };

    const currentInboundLogs = report.inboundLogs || DEFAULT_INBOUND_LOGS_SEED;
    const updatedItems = items.map((it) => (it.id === updatedItem.id ? updatedItem : it));
    onUpdateReport({
      ...report,
      items: updatedItems,
      inboundLogs: [newLog, ...currentInboundLogs]
    });

    setIsInboundModalOpen(false);
    setInboundLembar("");
    setInboundBal("");
    setInboundCatatan("");
    showNotification(
      `Penerimaan [${kolomLabel}] +${addedLembar.toLocaleString("id-ID")} lbr (${item.namaKarung}) ke Sloct ${targetSloc} berhasil dicatat & masuk Log!`,
      "success"
    );
  };

  // Quick Outbound Submit Handler
  const handleQuickOutboundSubmit = (e: React.FormEvent) => {
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

    // Update specific outbound column
    const newBonProduksi = (item.bonProduksi || 0) + (outboundKolom === "bonProduksi" ? usedLembar : 0);
    const newGudangKeluar = (item.gudangKeluar || 0) + (outboundKolom === "gudangKeluar" ? usedLembar : 0);
    const newOverZak = (item.overZak || 0) + (outboundKolom === "overZak" ? usedLembar : 0);
    const newKeluarLainLain = (item.keluarLainLain || 0) + (outboundKolom === "keluarLainLain" ? usedLembar : 0);

    const subTotalKeluar = newBonProduksi + newGudangKeluar + newOverZak + newKeluarLainLain;
    const lembarPerBal = item.lembarPerBal || 500;
    const subTotalKeluarBal = Math.round((subTotalKeluar / lembarPerBal) * 10) / 10;

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

    // Tanggal pemakaian terakhir format (DD/MM/YY)
    const dateParts = selectedDate.split("-");
    const formattedLastUsed = dateParts.length === 3
      ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0].slice(2)}`
      : selectedDate;

    const updatedItem: KarungItem = {
      ...item,
      bonProduksi: newBonProduksi,
      gudangKeluar: newGudangKeluar,
      overZak: newOverZak,
      keluarLainLain: newKeluarLainLain,
      keluar: subTotalKeluar,
      keluarBal: subTotalKeluarBal,
      tglPemakaianTerakhir: formattedLastUsed,
      umurPemakaianHari: 0,
      fifoLots: updatedLots.length > 0 ? updatedLots : item.fifoLots,
      keterangan: outboundCatatan
        ? `${item.keterangan || ""} | [${labelKolom}] ${outboundCatatan}`.trim()
        : item.keterangan
    };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const newOutboundLog: KarungOutboundLog = {
      id: `outbound-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tanggal: selectedDate,
      waktu: timeStr,
      itemId: item.id,
      kode: item.kode,
      namaKarung: item.namaKarung,
      kategori: item.kategori,
      sloct: item.gudangKav || sLoc || "3001",
      kolom: outboundKolom,
      jmlLembar: usedLembar,
      jmlBal: Math.round((usedLembar / lembarPerBal) * 10) / 10,
      catatan: outboundCatatan ? `[${labelKolom}] ${outboundCatatan}` : `Pengeluaran ${labelKolom}`,
      operator: dibuatOlehName || "Operator Gudang"
    };

    const currentOutboundLogs = report.outboundLogs || DEFAULT_OUTBOUND_LOGS_SEED;
    const updatedItems = items.map((it) => (it.id === updatedItem.id ? updatedItem : it));
    onUpdateReport({
      ...report,
      items: updatedItems,
      outboundLogs: [newOutboundLog, ...currentOutboundLogs]
    });

    setIsOutboundModalOpen(false);
    setOutboundLembar("");
    setOutboundCatatan("");
    showNotification(
      `Pengeluaran [${labelKolom}] -${usedLembar.toLocaleString("id-ID")} lbr (${item.namaKarung}) berhasil dicatat & masuk Log!`,
      "success"
    );
  };

  // Delete item
  const handleDeleteItem = (id: string, name: string) => {
    setItemToDelete({ id, name });
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    const { id, name } = itemToDelete;
    const updatedItems = items.filter((it) => it.id !== id);
    onUpdateReport({ ...report, items: updatedItems });
    showNotification(`Item "${name}" telah dihapus dari laporan.`, "info");
    setItemToDelete(null);
  };

  // Export Excel (.xls) styled precisely like the official print layout
  const handleExportExcel = () => {
    const maxFifo = maxFifoLots;
    const itemsToExport = filteredItems;
    
    // Calculate column totals
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

    itemsToExport.forEach((it) => {
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

    const totalCols = 15 + maxFifo + 1; // NO, KODE, JENIS BARANG, TGL PEMAKAIAN, STOCK AWAL, (PEMB, RET, LAIN), SUB MASUK, (BON, GUD, OVER, LAIN), SUB KELUAR, STOCK AKHIR, PARAM, LOTS..., KET

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${docCode} - FM-03-01</x:Name>
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
          <!-- TOP HEADER SECTION -->
          <tr>
            <td colspan="4" class="header-meta text-left" style="vertical-align: top; border: none;">
              <strong style="font-size: 11pt;">${companyTitle}</strong><br/>
              <span>Hari / Tanggal : ${formattedIndoDate}</span>
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

          <!-- TABLE HEADER ROW 1 -->
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

          <!-- TABLE HEADER ROW 2 -->
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

          <!-- CATEGORY SECTION HEADER -->
          <tr>
            <td colspan="${totalCols}" class="bg-category"><strong>I. KARUNG</strong></td>
          </tr>

          <!-- DATA ROWS -->
          ${itemsToExport.map((it, idx) => {
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
            const paramCell = "Kav.<br/>Tgl. Msk<br/>Umur<br/>Jml Lmbr";

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

          <!-- GRAND TOTAL ROW -->
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

          <!-- SIGNATURES SECTION -->
          <tr><td colspan="${totalCols}" style="border: none; height: 25px;"></td></tr>
          <tr>
            <td colspan="4" class="text-center" style="border: none;">
              <strong>Dibuat Oleh,</strong><br/><br/><br/><br/>
              <u><strong>${dibuatOlehName}</strong></u><br/>
              <span style="font-size: 8.5pt;">${dibuatOlehRole}</span>
            </td>
            <td colspan="${totalCols - 8}" class="text-center" style="border: none;">
              <strong>Diperiksa Oleh,</strong><br/><br/><br/><br/>
              <u><strong>Supervisor Gudang</strong></u><br/>
              <span style="font-size: 8.5pt;">Spv. Warehouse & Sacks</span>
            </td>
            <td colspan="4" class="text-center" style="border: none;">
              <strong>Mengetahui,</strong><br/><br/><br/><br/>
              <u><strong>${mengetahuiName}</strong></u><br/>
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

  // Export CSV matching exact Official Format columns and structure
  const handleExportCSV = () => {
    const maxFifo = maxFifoLots;
    let csv = "";
    
    // Header block
    csv += `"${companyTitle}"\n`;
    csv += `"${mainTitle} - ${subTitle}"\n`;
    csv += `"GUDANG/S. LOC : ${sLoc}","( Satuan Lembar )","No Form : ${docCode}"\n`;
    csv += `"Hari / Tanggal : ${formattedIndoDate}"\n\n`;

    // 2-Tier Column Headers matching printable layout
    let headerRow1 = "NO,KODE,JENIS BARANG,SPESIFIKASI,TGL PEMAKAIAN TERAKHIR,UMUR (HARI),STOCK AWAL,PENERIMAAN,PENERIMAAN,PENERIMAAN,SUB TOTAL MASUK,PENGELUARAN,PENGELUARAN,PENGELUARAN,PENGELUARAN,SUB TOTAL KELUAR,STOCK AKHIR";
    let headerRow2 = ",,,,,,PEMBELIAN,RETUR PRODUKSI,LAIN LAIN,,,BON PRODUKSI,GUDANG,OVER ZAK,LAIN LAIN,,";

    for (let i = 1; i <= maxFifo; i++) {
      headerRow1 += `,URUTAN FIFO LOT ${i},LOT ${i} TGL MASUK,LOT ${i} UMUR (HARI),LOT ${i} JML (LBR)`;
      headerRow2 += ",KAV,TGL MASUK,UMUR,JML LEMBAR";
    }
    headerRow1 += ",KETERANGAN\n";
    headerRow2 += ",\n";

    csv += headerRow1 + headerRow2;

    // Category row
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

    filteredItems.forEach((it, idx) => {
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

    // Summary row
    let sumRow = `"TOTAL KESELURUHAN",,,,,,"${totalStockAwal}","${totalPembelian}","${totalRetur}","${totalMasukLain}","${totalSubMasuk}","${totalBon}","${totalGudang}","${totalOver}","${totalKeluarLain}","${totalSubKeluar}","${totalStockAkhir}"`;
    for (let i = 0; i < maxFifo; i++) {
      sumRow += `,"","","","${fifoLotsTotalQty[i]}"`;
    }
    sumRow += `,""\n\n`;
    csv += sumRow;

    // Signatures
    csv += `"Dibuat Oleh:","${dibuatOlehName} (${dibuatOlehRole})",,,"Diperiksa Oleh:","Supervisor Gudang",,,"Mengetahui:","${mengetahuiName} (${mengetahuiRole})"\n`;

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Format_Cetak_${sLoc}_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Format Cetak Laporan berhasil diekspor ke CSV!", "success");
  };

  return (
    <div className="space-y-4">
      {/* ACTION & CONTROLS TOOLBAR (HIDDEN IN PRINT) */}
      <div className="bg-white border-2 border-[#1A1A1A] p-4 rounded shadow-sm print:hidden flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-amber-100 text-amber-900 rounded font-mono font-bold text-xs">
            {docCode}
          </span>
          <div>
            <h2 className="font-serif italic font-bold text-base text-neutral-900">
              Format Cetak / Laporan Resmi Bahan Pembungkus
            </h2>
            <p className="text-[11px] text-neutral-500">
              Tampilan standar resmi Japfa (Satuan Lembar & Urutan Pemakaian FIFO).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SEARCH BOX */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari kode/nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded font-sans focus:outline-none focus:border-black w-40 md:w-52"
            />
          </div>

          <button
            onClick={() => setIsEditHeaderOpen(true)}
            className="px-3 py-1.5 border border-neutral-700 hover:bg-neutral-100 text-neutral-800 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Header
          </button>

          <button
            onClick={() => {
              setIsInboundModalOpen(true);
              if (items.length > 0 && !inboundItemId) {
                setInboundItemId(items[0].id);
                setInboundSloct(items[0].gudangKav || sLoc || "3001");
              }
            }}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-200" /> Input Penerimaan
          </button>

          <button
            onClick={() => {
              setIsOutboundModalOpen(true);
              if (items.length > 0 && !outboundItemId) {
                setOutboundItemId(items[0].id);
              }
            }}
            className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-200" /> Input Pengeluaran
          </button>

          <button
            onClick={() => setIsAddItemModalOpen(true)}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Karung
          </button>

          {/* EXPORT EXCEL (FORMAT CETAK) */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download Excel (.xls) dengan format cetak resmi & styling lengkap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" /> Ekspor Excel
          </button>

          {/* EXPORT CSV (FORMAT CETAK) */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-black text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download CSV dengan struktur format cetak resmi"
          >
            <Download className="w-3.5 h-3.5" /> Ekspor CSV
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-[#E35D15] hover:bg-[#c94f0e] text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan (Print)
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* OFFICIAL EXCEL-LIKE SPREADSHEET PAPER CONTAINER           */}
      {/* ========================================================= */}
      <div className="bg-white border-2 border-[#1A1A1A] p-4 md:p-6 rounded shadow-lg overflow-x-auto print:border-none print:shadow-none print:p-0 font-sans text-black">
        
        {/* TOP HEADER SECTION */}
        <div className="min-w-[1280px]">
          <div className="grid grid-cols-12 items-start pb-2 border-b border-black">
            {/* Top Left: Company Name & Date */}
            <div className="col-span-4 flex flex-col justify-start">
              <div className="text-[12px] font-bold text-neutral-800">
                {companyTitle}
              </div>
              <div className="text-[11px] font-bold text-neutral-800 mt-0.5">
                Hari / Tanggal : {formattedIndoDate}
              </div>
            </div>

            {/* Top Center: Official Title */}
            <div className="col-span-6 text-center">
              <h1 className="text-sm md:text-base font-black uppercase tracking-wider text-black">
                {mainTitle}
              </h1>
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-black">
                {subTitle}
              </h2>
              <div className="text-xs md:text-sm font-black uppercase tracking-wide text-black">
                GUDANG/S. LOC : {sLoc}
              </div>
              <div className="text-xs font-bold text-neutral-800">
                ( Satuan Lembar )
              </div>
            </div>

            {/* Top Right: Form Code */}
            <div className="col-span-2 text-right">
              <span className="text-xs md:text-sm font-black tracking-wider text-black font-mono">
                {docCode}
              </span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* MAIN DATA TABLE (PIXEL-PERFECT EXCEL GRID MATCH)        */}
          {/* ======================================================= */}
          <table className="w-full border-collapse border border-black text-[11px] mt-2 select-none">
            <thead>
              {/* ROW 1: PRIMARY HEADERS */}
              <tr className="bg-neutral-50 text-black font-bold text-center border-b border-black">
                <th rowSpan={2} className="border border-black px-1.5 py-1 w-8 uppercase">NO</th>
                <th rowSpan={2} className="border border-black px-2 py-1 w-24 uppercase">KODE</th>
                <th rowSpan={2} className="border border-black px-2 py-1 min-w-[180px] uppercase">JENIS BARANG</th>
                <th rowSpan={2} className="border border-black px-1.5 py-1 w-24 uppercase leading-tight">
                  TGL<br />PEMAKAIAN<br />TERAKHIR
                </th>
                <th rowSpan={2} className="border border-black px-2 py-1 w-20 uppercase leading-tight">
                  STOCK<br />AWAL
                </th>

                {/* PENERIMAAN GROUP */}
                <th colSpan={3} className="border border-black px-2 py-1 uppercase text-[10px] bg-neutral-100/70">
                  PENERIMAAN
                </th>
                <th rowSpan={2} className="border border-black px-1.5 py-1 w-16 uppercase text-[10px] leading-tight">
                  SUB TOTAL
                </th>

                {/* PENGELUARAN GROUP */}
                <th colSpan={4} className="border border-black px-2 py-1 uppercase text-[10px] bg-neutral-100/70">
                  PENGELUARAN
                </th>
                <th rowSpan={2} className="border border-black px-1.5 py-1 w-16 uppercase text-[10px] leading-tight">
                  SUB TOTAL
                </th>

                {/* STOCK AKHIR */}
                <th rowSpan={2} className="border border-black px-2 py-1 w-20 uppercase text-[10px] leading-tight">
                  STOCK AKHIR
                </th>

                {/* FIFO SECTION */}
                <th 
                  colSpan={1 + maxFifoLots} 
                  className="border border-black px-2 py-1 uppercase text-[10px] tracking-tight bg-neutral-100/70"
                >
                  URUTAN PEMAKAIAN SESUAI FIFO( KAV,TANGGAL MASUK,UMUR, JML LEMBAR)
                </th>

                {/* KETERANGAN */}
                <th rowSpan={2} className="border border-black px-2 py-1 w-28 uppercase text-[10px]">
                  KETERANGAN
                </th>

                <th rowSpan={2} className="border border-black px-1 py-1 w-12 uppercase text-[9px] print:hidden bg-neutral-100">
                  AKSI
                </th>
              </tr>

              {/* ROW 2: SUB-HEADERS FOR PENERIMAAN & PENGELUARAN */}
              <tr className="bg-neutral-50 text-black font-bold text-center border-b border-black text-[9px] uppercase">
                {/* Penerimaan columns */}
                <th className="border border-black px-1 py-1 w-14">PEMBELIAN</th>
                <th className="border border-black px-1 py-1 w-16 leading-tight">RETUR<br />PRODUKSI</th>
                <th className="border border-black px-1 py-1 w-14">LAIN LAIN</th>

                {/* Pengeluaran columns */}
                <th className="border border-black px-1 py-1 w-14 leading-tight">BON<br />PRODUKSI</th>
                <th className="border border-black px-1 py-1 w-14">GUDANG</th>
                <th className="border border-black px-1 py-1 w-14">OVER ZAK</th>
                <th className="border border-black px-1 py-1 w-14">LAIN LAIN</th>

                {/* FIFO column headers dummy spacer */}
                <th className="border border-black px-1 py-1 w-14 text-[8px] bg-neutral-100 text-neutral-600">
                  PARAMETER
                </th>
                {Array.from({ length: maxFifoLots }).map((_, i) => (
                  <th key={i} className="border border-black px-1 py-1 w-16 text-[9px]">
                    LOT {i + 1}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* SECTION HEADER ROW: I. KARUNG (Yellow Pale Background #FFFF99 / #FEF08A) */}
              <tr className="bg-[#FEF08A] font-bold text-black border-y border-black">
                <td 
                  colSpan={15 + maxFifoLots + 1} 
                  className="border border-black px-3 py-1 text-xs tracking-wider uppercase font-black"
                >
                  I. KARUNG
                </td>
              </tr>

              {/* DATA ROWS */}
              {filteredItems.map((item, index) => {
                const pembelian = item.pembelian || 0;
                const returProduksi = item.returProduksi || 0;
                const masukLain = item.masukLainLain || 0;
                const subTotalMasuk = pembelian + returProduksi + masukLain;

                const bonProduksi = item.bonProduksi || 0;
                const gudangKeluar = item.gudangKeluar || 0;
                const overZak = item.overZak || 0;
                const keluarLain = item.keluarLainLain || 0;
                const subTotalKeluar = bonProduksi + gudangKeluar + overZak + keluarLain;

                const stockAwal = item.stockAwal || 0;
                const stockAkhir = stockAwal + subTotalMasuk - subTotalKeluar - (item.afkir || 0);

                const lots = item.fifoLots || [];

                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-neutral-50/80 transition-colors border-b border-black align-top"
                  >
                    {/* NO */}
                    <td className="border border-black px-1.5 py-1.5 text-center font-bold">
                      {index + 1}
                    </td>

                    {/* KODE */}
                    <td className="border border-black px-2 py-1.5 font-mono text-[11px] text-neutral-900 font-bold">
                      {item.kode}
                    </td>

                    {/* JENIS BARANG (Bold Name on top, Blue Specs below) */}
                    <td className="border border-black px-2 py-1.5">
                      <div className="font-black text-black leading-snug">
                        {item.namaKarung}
                      </div>
                      {item.spesifikasi && (
                        <div className="text-[#0055FF] font-medium text-[10px] leading-tight mt-0.5">
                          {item.spesifikasi}
                        </div>
                      )}
                    </td>

                    {/* TGL PEMAKAIAN TERAKHIR */}
                    <td className="border border-black px-1.5 py-1.5 text-center leading-tight">
                      <div className="font-medium text-black font-mono">
                        {item.tglPemakaianTerakhir ? formatDDMMYY(item.tglPemakaianTerakhir) : "-"}
                      </div>
                      {item.tglPemakaianTerakhir && (
                        <div className="text-[10px] text-neutral-600 font-mono font-medium">
                          {calculateAgeInDays(item.tglPemakaianTerakhir, selectedDate)} hari
                        </div>
                      )}
                    </td>

                    {/* STOCK AWAL */}
                    <td className="border border-black px-2 py-1.5 text-right font-bold text-black font-mono">
                      {stockAwal.toLocaleString("id-ID")}
                    </td>

                    {/* PENERIMAAN: PEMBELIAN */}
                    <td className="border border-black px-1.5 py-1.5 text-right font-mono text-neutral-800">
                      {pembelian > 0 ? pembelian.toLocaleString("id-ID") : ""}
                    </td>

                    {/* PENERIMAAN: RETUR PRODUKSI */}
                    <td className="border border-black px-1.5 py-1.5 text-right font-mono text-neutral-800">
                      {returProduksi > 0 ? returProduksi.toLocaleString("id-ID") : ""}
                    </td>

                    {/* PENERIMAAN: LAIN LAIN */}
                    <td className="border border-black px-1.5 py-1.5 text-right font-mono text-neutral-800">
                      {masukLain > 0 ? masukLain.toLocaleString("id-ID") : ""}
                    </td>

                    {/* PENERIMAAN: SUB TOTAL */}
                    <td className="border border-black px-1.5 py-1.5 text-right font-bold font-mono text-black bg-neutral-50">
                      {subTotalMasuk.toLocaleString("id-ID")}
                    </td>

                    {/* PENGELUARAN: BON PRODUKSI */}
                    <td className="border border-black px-1.5 py-1.5 text-right font-mono text-neutral-800">
                      {bonProduksi > 0 ? bonProduksi.toLocaleString("id-ID") : ""}
                    </td>

                    {/* PENGELUARAN: GUDANG */}
                    <td className="border border-black px-1.5 py-1.5 text-right font-mono text-neutral-800">
                      {gudangKeluar > 0 ? gudangKeluar.toLocaleString("id-ID") : ""}
                    </td>

                    {/* PENGELUARAN: OVER ZAK */}
                    <td className="border border-black px-1.5 py-1.5 text-right font-mono text-neutral-800">
                      {overZak > 0 ? overZak.toLocaleString("id-ID") : ""}
                    </td>

                    {/* PENGELUARAN: LAIN LAIN */}
                    <td className="border border-black px-1.5 py-1.5 text-right font-mono text-neutral-800">
                      {keluarLain > 0 ? keluarLain.toLocaleString("id-ID") : ""}
                    </td>

                    {/* PENGELUARAN: SUB TOTAL */}
                    <td className="border border-black px-1.5 py-1.5 text-right font-bold font-mono text-black bg-neutral-50">
                      {subTotalKeluar.toLocaleString("id-ID")}
                    </td>

                    {/* STOCK AKHIR */}
                    <td className="border border-black px-2 py-1.5 text-right font-black font-mono text-black bg-neutral-100/40">
                      {stockAkhir.toLocaleString("id-ID")}
                    </td>

                    {/* ================================================= */}
                    {/* FIFO SECTION (4 STACKED ROWS IN MULTI-COLUMNS)   */}
                    {/* ================================================= */}
                    {/* FIFO Labels Column */}
                    <td className="border border-black p-0 text-[10px] font-bold text-black bg-white">
                      <div className="border-b border-black px-1.5 py-1 text-center font-bold">Kav.</div>
                      <div className="border-b border-black px-1.5 py-1 text-center font-bold whitespace-nowrap">Tgl.Masuk</div>
                      <div className="border-b border-black px-1.5 py-1 text-center font-bold">Umur</div>
                      <div className="px-1.5 py-1 text-center font-bold whitespace-nowrap">Jumlah Lembar</div>
                    </td>

                    {/* FIFO Dynamic Lots Columns */}
                    {Array.from({ length: maxFifoLots }).map((_, lotIdx) => {
                      const lot = lots[lotIdx];
                      if (!lot) {
                        return (
                          <td key={lotIdx} className="border border-black p-0 text-[10px] bg-white font-mono">
                            <div className="border-b border-black px-1 py-1 text-center font-bold text-black">-</div>
                            <div className="border-b border-black px-1 py-1 text-center font-bold text-black">-</div>
                            <div className="border-b border-black px-1 py-1 text-center font-bold text-black">-</div>
                            <div className="px-1 py-1 text-center font-bold text-black">-</div>
                          </td>
                        );
                      }

                      return (
                        <td key={lotIdx} className="border border-black p-0 text-[10px]">
                          {/* Row 1: Kavling (e.g. 3001) */}
                          <div className="border-b border-black px-1.5 py-0.5 text-center font-bold text-black font-mono">
                            {lot.kav || sLoc}
                          </div>

                          {/* Row 2: Tanggal Masuk (RED TEXT - DD/MM/YY) */}
                          <div className="border-b border-black px-1.5 py-0.5 text-center font-bold text-[#E00000] font-mono">
                            {lot.tglMasuk ? formatDDMMYY(lot.tglMasuk) : "-"}
                          </div>

                          {/* Row 3: Umur (BLUE TEXT e.g. 57 Hari) */}
                          <div className="border-b border-black px-1.5 py-0.5 text-center font-bold text-[#0044EE] font-mono">
                            {lot.tglMasuk
                              ? `${calculateAgeInDays(lot.tglMasuk, selectedDate)} Hari`
                              : lot.umurHari !== undefined
                              ? `${lot.umurHari} Hari`
                              : "-"}
                          </div>

                          {/* Row 4: Jumlah Lembar (BOLD BLACK) */}
                          <div className="px-1.5 py-0.5 text-center font-black text-black font-mono">
                            {lot.jmlLembar ? lot.jmlLembar.toLocaleString("id-ID") : "0"}
                          </div>
                        </td>
                      );
                    })}

                    {/* KETERANGAN */}
                    <td className="border border-black px-2 py-1.5 text-neutral-800 text-[10px] leading-tight">
                      {item.keterangan || "-"}
                    </td>

                    {/* AKSI (EDIT/DELETE) - HIDDEN IN PRINT */}
                    <td className="border border-black px-1 py-1.5 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingItem({ ...item });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer"
                          title="Edit Item & Lots"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.namaKarung)}
                          className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ======================================================= */}
          {/* SIGNATURE SECTION (OFFICIAL AUDIT SIGN-OFF)             */}
          {/* ======================================================= */}
          <div className="mt-8 pt-4 border-t border-black grid grid-cols-3 gap-8 text-center text-xs">
            {/* DIBUAT OLEH */}
            <div>
              <div className="text-[11px] font-bold text-neutral-700 uppercase">Dibuat Oleh,</div>
              <div 
                onClick={() => setSignatureModal({
                  isOpen: true,
                  role: "dibuat",
                  title: "Tanda Tangan - Pembuat Laporan Karung",
                  defaultName: dibuatOlehName
                })}
                className="h-16 flex items-center justify-center cursor-pointer border border-dashed border-neutral-300 hover:border-black rounded my-1 relative group print:border-none"
                title="Klik untuk upload atau buat tanda tangan digital"
              >
                {report.dibuatOlehSignature ? (
                  <img src={report.dibuatOlehSignature} alt="TTD Dibuat" className="max-h-14 max-w-full object-contain mix-blend-multiply" />
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-black italic print:hidden">
                    <Upload className="w-3.5 h-3.5" />
                    <span>(Upload / TTD)</span>
                  </div>
                )}
                {report.dibuatOlehSignature && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateReport({ ...report, dibuatOlehSignature: null });
                    }}
                    className="absolute top-1 right-1 p-0.5 text-red-600 hover:bg-red-50 rounded print:hidden cursor-pointer"
                    title="Hapus tanda tangan"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="font-bold underline text-black uppercase">{dibuatOlehName}</div>
              <div className="text-[10px] text-neutral-600 font-sans">{dibuatOlehRole}</div>
            </div>

            {/* DIPERIKSA OLEH */}
            <div>
              <div className="text-[11px] font-bold text-neutral-700 uppercase">Diperiksa Oleh,</div>
              <div className="h-16 flex items-center justify-center my-1">
                <span className="font-serif italic text-neutral-300 text-xs">( Quality / Adm )</span>
              </div>
              <div className="font-bold underline text-black uppercase">Supervisor Gudang</div>
              <div className="text-[10px] text-neutral-600 font-sans">Spv. Warehouse & Sacks</div>
            </div>

            {/* MENGETAHUI */}
            <div>
              <div className="text-[11px] font-bold text-neutral-700 uppercase">Mengetahui,</div>
              <div 
                onClick={() => setSignatureModal({
                  isOpen: true,
                  role: "mengetahui",
                  title: "Tanda Tangan - Mengetahui (Head of WH)",
                  defaultName: mengetahuiName
                })}
                className="h-16 flex items-center justify-center cursor-pointer border border-dashed border-neutral-300 hover:border-black rounded my-1 relative group print:border-none"
                title="Klik untuk upload atau buat tanda tangan digital"
              >
                {report.mengetahuiSignature ? (
                  <img src={report.mengetahuiSignature} alt="TTD Mengetahui" className="max-h-14 max-w-full object-contain mix-blend-multiply" />
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-black italic print:hidden">
                    <Upload className="w-3.5 h-3.5" />
                    <span>(Upload / TTD)</span>
                  </div>
                )}
                {report.mengetahuiSignature && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateReport({ ...report, mengetahuiSignature: null });
                    }}
                    className="absolute top-1 right-1 p-0.5 text-red-600 hover:bg-red-50 rounded print:hidden cursor-pointer"
                    title="Hapus tanda tangan"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="font-bold underline text-black uppercase">{mengetahuiName}</div>
              <div className="text-[10px] text-neutral-600 font-sans">{mengetahuiRole}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: EDIT HEADER & METADATA                             */}
      {/* ========================================================= */}
      {isEditHeaderOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-lg shadow-2xl p-6 rounded animate-fade-in">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 mb-4">
              <h3 className="font-serif italic text-lg font-bold text-neutral-900">
                Edit Informasi Header Laporan
              </h3>
              <button onClick={() => setIsEditHeaderOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Nama Perusahaan / Unit</label>
                <input
                  type="text"
                  value={companyTitle}
                  onChange={(e) => setCompanyTitle(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Judul Utama</label>
                  <input
                    type="text"
                    value={mainTitle}
                    onChange={(e) => setMainTitle(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Sub Judul</label>
                  <input
                    type="text"
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Gudang / S.LOC</label>
                  <input
                    type="text"
                    value={sLoc}
                    onChange={(e) => setSLoc(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded font-mono font-bold text-amber-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Kode Dokumen</label>
                  <input
                    type="text"
                    value={docCode}
                    onChange={(e) => setDocCode(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded font-mono font-bold text-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Dibuat Oleh (Admin)</label>
                  <input
                    type="text"
                    value={dibuatOlehName}
                    onChange={(e) => setDibuatOlehName(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Mengetahui (Head Dept)</label>
                  <input
                    type="text"
                    value={mengetahuiName}
                    onChange={(e) => setMengetahuiName(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsEditHeaderOpen(false)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveHeader}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Simpan Header
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT ITEM & FIFO LOTS                              */}
      {/* ========================================================= */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-3xl shadow-2xl p-6 rounded animate-fade-in max-h-[92vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 mb-4">
              <div>
                <h3 className="font-serif italic text-lg font-bold text-neutral-900">
                  Edit Data Karung & Urutan FIFO
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  Kode: <span className="font-bold text-black">{editingItem.kode}</span> - {editingItem.namaKarung}
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Kode Barang</label>
                  <input
                    type="text"
                    value={editingItem.kode}
                    onChange={(e) => setEditingItem({ ...editingItem, kode: e.target.value })}
                    className="w-full p-2 border border-neutral-300 rounded font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Jenis Barang / Nama Karung</label>
                  <input
                    type="text"
                    value={editingItem.namaKarung}
                    onChange={(e) => setEditingItem({ ...editingItem, namaKarung: e.target.value })}
                    className="w-full p-2 border border-neutral-300 rounded font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Spesifikasi Ukuran & Gramasi</label>
                  <input
                    type="text"
                    value={editingItem.spesifikasi || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, spesifikasi: e.target.value })}
                    placeholder="e.g. 070X107 10/10 800 2C"
                    className="w-full p-2 border border-neutral-300 rounded text-blue-700 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Stok Awal (Lembar)</label>
                  <input
                    type="number"
                    value={editingItem.stockAwal || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, stockAwal: Number(e.target.value) })}
                    className="w-full p-2 border border-neutral-300 rounded font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-neutral-700 uppercase">Tgl Pemakaian Terakhir</label>
                    <span className="text-[10px] text-blue-700 font-medium font-mono">Auto Umur</span>
                  </div>
                  <input
                    type="text"
                    value={editingItem.tglPemakaianTerakhir || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const calculatedAge = val ? calculateAgeInDays(val, selectedDate) : 0;
                      setEditingItem({
                        ...editingItem,
                        tglPemakaianTerakhir: val,
                        umurPemakaianHari: calculatedAge
                      });
                    }}
                    placeholder="e.g. 13/08/26"
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    Umur Pemakaian (Hari) <span className="text-neutral-400 font-normal">(Otomatis)</span>
                  </label>
                  <input
                    type="number"
                    value={editingItem.umurPemakaianHari || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, umurPemakaianHari: Number(e.target.value) })}
                    className="w-full p-2 border border-neutral-300 bg-neutral-50 rounded font-mono font-bold text-neutral-800"
                  />
                </div>
              </div>

              {/* MUTASI BREAKDOWN */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* PENERIMAAN */}
                <div className="bg-emerald-50/60 p-3 rounded border border-emerald-200">
                  <h4 className="font-bold text-emerald-900 uppercase text-[11px] mb-2 border-b border-emerald-200 pb-1">
                    Rincian Penerimaan (Masuk)
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 uppercase">Pembelian</label>
                      <input
                        type="number"
                        value={editingItem.pembelian || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, pembelian: Number(e.target.value) })}
                        className="w-full p-1.5 border border-emerald-300 rounded font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 uppercase">Retur Produksi</label>
                      <input
                        type="number"
                        value={editingItem.returProduksi || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, returProduksi: Number(e.target.value) })}
                        className="w-full p-1.5 border border-emerald-300 rounded font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 uppercase">Lain-Lain</label>
                      <input
                        type="number"
                        value={editingItem.masukLainLain || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, masukLainLain: Number(e.target.value) })}
                        className="w-full p-1.5 border border-emerald-300 rounded font-mono text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* PENGELUARAN */}
                <div className="bg-rose-50/60 p-3 rounded border border-rose-200">
                  <h4 className="font-bold text-rose-900 uppercase text-[11px] mb-2 border-b border-rose-200 pb-1">
                    Rincian Pengeluaran (Keluar)
                  </h4>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-700 uppercase">Bon Prod.</label>
                      <input
                        type="number"
                        value={editingItem.bonProduksi || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, bonProduksi: Number(e.target.value) })}
                        className="w-full p-1.5 border border-rose-300 rounded font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-700 uppercase">Gudang</label>
                      <input
                        type="number"
                        value={editingItem.gudangKeluar || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, gudangKeluar: Number(e.target.value) })}
                        className="w-full p-1.5 border border-rose-300 rounded font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-700 uppercase">Over Zak</label>
                      <input
                        type="number"
                        value={editingItem.overZak || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, overZak: Number(e.target.value) })}
                        className="w-full p-1.5 border border-rose-300 rounded font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-700 uppercase">Lainnya</label>
                      <input
                        type="number"
                        value={editingItem.keluarLainLain || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, keluarLainLain: Number(e.target.value) })}
                        className="w-full p-1.5 border border-rose-300 rounded font-mono text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* FIFO LOTS DYNAMIC EDITOR */}
              <div className="bg-neutral-50 p-3 rounded border border-neutral-300">
                <div className="flex justify-between items-center mb-2 border-b border-neutral-200 pb-1">
                  <h4 className="font-bold text-neutral-800 uppercase text-[11px]">
                    Urutan Pemakaian FIFO (Lot Kavling, Tgl Masuk, Umur, Jml Lembar)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newLots = [
                        ...(editingItem.fifoLots || []),
                        { id: `lot-${Date.now()}`, kav: sLoc, tglMasuk: "", umurHari: 0, jmlLembar: 0 }
                      ];
                      setEditingItem({ ...editingItem, fifoLots: newLots });
                    }}
                    className="text-[10px] font-bold px-2 py-1 bg-neutral-800 hover:bg-black text-white rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Tambah Lot FIFO
                  </button>
                </div>

                <div className="space-y-2">
                  {(editingItem.fifoLots || []).map((lot, lIdx) => (
                    <div key={lot.id || lIdx} className="grid grid-cols-5 gap-2 items-center bg-white p-2 rounded border border-neutral-200">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-500 uppercase">Kavling</label>
                        <input
                          type="text"
                          value={lot.kav}
                          onChange={(e) => {
                            const newLots = [...(editingItem.fifoLots || [])];
                            newLots[lIdx].kav = e.target.value;
                            setEditingItem({ ...editingItem, fifoLots: newLots });
                          }}
                          className="w-full p-1 text-xs border border-neutral-300 rounded font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-red-600 uppercase">Tgl Masuk</label>
                        <input
                          type="text"
                          value={lot.tglMasuk}
                          placeholder="e.g. 24/06/26"
                          onChange={(e) => {
                            const val = e.target.value;
                            const calcAge = val ? calculateAgeInDays(val, selectedDate) : 0;
                            const newLots = [...(editingItem.fifoLots || [])];
                            newLots[lIdx].tglMasuk = val;
                            newLots[lIdx].umurHari = calcAge;
                            setEditingItem({ ...editingItem, fifoLots: newLots });
                          }}
                          className="w-full p-1 text-xs border border-red-300 rounded font-mono text-red-700 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-blue-600 uppercase">Umur (Hari)</label>
                        <input
                          type="number"
                          value={lot.tglMasuk ? calculateAgeInDays(lot.tglMasuk, selectedDate) : (lot.umurHari || 0)}
                          onChange={(e) => {
                            const newLots = [...(editingItem.fifoLots || [])];
                            newLots[lIdx].umurHari = Number(e.target.value);
                            setEditingItem({ ...editingItem, fifoLots: newLots });
                          }}
                          className="w-full p-1 text-xs border border-blue-300 bg-blue-50/50 rounded font-mono text-blue-700 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-700 uppercase">Jml Lembar</label>
                        <input
                          type="number"
                          value={lot.jmlLembar || 0}
                          onChange={(e) => {
                            const newLots = [...(editingItem.fifoLots || [])];
                            newLots[lIdx].jmlLembar = Number(e.target.value);
                            setEditingItem({ ...editingItem, fifoLots: newLots });
                          }}
                          className="w-full p-1 text-xs border border-neutral-300 rounded font-mono font-bold"
                        />
                      </div>
                      <div className="flex justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const newLots = (editingItem.fifoLots || []).filter((_, idx) => idx !== lIdx);
                            setEditingItem({ ...editingItem, fifoLots: newLots });
                          }}
                          className="p-1 hover:bg-rose-100 rounded text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={editingItem.keterangan || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, keterangan: e.target.value })}
                  placeholder="e.g. Kondisi fisik baik, siap kirim"
                  className="w-full p-2 border border-neutral-300 rounded"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditedItem}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH ITEM BARU                                   */}
      {/* ========================================================= */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-2xl shadow-2xl p-6 rounded animate-fade-in max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 mb-4">
              <h3 className="font-serif italic text-lg font-bold text-neutral-900">
                Tambah Item Karung / Bahan Pembungkus Baru
              </h3>
              <button onClick={() => setIsAddItemModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Kode Karung</label>
                  <input
                    type="text"
                    value={newItem.kode || ""}
                    onChange={(e) => setNewItem({ ...newItem, kode: e.target.value })}
                    placeholder="e.g. 700511020010"
                    className="w-full p-2 border border-neutral-300 rounded font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Nama Karung / Pakan</label>
                  <input
                    type="text"
                    value={newItem.namaKarung || ""}
                    onChange={(e) => setNewItem({ ...newItem, namaKarung: e.target.value })}
                    placeholder="e.g. ABS CRUMBLE"
                    className="w-full p-2 border border-neutral-300 rounded font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Spesifikasi Ukuran</label>
                  <input
                    type="text"
                    value={newItem.spesifikasi || ""}
                    onChange={(e) => setNewItem({ ...newItem, spesifikasi: e.target.value })}
                    placeholder="e.g. 070X107 10/10 800 2C"
                    className="w-full p-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Stok Awal (Lbr)</label>
                  <input
                    type="number"
                    value={newItem.stockAwal || 0}
                    onChange={(e) => setNewItem({ ...newItem, stockAwal: Number(e.target.value) })}
                    className="w-full p-2 border border-neutral-300 rounded font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Tgl Pemakaian Terakhir</label>
                  <input
                    type="text"
                    value={newItem.tglPemakaianTerakhir || ""}
                    onChange={(e) => setNewItem({ ...newItem, tglPemakaianTerakhir: e.target.value })}
                    placeholder="e.g. 13/08/26"
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Umur Pemakaian (Hari)</label>
                  <input
                    type="number"
                    value={newItem.umurPemakaianHari || 0}
                    onChange={(e) => setNewItem({ ...newItem, umurPemakaianHari: Number(e.target.value) })}
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold"
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

      {/* ========================================================= */}
      {/* MODAL: FITUR INPUT PENERIMAAN (4 STEP INPUT)              */}
      {/* ========================================================= */}
      {isInboundModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-xl shadow-2xl p-6 rounded animate-fade-in max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
              <div>
                <h3 className="font-serif italic text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-700" />
                  Input Penerimaan Karung
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Catat mutasi masuk karung langsung ke tabel laporan resmi FM-03-01.
                </p>
              </div>
              <button
                onClick={() => setIsInboundModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1 rounded hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickInboundSubmit} className="space-y-4 text-xs">
              
              {/* 1. PILIH JENIS KARUNG */}
              <div className="bg-[#FAF9F6] border border-neutral-300 p-3.5 rounded">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1 flex items-center justify-between">
                  <span>1. Pilih Jenis Karung <span className="text-red-600">*</span></span>
                  {inboundItemId && (
                    <span className="text-[10px] text-emerald-700 font-bold font-mono">
                      Stok Awal: {items.find(it => it.id === inboundItemId)?.stockAwal?.toLocaleString("id-ID")} Lbr
                    </span>
                  )}
                </label>
                <select
                  value={inboundItemId}
                  onChange={(e) => {
                    setInboundItemId(e.target.value);
                    const found = items.find((it) => it.id === e.target.value);
                    if (found) {
                      setInboundSloct(found.gudangKav || sLoc || "3001");
                    }
                  }}
                  className="w-full p-2 text-xs border border-neutral-800 bg-white rounded font-semibold focus:outline-none"
                  required
                >
                  <option value="" disabled>-- Pilih Jenis Karung --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.kode} - {it.namaKarung} ({it.spesifikasi || it.kategori})
                    </option>
                  ))}
                </select>
                {inboundItemId && (() => {
                  const it = items.find(i => i.id === inboundItemId);
                  if (!it) return null;
                  return (
                    <div className="mt-2 text-[10px] bg-white p-2 rounded border border-neutral-200 grid grid-cols-3 gap-1 font-mono text-neutral-700">
                      <div><span className="text-neutral-400">Kode:</span> <strong>{it.kode}</strong></div>
                      <div><span className="text-neutral-400">Kemasan:</span> <strong>{it.lembarPerBal || 500} lbr/bal</strong></div>
                      <div><span className="text-neutral-400">SLoc:</span> <strong className="text-emerald-700">{it.gudangKav || sLoc}</strong></div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. TENTUKAN MASUK KOLOM */}
              <div className="bg-[#FAF9F6] border border-neutral-300 p-3.5 rounded">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-2">
                  2. Tentukan Masuk Kolom <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Opsi Pembelian */}
                  <label
                    onClick={() => setInboundKolom("pembelian")}
                    className={`p-2.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between text-center ${
                      inboundKolom === "pembelian"
                        ? "border-emerald-700 bg-emerald-50 text-emerald-950 shadow-xs font-bold"
                        : "border-neutral-200 bg-white hover:border-neutral-400 text-neutral-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] uppercase">📦 Pembelian</span>
                      <input
                        type="radio"
                        name="quickInboundCol"
                        checked={inboundKolom === "pembelian"}
                        onChange={() => setInboundKolom("pembelian")}
                        className="accent-emerald-700"
                      />
                    </div>
                    <span className="text-[9px] text-neutral-500 mt-1">PO Supplier (Lot Baru)</span>
                  </label>

                  {/* Opsi Retur Produksi */}
                  <label
                    onClick={() => {
                      setInboundKolom("returProduksi");
                      const found = items.find((it) => it.id === inboundItemId);
                      if (found) {
                        const usedKav = found.fifoLots?.[0]?.kav || found.gudangKav || sLoc || "3001";
                        setInboundSloct(usedKav);
                      }
                    }}
                    className={`p-2.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between text-center ${
                      inboundKolom === "returProduksi"
                        ? "border-blue-700 bg-blue-50 text-blue-950 shadow-xs font-bold"
                        : "border-neutral-200 bg-white hover:border-neutral-400 text-neutral-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] uppercase">🔄 Retur Produksi</span>
                      <input
                        type="radio"
                        name="quickInboundCol"
                        checked={inboundKolom === "returProduksi"}
                        onChange={() => {
                          setInboundKolom("returProduksi");
                          const found = items.find((it) => it.id === inboundItemId);
                          if (found) {
                            const usedKav = found.fifoLots?.[0]?.kav || found.gudangKav || sLoc || "3001";
                            setInboundSloct(usedKav);
                          }
                        }}
                        className="accent-blue-700"
                      />
                    </div>
                    <span className="text-[9px] text-neutral-500 mt-1">Masuk Kavling FIFO Aktif</span>
                  </label>

                  {/* Opsi Lain-lain */}
                  <label
                    onClick={() => {
                      setInboundKolom("masukLainLain");
                      const found = items.find((it) => it.id === inboundItemId);
                      if (found) {
                        const usedKav = found.fifoLots?.[0]?.kav || found.gudangKav || sLoc || "3001";
                        setInboundSloct(usedKav);
                      }
                    }}
                    className={`p-2.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between text-center ${
                      inboundKolom === "masukLainLain"
                        ? "border-amber-700 bg-amber-50 text-amber-950 shadow-xs font-bold"
                        : "border-neutral-200 bg-white hover:border-neutral-400 text-neutral-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] uppercase">➕ Lain-lain</span>
                      <input
                        type="radio"
                        name="quickInboundCol"
                        checked={inboundKolom === "masukLainLain"}
                        onChange={() => {
                          setInboundKolom("masukLainLain");
                          const found = items.find((it) => it.id === inboundItemId);
                          if (found) {
                            const usedKav = found.fifoLots?.[0]?.kav || found.gudangKav || sLoc || "3001";
                            setInboundSloct(usedKav);
                          }
                        }}
                        className="accent-amber-700"
                      />
                    </div>
                    <span className="text-[9px] text-neutral-500 mt-1">Masuk Kavling FIFO Aktif</span>
                  </label>
                </div>
              </div>

              {/* 3. SLOCT */}
              <div className="bg-[#FAF9F6] border border-neutral-300 p-3.5 rounded">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1 flex items-center justify-between">
                  <span>3. Sloct (Storage Location / Kavling Simpan) <span className="text-red-600">*</span></span>
                  {(inboundKolom === "returProduksi" || inboundKolom === "masukLainLain") && (
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Masuk ke Kavling FIFO yang dipakai
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={inboundSloct}
                  onChange={(e) => setInboundSloct(e.target.value)}
                  placeholder="Contoh: 3001, 3002, Kav K-01"
                  className="w-full p-2 text-xs border border-neutral-800 bg-white rounded font-mono font-bold focus:outline-none"
                  required
                />

                {/* FIFO Lot Target helper when retur/lain-lain is active */}
                {inboundItemId && (inboundKolom === "returProduksi" || inboundKolom === "masukLainLain") && (() => {
                  const item = items.find(it => it.id === inboundItemId);
                  const lots = item?.fifoLots || [];
                  if (lots.length === 0) return null;
                  return (
                    <div className="mt-2 p-2 bg-blue-50/80 border border-blue-200 rounded text-[11px] text-blue-900">
                      <div className="font-bold flex items-center gap-1">
                        <span>🎯 Kavling FIFO Aktif yang Digunakan:</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {lots.map((lot, idx) => (
                          <button
                            key={lot.id || idx}
                            type="button"
                            onClick={() => setInboundSloct(lot.kav)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 cursor-pointer transition-colors ${
                              inboundSloct.trim().toLowerCase() === lot.kav.trim().toLowerCase() || (idx === 0 && !inboundSloct)
                                ? "bg-blue-700 text-white border-blue-800 font-bold shadow-xs"
                                : "bg-white text-blue-800 border-blue-300 hover:bg-blue-100"
                            }`}
                          >
                            <span>Lot #{idx + 1} ({lot.kav})</span>
                            <span className="opacity-80">[{lot.jmlLembar?.toLocaleString("id-ID") || 0} lbr]</span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[10px] text-blue-700 italic">
                        *Stok penerimaan retur/lain-lain akan langsung menambahkan saldo lembar pada lot FIFO di atas.
                      </p>
                    </div>
                  );
                })()}

                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] text-neutral-500 font-bold self-center">Pilihan:</span>
                  {["3001", "3002", "3003", "K-01", "K-02"].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setInboundSloct(loc)}
                      className="px-2 py-0.5 text-[9px] bg-neutral-200 hover:bg-neutral-800 hover:text-white rounded font-mono transition-colors cursor-pointer"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. JUMLAH (LEMBAR) */}
              <div className="bg-[#FAF9F6] border border-neutral-300 p-3.5 rounded">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1.5">
                  4. Jumlah (Lembar) <span className="text-red-600">*</span>
                </label>
                <div>
                  <input
                    type="number"
                    value={inboundLembar}
                    onChange={(e) => setInboundLembar(e.target.value)}
                    placeholder="Contoh: 5000 Lembar"
                    className="w-full p-2 text-sm border-2 border-emerald-600 font-mono font-bold text-emerald-800 bg-white rounded focus:outline-none"
                    required
                  />
                  <div className="mt-1 flex flex-wrap gap-1">
                    {[500, 1000, 2500, 5000, 10000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setInboundLembar(String(preset))}
                        className="px-2 py-0.5 text-[9px] bg-neutral-200 hover:bg-neutral-800 hover:text-white rounded font-mono transition-colors cursor-pointer"
                      >
                        +{preset.toLocaleString("id-ID")} Lbr
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2.5">
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">
                    Catatan / Keterangan Tambahan
                  </label>
                  <input
                    type="text"
                    value={inboundCatatan}
                    onChange={(e) => setInboundCatatan(e.target.value)}
                    placeholder="Contoh: Kondisi packing baik dan bersih"
                    className="w-full p-1.5 text-xs border border-neutral-300 bg-white rounded"
                  />
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="pt-3 border-t border-neutral-300 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInboundModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Simpan Penerimaan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: FITUR INPUT PENGELUARAN (BON, GUDANG, OVER SAK, LAIN) */}
      {/* ========================================================= */}
      {isOutboundModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-xl shadow-2xl p-6 rounded animate-fade-in max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
              <div>
                <h3 className="font-serif italic text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-rose-700" />
                  Input Pengeluaran Karung
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Catat pemakaian & mutasi keluar karung langsung ke tabel laporan resmi FM-03-01.
                </p>
              </div>
              <button
                onClick={() => setIsOutboundModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1 rounded hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickOutboundSubmit} className="space-y-4 text-xs">
              
              {/* 1. PILIH JENIS KARUNG */}
              <div className="bg-[#FAF9F6] border border-neutral-300 p-3.5 rounded">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1 flex items-center justify-between">
                  <span>1. Pilih Jenis Karung <span className="text-red-600">*</span></span>
                  {outboundItemId && (() => {
                    const it = items.find(i => i.id === outboundItemId);
                    if (!it) return null;
                    const sisa = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.afkir || 0);
                    return (
                      <span className="text-[10px] text-emerald-800 font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Sisa Stok: {sisa.toLocaleString("id-ID")} Lbr
                      </span>
                    );
                  })()}
                </label>
                <select
                  value={outboundItemId}
                  onChange={(e) => setOutboundItemId(e.target.value)}
                  className="w-full p-2 text-xs border border-neutral-800 bg-white rounded font-semibold focus:outline-none"
                  required
                >
                  <option value="" disabled>-- Pilih Jenis Karung --</option>
                  {items.map((it) => {
                    const sisa = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.afkir || 0);
                    return (
                      <option key={it.id} value={it.id}>
                        {it.kode} - {it.namaKarung} ({it.spesifikasi || it.kategori}) [Sisa: {sisa.toLocaleString("id-ID")} Lbr]
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
                    <div className="mt-2 text-[10px] bg-white p-2 rounded border border-neutral-200 grid grid-cols-3 gap-1 font-mono text-neutral-700">
                      <div><span className="text-neutral-400">Kode:</span> <strong>{it.kode}</strong></div>
                      <div><span className="text-neutral-400">Kemasan:</span> <strong>{conv} lbr/bal</strong></div>
                      <div><span className="text-neutral-400">SLoc:</span> <strong className="text-emerald-700">{it.gudangKav || sLoc}</strong></div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. TENTUKAN MASUK KOLOM */}
              <div className="bg-[#FAF9F6] border border-neutral-300 p-3.5 rounded">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-2">
                  2. Tentukan Masuk Kolom Pengeluaran <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Opsi Bon Produksi */}
                  <label
                    onClick={() => setOutboundKolom("bonProduksi")}
                    className={`p-2.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between text-center ${
                      outboundKolom === "bonProduksi"
                        ? "border-rose-700 bg-rose-50 text-rose-950 shadow-xs font-bold"
                        : "border-neutral-200 bg-white hover:border-neutral-400 text-neutral-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-rose-900">Bon Produksi</span>
                      <input
                        type="radio"
                        name="quickOutboundCol"
                        checked={outboundKolom === "bonProduksi"}
                        onChange={() => setOutboundKolom("bonProduksi")}
                        className="accent-rose-700"
                      />
                    </div>
                    <span className="text-[9px] text-neutral-500 mt-1">Bagging Produksi</span>
                  </label>

                  {/* Opsi Gudang */}
                  <label
                    onClick={() => setOutboundKolom("gudangKeluar")}
                    className={`p-2.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between text-center ${
                      outboundKolom === "gudangKeluar"
                        ? "border-blue-700 bg-blue-50 text-blue-950 shadow-xs font-bold"
                        : "border-neutral-200 bg-white hover:border-neutral-400 text-neutral-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-blue-900">Gudang</span>
                      <input
                        type="radio"
                        name="quickOutboundCol"
                        checked={outboundKolom === "gudangKeluar"}
                        onChange={() => setOutboundKolom("gudangKeluar")}
                        className="accent-blue-700"
                      />
                    </div>
                    <span className="text-[9px] text-neutral-500 mt-1">Transfer Gudang</span>
                  </label>

                  {/* Opsi Over Sak */}
                  <label
                    onClick={() => setOutboundKolom("overZak")}
                    className={`p-2.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between text-center ${
                      outboundKolom === "overZak"
                        ? "border-amber-700 bg-amber-50 text-amber-950 shadow-xs font-bold"
                        : "border-neutral-200 bg-white hover:border-neutral-400 text-neutral-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-amber-900">Over Sak</span>
                      <input
                        type="radio"
                        name="quickOutboundCol"
                        checked={outboundKolom === "overZak"}
                        onChange={() => setOutboundKolom("overZak")}
                        className="accent-amber-700"
                      />
                    </div>
                    <span className="text-[9px] text-neutral-500 mt-1">Over Sak Pakan</span>
                  </label>

                  {/* Opsi Lain-lain */}
                  <label
                    onClick={() => setOutboundKolom("keluarLainLain")}
                    className={`p-2.5 rounded border-2 cursor-pointer transition-all flex flex-col justify-between text-center ${
                      outboundKolom === "keluarLainLain"
                        ? "border-purple-700 bg-purple-50 text-purple-950 shadow-xs font-bold"
                        : "border-neutral-200 bg-white hover:border-neutral-400 text-neutral-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-purple-900">Lain-lain</span>
                      <input
                        type="radio"
                        name="quickOutboundCol"
                        checked={outboundKolom === "keluarLainLain"}
                        onChange={() => setOutboundKolom("keluarLainLain")}
                        className="accent-purple-700"
                      />
                    </div>
                    <span className="text-[9px] text-neutral-500 mt-1">Keluar Lainnya</span>
                  </label>
                </div>
              </div>

              {/* 3. JUMLAH (LEMBAR) */}
              <div className="bg-[#FAF9F6] border border-neutral-300 p-3.5 rounded">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black text-neutral-800 uppercase tracking-wide">
                    3. Jumlah (Lembar) <span className="text-red-600">*</span>
                  </label>
                  {outboundItemId && outboundLembar && Number(outboundLembar) > 0 && (() => {
                    const it = items.find(i => i.id === outboundItemId);
                    const conv = it?.lembarPerBal || 500;
                    const bal = Math.round((Number(outboundLembar) / conv) * 10) / 10;
                    return (
                      <span className="text-[10px] text-rose-800 font-mono font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        ≈ {bal} Bal (Bundle)
                      </span>
                    );
                  })()}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    value={outboundLembar}
                    onChange={(e) => setOutboundLembar(e.target.value)}
                    placeholder="Masukkan jumlah lembar, contoh: 2500"
                    className="w-full p-2 text-sm border-2 border-rose-600 bg-white rounded font-mono font-bold text-rose-900 focus:outline-none"
                    required
                    min={1}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500 font-mono">
                    LEMBAR
                  </span>
                </div>

                {/* Quick Presets */}
                {outboundItemId && (() => {
                  const it = items.find(i => i.id === outboundItemId);
                  const conv = it?.lembarPerBal || 500;
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] text-neutral-500 font-bold uppercase">Preset:</span>
                      {[1, 2, 5, 10].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setOutboundLembar(String(b * conv))}
                          className="px-2 py-0.5 text-[9px] bg-white border border-neutral-300 hover:border-rose-500 hover:text-rose-700 rounded font-mono transition-colors cursor-pointer"
                        >
                          +{ (b * conv).toLocaleString("id-ID") } Lbr ({b} Bal)
                        </button>
                      ))}
                    </div>
                  );
                })()}

                <div className="mt-2.5">
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">
                    Catatan / Nomor SPK / Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={outboundCatatan}
                    onChange={(e) => setOutboundCatatan(e.target.value)}
                    placeholder="Contoh: Line Bagging A - Pakan BR-1 Shift 1"
                    className="w-full p-1.5 text-xs border border-neutral-300 bg-white rounded"
                  />
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="pt-3 border-t border-neutral-300 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOutboundModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 rounded text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ArrowUpRight className="w-4 h-4" /> Proses Pengeluaran
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ITEM MODAL */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Konfirmasi Hapus Item Karung"
        message={
          itemToDelete ? (
            <div className="space-y-2">
              <p>Apakah Anda yakin ingin menghapus item karung pembungkus berikut dari laporan?</p>
              <div className="p-2.5 bg-neutral-100 rounded border border-neutral-300 font-mono text-xs font-bold text-neutral-900">
                {itemToDelete.name}
              </div>
              <p className="text-neutral-500 text-[11px]">
                Data mutasi stok, kartu stok, dan lot FIFO terkait item ini pada laporan akan ikut terhapus.
              </p>
            </div>
          ) : null
        }
        confirmText="Ya, Hapus Item"
        cancelText="Batal"
        variant="danger"
        onConfirm={confirmDeleteItem}
        onClose={() => setItemToDelete(null)}
      />

      {/* SIGNATURE MODAL WITH FILE UPLOAD */}
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
