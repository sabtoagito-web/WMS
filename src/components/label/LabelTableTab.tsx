import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Tag, 
  Check, 
  Calendar,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Boxes,
  Upload,
  Signature as SignatureIcon
} from "lucide-react";
import { LabelItem, LabelReport, LabelFIFOLot, calculateAgeInDays, formatDDMMYY, getLabelNoRange } from "../../types/label";
import { SignatureModal } from "../SignatureModal";

interface LabelTableTabProps {
  items: LabelItem[];
  selectedDate: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterLowStockOnly: boolean;
  setFilterLowStockOnly: (val: boolean | ((prev: boolean) => boolean)) => void;
  onUpdateItem: (id: string, updates: Partial<LabelItem>) => void;
  onDeleteItem: (id: string) => void;
  onOpenEditModal: (item: LabelItem) => void;
  onOpenAddModal: () => void;
  metrics: {
    totalItems: number;
    totalStockAwal: number;
    totalMasuk: number;
    totalKeluar: number;
    totalRusak: number;
    totalStockAkhir: number;
    lowStockCount: number;
  };
  report?: LabelReport;
  onUpdateReport?: (updatedReport: LabelReport) => void;
  showNotification?: (message: string, type?: "success" | "error" | "info") => void;
}

export function LabelTableTab({
  items,
  selectedDate,
  searchQuery,
  setSearchQuery,
  filterLowStockOnly,
  setFilterLowStockOnly,
  onUpdateItem,
  onDeleteItem,
  onOpenEditModal,
  onOpenAddModal,
  metrics,
  report,
  onUpdateReport,
  showNotification
}: LabelTableTabProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [cellValue, setCellValue] = useState<string>("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Signature Modal State
  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean;
    role: "dibuat" | "mengetahui";
    title: string;
    defaultName: string;
  } | null>(null);

  const filteredItems = items.filter((item) => {
    const matchSearch =
      searchQuery.trim() === "" ||
      item.namaLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.warna.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.suplier || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.gudangKav || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.spesifikasi || "").toLowerCase().includes(searchQuery.toLowerCase());

    const stockAkhir = (item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0) - (item.rusak || 0);
    const matchLowStock = !filterLowStockOnly || stockAkhir <= (item.minStock || 0);

    return matchSearch && matchLowStock;
  });

  const handleStartCellEdit = (id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field });
    setCellValue(String(currentValue ?? 0));
  };

  const handleSaveCellEdit = (id: string, field: string) => {
    const num = Number(cellValue) || 0;
    const currentItem = items.find((it) => it.id === id);
    if (!currentItem) return;

    const updates: Partial<LabelItem> = { [field]: num };
    onUpdateItem(id, updates);
    setEditingCell(null);
  };

  return (
    <div className="bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm print:hidden">
      {/* SEARCH & CATEGORY FILTER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode, nama, kavling..."
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:border-neutral-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Stok Kritis Filter Button */}
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

        {/* Counter Info */}
        <div className="text-xs text-neutral-500 font-mono">
          Menampilkan {filteredItems.length} dari {items.length} label
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead>
            <tr className="bg-neutral-50/80 border-b border-neutral-300 text-neutral-800 text-[11px] font-bold">
              <th className="p-3 text-center w-10">No</th>
              <th className="p-3 w-28">Kode</th>
              <th className="p-3 min-w-[220px]">Nama & Spesifikasi Label</th>
              <th className="p-3 w-20 text-center">Kavling</th>
              <th className="p-3 w-24 text-right">Stok Awal (Lbr)</th>
              <th className="p-3 w-20 text-center bg-emerald-50/60 text-emerald-800">Masuk (+)</th>
              <th className="p-3 w-20 text-center bg-rose-50/60 text-rose-800">Keluar (-)</th>
              <th className="p-3 w-16 text-center text-amber-800">Afkir</th>
              <th className="p-3 w-24 text-right">Stok Akhir</th>
              <th className="p-3 w-28 text-center bg-amber-50/50 text-amber-950">No Label (Otomatis)</th>
              <th className="p-3 w-24 text-center">Status</th>
              <th className="p-3 w-20 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-neutral-400 italic">
                  Tidak ada data label yang sesuai dengan kriteria filter atau pencarian.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => {
                const numAwal = item.stockAwal || 0;
                const numPem = item.pembelian || 0;
                const numRet = item.returProduksi || 0;
                const numMskLain = item.masukLainLain || 0;
                const totalMasuk = item.masuk || (numPem + numRet + numMskLain);

                const numBon = item.bonProduksi || 0;
                const numGdg = item.gudangKeluar || 0;
                const numRsk = item.rusak || 0;
                const numKlrLain = item.keluarLainLain || 0;
                const totalKeluar = item.keluar || (numBon + numGdg + numRsk + numKlrLain);

                const stockAkhir = numAwal + totalMasuk - totalKeluar;
                const isLow = stockAkhir <= (item.minStock || 0);
                const isExpanded = expandedRowId === item.id;
                const lots = item.fifoLots || [];
                const labelRange = getLabelNoRange(item);

                return (
                  <React.Fragment key={item.id}>
                    <tr className={`hover:bg-neutral-50/80 transition-colors ${isLow ? "bg-rose-50/20" : ""}`}>
                      {/* No */}
                      <td className="p-3 text-center text-neutral-500 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Kode */}
                      <td className="p-3 font-mono font-bold text-neutral-900 text-xs">
                        {item.kode}
                      </td>

                      {/* Nama & Spesifikasi Label */}
                      <td className="p-3">
                        <div className="font-bold text-neutral-900 text-xs leading-tight">
                          {item.namaLabel}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {item.spesifikasi || item.warna || "-"}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          Supplier: {item.suplier || "PT. Vendor Label"}
                        </div>
                      </td>

                      {/* Kavling */}
                      <td className="p-3 text-center font-mono font-bold text-neutral-800 text-xs">
                        {item.gudangKav || "3002"}
                      </td>

                      {/* Stok Awal */}
                      <td 
                        onClick={() => handleStartCellEdit(item.id, "stockAwal", numAwal)}
                        className="p-3 text-right font-mono text-neutral-800 text-xs cursor-pointer hover:bg-amber-50"
                        title="Klik untuk mengubah Stok Awal"
                      >
                        {editingCell?.id === item.id && editingCell?.field === "stockAwal" ? (
                          <input
                            type="number"
                            autoFocus
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onBlur={() => handleSaveCellEdit(item.id, "stockAwal")}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveCellEdit(item.id, "stockAwal")}
                            className="w-16 text-right border border-black rounded px-1 py-0.5 text-xs font-mono font-bold bg-white"
                          />
                        ) : (
                          numAwal.toLocaleString("id-ID")
                        )}
                      </td>

                      {/* Masuk (+) */}
                      <td 
                        onClick={() => handleStartCellEdit(item.id, "masuk", totalMasuk)}
                        className="p-3 text-center font-mono font-bold text-emerald-700 text-xs bg-emerald-50/40 cursor-pointer hover:bg-emerald-100/60"
                        title="Klik untuk mengubah Total Masuk"
                      >
                        {editingCell?.id === item.id && editingCell?.field === "masuk" ? (
                          <input
                            type="number"
                            autoFocus
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onBlur={() => handleSaveCellEdit(item.id, "masuk")}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveCellEdit(item.id, "masuk")}
                            className="w-14 text-center border border-emerald-600 rounded px-1 py-0.5 text-xs font-mono font-bold bg-white"
                          />
                        ) : (
                          totalMasuk > 0 ? `+${totalMasuk.toLocaleString("id-ID")}` : "0"
                        )}
                      </td>

                      {/* Keluar (-) */}
                      <td 
                        onClick={() => handleStartCellEdit(item.id, "keluar", totalKeluar)}
                        className="p-3 text-center font-mono font-bold text-rose-700 text-xs bg-rose-50/40 cursor-pointer hover:bg-rose-100/60"
                        title="Klik untuk mengubah Total Keluar"
                      >
                        {editingCell?.id === item.id && editingCell?.field === "keluar" ? (
                          <input
                            type="number"
                            autoFocus
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onBlur={() => handleSaveCellEdit(item.id, "keluar")}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveCellEdit(item.id, "keluar")}
                            className="w-14 text-center border border-rose-600 rounded px-1 py-0.5 text-xs font-mono font-bold bg-white"
                          />
                        ) : (
                          totalKeluar > 0 ? `-${totalKeluar.toLocaleString("id-ID")}` : "0"
                        )}
                      </td>

                      {/* Afkir */}
                      <td 
                        onClick={() => handleStartCellEdit(item.id, "rusak", numRsk)}
                        className="p-3 text-center font-mono text-amber-700 text-xs cursor-pointer hover:bg-amber-50"
                        title="Klik untuk mengubah Afkir/Rusak"
                      >
                        {editingCell?.id === item.id && editingCell?.field === "rusak" ? (
                          <input
                            type="number"
                            autoFocus
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onBlur={() => handleSaveCellEdit(item.id, "rusak")}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveCellEdit(item.id, "rusak")}
                            className="w-12 text-center border border-amber-600 rounded px-1 py-0.5 text-xs font-mono font-bold bg-white"
                          />
                        ) : (
                          numRsk.toLocaleString("id-ID")
                        )}
                      </td>

                      {/* Stok Akhir */}
                      <td className="p-3 text-right font-mono font-bold text-xs text-neutral-900">
                        <span>{stockAkhir.toLocaleString("id-ID")}</span>
                        <span className="text-[10px] text-neutral-400 font-sans ml-1">Lbr</span>
                      </td>

                      {/* No Label (Otomatis) */}
                      <td 
                        className="p-2.5 text-center font-mono text-[11px] bg-amber-50/20"
                        title={labelRange.endNo > 0 ? `No Akhir = ${labelRange.baseEndNo.toLocaleString("id-ID")} + Masuk ${labelRange.totalMasuk.toLocaleString("id-ID")} = ${labelRange.formattedEnd}\nNo Awal = ${labelRange.formattedEnd} - Stok ${labelRange.stockAkhir.toLocaleString("id-ID")} = ${labelRange.formattedStart}` : "Belum diatur"}
                      >
                        {labelRange.endNo > 0 ? (
                          <div className="flex flex-col items-center leading-tight">
                            <span className="font-bold text-neutral-900">{labelRange.formattedStart}</span>
                            <span className="text-[10px] font-bold text-rose-600">s/d {labelRange.formattedEnd}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 border border-rose-400 text-rose-700 rounded-full text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>KRITIS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-400 text-emerald-700 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>AMAN</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenEditModal(item)}
                            className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-black transition-colors"
                            title="Edit Varian & FIFO"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                            className={`p-1 rounded transition-colors ${
                              isExpanded ? "bg-amber-100 text-amber-800" : "hover:bg-neutral-100 text-neutral-500 hover:text-amber-700"
                            }`}
                            title="Rincian FIFO Lot"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 hover:bg-rose-50 rounded text-neutral-400 hover:text-rose-600 transition-colors"
                            title="Hapus Varian"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED FIFO LOT DETAILS ROW */}
                    {isExpanded && (
                      <tr className="bg-amber-50/30 border-b border-amber-200">
                        <td colSpan={13} className="p-3 pl-12">
                          <div className="bg-white border border-amber-300 rounded p-3 text-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                              <span className="font-bold text-amber-900 uppercase text-[11px] flex items-center gap-1.5">
                                <Boxes className="w-3.5 h-3.5 text-amber-600" />
                                Rincian Lot FIFO Material: {item.namaLabel} ({item.kode})
                              </span>
                              <span className="text-neutral-500 font-mono text-[10px]">
                                Min Stock: {item.minStock?.toLocaleString("id-ID") || 0} Lbr
                              </span>
                            </div>

                            {lots.length === 0 ? (
                              <p className="text-neutral-400 italic text-[11px]">
                                Belum ada rincian sub-lot FIFO terdaftar untuk material ini.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                {lots.map((lot, lIdx) => {
                                  const age = calculateAgeInDays(lot.tglMasuk, selectedDate);
                                  return (
                                    <div 
                                      key={lot.id || lIdx}
                                      className="flex items-center justify-between p-2 bg-neutral-50 rounded border border-neutral-200 font-mono text-[11px]"
                                    >
                                      <div>
                                        <div className="font-bold text-neutral-800">{lot.kav}</div>
                                        <div className="text-[10px] text-neutral-500">{formatDDMMYY(lot.tglMasuk)}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-bold text-emerald-700">{lot.jmlLembar.toLocaleString("id-ID")} Lbr</div>
                                        <span className={`px-1 py-0.2 rounded font-bold text-[9px] ${
                                          age > 30 ? "bg-rose-100 text-rose-800" : age > 14 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                          Umur {age} hari
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* TABLE FOOTER SUMMARY */}
          <tfoot>
            <tr className="bg-neutral-100 border-t border-neutral-300 font-bold text-neutral-900 text-xs">
              <td colSpan={5} className="p-3 text-center uppercase font-black text-neutral-800">
                TOTAL KESELURUHAN ({filteredItems.length} ITEM)
              </td>
              <td className="p-3 text-right font-mono font-black">
                {filteredItems.reduce((acc, it) => acc + (it.stockAwal || 0), 0).toLocaleString("id-ID")}
              </td>
              <td className="p-3 text-center font-mono font-black text-emerald-800 bg-emerald-50/70">
                +{filteredItems.reduce((acc, it) => acc + (it.masuk || 0), 0).toLocaleString("id-ID")}
              </td>
              <td className="p-3 text-center font-mono font-black text-rose-800 bg-rose-50/70">
                -{filteredItems.reduce((acc, it) => acc + (it.keluar || 0), 0).toLocaleString("id-ID")}
              </td>
              <td className="p-3 text-center font-mono font-black text-amber-800">
                {filteredItems.reduce((acc, it) => acc + (it.rusak || 0), 0).toLocaleString("id-ID")}
              </td>
              <td className="p-3 text-right font-mono font-black text-neutral-900">
                {filteredItems.reduce((acc, it) => {
                  return acc + (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0);
                }, 0).toLocaleString("id-ID")} <span className="text-[10px] font-sans text-neutral-500">Lbr</span>
              </td>
              <td colSpan={3} className="p-3 text-center text-[10px] text-neutral-500 font-mono">
                No Label Urut Otomatis
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* OFFICIAL SIGNATURE BLOCK FOR LABEL */}
      {report && onUpdateReport && (
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
              {(report.ttdDibuat || report.dibuatOlehSignature) ? (
                <div 
                  onClick={() => setSignatureModal({
                    isOpen: true,
                    role: "dibuat",
                    title: "Tanda Tangan - Pembuat Laporan Label (Admin Gudang)",
                    defaultName: report.dibuatOlehName || report.namaDibuat || "Sabto A"
                  })}
                  className="w-full h-full flex items-center justify-center cursor-pointer p-1"
                >
                  <img 
                    src={report.ttdDibuat || report.dibuatOlehSignature} 
                    alt="Tanda Tangan Pembuat" 
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                </div>
              ) : (
                <div 
                  onClick={() => setSignatureModal({
                    isOpen: true,
                    role: "dibuat",
                    title: "Tanda Tangan - Pembuat Laporan Label (Admin Gudang)",
                    defaultName: report.dibuatOlehName || report.namaDibuat || "Sabto A"
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

              {(report.ttdDibuat || report.dibuatOlehSignature) && (
                <div className="absolute right-1 top-1 flex items-center gap-1 print:hidden">
                  <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 py-0.5 rounded border border-emerald-300">
                    Signed
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateReport({ ...report, ttdDibuat: "", dibuatOlehSignature: null });
                      showNotification?.("Tanda tangan pembuat dihapus", "info");
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
                value={report.dibuatOlehName || report.namaDibuat || "Sabto A"}
                onChange={(e) => onUpdateReport({ ...report, dibuatOlehName: e.target.value, namaDibuat: e.target.value })}
                className="text-xs font-bold font-serif italic text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-[#1A1A1A] focus:outline-none text-center w-full p-0 font-serif print:border-none"
                placeholder="Sabto A"
                title="Klik untuk mengedit nama"
              />
              <input
                type="text"
                value={report.dibuatOlehRole || "Admin Gudang"}
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
              {(report.ttdDiketahui || report.mengetahuiSignature) ? (
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
                    src={report.ttdDiketahui || report.mengetahuiSignature} 
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

              {(report.ttdDiketahui || report.mengetahuiSignature) && (
                <div className="absolute right-1 top-1 flex items-center gap-1 print:hidden">
                  <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 py-0.5 rounded border border-emerald-300">
                    Signed
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateReport({ ...report, ttdDiketahui: "", mengetahuiSignature: null });
                      showNotification?.("Tanda tangan mengetahui dihapus", "info");
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
      )}

      {/* SIGNATURE MODAL WITH FILE UPLOAD */}
      {signatureModal && onUpdateReport && report && (
        <SignatureModal
          isOpen={signatureModal.isOpen}
          onClose={() => setSignatureModal(null)}
          onSave={(dataUrl) => {
            if (signatureModal.role === "dibuat") {
              onUpdateReport({ ...report, ttdDibuat: dataUrl, dibuatOlehSignature: dataUrl });
              showNotification?.("Tanda tangan pembuat laporan berhasil dipasang!", "success");
            } else {
              onUpdateReport({ ...report, ttdDiketahui: dataUrl, mengetahuiSignature: dataUrl });
              showNotification?.("Tanda tangan pihak mengetahui berhasil dipasang!", "success");
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
