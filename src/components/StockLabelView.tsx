import React, { useState, useMemo } from "react";
import { 
  Tag, 
  Plus, 
  Printer, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Layers, 
  FileSpreadsheet, 
  Calendar,
  Sparkles,
  RefreshCw,
  Clock,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  Search,
  AlertTriangle
} from "lucide-react";
import { LabelItem, LabelReport, calculateAgeInDays, formatDDMMYY, DEFAULT_LABEL_SEED, getLabelNoRange } from "../types/label";
import { AddLabelModal, EditLabelModal } from "./label/LabelModals";
import { LabelTableTab } from "./label/LabelTableTab";
import { LabelInboundTab } from "./label/LabelInboundTab";
import { LabelOutboundTab } from "./label/LabelOutboundTab";
import { LabelPrintTab } from "./label/LabelPrintTab";
import { ConfirmModal } from "./ConfirmModal";

interface StockLabelViewProps {
  report: LabelReport;
  selectedDate: string;
  onUpdateReport: (updatedReport: LabelReport) => void;
  showNotification: (message: string, type?: "success" | "error" | "info") => void;
  onDateChange?: (date: string) => void;
  onSyncFromPreviousDay?: (currentDate: string) => void;
  previousReportDate?: string | null;
  onSaveStock?: () => void;
  canEditReport?: boolean;
  isGuest?: boolean;
}

