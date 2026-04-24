import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    countryCode: string;
  }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
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
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();
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
          .maybeSingle()
          .then(({ data }) => setProfile(data as UserProfile | null));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async ({ email, password, fullName, phone, countryCode }: {
    email: string; password: string; fullName: string; phone: string; countryCode: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone, country_code: countryCode },
      },
    });
    if (error) return { error: new Error(error.message) };

    // Best-effort: update profile + create wallet for the country
    const userId = data.user?.id;
    if (userId) {
      const { data: countryData } = await supabase
        .from("countries")
        .select("id, currency_code")
        .eq("code", countryCode)
        .maybeSingle();

      await supabase
        .from("profiles")
        .update({
          phone,
          display_name: fullName,
          country_id: countryData?.id ?? null,
        })
        .eq("user_id", userId);

      if (countryData) {
        try {
          await fetch("/api/create-wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, currencyCode: countryData.currency_code }),
          });
        } catch { /* ignore */ }
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
