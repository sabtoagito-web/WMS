import React, { useState, useMemo } from "react";
import { 
  Package, 
  Layers, 
  Tag, 
  TrendingUp, 
  TrendingDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal,
  Clock, 
  BarChart3, 
  LineChart,
  PieChart, 
  Warehouse,
  ExternalLink,
  Info,
  Trash2,
  RotateCcw
} from "lucide-react";
import { KarungReport, calculateAgeInDays, parseDateStringToDate } from "../types/karung";
import { LabelReport } from "../types/label";

export interface StockItem {
  id: string;
  kode: string;
  namaMaterial: string;
  stockAwal: number;
  stockAwalColly: number;
  masuk: number;
  masukColly: number;
  keluar: number;
  keluarColly: number;
  packagingDesc: string;
  beratPerColly?: number;
  gudangKav: string;
  suplier: string;
  tonase?: number;
  colly?: number;
  tglMasuk: string;
  batch: string;
  mfgDate: string;
  expDate: string;
  keterangan?: string;
}

export interface DailyReport {
  date: string;
  stockAwalDate?: string;
  gudangSLoct: string;
  docCode: string;
  companyName: string;
  items: StockItem[];
}

interface WarehouseVisualizationsProps {
  feedAddReport: DailyReport;
  karungReport: KarungReport;
  labelReport: LabelReport;
  onNavigate: (tab: "stock" | "stock-karung" | "stock-label", subTab?: "table" | "masuk" | "keluar" | "kavling") => void;
}

export type ChartType = "bar" | "line" | "pie";
export type SortOrder = "desc" | "asc";

export interface GenericChartItem {
  id: string;
  name: string;
  code: string;
  subText?: string;
  kavling?: string;
  supplier?: string;
  value: number;
  unit: string;
  portionPercent: number;
  secondaryInfo?: string;
  initialStock?: number;
  initialSecondary?: string;
  masuk?: number;
  keluar?: number;
  batch?: string;
  umurHari?: number;
  kemasanDesc?: string;
}

/**
 * Calculates item age in days from batch (YYMMDD format e.g. 260807 = 33 hr) or tglMasuk
 */
export function getBatchAgeDays(batch?: string, tglMasuk?: string, refDateStr = "2026-09-09"): number {
  if (tglMasuk) {
    const d = calculateAgeInDays(tglMasuk, refDateStr);
    if (d > 0) return d;
  }
  if (batch && /^\d{6}$/.test(batch.trim())) {
    const b = batch.trim();
    const yy = 2000 + parseInt(b.slice(0, 2), 10);
    const mm = parseInt(b.slice(2, 4), 10) - 1;
    const dd = parseInt(b.slice(4, 6), 10);
    const batchDate = new Date(yy, mm, dd);
    const ref = parseDateStringToDate(refDateStr) || new Date(2026, 8, 9);
    const diffMs = ref.getTime() - batchDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) return diffDays;
  }
  return 30;
}

const PALETTE = [
  "#0284c7", // sky-600
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f43f5e", // rose-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
  "#a855f7", // purple-500
];

// Helper coordinate for SVG Pie arcs
function getCoordinatesForPercent(percent: number, radius: number, cx = 130, cy = 130) {
  const x = cx + radius * Math.cos(2 * Math.PI * percent - Math.PI / 2);
  const y = cy + radius * Math.sin(2 * Math.PI * percent - Math.PI / 2);
  return [x, y];
}

