export type UserRole = 
  | "Supervisor Gudang" 
  | "Admin Gudang" 
  | "Operator / Checker" 
  | "Kepala Bagian Gudang" 
  | "Staff Logistik"
  | "Head Of Wrh Sub.Dept"
  | "Quality / Adm"
  | "Tamu / Viewer";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  nik?: string;
  photoURL?: string;
  loginMethod: "google" | "credential" | "quick";
  shift?: "Shift 1 (Pagi)" | "Shift 2 (Siang/Sore)" | "Shift 3 (Malam)";
  lastLoginAt: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  department: string;
  isOnline: boolean;
  provider: "google" | "password" | "demo";
  lastLogin: string;
}

/**
 * Memeriksa apakah pengguna adalah akun atas nama "Tamu / Viewer"
 * Aturan: Akun atas nama tamu HANYA BISA MELIHAT, TIDAK BISA mengedit, hapus, dan simpan semua data.
 */
export function isGuestUser(user: { name?: string; role?: string; nik?: string; username?: string; email?: string; displayName?: string } | null | undefined): boolean {
  if (!user) return true;
  const name = (user.name || (user as any).displayName || "").toLowerCase();
  const role = (user.role || "").toLowerCase();
  const nik = (user.nik || "").toLowerCase();
  const username = ((user as any).username || "").toLowerCase();
  const email = (user.email || "").toLowerCase();

  return (
    name.includes("tamu") ||
    role.includes("tamu") ||
    role.includes("viewer") ||
    nik.includes("tamu") ||
    username.includes("tamu") ||
    email.includes("tamu")
  );
}

/**
 * Memeriksa apakah pengguna berwenang mengedit isi data laporan
 * Aturan: HANYA akun atas nama Sabto dan Antonius yang dapat mengedit isi data laporan.
 */
export function canEditReportData(user: { name?: string; role?: string; nik?: string; username?: string; email?: string; displayName?: string } | null | undefined): boolean {
  if (!user) return false;
  if (isGuestUser(user)) return false;

  const name = (user.name || (user as any).displayName || "").toLowerCase();
  const username = ((user as any).username || "").toLowerCase();
  const email = (user.email || "").toLowerCase();
  const nik = (user.nik || "").toLowerCase();

  // Sabto: Sabto Agito / Sabto A / JPF-WRH-0881
  const isSabto = 
    name.includes("sabto") || 
    username.includes("sabto") || 
    email.includes("sabto") || 
    nik.includes("0881");

  // Antonius: Antonius Andri Waroto / Andri / JPF-WRH-0001
  const isAntonius = 
    name.includes("antonius") || 
    name.includes("andri") || 
    username.includes("andri") || 
    email.includes("andri") || 
    email.includes("antonius") || 
    nik.includes("0001");

  return isSabto || isAntonius;
}

/**
 * Memeriksa apakah pengguna dapat menyimpan data (semua akun berwenang KECUALI akun Tamu)
 */
export function canSaveData(user: { name?: string; role?: string; nik?: string; username?: string; email?: string; displayName?: string } | null | undefined): boolean {
  if (!user) return false;
  if (isGuestUser(user)) return false;
  return true;
}

/**
 * Memeriksa apakah pengguna dapat menghapus data (hanya Sabto & Antonius, Tamu dilarang keras)
 */
export function canDeleteData(user: { name?: string; role?: string; nik?: string; username?: string; email?: string; displayName?: string } | null | undefined): boolean {
  if (!user) return false;
  if (isGuestUser(user)) return false;
  return canEditReportData(user);
}

/** Akun Petugas yang Dikelola oleh Sistem Login */
export interface SystemUserAccount {
  id: string;
  nik: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  pin: string;
  department: string;
  status: "active" | "inactive";
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
}

/** Konfigurasi Kebijakan & Keamanan Sistem Login */
export interface LoginSystemConfig {
  allowGoogleLogin: boolean;
  allowNikPinLogin: boolean;
  allowSelfRegistration: boolean;
  requireNikValidation: boolean;
  sessionDurationHours: number;
  minPinLength: number;
  defaultRoleForNewUsers: UserRole;
  companyHeaderTitle: string;
  companyHeaderSubtitle: string;
  loginNotice: string;
  updatedAt: string;
  updatedBy?: string;
}

/** Log Audit Aktivitas Login Petugas */
export interface LoginAuditLog {
  id: string;
  timestamp: string;
  userName: string;
  nikOrIdentifier: string;
  role: UserRole;
  method: "google" | "nik_pin" | "credential" | "self_reg";
  shift: string;
  status: "success" | "failed";
  ipOrDevice?: string;
  notes?: string;
}

