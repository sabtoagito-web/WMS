import React, { useState, useRef, useEffect } from "react";
import { 
  LogIn, 
  LogOut, 
  User, 
  ChevronDown, 
  ShieldCheck, 
  Briefcase, 
  Mail, 
  Building2, 
  Sparkles, 
  RefreshCw,
  Check
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRole, isGuestUser, canEditReportData } from "../types/auth";

export function UserAccountMenu() {
  const { user, openLoginModal, logout, updateUserRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case "Admin Gudang":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Head Of Wrh Sub.Dept":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Supervisor Gudang":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Quality / Adm":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-300";
    }
  };

  if (!user) {
    return (
      <button
        onClick={openLoginModal}
        className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border border-black"
        title="Masuk ke Sistem Manajemen Gudang"
      >
        <LogIn className="w-3.5 h-3.5 text-emerald-400" />
        <span>Masuk / Login</span>
      </button>
    );
  }

  return (
    <div className="relative font-sans" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full md:rounded-lg border border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-2xs group"
        title="Menu Profil & Akun Pengguna"
      >
        {/* Avatar */}
        <div className="relative">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-7 h-7 rounded-full object-cover border border-neutral-300 shadow-inner"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-[10px] shadow-inner">
              {getInitials(user.displayName)}
            </div>
          )}
          {/* Online green indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </div>

        {/* User Info Label (Hidden on small screens) */}
        <div className="hidden sm:flex flex-col text-left leading-tight">
          <span className="text-xs font-bold text-neutral-900 group-hover:text-black truncate max-w-[130px]">
            {user.displayName}
          </span>
          <span className="text-[9px] font-semibold text-neutral-500 truncate max-w-[130px]">
            {user.role}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border-2 border-[#1A1A1A] shadow-2xl rounded-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Card Header Info */}
          <div className="bg-[#1A1A1A] text-white p-4">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm border-2 border-white/30">
                  {getInitials(user.displayName)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs truncate">{user.displayName}</div>
                <div className="text-[10px] text-neutral-300 font-mono truncate">{user.email || "No email"}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(user.role)}`}>
                    {user.role}
                  </span>
                  <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Aktif
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Details Details */}
          <div className="p-3 bg-neutral-50 border-b border-neutral-200 text-[11px] space-y-1.5 text-neutral-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <Building2 className="w-3.5 h-3.5" /> Departemen:
              </span>
              <span className="font-semibold text-neutral-900">{user.department}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5" /> Metode Login:
              </span>
              <span className="font-bold text-neutral-800 uppercase tracking-tight text-[10px]">
                NIK & PIN Petugas
              </span>
            </div>
          </div>

          {/* Quick Role Switcher */}
          {!isGuestUser(user) ? (
            <div className="p-3 border-b border-neutral-200">
              <div className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider mb-1.5 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-neutral-400" />
                <span>Ganti Jabatan Aktif:</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {(["Admin Gudang", "Head Of Wrh Sub.Dept", "Supervisor Gudang", "Operator / Checker"] as UserRole[]).map((r) => {
                  const isActive = user.role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        updateUserRole(r);
                        setIsOpen(false);
                      }}
                      className={`px-2.5 py-1.5 text-xs text-left rounded flex items-center justify-between transition-colors cursor-pointer ${
                        isActive 
                          ? "bg-neutral-900 text-white font-bold" 
                          : "hover:bg-neutral-100 text-neutral-700 font-medium"
                      }`}
                    >
                      <span>{r}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 border-b border-neutral-200 bg-amber-50/50">
              <p className="text-[11px] text-amber-800 leading-snug font-medium">
                👁️ <strong>Akun Tamu (Viewer):</strong> Hanya memiliki izin Lihat Data (Read-Only). Tidak diizinkan mengedit, menghapus, atau menyimpan data.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                openLoginModal();
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-bold text-neutral-700 hover:bg-neutral-100 rounded flex items-center gap-2 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-neutral-500" />
              <span>Ganti Akun Pengguna</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar / Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
