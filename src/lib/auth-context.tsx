import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
  signUp: (email: string, password: string, phone?: string, countryCode?: string) => Promise<{ error: Error | null }>;
  signInWithPassword: (emailOrPhone: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

interface UserProfile {
  id: string;
  user_id: string;
  phone: string | null;
  display_name: string | null;
  country_id: string | null;
  is_verified: boolean;
  is_suspended: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Fetch profile
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single();
          setProfile(data as UserProfile | null);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data }) => setProfile(data as UserProfile | null));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, phone?: string, countryCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { phone, country_code: countryCode },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithPassword = async (emailOrPhone: string, password: string) => {
    const isEmail = emailOrPhone.includes("@");
    const { error } = await supabase.auth.signInWithPassword(
      isEmail ? { email: emailOrPhone, password } : { phone: emailOrPhone, password }
    );
    return { error: error ? new Error(error.message) : null };
  };

  // Mock OTP — always succeeds. In production, swap for real Twilio SMS
  const signInWithOtp = async (phone: string) => {
    // For mock: we just sign up with phone + password "123456"
    // In production, use supabase.auth.signInWithOtp({ phone })
    return { error: null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    // Mock OTP: accept "123456"
    if (token !== "123456") {
      return { error: new Error("Invalid OTP code. Use 123456 for demo.") };
    }
    // Sign up or sign in with phone as email equivalent
    const fakeEmail = `${phone.replace(/\+/g, "")}@betpro.local`;
    const { error: signUpError } = await supabase.auth.signUp({
      email: fakeEmail,
      password: `otp_${phone}_${token}`,
      options: { data: { phone } },
    });
    if (signUpError && signUpError.message.includes("already registered")) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: `otp_${phone}_${token}`,
      });
      return { error: signInError ? new Error(signInError.message) : null };
    }
    return { error: signUpError ? new Error(signUpError.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signUp, signInWithPassword, signInWithOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
