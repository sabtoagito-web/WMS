import React, { useState, useEffect } from "react";
import { 
  X, 
  Settings, 
  Users, 
  ShieldCheck, 
  Clock, 
  Plus, 
  Pencil, 
  Trash2, 
  KeyRound, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Lock, 
  Eye, 
  EyeOff, 
  Building2, 
  RotateCcw, 
  FileDown, 
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserX
} from "lucide-react";
import { 
  SystemUserAccount, 
  LoginSystemConfig, 
  LoginAuditLog, 
  UserRole,
  DEFAULT_LOGIN_SYSTEM_CONFIG,
  INITIAL_SYSTEM_ACCOUNTS
} from "../types/auth";
import { 
  saveLoginSystemConfig, 
  saveSystemAccounts, 
  clearLoginAuditLogs,
  getLocalLoginConfig,
  getLocalSystemAccounts,
  getLocalAuditLogs
} from "../lib/loginSettingsService";

interface LoginSystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: UserRole;
  currentUserName?: string;
  onConfigUpdated?: (config: LoginSystemConfig) => void;
  onAccountsUpdated?: (accounts: SystemUserAccount[]) => void;
}

const AVAILABLE_ROLES: UserRole[] = [
  "Admin Gudang",
  "Supervisor Gudang",
  "Head Of Wrh Sub.Dept",
  "Kepala Bagian Gudang",
  "Operator / Checker",
  "Staff Logistik",
  "Quality / Adm",
  "Tamu / Viewer"
];