export function StockLabelView({
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
}: StockLabelViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"table" | "inbound" | "outbound" | "print">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LabelItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<LabelItem | null>(null);

  const items = report.items || [];

  // Date Navigation Helper
  const handleOffsetDate = (offset: number) => {
    if (!onDateChange) return;
    const current = new Date(selectedDate);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + offset);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    let totalStockAwal = 0;
    let totalMasuk = 0;
    let totalKeluar = 0;
    let totalRusak = 0;
    let totalStockAkhir = 0;
    let lowStockCount = 0;

    items.forEach((item) => {
      const awal = item.stockAwal || 0;
      const pem = item.pembelian || 0;
      const ret = item.returProduksi || 0;
      const mskLain = item.masukLainLain || 0;
      const msk = item.masuk || (pem + ret + mskLain);

      const bon = item.bonProduksi || 0;
      const gdg = item.gudangKeluar || 0;
      const rsk = item.rusak || 0;
      const klrLain = item.keluarLainLain || 0;
      const klr = item.keluar || (bon + gdg + rsk + klrLain);

      const akhir = awal + msk - klr;

      totalStockAwal += awal;
      totalMasuk += msk;
      totalKeluar += klr;
      totalRusak += rsk;
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
      totalRusak,
      totalStockAkhir,
      lowStockCount
    };
  }, [items]);

  const handleUpdateItem = (id: string, updates: Partial<LabelItem>) => {
    const updated = items.map((it) => (it.id === id ? { ...it, ...updates } : it));
    onUpdateReport({ ...report, items: updated });
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
    const target = items.find((it) => it.id === id);
    if (!target) return;
    setItemToDelete(target);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    const updated = items.filter((it) => it.id !== target.id);
    onUpdateReport({ ...report, items: updated });
    showNotification(`Varian label "${target.namaLabel}" berhasil dihapus`, "info");
    setItemToDelete(null);
  };

  const handleAddItem = (newItem: LabelItem) => {
    if (isGuest) {
      showNotification("Akses Ditolak: Akun Tamu hanya memiliki hak akses Lihat Data (Read-Only). Tidak diizinkan menambah data!", "error");
      return;
    }
    if (canEditReport !== undefined && !canEditReport) {
      showNotification("Akses Terbatas: Hanya akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.", "error");
      return;
    }
    onUpdateReport({
      ...report,
      items: [...items, newItem]
    });
    showNotification(`Varian label "${newItem.namaLabel}" berhasil ditambahkan!`, "success");
  };

  const handleOpenEditModal = (item: LabelItem) => {
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
  };

  const handleSaveEditItem = (updatedItem: LabelItem) => {
    const updated = items.map((it) => (it.id === updatedItem.id ? updatedItem : it));
    onUpdateReport({ ...report, items: updated });
    setIsEditModalOpen(false);
    setEditingItem(null);
    showNotification(`Perubahan pada ${updatedItem.namaLabel} berhasil disimpan!`, "success");
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      "NO",
      "KODE",
      "JENIS BARANG",
      "WARNA",
      "SPESIFIKASI",
      "SATUAN",
      "TGL PEMAKAIAN TERAKHIR",
      "UMUR HARI",
      "STOK AWAL",
      "PEMBELIAN",
      "RETUR PRODUKSI",
      "MASUK LAIN",
      "SUBTOTAL MASUK",
      "BON PRODUKSI",
      "GUDANG KELUAR",
      "OVER SAK",
      "KELUAR LAIN",
      "SUBTOTAL KELUAR",
      "STOK AKHIR",
      "NO LABEL (AWAL)",
      "NO LABEL (AKHIR)",
      "KAVLING GUDANG",
      "RINCIAN FIFO LOT",
      "KETERANGAN"
    ];

    const rows = items.map((it, idx) => {
      const numAwal = it.stockAwal || 0;
      const numPem = it.pembelian || 0;
      const numRet = it.returProduksi || 0;
      const numMskLain = it.masukLainLain || 0;
      const totMasuk = it.masuk || (numPem + numRet + numMskLain);

      const numBon = it.bonProduksi || 0;
      const numGdg = it.gudangKeluar || 0;
      const numOver = (it as any).overZak !== undefined ? (it as any).overZak : (it.rusak || 0);
      const numKlrLain = it.keluarLainLain || 0;
      const totKeluar = it.keluar || (numBon + numGdg + numOver + numKlrLain);

      const stockAkhir = numAwal + totMasuk - totKeluar;
      const labelRange = getLabelNoRange(it);
      const lotsStr = (it.fifoLots || []).map((l) => `${l.kav} (${l.tglMasuk}: ${l.jmlLembar})`).join("; ");
      const umurPakaiHari = it.tglPemakaianTerakhir ? calculateAgeInDays(it.tglPemakaianTerakhir, selectedDate) : "";

      return [
        idx + 1,
        `"${it.kode}"`,
        `"${it.namaLabel}"`,
        `"${it.warna}"`,
        `"${it.spesifikasi || ""}"`,
        `"${it.satuan}"`,
        `"${it.tglPemakaianTerakhir ? formatDDMMYY(it.tglPemakaianTerakhir) : "-"}"`,
        umurPakaiHari,
        numAwal,
        numPem,
        numRet,
        numMskLain,
        totMasuk,
        numBon,
        numGdg,
        numOver,
        numKlrLain,
        totKeluar,
        stockAkhir,
        `"${labelRange.formattedStart || "-"}"`,
        `"${labelRange.formattedEnd || "-"}"`,
        `"${it.gudangKav || ""}"`,
        `"${lotsStr}"`,
        `"${it.keterangan || ""}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LAPORAN_FORMAT_CETAK_LABEL_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Laporan CSV Format Cetak Label berhasil diunduh!", "success");
  };

  const handleExportExcel = (headerOverrides?: {
    docCode?: string;
    sLoc?: string;
    companyTitle?: string;
    mainTitle?: string;
    subTitle?: string;
    unitTitle?: string;
    dibuatName?: string;
    dibuatRole?: string;
    mengetahuiName?: string;
    mengetahuiRole?: string;
  }) => {
    const sLoc = headerOverrides?.sLoc || report.gudangSLoct || "3001";
    const companyTitle = headerOverrides?.companyTitle || report.companyName || "PT. Japfa  Comfeed  Indonesia.Tbk – UNIT LPG";
    const mainTitle = headerOverrides?.mainTitle || report.title || "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS";
    const subTitle = headerOverrides?.subTitle || report.subTitle || "KARUNG PLASTIK / LABEL";
    const docCode = headerOverrides?.docCode || report.docCode || "PLT - WRH - FM – 03 - 01";
    const unitTitle = headerOverrides?.unitTitle || "( Satuan Lembar )";
    const dibuatName = headerOverrides?.dibuatName || report.dibuatOlehName || report.namaDibuat || "Sabto A";
    const dibuatRole = headerOverrides?.dibuatRole || report.dibuatOlehRole || "Admin Gudang";
    const mengetahuiName = headerOverrides?.mengetahuiName || report.mengetahuiName || report.namaDiketahui || "Antonius Andri Waroto";
    const mengetahuiRole = headerOverrides?.mengetahuiRole || report.mengetahuiRole || "Head Of Wrh Sub.Dept";

    // Format Indo Date: e.g. "Selasa ,01 September 2026"
    let formattedIndoDate = selectedDate;
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
        const dateNum = String(d.getDate()).padStart(2, "0");
        const monthName = months[d.getMonth()];
        const year = d.getFullYear();
        formattedIndoDate = `${dayName} ,${dateNum} ${monthName} ${year}`;
      }
    } catch {
      // fallback
    }

    const maxFifoLots = Math.max(3, ...items.map((i) => (i.fifoLots || []).length));
    const fifoLotsTotalQty = Array(maxFifoLots).fill(0);

    let totalStockAwal = 0;
    let totalPembelian = 0;
    let totalRetur = 0;
    let totalMasukLain = 0;
    let totalSubMasuk = 0;
    let totalBon = 0;
    let totalGudang = 0;
    let totalOverZak = 0;
    let totalKeluarLain = 0;
    let totalSubKeluar = 0;
    let totalStockAkhir = 0;

    items.forEach((it) => {
      const numAwal = it.stockAwal || 0;
      const numPem = it.pembelian || 0;
      const numRet = it.returProduksi || 0;
      const numMskLain = it.masukLainLain || 0;
      const subtotalMasuk = it.masuk || (numPem + numRet + numMskLain);

      const numBon = it.bonProduksi || 0;
      const numGdg = it.gudangKeluar || 0;
      const numOver = (it as any).overZak !== undefined ? (it as any).overZak : (it.rusak || 0);
      const numKlrLain = it.keluarLainLain || 0;
      const subtotalKeluar = it.keluar || (numBon + numGdg + numOver + numKlrLain);

      const stockAkhir = numAwal + subtotalMasuk - subtotalKeluar;

      totalStockAwal += numAwal;
      totalPembelian += numPem;
      totalRetur += numRet;
      totalMasukLain += numMskLain;
      totalSubMasuk += subtotalMasuk;
      totalBon += numBon;
      totalGudang += numGdg;
      totalOverZak += numOver;
      totalKeluarLain += numKlrLain;
      totalSubKeluar += subtotalKeluar;
      totalStockAkhir += stockAkhir;

      (it.fifoLots || []).forEach((lot, idx) => {
        if (idx < maxFifoLots) {
          fifoLotsTotalQty[idx] += (lot.jmlLembar || 0);
        }
      });
    });

    const totalCols = 16 + maxFifoLots;

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
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9.5pt; width: 100%; }
          th, td { border: 1px solid #000000; padding: 4px 6px; }
          .header-title { font-size: 13pt; font-weight: bold; text-align: center; }
          .header-meta { font-size: 9.5pt; font-weight: bold; }
          .bg-header { background-color: #FFFFFF; font-weight: bold; text-align: center; }
          .bg-subgroup { background-color: #FFFFFF; font-weight: bold; text-align: center; font-size: 9pt; }
          .bg-category { background-color: #FFFF99; font-weight: bold; font-size: 10pt; }
          .bg-total { background-color: #FFFFFF; font-weight: bold; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .text-red { color: #DC2626; font-weight: bold; }
          .text-blue { color: #2563EB; font-weight: bold; }
          .text-spec { color: #0055FF; font-size: 8pt; font-weight: normal; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <!-- TOP HEADER SECTION -->
          <tr>
            <td colspan="4" class="header-meta text-left" style="vertical-align: top; border: none;">
              <strong style="font-size: 11pt; font-family: serif;">${companyTitle}</strong><br/>
              <span style="font-size: 9pt; font-weight: bold;">Hari / Tanggal : ${formattedIndoDate}</span>
            </td>
            <td colspan="${totalCols - 7}" class="header-title" style="border: none; text-align: center;">
              <span style="font-size: 13pt; font-weight: 800; text-transform: uppercase;">${mainTitle}</span><br/>
              <span style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">${subTitle}</span><br/>
              <span style="font-size: 10pt; font-weight: bold;">GUDANG/S. LOC : ${sLoc}</span><br/>
              <span style="font-size: 9.5pt; font-weight: 600;">${unitTitle}</span>
            </td>
            <td colspan="3" class="header-meta text-right" style="vertical-align: top; border: none; text-align: right;">
              <table align="right" style="border-collapse: collapse; border: 1.5px solid #000000; display: inline-table;">
                <tr>
                  <td style="border: 1.5px solid #000000; padding: 3px 8px; font-weight: bold; font-family: monospace; font-size: 10pt; text-align: center;">
                    ${docCode}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td colspan="${totalCols}" style="border: none; height: 10px;"></td></tr>

          <!-- TABLE HEADER ROW 1 -->
          <tr>
            <th rowspan="2" class="bg-header" style="width: 35px; vertical-align: middle; text-align: center;">NO</th>
            <th rowspan="2" class="bg-header" style="width: 90px; vertical-align: middle; text-align: center;">KODE</th>
            <th rowspan="2" class="bg-header" style="width: 220px; vertical-align: middle; text-align: center;">JENIS BARANG</th>
            <th rowspan="2" class="bg-header" style="width: 100px; vertical-align: middle; text-align: center;">TGL<br/>PEMAKAIAN<br/>TERAKHIR</th>
            <th rowspan="2" class="bg-header" style="width: 80px; vertical-align: middle; text-align: center;">STOCK<br/>AWAL</th>
            <th colspan="4" class="bg-subgroup" style="text-align: center;">PENERIMAAN</th>
            <th colspan="5" class="bg-subgroup" style="text-align: center;">PENGELUARAN</th>
            <th rowspan="2" class="bg-header" style="width: 85px; vertical-align: middle; text-align: center;">STOCK<br/>AKHIR</th>
            <th colspan="${1 + maxFifoLots}" class="bg-subgroup" style="text-align: center;">URUTAN PEMAKAIAN SESUAI FIFO( KAV,TANGGAL MASUK,UMUR, JML LEMBAR)</th>
            <th rowspan="2" class="bg-header" style="width: 130px; vertical-align: middle; text-align: center;">NO LABEL</th>
          </tr>

          <!-- TABLE HEADER ROW 2 -->
          <tr>
            <th class="bg-header" style="width: 70px; text-align: center;">PEMBELIAN</th>
            <th class="bg-header" style="width: 75px; text-align: center;">RETUR<br/>PRODUKSI</th>
            <th class="bg-header" style="width: 70px; text-align: center;">LAIN-LAIN</th>
            <th class="bg-header" style="width: 75px; text-align: center;">SUBTOTAL</th>
            <th class="bg-header" style="width: 70px; text-align: center;">BON<br/>PRODUKSI</th>
            <th class="bg-header" style="width: 70px; text-align: center;">GUDANG</th>
            <th class="bg-header" style="width: 70px; text-align: center;">OVER SAK</th>
            <th class="bg-header" style="width: 70px; text-align: center;">LAIN-LAIN</th>
            <th class="bg-header" style="width: 75px; text-align: center;">SUBTOTAL</th>
            <th class="bg-header" style="width: 75px; text-align: center;">PARAMETER</th>
            ${Array.from({ length: maxFifoLots }).map((_, i) => `<th class="bg-header" style="width: 80px; text-align: center;">LOT ${i + 1}</th>`).join("")}
          </tr>

          <!-- GROUP BANNER: II. LABEL LABEL YANG DI PAKAI -->
          <tr style="background-color: #FFFF99; font-weight: bold; font-size: 10pt;">
            <td colspan="5" style="border-right: 1px solid #000000; padding: 4px 8px; text-align: left; font-weight: 900; background-color: #FFFF99;">
              II. LABEL &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; LABEL YANG DI PAKAI
            </td>
            <td colspan="4" style="border-right: 1px solid #000000; background-color: #FFFF99;"></td>
            <td colspan="5" style="border-right: 1px solid #000000; background-color: #FFFF99;"></td>
            <td style="border-right: 1px solid #000000; background-color: #FFFF99;"></td>
            <td colspan="${maxFifoLots + 1}" style="border-right: 1px solid #000000; background-color: #FFFF99;"></td>
            <td style="padding: 4px 8px; text-align: right; font-weight: bold; background-color: #FFFF99;">
              No Label
            </td>
          </tr>

          <!-- DATA ROWS -->
          ${items.map((it, idx) => {
            const numAwal = it.stockAwal || 0;
            const numPem = it.pembelian || 0;
            const numRet = it.returProduksi || 0;
            const numMskLain = it.masukLainLain || 0;
            const subtotalMasuk = it.masuk || (numPem + numRet + numMskLain);

            const numBon = it.bonProduksi || 0;
            const numGdg = it.gudangKeluar || 0;
            const numOver = (it as any).overZak !== undefined ? (it as any).overZak : (it.rusak || 0);
            const numKlrLain = it.keluarLainLain || 0;
            const subtotalKeluar = it.keluar || (numBon + numGdg + numOver + numKlrLain);

            const stockAkhir = numAwal + subtotalMasuk - subtotalKeluar;
            const lots = it.fifoLots || [];
            const labelRange = getLabelNoRange(it);

            const tglPakaiStr = it.tglPemakaianTerakhir ? formatDDMMYY(it.tglPemakaianTerakhir) : "";
            const umurPakaiHari = it.tglPemakaianTerakhir ? calculateAgeInDays(it.tglPemakaianTerakhir, selectedDate) : null;
            const usageCell = tglPakaiStr
              ? `<strong>${tglPakaiStr}</strong><br/><span style="font-size: 8pt; color: #555;">${umurPakaiHari !== null ? `${umurPakaiHari} hari` : ""}</span>`
              : "-";

            const labelRangeCell = labelRange.endNo > 0
              ? `<strong>${labelRange.formattedStart}</strong><br/><span class="text-red">${labelRange.formattedEnd}</span>${
                  it.keterangan && it.keterangan.trim() !== "" && !it.keterangan.includes(labelRange.formattedStart)
                    ? `<div style="font-size: 7.5pt; color: #555; border-top: 1px solid #ddd; margin-top: 2px; padding-top: 2px; text-align: left;">${it.keterangan}</div>`
                    : ""
                }`
              : `<span style="color: #888;">-</span>${it.keterangan ? `<div style="font-size: 7.5pt; color: #555; text-align: left;">${it.keterangan}</div>` : ""}`;

            return `
              <!-- SUB-ROW 1: Kav. -->
              <tr>
                <td rowspan="4" class="text-center bold" style="vertical-align: middle;">${idx + 1}</td>
                <td rowspan="4" class="text-center bold" style="mso-number-format:'\\@'; vertical-align: middle; font-family: monospace;">${it.kode}</td>
                <td rowspan="4" class="text-left" style="vertical-align: middle;">
                  <strong>${it.namaLabel}</strong>
                  ${it.warna ? ` (${it.warna})` : ""}
                  ${it.spesifikasi ? `<br/><span class="text-spec">${it.spesifikasi}</span>` : ""}
                </td>
                <td rowspan="4" class="text-center" style="vertical-align: middle;">${usageCell}</td>
                <td rowspan="4" class="text-right bold" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${numAwal.toLocaleString("id-ID")}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${numPem > 0 ? numPem.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${numRet > 0 ? numRet.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${numMskLain > 0 ? numMskLain.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right bold" style="vertical-align: middle; background-color: #FAFAFA; mso-number-format:'\\#\\,\\#\\#0';">${subtotalMasuk.toLocaleString("id-ID")}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${numBon > 0 ? numBon.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${numGdg > 0 ? numGdg.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${numOver > 0 ? numOver.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right" style="vertical-align: middle; mso-number-format:'\\#\\,\\#\\#0';">${numKlrLain > 0 ? numKlrLain.toLocaleString("id-ID") : ""}</td>
                <td rowspan="4" class="text-right bold" style="vertical-align: middle; background-color: #FAFAFA; mso-number-format:'\\#\\,\\#\\#0';">${subtotalKeluar.toLocaleString("id-ID")}</td>
                <td rowspan="4" class="text-right bold" style="vertical-align: middle; background-color: #F3F4F6; mso-number-format:'\\#\\,\\#\\#0';">${stockAkhir.toLocaleString("id-ID")}</td>
                <td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px;">Kav.</td>
                ${Array.from({ length: maxFifoLots }).map((_, lIdx) => {
                  const lot = lots[lIdx];
                  return `<td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px; font-family: monospace;">${lot ? (lot.kav || sLoc) : "-"}</td>`;
                }).join("")}
                <td rowspan="4" class="text-right" style="vertical-align: middle; font-family: monospace; font-size: 8.5pt; mso-number-format:'\\@';">${labelRangeCell}</td>
              </tr>

              <!-- SUB-ROW 2: Tgl. Msk -->
              <tr>
                <td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px;">Tgl. Msk</td>
                ${Array.from({ length: maxFifoLots }).map((_, lIdx) => {
                  const lot = lots[lIdx];
                  const lotDate = lot && lot.tglMasuk ? formatDDMMYY(lot.tglMasuk) : "-";
                  return `<td class="text-center bold text-red" style="vertical-align: middle; color: #DC2626; border: 1px solid #000000; padding: 3px 6px; font-family: monospace;">${lotDate}</td>`;
                }).join("")}
              </tr>

              <!-- SUB-ROW 3: Umur -->
              <tr>
                <td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px;">Umur</td>
                ${Array.from({ length: maxFifoLots }).map((_, lIdx) => {
                  const lot = lots[lIdx];
                  const lotAge = lot ? (lot.tglMasuk ? calculateAgeInDays(lot.tglMasuk, selectedDate) : (lot.umurHari || 0)) : null;
                  const lotAgeStr = lotAge !== null ? `${lotAge} Hari` : "-";
                  return `<td class="text-center bold text-blue" style="vertical-align: middle; color: #2563EB; border: 1px solid #000000; padding: 3px 6px; font-family: monospace;">${lotAgeStr}</td>`;
                }).join("")}
              </tr>

              <!-- SUB-ROW 4: Jml Lmbr -->
              <tr>
                <td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px;">Jml Lmbr</td>
                ${Array.from({ length: maxFifoLots }).map((_, lIdx) => {
                  const lot = lots[lIdx];
                  const lotQty = lot && lot.jmlLembar ? lot.jmlLembar.toLocaleString("id-ID") : "-";
                  return `<td class="text-center bold" style="vertical-align: middle; border: 1px solid #000000; padding: 3px 6px; font-family: monospace; mso-number-format:'\\#\\,\\#\\#0';">${lotQty}</td>`;
                }).join("")}
              </tr>
            `;
          }).join("")}

          <!-- TOTAL SUMMARY FOOTER -->
          <tr class="bg-total" style="border-top: 2px solid #000000; font-weight: bold;">
            <td colspan="4" class="text-center bold">TOTAL</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalStockAwal.toLocaleString("id-ID")}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalPembelian > 0 ? totalPembelian.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalRetur > 0 ? totalRetur.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalMasukLain > 0 ? totalMasukLain.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalSubMasuk.toLocaleString("id-ID")}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalBon > 0 ? totalBon.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalGudang > 0 ? totalGudang.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalOverZak > 0 ? totalOverZak.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalKeluarLain > 0 ? totalKeluarLain.toLocaleString("id-ID") : "-"}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalSubKeluar.toLocaleString("id-ID")}</td>
            <td class="text-right bold" style="mso-number-format:'\\#\\,\\#\\#0';">${totalStockAkhir.toLocaleString("id-ID")}</td>
            <td class="text-center bold">Total Qty</td>
            ${fifoLotsTotalQty.map((q) => `<td class="text-center bold" style="mso-number-format:'\\#\\,\\#\\#0';">${q > 0 ? q.toLocaleString("id-ID") : "-"}</td>`).join("")}
            <td class="text-center">-</td>
          </tr>

          <!-- SIGNATURES SECTION -->
          <tr><td colspan="${totalCols}" style="border: none; height: 25px;"></td></tr>
          <tr>
            <td colspan="5" class="text-center" style="border: none;">
              <strong>Dibuat Oleh:</strong><br/><br/><br/><br/>
              <u><strong>( ${dibuatName} )</strong></u><br/>
              <span style="font-size: 8.5pt; font-weight: 600;">${dibuatRole}</span>
            </td>
            <td colspan="${totalCols - 10}" style="border: none;"></td>
            <td colspan="5" class="text-center" style="border: none;">
              <strong>Mengetahui:</strong><br/><br/><br/><br/>
              <u><strong>( ${mengetahuiName} )</strong></u><br/>
              <span style="font-size: 8.5pt; font-weight: 600;">${mengetahuiRole}</span>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + excelHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LAPORAN_FORMAT_CETAK_LABEL_${sLoc}_${selectedDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("Format Cetak Laporan berhasil diekspor ke Excel (.xls)!", "success");
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in font-sans">
      {/* TOP HEADER CONTROLS CONTAINER */}
      <div className="bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif italic text-xl font-black text-neutral-900">
                  Manajemen & Mutasi Stock Label
                </h2>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Feed Label Inventory
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Monitoring persediaan label pakan 50kg, 25kg, label pakan broiler, layer, aksesoris kemasan, dan reject pabrik.
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
                  showNotification("Data Stock Label berhasil disimpan!", "success");
                }
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Simpan data stock label ke database"
            >
              <Save className="w-4 h-4 text-amber-100" /> 
              <span>Simpan Stock Label</span>
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
              title={canEditReport === false || isGuest ? "Hanya akun atas nama Sabto dan Antonius yang dapat menambah label" : "Tambah label baru"}
            >
              <Plus className="w-4 h-4" /> 
              <span>Tambah Label Baru</span>
            </button>
            <button
              onClick={() => handleExportExcel()}
              className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download Excel (.xls) dengan format cetak resmi lengkap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> 
              <span>Ekspor Excel (Format Cetak)</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV dengan format cetak resmi"
            >
              <Download className="w-4 h-4 text-neutral-700" /> 
              <span>Ekspor CSV (Format Cetak)</span>
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
              <span>{activeSubTab === "print" ? "Kembali ke Tabel" : "Cetak Laporan Label"}</span>
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
              onClick={() => onSyncFromPreviousDay(selectedDate)}
              className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-400 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Sinkronkan ulang Stok Awal hari ini dari Stok Akhir hari sebelumnya"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
              <span>Sinkronkan Stok dari {previousReportDate || "Kemarin"}</span>
            </button>
          )}
        </div>

        {/* KPI METRIC CARDS (6 CARDS GRID) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-[#FAF9F6] border border-neutral-300 p-3 rounded">
            <div className="text-[10px] font-bold uppercase text-neutral-500">Total Jenis Label</div>
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
              {metrics.totalRusak.toLocaleString("id-ID")} <span className="text-[10px] font-sans text-amber-800">Lbr</span>
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
            <Layers className="w-4 h-4" /> 
            <span>Tabel Mutasi Label</span>
          </button>
          <button
            onClick={() => setActiveSubTab("inbound")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "inbound"
                ? "border-emerald-600 text-emerald-800 font-extrabold bg-emerald-50/30"
                : "border-transparent text-neutral-600 hover:text-black"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> 
            <span>Penerimaan Label (Inbound)</span>
          </button>
          <button
            onClick={() => setActiveSubTab("outbound")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "outbound"
                ? "border-rose-600 text-rose-800 font-extrabold bg-rose-50/30"
                : "border-transparent text-neutral-600 hover:text-black"
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" /> 
            <span>Form Pemakaian & Afkir</span>
          </button>
          <button
            onClick={() => setActiveSubTab("print")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "print"
                ? "border-neutral-900 text-neutral-900 font-extrabold bg-neutral-100"
                : "border-transparent text-neutral-600 hover:text-black"
            }`}
          >
            <Printer className="w-4 h-4 text-neutral-700" /> 
            <span>Format Cetak / Laporan Resmi</span>
          </button>
        </div>
      </div>

      {/* ACTIVE SUB-TAB CONTENT */}
      {activeSubTab === "table" && (
        <LabelTableTab
          items={items}
          selectedDate={selectedDate}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterLowStockOnly={filterLowStockOnly}
          setFilterLowStockOnly={setFilterLowStockOnly}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onOpenEditModal={handleOpenEditModal}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          metrics={metrics}
          report={report}
          onUpdateReport={onUpdateReport}
          showNotification={showNotification}
        />
      )}

      {activeSubTab === "inbound" && (
        <LabelInboundTab
          report={report}
          selectedDate={selectedDate}
          onUpdateReport={onUpdateReport}
          showNotification={showNotification}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      )}

      {activeSubTab === "outbound" && (
        <LabelOutboundTab
          report={report}
          selectedDate={selectedDate}
          onUpdateReport={onUpdateReport}
          showNotification={showNotification}
        />
      )}

      {activeSubTab === "print" && (
        <LabelPrintTab
          report={report}
          selectedDate={selectedDate}
          onUpdateReport={onUpdateReport}
          onExportExcel={handleExportExcel}
          onExportCSV={handleExportCSV}
        />
      )}

      {/* MODALS */}
      {isAddModalOpen && (
        <AddLabelModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddItem}
          selectedDate={selectedDate}
        />
      )}

      {isEditModalOpen && (
        <EditLabelModal
          isOpen={isEditModalOpen}
          item={editingItem}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveEditItem}
          selectedDate={selectedDate}
        />
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Konfirmasi Hapus Varian Label"
        message={
          itemToDelete ? (
            <div className="space-y-2">
              <p>Apakah Anda yakin ingin menghapus data varian label berikut dari laporan:</p>
              <div className="p-2.5 bg-neutral-100 rounded border border-neutral-300 font-mono text-xs">
                <div className="font-bold text-neutral-900">{itemToDelete.namaLabel}</div>
                <div className="text-neutral-500 text-[11px]">Kode: {itemToDelete.kode}</div>
                <div className="text-neutral-500 text-[11px]">Kavling: {itemToDelete.gudangKav || "-"} | Stok: {((itemToDelete.stockAwal || 0) + (itemToDelete.masuk || 0) - (itemToDelete.keluar || 0)).toLocaleString("id-ID")} {itemToDelete.satuan}</div>
              </div>
              <p className="text-rose-600 font-semibold text-[11px]">
                Tindakan ini akan menghapus varian label ini beserta seluruh catatan saldo pada tanggal ini.
              </p>
            </div>
          ) : null
        }
        confirmText="Ya, Hapus Varian"
        cancelText="Batal"
        variant="danger"
        onConfirm={confirmDeleteItem}
        onClose={() => setItemToDelete(null)}
      />
    </div>
  );
}
