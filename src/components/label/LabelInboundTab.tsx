import React, { useState, useMemo } from "react";
import { 
  ArrowDownLeft, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  Tag, 
  Layers, 
  Filter, 
  FileSpreadsheet, 
  Sparkles,
  X,
  CheckCircle2,
  PackagePlus,
  Clock
} from "lucide-react";
import { LabelItem, LabelReport, LabelInboundLog, LabelFIFOLot, calculateAgeInDays, formatDDMMYY } from "../../types/label";
import { ConfirmModal } from "../ConfirmModal";

interface LabelInboundTabProps {
  report: LabelReport;
  selectedDate: string;
  onUpdateReport: (updatedReport: LabelReport) => void;
  showNotification: (message: string, type?: "success" | "error" | "info") => void;
  onOpenAddModal: () => void;
}

export function LabelInboundTab({
  report,
  selectedDate,
  onUpdateReport,
  showNotification,
  onOpenAddModal
}: LabelInboundTabProps) {
  const [viewMode, setViewMode] = useState<"logs" | "warehouse">("logs");
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [filterDateMode, setFilterDateMode] = useState<"today" | "all">("today");
  const [filterKolom, setFilterKolom] = useState<string>("all");
  const [logToDelete, setLogToDelete] = useState<LabelInboundLog | null>(null);

  // Inbound Form States
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [tglTransaksi, setTglTransaksi] = useState<string>(selectedDate || new Date().toISOString().split("T")[0]);
  const [kolomMasuk, setKolomMasuk] = useState<"pembelian" | "returProduksi" | "masukLainLain">("pembelian");
  const [jmlLembar, setJmlLembar] = useState<string>("");
  const [supplier, setSupplier] = useState<string>("");
  const [kavling, setKavling] = useState<string>("Rak A-01");
  const [catatan, setCatatan] = useState<string>("");
  const [operator, setOperator] = useState<string>("Sabto A");

  React.useEffect(() => {
    if (selectedDate) {
      setTglTransaksi(selectedDate);
    }
  }, [selectedDate]);

  const items = report.items || [];
  const logs = report.inboundLogs || [];

  // When selectedItemId changes, prefill details
  const selectedItem = useMemo(() => {
    return items.find((it) => it.id === selectedItemId);
  }, [items, selectedItemId]);

  const handleItemSelect = (id: string) => {
    setSelectedItemId(id);
    const it = items.find((item) => item.id === id);
    if (it) {
      setSupplier(it.suplier || "PT. Prima Grafika Packaging");
      setKavling(it.gudangKav || "Rak A-01");
    }
  };

  const handleSubmitInbound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      showNotification("Pilih varian label terlebih dahulu!", "error");
      return;
    }

    const item = items.find((it) => it.id === selectedItemId);
    if (!item) return;

    const numLembar = Number(jmlLembar) || 0;
    if (numLembar <= 0) {
      showNotification("Masukkan jumlah penerimaan label!", "error");
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    const transDate = tglTransaksi || selectedDate;

    // Create log entry
    const newLog: LabelInboundLog = {
      id: `lbl-in-${Date.now()}`,
      tanggal: transDate,
      waktu: timeStr,
      itemId: item.id,
      kode: item.kode,
      namaLabel: item.namaLabel,
      kategori: item.kategori,
      sloct: report.gudangSLoct || "3002",
      kolom: kolomMasuk,
      jmlLembar: numLembar,
      supplier: supplier || item.suplier || "-",
      kavling: kavling || item.gudangKav || "Rak A-01",
      catatan: catatan || "Penerimaan Stok Harian",
      operator: operator || "Sabto A"
    };

    // Update item mutasi & add FIFO Lot
    const updatedItems = items.map((it) => {
      if (it.id !== item.id) return it;

      const currentPem = it.pembelian || 0;
      const currentRet = it.returProduksi || 0;
      const currentLain = it.masukLainLain || 0;

      const newPem = kolomMasuk === "pembelian" ? currentPem + numLembar : currentPem;
      const newRet = kolomMasuk === "returProduksi" ? currentRet + numLembar : currentRet;
      const newLain = kolomMasuk === "masukLainLain" ? currentLain + numLembar : currentLain;
      const totalMasuk = newPem + newRet + newLain;

      // Add to FIFO lots
      const newLot: LabelFIFOLot = {
        id: `lot-${Date.now()}`,
        kav: kavling || it.gudangKav,
        tglMasuk: transDate,
        umurHari: 0,
        jmlLembar: numLembar,
        suplier: supplier || it.suplier || "-"
      };

      const existingLots = it.fifoLots ? [...it.fifoLots] : [];

      return {
        ...it,
        pembelian: newPem,
        returProduksi: newRet,
        masukLainLain: newLain,
        masuk: totalMasuk,
        gudangKav: kavling || it.gudangKav,
        suplier: supplier || it.suplier,
        tglMasuk: transDate,
        fifoLots: [...existingLots, newLot],
        keterangan: catatan ? `${it.keterangan || ""} | In: ${catatan}`.trim() : it.keterangan
      };
    });

    onUpdateReport({
      ...report,
      items: updatedItems,
      inboundLogs: [newLog, ...logs]
    });

    setJmlLembar("");
    setCatatan("");
    showNotification(`Penerimaan +${numLembar.toLocaleString("id-ID")} ${item.satuan} (${item.namaLabel}) berhasil dicatat & masuk ke antrian FIFO!`, "success");
  };

  const handleDeleteLog = (logId: string) => {
    const target = logs.find((l) => l.id === logId);
    if (!target) return;
    setLogToDelete(target);
  };

  const confirmDeleteLog = () => {
    if (!logToDelete) return;
    const target = logToDelete;

    // Revert stock on item
    const updatedItems = items.map((it) => {
      if (it.id !== target.itemId && it.kode !== target.kode) return it;

      const currentPem = it.pembelian || 0;
      const currentRet = it.returProduksi || 0;
      const currentLain = it.masukLainLain || 0;

      const newPem = target.kolom === "pembelian" ? Math.max(0, currentPem - target.jmlLembar) : currentPem;
      const newRet = target.kolom === "returProduksi" ? Math.max(0, currentRet - target.jmlLembar) : currentRet;
      const newLain = target.kolom === "masukLainLain" ? Math.max(0, currentLain - target.jmlLembar) : currentLain;
      const totalMasuk = newPem + newRet + newLain;

      return {
        ...it,
        pembelian: newPem,
        returProduksi: newRet,
        masukLainLain: newLain,
        masuk: totalMasuk
      };
    });

    const updatedLogs = logs.filter((l) => l.id !== target.id);

    onUpdateReport({
      ...report,
      items: updatedItems,
      inboundLogs: updatedLogs
    });

    showNotification("Log penerimaan berhasil dihapus dan stok terkait telah dikembalikan", "info");
    setLogToDelete(null);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchDate = filterDateMode === "all" || l.tanggal === selectedDate;
      const matchKolom = filterKolom === "all" || l.kolom === filterKolom;
      const matchSearch =
        searchLogQuery.trim() === "" ||
        l.namaLabel.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
        l.kode.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
        (l.supplier || "").toLowerCase().includes(searchLogQuery.toLowerCase()) ||
        (l.catatan || "").toLowerCase().includes(searchLogQuery.toLowerCase());

      return matchDate && matchKolom && matchSearch;
    });
  }, [logs, selectedDate, filterDateMode, filterKolom, searchLogQuery]);

  return (
    <div className="space-y-6">
      {/* FORM PENERIMAAN CEPAT */}
      <div className="bg-white border-2 border-[#1A1A1A] rounded p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#1A1A1A] pb-3 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase text-neutral-800">Form Transaksi Penerimaan Label (Inbound)</h3>
              <p className="text-[11px] text-neutral-500">Pencatatan pembelian PO dari supplier & retur pemakaian line jahit kemasan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Buat Kode Label Baru
          </button>
        </div>

        <form onSubmit={handleSubmitInbound} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dropdown Material */}
            <div className="md:col-span-2">
              <label className="block font-bold text-neutral-700 mb-1">
                Pilih Varian Label Kemasan *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full border border-neutral-300 rounded px-3 py-2 font-bold focus:border-black focus:outline-none bg-white text-xs"
                required
              >
                <option value="">-- Pilih Varian Label yang Masuk --</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.kode} - {it.namaLabel} ({it.warna}) - Sisa: {(it.stockAwal + it.masuk - it.keluar).toLocaleString("id-ID")} {it.satuan}
                  </option>
                ))}
              </select>
            </div>

            {/* Kolom Kategori Penerimaan */}
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Jenis Penerimaan *
              </label>
              <select
                value={kolomMasuk}
                onChange={(e) => setKolomMasuk(e.target.value as any)}
                className="w-full border border-emerald-400 bg-emerald-50/50 rounded px-3 py-2 font-bold focus:border-black focus:outline-none text-xs text-emerald-950"
              >
                <option value="pembelian">1. Pembelian PO Supplier (Baru)</option>
                <option value="returProduksi">2. Retur Produksi</option>
                <option value="masukLainLain">3. Masuk Lain-lain / Koreksi</option>
              </select>
            </div>
          </div>

          {/* Tanggal Transaksi, Quantities, & Kavling */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 p-3 rounded border border-neutral-200">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Tanggal Transaksi *
              </label>
              <input
                type="date"
                value={tglTransaksi}
                onChange={(e) => setTglTransaksi(e.target.value)}
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 font-bold bg-white focus:border-black focus:outline-none text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Jumlah Satuan ({selectedItem ? selectedItem.satuan : "Lembar/Pcs"}) *
              </label>
              <input
                type="number"
                value={jmlLembar}
                onChange={(e) => setJmlLembar(e.target.value)}
                placeholder="Contoh: 10000"
                className="w-full border border-emerald-500 rounded px-2.5 py-1.5 font-mono font-bold text-sm bg-white focus:border-black focus:outline-none text-emerald-900"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Kavling / Rak Gudang
              </label>
              <input
                type="text"
                value={kavling}
                onChange={(e) => setKavling(e.target.value)}
                placeholder="Rak A-01"
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 font-bold bg-white focus:border-black focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Suplier / Percetakan</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="PT. Prima Grafika"
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">Operator / Admin Gudang</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">Catatan / No. Surat Jalan</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="No SJ: 88129 / PO Reguler..."
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Simpan Penerimaan & Tambah Antrian FIFO</span>
            </button>
          </div>
        </form>
      </div>

      {/* SUB-SWITCH VIEW: LOG PENERIMAAN VS SELURUH STOK */}
      <div className="flex justify-between items-center border-b-2 border-[#1A1A1A] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("logs")}
            className={`px-3 py-1.5 text-xs font-bold rounded-t flex items-center gap-1.5 transition-colors ${
              viewMode === "logs"
                ? "bg-[#1A1A1A] text-white"
                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Log Penerimaan Label ({logs.length})</span>
          </button>
          <button
            onClick={() => setViewMode("warehouse")}
            className={`px-3 py-1.5 text-xs font-bold rounded-t flex items-center gap-1.5 transition-colors ${
              viewMode === "warehouse"
                ? "bg-[#1A1A1A] text-white"
                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Seluruh Stok Label Gudang ({items.length})</span>
          </button>
        </div>

        {viewMode === "logs" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterDateMode("today")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded border ${
                filterDateMode === "today" ? "bg-black text-white border-black" : "bg-white text-neutral-600 border-neutral-300"
              }`}
            >
              Hari Ini ({selectedDate})
            </button>
            <button
              onClick={() => setFilterDateMode("all")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded border ${
                filterDateMode === "all" ? "bg-black text-white border-black" : "bg-white text-neutral-600 border-neutral-300"
              }`}
            >
              Semua Tanggal
            </button>
          </div>
        )}
      </div>

      {viewMode === "logs" ? (
        /* LOG TABLE */
        <div className="bg-white border-2 border-[#1A1A1A] rounded shadow-sm overflow-hidden">
          <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap justify-between items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchLogQuery}
                onChange={(e) => setSearchLogQuery(e.target.value)}
                placeholder="Cari log penerimaan label..."
                className="w-full pl-8 pr-7 py-1 text-xs border border-neutral-300 rounded focus:border-black bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={filterKolom}
                onChange={(e) => setFilterKolom(e.target.value)}
                className="text-xs border border-neutral-300 rounded px-2 py-1 bg-white font-bold"
              >
                <option value="all">Semua Jenis Masuk</option>
                <option value="pembelian">Pembelian PO</option>
                <option value="returProduksi">Retur Produksi</option>
                <option value="masukLainLain">Masuk Lain</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-[#1A1A1A] text-white font-bold text-center">
                  <th className="p-2 border-r border-neutral-700 w-10">No</th>
                  <th className="p-2 border-r border-neutral-700 w-24">Waktu</th>
                  <th className="p-2 border-r border-neutral-700 w-28">Kode</th>
                  <th className="p-2 border-r border-neutral-700 min-w-[180px] text-left">Nama Label</th>
                  <th className="p-2 border-r border-neutral-700 w-28">Jenis Masuk</th>
                  <th className="p-2 border-r border-neutral-700 w-24 text-right">Jumlah Lembar</th>
                  <th className="p-2 border-r border-neutral-700 w-24">Rak/Kav</th>
                  <th className="p-2 border-r border-neutral-700 min-w-[140px] text-left">Suplier</th>
                  <th className="p-2 border-r border-neutral-700 min-w-[140px] text-left">Catatan</th>
                  <th className="p-2 w-12 text-center">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-neutral-400 italic">
                      Belum ada riwayat penerimaan label yang tercatat pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => {
                    return (
                      <tr key={log.id} className="hover:bg-neutral-50">
                        <td className="p-2 text-center font-mono font-bold text-neutral-500 border-r border-neutral-200">
                          {index + 1}
                        </td>
                        <td className="p-2 text-center font-mono text-[11px] border-r border-neutral-200">
                          <div className="font-bold text-neutral-800">{log.tanggal}</div>
                          <div className="text-[9px] text-neutral-400">{log.waktu}</div>
                        </td>
                        <td className="p-2 font-mono font-bold text-neutral-800 border-r border-neutral-200 text-[11px]">
                          {log.kode}
                        </td>
                        <td className="p-2 font-bold text-neutral-900 border-r border-neutral-200">
                          {log.namaLabel}
                        </td>
                        <td className="p-2 text-center border-r border-neutral-200">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.kolom === "pembelian"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.kolom === "returProduksi"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-neutral-100 text-neutral-800"
                          }`}>
                            {log.kolom === "pembelian" ? "Pembelian PO" : log.kolom === "returProduksi" ? "Retur Produksi" : "Masuk Lain"}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700 border-r border-neutral-200 text-xs">
                          +{log.jmlLembar.toLocaleString("id-ID")}
                        </td>
                        <td className="p-2 text-center font-bold text-neutral-700 border-r border-neutral-200 text-[11px]">
                          {log.kavling || "-"}
                        </td>
                        <td className="p-2 text-neutral-700 border-r border-neutral-200 truncate max-w-[150px]">
                          {log.supplier || "-"}
                        </td>
                        <td className="p-2 text-neutral-600 border-r border-neutral-200 text-[11px]">
                          {log.catatan || "-"}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1 hover:bg-rose-50 rounded text-neutral-400 hover:text-rose-600 transition-colors"
                            title="Hapus riwayat & batalkan stok"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* WAREHOUSE ALL STOCK REFERENCE */
        <div className="bg-white border-2 border-[#1A1A1A] rounded p-4 shadow-sm">
          <h4 className="font-bold text-xs uppercase text-neutral-800 mb-3">Ringkasan Posisi Stok Label Gudang</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((it) => {
              const akhir = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0);
              return (
                <div key={it.id} className="border border-neutral-300 rounded p-3 bg-neutral-50 hover:bg-white transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-[11px] text-neutral-500">{it.kode}</span>
                    <span className="font-bold text-xs bg-neutral-200 px-1.5 py-0.2 rounded font-mono text-neutral-700">
                      {it.gudangKav}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-neutral-900 mt-1">{it.namaLabel}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{it.warna} | {it.suplier}</div>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-neutral-200">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Stok Akhir:</span>
                    <span className="font-mono font-bold text-sm text-emerald-800">
                      {akhir.toLocaleString("id-ID")} {it.satuan}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE LOG MODAL */}
      <ConfirmModal
        isOpen={!!logToDelete}
        title="Konfirmasi Hapus Log Penerimaan"
        message={
          logToDelete ? (
            <div className="space-y-2">
              <p>Apakah Anda yakin ingin menghapus catatan log penerimaan berikut?</p>
              <div className="p-2.5 bg-neutral-100 rounded border border-neutral-300 font-mono text-xs">
                <div className="font-bold text-neutral-900">{logToDelete.namaLabel} ({logToDelete.kode})</div>
                <div className="text-emerald-700 font-bold">Jumlah: +{logToDelete.jmlLembar.toLocaleString("id-ID")} pcs ({logToDelete.kolom})</div>
                <div className="text-neutral-500 text-[11px]">Tanggal: {logToDelete.tanggal} | Suplier: {logToDelete.supplier || "-"}</div>
              </div>
              <p className="text-amber-700 font-semibold text-[11px]">
                Stok label yang telah ditambahkan pada transaksi ini akan dikurangi kembali secara otomatis.
              </p>
            </div>
          ) : null
        }
        confirmText="Ya, Hapus Log"
        cancelText="Batal"
        variant="danger"
        onConfirm={confirmDeleteLog}
        onClose={() => setLogToDelete(null)}
      />
    </div>
  );
}
