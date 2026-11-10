import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { AppUser, UserRole, DEMO_ACCOUNTS, REGISTERED_ACCOUNTS } from "../types/auth";

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginWithGoogle: () => Promise<boolean>;
  loginWithEmailPassword: (email: string, pass: string, role?: UserRole) => Promise<boolean>;
  registerWithEmailPassword: (email: string, pass: string, name: string, role: UserRole) => Promise<boolean>;
  loginWithDemo: (demoId: string) => void;
  logout: () => Promise<void>;
  updateUserRole: (newRole: UserRole) => void;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = "japfa_warehouse_active_user";
const LOCAL_STORAGE_ROLE_KEY = "japfa_warehouse_active_role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load user from localStorage", e);
    }
    // Starts unauthenticated so that the login screen appears upfront
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Derive appropriate default role
        const savedRole = localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as UserRole | null;
        let assignedRole: UserRole = savedRole || "Admin Gudang";

        const emailLower = (firebaseUser.email || "").toLowerCase();
        if (!savedRole) {
          if (emailLower.includes("sabto")) {
            assignedRole = "Admin Gudang";
          } else if (emailLower.includes("andri") || emailLower.includes("waroto")) {
            assignedRole = "Head Of Wrh Sub.Dept";
          } else if (emailLower.includes("spv") || emailLower.includes("supervisor")) {
            assignedRole = "Supervisor Gudang";
          }
        }

        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Petugas Gudang",
          photoURL: firebaseUser.photoURL,
          role: assignedRole,
          department: assignedRole === "Head Of Wrh Sub.Dept" ? "Warehouse Sub. Department" : "Warehouse & Inventory",
          isOnline: true,
          provider: firebaseUser.providerData[0]?.providerId === "google.com" ? "google" : "password",
          lastLogin: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        };

        setUser(appUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
      } else {
        // If not firebaseUser, retain demo user or keep as is if demo
        setUser((prev) => {
          if (prev && prev.provider === "demo") {
            return prev;
          }
          return null;
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openLoginModal = () => {
    setAuthError(null);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setAuthError(null);
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  // Google Login via Firebase Popup
  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const savedRole = localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as UserRole | null;
      let assignedRole: UserRole = savedRole || "Admin Gudang";
      const emailLower = (fbUser.email || "").toLowerCase();
      if (!savedRole) {
        if (emailLower.includes("sabto")) {
          assignedRole = "Admin Gudang";
        } else if (emailLower.includes("andri") || emailLower.includes("waroto")) {
          assignedRole = "Head Of Wrh Sub.Dept";
        }
      }

      const loggedUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Petugas Gudang",
        photoURL: fbUser.photoURL,
        role: assignedRole,
        department: "Warehouse & Inventory",
        isOnline: true,
        provider: "google",
        lastLogin: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      };

      setUser(loggedUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loggedUser));
      closeLoginModal();
      return true;
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setAuthError("Proses masuk Google dibatalkan pengguna.");
      } else if (err.code === "auth/network-request-failed") {
        setAuthError("Gagal terhubung ke jaringan internet. Periksa koneksi Anda.");
      } else {
        setAuthError(err.message || "Gagal masuk dengan akun Google.");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Username/Email & Password Login
  const loginWithEmailPassword = async (identifier: string, pass: string, preferredRole?: UserRole): Promise<boolean> => {
    const cleanUser = (identifier || "").trim();
    const cleanPass = (pass || "").trim();

    if (!cleanUser) {
      setAuthError("Harap masukkan Nama Pengguna.");
      return false;
    }
    if (!cleanPass) {
      setAuthError("Harap masukkan Kata Sandi.");
      return false;
    }

    setIsLoading(true);
    setAuthError(null);

    // 1. Check against officially registered accounts:
    //    1. sabto -> admin
    //    2. Antonius Andri Waroto -> admin
    //    3. Tamu -> tamu
    const matchedAccount = REGISTERED_ACCOUNTS.find(acc => 
      acc.username.toLowerCase() === cleanUser.toLowerCase() || 
      acc.name.toLowerCase() === cleanUser.toLowerCase() ||
      acc.aliases.some(alias => alias.toLowerCase() === cleanUser.toLowerCase())
    );

    if (matchedAccount) {
      if (matchedAccount.password !== cleanPass) {
        setIsLoading(false);
        setAuthError("Kata sandi salah. Silakan periksa kembali kata sandi Anda.");
        return false;
      }

      // Password matches!
      const assignedRole: UserRole = preferredRole || matchedAccount.role;
      const loggedUser: AppUser = {
        uid: `usr-${matchedAccount.username.toLowerCase().replace(/\s+/g, "-")}`,
        email: matchedAccount.email,
        displayName: matchedAccount.name,
        photoURL: null,
        role: assignedRole,
        department: matchedAccount.department,
        isOnline: true,
        provider: "password",
        lastLogin: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      };

      setUser(loggedUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loggedUser));
      localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, assignedRole);
      closeLoginModal();
      setIsLoading(false);
      return true;
    }

    // 2. Fallback to Firebase Email/Password Auth if identifier looks like an email
    if (cleanUser.includes("@")) {
      try {
        const result = await signInWithEmailAndPassword(auth, cleanUser, cleanPass);
        const fbUser = result.user;
        const assignedRole: UserRole = preferredRole || (localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as UserRole) || "Admin Gudang";

        const loggedUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || cleanUser.split("@")[0],
          photoURL: fbUser.photoURL,
          role: assignedRole,
          department: "Warehouse & Inventory",
          isOnline: true,
          provider: "password",
          lastLogin: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        };

        setUser(loggedUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loggedUser));
        closeLoginModal();
        setIsLoading(false);
        return true;
      } catch (err: any) {
        console.error("Firebase email login error:", err);
      }
    }

    setIsLoading(false);
    setAuthError("Nama pengguna atau kata sandi salah. Gunakan akun yang terdaftar (sabto, Antonius Andri Waroto, atau Tamu).");
    return false;
  };

  // Email & Password Register
  const registerWithEmailPassword = async (email: string, pass: string, name: string, role: UserRole): Promise<boolean> => {
    if (!pass || pass.trim().length < 6) {
      setAuthError("Kata sandi harus minimal 6 karakter.");
      return false;
    }

    try {
      setIsLoading(true);
      setAuthError(null);
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = result.user;
      
      // Update display name
      if (name) {
        await updateProfile(fbUser, { displayName: name });
      }

      const newUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: name || email.split("@")[0],
        photoURL: null,
        role: role || "Admin Gudang",
        department: role === "Head Of Wrh Sub.Dept" ? "Warehouse Sub. Department" : "Warehouse & Inventory",
        isOnline: true,
        provider: "password",
        lastLogin: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      };

      setUser(newUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
      localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, role);
      closeLoginModal();
      return true;
    } catch (err: any) {
      console.error("Register error:", err);
      // If operation is not allowed by Firebase Console, gracefully create internal employee account
      if (err.code === "auth/operation-not-allowed" || err.code === "auth/admin-restricted-operation") {
        const newUser: AppUser = {
          uid: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          email: email,
          displayName: name || email.split("@")[0],
          photoURL: null,
          role: role || "Admin Gudang",
          department: role === "Head Of Wrh Sub.Dept" ? "Warehouse Sub. Department" : "Warehouse & Inventory",
          isOnline: true,
          provider: "password",
          lastLogin: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        };

        try {
          const raw = localStorage.getItem("japfa_registered_employees");
          const list = raw ? JSON.parse(raw) : [];
          list.push({ email, name, role });
          localStorage.setItem("japfa_registered_employees", JSON.stringify(list));
        } catch (e) {
          console.warn("Storage warning:", e);
        }

        setUser(newUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
        localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, role);
        closeLoginModal();
        return true;
      }

      if (err.code === "auth/email-already-in-use") {
        setAuthError("Email sudah terdaftar. Silakan pilih tab Masuk.");
      } else if (err.code === "auth/weak-password") {
        setAuthError("Kata sandi terlalu pendek (minimal 6 karakter).");
      } else {
        setAuthError(err.message || "Gagal membuat akun baru.");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Account Login (instant, reliable for offline and rapid testing)
  const loginWithDemo = (demoId: string) => {
    const demo = DEMO_ACCOUNTS.find((a) => a.id === demoId) || DEMO_ACCOUNTS[0];
    const demoUser: AppUser = {
      uid: demo.id,
      email: demo.email,
      displayName: demo.name,
      role: demo.role,
      department: demo.department,
      isOnline: true,
      provider: "demo",
      lastLogin: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    };

    setUser(demoUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
    localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, demo.role);
    closeLoginModal();
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Signout error:", e);
    }
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  // Update Role in active session
  const updateUserRole = (newRole: UserRole) => {
    if (!user) return;
    const updated: AppUser = {
      ...user,
      role: newRole,
      department: newRole === "Head Of Wrh Sub.Dept" ? "Warehouse Sub. Department" : "Warehouse & Inventory"
    };
    setUser(updated);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
    localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        loginWithGoogle,
        loginWithEmailPassword,
        registerWithEmailPassword,
        loginWithDemo,
        logout,
        updateUserRole,
        authError,
        clearAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
