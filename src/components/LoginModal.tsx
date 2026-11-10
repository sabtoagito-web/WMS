import React, { useState } from "react";
import { 
  X, 
  User, 
  Lock, 
  Briefcase, 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff,
  KeyRound
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/auth";

export function LoginModal() {
  const { 
    isLoginModalOpen, 
    closeLoginModal, 
    loginWithEmailPassword, 
    authError, 
    clearAuthError, 
    isLoading 
  } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Admin Gudang");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setIsSubmitting(true);
    await loginWithEmailPassword(username.trim(), password.trim(), role);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div 
        className="bg-white border-2 border-[#1A1A1A] shadow-2xl rounded-lg max-w-md w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-[#1A1A1A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#D32F2F] text-white font-black flex items-center justify-center text-xs shadow-inner">
              J
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide uppercase">Login Sistem Gudang</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-400/30">
                  Firebase Auth
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                PT Japfa Comfeed Indonesia Tbk • Manajemen Stok
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* ERROR ALERT */}
          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{authError}</div>
              <button 
                onClick={clearAuthError}
                className="text-rose-500 hover:text-rose-800 p-0.5 cursor-pointer"
                title="Tutup pesan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                Nama Pengguna
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="contoh: sabto, Antonius Andri Waroto, atau Tamu"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] bg-[#FAF9F6] font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold uppercase text-neutral-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? "Sembunyikan" : "Lihat"}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin / tamu"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] bg-[#FAF9F6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                Jabatan / Peran
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] bg-[#FAF9F6] font-medium"
                >
                  <option value="Admin Gudang">Admin Gudang (Sabto - Pembuat Laporan & Stok)</option>
                  <option value="Head Of Wrh Sub.Dept">Head Of Wrh Sub.Dept (Antonius - Approval & Mengetahui)</option>
                  <option value="Tamu / Viewer">Tamu / Viewer (Hanya Lihat - Tanpa Akses Edit/Hapus/Simpan)</option>
                  <option value="Supervisor Gudang">Supervisor Gudang (Pemeriksa)</option>
                  <option value="Quality / Adm">Quality / Adm</option>
                  <option value="Operator / Checker">Operator / Checker</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading || !username.trim() || !password.trim()}
              className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#333333] active:bg-black text-white font-bold text-xs rounded transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-neutral-50 px-5 py-3 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Otentikasi Kredensial Japfa</span>
          <button
            onClick={closeLoginModal}
            className="text-xs font-semibold text-neutral-700 hover:text-black cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