export const DEFAULT_LOGIN_SYSTEM_CONFIG: LoginSystemConfig = {
  allowGoogleLogin: false,
  allowNikPinLogin: true,
  allowSelfRegistration: false,
  requireNikValidation: true,
  sessionDurationHours: 12,
  minPinLength: 4,
  defaultRoleForNewUsers: "Admin Gudang",
  companyHeaderTitle: "PT. JAPFA COMFEED INDONESIA Tbk",
  companyHeaderSubtitle: "Feed Mill Division - Warehouse Management System",
  loginNotice: "Sistem Informasi Pergudangan Japfa Comfeed dilindungi standar keamanan operasional. Seluruh perubahan stok dicatat dengan identitas petugas.",
  updatedAt: new Date().toISOString(),
  updatedBy: "Sistem Bawaan"
};

export const INITIAL_SYSTEM_ACCOUNTS: SystemUserAccount[] = [
  {
    id: "usr-sabto",
    nik: "JPF-WRH-0881",
    username: "sabto",
    name: "Sabto Agito",
    email: "SabtoAgito@gmail.com",
    role: "Admin Gudang",
    pin: "admin",
    department: "Gudang Bahan Pembantu (Feed Add)",
    status: "active",
    createdAt: "2026-01-01T08:00:00Z",
    notes: "Akun Petugas Utama Administrasi Gudang (Wewenang Penuh Edit Isi Laporan)"
  },
  {
    id: "usr-andri",
    nik: "JPF-WRH-0001",
    username: "andri",
    name: "Antonius Andri Waroto",
    email: "andri.waroto@japfa.com",
    role: "Head Of Wrh Sub.Dept",
    pin: "admin",
    department: "Warehouse Sub. Department",
    status: "active",
    createdAt: "2026-01-01T08:00:00Z",
    notes: "Kepala Sub Departemen Pergudangan (Wewenang Penuh Edit Isi Laporan)"
  },
  {
    id: "usr-budi",
    nik: "JPF-WRH-1042",
    username: "budi",
    name: "Budi Santoso",
    email: "budi.santoso@japfa.com",
    role: "Supervisor Gudang",
    pin: "123456",
    department: "Supervisi Logistik & Bahan Tambahan",
    status: "active",
    createdAt: "2026-01-10T08:00:00Z",
    notes: "Supervisor Operasional Gudang"
  },
  {
    id: "usr-joko",
    nik: "JPF-WRH-2105",
    username: "joko",
    name: "Joko Purnomo",
    email: "joko.purnomo@japfa.com",
    role: "Operator / Checker",
    pin: "123456",
    department: "Checker Karung & Label Pakan",
    status: "active",
    createdAt: "2026-01-15T08:00:00Z",
    notes: "Pemeriksa Fisik Karung dan Label Masuk/Keluar"
  },
  {
    id: "usr-hendri",
    nik: "JPF-WRH-0519",
    username: "hendri",
    name: "Hendri Kurniawan",
    email: "hendri.kurniawan@japfa.com",
    role: "Kepala Bagian Gudang",
    pin: "123456",
    department: "Kepala Bagian Gudang Unit Unit LPG",
    status: "active",
    createdAt: "2026-01-20T08:00:00Z",
    notes: "Manajemen Kepala Bagian Unit Gudang"
  },
  {
    id: "usr-tamu",
    nik: "TAMU-001",
    username: "tamu",
    name: "Tamu / Viewer",
    email: "tamu@japfa.com",
    role: "Tamu / Viewer",
    pin: "tamu",
    department: "Tamu / Audit Eksternal",
    status: "active",
    createdAt: "2026-02-01T08:00:00Z",
    notes: "Akun Tamu (Hanya Bisa Melihat - Dilarang Mengedit, Menghapus, & Menyimpan Semua Data)"
  }
];

// Backward-compatible exports for existing components
export interface PresetStaffAccount {
  id: string;
  name: string;
  email: string;
  nik: string;
  role: UserRole;
  pin: string;
  avatarColor: string;
  department: string;
}

export const PRESET_STAFF_ACCOUNTS: PresetStaffAccount[] = INITIAL_SYSTEM_ACCOUNTS.map((acc, index) => ({
  id: `staff-${index + 1}`,
  name: acc.name,
  email: acc.email,
  nik: acc.nik,
  role: acc.role,
  pin: acc.pin,
  avatarColor: acc.role.includes("Supervisor") ? "bg-amber-700 text-white" : acc.role.includes("Head") ? "bg-blue-700 text-white" : "bg-red-700 text-white",
  department: acc.department
}));

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = INITIAL_SYSTEM_ACCOUNTS.map((acc) => ({
  id: acc.id,
  name: acc.name,
  email: acc.email,
  role: acc.role,
  department: acc.department
}));

export interface RegisteredAccount {
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  aliases: string[];
}

export const REGISTERED_ACCOUNTS: RegisteredAccount[] = INITIAL_SYSTEM_ACCOUNTS.map((acc) => ({
  username: acc.username,
  name: acc.name,
  email: acc.email,
  password: acc.pin,
  role: acc.role,
  department: acc.department,
  aliases: [acc.username.toLowerCase(), acc.nik.toLowerCase(), acc.name.toLowerCase()]
}));
