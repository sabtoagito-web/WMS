import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Check, 
  RotateCcw, 
  Upload, 
  Image as ImageIcon, 
  RotateCw, 
  Sparkles, 
  Sliders, 
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title: string;
  defaultName: string;
}

export function SignatureModal({ isOpen, onClose, onSave, title, defaultName }: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "draw" | "type">("upload");
  const [typedName, setTypedName] = useState(defaultName);
  const [fontStyle, setFontStyle] = useState<string>("font-cursive-1");
  
  // Draw tab state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Upload tab state
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [removeBackground, setRemoveBackground] = useState<boolean>(true);
  const [boostContrast, setBoostContrast] = useState<boolean>(true);
  const [threshold, setThreshold] = useState<number>(200); // For white removal
  const [rotation, setRotation] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize and reset
  useEffect(() => {
    if (isOpen) {
      setTypedName(defaultName);
      if (activeTab === "draw") {
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
    }
  }, [isOpen, activeTab, defaultName]);

  // Handle uploaded image processing onto the preview canvas
  useEffect(() => {
    if (activeTab !== "upload" || !uploadedImageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = uploadPreviewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // Target canvas size for clean signature
      const maxWidth = 500;
      const maxHeight = 250;
      let w = img.width;
      let h = img.height;

      // Scale to fit max bounding box
      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      // If rotated 90 or 270, swap dimensions
      const isSwapped = rotation % 180 !== 0;
      canvas.width = isSwapped ? h : w;
      canvas.height = isSwapped ? w : h;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      // Pixel processing for smart background removal & ink contrast boost
      if (removeBackground || boostContrast) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) continue;

            // Greyscale luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            if (removeBackground) {
              // If pixel is brighter than threshold (white paper / light gray / yellow paper)
              if (luminance >= threshold) {
                data[i + 3] = 0; // completely transparent
                continue;
              } else if (luminance > threshold - 40) {
                // Soft gradient alpha falloff for smooth anti-aliased edge
                const alphaFactor = (threshold - luminance) / 40;
                data[i + 3] = Math.round(a * alphaFactor);
              }
            }

            if (boostContrast && data[i + 3] > 0) {
              // Deepen ink to rich dark ink (#111111) while preserving stroke thickness
              const darkenFactor = Math.max(0, (luminance - 30) / 180);
              data[i] = Math.round(r * darkenFactor * 0.3);
              data[i + 1] = Math.round(g * darkenFactor * 0.3);
              data[i + 2] = Math.round(b * darkenFactor * 0.3);
            }
          }

          ctx.putImageData(imgData, 0, 0);
        } catch {
          // If cross-origin or buffer error, ignore pixel manipulation
        }
      }
    };
    img.src = uploadedImageSrc;
  }, [uploadedImageSrc, removeBackground, boostContrast, threshold, rotation, activeTab]);

  if (!isOpen) return null;

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Harap pilih file gambar (PNG, JPG, JPEG, WEBP, atau SVG).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("Ukuran file terlalu besar (maksimal 8MB).");
      return;
    }

    setUploadedFileName(file.name);
    setRotation(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setUploadedImageSrc(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

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
    let clientX: number, clientY: number;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

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
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleApply = () => {
    if (activeTab === "upload") {
      if (!uploadedImageSrc) {
        alert("Silakan pilih atau unggah file gambar tanda tangan terlebih dahulu.");
        return;
      }
      const canvas = uploadPreviewCanvasRef.current;
      if (canvas) {
        onSave(canvas.toDataURL("image/png"));
      } else {
        onSave(uploadedImageSrc);
      }
    } else if (activeTab === "draw") {
      const canvas = canvasRef.current;
      if (canvas) {
        // Check if canvas is empty
        const ctx = canvas.getContext("2d");
        const buffer = new Uint32Array(ctx?.getImageData(0, 0, canvas.width, canvas.height).data.buffer || []);
        const hasContent = buffer.some((color) => color !== 0);

        if (!hasContent) {
          alert("Silakan gambar tanda tangan Anda terlebih dahulu, atau gunakan tab 'Upload File' / 'Ketik'.");
          return;
        }

        onSave(canvas.toDataURL("image/png"));
      }
    } else {
      // Type signature - render text to a hidden canvas to save as high-quality PNG
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 150;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Choose typeface
        let selectedFont = "Georgia";
        if (fontStyle === "font-cursive-1") selectedFont = "Brush Script MT, cursive, Georgia, serif";
        else if (fontStyle === "font-cursive-2") selectedFont = "Lucida Handwriting, cursive, Georgia, serif";
        else if (fontStyle === "font-cursive-3") selectedFont = "Sacramento, cursive, Georgia, serif";
        else if (fontStyle === "font-cursive-4") selectedFont = "Playball, cursive, Georgia, serif";

        ctx.fillStyle = "#111111";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `italic 42px ${selectedFont}`;
        ctx.fillText(typedName || "Tanda Tangan", canvas.width / 2, canvas.height / 2);
        
        // Add subtle stylish handwritten underline
        ctx.strokeStyle = "#1A1A1A";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(40, canvas.height - 35);
        ctx.bezierCurveTo(150, canvas.height - 20, 250, canvas.height - 40, canvas.width - 40, canvas.height - 30);
        ctx.stroke();

        onSave(canvas.toDataURL("image/png"));
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/75 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 font-sans">
      <div className="bg-[#FAF9F6] border-2 border-[#1A1A1A] w-full max-w-xl shadow-2xl flex flex-col rounded-lg overflow-hidden animate-fade-in max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#1A1A1A] flex justify-between items-center bg-white">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Fitur Tanda Tangan Digital Resmi
            </span>
            <h3 className="font-serif italic text-lg sm:text-xl font-bold text-[#1A1A1A] leading-snug">
              {title}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-neutral-100 rounded-md text-neutral-600 hover:text-black transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 border-b border-[#1A1A1A] bg-neutral-100 text-xs sm:text-sm font-semibold">
          <button 
            onClick={() => setActiveTab("upload")}
            className={`py-3 px-2 text-center border-r border-[#1A1A1A] transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "upload" 
                ? "bg-[#FAF9F6] text-[#1A1A1A] font-bold border-b-2 border-b-black" 
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70"
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Upload File</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("draw")}
            className={`py-3 px-2 text-center border-r border-[#1A1A1A] transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "draw" 
                ? "bg-[#FAF9F6] text-[#1A1A1A] font-bold border-b-2 border-b-black" 
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70"
            }`}
          >
            <span>🎨 Gambar Manual</span>
          </button>

          <button 
            onClick={() => setActiveTab("type")}
            className={`py-3 px-2 text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "type" 
                ? "bg-[#FAF9F6] text-[#1A1A1A] font-bold border-b-2 border-b-black" 
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70"
            }`}
          >
            <span>✍️ Ketik Otomatis</span>
          </button>
        </div>

        {/* Content Panel */}
        <div className="p-4 sm:p-5 flex-grow overflow-y-auto bg-white flex flex-col justify-center min-h-[300px]">
          {/* TAB 1: UPLOAD DARI FILE */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />

              {!uploadedImageSrc ? (
                /* Drag and drop upload target */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                    isDragging
                      ? "border-emerald-600 bg-emerald-50/50"
                      : "border-neutral-300 hover:border-[#1A1A1A] bg-[#FAF9F6] hover:bg-neutral-50"
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mb-3 shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="font-serif italic font-bold text-neutral-800 text-base mb-1">
                    Klik untuk Pilih File atau Seret Gambar ke Sini
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-sm mb-3">
                    Unggah foto scan tanda tangan, gambar stempel, atau file tanda tangan dari HP/Komputer (PNG, JPG, WEBP, SVG)
                  </p>
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1A1A1A] text-white hover:bg-neutral-800 rounded text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Pilih File Gambar
                  </button>
                  <span className="text-[10px] text-neutral-400 mt-2">Maksimal ukuran: 8 MB</span>
                </div>
              ) : (
                /* Uploaded Image Preview with Processing Controls */
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-neutral-100 p-2.5 rounded border border-neutral-300 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <ImageIcon className="w-4 h-4 text-neutral-600 shrink-0" />
                      <span className="font-mono font-medium truncate">{uploadedFileName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-neutral-200 border border-neutral-300 rounded text-neutral-700 cursor-pointer"
                      >
                        Ganti File
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedImageSrc(null);
                          setUploadedFileName("");
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        title="Hapus gambar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Processing Preview Canvas Box */}
                  <div className="relative border-2 border-neutral-300 rounded-lg bg-[repeating-conic-gradient(#f1f1f1_0_25%,#ffffff_0_50%)] [background-size:16px_16px] p-4 flex items-center justify-center min-h-[170px] overflow-hidden">
                    <canvas
                      ref={uploadPreviewCanvasRef}
                      className="max-h-[160px] max-w-full object-contain filter drop-shadow-xs"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                      <Eye className="w-3 h-3 text-emerald-400" /> Pratinjau Tanda Tangan
                    </div>
                  </div>

                  {/* Image Processing Adjustment Options */}
                  <div className="bg-[#FAF9F6] p-3 rounded-lg border border-neutral-300 space-y-2.5 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-neutral-500" /> Alat Optimasi Tanda Tangan
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Toggle: Remove White Paper Background */}
                      <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded border border-neutral-200 hover:border-neutral-400">
                        <input
                          type="checkbox"
                          checked={removeBackground}
                          onChange={(e) => setRemoveBackground(e.target.checked)}
                          className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="text-left">
                          <span className="font-bold text-neutral-800 block text-[11px]">Transparansi Kertas Putih</span>
                          <span className="text-[9px] text-neutral-500 block leading-tight">Hilangkan latar kertas otomatis</span>
                        </div>
                      </label>

                      {/* Toggle: Boost Ink Contrast */}
                      <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded border border-neutral-200 hover:border-neutral-400">
                        <input
                          type="checkbox"
                          checked={boostContrast}
                          onChange={(e) => setBoostContrast(e.target.checked)}
                          className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="text-left">
                          <span className="font-bold text-neutral-800 block text-[11px]">Pertajam Tinta Hitam</span>
                          <span className="text-[9px] text-neutral-500 block leading-tight">Buat garis tanda tangan lebih pekat</span>
                        </div>
                      </label>
                    </div>

                    {/* Threshold slider if removeBackground is active */}
                    {removeBackground && (
                      <div className="pt-1 border-t border-neutral-200">
                        <div className="flex justify-between text-[10px] text-neutral-600 mb-1">
                          <span>Sensitivitas Putih Kertas:</span>
                          <span className="font-mono font-bold">{threshold}</span>
                        </div>
                        <input
                          type="range"
                          min="140"
                          max="245"
                          value={threshold}
                          onChange={(e) => setThreshold(Number(e.target.value))}
                          className="w-full h-1.5 bg-neutral-300 rounded-lg appearance-none cursor-pointer accent-[#1A1A1A]"
                        />
                      </div>
                    )}

                    {/* Rotate button */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-700 rounded border border-neutral-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> Putar Gambar 90° ({rotation}°)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GAMBAR MANUAL */}
          {activeTab === "draw" && (
            <div className="flex flex-col items-center">
              <p className="text-xs text-neutral-500 mb-2 italic text-center">
                Gunakan mouse, pena stylus, atau layar sentuh untuk menggambar tanda tangan di dalam kotak
              </p>
              <canvas
                ref={canvasRef}
                width={460}
                height={190}
                className="border-2 border-dashed border-neutral-400 bg-[#FAF9F6] rounded-md cursor-crosshair w-full max-w-[460px] h-[190px] touch-none shadow-inner"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <button 
                type="button"
                onClick={clearCanvas}
                className="mt-3 px-4 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Bersihkan Papan Tulis
              </button>
            </div>
          )}

          {/* TAB 3: KETIK OTOMATIS */}
          {activeTab === "type" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Nama Tanda Tangan
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-neutral-800 bg-[#FAF9F6] text-sm font-medium rounded"
                  placeholder="Ketik nama lengkap..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Gaya Kaligrafi Tanda Tangan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "font-cursive-1", name: "Brush Elegant", preview: "Brush Script MT" },
                    { id: "font-cursive-2", name: "Classic Script", preview: "Lucida Handwriting" },
                    { id: "font-cursive-3", name: "Modern Editorial", preview: "Sacramento" },
                    { id: "font-cursive-4", name: "Formal Script", preview: "Playball" }
                  ].map((style) => (
                    <button
                      type="button"
                      key={style.id}
                      onClick={() => setFontStyle(style.id)}
                      className={`p-3 border text-left rounded transition-all cursor-pointer ${
                        fontStyle === style.id 
                          ? "border-[#1A1A1A] bg-[#F2F0ED] font-bold ring-1 ring-neutral-800 shadow-xs" 
                          : "border-neutral-200 hover:border-neutral-400 bg-[#FAF9F6]"
                      }`}
                    >
                      <div className="text-[10px] text-neutral-400 uppercase tracking-widest">{style.name}</div>
                      <div className="text-xl italic mt-1 font-serif truncate text-neutral-800">
                        {typedName || "Tanda Tangan"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Styled CSS for Sacramento and Playball Google fonts */}
              <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playball&family=Sacramento&display=swap');
                .font-cursive-1 { font-family: 'Brush Script MT', cursive, Georgia, serif; }
                .font-cursive-2 { font-family: 'Lucida Handwriting', cursive, Georgia, serif; }
                .font-cursive-3 { font-family: 'Sacramento', cursive; }
                .font-cursive-4 { font-family: 'Playball', cursive; }
              `}</style>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-[#1A1A1A] flex justify-between items-center bg-neutral-50">
          <div className="text-[11px] text-neutral-500 font-sans hidden sm:block">
            {activeTab === "upload" 
              ? (uploadedImageSrc ? "Gambar siap dipasang" : "Pilih file gambar untuk melanjutkan") 
              : activeTab === "draw" 
              ? "Goresan akan disimpan format resolusi tinggi" 
              : "Teks akan diubah menjadi tanda tangan digital"}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 text-xs sm:text-sm font-semibold rounded text-neutral-700 cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-[#1A1A1A] text-white hover:bg-neutral-800 text-xs sm:text-sm font-bold rounded shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Check className="w-4 h-4 text-emerald-400" /> Pasang Tanda Tangan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