export function LoginSystemSettingsModal({
  isOpen,
  onClose,
  currentRole,
  currentUserName,
  onConfigUpdated,
  onAccountsUpdated
}: LoginSystemSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"accounts" | "policy" | "audit">("accounts");
  
  // Data States
  const [accounts, setAccounts] = useState<SystemUserAccount[]>([]);
  const [config, setConfig] = useState<LoginSystemConfig>(DEFAULT_LOGIN_SYSTEM_CONFIG);
  const [auditLogs, setAuditLogs] = useState<LoginAuditLog[]>([]);

  // Search & Filter States
  const [accountSearch, setAccountSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form Modal States
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountFormData, setAccountFormData] = useState<{
    nik: string;
    username: string;
    name: string;
    email: string;
    role: UserRole;
    pin: string;
    department: string;
    status: "active" | "inactive";
    notes: string;
  }>({
    nik: "",
    username: "",
    name: "",
    email: "",
    role: "Admin Gudang",
    pin: "123456",
    department: "Gudang Bahan Pembantu (Feed Add)",
    status: "active",
    notes: ""
  });
  const [showPinInput, setShowPinInput] = useState(false);

  // Password Reset Quick Modal
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);
  const [resetAccountTarget, setResetAccountTarget] = useState<SystemUserAccount | null>(null);
  const [newPinValue, setNewPinValue] = useState("");

  // Delete Confirmation Modal State
  const [accountToDelete, setAccountToDelete] = useState<SystemUserAccount | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Clear Logs Confirmation State
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize data on open
  useEffect(() => {
    if (isOpen) {
      const loadedAccounts = getLocalSystemAccounts();
      const loadedConfig = getLocalLoginConfig();
      const loadedLogs = getLocalAuditLogs();
      setAccounts(loadedAccounts);
      setConfig(loadedConfig);
      setAuditLogs(loadedLogs);
    }
  }, [isOpen]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  if (!isOpen) return null;

  // Handle Save Policy Settings
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedConfig: LoginSystemConfig = {
        ...config,
        updatedBy: currentUserName || "Administrator",
        updatedAt: new Date().toISOString()
      };
      await saveLoginSystemConfig(updatedConfig);
      setConfig(updatedConfig);
      if (onConfigUpdated) onConfigUpdated(updatedConfig);
      showToast("Pengaturan kebijakan & keamanan login berhasil disimpan!", "success");
    } catch (err: any) {
      showToast("Gagal menyimpan kebijakan login: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Create/Edit Account Modal
  const openCreateAccount = () => {
    setEditingAccountId(null);
    setAccountFormData({
      nik: "JPF-WRH-" + Math.floor(1000 + Math.random() * 9000),
      username: "",
      name: "",
      email: "",
      role: config.defaultRoleForNewUsers || "Admin Gudang",
      pin: "123456",
      department: "Gudang Bahan Pembantu (Feed Add)",
      status: "active",
      notes: ""
    });
    setIsAccountModalOpen(true);
  };

  const openEditAccount = (acc: SystemUserAccount) => {
    setEditingAccountId(acc.id);
    setAccountFormData({
      nik: acc.nik,
      username: acc.username,
      name: acc.name,
      email: acc.email,
      role: acc.role,
      pin: acc.pin,
      department: acc.department,
      status: acc.status,
      notes: acc.notes || ""
    });
    setIsAccountModalOpen(true);
  };

  // Save Account Create / Update
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountFormData.name.trim() || !accountFormData.nik.trim()) {
      showToast("Nama lengkap dan NIK wajib diisi!", "error");
      return;
    }

    const cleanUsername = (accountFormData.username || accountFormData.nik).trim().toLowerCase().replace(/\s+/g, "");

    let updatedAccounts: SystemUserAccount[];
    if (editingAccountId) {
      updatedAccounts = accounts.map((acc) => {
        if (acc.id === editingAccountId) {
          return {
            ...acc,
            ...accountFormData,
            username: cleanUsername,
            email: accountFormData.email || `${cleanUsername}@japfa.com`
          };
        }
        return acc;
      });
      showToast(`Akun petugas "${accountFormData.name}" berhasil diperbarui!`, "success");
    } else {
      // Check duplicate NIK or Username
      const duplicate = accounts.some(
        a => a.nik.toLowerCase() === accountFormData.nik.toLowerCase() || 
             a.username.toLowerCase() === cleanUsername
      );
      if (duplicate) {
        showToast("NIK atau Nama Pengguna sudah terdaftar di sistem!", "error");
        return;
      }

      const newAccount: SystemUserAccount = {
        id: `usr-${Date.now()}`,
        ...accountFormData,
        username: cleanUsername,
        email: accountFormData.email || `${cleanUsername}@japfa.com`,
        createdAt: new Date().toISOString()
      };
      updatedAccounts = [newAccount, ...accounts];
      showToast(`Akun petugas baru "${newAccount.name}" berhasil ditambahkan!`, "success");
    }

    setAccounts(updatedAccounts);
    await saveSystemAccounts(updatedAccounts);
    if (onAccountsUpdated) onAccountsUpdated(updatedAccounts);
    setIsAccountModalOpen(false);
  };

  // Toggle Account Active / Inactive
  const handleToggleStatus = async (accountId: string) => {
    const updated = accounts.map((acc) => {
      if (acc.id === accountId) {
        const nextStatus = acc.status === "active" ? "inactive" : "active";
        return { ...acc, status: nextStatus as "active" | "inactive" };
      }
      return acc;
    });
    setAccounts(updated);
    await saveSystemAccounts(updated);
    if (onAccountsUpdated) onAccountsUpdated(updated);
    showToast("Status akun berhasil diperbarui!", "success");
  };

  // Delete Account
  const requestDeleteAccount = (acc: SystemUserAccount) => {
    if (accounts.length <= 1) {
      showToast("Sistem harus menyisakan minimal satu akun terdaftar!", "error");
      return;
    }
    setAccountToDelete(acc);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    setIsDeletingAccount(true);
    try {
      const targetId = accountToDelete.id;
      const targetName = accountToDelete.name;
      const updated = accounts.filter(a => a.id !== targetId);
      setAccounts(updated);
      await saveSystemAccounts(updated);
      if (onAccountsUpdated) onAccountsUpdated(updated);
      showToast(`Akun petugas "${targetName}" berhasil dihapus dari sistem.`, "success");
      setAccountToDelete(null);
    } catch (err: any) {
      showToast(`Gagal menghapus akun: ${err.message}`, "error");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Reset PIN
  const handleOpenResetPin = (acc: SystemUserAccount) => {
    setResetAccountTarget(acc);
    setNewPinValue(acc.pin || "123456");
    setIsResetPinModalOpen(true);
  };

  const handleSaveResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAccountTarget || !newPinValue.trim()) return;

    const updated = accounts.map((acc) => {
      if (acc.id === resetAccountTarget.id) {
        return { ...acc, pin: newPinValue.trim() };
      }
      return acc;
    });

    setAccounts(updated);
    await saveSystemAccounts(updated);
    if (onAccountsUpdated) onAccountsUpdated(updated);
    setIsResetPinModalOpen(false);
    showToast(`PIN/Kata Sandi untuk ${resetAccountTarget.name} berhasil diubah!`, "success");
  };

  // Clear Audit Logs
  const requestClearLogs = () => {
    if (auditLogs.length === 0) return;
    setIsClearLogsModalOpen(true);
  };

  const confirmClearLogs = async () => {
    try {
      await clearLoginAuditLogs();
      setAuditLogs([]);
      setIsClearLogsModalOpen(false);
      showToast("Riwayat log aktivitas login telah dibersihkan.", "success");
    } catch (err: any) {
      showToast(`Gagal membersihkan log: ${err.message}`, "error");
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const q = accountSearch.toLowerCase().trim();
    const matchQuery = !q || 
      acc.name.toLowerCase().includes(q) || 
      acc.nik.toLowerCase().includes(q) || 
      acc.username.toLowerCase().includes(q) ||
      acc.role.toLowerCase().includes(q);

    const matchRole = roleFilter === "all" || acc.role === roleFilter;
    const matchStatus = statusFilter === "all" || acc.status === statusFilter;

    return matchQuery && matchRole && matchStatus;
  });

  const activeCount = accounts.filter(a => a.status === "active").length;
  const inactiveCount = accounts.filter(a => a.status === "inactive").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs font-sans animate-fade-in">
      <div 
        className="bg-white border-2 border-[#1A1A1A] shadow-2xl rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="bg-[#1A1A1A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-red-600 text-white flex items-center justify-center shadow-inner">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif italic font-bold text-base sm:text-lg">Pengaturan Sistem Login</h3>
                <span className="text-[10px] font-mono uppercase bg-neutral-800 text-amber-400 px-2 py-0.5 rounded border border-neutral-700 font-bold">
                  WMS SECURITY
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Kelola akun petugas gudang, kebijakan otentikasi, dan riwayat audit login
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Tutup Pengaturan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOAST BANNER */}
        {toastMessage && (
          <div className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b shrink-0 ${
            toastMessage.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
              : "bg-rose-50 text-rose-800 border-rose-300"
          }`}>
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-neutral-200 bg-neutral-100 font-bold text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className={`py-3 px-4 flex items-center gap-2 border-r border-neutral-200 transition-all cursor-pointer ${
              activeTab === "accounts"
                ? "bg-white text-neutral-900 border-b-2 border-b-red-600 shadow-2xs font-extrabold"
                : "text-neutral-600 hover:bg-neutral-200/70 hover:text-black"
            }`}
          >
            <Users className="w-4 h-4 text-red-600" />
            <span>Manajemen Akun Petugas ({accounts.length})</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("policy")}
            className={`py-3 px-4 flex items-center gap-2 border-r border-neutral-200 transition-all cursor-pointer ${
              activeTab === "policy"
                ? "bg-white text-neutral-900 border-b-2 border-b-red-600 shadow-2xs font-extrabold"
                : "text-neutral-600 hover:bg-neutral-200/70 hover:text-black"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Kebijakan & Keamanan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-4 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "audit"
                ? "bg-white text-neutral-900 border-b-2 border-b-red-600 shadow-2xs font-extrabold"
                : "text-neutral-600 hover:bg-neutral-200/70 hover:text-black"
            }`}
          >
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Log Audit Login ({auditLogs.length})</span>
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF9F6]">
          
          {/* ========================================================= */}
          {/* TAB 1: MANAJEMEN AKUN PETUGAS */}
          {/* ========================================================= */}
          {activeTab === "accounts" && (
            <div className="space-y-4">
              
              {/* Top Action & Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-neutral-300 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-neutral-700">Total Akun:</span>
                  <span className="bg-neutral-100 font-mono font-bold px-2 py-0.5 rounded border border-neutral-300">
                    {accounts.length}
                  </span>
                  <span className="text-neutral-300">•</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <UserCheck className="w-3.5 h-3.5" /> {activeCount} Aktif
                  </span>
                  {inactiveCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-neutral-600 font-bold bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
                      <UserX className="w-3.5 h-3.5" /> {inactiveCount} Nonaktif
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openCreateAccount}
                  className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Akun Petugas Baru</span>
                </button>
              </div>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="relative sm:col-span-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    placeholder="Cari Nama, NIK, Username..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded bg-white focus:outline-none focus:border-black font-sans"
                  />
                  {accountSearch && (
                    <button 
                      onClick={() => setAccountSearch("")}
                      className="absolute right-2.5 top-2 text-xs text-neutral-400 hover:text-black font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white focus:outline-none focus:border-black font-sans font-semibold"
                  >
                    <option value="all">Semua Peran / Jabatan</option>
                    {AVAILABLE_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white focus:outline-none focus:border-black font-sans font-semibold"
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Hanya Akun Aktif</option>
                    <option value="inactive">Hanya Akun Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Accounts Table List */}
              <div className="bg-white border border-neutral-300 rounded-lg overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-[#1A1A1A] text-white text-[11px] uppercase font-bold tracking-wider">
                        <th className="p-2.5 pl-3">Petugas & Identitas</th>
                        <th className="p-2.5">Peran / Jabatan</th>
                        <th className="p-2.5">Departemen</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-center">PIN / Sandi</th>
                        <th className="p-2.5 text-right pr-3">Aksi Manajemen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {filteredAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-neutral-400 italic">
                            Tidak ada akun petugas yang sesuai dengan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredAccounts.map((acc) => {
                          const isActive = acc.status === "active";
                          return (
                            <tr 
                              key={acc.id} 
                              className={`hover:bg-neutral-50 transition-colors ${
                                !isActive ? "bg-neutral-50/60 opacity-75" : ""
                              }`}
                            >
                              <td className="p-2.5 pl-3">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    acc.role.includes("Supervisor") 
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : acc.role.includes("Head")
                                        ? "bg-blue-100 text-blue-900 border border-blue-300"
                                        : "bg-red-100 text-red-900 border border-red-300"
                                  }`}>
                                    {acc.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-neutral-900 truncate">
                                      {acc.name}
                                    </div>
                                    <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1.5">
                                      <span className="font-semibold text-neutral-700">NIK: {acc.nik}</span>
                                      <span>•</span>
                                      <span className="text-neutral-400">User: {acc.username}</span>
                                    </div>
                                    {acc.email && (
                                      <div className="text-[9px] text-neutral-400 font-mono truncate">
                                        {acc.email}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="p-2.5">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  acc.role.includes("Supervisor")
                                    ? "bg-amber-50 text-amber-800 border-amber-300"
                                    : acc.role.includes("Head")
                                      ? "bg-blue-50 text-blue-800 border-blue-300"
                                      : acc.role.includes("Kepala")
                                        ? "bg-purple-50 text-purple-800 border-purple-300"
                                        : "bg-emerald-50 text-emerald-800 border-emerald-300"
                                }`}>
                                  {acc.role}
                                </span>
                              </td>

                              <td className="p-2.5 text-[11px] text-neutral-600">
                                <span className="truncate max-w-[160px] block" title={acc.department}>
                                  {acc.department || "Pergudangan"}
                                </span>
                              </td>

                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(acc.id)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                    isActive
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
                                      : "bg-neutral-200 text-neutral-600 border-neutral-300 hover:bg-neutral-300"
                                  }`}
                                  title="Klik untuk mengubah status aktif"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-600" : "bg-neutral-400"}`}></span>
                                  <span>{isActive ? "Aktif" : "Nonaktif"}</span>
                                </button>
                              </td>

                              <td className="p-2.5 text-center font-mono">
                                <button
                                  type="button"
                                  onClick={() => handleOpenResetPin(acc)}
                                  className="text-[10px] text-neutral-600 hover:text-black bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 px-2 py-0.5 rounded inline-flex items-center gap-1 cursor-pointer"
                                  title="Klik untuk ubah PIN / Sandi"
                                >
                                  <KeyRound className="w-3 h-3 text-amber-600" />
                                  <span>••••••</span>
                                </button>
                              </td>

                              <td className="p-2.5 text-right pr-3">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditAccount(acc)}
                                    className="p-1 hover:bg-neutral-200 rounded text-neutral-700 transition-colors cursor-pointer"
                                    title="Edit data akun"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteAccount(acc)}
                                    className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors cursor-pointer"
                                    title="Hapus akun"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3 bg-neutral-100 border border-neutral-300 rounded text-[11px] text-neutral-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Petunjuk Keamanan:</strong> Akun yang terdaftar di atas dapat digunakan untuk login ke Sistem Gudang menggunakan NIK atau Nama Pengguna beserta PIN/Kata Sandi masing-masing. Pastikan setiap petugas memiliki NIK unik resmi perusahaan.
                </p>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: KEBIJAKAN & KEAMANAN LOGIN */}
          {/* ========================================================= */}
          {activeTab === "policy" && (
            <form onSubmit={handleSavePolicy} className="space-y-5 max-w-2xl mx-auto">
              
              {/* SECTION: METODE LOGIN */}
              <div className="bg-white p-4 sm:p-5 rounded-lg border border-neutral-300 shadow-2xs space-y-3.5">
                <div className="border-b border-neutral-200 pb-2">
                  <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                    <span>Metode Otentikasi Petugas</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Otentikasi login dibatasi khusus untuk petugas gudang resmi yang terdaftar oleh administrator
                  </p>
                </div>

                {/* INFO: NIK & PIN LOGIN RESMI */}
                <div className="flex items-center justify-between p-2.5 rounded bg-neutral-50 border border-neutral-200">
                  <div>
                    <span className="font-bold text-xs text-neutral-800 block">Login Petugas (NIK / Username & PIN Keamanan)</span>
                    <span className="text-[10px] text-neutral-500">
                      Otentikasi internal resmi menggunakan NIK atau Nama Pengguna terdaftar dan PIN petugas
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                    Wajib Aktif
                  </span>
                </div>

                {/* TOGGLE: WAJIB NIK TERDAFTAR */}
                <div className="flex items-center justify-between p-2.5 rounded bg-neutral-50 border border-neutral-200">
                  <div>
                    <span className="font-bold text-xs text-neutral-800 block">Validasi Ketat Database Petugas (Wajib Terdaftar)</span>
                    <span className="text-[10px] text-neutral-500">
                      Hanya izinkan login bila NIK atau Nama Pengguna ada pada tab "Manajemen Akun Petugas"
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.requireNikValidation}
                      onChange={(e) => setConfig({ ...config, requireNikValidation: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>

              {/* SECTION: KEBIJAKAN SESI & DEFAULT */}
              <div className="bg-white p-4 sm:p-5 rounded-lg border border-neutral-300 shadow-2xs space-y-3.5">
                <div className="border-b border-neutral-200 pb-2">
                  <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Kebijakan Sesi & Aturan Default</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Konfigurasi masa berlaku login petugas dan penetapan hak akses default
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Masa Berlaku Sesi Login:
                    </label>
                    <select
                      value={config.sessionDurationHours}
                      onChange={(e) => setConfig({ ...config, sessionDurationHours: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-semibold"
                    >
                      <option value={8}>8 Jam (1 Shift Operasional)</option>
                      <option value={12}>12 Jam (Standar Pabrik)</option>
                      <option value={24}>24 Jam (1 Hari Penuh)</option>
                      <option value={168}>7 Hari (Perangkat Khusus Gudang)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Minimal Panjang PIN Keamanan:
                    </label>
                    <select
                      value={config.minPinLength}
                      onChange={(e) => setConfig({ ...config, minPinLength: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-semibold font-mono"
                    >
                      <option value={4}>4 Karakter / Digit</option>
                      <option value={6}>6 Karakter / Digit (Disarankan)</option>
                      <option value={8}>8 Karakter / Digit (Keamanan Tinggi)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Peran Default Petugas Baru:
                    </label>
                    <select
                      value={config.defaultRoleForNewUsers}
                      onChange={(e) => setConfig({ ...config, defaultRoleForNewUsers: e.target.value as UserRole })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-semibold"
                    >
                      {AVAILABLE_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION: BRANDING & PENGUMUMAN LOGIN */}
              <div className="bg-white p-4 sm:p-5 rounded-lg border border-neutral-300 shadow-2xs space-y-3.5">
                <div className="border-b border-neutral-200 pb-2">
                  <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-neutral-700" />
                    <span>Identitas Pabrik & Pengumuman Login</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Teks judul instansi dan pesan pengumuman pada portal login
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Nama Perusahaan / Unit Pabrik:
                    </label>
                    <input
                      type="text"
                      value={config.companyHeaderTitle}
                      onChange={(e) => setConfig({ ...config, companyHeaderTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Sub-Judul / Divisi Pergudangan:
                    </label>
                    <input
                      type="text"
                      value={config.companyHeaderSubtitle}
                      onChange={(e) => setConfig({ ...config, companyHeaderSubtitle: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Pesan Pemberitahuan / Pengumuman Petugas:
                    </label>
                    <textarea
                      rows={2}
                      value={config.loginNotice}
                      onChange={(e) => setConfig({ ...config, loginNotice: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-neutral-800 active:bg-black text-white font-bold rounded shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wider"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan Kebijakan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Simpan Seluruh Kebijakan Login</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 3: LOG AUDIT AKTIVITAS LOGIN */}
          {/* ========================================================= */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-neutral-300 shadow-2xs">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800">
                    Riwayat Audit Masuk Sistem (Audit Trail)
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Mencatat seluruh sesi masuk petugas secara real-time untuk audit operasional
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={requestClearLogs}
                    disabled={auditLogs.length === 0}
                    className="px-3 py-1.5 border border-neutral-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded text-xs font-semibold text-neutral-600 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Bersihkan Riwayat
                  </button>
                </div>
              </div>

              {/* Audit Table */}
              <div className="bg-white border border-neutral-300 rounded-lg overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-[#1A1A1A] text-white text-[11px] uppercase font-bold tracking-wider">
                        <th className="p-2.5 pl-3">Waktu & Tanggal</th>
                        <th className="p-2.5">Nama Petugas</th>
                        <th className="p-2.5">NIK / ID</th>
                        <th className="p-2.5">Peran</th>
                        <th className="p-2.5">Metode</th>
                        <th className="p-2.5">Shift</th>
                        <th className="p-2.5 text-center pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-neutral-400 italic">
                            Belum ada riwayat aktivitas login tercatat pada sistem.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => {
                          const dateObj = new Date(log.timestamp);
                          const dateStr = dateObj.toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          });
                          const timeStr = dateObj.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          });

                          return (
                            <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                              <td className="p-2.5 pl-3 font-mono text-[11px] text-neutral-600">
                                <div>{timeStr}</div>
                                <div className="text-[10px] text-neutral-400">{dateStr}</div>
                              </td>

                              <td className="p-2.5 font-bold text-neutral-900">
                                {log.userName}
                              </td>

                              <td className="p-2.5 font-mono text-[11px] text-neutral-600">
                                {log.nikOrIdentifier || "-"}
                              </td>

                              <td className="p-2.5">
                                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-700">
                                  {log.role}
                                </span>
                              </td>

                              <td className="p-2.5 text-[11px] font-medium capitalize text-neutral-700">
                                {log.method === "google" ? "Google SSO" : log.method === "nik_pin" ? "NIK & PIN" : log.method}
                              </td>

                              <td className="p-2.5 text-[11px] font-mono text-neutral-600">
                                {log.shift || "Shift 1"}
                              </td>

                              <td className="p-2.5 text-center pr-3">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.status === "success"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-rose-100 text-rose-800 border border-rose-300"
                                }`}>
                                  {log.status === "success" ? "Berhasil" : "Gagal"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 bg-neutral-100 border-t border-neutral-300 flex justify-between items-center text-xs text-neutral-500 shrink-0">
          <div className="font-mono text-[11px]">
            PT. JAPFA COMFEED INDONESIA Tbk • WMS Security Module
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-200 text-neutral-800 rounded font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* ========================================================= */}
      {/* SUB-MODAL: TAMBAH / EDIT AKUN PETUGAS */}
      {/* ========================================================= */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white border-2 border-[#1A1A1A] shadow-2xl rounded-lg max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="bg-[#1A1A1A] text-white p-4 flex items-center justify-between border-b border-neutral-800">
              <h4 className="font-serif italic font-bold text-sm">
                {editingAccountId ? "Edit Data Akun Petugas" : "Tambah Akun Petugas Baru"}
              </h4>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                  Nama Lengkap Petugas *
                </label>
                <input
                  type="text"
                  required
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  placeholder="Contoh: Sabto Agito"
                  className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                    Nomor Induk Karyawan (NIK) *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountFormData.nik}
                    onChange={(e) => setAccountFormData({ ...accountFormData, nik: e.target.value })}
                    placeholder="Contoh: JPF-WRH-0881"
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                    Nama Pengguna (Username)
                  </label>
                  <input
                    type="text"
                    value={accountFormData.username}
                    onChange={(e) => setAccountFormData({ ...accountFormData, username: e.target.value })}
                    placeholder="Contoh: sabto"
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-mono lowercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                    Peran / Jabatan Akses *
                  </label>
                  <select
                    value={accountFormData.role}
                    onChange={(e) => setAccountFormData({ ...accountFormData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-semibold"
                  >
                    {AVAILABLE_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                    Status Akun:
                  </label>
                  <select
                    value={accountFormData.status}
                    onChange={(e) => setAccountFormData({ ...accountFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-semibold"
                  >
                    <option value="active">Aktif (Dapat Login)</option>
                    <option value="inactive">Nonaktif (Diblokir)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                  Departemen / Penugasan:
                </label>
                <input
                  type="text"
                  value={accountFormData.department}
                  onChange={(e) => setAccountFormData({ ...accountFormData, department: e.target.value })}
                  placeholder="Contoh: Gudang Bahan Pembantu (Feed Add)"
                  className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                  Email Perusahaan / Kontak:
                </label>
                <input
                  type="email"
                  value={accountFormData.email}
                  onChange={(e) => setAccountFormData({ ...accountFormData, email: e.target.value })}
                  placeholder="Contoh: sabto@japfa.com"
                  className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-neutral-700 uppercase">
                    PIN / Kata Sandi Masuk *
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Min {config.minPinLength || 4} digit
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPinInput ? "text" : "password"}
                    required
                    value={accountFormData.pin}
                    onChange={(e) => setAccountFormData({ ...accountFormData, pin: e.target.value })}
                    placeholder="Masukkan PIN operasional"
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-[#FAF9F6] focus:outline-none focus:border-black font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinInput(!showPinInput)}
                    className="absolute right-3 top-2 text-neutral-400 hover:text-black"
                  >
                    {showPinInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold shadow-sm"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-MODAL: RESET / UBAH PIN CEPAT */}
      {/* ========================================================= */}
      {isResetPinModalOpen && resetAccountTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white border-2 border-[#1A1A1A] shadow-2xl rounded-lg max-w-sm w-full overflow-hidden animate-scale-in">
            <div className="bg-[#1A1A1A] text-white p-4 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h4 className="font-serif italic font-bold text-sm">Reset PIN / Sandi</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPinModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPin} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-neutral-100 rounded border border-neutral-200 text-xs">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">Petugas:</span>
                <span className="font-bold text-neutral-900 block">{resetAccountTarget.name}</span>
                <span className="text-[10px] font-mono text-neutral-500">NIK: {resetAccountTarget.nik}</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                  PIN / Sandi Baru:
                </label>
                <input
                  type="text"
                  required
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value)}
                  placeholder="Masukkan PIN baru"
                  className="w-full px-3 py-2 border-2 border-neutral-300 rounded bg-[#FAF9F6] focus:border-black font-mono tracking-widest text-center text-sm font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPinModalOpen(false)}
                  className="px-3.5 py-1.5 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded text-xs font-bold shadow-sm"
                >
                  Perbarui PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-MODAL: KONFIRMASI HAPUS AKUN PETUGAS */}
      {/* ========================================================= */}
      {accountToDelete && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white border-2 border-red-600 shadow-2xl rounded-lg max-w-md w-full overflow-hidden animate-scale-in">
            <div className="bg-red-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h4 className="font-serif italic font-bold text-base">Konfirmasi Hapus Akun</h4>
              </div>
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="text-red-200 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-neutral-700">
              <p className="leading-relaxed text-neutral-800 font-medium">
                Apakah Anda yakin ingin menghapus akun petugas ini dari sistem manajemen gudang?
              </p>

              <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-neutral-900">{accountToDelete.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                    {accountToDelete.role}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-600 flex flex-wrap items-center gap-2">
                  <span>NIK: <strong className="text-neutral-900">{accountToDelete.nik}</strong></span>
                  <span>•</span>
                  <span>Username: <strong className="text-neutral-900">{accountToDelete.username}</strong></span>
                </div>
                {accountToDelete.department && (
                  <div className="text-[11px] text-neutral-600">
                    Departemen: <span className="font-semibold text-neutral-800">{accountToDelete.department}</span>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Peringatan:</strong> Seluruh hak akses dan izin masuk petugas ini akan segera dicabut secara permanen.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setAccountToDelete(null)}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAccount}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingAccount ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Hapus Akun Ini</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-MODAL: KONFIRMASI BERSIHKAN LOG AUDIT */}
      {/* ========================================================= */}
      {isClearLogsModalOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white border-2 border-[#1A1A1A] shadow-2xl rounded-lg max-w-sm w-full overflow-hidden animate-scale-in">
            <div className="bg-[#1A1A1A] text-white p-4 flex items-center justify-between">
              <h4 className="font-serif italic font-bold text-sm">Bersihkan Riwayat Audit?</h4>
              <button
                type="button"
                onClick={() => setIsClearLogsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs text-neutral-700">
              <p>
                Apakah Anda yakin ingin menghapus seluruh ({auditLogs.length}) riwayat catatan log aktivitas login petugas?
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsClearLogsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-neutral-300 rounded text-xs font-semibold hover:bg-neutral-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmClearLogs}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold cursor-pointer"
                >
                  Ya, Bersihkan Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
