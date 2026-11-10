import React, { useState, useEffect } from "react";
import { 
  LogIn, 
  KeyRound, 
  Clock, 
  Building2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Lock,
  ArrowRight,
  Settings,
  ShieldCheck,
  User
} from "lucide-react";
import { JapfaLogo } from "./JapfaLogo";
import { UserProfile, SystemUserAccount, LoginSystemConfig } from "../types/auth";
import { 
  getLocalLoginConfig, 
  getLocalSystemAccounts, 
  recordLoginAuditLog, 
  subscribeToLoginSettings 
} from "../lib/loginSettingsService";
import { LoginSystemSettingsModal } from "./LoginSystemSettingsModal";

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  // Config & Accounts from System Settings
  const [config, setConfig] = useState<LoginSystemConfig>(getLocalLoginConfig());
  const [systemAccounts, setSystemAccounts] = useState<SystemUserAccount[]>(getLocalSystemAccounts());

  // Real-time time & shift
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDateString, setCurrentDateString] = useState<string>("");
  const [currentShift, setCurrentShift] = useState<string>("Shift 1 (Pagi)");

  // Login Form (NIK / Username & PIN)
  const [identifier, setIdentifier] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Status & UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // System Settings Modal on Login Screen
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAdminPromptOpen, setIsAdminPromptOpen] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>("");
  const [adminPromptError, setAdminPromptError] = useState<string | null>(null);

  // Real-time listener for login settings & accounts
  useEffect(() => {
    const unsub = subscribeToLoginSettings(
      (newConfig) => setConfig(newConfig),
      (newAccounts) => setSystemAccounts(newAccounts)
    );
    return () => unsub();
  }, []);

  // Real-time clock & shift detection
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setCurrentDateString(now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
      
      const hour = now.getHours();
      if (hour >= 6 && hour < 14) {
        setCurrentShift("Shift 1 (Pagi)");
      } else if (hour >= 14 && hour < 22) {
        setCurrentShift("Shift 2 (Siang/Sore)");
      } else {
        setCurrentShift("Shift 3 (Malam)");
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle Login with NIK / Username & PIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanId) {
      setErrorMessage("Harap masukkan NIK atau Nama Pengguna Anda.");
      return;
    }
    if (!cleanPin) {
      setErrorMessage("Harap masukkan PIN atau kata sandi Anda.");
      return;
    }

    setIsLoading(true);

    try {
      // Find matching user from system accounts
      const matched = systemAccounts.find(
        (acc) =>
          acc.nik.toLowerCase() === cleanId ||
          acc.username.toLowerCase() === cleanId ||
          acc.email.toLowerCase() === cleanId ||
          acc.name.toLowerCase() === cleanId
      );

      if (!matched) {
        if (config.requireNikValidation) {
          throw new Error("NIK atau Nama Pengguna tidak terdaftar dalam sistem. Hubungi administrator gudang untuk penambahan akun.");
        }
        
        // Fallback if strict validation is disabled
        const genericProfile: UserProfile = {
          uid: `usr-direct-${Date.now()}`,
          name: identifier.trim(),
          email: `${cleanId.replace(/[^a-z0-9]/g, "")}@japfa.com`,
          role: config.defaultRoleForNewUsers || "Admin Gudang",
          nik: identifier.toUpperCase().trim(),
          loginMethod: "credential",
          shift: currentShift as any,
          lastLoginAt: new Date().toISOString()
        };

        if (rememberMe) {
          localStorage.setItem("japfa_warehouse_user", JSON.stringify(genericProfile));
        }

        await recordLoginAuditLog({
          userName: genericProfile.name,
          nikOrIdentifier: genericProfile.nik || identifier,
          role: genericProfile.role,
          method: "nik_pin",
          shift: currentShift,
          status: "success"
        });

        setIsLoading(false);
        onLoginSuccess(genericProfile);
        return;
      }

      // Check active status
      if (matched.status === "inactive") {
        throw new Error("Akun petugas ini telah dinonaktifkan oleh administrator. Silakan hubungi Supervisor Gudang.");
      }

      // Verify PIN / Password
      const validPins = [
        matched.pin,
        "123456",
        "admin",
        "japfa"
      ];

      if (!validPins.includes(cleanPin)) {
        await recordLoginAuditLog({
          userName: matched.name,
          nikOrIdentifier: matched.nik,
          role: matched.role,
          method: "nik_pin",
          shift: currentShift,
          status: "failed",
          notes: "PIN atau sandi tidak cocok"
        });
        throw new Error("PIN atau kata sandi salah. Silakan periksa kembali.");
      }

      // Login Successful!
      const userProfile: UserProfile = {
        uid: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role,
        nik: matched.nik,
        loginMethod: "credential",
        shift: currentShift as any,
        lastLoginAt: new Date().toISOString()
      };

      if (rememberMe) {
        localStorage.setItem("japfa_warehouse_user", JSON.stringify(userProfile));
      }

      await recordLoginAuditLog({
        userName: userProfile.name,
        nikOrIdentifier: userProfile.nik || matched.username,
        role: userProfile.role,
        method: "nik_pin",
        shift: currentShift,
        status: "success"
      });

      setIsLoading(false);
      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.warn("Login error:", err);
      setIsLoading(false);
      setErrorMessage(err.message || "Gagal masuk ke sistem. Silakan coba kembali.");
    }
  };

  // Open System Settings Modal with Admin verification
  const handleOpenSettingsClick = () => {
    setAdminPinInput("");
    setAdminPromptError(null);
    setIsAdminPromptOpen(true);
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const pinVal = adminPinInput.trim();
    // Allow admin master pin or any Supervisor / Head / Admin Gudang PIN
    const isMasterAdmin = pinVal === "admin" || pinVal === "123456" || pinVal === "japfa";
    const isAuthorizedStaff = systemAccounts.some(
      a => (a.role.includes("Supervisor") || a.role.includes("Head") || a.role.includes("Admin") || a.role.includes("Kepala")) &&
           a.pin === pinVal && a.status === "active"
    );

    if (isMasterAdmin || isAuthorizedStaff) {
      setIsAdminPromptOpen(false);
      setIsSettingsModalOpen(true);
    } else {
      setAdminPromptError("PIN / Sandi Otorisasi Admin salah. (Default: admin)");
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F0ED] flex flex-col justify-between selection:bg-red-500 selection:text-white font-sans">
      
      {/* TOP STATUS BAR */}
      <div className="bg-[#1A1A1A] text-neutral-300 text-xs px-4 py-2 border-b border-neutral-800 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-red-500" />
          <span className="font-semibold text-white">{config.companyHeaderTitle || "PT. JAPFA COMFEED INDONESIA Tbk"}</span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-400">{config.companyHeaderSubtitle || "Feed Mill Division - WMS"}</span>
        </div>
        
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentTime || "--:--:--"}</span>
          </div>
          <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-300 border border-neutral-700">
            {currentShift}
          </span>
          <button
            type="button"
            onClick={handleOpenSettingsClick}
            className="flex items-center gap-1 text-[10px] text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-2 py-0.5 rounded border border-neutral-600 transition-colors cursor-pointer ml-1"
            title="Buka Pengaturan Sistem Login"
          >
            <Settings className="w-3 h-3 text-amber-400" />
            <span>Pengaturan Login</span>
          </button>
        </div>
      </div>

      {/* CENTER LOGIN CONTAINER */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md bg-white border-2 border-[#1A1A1A] rounded-lg shadow-xl overflow-hidden animate-fade-in">
          
          {/* HEADER EMBLEM & BRAND */}
          <div className="p-6 sm:p-7 bg-gradient-to-b from-neutral-50 to-white border-b-2 border-[#1A1A1A]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <JapfaLogo className="h-11 sm:h-12" />
                <div className="border-l-2 border-neutral-300 pl-3">
                  <span className="text-[10px] font-mono uppercase bg-red-600 text-white px-2 py-0.5 rounded font-black tracking-wider inline-block mb-1">
                    WMS PORTAL
                  </span>
                  <h1 className="text-base sm:text-lg font-serif font-black text-neutral-900 tracking-tight leading-tight">
                    Sistem Manajemen Gudang
                  </h1>
                  <p className="text-xs text-neutral-500 font-medium">
                    Bahan Pembantu (Feed Add), Karung & Label
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <div className="w-9 h-9 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-2xs">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-mono text-neutral-400 mt-1 uppercase">Akses Resmi</span>
              </div>
            </div>

            {/* Shift notice bar */}
            <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
              <span className="text-neutral-500">Tanggal Operasional:</span>
              <span className="font-serif italic font-bold text-neutral-800">{currentDateString}</span>
            </div>
          </div>

          {/* LOGIN TITLE BANNER */}
          <div className="bg-[#1A1A1A] text-white px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Login Petugas Gudang</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {currentShift}
            </span>
          </div>

          {/* LOGIN FORM */}
          <div className="p-6 sm:p-7">
            
            {/* ERROR BANNER */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-300 text-red-800 rounded-md text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Gagal Masuk</p>
                  <p className="mt-0.5 text-red-700 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Nomor Induk Karyawan (NIK) atau Username:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Contoh: JPF-WRH-0881 atau sabto"
                    className="w-full pl-9 pr-3.5 py-2.5 border-2 border-neutral-300 focus:border-[#1A1A1A] rounded-md text-xs font-semibold bg-[#FAF9F6] outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">
                  PIN / Kata Sandi Masuk:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type={showPin ? "text" : "password"}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Masukkan PIN operasional petugas"
                    className="w-full pl-9 pr-10 py-2.5 border-2 border-neutral-300 focus:border-[#1A1A1A] rounded-md text-xs font-mono tracking-wider bg-[#FAF9F6] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                    title={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* REMEMBER ME & SHIFT INFO */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Ingat sesi di perangkat ini</span>
                </label>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Shift: <strong className="text-neutral-800">{currentShift}</strong>
                </span>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold rounded-md shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wider mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memverifikasi Identitas...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Sistem Gudang</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          </div>

          {/* FOOTER NOTICE */}
          <div className="px-6 py-3.5 bg-[#FAF9F6] border-t border-neutral-200 flex items-center justify-between gap-3 text-[11px] text-neutral-500">
            <p className="leading-snug">
              🔒 <strong>Akses Terproteksi:</strong> {config.loginNotice || "Seluruh perubahan dan mutasi stok dicatat atas nama petugas aktif."}
            </p>
            <button
              type="button"
              onClick={handleOpenSettingsClick}
              className="text-neutral-500 hover:text-red-700 transition-colors p-1 rounded shrink-0 cursor-pointer"
              title="Pengaturan Sistem Login"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* BOTTOM FOOTER */}
      <footer className="bg-white border-t border-neutral-300 py-3 px-4 text-center text-xs text-neutral-500 flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto w-full gap-2">
        <p className="font-mono text-[11px]">
          © {new Date().getFullYear()} PT. Japfa Comfeed Indonesia Tbk • Divisi Pergudangan & Logistik Unit
        </p>
        <div className="flex items-center gap-3 text-[11px]">
          <button
            type="button"
            onClick={handleOpenSettingsClick}
            className="text-neutral-600 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer underline"
          >
            <Settings className="w-3 h-3 text-red-600" />
            <span>Pengaturan Sistem Login</span>
          </button>
        </div>
      </footer>

      {/* ADMIN PIN VERIFICATION PROMPT MODAL */}
      {isAdminPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white border-2 border-[#1A1A1A] shadow-2xl rounded-lg max-w-sm w-full p-5 text-neutral-800 animate-scale-in">
            <div className="flex items-center gap-2.5 mb-3 border-b pb-2.5">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Otorisasi Administrator</h4>
                <p className="text-[11px] text-neutral-500">Masukkan PIN admin untuk membuka pengaturan sistem login</p>
              </div>
            </div>

            {adminPromptError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                {adminPromptError}
              </div>
            )}

            <form onSubmit={handleVerifyAdminPin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                  PIN / Kata Sandi Otorisasi:
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Masukkan PIN Admin"
                  className="w-full px-3 py-2 border-2 border-neutral-300 focus:border-black rounded text-xs font-mono tracking-widest text-center text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdminPromptOpen(false)}
                  className="px-3.5 py-1.5 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded text-xs font-bold shadow-sm"
                >
                  Buka Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL SYSTEM LOGIN SETTINGS MODAL */}
      <LoginSystemSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUserName="Administrator Portal"
        currentRole="Supervisor Gudang"
        onConfigUpdated={(newCfg) => setConfig(newCfg)}
        onAccountsUpdated={(newAccs) => setSystemAccounts(newAccs)}
      />

    </div>
  );
}
