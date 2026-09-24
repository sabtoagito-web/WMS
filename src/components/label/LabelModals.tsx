import React, { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, Tag, Calendar, Layers, Palette, QrCode, Check } from "lucide-react";
import { LabelItem, LabelCategory, LabelFIFOLot, calculateAgeInDays, formatDDMMYY } from "../../types/label";

interface AddLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: LabelItem) => void;
  selectedDate: string;
}

export function AddLabelModal({ isOpen, onClose, onAdd, selectedDate }: AddLabelModalProps) {
  const [kode, setKode] = useState("");
  const [namaLabel, setNamaLabel] = useState("");
  const [satuan, setSatuan] = useState<"Lembar" | "Pcs" | "Roll" | "Cone">("Lembar");
  const [stockAwal, setStockAwal] = useState("0");
  const [pembelian, setPembelian] = useState("0");
  const [returProduksi, setReturProduksi] = useState("0");
  const [masukLainLain, setMasukLainLain] = useState("0");
  const [bonProduksi, setBonProduksi] = useState("0");
  const [gudangKeluar, setGudangKeluar] = useState("0");
  const [rusak, setRusak] = useState("0");
  const [keluarLainLain, setKeluarLainLain] = useState("0");
  const [gudangKav, setGudangKav] = useState("Rak A-01");
  const [suplier, setSuplier] = useState("PT. Prima Grafika Packaging");
  const [tglMasuk, setTglMasuk] = useState(selectedDate);
  const [minStock, setMinStock] = useState("5000");
  const [baseEndNoLabel, setBaseEndNoLabel] = useState("");
  const [keterangan, setKeterangan] = useState("");

  if (!isOpen) return null;

  const numAwal = Number(stockAwal) || 0;
  const numPem = Number(pembelian) || 0;
  const numRet = Number(returProduksi) || 0;
  const numMasukLain = Number(masukLainLain) || 0;
  const totalMasuk = numPem + numRet + numMasukLain;

  const numBon = Number(bonProduksi) || 0;
  const numGdg = Number(gudangKeluar) || 0;
  const numRsk = Number(rusak) || 0;
  const numKeluarLain = Number(keluarLainLain) || 0;
  const totalKeluar = numBon + numGdg + numRsk + numKeluarLain;

  const stockAkhir = Math.max(0, numAwal + totalMasuk - totalKeluar);

  const numBaseEnd = baseEndNoLabel.trim() ? Number(baseEndNoLabel.replace(/\D/g, "")) : 0;
  const autoEndNo = numBaseEnd > 0 ? numBaseEnd + totalMasuk : 0;
  const autoStartNo = (autoEndNo > 0 && stockAkhir > 0) ? Math.max(0, autoEndNo - stockAkhir) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kode.trim() || !namaLabel.trim()) {
      alert("Kode dan Nama Label wajib diisi!");
      return;
    }

    const initialLots: LabelFIFOLot[] = stockAkhir > 0 ? [
      {
        id: `lot-${Date.now()}`,
        kav: gudangKav || "Rak A-01",
        tglMasuk: tglMasuk || selectedDate,
        umurHari: calculateAgeInDays(tglMasuk || selectedDate, selectedDate),
        jmlLembar: stockAkhir,
        suplier: suplier || "-"
      }
    ] : [];

    const newItem: LabelItem = {
      id: `lbl-${Date.now()}`,
      kode: kode.trim().toUpperCase(),
      namaLabel: namaLabel.trim(),
      kategori: "Label Broiler",
      warna: "-",
      spesifikasi: "-",
      satuan,
      stockAwal: numAwal,
      pembelian: numPem,
      returProduksi: numRet,
      masukLainLain: numMasukLain,
      masuk: totalMasuk,
      bonProduksi: numBon,
      gudangKeluar: numGdg,
      rusak: numRsk,
      keluarLainLain: numKeluarLain,
      keluar: totalKeluar,
      fifoLots: initialLots,
      gudangKav,
      suplier,
      tglMasuk: tglMasuk || selectedDate,
      minStock: Number(minStock) || 3000,
      baseEndNoLabel: numBaseEnd > 0 ? numBaseEnd : undefined,
      endNoLabel: autoEndNo > 0 ? autoEndNo : undefined,
      startNoLabel: autoStartNo > 0 ? autoStartNo : undefined,
      keterangan,
      checked: true
    };

    onAdd(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden overflow-y-auto">
      <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-2xl shadow-2xl rounded p-6 my-8">
        <div className="flex justify-between items-center border-b-2 border-[#1A1A1A] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base uppercase text-neutral-800">Tambah Varian Label Baru</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Kode Label *</label>
              <input
                type="text"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="Contoh: 700901010010"
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 font-mono focus:border-black focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Nama Label Pakan *</label>
              <input
                type="text"
                value={namaLabel}
                onChange={(e) => setNamaLabel(e.target.value)}
                placeholder="Contoh: LABEL BR-1 SUPER CRUMBLE 50KG"
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 font-bold focus:border-black focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="bg-neutral-50 p-3 rounded border border-neutral-200">
            <h4 className="font-bold text-neutral-800 uppercase text-[11px] mb-2">Transaksi Tambahan Hari Ini (Opsional)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-emerald-700 mb-0.5">Pembelian</label>
                <input
                  type="number"
                  value={pembelian}
                  onChange={(e) => setPembelian(e.target.value)}
                  className="w-full border border-emerald-300 bg-emerald-50/50 rounded px-2 py-1 font-mono focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-rose-700 mb-0.5">Bon Produksi</label>
                <input
                  type="number"
                  value={bonProduksi}
                  onChange={(e) => setBonProduksi(e.target.value)}
                  className="w-full border border-rose-300 bg-rose-50/50 rounded px-2 py-1 font-mono focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Min Stock Alert</label>
                <input
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full border border-neutral-300 rounded px-2 py-1 font-mono focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Gudang / Rak Kavling</label>
              <input
                type="text"
                value={gudangKav}
                onChange={(e) => setGudangKav(e.target.value)}
                placeholder="Rak A-01"
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Suplier</label>
              <input
                type="text"
                value={suplier}
                onChange={(e) => setSuplier(e.target.value)}
                placeholder="PT. Prima Grafika"
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-300 rounded">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                Nomor Label (Otomatis: No Akhir + Masuk, No Awal = No Akhir - Stok)
              </label>
              {autoEndNo > 0 && (
                <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                  Urutan: {autoStartNo.toLocaleString("id-ID")} s/d {autoEndNo.toLocaleString("id-ID")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-neutral-700 block mb-1">No Label Akhir (Contoh: 500000)</span>
                <input
                  type="text"
                  value={baseEndNoLabel}
                  onChange={(e) => setBaseEndNoLabel(e.target.value)}
                  placeholder="500000"
                  className="w-full border border-amber-400 rounded px-2.5 py-1.5 focus:border-amber-700 focus:outline-none font-mono font-bold bg-white text-xs"
                />
                <span className="text-[10px] text-amber-900 block mt-0.5">
                  *Setiap jumlah masuk (+{totalMasuk.toLocaleString("id-ID")}) otomatis menambahkan No Akhir
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-neutral-700 block mb-1">No Label Awal (Terhitung Otomatis)</span>
                <div className="w-full border border-neutral-300 bg-neutral-100 rounded px-2.5 py-1.5 font-mono font-bold text-neutral-800 text-xs flex items-center justify-between">
                  <span>{autoEndNo > 0 ? autoStartNo.toLocaleString("id-ID") : "-"}</span>
                  {autoEndNo > 0 && (
                    <span className="text-[10px] text-neutral-500 font-sans font-normal">
                      ({autoEndNo.toLocaleString("id-ID")} - {stockAkhir.toLocaleString("id-ID")})
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  Rumus: No Akhir dikurang Stok Akhir ({stockAkhir.toLocaleString("id-ID")} lembar)
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">Keterangan Tambahan</label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan label standar line jahit bagging..."
              className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-100 font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Simpan Varian Label
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditLabelModalProps {
  isOpen: boolean;
  item: LabelItem | null;
  onClose: () => void;
  onSave: (updatedItem: LabelItem) => void;
  selectedDate: string;
}

export function EditLabelModal({ isOpen, item, onClose, onSave, selectedDate }: EditLabelModalProps) {
  const [formData, setFormData] = useState<LabelItem | null>(null);

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        fifoLots: item.fifoLots ? [...item.fifoLots] : []
      });
    }
  }, [item]);

  if (!isOpen || !formData) return null;

  const handleFieldChange = (field: keyof LabelItem, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };

      // Recalculate totals
      if (
        field === "stockAwal" ||
        field === "pembelian" ||
        field === "returProduksi" ||
        field === "masukLainLain" ||
        field === "bonProduksi" ||
        field === "gudangKeluar" ||
        field === "rusak" ||
        field === "keluarLainLain"
      ) {
        const totalMasuk = (Number(updated.pembelian) || 0) + (Number(updated.returProduksi) || 0) + (Number(updated.masukLainLain) || 0);
        const totalKeluar = (Number(updated.bonProduksi) || 0) + (Number(updated.gudangKeluar) || 0) + (Number(updated.rusak) || 0) + (Number(updated.keluarLainLain) || 0);

        updated.masuk = totalMasuk;
        updated.keluar = totalKeluar;
      }
      return updated;
    });
  };

  const handleAddLot = () => {
    const newLot: LabelFIFOLot = {
      id: `lot-${Date.now()}`,
      kav: formData.gudangKav || "Rak A-01",
      tglMasuk: selectedDate,
      umurHari: 0,
      jmlLembar: 1000,
      suplier: formData.suplier || "-"
    };
    setFormData((prev) => prev ? { ...prev, fifoLots: [...(prev.fifoLots || []), newLot] } : prev);
  };

  const handleUpdateLot = (index: number, field: keyof LabelFIFOLot, val: any) => {
    setFormData((prev) => {
      if (!prev || !prev.fifoLots) return prev;
      const lots = [...prev.fifoLots];
      lots[index] = { ...lots[index], [field]: val };
      if (field === "tglMasuk") {
        lots[index].umurHari = calculateAgeInDays(val, selectedDate);
      }
      return { ...prev, fifoLots: lots };
    });
  };

  const handleDeleteLot = (index: number) => {
    setFormData((prev) => {
      if (!prev || !prev.fifoLots) return prev;
      const lots = prev.fifoLots.filter((_, i) => i !== index);
      return { ...prev, fifoLots: lots };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    onSave(formData);
    onClose();
  };

  const editTotalMasuk = (formData.masuk !== undefined && formData.masuk !== null)
    ? Number(formData.masuk) || 0
    : ((Number(formData.pembelian) || 0) + (Number(formData.returProduksi) || 0) + (Number(formData.masukLainLain) || 0));

  const editTotalKeluar = (formData.keluar !== undefined && formData.keluar !== null)
    ? Number(formData.keluar) || 0
    : ((Number(formData.bonProduksi) || 0) + (Number(formData.gudangKeluar) || 0) + (Number(formData.rusak) || 0) + (Number(formData.keluarLainLain) || 0));

  const editStockAkhir = Math.max(0, (Number(formData.stockAwal) || 0) + editTotalMasuk - editTotalKeluar);

  const editBaseEnd = Number(formData.baseEndNoLabel ?? formData.endNoLabel) || 0;
  const editEndNo = editBaseEnd > 0 ? editBaseEnd + editTotalMasuk : 0;
  const editStartNo = (editEndNo > 0 && editStockAkhir > 0) ? Math.max(0, editEndNo - editStockAkhir) : 0;

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden overflow-y-auto">
      <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-3xl shadow-2xl rounded p-6 my-8">
        <div className="flex justify-between items-center border-b-2 border-[#1A1A1A] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base uppercase text-neutral-800">Edit Detail Label & FIFO Lots</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Kode Label</label>
              <input
                type="text"
                value={formData.kode}
                onChange={(e) => handleFieldChange("kode", e.target.value)}
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 font-mono font-bold focus:border-black focus:outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-bold text-neutral-700 mb-1">Nama Label</label>
              <input
                type="text"
                value={formData.namaLabel}
                onChange={(e) => handleFieldChange("namaLabel", e.target.value)}
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 font-bold focus:border-black focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Mutasi Kolom Lengkap */}
          <div className="bg-neutral-50 border border-neutral-300 p-3 rounded">
            <h4 className="font-bold text-neutral-800 uppercase text-[11px] mb-2 flex items-center justify-between">
              <span>Mutasi Transaksi Harian (Satuan Lembar/Pcs)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-center">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 block mb-0.5">Stk Awal</span>
                <input
                  type="number"
                  value={formData.stockAwal}
                  onChange={(e) => handleFieldChange("stockAwal", Number(e.target.value))}
                  className="w-full text-center border border-neutral-300 rounded py-1 font-mono focus:border-black"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">Pembelian</span>
                <input
                  type="number"
                  value={formData.pembelian || 0}
                  onChange={(e) => handleFieldChange("pembelian", Number(e.target.value))}
                  className="w-full text-center border border-emerald-300 bg-emerald-50 rounded py-1 font-mono focus:border-black"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">Retur</span>
                <input
                  type="number"
                  value={formData.returProduksi || 0}
                  onChange={(e) => handleFieldChange("returProduksi", Number(e.target.value))}
                  className="w-full text-center border border-emerald-300 bg-emerald-50 rounded py-1 font-mono focus:border-black"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">Masuk Lain</span>
                <input
                  type="number"
                  value={formData.masukLainLain || 0}
                  onChange={(e) => handleFieldChange("masukLainLain", Number(e.target.value))}
                  className="w-full text-center border border-emerald-300 bg-emerald-50 rounded py-1 font-mono focus:border-black"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-700 block mb-0.5">Bon Produksi</span>
                <input
                  type="number"
                  value={formData.bonProduksi || 0}
                  onChange={(e) => handleFieldChange("bonProduksi", Number(e.target.value))}
                  className="w-full text-center border border-rose-300 bg-rose-50 rounded py-1 font-mono focus:border-black"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-700 block mb-0.5">Gudang</span>
                <input
                  type="number"
                  value={formData.gudangKeluar || 0}
                  onChange={(e) => handleFieldChange("gudangKeluar", Number(e.target.value))}
                  className="w-full text-center border border-rose-300 bg-rose-50 rounded py-1 font-mono focus:border-black"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-700 block mb-0.5">Over Sak</span>
                <input
                  type="number"
                  value={formData.rusak || 0}
                  onChange={(e) => handleFieldChange("rusak", Number(e.target.value))}
                  className="w-full text-center border border-rose-300 bg-rose-50 rounded py-1 font-mono focus:border-black"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-700 block mb-0.5">Lain-lain</span>
                <input
                  type="number"
                  value={formData.keluarLainLain || 0}
                  onChange={(e) => handleFieldChange("keluarLainLain", Number(e.target.value))}
                  className="w-full text-center border border-rose-300 bg-rose-50 rounded py-1 font-mono focus:border-black"
                />
              </div>
            </div>
          </div>

          {/* FIFO Lots Breakdown Section */}
          <div className="border border-neutral-300 rounded p-3 bg-white">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-neutral-800 uppercase text-[11px]">Rincian Lot FIFO (Urutan Pemakaian)</h4>
              </div>
              <button
                type="button"
                onClick={handleAddLot}
                className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Tambah Lot
              </button>
            </div>

            {(!formData.fifoLots || formData.fifoLots.length === 0) ? (
              <div className="text-center py-3 text-neutral-400 italic">Belum ada data lot FIFO tercatat</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {formData.fifoLots.map((lot, idx) => {
                  const age = calculateAgeInDays(lot.tglMasuk, selectedDate);
                  return (
                    <div key={lot.id || idx} className="flex items-center gap-2 bg-neutral-50 p-1.5 rounded border border-neutral-200">
                      <div className="flex-1">
                        <label className="text-[9px] font-bold text-neutral-500 block">Kav/Rak</label>
                        <input
                          type="text"
                          value={lot.kav}
                          onChange={(e) => handleUpdateLot(idx, "kav", e.target.value)}
                          className="w-full border border-neutral-300 rounded px-1.5 py-0.5 text-[11px] font-bold"
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-[9px] font-bold text-neutral-500 block">Tgl Masuk</label>
                        <input
                          type="date"
                          value={lot.tglMasuk}
                          onChange={(e) => handleUpdateLot(idx, "tglMasuk", e.target.value)}
                          className="w-full border border-neutral-300 rounded px-1.5 py-0.5 text-[11px] font-mono"
                        />
                      </div>
                      <div className="w-20 text-center">
                        <label className="text-[9px] font-bold text-neutral-500 block">Umur</label>
                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded inline-block ${
                          age > 30 ? "bg-red-100 text-red-800" : age > 14 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {age} Hari
                        </span>
                      </div>
                      <div className="w-36">
                        <label className="text-[9px] font-bold text-neutral-500 block">Jml Lembar</label>
                        <input
                          type="number"
                          value={lot.jmlLembar}
                          onChange={(e) => handleUpdateLot(idx, "jmlLembar", Number(e.target.value))}
                          className="w-full border border-neutral-300 rounded px-1.5 py-0.5 text-[11px] font-mono font-bold text-emerald-700"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLot(idx)}
                        className="p-1 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 rounded mt-3"
                        title="Hapus Lot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Gudang / Kavling Default</label>
              <input
                type="text"
                value={formData.gudangKav}
                onChange={(e) => handleFieldChange("gudangKav", e.target.value)}
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Suplier Default</label>
              <input
                type="text"
                value={formData.suplier}
                onChange={(e) => handleFieldChange("suplier", e.target.value)}
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-300 rounded">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                Nomor Label (Otomatis: No Akhir + Masuk, No Awal = No Akhir - Stok)
              </label>
              {editEndNo > 0 && (
                <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                  Urutan: {editStartNo.toLocaleString("id-ID")} s/d {editEndNo.toLocaleString("id-ID")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-neutral-700 block mb-1">
                  No Label Akhir (Sebelum Masuk)
                </span>
                <input
                  type="number"
                  value={formData.baseEndNoLabel ?? formData.endNoLabel ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    handleFieldChange("baseEndNoLabel", val);
                    handleFieldChange("endNoLabel", val ? val + editTotalMasuk : undefined);
                    handleFieldChange("startNoLabel", val ? Math.max(0, (val + editTotalMasuk) - editStockAkhir) : undefined);
                  }}
                  placeholder="Contoh: 500000"
                  className="w-full border border-amber-400 rounded px-2.5 py-1.5 focus:border-amber-700 focus:outline-none font-mono font-bold bg-white text-xs"
                />
                <span className="text-[10px] text-amber-900 block mt-0.5">
                  *Setiap jumlah masuk (+{editTotalMasuk.toLocaleString("id-ID")}) otomatis ditambahkan ke No Akhir
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-neutral-700 block mb-1">
                  No Label Awal (Terhitung Otomatis)
                </span>
                <div className="w-full border border-neutral-300 bg-neutral-100 rounded px-2.5 py-1.5 font-mono font-bold text-neutral-800 text-xs flex items-center justify-between">
                  <span>{editEndNo > 0 ? editStartNo.toLocaleString("id-ID") : "-"}</span>
                  {editEndNo > 0 && (
                    <span className="text-[10px] text-neutral-500 font-sans font-normal">
                      ({editEndNo.toLocaleString("id-ID")} - {editStockAkhir.toLocaleString("id-ID")})
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  Rumus: No Akhir ({editEndNo.toLocaleString("id-ID")}) - Stok Akhir ({editStockAkhir.toLocaleString("id-ID")})
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">Keterangan</label>
            <input
              type="text"
              value={formData.keterangan || ""}
              onChange={(e) => handleFieldChange("keterangan", e.target.value)}
              className="w-full border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-100 font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded font-bold shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-400" /> Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title: string;
  defaultName: string;
}

export function SignatureModal({ isOpen, onClose, onSave, title, defaultName }: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState(defaultName);
  const [fontStyle, setFontStyle] = useState<string>("font-cursive-1");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === "draw") {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#1A1A1A";
            ctx.lineWidth = 2.5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
          }
        }
      }, 100);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    let clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    let clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    let clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    if (activeTab === "draw") {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        onSave(dataUrl);
        onClose();
      }
    } else {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 400;
      tempCanvas.height = 160;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "transparent";
        ctx.fillRect(0, 0, 400, 160);
        ctx.font = fontStyle === "font-cursive-1" ? "italic 36px 'Brush Script MT', cursive, sans-serif" : "italic 32px 'Great Vibes', cursive, serif";
        ctx.fillStyle = "#1A1A1A";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(typedName, 200, 80);
        onSave(tempCanvas.toDataURL("image/png"));
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
      <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-md shadow-2xl p-6 rounded">
        <div className="flex justify-between items-center border-b-2 border-[#1A1A1A] pb-3 mb-4">
          <h3 className="font-bold text-base uppercase text-neutral-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-neutral-300 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("draw")}
            className={`flex-1 py-2 text-xs font-bold border-b-2 ${activeTab === "draw" ? "border-black text-black" : "border-transparent text-neutral-400"}`}
          >
            ✍️ Gambar Manual
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("type")}
            className={`flex-1 py-2 text-xs font-bold border-b-2 ${activeTab === "type" ? "border-black text-black" : "border-transparent text-neutral-400"}`}
          >
            🔤 Ketik Otomatis
          </button>
        </div>

        {activeTab === "draw" ? (
          <div>
            <p className="text-[11px] text-neutral-500 mb-2">Tanda tangan pada kotak di bawah menggunakan mouse atau sentuhan:</p>
            <div className="border-2 border-dashed border-neutral-300 bg-neutral-50 rounded mb-3 flex items-center justify-center touch-none">
              <canvas
                ref={canvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair w-full h-[160px]"
              />
            </div>
            <div className="flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={clearCanvas}
                className="text-neutral-500 hover:text-red-600 font-bold underline"
              >
                Hapus & Ulangi
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">Nama Tertera</label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full border border-neutral-300 rounded px-2.5 py-1.5 text-xs font-bold"
              />
            </div>
            <div className="p-4 bg-neutral-50 border rounded text-center min-h-[100px] flex items-center justify-center">
              <span className="font-serif italic text-2xl text-neutral-800">{typedName || "Tanda Tangan"}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-neutral-200 text-xs">
          <button onClick={onClose} className="px-4 py-2 border border-neutral-300 rounded text-neutral-700 font-bold">
            Batal
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-black text-white rounded font-bold hover:bg-neutral-800">
            Terapkan Tanda Tangan
          </button>
        </div>
      </div>
    </div>
  );
}
