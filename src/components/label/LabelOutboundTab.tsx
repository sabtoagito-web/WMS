import React, { useState, useMemo } from "react";
import { 
  ArrowUpRight, 
  Trash2, 
  Search, 
  Calendar, 
  Tag, 
  Layers, 
  Filter, 
  Sparkles,
  X,
  Clock,
  PackageMinus,
  AlertTriangle
} from "lucide-react";
import { LabelItem, LabelReport, LabelOutboundLog, LabelFIFOLot, calculateAgeInDays, formatDDMMYY } from "../../types/label";
import { ConfirmModal } from "../ConfirmModal";

interface LabelOutboundTabProps {
  report: LabelReport;
  selectedDate: string;
  onUpdateReport: (updatedReport: LabelReport) => void;
  showNotification: (message: string, type?: "success" | "error" | "info") => void;
}

export function LabelOutboundTab({
  report,
  selectedDate,
  onUpdateReport,
  showNotification
}: LabelOutboundTabProps) {
  const [viewMode, setViewMode] = useState<"logs" | "warehouse">("logs");
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [filterDateMode, setFilterDateMode] = useState<"today" | "all">("today");
  const [filterKolom, setFilterKolom] = useState<string>("all");
  const [logToDelete, setLogToDelete] = useState<LabelOutboundLog | null>(null);

  // Outbound Form States
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [tglTransaksi, setTglTransaksi] = useState<string>(selectedDate || new Date().toISOString().split("T")[0]);
  const [kolomKeluar, setKolomKeluar] = useState<"bonProduksi" | "gudangKeluar" | "rusak" | "keluarLainLain">("bonProduksi");
  const [jmlLembar, setJmlLembar] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");
  const [operator, setOperator] = useState<string>("Operator");

  React.useEffect(() => {
    if (selectedDate) {
      setTglTransaksi(selectedDate);
    }
  }, [selectedDate]);

  const items = report.items || [];
  const logs = report.outboundLogs || [];

  const selectedItem = useMemo(() => {
    return items.find((it) => it.id === selectedItemId);
  }, [items, selectedItemId]);

  const handleSubmitOutbound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      showNotification("Pilih varian label yang dikeluarkan!", "error");
      return;
    }

    const item = items.find((it) => it.id === selectedItemId);
    if (!item) return;

    const numLembar = Number(jmlLembar) || 0;
    if (numLembar <= 0) {
      showNotification("Masukkan jumlah pengeluaran label!", "error");
      return;
    }

    const currentStokAkhir = (item.stockAwal || 0) + (item.masuk || 0) - (item.keluar || 0);
    if (numLembar > currentStokAkhir) {
      if (!confirm(`Peringatan: Jumlah keluar (${numLembar.toLocaleString("id-ID")}) melebihi stok akhir tersedia (${currentStokAkhir.toLocaleString("id-ID")}). Tetap lanjutkan?`)) {
        return;
      }
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    const transDate = tglTransaksi || selectedDate;

    // Create log entry
    const newLog: LabelOutboundLog = {
      id: `lbl-out-${Date.now()}`,
      tanggal: transDate,
      waktu: timeStr,
      itemId: item.id,
      kode: item.kode,
      namaLabel: item.namaLabel,
      kategori: item.kategori,
      sloct: report.gudangSLoct || "3002",
      kolom: kolomKeluar,
      jmlLembar: numLembar,
      catatan: catatan || "Pengeluaran Pemakaian",
      operator: operator || "Operator"
    };

    // Update item mutasi & Deduct from oldest FIFO Lots (FIFO Algorithm)
    const updatedItems = items.map((it) => {
      if (it.id !== item.id) return it;

      const currentBon = it.bonProduksi || 0;
      const currentGdg = it.gudangKeluar || 0;
      const currentRsk = it.rusak || 0;
      const currentLain = it.keluarLainLain || 0;

      const newBon = kolomKeluar === "bonProduksi" ? currentBon + numLembar : currentBon;
      const newGdg = kolomKeluar === "gudangKeluar" ? currentGdg + numLembar : currentGdg;
      const newRsk = kolomKeluar === "rusak" ? currentRsk + numLembar : currentRsk;
      const newLain = kolomKeluar === "keluarLainLain" ? currentLain + numLembar : currentLain;
      const totalKeluar = newBon + newGdg + newRsk + newLain;

      // Consume FIFO lots
      let remainingToDeduct = numLembar;
      let existingLots = it.fifoLots ? [...it.fifoLots] : [];

      // Sort lots by tglMasuk ascending (oldest first)
      existingLots.sort((a, b) => (a.tglMasuk > b.tglMasuk ? 1 : -1));

      const updatedLots: LabelFIFOLot[] = [];
      for (const lot of existingLots) {
        if (remainingToDeduct <= 0) {
          updatedLots.push(lot);
          continue;
        }

        if (lot.jmlLembar <= remainingToDeduct) {
          remainingToDeduct -= lot.jmlLembar;
          // Lot fully consumed, do not push
        } else {
          updatedLots.push({
            ...lot,
            jmlLembar: lot.jmlLembar - remainingToDeduct
          });
          remainingToDeduct = 0;
        }
      }

      return {
        ...it,
        bonProduksi: newBon,
        gudangKeluar: newGdg,
        rusak: newRsk,
        keluarLainLain: newLain,
        keluar: totalKeluar,
        fifoLots: updatedLots,
        tglPemakaianTerakhir: transDate,
        keterangan: catatan ? `${it.keterangan || ""} | Out: ${catatan}`.trim() : it.keterangan
      };
    });

    onUpdateReport({
      ...report,
      items: updatedItems,
      outboundLogs: [newLog, ...logs]
    });

    setJmlLembar("");
    setCatatan("");
    showNotification(`Pengeluaran -${numLembar.toLocaleString("id-ID")} ${item.satuan} (${item.namaLabel}) berhasil dicatat & dipotong dari lot FIFO tertua!`, "success");
  };

  const handleDeleteLog = (logId: string) => {
    const target = logs.find((l) => l.id === logId);
    if (!target) return;
    setLogToDelete(target);
  };

  const confirmDeleteLog = () => {
    if (!logToDelete) return;
    const target = logToDelete;

    const updatedItems = items.map((it) => {
      if (it.id !== target.itemId && it.kode !== target.kode) return it;

      const currentBon = it.bonProduksi || 0;
      const currentGdg = it.gudangKeluar || 0;
      const currentRsk = it.rusak || 0;
      const currentLain = it.keluarLainLain || 0;

      const newBon = target.kolom === "bonProduksi" ? Math.max(0, currentBon - target.jmlLembar) : currentBon;
      const newGdg = target.kolom === "gudangKeluar" ? Math.max(0, currentGdg - target.jmlLembar) : currentGdg;
      const newRsk = target.kolom === "rusak" ? Math.max(0, currentRsk - target.jmlLembar) : currentRsk;
      const newLain = target.kolom === "keluarLainLain" ? Math.max(0, currentLain - target.jmlLembar) : currentLain;
      const totalKeluar = newBon + newGdg + newRsk + newLain;

      return {
        ...it,
        bonProduksi: newBon,
        gudangKeluar: newGdg,
        rusak: newRsk,
        keluarLainLain: newLain,
        keluar: totalKeluar
      };
    });

    const updatedLogs = logs.filter((l) => l.id !== target.id);

    onUpdateReport({
      ...report,
      items: updatedItems,
      outboundLogs: updatedLogs
    });

    showNotification("Log pengeluaran berhasil dihapus dan stok dikembalikan", "info");
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
        (l.catatan || "").toLowerCase().includes(searchLogQuery.toLowerCase()) ||
        (l.operator || "").toLowerCase().includes(searchLogQuery.toLowerCase());

      return matchDate && matchKolom && matchSearch;
    });
  }, [logs, selectedDate, filterDateMode, filterKolom, searchLogQuery]);

  return (
    <div className="space-y-6">
      {/* FORM PENGELUARAN CEPAT */}
      <div className="bg-white border-2 border-[#1A1A1A] rounded p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#1A1A1A] pb-3 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-600 text-white rounded">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase text-neutral-800">Form Transaksi Pengeluaran Label (Outbound)</h3>
              <p className="text-[11px] text-neutral-500">Pencatatan pengeluaran label untuk Bon Produksi, Gudang, Over Sak, dan Lain-lain</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitOutbound} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dropdown Material */}
            <div className="md:col-span-2">
              <label className="block font-bold text-neutral-700 mb-1">
                Pilih Varian Label Kemasan *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full border border-neutral-300 rounded px-3 py-2 font-bold focus:border-black focus:outline-none bg-white text-xs"
                required
              >
                <option value="">-- Pilih Varian Label yang Dikeluarkan --</option>
                {items.map((it) => {
                  const sisa = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0);
                  return (
                    <option key={it.id} value={it.id}>
                      {it.kode} - {it.namaLabel} ({it.warna}) - Sisa Stok: {sisa.toLocaleString("id-ID")} {it.satuan}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Kolom Kategori Pengeluaran */}
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Jenis Pengeluaran *
              </label>
              <select
                value={kolomKeluar}
                onChange={(e) => setKolomKeluar(e.target.value as any)}
                className="w-full border border-rose-400 bg-rose-50/50 rounded px-3 py-2 font-bold focus:border-black focus:outline-none text-xs text-rose-950"
              >
                <option value="bonProduksi">1. Bon Produksi</option>
                <option value="gudangKeluar">2. Gudang</option>
                <option value="rusak">3. Over Sak</option>
                <option value="keluarLainLain">4. Lain lain</option>
              </select>
            </div>
          </div>

          {/* Tanggal Transaksi, Jumlah, & Penerima */}
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
                placeholder="Contoh: 5000"
                className="w-full border border-rose-500 rounded px-2.5 py-1.5 font-mono font-bold text-sm bg-white focus:border-black focus:outline-none text-rose-900"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Penerima / Operator
              </label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="Operator Line"
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 font-bold bg-white focus:border-black focus:outline-none text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">Catatan Pengeluaran</label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Keterangan pengeluaran / referensi line..."
              className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none text-xs"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PackageMinus className="w-4 h-4" />
              <span>Simpan Pengeluaran & Potong Lot FIFO Tertua</span>
            </button>
          </div>
        </form>
      </div>

      {/* SUB-SWITCH VIEW: LOG PENGELUARAN VS SELURUH STOK */}
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
            <span>Log Pengeluaran Label ({logs.length})</span>
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
                placeholder="Cari log pengeluaran label..."
                className="w-full pl-8 pr-7 py-1 text-xs border border-neutral-300 rounded focus:border-black bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={filterKolom}
                onChange={(e) => setFilterKolom(e.target.value)}
                className="text-xs border border-neutral-300 rounded px-2 py-1 bg-white font-bold"
              >
                <option value="all">Semua Jenis Pengeluaran</option>
                <option value="bonProduksi">1. Bon Produksi</option>
                <option value="gudangKeluar">2. Gudang</option>
                <option value="rusak">3. Over Sak</option>
                <option value="keluarLainLain">4. Lain lain</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-[#1A1A1A] text-white font-bold text-center">
                  <th className="p-2 border-r border-neutral-700 w-10">No</th>
                  <th className="p-2 border-r border-neutral-700 w-24">Tgl & Waktu</th>
                  <th className="p-2 border-r border-neutral-700 w-28">Kode</th>
                  <th className="p-2 border-r border-neutral-700 min-w-[180px] text-left">Nama Label</th>
                  <th className="p-2 border-r border-neutral-700 w-28">Jenis Keluar</th>
                  <th className="p-2 border-r border-neutral-700 w-24 text-right">Jumlah Lembar</th>
                  <th className="p-2 border-r border-neutral-700 min-w-[120px] text-left">Operator</th>
                  <th className="p-2 border-r border-neutral-700 min-w-[140px] text-left">Catatan</th>
                  <th className="p-2 w-12 text-center">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-neutral-400 italic">
                      Belum ada riwayat pengeluaran label yang tercatat pada filter ini.
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
                            log.kolom === "bonProduksi"
                              ? "bg-rose-100 text-rose-800"
                              : log.kolom === "gudangKeluar"
                              ? "bg-blue-100 text-blue-800"
                              : log.kolom === "rusak"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-purple-100 text-purple-800"
                          }`}>
                            {log.kolom === "bonProduksi" ? "Bon Produksi" : log.kolom === "gudangKeluar" ? "Gudang" : log.kolom === "rusak" ? "Over Sak" : "Lain lain"}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-rose-700 border-r border-neutral-200 text-xs">
                          -{log.jmlLembar.toLocaleString("id-ID")}
                        </td>
                        <td className="p-2 text-neutral-700 border-r border-neutral-200">
                          {log.operator || "-"}
                        </td>
                        <td className="p-2 text-neutral-600 border-r border-neutral-200 text-[11px]">
                          {log.catatan || "-"}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1 hover:bg-rose-50 rounded text-neutral-400 hover:text-rose-600 transition-colors"
                            title="Hapus riwayat & kembalikan stok"
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
        title="Konfirmasi Hapus Log Pengeluaran"
        message={
          logToDelete ? (
            <div className="space-y-2">
              <p>Apakah Anda yakin ingin menghapus catatan log pengeluaran berikut?</p>
              <div className="p-2.5 bg-neutral-100 rounded border border-neutral-300 font-mono text-xs">
                <div className="font-bold text-neutral-900">{logToDelete.namaLabel} ({logToDelete.kode})</div>
                <div className="text-rose-700 font-bold">Jumlah: -{logToDelete.jmlLembar.toLocaleString("id-ID")} pcs ({logToDelete.kolom === "bonProduksi" ? "Bon Produksi" : logToDelete.kolom === "gudangKeluar" ? "Gudang" : logToDelete.kolom === "rusak" ? "Over Sak" : "Lain lain"})</div>
                <div className="text-neutral-500 text-[11px]">Tanggal: {logToDelete.tanggal} | Operator: {logToDelete.operator || "-"}</div>
              </div>
              <p className="text-emerald-700 font-semibold text-[11px]">
                Stok label yang telah dikeluarkan pada transaksi ini akan dikembalikan ke saldo item terkait.
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
