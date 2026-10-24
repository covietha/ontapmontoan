import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  fbSignOut, 
  onAuthStateChanged, 
  FirebaseUser,
  db
} from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

export const ADMIN_EMAIL = 'viethathd@gmail.com';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole;
  isTeacher: boolean;
  isRootAdmin: boolean;
  isTrialMode: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  loginWithSchoolAccount: (username: string, password: string, portalRole?: 'student' | 'teacher') => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  enterTrialMode: (role?: UserRole) => void;
  loginAsDemoUser: (asRole: UserRole) => void;
  logout: () => Promise<void>;
  switchRoleForTesting: (newRole: UserRole) => void;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TRIAL_STORAGE_KEY = 'thpt_math_trial_session';
const SCHOOL_TOKEN_KEY = 'thpt_math_school_token';
const SCHOOL_PROFILE_KEY = 'thpt_math_school_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isTrialMode, setIsTrialMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync with Firebase Auth state or School Account session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        setIsTrialMode(false);
        localStorage.removeItem(TRIAL_STORAGE_KEY);
        localStorage.removeItem(SCHOOL_TOKEN_KEY);
        localStorage.removeItem(SCHOOL_PROFILE_KEY);

        const isDefaultRoot = fbUser.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile({
              ...data,
              role: isDefaultRoot ? 'teacher' : (data.role || 'student')
            });
          } else {
            const initialRole: UserRole = isDefaultRoot ? 'teacher' : 'student';
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || (initialRole === 'teacher' ? 'Thầy Việt Hà' : 'Học sinh Toán 12'),
              role: initialRole,
              createdAt: new Date().toISOString()
            };

            try {
              await setDoc(userDocRef, newProfile);
            } catch (err) {
              console.warn('Could not persist profile to Firestore, using memory:', err);
            }
            setProfile(newProfile);
          }
        } catch (error) {
          console.warn('Firestore user fetch failed, creating fallback profile:', error);
          setProfile({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || (isDefaultRoot ? 'Thầy Việt Hà' : 'Học sinh Toán 12'),
            role: isDefaultRoot ? 'teacher' : 'student',
            createdAt: new Date().toISOString()
          });
        }
        setLoading(false);
      } else {
        // No Firebase user. Check if there is an active School Account session
        const savedToken = localStorage.getItem(SCHOOL_TOKEN_KEY);
        const savedProfile = localStorage.getItem(SCHOOL_PROFILE_KEY);

        if (savedToken && savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile) as UserProfile;
            setProfile(parsed);
            setUser(null);
            setIsTrialMode(false);
            setLoading(false);
            return;
          } catch {
            localStorage.removeItem(SCHOOL_TOKEN_KEY);
            localStorage.removeItem(SCHOOL_PROFILE_KEY);
          }
        }

        // Check if there was an explicit trial session
        const savedTrial = localStorage.getItem(TRIAL_STORAGE_KEY);
        if (savedTrial) {
          try {
            const parsed = JSON.parse(savedTrial);
            setProfile(parsed);
            setIsTrialMode(true);
          } catch {
            setProfile(null);
            setIsTrialMode(false);
          }
        } else {
          // Clean unauthenticated state -> Displays LoginScreen
          setProfile(null);
          setIsTrialMode(false);
        }
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // School centralized login
  const loginWithSchoolAccount = async (
    username: string, 
    password: string, 
    portalRole?: 'student' | 'teacher'
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      localStorage.removeItem(TRIAL_STORAGE_KEY);

      const res = await fetch('/api/auth/school-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, portalRole })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
        };
      }

      // Client guard: Validate portal and role consistency
      if (portalRole && data.profile.role !== portalRole) {
        const expectedLabel = portalRole === 'teacher' ? 'Giáo viên' : 'Học sinh';
        const otherPortal = portalRole === 'teacher' ? 'Học sinh đăng nhập' : 'Giáo viên đăng nhập';
        return {
          success: false,
          error: `Cửa sổ này chỉ dành cho ${expectedLabel}. Tài khoản của bạn thuộc phân hệ khác, vui lòng chuyển sang tab "${otherPortal}".`
        };
      }

      // Store school token and user profile
      localStorage.setItem(SCHOOL_TOKEN_KEY, data.token);
      localStorage.setItem(SCHOOL_PROFILE_KEY, JSON.stringify(data.profile));

      setProfile(data.profile);
      setUser(null);
      setIsTrialMode(false);

      return { success: true };
    } catch (err: any) {
      console.error('School Login Request Failed:', err);
      return {
        success: false,
        error: err?.message || 'Không thể kết nối đến máy chủ xác thực nhà trường.'
      };
    } finally {
      setLoading(false);
    }
  };

  // Google Login (for Root Admin viethathd@gmail.com)
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      localStorage.removeItem(TRIAL_STORAGE_KEY);
      localStorage.removeItem(SCHOOL_TOKEN_KEY);
      localStorage.removeItem(SCHOOL_PROFILE_KEY);

      const res = await signInWithPopup(auth, googleProvider);
      const isRoot = res.user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

      const userProf: UserProfile = {
        uid: res.user.uid,
        email: res.user.email || '',
        displayName: res.user.displayName || (isRoot ? 'Thầy Việt Hà' : 'Giáo viên'),
        role: isRoot ? 'teacher' : 'student',
        createdAt: new Date().toISOString(),
      };

      setUser(res.user);
      setProfile(userProf);
      setIsTrialMode(false);

      try {
        await setDoc(doc(db, 'users', res.user.uid), userProf);
      } catch (err) {
        // Silent fallback
      }
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const enterTrialMode = (role: UserRole = 'student') => {
    const isTeacherRole = role === 'teacher';
    const trialProfile: UserProfile = {
      uid: isTeacherRole ? 'trial-teacher-id' : 'trial-student-id',
      username: isTeacherRole ? 'GV-TEST' : 'HS-TEST',
      email: isTeacherRole ? 'giaovien.trainghiem@thptmath360.vn' : 'hocsinh.trainghiem@thptmath360.vn',
      displayName: isTeacherRole ? 'Giáo viên trải nghiệm' : 'Học sinh trải nghiệm',
      role: isTeacherRole ? 'teacher' : 'student',
      classroom: isTeacherRole ? 'Tổ Toán' : '12A1',
      createdAt: new Date().toISOString(),
    };

    setProfile(trialProfile);
    setIsTrialMode(true);
    setUser(null);
    localStorage.removeItem(SCHOOL_TOKEN_KEY);
    localStorage.removeItem(SCHOOL_PROFILE_KEY);
    localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(trialProfile));
  };

  const loginAsDemoUser = (asRole: UserRole) => {
    enterTrialMode(asRole);
  };

  const switchRoleForTesting = (newRole: UserRole) => {
    if (!profile) return;
    const updated: UserProfile = { ...profile, role: newRole };
    setProfile(updated);
    if (isTrialMode) {
      localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    localStorage.removeItem(TRIAL_STORAGE_KEY);
    localStorage.removeItem(SCHOOL_TOKEN_KEY);
    localStorage.removeItem(SCHOOL_PROFILE_KEY);
    localStorage.removeItem('thpt_math_demo_user');
    setUser(null);
    setProfile(null);
    setIsTrialMode(false);
  };

  const role: UserRole = profile?.role || 'student';
  const isRootAdmin = profile?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isTeacher = role === 'teacher' || isRootAdmin;
  const isAuthenticated = profile !== null || user !== null;

  const getIdToken = async (): Promise<string | null> => {
    // 1. If signed in with Firebase user
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken();
      } catch (e) {
        console.warn('Could not get Firebase ID token:', e);
      }
    }

    // 2. If signed in with School session token
    const schoolToken = localStorage.getItem(SCHOOL_TOKEN_KEY);
    if (schoolToken) {
      return schoolToken;
    }

    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isTeacher,
        isRootAdmin,
        isTrialMode,
        isAuthenticated,
        loading,
        loginWithSchoolAccount,
        loginWithGoogle,
        enterTrialMode,
        loginAsDemoUser,
        logout,
        switchRoleForTesting,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
