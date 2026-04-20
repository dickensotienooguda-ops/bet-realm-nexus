import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, Mail, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — BetPro" },
      { name: "description", content: "Sign in to your BetPro account" },
    ],
  }),
  component: LoginPage,
});

const countries = [
  { code: "KE", name: "Kenya", prefix: "+254", flag: "🇰🇪" },
  { code: "NG", name: "Nigeria", prefix: "+234", flag: "🇳🇬" },
  { code: "TZ", name: "Tanzania", prefix: "+255", flag: "🇹🇿" },
];

function LoginPage() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [country, setCountry] = useState(countries[0]);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const fullPhone = `${country.prefix}${phone}`;

  const handleSendOtp = () => {
    if (phone.length < 6) {
      setError("Enter a valid phone number");
      return;
    }
    setError("");
    setStep("otp");
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError("");
    const { error: err } = await verifyOtp(fullPhone, otp);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // Update profile with country
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Get country ID
      const { data: countryData } = await supabase
        .from("countries")
        .select("id, currency_code")
        .eq("code", country.code)
        .single();

      if (countryData) {
        await supabase
          .from("profiles")
          .update({ phone: fullPhone, country_id: countryData.id })
          .eq("user_id", user.id);

        // Create wallet if doesn't exist
        const { data: existingWallet } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", user.id)
          .eq("currency_code", countryData.currency_code)
          .single();

        if (!existingWallet) {
          // Use server function for wallet creation (bypasses RLS)
          await fetch("/api/create-wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, currencyCode: countryData.currency_code }),
          });
        }
      }
    }

    setLoading(false);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Link to="/" className="inline-flex rounded-lg bg-surface-elevated p-2">
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="mx-auto mt-8 max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">B</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome to BetPro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "phone" ? "Enter your phone number to get started" : "Enter the OTP sent to your phone"}
          </p>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            {/* Country picker */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Country</label>
              <button
                onClick={() => setShowCountryPicker(!showCountryPicker)}
                className="flex w-full items-center justify-between rounded-xl bg-card px-4 py-3"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{country.flag}</span>
                  <span className="font-medium">{country.name}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {showCountryPicker && (
                <div className="mt-1 rounded-xl bg-card p-1">
                  {countries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCountry(c); setShowCountryPicker(false); }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left ${
                        c.code === country.code ? "bg-primary/10 text-primary" : "hover:bg-surface-elevated"
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-auto text-sm text-muted-foreground">{c.prefix}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone Number</label>
              <div className="flex items-center rounded-xl bg-card">
                <span className="flex items-center gap-1.5 border-r border-border px-3 py-3 text-sm font-medium">
                  <span>{country.flag}</span>
                  <span>{country.prefix}</span>
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="712345678"
                  className="flex-1 bg-transparent px-3 py-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              onClick={handleSendOtp}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
            >
              Send OTP
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Demo mode: OTP code is always <span className="font-bold text-primary">123456</span>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-card p-4 text-center">
              <Phone className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">OTP sent to</p>
              <p className="font-bold">{fullPhone}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Enter 6-digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full rounded-xl bg-card px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] outline-none placeholder:text-muted-foreground placeholder:tracking-[0.5em]"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || loading}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <button
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              className="w-full text-center text-sm text-primary"
            >
              Change phone number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
