import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { 
  SystemUserAccount, 
  LoginSystemConfig, 
  LoginAuditLog, 
  DEFAULT_LOGIN_SYSTEM_CONFIG, 
  INITIAL_SYSTEM_ACCOUNTS,
  UserRole
} from "../types/auth";

const CONFIG_STORAGE_KEY = "japfa_warehouse_login_config_v2";
const ACCOUNTS_STORAGE_KEY = "japfa_warehouse_system_accounts_v2";
const AUDIT_LOGS_STORAGE_KEY = "japfa_warehouse_login_audit_logs_v2";

/**
 * Mendapatkan konfigurasi sistem login dari localStorage atau default
 */
export function getLocalLoginConfig(): LoginSystemConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_LOGIN_SYSTEM_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn("Gagal membaca login config lokal:", e);
  }
  return DEFAULT_LOGIN_SYSTEM_CONFIG;
}

/**
 * Mendapatkan daftar akun petugas dari localStorage atau seed awal
 */
export function getLocalSystemAccounts(): SystemUserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Gagal membaca akun lokal:", e);
  }
  return INITIAL_SYSTEM_ACCOUNTS;
}

/**
 * Mendapatkan riwayat log audit login dari localStorage
 */
export function getLocalAuditLogs(): LoginAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Gagal membaca log audit lokal:", e);
  }
  return [];
}

/**
 * Menyimpan konfigurasi login ke Firestore & localStorage
 */
export async function saveLoginSystemConfig(config: LoginSystemConfig): Promise<void> {
  const updated = {
    ...config,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));

  try {
    await setDoc(doc(db, "system_settings", "login_config"), updated);
  } catch (e) {
    console.error("Gagal menyimpan login config ke Firestore:", e);
  }
}

/**
 * Menyimpan daftar akun petugas ke Firestore & localStorage
 */
export async function saveSystemAccounts(accounts: SystemUserAccount[]): Promise<void> {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

  try {
    await setDoc(doc(db, "system_settings", "user_accounts"), {
      accounts,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Gagal menyimpan akun ke Firestore:", e);
  }
}

/**
 * Mencatat aktivitas login ke audit log (lokal & Firestore)
 */
export async function recordLoginAuditLog(log: Omit<LoginAuditLog, "id" | "timestamp">): Promise<void> {
  const newLog: LoginAuditLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString()
  };

  const currentLogs = getLocalAuditLogs();
  const updatedLogs = [newLog, ...currentLogs].slice(0, 100); // Simpan 100 log terbaru
  localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));

  try {
    await setDoc(doc(db, "system_settings", "login_audit_logs"), {
      logs: updatedLogs,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Gagal menyimpan audit log ke Firestore:", e);
  }
}

/**
 * Membersihkan riwayat log audit
 */
export async function clearLoginAuditLogs(): Promise<void> {
  localStorage.removeItem(AUDIT_LOGS_STORAGE_KEY);
  try {
    await setDoc(doc(db, "system_settings", "login_audit_logs"), {
      logs: [],
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Gagal mereset audit logs di Firestore:", e);
  }
}

/**
 * Hook/Listener helper untuk sinkronisasi real-time
 */
export function subscribeToLoginSettings(
  onConfigChange: (config: LoginSystemConfig) => void,
  onAccountsChange: (accounts: SystemUserAccount[]) => void,
  onLogsChange?: (logs: LoginAuditLog[]) => void
) {
  // 1. Initial local trigger
  onConfigChange(getLocalLoginConfig());
  onAccountsChange(getLocalSystemAccounts());
  if (onLogsChange) {
    onLogsChange(getLocalAuditLogs());
  }

  // 2. Listen config
  const unsubConfig = onSnapshot(doc(db, "system_settings", "login_config"), (snap) => {
    if (snap.exists()) {
      const data = snap.data() as LoginSystemConfig;
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(data));
      onConfigChange(data);
    } else {
      // Seed default if empty
      const initial = DEFAULT_LOGIN_SYSTEM_CONFIG;
      setDoc(doc(db, "system_settings", "login_config"), initial).catch(console.warn);
    }
  }, (err) => console.warn("Firestore login_config listener:", err));

  // 3. Listen accounts
  const unsubAccounts = onSnapshot(doc(db, "system_settings", "user_accounts"), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.accounts)) {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(data.accounts));
        onAccountsChange(data.accounts);
      }
    } else {
      // Seed initial accounts if empty
      setDoc(doc(db, "system_settings", "user_accounts"), {
        accounts: INITIAL_SYSTEM_ACCOUNTS,
        updatedAt: new Date().toISOString()
      }).catch(console.warn);
    }
  }, (err) => console.warn("Firestore user_accounts listener:", err));

  // 4. Listen logs
  let unsubLogs = () => {};
  if (onLogsChange) {
    unsubLogs = onSnapshot(doc(db, "system_settings", "login_audit_logs"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.logs)) {
          localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(data.logs));
          onLogsChange(data.logs);
        }
      }
    }, (err) => console.warn("Firestore login_audit_logs listener:", err));
  }

  return () => {
    unsubConfig();
    unsubAccounts();
    unsubLogs();
  };
}
