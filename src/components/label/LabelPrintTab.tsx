import React, { useState, useMemo } from "react";
import { 
  Printer, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  Layers, 
  Check, 
  Sparkles,
  Tag,
  Settings,
  Upload,
  Signature as SignatureIcon
} from "lucide-react";
import { LabelItem, LabelReport, calculateAgeInDays, formatDDMMYY, getLabelNoRange } from "../../types/label";
import { SignatureModal } from "../SignatureModal";

interface LabelPrintTabProps {
  report: LabelReport;
  selectedDate: string;
  onUpdateReport: (updatedReport: LabelReport) => void;
  onExportExcel: (headerOverrides?: any) => void;
  onExportCSV: () => void;
}

export function LabelPrintTab({
  report,
  selectedDate,
  onUpdateReport,
  onExportExcel,
  onExportCSV
}: LabelPrintTabProps) {
  const [signatureModalKey, setSignatureModalKey] = useState<"dibuat" | "diperiksa" | "diketahui" | "diterima" | null>(null);
  const [isHeaderEditOpen, setIsHeaderEditOpen] = useState(false);

  // Editable header state
  const [docCode, setDocCode] = useState(report.docCode || "PLT - WRH - FM – 03 - 01");
  const [sLoc, setSLoc] = useState(report.gudangSLoct || "3001");
  const [companyTitle, setCompanyTitle] = useState(report.companyName || "PT. Japfa  Comfeed  Indonesia.Tbk – UNIT LPG");
  const [mainTitle, setMainTitle] = useState(report.title || "LAPORAN INFO KAVLING & STOK BAHAN PEMBUNGKUS");
  const [subTitle, setSubTitle] = useState(report.subTitle || "KARUNG PLASTIK / LABEL");
  const [unitTitle, setUnitTitle] = useState("( Satuan Lembar )");
  const [dibuatName, setDibuatName] = useState(report.dibuatOlehName || report.namaDibuat || "Sabto A");
  const [dibuatRole, setDibuatRole] = useState(report.dibuatOlehRole || "Admin Gudang");
  const [mengetahuiName, setMengetahuiName] = useState(report.mengetahuiName || report.namaDiketahui || "Antonius Andri Waroto");
  const [mengetahuiRole, setMengetahuiRole] = useState(report.mengetahuiRole || "Head Of Wrh Sub.Dept");

  const items = report.items || [];

  // Indonesian date formatter: e.g. "Selasa ,01 September 2026"
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
        const dateNum = String(d.getDate()).padStart(2, "0");
        const monthName = months[d.getMonth()];
        const year = d.getFullYear();
        return `${dayName} ,${dateNum} ${monthName} ${year}`;
      }
    } catch {
      // fallback
    }
    return `Selasa ,01 September 2026`;
  }, [selectedDate]);

  // Max number of FIFO lots across items (minimum 3 for fidelity)
  const maxFifoLots = useMemo(() => {
    let max = 3;
    items.forEach((it) => {
      if (it.fifoLots && it.fifoLots.length > max) {
        max = it.fifoLots.length;
      }
    });
    return max;
  }, [items]);

  const handleSaveSignature = (sigUrl: string) => {
    if (!signatureModalKey) return;

    if (signatureModalKey === "dibuat") {
      onUpdateReport({ ...report, ttdDibuat: sigUrl, dibuatOlehSignature: sigUrl });
    } else if (signatureModalKey === "diperiksa") {
      onUpdateReport({ ...report, ttdDiperiksa: sigUrl });
    } else if (signatureModalKey === "diketahui") {
      onUpdateReport({ ...report, ttdDiketahui: sigUrl, mengetahuiSignature: sigUrl });
    } else if (signatureModalKey === "diterima") {
      onUpdateReport({ ...report, ttdDiterima: sigUrl });
    }
    setSignatureModalKey(null);
  };

  const handleClearSignature = (key: "dibuat" | "diperiksa" | "diketahui" | "diterima") => {
    if (key === "dibuat") onUpdateReport({ ...report, ttdDibuat: "", dibuatOlehSignature: null });
    if (key === "diperiksa") onUpdateReport({ ...report, ttdDiperiksa: "" });
    if (key === "diketahui") onUpdateReport({ ...report, ttdDiketahui: "", mengetahuiSignature: null });
    if (key === "diterima") onUpdateReport({ ...report, ttdDiterima: "" });
  };

  const handleSaveHeaderSettings = () => {
    onUpdateReport({
      ...report,
      docCode,
      gudangSLoct: sLoc,
      companyName: companyTitle,
      title: mainTitle,
      subTitle,
      dibuatOlehName: dibuatName,
      dibuatOlehRole: dibuatRole,
      namaDibuat: dibuatName,
      mengetahuiName: mengetahuiName,
      mengetahuiRole: mengetahuiRole,
      namaDiketahui: mengetahuiName
    });
    setIsHeaderEditOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* PRINT CONTROLS ACTION BAR */}
      <div className="bg-white border-2 border-[#1A1A1A] p-4 rounded shadow-sm flex flex-wrap justify-between items-center gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-neutral-800" />
          <div>
            <h3 className="font-bold text-xs uppercase text-neutral-800">Lembar Cetak Laporan Resmi Bahan Pembungkus (FM-03-01)</h3>
            <p className="text-[11px] text-neutral-500">Format Resmi Standar PT. Japfa Comfeed Indonesia Tbk. - UNIT LPG</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHeaderEditOpen(!isHeaderEditOpen)}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Edit Header / Dokumen</span>
          </button>

          <button
            onClick={() =>
              onExportExcel({
                docCode,
                sLoc,
                companyTitle,
                mainTitle,
                subTitle,
                unitTitle,
                dibuatName,
                dibuatRole,
                mengetahuiName,
                mengetahuiRole
              })
            }
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Download file Excel (.xls) dengan format cetak resmi lengkap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel (.xls)</span>
          </button>

          <button
            onClick={onExportCSV}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-black text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen (Ctrl+P)</span>
          </button>
        </div>
      </div>

      {/* HEADER CONFIGURATION PANEL (PRINT:HIDDEN) */}
      {isHeaderEditOpen && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded text-xs print:hidden space-y-3">
          <div className="font-bold text-amber-900 uppercase flex items-center justify-between">
            <span>Pengaturan Header Laporan Cetak</span>
            <button onClick={() => setIsHeaderEditOpen(false)} className="text-neutral-500 hover:text-black">Tutup</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Judul Utama</label>
              <input
                type="text"
                value={mainTitle}
                onChange={(e) => setMainTitle(e.target.value)}
                className="w-full border border-neutral-300 rounded px-2 py-1 bg-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Sub Judul</label>
              <input
                type="text"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                className="w-full border border-neutral-300 rounded px-2 py-1 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 mb-1">No. Dokumen / Form Code</label>
              <input
                type="text"
                value={docCode}
                onChange={(e) => setDocCode(e.target.value)}
                className="w-full border border-neutral-300 rounded px-2 py-1 bg-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Nama Perusahaan & Unit</label>
              <input
                type="text"
                value={companyTitle}
                onChange={(e) => setCompanyTitle(e.target.value)}
                className="w-full border border-neutral-300 rounded px-2 py-1 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Gudang / S.Loc</label>
              <input
                type="text"
                value={sLoc}
                onChange={(e) => setSLoc(e.target.value)}
                className="w-full border border-neutral-300 rounded px-2 py-1 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 mb-1">Satuan Header</label>
              <input
                type="text"
                value={unitTitle}
                onChange={(e) => setUnitTitle(e.target.value)}
                className="w-full border border-neutral-300 rounded px-2 py-1 bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
            <button
              onClick={handleSaveHeaderSettings}
              className="px-4 py-1.5 bg-amber-800 text-white rounded font-bold hover:bg-amber-900"
            >
              Simpan Header
            </button>
          </div>
        </div>
      )}

      {/* PRINTABLE PAPER SHEET */}
      <div className="bg-white border border-neutral-400 p-4 sm:p-6 shadow-lg max-w-[1400px] mx-auto print:shadow-none print:border-none print:p-0 print:m-0 text-black font-sans overflow-x-auto">
        
        {/* HEADER SECTION MATCHING EXACTLY THE ATTACHED IMAGE */}
        <div className="mb-2">
          {/* Top Row: Logo, Title, and Doc Code */}
          <div className="grid grid-cols-12 items-center pb-1">
            {/* Left: Company Name */}
            <div className="col-span-3">
              <div className="text-[11px] font-bold text-neutral-900 tracking-tight font-serif">
                {companyTitle}
              </div>
            </div>

            {/* Center: Main Report Titles */}
            <div className="col-span-6 text-center">
              <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-black font-sans leading-tight">
                {mainTitle}
              </h1>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black mt-0.5">
                {subTitle}
              </div>
              <div className="text-xs font-bold text-black mt-0.5">
                GUDANG/S. LOC : {sLoc}
              </div>
              <div className="text-[11px] font-semibold text-black mt-0.5">
                {unitTitle}
              </div>
            </div>

            {/* Right: Document Form Code */}
            <div className="col-span-3 text-right">
              <div className="inline-block border border-black px-2 py-0.5 font-bold font-mono text-xs sm:text-sm text-black">
                {docCode}
              </div>
            </div>
          </div>

          {/* Date Row */}
          <div className="text-left font-bold text-xs text-black pt-1 pb-1">
            Hari / Tanggal : {formattedIndoDate}
          </div>
        </div>

        {/* MAIN DATA TABLE MATCHING EXACT IMAGE FORMAT */}
        <table className="w-full border-collapse border border-black text-[10px] font-sans">
          <thead>
            {/* LEVEL 1 HEADER */}
            <tr className="bg-white border-b border-black text-center font-bold">
              <th rowSpan={2} className="border border-black p-1 w-7 text-center align-middle">
                NO
              </th>
              <th rowSpan={2} className="border border-black p-1 w-24 text-center align-middle">
                KODE
              </th>
              <th rowSpan={2} className="border border-black p-1 min-w-[130px] text-center align-middle">
                JENIS BARANG
              </th>
              <th rowSpan={2} className="border border-black p-1 w-20 text-center align-middle leading-tight">
                TGL<br />PEMAKAIAN<br />TERAKHIR
              </th>
              <th rowSpan={2} className="border border-black p-1 w-16 text-center align-middle leading-tight">
                STOCK<br />AWAL
              </th>
              <th colSpan={4} className="border border-black p-0.5 text-center text-[9px] font-bold">
                PENERIMAAN
              </th>
              <th colSpan={5} className="border border-black p-0.5 text-center text-[9px] font-bold">
                PENGELUARAN
              </th>
              <th rowSpan={2} className="border border-black p-1 w-16 text-center align-middle leading-tight">
                STOCK<br />AKHIR
              </th>
              <th colSpan={maxFifoLots + 1} className="border border-black p-0.5 text-center text-[9px] font-bold leading-tight">
                URUTAN PEMAKAIAN SESUAI FIFO( KAV,TANGGAL MASUK,UMUR, JML LEMBAR)
              </th>
              <th rowSpan={2} className="border border-black p-1 min-w-[100px] text-center align-middle">
                NO LABEL
              </th>
            </tr>

            {/* LEVEL 2 SUB-HEADER */}
            <tr className="bg-white border-b border-black text-[8px] font-bold text-center">
              {/* PENERIMAAN SUB-COLUMNS */}
              <th className="border border-black p-0.5 w-12">PEMBELIAN</th>
              <th className="border border-black p-0.5 w-12 leading-tight">RETUR<br />PRODUKSI</th>
              <th className="border border-black p-0.5 w-10">LAIN-LAIN</th>
              <th className="border border-black p-0.5 w-12">SUBTOTAL</th>

              {/* PENGELUARAN SUB-COLUMNS */}
              <th className="border border-black p-0.5 w-12 leading-tight">BON<br />PRODUKSI</th>
              <th className="border border-black p-0.5 w-10">GUDANG</th>
              <th className="border border-black p-0.5 w-10 leading-tight">OVER SAK</th>
              <th className="border border-black p-0.5 w-10">LAIN-LAIN</th>
              <th className="border border-black p-0.5 w-12">SUBTOTAL</th>

              {/* FIFO SUB-INDICATOR & LOTS */}
              <th className="border border-black p-0.5 w-12"></th>
              {Array.from({ length: maxFifoLots }).map((_, i) => (
                <th key={`fifo-head-${i}`} className="border border-black p-0.5 w-14"></th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* GROUP BANNER: II. LABEL LABEL YANG DI PAKAI */}
            <tr className="bg-[#FFFF99] border-b border-black font-bold text-[10px]">
              <td colSpan={5} className="border-r border-black px-2 py-0.5 text-left font-black tracking-wide">
                II. LABEL &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; LABEL YANG DI PAKAI
              </td>
              <td colSpan={4} className="border-r border-black"></td>
              <td colSpan={5} className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td colSpan={maxFifoLots + 1} className="border-r border-black"></td>
              <td className="p-0.5 text-right font-bold pr-2">
                No Label
              </td>
            </tr>

            {/* DATA ROWS */}
            {items.map((item, idx) => {
              const numAwal = item.stockAwal || 0;
              const numPem = item.pembelian || 0;
              const numRet = item.returProduksi || 0;
              const numMskLain = item.masukLainLain || 0;
              const subtotalMasuk = item.masuk || (numPem + numRet + numMskLain);

              const numBon = item.bonProduksi || 0;
              const numGdg = item.gudangKeluar || 0;
              const numOverZak = (item as any).overZak !== undefined ? (item as any).overZak : (item.rusak || 0);
              const numKlrLain = item.keluarLainLain || 0;
              const subtotalKeluar = item.keluar || (numBon + numGdg + numOverZak + numKlrLain);

              const stockAkhir = numAwal + subtotalMasuk - subtotalKeluar;
              const lots = item.fifoLots || [];
              const labelRange = getLabelNoRange(item);

              // Format Last Usage Date & Age
              const tglPakaiStr = item.tglPemakaianTerakhir ? formatDDMMYY(item.tglPemakaianTerakhir) : "";
              const umurPakaiHari = item.tglPemakaianTerakhir ? calculateAgeInDays(item.tglPemakaianTerakhir, selectedDate) : null;

              return (
                <tr key={item.id} className="border-b border-black hover:bg-neutral-50/50">
                  {/* NO */}
                  <td className="border border-black p-1 text-center font-bold text-[9px] align-middle">
                    {idx + 1}
                  </td>

                  {/* KODE */}
                  <td className="border border-black p-1 font-mono font-bold text-[9px] align-top text-left">
                    {item.kode}
                  </td>

                  {/* JENIS BARANG (NAMA LABEL) */}
                  <td className="border border-black p-1 font-bold text-[10px] align-top text-left">
                    {item.namaLabel}
                  </td>

                  {/* TGL PEMAKAIAN TERAKHIR (2 ROWS IN CELL) */}
                  <td className="border border-black p-1 text-center font-mono text-[9px] align-top">
                    {tglPakaiStr ? (
                      <div>
                        <div className="font-bold">{tglPakaiStr}</div>
                        <div className="text-[8px] text-neutral-600">{umurPakaiHari !== null ? `${umurPakaiHari} hari` : ""}</div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>

                  {/* STOCK AWAL */}
                  <td className="border border-black p-1 text-right font-mono font-bold text-[9px] align-top">
                    {numAwal.toLocaleString("id-ID")}
                  </td>

                  {/* PENERIMAAN: PEMBELIAN */}
                  <td className="border border-black p-1 text-right font-mono text-[9px] align-top">
                    {numPem > 0 ? numPem.toLocaleString("id-ID") : ""}
                  </td>

                  {/* PENERIMAAN: RETUR PRODUKSI */}
                  <td className="border border-black p-1 text-right font-mono text-[9px] align-top">
                    {numRet > 0 ? numRet.toLocaleString("id-ID") : ""}
                  </td>

                  {/* PENERIMAAN: LAIN-LAIN */}
                  <td className="border border-black p-1 text-right font-mono text-[9px] align-top">
                    {numMskLain > 0 ? numMskLain.toLocaleString("id-ID") : ""}
                  </td>

                  {/* PENERIMAAN: SUBTOTAL */}
                  <td className="border border-black p-1 text-right font-mono font-bold text-[9px] align-top">
                    {subtotalMasuk > 0 ? subtotalMasuk.toLocaleString("id-ID") : "0"}
                  </td>

                  {/* PENGELUARAN: BON PRODUKSI */}
                  <td className="border border-black p-1 text-right font-mono text-[9px] align-top">
                    {numBon > 0 ? numBon.toLocaleString("id-ID") : ""}
                  </td>

                  {/* PENGELUARAN: GUDANG */}
                  <td className="border border-black p-1 text-right font-mono text-[9px] align-top">
                    {numGdg > 0 ? numGdg.toLocaleString("id-ID") : ""}
                  </td>

                  {/* PENGELUARAN: OVER SAK */}
                  <td className="border border-black p-1 text-right font-mono text-[9px] align-top">
                    {numOverZak > 0 ? numOverZak.toLocaleString("id-ID") : ""}
                  </td>

                  {/* PENGELUARAN: LAIN-LAIN */}
                  <td className="border border-black p-1 text-right font-mono text-[9px] align-top">
                    {numKlrLain > 0 ? numKlrLain.toLocaleString("id-ID") : ""}
                  </td>

                  {/* PENGELUARAN: SUBTOTAL */}
                  <td className="border border-black p-1 text-right font-mono font-bold text-[9px] align-top">
                    {subtotalKeluar > 0 ? subtotalKeluar.toLocaleString("id-ID") : "0"}
                  </td>

                  {/* STOCK AKHIR */}
                  <td className="border border-black p-1 text-right font-mono font-bold text-[9px] align-top">
                    {stockAkhir.toLocaleString("id-ID")}
                  </td>

                  {/* FIFO SUB-INDICATOR (VERTICAL LABELS: Kav, Tgl. Msk, Umur, Jml Lmbr) */}
                  <td className="border border-black p-0 text-center text-[8.5px] leading-none align-top bg-white">
                    <div className="border-b border-black py-1 px-1 font-bold text-black">Kav.</div>
                    <div className="border-b border-black py-1 px-1 font-bold text-black">Tgl. Msk</div>
                    <div className="border-b border-black py-1 px-1 font-bold text-black">Umur</div>
                    <div className="py-1 px-1 font-bold text-black">Jml Lmbr</div>
                  </td>

                  {/* FIFO LOT COLUMNS (LOT 1, LOT 2, LOT 3, ...) */}
                  {Array.from({ length: maxFifoLots }).map((_, lotIdx) => {
                    const lot = lots[lotIdx];
                    if (!lot) {
                      return (
                        <td key={`lot-col-${lotIdx}`} className="border border-black p-0 text-center text-[8.5px] leading-none align-top bg-white font-mono">
                          <div className="border-b border-black py-1 px-1 text-black font-bold">-</div>
                          <div className="border-b border-black py-1 px-1 text-black font-bold">-</div>
                          <div className="border-b border-black py-1 px-1 text-black font-bold">-</div>
                          <div className="py-1 px-1 text-black font-bold">-</div>
                        </td>
                      );
                    }

                    const lotDateStr = lot.tglMasuk ? formatDDMMYY(lot.tglMasuk) : "-";
                    const lotAgeDays = lot.tglMasuk ? calculateAgeInDays(lot.tglMasuk, selectedDate) : lot.umurHari || 0;

                    return (
                      <td key={`lot-col-${lotIdx}`} className="border border-black p-0 text-center text-[8.5px] leading-none align-top bg-white font-mono">
                        <div className="border-b border-black py-1 px-1 font-bold text-black">{lot.kav || sLoc}</div>
                        <div className="border-b border-black py-1 px-1 font-bold text-[#DC2626]">{lotDateStr}</div>
                        <div className="border-b border-black py-1 px-1 font-bold text-[#2563EB]">{lotAgeDays} Hari</div>
                        <div className="py-1 px-1 font-bold text-black text-[9px]">{lot.jmlLembar ? lot.jmlLembar.toLocaleString("id-ID") : "-"}</div>
                      </td>
                    );
                  })}

                  {/* KETERANGAN / NO LABEL */}
                  <td className="border border-black p-1 text-right text-[8.5px] font-mono align-top leading-tight">
                    {labelRange.endNo > 0 ? (
                      <div>
                        <div className="font-bold text-black">{labelRange.formattedStart}</div>
                        <div className="font-bold text-[#E00000]">{labelRange.formattedEnd}</div>
                      </div>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                    {item.keterangan && item.keterangan.trim() !== "" && !item.keterangan.includes(labelRange.formattedStart) && (
                      <div className="text-[7px] text-neutral-500 font-sans mt-0.5 whitespace-pre-line text-left border-t border-neutral-300 pt-0.5">
                        {item.keterangan}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* TOTAL SUMMARY FOOTER */}
          <tfoot>
            <tr className="bg-white border-t-2 border-black font-bold text-[9px]">
              <td colSpan={4} className="border border-black p-1 text-center font-bold">
                TOTAL
              </td>
              {/* TOTAL STOCK AWAL */}
              <td className="border border-black p-1 text-right font-mono font-bold">
                {items.reduce((acc, it) => acc + (it.stockAwal || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL PEMBELIAN */}
              <td className="border border-black p-1 text-right font-mono">
                {items.reduce((acc, it) => acc + (it.pembelian || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL RETUR PRODUKSI */}
              <td className="border border-black p-1 text-right font-mono">
                {items.reduce((acc, it) => acc + (it.returProduksi || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL MASUK LAIN */}
              <td className="border border-black p-1 text-right font-mono">
                {items.reduce((acc, it) => acc + (it.masukLainLain || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL SUBTOTAL MASUK */}
              <td className="border border-black p-1 text-right font-mono font-bold">
                {items.reduce((acc, it) => acc + (it.masuk || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL BON PRODUKSI */}
              <td className="border border-black p-1 text-right font-mono">
                {items.reduce((acc, it) => acc + (it.bonProduksi || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL GUDANG */}
              <td className="border border-black p-1 text-right font-mono">
                {items.reduce((acc, it) => acc + (it.gudangKeluar || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL OVER SAK */}
              <td className="border border-black p-1 text-right font-mono">
                {items.reduce((acc, it) => acc + ((it as any).overZak || it.rusak || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL KELUAR LAIN */}
              <td className="border border-black p-1 text-right font-mono">
                {items.reduce((acc, it) => acc + (it.keluarLainLain || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL SUBTOTAL KELUAR */}
              <td className="border border-black p-1 text-right font-mono font-bold">
                {items.reduce((acc, it) => acc + (it.keluar || 0), 0).toLocaleString("id-ID")}
              </td>
              {/* TOTAL STOCK AKHIR */}
              <td className="border border-black p-1 text-right font-mono font-bold">
                {items.reduce((acc, it) => {
                  const numAwal = it.stockAwal || 0;
                  const numMasuk = it.masuk || 0;
                  const numKeluar = it.keluar || 0;
                  return acc + (numAwal + numMasuk - numKeluar);
                }, 0).toLocaleString("id-ID")}
              </td>
              {/* BLANK FIFO & KETERANGAN IN TFOOT */}
              <td colSpan={maxFifoLots + 2} className="border border-black p-1"></td>
            </tr>
          </tfoot>
        </table>

        {/* 2 OFFICIAL SIGNATURE BLOCKS (DIBUAT OLEH & MENGETAHUI) */}
        <div className="grid grid-cols-2 gap-8 mt-6 pt-2 text-center text-xs">
          {/* Dibuat Oleh */}
          <div className="text-center">
            <span className="font-bold text-xs block mb-1">Dibuat Oleh:</span>
            <div 
              onClick={() => setSignatureModalKey("dibuat")}
              className="h-16 flex items-center justify-center relative cursor-pointer border border-dashed border-neutral-300 hover:border-black rounded bg-neutral-50/50 hover:bg-neutral-100/50 transition-colors group print:border-none print:bg-transparent"
              title="Klik untuk upload file atau tanda tangan digital"
            >
              {report.ttdDibuat || report.dibuatOlehSignature ? (
                <img src={report.ttdDibuat || report.dibuatOlehSignature} alt="TTD Dibuat" className="max-h-14 max-w-full object-contain mix-blend-multiply" />
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-neutral-400 group-hover:text-black italic print:hidden">
                  <Upload className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-bold uppercase tracking-tight">Upload / TTD</span>
                </div>
              )}
              {(report.ttdDibuat || report.dibuatOlehSignature) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearSignature("dibuat");
                  }}
                  className="absolute top-1 right-1 p-0.5 text-red-600 hover:bg-red-100 rounded print:hidden cursor-pointer"
                  title="Hapus tanda tangan"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="inline-block border-b border-black pb-0.5 font-bold text-xs uppercase min-w-[160px] mt-1">
              ( {dibuatName} )
            </div>
            <div className="text-[10px] text-neutral-700 font-semibold">{dibuatRole}</div>

            <div className="mt-1.5 flex justify-center gap-1 print:hidden">
              <button
                onClick={() => setSignatureModalKey("dibuat")}
                className="px-2.5 py-1 text-[10px] font-bold bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3 text-neutral-600" /> Upload / TTD
              </button>
              {(report.ttdDibuat || report.dibuatOlehSignature) && (
                <button
                  onClick={() => handleClearSignature("dibuat")}
                  className="px-1.5 py-1 text-[10px] text-red-600 hover:bg-red-50 border border-red-200 rounded cursor-pointer"
                  title="Hapus tanda tangan"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Mengetahui */}
          <div className="text-center">
            <span className="font-bold text-xs block mb-1">Mengetahui:</span>
            <div 
              onClick={() => setSignatureModalKey("diketahui")}
              className="h-16 flex items-center justify-center relative cursor-pointer border border-dashed border-neutral-300 hover:border-black rounded bg-neutral-50/50 hover:bg-neutral-100/50 transition-colors group print:border-none print:bg-transparent"
              title="Klik untuk upload file atau tanda tangan digital"
            >
              {report.ttdDiketahui || report.mengetahuiSignature ? (
                <img src={report.ttdDiketahui || report.mengetahuiSignature} alt="TTD Diketahui" className="max-h-14 max-w-full object-contain mix-blend-multiply" />
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-neutral-400 group-hover:text-black italic print:hidden">
                  <Upload className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-bold uppercase tracking-tight">Upload / TTD</span>
                </div>
              )}
              {(report.ttdDiketahui || report.mengetahuiSignature) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearSignature("diketahui");
                  }}
                  className="absolute top-1 right-1 p-0.5 text-red-600 hover:bg-red-100 rounded print:hidden cursor-pointer"
                  title="Hapus tanda tangan"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="inline-block border-b border-black pb-0.5 font-bold text-xs uppercase min-w-[160px] mt-1">
              ( {mengetahuiName} )
            </div>
            <div className="text-[10px] text-neutral-700 font-semibold">{mengetahuiRole}</div>

            <div className="mt-1.5 flex justify-center gap-1 print:hidden">
              <button
                onClick={() => setSignatureModalKey("diketahui")}
                className="px-2.5 py-1 text-[10px] font-bold bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3 text-neutral-600" /> Upload / TTD
              </button>
              {(report.ttdDiketahui || report.mengetahuiSignature) && (
                <button
                  onClick={() => handleClearSignature("diketahui")}
                  className="px-1.5 py-1 text-[10px] text-red-600 hover:bg-red-50 border border-red-200 rounded cursor-pointer"
                  title="Hapus tanda tangan"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DIGITAL SIGNATURE */}
      {signatureModalKey && (
        <SignatureModal
          isOpen={!!signatureModalKey}
          onClose={() => setSignatureModalKey(null)}
          onSave={handleSaveSignature}
          title={`Tanda Tangan Digital - ${
            signatureModalKey === "dibuat"
              ? "Admin Gudang"
              : "Mengetahui"
          }`}
          defaultName={
            signatureModalKey === "dibuat"
              ? dibuatName
              : mengetahuiName
          }
        />
      )}
    </div>
  );
}