// =========================================================================
// UNIVERSAL REUSABLE CHART RENDERER (BATANG / GARIS / LINGKARAN)
// =========================================================================
const UniversalChartViewer: React.FC<{
  items: GenericChartItem[];
  chartType: ChartType;
  sortOrder: SortOrder;
  themeColor: "sky" | "amber" | "blue";
  unitLabel: string;
  chartTitle?: string;
  chartSubtitle?: string;
  totalSkuCount?: number;
  legendLabel?: {
    stock: string;
    masuk: string;
    keluar: string;
  };
}> = ({ 
  items, 
  chartType, 
  sortOrder, 
  themeColor, 
  unitLabel,
  chartTitle,
  chartSubtitle,
  totalSkuCount,
  legendLabel
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-neutral-400 italic bg-neutral-50/50 rounded border border-dashed border-neutral-300">
        Tidak ada data material yang sesuai filter untuk ditampilkan
      </div>
    );
  }

  const colorStyles = {
    sky: {
      barGradient: sortOrder === "asc" ? "from-amber-500 to-rose-600" : "from-sky-500 to-sky-700",
      lineStroke: sortOrder === "asc" ? "#e11d48" : "#0284c7",
      areaFill: sortOrder === "asc" ? "#f43f5e" : "#0284c7",
      dotBg: sortOrder === "asc" ? "#e11d48" : "#0284c7",
      textCol: "text-sky-900",
      badgeCol: "bg-sky-100 text-sky-800"
    },
    amber: {
      barGradient: sortOrder === "asc" ? "from-amber-500 to-rose-600" : "from-amber-500 to-amber-700",
      lineStroke: sortOrder === "asc" ? "#e11d48" : "#d97706",
      areaFill: sortOrder === "asc" ? "#f43f5e" : "#f59e0b",
      dotBg: sortOrder === "asc" ? "#e11d48" : "#d97706",
      textCol: "text-amber-900",
      badgeCol: "bg-amber-100 text-amber-900"
    },
    blue: {
      barGradient: sortOrder === "asc" ? "from-amber-500 to-rose-600" : "from-blue-500 to-indigo-700",
      lineStroke: sortOrder === "asc" ? "#e11d48" : "#2563eb",
      areaFill: sortOrder === "asc" ? "#f43f5e" : "#3b82f6",
      dotBg: sortOrder === "asc" ? "#e11d48" : "#2563eb",
      textCol: "text-blue-900",
      badgeCol: "bg-blue-100 text-blue-900"
    }
  }[themeColor];

  // -------------------------------------------------------------------------
  // 1. TAMPILAN GRAFIK BATANG (BAR CHART) - SESUAI DESAIN PERSIS DI GAMBAR USER
  // -------------------------------------------------------------------------
  if (chartType === "bar") {
    const visibleItems = items.filter(i => !hiddenIds.includes(i.id));

    if (visibleItems.length === 0) {
      return (
        <div className="py-8 text-center text-xs text-neutral-500 italic bg-neutral-50 rounded border border-dashed border-neutral-300">
          Semua item disembunyikan dari grafik.{" "}
          <button 
            onClick={() => setHiddenIds([])} 
            className="text-sky-600 hover:text-sky-800 underline font-bold ml-1 cursor-pointer"
          >
            Tampilkan Kembali
          </button>
        </div>
      );
    }

    const maxVal = Math.max(...visibleItems.map(i => i.value), 1);

    return (
      <div className="flex flex-col gap-4 font-sans">
        {/* HEADER & TOP-RIGHT LEGEND */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-2 border-b border-neutral-200/80">
          <div>
            <h4 className="font-serif italic font-bold text-lg md:text-xl text-neutral-900 tracking-tight">
              {chartTitle || `Grafik Tonase Seluruh Material (${totalSkuCount ?? items.length} SKU)`}
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              {chartSubtitle || `Panjang grafik batang merepresentasikan proporsi stok akhir (${unitLabel}) terhadap kapasitas total gudang`}
            </p>
          </div>

          {/* Legend Items matching screenshot: Stok Akhir (Kg) [Blue], Masuk [Green], Keluar [Red] */}
          <div className="flex items-center gap-4 text-xs font-medium shrink-0 self-start sm:self-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#0077c8] shadow-2xs" />
              <span className="text-neutral-700 font-semibold">{legendLabel?.stock || `Stok Akhir (${unitLabel})`}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#10b981] shadow-2xs" />
              <span className="text-neutral-700 font-semibold">{legendLabel?.masuk || "Masuk"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#f43f5e] shadow-2xs" />
              <span className="text-neutral-700 font-semibold">{legendLabel?.keluar || "Keluar"}</span>
            </div>
          </div>
        </div>

        {/* MATERIAL ROWS LIST */}
        <div className="space-y-4 pt-1">
          {visibleItems.map((item, idx) => {
            const pctOfMax = Math.max(Math.min(Math.round((item.value / maxVal) * 100), 100), 2);
            const hasMasuk = (item.masuk || 0) > 0;
            const hasKeluar = (item.keluar || 0) > 0;

            return (
              <div 
                key={item.id} 
                className="flex flex-col gap-1.5 pb-3 border-b border-neutral-200/70 last:border-b-0 last:pb-0"
              >
                {/* ROW 1: METADATA & VALUES */}
                <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 text-xs">
                  
                  {/* Left Badges & Labels */}
                  <div className="flex items-center flex-wrap gap-2 min-w-0">
                    <span className="font-mono text-xs text-neutral-400 font-semibold w-5">
                      #{idx + 1}
                    </span>

                    {/* Red Pill with Material Code */}
                    <span className="font-mono text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded shadow-2xs">
                      {item.code}
                    </span>

                    {/* Material Name in dark teal italic bold serif */}
                    <span className="font-serif italic font-bold text-[#005f73] hover:text-[#004250] text-sm md:text-base tracking-wide truncate">
                      {item.name}
                    </span>

                    {/* Kavling in purple badge */}
                    {item.kavling && (
                      <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 border border-purple-200 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                        <span className="text-[10px]">@</span>
                        <span>{item.kavling}</span>
                      </span>
                    )}

                    {/* Supplier in uppercase neutral */}
                    {item.supplier && (
                      <span className="text-neutral-400 text-xs font-medium uppercase truncate hidden sm:inline">
                        • {item.supplier}
                      </span>
                    )}
                  </div>

                  {/* Right Metrics: Portion %, Value, Colly badge, Trash Action */}
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto font-sans">
                    <span className="text-neutral-500 text-xs font-medium">
                      {item.portionPercent.toFixed(1)}% porsi
                    </span>

                    <span className="font-mono font-bold text-sm sm:text-base text-neutral-900 tracking-tight">
                      {item.value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}
                    </span>

                    {item.secondaryInfo && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-sky-50 border border-sky-300 text-sky-700 font-bold font-sans text-xs shadow-2xs">
                        {item.secondaryInfo}
                      </span>
                    )}

                    <button
                      onClick={() => setHiddenIds(prev => [...prev, item.id])}
                      title="Sembunyikan dari grafik visualisasi"
                      className="text-neutral-300 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ROW 2: PROGRESS BAR WITH BACKGROUND GRIDLINES & INNER WHITE TEXT */}
                <div className="w-full bg-[#f1f3f5] rounded border border-neutral-300/80 h-6 sm:h-6.5 relative overflow-hidden flex items-center shadow-2xs">
                  {/* Background gridlines at 20%, 40%, 60%, 80% */}
                  <div className="absolute inset-0 grid grid-cols-5 pointer-events-none divide-x divide-neutral-200/90 z-0">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>

                  {/* Main Blue Stock Bar */}
                  <div 
                    className="bg-[#0077c8] h-full flex items-center justify-end relative transition-all duration-500 z-10"
                    style={{ width: `${pctOfMax}%` }}
                  >
                    {/* Inner white divider lines */}
                    <div className="absolute inset-0 grid grid-cols-4 pointer-events-none divide-x divide-white/40">
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>

                    {/* Stock label inside the bar */}
                    <span className="text-white font-mono font-bold text-xs pr-2.5 z-20 whitespace-nowrap drop-shadow-2xs">
                      {Math.round(item.value).toLocaleString("id-ID")} {item.unit}
                    </span>
                  </div>

                  {/* Incoming Segment (if > 0) */}
                  {hasMasuk && (
                    <div 
                      className="bg-[#10b981] h-full flex items-center justify-center text-white font-mono text-[10px] font-bold px-1.5 border-l border-white z-10"
                      title={`Masuk: +${item.masuk?.toLocaleString("id-ID")} ${item.unit}`}
                    >
                      +{Math.round(item.masuk || 0).toLocaleString("id-ID")}
                    </div>
                  )}

                  {/* Outgoing Segment (if > 0) */}
                  {hasKeluar && (
                    <div 
                      className="bg-[#f43f5e] h-full flex items-center justify-center text-white font-mono text-[10px] font-bold px-1.5 border-l border-white z-10"
                      title={`Keluar: -${item.keluar?.toLocaleString("id-ID")} ${item.unit}`}
                    >
                      -{Math.round(item.keluar || 0).toLocaleString("id-ID")}
                    </div>
                  )}
                </div>

                {/* ROW 3: SUB-ROW DETAILS (AWAL, BATCH, UMUR, KEMASAN) */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
                  {/* Left: Awal */}
                  <div className="text-neutral-500 font-mono text-[11px]">
                    <span className="italic">Awal:</span> {item.initialStock?.toLocaleString("id-ID") || 0} {item.unit} {item.initialSecondary ? `(${item.initialSecondary})` : ""}
                  </div>

                  {/* Right: Batch, Umur, Kemasan */}
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px]">
                    {item.batch && (
                      <div>
                        <span className="text-neutral-500">Batch: </span>
                        <span className="font-mono font-bold text-rose-600">{item.batch}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-neutral-500">Umur: </span>
                      <span className="font-bold text-sky-600 font-sans">Umur {item.umurHari ?? 30} hr</span>
                    </div>

                    {item.kemasanDesc && (
                      <div>
                        <span className="text-neutral-500">Kemasan: </span>
                        <span className="font-mono text-neutral-600 font-medium">{item.kemasanDesc}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* RESTORE BANNER IF ITEMS HIDDEN */}
        {hiddenIds.length > 0 && (
          <div className="mt-2 text-xs bg-neutral-100 border border-neutral-300 p-2.5 rounded flex items-center justify-between">
            <span className="text-neutral-600">
              {hiddenIds.length} item disembunyikan dari grafik visualisasi.
            </span>
            <button
              onClick={() => setHiddenIds([])}
              className="text-sky-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Tampilkan Kembali (Reset)
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. TAMPILAN GRAFIK GARIS (LINE CHART SVG)
  // -------------------------------------------------------------------------
  if (chartType === "line") {
    const width = 720;
    const height = 250;
    const paddingLeft = 65;
    const paddingRight = 45;
    const paddingTop = 35;
    const paddingBottom = 45;
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const values = items.map(i => i.value);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = (maxVal - minVal) || 1;

    const points = items.map((item, idx) => {
      const x = items.length === 1 
        ? paddingLeft + chartW / 2 
        : paddingLeft + (idx / (items.length - 1)) * chartW;
      const y = height - paddingBottom - ((item.value - minVal) / range) * chartH;
      return { x, y, item, idx };
    });

    const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    
    const areaPath = points.length > 0
      ? `M ${points[0].x.toFixed(1)},${height - paddingBottom} ` +
        points.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
        ` L ${points[points.length - 1].x.toFixed(1)},${height - paddingBottom} Z`
      : "";

    // 4 Horizontal Guideline ticks
    const ticks = [0, 0.33, 0.66, 1].map(ratio => {
      const val = minVal + ratio * range;
      const y = height - paddingBottom - ratio * chartH;
      return { val, y };
    });

    return (
      <div className="flex flex-col gap-4">
        <div className="w-full bg-white border border-neutral-200 rounded p-2 overflow-x-auto shadow-inner">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[550px] h-auto select-none">
            <defs>
              <linearGradient id={`line-grad-${themeColor}-${sortOrder}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorStyles.areaFill} stopOpacity="0.30" />
                <stop offset="100%" stopColor={colorStyles.areaFill} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            {ticks.map((t, idx) => (
              <g key={idx}>
                <line 
                  x1={paddingLeft} 
                  y1={t.y} 
                  x2={width - paddingRight} 
                  y2={t.y} 
                  stroke="#E5E7EB" 
                  strokeDasharray="4,4" 
                  strokeWidth="1" 
                />
                <text 
                  x={paddingLeft - 8} 
                  y={t.y + 3.5} 
                  textAnchor="end" 
                  className="font-mono text-[9px] fill-neutral-400"
                >
                  {Math.round(t.val).toLocaleString("id-ID")}
                </text>
              </g>
            ))}

            {/* Base Axis Line */}
            <line 
              x1={paddingLeft} 
              y1={height - paddingBottom} 
              x2={width - paddingRight} 
              y2={height - paddingBottom} 
              stroke="#9CA3AF" 
              strokeWidth="1.5" 
            />

            {/* Filled Area */}
            {areaPath && (
              <path 
                d={areaPath} 
                fill={`url(#line-grad-${themeColor}-${sortOrder})`} 
              />
            )}

            {/* Polyline */}
            {polylinePoints && (
              <polyline
                fill="none"
                stroke={colorStyles.lineStroke}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
            )}

            {/* Points & Interactive Nodes */}
            {points.map((p) => {
              const isHovered = hoveredIdx === p.idx;
              return (
                <g 
                  key={p.idx} 
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(p.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Vertical guide on hover */}
                  {isHovered && (
                    <line
                      x1={p.x}
                      y1={paddingTop}
                      x2={p.x}
                      y2={height - paddingBottom}
                      stroke={colorStyles.lineStroke}
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  )}

                  {/* Outer circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 7 : 5}
                    fill="#FFFFFF"
                    stroke={colorStyles.lineStroke}
                    strokeWidth={isHovered ? 3 : 2.5}
                    className="transition-all duration-150"
                  />

                  {/* Value label above node */}
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    className={`font-mono text-[9px] font-bold ${
                      isHovered ? "fill-black" : "fill-neutral-600"
                    }`}
                  >
                    {Math.round(p.item.value).toLocaleString("id-ID")}
                  </text>

                  {/* X-axis Rank Marker */}
                  <text
                    x={p.x}
                    y={height - paddingBottom + 16}
                    textAnchor="middle"
                    className={`font-mono text-[9px] font-bold ${
                      isHovered ? "fill-neutral-900" : "fill-neutral-500"
                    }`}
                  >
                    #{p.idx + 1}
                  </text>

                  {/* X-axis abbreviated label */}
                  <text
                    x={p.x}
                    y={height - paddingBottom + 28}
                    textAnchor="middle"
                    className="font-sans text-[8px] fill-neutral-500 max-w-[50px] truncate"
                  >
                    {p.item.name.length > 9 ? `${p.item.name.substring(0, 8)}..` : p.item.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend / Detail Card List for Line Chart */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {items.map((it, idx) => (
            <div 
              key={it.id} 
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-2 rounded border text-xs transition-all cursor-pointer ${
                hoveredIdx === idx 
                  ? "border-neutral-800 bg-neutral-100 shadow-sm" 
                  : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-neutral-400">#{idx + 1}</span>
                <span className="font-mono text-[9px] font-bold text-neutral-500">{it.kavling || it.code}</span>
              </div>
              <div className="font-bold text-neutral-800 truncate mt-0.5" title={it.name}>
                {it.name}
              </div>
              <div className="mt-1 font-mono font-bold text-neutral-900 text-xs">
                {it.value.toLocaleString("id-ID")} <span className="font-normal text-[10px] text-neutral-500">{it.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 3. TAMPILAN GRAFIK LINGKARAN (PIE / DONUT CHART SVG)
  // -------------------------------------------------------------------------
  if (chartType === "pie") {
    const totalVal = items.reduce((acc, it) => acc + (it.value || 0), 0);
    const size = 260;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 105;
    const innerR = 62;

    let cumulative = 0;
    const slices = items.map((item, idx) => {
      const sliceVal = item.value || 0;
      const percent = totalVal > 0 ? sliceVal / totalVal : 0;
      const startAngle = cumulative;
      const endAngle = cumulative + percent;
      cumulative += percent;

      // Calculate path
      const [startX, startY] = getCoordinatesForPercent(startAngle, outerR, cx, cy);
      const [endX, endY] = getCoordinatesForPercent(endAngle, outerR, cx, cy);
      const [innerStartX, innerStartY] = getCoordinatesForPercent(startAngle, innerR, cx, cy);
      const [innerEndX, innerEndY] = getCoordinatesForPercent(endAngle, innerR, cx, cy);

      const largeArcFlag = percent > 0.5 ? 1 : 0;

      const pathData = percent >= 0.999
        ? `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx - 0.001} ${cy - outerR} L ${cx - 0.001} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR} Z`
        : [
            `M ${startX.toFixed(2)} ${startY.toFixed(2)}`,
            `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`,
            `L ${innerEndX.toFixed(2)} ${innerEndY.toFixed(2)}`,
            `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerStartX.toFixed(2)} ${innerStartY.toFixed(2)}`,
            `Z`
          ].join(" ");

      return {
        ...item,
        percent,
        pathData,
        color: PALETTE[idx % PALETTE.length],
        idx
      };
    });

    const activeHoverItem = hoveredIdx !== null ? items[hoveredIdx] : null;

    return (
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-neutral-50/40 p-4 rounded border border-neutral-200">
        
        {/* SVG Donut */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="select-none drop-shadow-sm">
            {slices.map((slice) => {
              const isHov = hoveredIdx === slice.idx;
              return (
                <path
                  key={slice.id}
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-200 cursor-pointer"
                  opacity={hoveredIdx === null || isHov ? 1 : 0.45}
                  transform={isHov ? `scale(1.03) translate(${(cx - cx * 1.03) / 1.03}, ${(cy - cy * 1.03) / 1.03})` : ""}
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}

            {/* Donut Center Label */}
            <circle cx={cx} cy={cy} r={innerR - 4} fill="#FFFFFF" />
            <text x={cx} y={cy - 12} textAnchor="middle" className="font-sans text-[10px] font-bold fill-neutral-400 uppercase tracking-wide">
              {activeHoverItem ? `#${hoveredIdx! + 1}` : "TOTAL"}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" className="font-mono text-sm font-black fill-neutral-900">
              {activeHoverItem 
                ? Math.round(activeHoverItem.value).toLocaleString("id-ID")
                : Math.round(totalVal).toLocaleString("id-ID")
              }
            </text>
            <text x={cx} y={cy + 22} textAnchor="middle" className="font-sans text-[9px] font-semibold fill-neutral-500">
              {unitLabel}
            </text>
          </svg>
        </div>

        {/* Donut Legend List */}
        <div className="w-full flex-1 max-h-72 overflow-y-auto pr-1">
          <div className="text-xs font-bold text-neutral-600 mb-2 flex justify-between items-center border-b pb-1">
            <span>Porsi Stok Terpilih ({items.length} Item)</span>
            <span className="text-[10px] font-mono text-neutral-400">Total: {Math.round(totalVal).toLocaleString("id-ID")} {unitLabel}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {slices.map((slice) => {
              const isHov = hoveredIdx === slice.idx;
              const pctFormatted = (slice.percent * 100).toFixed(1);

              return (
                <div 
                  key={slice.id}
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`p-2 rounded border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isHov 
                      ? "border-neutral-800 bg-white shadow-sm ring-1 ring-neutral-400" 
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                      style={{ backgroundColor: slice.color }} 
                    />
                    <div className="truncate">
                      <div className="font-bold text-neutral-900 truncate" title={slice.name}>
                        {slice.name}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {slice.code} {slice.kavling ? `• ${slice.kavling}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="font-bold text-neutral-900 block text-xs">
                      {slice.value.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      {pctFormatted}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  return null;
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================
export const WarehouseVisualizations: React.FC<WarehouseVisualizationsProps> = ({
  feedAddReport,
  karungReport,
  labelReport,
  onNavigate
}) => {
  const [activeVisTab, setActiveVisTab] = useState<"all" | "feed-add" | "karung" | "label">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [topCount, setTopCount] = useState<number>(8);
  
  // New States: Chart Type & Sort Order
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // =========================================================================
  // 1. DATA COMPUTATION: FEED ADD (Kg & Colly)
  // =========================================================================
  const feedAddItems = feedAddReport.items || [];
  
  const feedAddMetrics = useMemo(() => {
    let totalAwalKg = 0;
    let totalAwalColly = 0;
    let totalMasukKg = 0;
    let totalMasukColly = 0;
    let totalKeluarKg = 0;
    let totalKeluarColly = 0;
    let lowStockCount = 0;

    const kavlingMap: Record<string, { tonase: number; colly: number; count: number }> = {};

    feedAddItems.forEach(it => {
      const awalKg = it.stockAwal || 0;
      const awalColly = it.stockAwalColly || 0;
      const masukKg = it.masuk || 0;
      const masukColly = it.masukColly || 0;
      const keluarKg = it.keluar || 0;
      const keluarColly = it.keluarColly || 0;
      const akhirKg = awalKg + masukKg - keluarKg;

      totalAwalKg += awalKg;
      totalAwalColly += awalColly;
      totalMasukKg += masukKg;
      totalMasukColly += masukColly;
      totalKeluarKg += keluarKg;
      totalKeluarColly += keluarColly;

      if (akhirKg < 150) {
        lowStockCount++;
      }

      const kav = it.gudangKav?.trim() || "Unassigned";
      if (!kavlingMap[kav]) {
        kavlingMap[kav] = { tonase: 0, colly: 0, count: 0 };
      }
      kavlingMap[kav].tonase += akhirKg;
      kavlingMap[kav].colly += (awalColly + masukColly - keluarColly);
      kavlingMap[kav].count += 1;
    });

    const totalAkhirKg = totalAwalKg + totalMasukKg - totalKeluarKg;
    const totalAkhirColly = totalAwalColly + totalMasukColly - totalKeluarColly;

    return {
      totalItems: feedAddItems.length,
      totalAwalKg,
      totalAwalColly,
      totalMasukKg,
      totalMasukColly,
      totalKeluarKg,
      totalKeluarColly,
      totalAkhirKg,
      totalAkhirColly,
      lowStockCount,
      kavlingMap
    };
  }, [feedAddItems]);

  const sortedFeedAdd = useMemo(() => {
    return [...feedAddItems]
      .map(it => ({
        ...it,
        stockAkhir: (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0),
        collyAkhir: (it.stockAwalColly || 0) + (it.masukColly || 0) - (it.keluarColly || 0)
      }))
      .filter(it => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          it.namaMaterial.toLowerCase().includes(q) || 
          it.kode.toLowerCase().includes(q) || 
          (it.gudangKav || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortOrder === "asc") {
          return a.stockAkhir - b.stockAkhir; // Stok Tersedikit
        }
        return b.stockAkhir - a.stockAkhir; // Stok Terbesar
      });
  }, [feedAddItems, searchQuery, sortOrder]);

  const totalCapacityKg = Math.max(feedAddMetrics.totalAkhirKg, 1142857);

  const feedAddChartItems: GenericChartItem[] = useMemo(() => {
    return sortedFeedAdd.slice(0, topCount).map(it => {
      const porsi = totalCapacityKg > 0 ? (it.stockAkhir / totalCapacityKg) * 100 : 0;
      return {
        id: it.id,
        name: it.namaMaterial,
        code: it.kode,
        kavling: it.gudangKav || "2001",
        supplier: it.suplier || "ANNONA PTE LTD",
        value: it.stockAkhir,
        unit: "Kg",
        portionPercent: porsi,
        secondaryInfo: `${(it.collyAkhir || 0).toLocaleString("id-ID")} Colly`,
        initialStock: it.stockAwal || 0,
        initialSecondary: `${(it.stockAwalColly || 0).toLocaleString("id-ID")} colly`,
        masuk: it.masuk || 0,
        keluar: it.keluar || 0,
        batch: it.batch || "260807",
        umurHari: getBatchAgeDays(it.batch, it.tglMasuk),
        kemasanDesc: it.packagingDesc || (it.beratPerColly ? `@ ${it.beratPerColly} Kg` : "@ 1000 Kg")
      };
    });
  }, [sortedFeedAdd, topCount, totalCapacityKg]);

  // =========================================================================
  // 2. DATA COMPUTATION: KARUNG (Lembar & Bal)
  // =========================================================================
  const karungItems = karungReport.items || [];

  const karungMetrics = useMemo(() => {
    let totalAwalLembar = 0;
    let totalMasukLembar = 0;
    let totalKeluarLembar = 0;
    let totalAfkirLembar = 0;

    let freshLotsCount = 0; // < 30 days
    let mediumLotsCount = 0; // 30 - 60 days
    let oldLotsCount = 0; // > 60 days
    let totalLots = 0;

    karungItems.forEach(it => {
      totalAwalLembar += (it.stockAwal || 0);
      totalMasukLembar += (it.masuk || 0);
      totalKeluarLembar += (it.keluar || 0);
      totalAfkirLembar += (it.afkir || 0);

      (it.fifoLots || []).forEach(lot => {
        totalLots++;
        const age = lot.umurHari || 0;
        if (age <= 30) freshLotsCount++;
        else if (age <= 60) mediumLotsCount++;
        else oldLotsCount++;
      });
    });

    const totalAkhirLembar = totalAwalLembar + totalMasukLembar - totalKeluarLembar - totalAfkirLembar;
    const totalBalEst = Math.round(totalAkhirLembar / 500);

    return {
      totalItems: karungItems.length,
      totalAwalLembar,
      totalMasukLembar,
      totalKeluarLembar,
      totalAfkirLembar,
      totalAkhirLembar,
      totalBalEst,
      freshLotsCount,
      mediumLotsCount,
      oldLotsCount,
      totalLots
    };
  }, [karungItems]);

  const sortedKarung = useMemo(() => {
    return [...karungItems]
      .map(it => {
        const akhir = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.afkir || 0);
        const conv = it.lembarPerBal || 500;
        const bal = Math.round((akhir / conv) * 10) / 10;
        return {
          ...it,
          stockAkhir: akhir,
          balAkhir: bal
        };
      })
      .filter(it => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          it.namaKarung.toLowerCase().includes(q) ||
          it.kode.toLowerCase().includes(q) ||
          (it.spesifikasi || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortOrder === "asc") {
          return a.stockAkhir - b.stockAkhir; // Stok Tersedikit
        }
        return b.stockAkhir - a.stockAkhir; // Stok Terbesar
      });
  }, [karungItems, searchQuery, sortOrder]);

  const totalCapacityKarung = Math.max(karungMetrics.totalAkhirLembar, 500000);

  const karungChartItems: GenericChartItem[] = useMemo(() => {
    return sortedKarung.slice(0, topCount).map(it => {
      const porsi = totalCapacityKarung > 0 ? (it.stockAkhir / totalCapacityKarung) * 100 : 0;
      const conv = it.lembarPerBal || 500;
      const balAwal = Math.round(((it.stockAwal || 0) / conv) * 10) / 10;
      return {
        id: it.id,
        name: it.namaKarung,
        code: it.kode,
        kavling: it.gudangKav || "3001",
        supplier: it.suplier || "PT. KENCANA MAJU LESTARI",
        value: it.stockAkhir,
        unit: "Lbr",
        portionPercent: porsi,
        secondaryInfo: `${it.balAkhir} Bal`,
        initialStock: it.stockAwal || 0,
        initialSecondary: `${balAwal} bal`,
        masuk: it.masuk || 0,
        keluar: (it.keluar || 0) + (it.afkir || 0),
        batch: it.batch || "260807",
        umurHari: it.umurPemakaianHari ?? getBatchAgeDays(it.batch, it.tglPemakaianTerakhir),
        kemasanDesc: `@ ${conv} Lbr/Bal`
      };
    });
  }, [sortedKarung, topCount, totalCapacityKarung]);

  // =========================================================================
  // 3. DATA COMPUTATION: LABEL (Lembar, Roll, Cone)
  // =========================================================================
  const labelItems = labelReport.items || [];

  const labelMetrics = useMemo(() => {
    let totalLembarPcs = 0;
    let totalConeBenang = 0;
    let totalRollRibbon = 0;
    let totalMasuk = 0;
    let totalKeluar = 0;

    labelItems.forEach(it => {
      const akhir = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.rusak || 0);
      totalMasuk += (it.masuk || 0);
      totalKeluar += (it.keluar || 0);

      if (it.satuan === "Cone") {
        totalConeBenang += akhir;
      } else if (it.satuan === "Roll") {
        totalRollRibbon += akhir;
      } else {
        totalLembarPcs += akhir;
      }
    });

    return {
      totalItems: labelItems.length,
      totalLembarPcs,
      totalConeBenang,
      totalRollRibbon,
      totalMasuk,
      totalKeluar
    };
  }, [labelItems]);

  const sortedLabel = useMemo(() => {
    return [...labelItems]
      .map(it => {
        const akhir = (it.stockAwal || 0) + (it.masuk || 0) - (it.keluar || 0) - (it.rusak || 0);
        return {
          ...it,
          stockAkhir: akhir
        };
      })
      .filter(it => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          it.namaLabel.toLowerCase().includes(q) ||
          it.kode.toLowerCase().includes(q) ||
          (it.warna || "").toLowerCase().includes(q) ||
          (it.gudangKav || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortOrder === "asc") {
          return a.stockAkhir - b.stockAkhir; // Stok Tersedikit
        }
        return b.stockAkhir - a.stockAkhir; // Stok Terbesar
      });
  }, [labelItems, searchQuery, sortOrder]);

  const totalCapacityLabel = Math.max(labelMetrics.totalLembarPcs + labelMetrics.totalConeBenang + labelMetrics.totalRollRibbon, 100000);

  const labelChartItems: GenericChartItem[] = useMemo(() => {
    return sortedLabel.slice(0, topCount).map(it => {
      const porsi = totalCapacityLabel > 0 ? (it.stockAkhir / totalCapacityLabel) * 100 : 0;
      return {
        id: it.id,
        name: it.namaLabel,
        code: it.kode,
        kavling: it.gudangKav || "Rak 01",
        supplier: it.suplier || "PERCETAKAN LABEL",
        value: it.stockAkhir,
        unit: it.satuan || "Pcs",
        portionPercent: porsi,
        secondaryInfo: it.satuan || "Pcs",
        initialStock: it.stockAwal || 0,
        initialSecondary: `${it.stockAwal || 0} ${it.satuan}`,
        masuk: it.masuk || 0,
        keluar: (it.keluar || 0) + (it.rusak || 0),
        batch: it.batch || it.kode,
        umurHari: getBatchAgeDays(it.batch, it.tglMasuk),
        kemasanDesc: it.warna ? `Warna: ${it.warna}` : `@ 1 ${it.satuan}`
      };
    });
  }, [sortedLabel, topCount, totalCapacityLabel]);

  // =========================================================================
  // RENDER SECTIONS
  // =========================================================================

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      
      {/* HEADER SECTION WITH NAVIGATION PILLS */}
      <div className="bg-white border-2 border-[#1A1A1A] p-5 rounded shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#E65100] text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4 text-[#E65100]" /> Visualisasi Multi-Gudang Terpadu
          </div>
          <h3 className="font-serif italic text-xl md:text-2xl font-black text-neutral-800 leading-tight">
            Visualisasi Stok Feed Add, Stok Karung & Stok Label
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Analisis grafis komparatif stok tonase, lembar kemasan, aksesori packaging, serta pergerakan mutasi harian.
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex flex-wrap items-center bg-neutral-100 p-1 border border-neutral-300 rounded self-start md:self-auto gap-1">
          <button
            onClick={() => setActiveVisTab("all")}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeVisTab === "all"
                ? "bg-[#1A1A1A] text-white shadow-sm"
                : "text-neutral-600 hover:text-black hover:bg-neutral-200/60"
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-amber-400" /> Ringkasan 3 Kategori
          </button>
          
          <button
            onClick={() => setActiveVisTab("feed-add")}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeVisTab === "feed-add"
                ? "bg-sky-700 text-white shadow-sm"
                : "text-neutral-600 hover:text-sky-900 hover:bg-sky-100"
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Stok Feed Add (Kg)
          </button>

          <button
            onClick={() => setActiveVisTab("karung")}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeVisTab === "karung"
                ? "bg-amber-700 text-white shadow-sm"
                : "text-neutral-600 hover:text-amber-900 hover:bg-amber-100"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Stok Karung (Lembar)
          </button>

          <button
            onClick={() => setActiveVisTab("label")}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeVisTab === "label"
                ? "bg-blue-700 text-white shadow-sm"
                : "text-neutral-600 hover:text-blue-900 hover:bg-blue-100"
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Stok Label (Lembar/Pcs)
          </button>
        </div>
      </div>

      {/* COMPREHENSIVE FILTER & CHART CONTROLS TOOLBAR */}
      <div className="bg-white border-2 border-neutral-300 p-4 rounded shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 text-xs">
        
        {/* Search Input */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Cari material / karung / label..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-300 rounded pl-9 pr-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-800 focus:bg-white"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* CONTROLS CLUSTER: CHART TYPE, SORT ORDER, TOP COUNT */}
        <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end">
          
          {/* PILIHAN BENTUK GRAFIK (BATANG / GARIS / LINGKARAN) */}
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded border border-neutral-300">
            <span className="text-[10px] uppercase font-bold text-neutral-500 px-1.5 hidden sm:inline">
              Grafik:
            </span>
            <button
              onClick={() => setChartType("bar")}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                chartType === "bar"
                  ? "bg-[#1A1A1A] text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-200"
              }`}
              title="Tampilkan grafik Batang (Bar Chart)"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Batang
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                chartType === "line"
                  ? "bg-[#1A1A1A] text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-200"
              }`}
              title="Tampilkan grafik Garis (Line Chart)"
            >
              <LineChart className="w-3.5 h-3.5" /> Garis
            </button>
            <button
              onClick={() => setChartType("pie")}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                chartType === "pie"
                  ? "bg-[#1A1A1A] text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-200"
              }`}
              title="Tampilkan grafik Lingkaran (Pie / Donut Chart)"
            >
              <PieChart className="w-3.5 h-3.5" /> Lingkaran
            </button>
          </div>

          {/* PILIHAN URUTAN STOK (TERBESAR / TERSEDIKIT) */}
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded border border-neutral-300">
            <span className="text-[10px] uppercase font-bold text-neutral-500 px-1.5 hidden sm:inline">
              Urutan:
            </span>
            <button
              onClick={() => setSortOrder("desc")}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                sortOrder === "desc"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-200"
              }`}
              title="Urutkan dari Stok Terbesar ke Terkecil"
            >
              <ArrowDownWideNarrow className="w-3.5 h-3.5" /> Stok Terbesar
            </button>
            <button
              onClick={() => setSortOrder("asc")}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                sortOrder === "asc"
                  ? "bg-rose-700 text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-200"
              }`}
              title="Urutkan dari Stok Tersedikit (Prioritas Cek Stok / Reorder)"
            >
              <ArrowUpNarrowWide className="w-3.5 h-3.5" /> Stok Tersedikit
            </button>
          </div>

          {/* JUMLAH DATA TOP ITEM */}
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded border border-neutral-300">
            <span className="text-[10px] uppercase font-bold text-neutral-500 px-1 hidden md:inline">
              Item:
            </span>
            {[5, 8, 12, 20].map((num) => (
              <button
                key={num}
                onClick={() => setTopCount(num)}
                className={`px-2 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer ${
                  topCount === num 
                    ? "bg-[#1A1A1A] text-white" 
                    : "text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {num}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ACTIVE FILTER STATUS BANNER */}
      <div className={`px-4 py-2 rounded text-xs border flex items-center justify-between ${
        sortOrder === "asc" 
          ? "bg-rose-50 border-rose-200 text-rose-900" 
          : "bg-sky-50 border-sky-200 text-sky-900"
      }`}>
        <div className="flex items-center gap-2">
          {sortOrder === "asc" ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
          )}
          <span className="font-medium">
            Menampilkan <strong>Top {topCount}</strong> barang berdasarkan <strong>{sortOrder === "desc" ? "Stok Terbesar (Volume Tertinggi)" : "Stok Tersedikit (Perlu Re-stock / Prioritas Pemantauan)"}</strong> dengan format grafik <strong>{chartType === "bar" ? "Batang" : chartType === "line" ? "Garis" : "Lingkaran"}</strong>.
          </span>
        </div>

        <span className="text-[11px] font-mono opacity-75 hidden md:inline">
          {chartType.toUpperCase()} • {sortOrder.toUpperCase()}
        </span>
      </div>

      {/* ===================================================================== */}
      {/* 1. OVERVIEW VIEW: FEED ADD (Kg & Colly) */}
      {/* ===================================================================== */}
      {(activeVisTab === "all" || activeVisTab === "feed-add") && (
        <div className="bg-white border-2 border-neutral-800 p-5 rounded shadow-sm flex flex-col gap-4">
          
          {/* Section Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-600"></span>
              <h4 className="font-serif italic font-bold text-base md:text-lg text-neutral-900 flex items-center gap-2">
                1. Visualisasi Stok Feed Add (Bahan Pembantu Pakan)
              </h4>
              <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded border border-sky-200">
                Satuan: Kg & Colly
              </span>
            </div>

            <button 
              onClick={() => onNavigate("stock", "table")}
              className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 hover:underline cursor-pointer"
            >
              Lihat Detail Tabel Stok Feed Add <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-sky-50/60 border border-sky-200 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-sky-800 block">Total Stok Akhir</span>
              <div className="text-lg font-mono font-black text-sky-950">
                {feedAddMetrics.totalAkhirKg.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-600">Kg</span>
              </div>
              <div className="text-[10px] text-sky-700 font-medium mt-0.5">
                📦 {feedAddMetrics.totalAkhirColly.toLocaleString("id-ID")} Colly
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-emerald-800 block">Barang Masuk (Hari Ini)</span>
              <div className="text-lg font-mono font-black text-emerald-950">
                +{feedAddMetrics.totalMasukKg.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-600">Kg</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                📥 +{feedAddMetrics.totalMasukColly.toLocaleString("id-ID")} Colly
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-rose-800 block">Barang Keluar (Hari Ini)</span>
              <div className="text-lg font-mono font-black text-rose-950">
                -{feedAddMetrics.totalKeluarKg.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-600">Kg</span>
              </div>
              <div className="text-[10px] text-rose-700 font-medium mt-0.5">
                📤 -{feedAddMetrics.totalKeluarColly.toLocaleString("id-ID")} Colly
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-300 p-3 rounded flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-neutral-500 block">Jumlah Material Aktif</span>
                <div className="text-lg font-serif font-black text-neutral-800">
                  {feedAddMetrics.totalItems} <span className="text-[10px] font-sans font-normal text-neutral-500">Item</span>
                </div>
              </div>
              {feedAddMetrics.lowStockCount > 0 && (
                <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> {feedAddMetrics.lowStockCount} Item &lt; 150 Kg
                </div>
              )}
            </div>
          </div>

          {/* Chart Header Info */}
          <div className="mt-2">
            {chartType !== "bar" && (
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-neutral-700">
                  Grafik Stok Material ({sortOrder === "desc" ? "Terbesar" : "Tersedikit"}) Top {Math.min(topCount, sortedFeedAdd.length)} dari {feedAddItems.length} Material
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Model: {chartType === "line" ? "Garis" : "Lingkaran"}
                </span>
              </div>
            )}

            {/* Universal Chart Viewer for Feed Add */}
            <UniversalChartViewer
              items={feedAddChartItems}
              chartType={chartType}
              sortOrder={sortOrder}
              themeColor="sky"
              unitLabel="Kg"
              chartTitle={`Grafik Tonase Seluruh Material (${feedAddItems.length} SKU)`}
              chartSubtitle="Panjang grafik batang merepresentasikan proporsi stok akhir (Kg) terhadap kapasitas total gudang"
              totalSkuCount={feedAddItems.length}
              legendLabel={{
                stock: "Stok Akhir (Kg)",
                masuk: "Masuk",
                keluar: "Keluar"
              }}
            />
          </div>

          {/* Kavling Allocation Breakdown */}
          {activeVisTab === "feed-add" && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <h5 className="text-xs font-bold text-neutral-800 mb-2 flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-sky-700" /> Sebaran Stok per Kavling Feed Add
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {Object.entries(feedAddMetrics.kavlingMap).map(([kav, statsValue]) => {
                  const stats = statsValue as { tonase: number; colly: number; count: number };
                  return (
                    <div key={kav} className="border border-neutral-200 p-2 rounded bg-neutral-50 text-center">
                      <span className="text-[9px] font-bold text-sky-800 uppercase block">{kav}</span>
                      <strong className="text-xs font-mono text-neutral-900 block mt-0.5">
                        {Math.round(stats.tonase).toLocaleString("id-ID")} Kg
                      </strong>
                      <span className="text-[9px] text-neutral-500 font-sans">{stats.count} Jenis Material</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. OVERVIEW VIEW: KARUNG (Lembar & Bal) */}
      {/* ===================================================================== */}
      {(activeVisTab === "all" || activeVisTab === "karung") && (
        <div className="bg-white border-2 border-neutral-800 p-5 rounded shadow-sm flex flex-col gap-4">
          
          {/* Section Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-600"></span>
              <h4 className="font-serif italic font-bold text-base md:text-lg text-neutral-900 flex items-center gap-2">
                2. Visualisasi Stok Karung (Sacks & Kemasan Pakan)
              </h4>
              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300">
                Satuan: Lembar & Bal
              </span>
            </div>

            <button 
              onClick={() => onNavigate("stock-karung")}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer"
            >
              Buka Modul Stock Karung <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-amber-50/60 border border-amber-200 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-amber-800 block">Total Stok Akhir</span>
              <div className="text-lg font-mono font-black text-amber-950">
                {karungMetrics.totalAkhirLembar.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-600">Lbr</span>
              </div>
              <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                📦 ± {karungMetrics.totalBalEst.toLocaleString("id-ID")} Bal
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-emerald-800 block">Karung Masuk</span>
              <div className="text-lg font-mono font-black text-emerald-950">
                +{karungMetrics.totalMasukLembar.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-600">Lbr</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                Pembelian & Retur
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-rose-800 block">Karung Keluar</span>
              <div className="text-lg font-mono font-black text-rose-950">
                -{karungMetrics.totalKeluarLembar.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-600">Lbr</span>
              </div>
              <div className="text-[10px] text-rose-700 font-medium mt-0.5">
                Bon Produksi & Overzak
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-300 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-neutral-500 block">Stok Afkir / Reject</span>
              <div className="text-lg font-mono font-black text-neutral-800">
                {karungMetrics.totalAfkirLembar.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-500">Lbr</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-medium mt-0.5">
                {karungMetrics.totalItems} Varian Karung
              </div>
            </div>
          </div>

          {/* Chart Header Info */}
          <div className="mt-2">
            {chartType !== "bar" && (
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-neutral-700">
                  Grafik Stok Karung ({sortOrder === "desc" ? "Terbanyak" : "Tersedikit"}) Top {Math.min(topCount, sortedKarung.length)} dari {karungItems.length} Varian
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  1 Bal = 500 / 1.000 Lbr • {chartType === "line" ? "Garis" : "Lingkaran"}
                </span>
              </div>
            )}

            {/* Universal Chart Viewer for Karung */}
            <UniversalChartViewer
              items={karungChartItems}
              chartType={chartType}
              sortOrder={sortOrder}
              themeColor="amber"
              unitLabel="Lbr"
              chartTitle={`Grafik Total Stok Seluruh Karung (${karungItems.length} SKU)`}
              chartSubtitle="Panjang grafik batang merepresentasikan proporsi stok akhir (Lembar) terhadap kapasitas total gudang kemasan"
              totalSkuCount={karungItems.length}
              legendLabel={{
                stock: "Stok Akhir (Lbr)",
                masuk: "Masuk",
                keluar: "Keluar / Afkir"
              }}
            />
          </div>

          {/* FIFO Aging Distribution for Karung */}
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" /> Analisis Umur FIFO Karung (Aging Lots)
              </span>
              <span className="text-[10px] text-neutral-500">Total {karungMetrics.totalLots} Lot Tercatat</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-emerald-50/50 border border-emerald-200 p-2.5 rounded flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-mono font-bold text-emerald-800">
                  {karungMetrics.freshLotsCount}
                </div>
                <div>
                  <div className="font-bold text-emerald-900">&le; 30 Hari (Fresh)</div>
                  <div className="text-[10px] text-neutral-500">Lot baru masuk siap pakai</div>
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-200 p-2.5 rounded flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-mono font-bold text-amber-800">
                  {karungMetrics.mediumLotsCount}
                </div>
                <div>
                  <div className="font-bold text-amber-900">31 - 60 Hari</div>
                  <div className="text-[10px] text-neutral-500">Lot umur sedang di gudang</div>
                </div>
              </div>

              <div className="bg-rose-50/50 border border-rose-200 p-2.5 rounded flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center font-mono font-bold text-rose-800">
                  {karungMetrics.oldLotsCount}
                </div>
                <div>
                  <div className="font-bold text-rose-900">&gt; 60 Hari (Prioritas FIFO)</div>
                  <div className="text-[10px] text-neutral-500">Harus segera dikeluarkan</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. OVERVIEW VIEW: LABEL (Lembar, Pcs, Cone, Roll) */}
      {/* ===================================================================== */}
      {(activeVisTab === "all" || activeVisTab === "label") && (
        <div className="bg-white border-2 border-neutral-800 p-5 rounded shadow-sm flex flex-col gap-4">
          
          {/* Section Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <h4 className="font-serif italic font-bold text-base md:text-lg text-neutral-900 flex items-center gap-2">
                3. Visualisasi Stok Label (Label Pakan & Aksesoris Packaging)
              </h4>
              <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded border border-blue-300">
                Satuan: Lembar, Cone & Roll
              </span>
            </div>

            <button 
              onClick={() => onNavigate("stock-label")}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline cursor-pointer"
            >
              Buka Modul Stock Label <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50/60 border border-blue-200 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-blue-800 block">Stok Label Pakan</span>
              <div className="text-lg font-mono font-black text-blue-950">
                {labelMetrics.totalLembarPcs.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-600">Lbr</span>
              </div>
              <div className="text-[10px] text-blue-700 font-medium mt-0.5">
                Art paper / tag gantung
              </div>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-200 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-indigo-800 block">Benang Jahit Karung</span>
              <div className="text-lg font-mono font-black text-indigo-950">
                {labelMetrics.totalConeBenang.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-600">Cone</span>
              </div>
              <div className="text-[10px] text-indigo-700 font-medium mt-0.5">
                Aksesoris line jahit
              </div>
            </div>

            <div className="bg-teal-50/60 border border-teal-200 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-teal-800 block">Ribbon / Barcode</span>
              <div className="text-lg font-mono font-black text-teal-950">
                {labelMetrics.totalRollRibbon.toLocaleString("id-ID")} <span className="text-[10px] font-sans font-normal text-neutral-600">Roll</span>
              </div>
              <div className="text-[10px] text-teal-700 font-medium mt-0.5">
                Thermal barcode printer
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-300 p-3 rounded">
              <span className="text-[9px] uppercase font-bold text-neutral-500 block">Total Item Label</span>
              <div className="text-lg font-mono font-black text-neutral-800">
                {labelMetrics.totalItems} <span className="text-[10px] font-sans font-normal text-neutral-500">Varian</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-medium mt-0.5">
                Masuk: +{labelMetrics.totalMasuk} | Keluar: -{labelMetrics.totalKeluar}
              </div>
            </div>
          </div>

          {/* Chart Header Info */}
          <div className="mt-2">
            {chartType !== "bar" && (
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-neutral-700">
                  Grafik Stok Label ({sortOrder === "desc" ? "Terbesar" : "Tersedikit"}) Top {Math.min(topCount, sortedLabel.length)} dari {labelItems.length} Item
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Model: {chartType === "line" ? "Garis" : "Lingkaran"}
                </span>
              </div>
            )}

            {/* Universal Chart Viewer for Label */}
            <UniversalChartViewer
              items={labelChartItems}
              chartType={chartType}
              sortOrder={sortOrder}
              themeColor="blue"
              unitLabel="Item"
              chartTitle={`Grafik Total Stok Seluruh Label & Aksesoris (${labelItems.length} SKU)`}
              chartSubtitle="Panjang grafik batang merepresentasikan proporsi stok akhir terhadap total persediaan label"
              totalSkuCount={labelItems.length}
              legendLabel={{
                stock: "Stok Akhir",
                masuk: "Masuk",
                keluar: "Keluar"
              }}
            />
          </div>

        </div>
      )}

    </div>
  );
};

