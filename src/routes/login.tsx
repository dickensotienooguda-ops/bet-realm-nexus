import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login or Sign Up — BetPro" },
      { name: "description", content: "Sign in or create your BetPro account" },
    ],
  }),
  component: LoginPage,
});

const countries = [
  { code: "KE", name: "Kenya", prefix: "+254", flag: "🇰🇪" },
  { code: "NG", name: "Nigeria", prefix: "+234", flag: "🇳🇬" },
  { code: "TZ", name: "Tanzania", prefix: "+255", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", prefix: "+256", flag: "🇺🇬" },
];

function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [country, setCountry] = useState(countries[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setError(""); setInfo(""); };

  const handleSignIn = async () => {
    reset();
    if (!email || !password) {
      setError("Enter email and password");
      return;
    }
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate({ to: "/" });
  };

  const handleSignUp = async () => {
    reset();
    if (!fullName.trim()) return setError("Enter your full name");
    if (!email.includes("@")) return setError("Enter a valid email");
    if (phone.replace(/\D/g, "").length < 9) return setError("Enter a valid phone number");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    const fullPhone = `${country.prefix}${phone.replace(/^0+/, "")}`;
    const { error: err } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      phone: fullPhone,
      countryCode: country.code,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setInfo("Account created! Check your email to verify, then sign in.");
    setMode("signin");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Link to="/" className="inline-flex rounded-lg bg-surface-elevated p-2">
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="mx-auto mt-6 max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <span className="text-xl font-bold text-primary-foreground">B</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome to BetPro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-card p-1">
          <button
            onClick={() => { setMode("signin"); reset(); }}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${
              mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); reset(); }}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${
              mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl bg-card px-4 py-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl bg-card px-4 py-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
          </div>

          {mode === "signup" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Country</label>
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="flex w-full items-center justify-between rounded-xl bg-card px-4 py-3"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{country.flag}</span>
                    <span className="text-sm font-medium">{country.name}</span>
                    <span className="text-sm text-muted-foreground">{country.prefix}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {showCountryPicker && (
                  <div className="mt-1 rounded-xl bg-card p-1">
                    {countries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { setCountry(c); setShowCountryPicker(false); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left ${
                          c.code === country.code ? "bg-primary/10 text-primary" : "hover:bg-surface-elevated"
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="ml-auto text-sm text-muted-foreground">{c.prefix}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone Number</label>
                <div className="flex items-center rounded-xl bg-card">
                  <span className="border-r border-border px-3 py-3 text-sm font-medium">{country.prefix}</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="712345678"
                    className="flex-1 bg-transparent px-3 py-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full rounded-xl bg-card px-4 py-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl bg-card px-4 py-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          {info && <p className="text-sm font-medium text-won">{info}</p>}

          <button
            onClick={mode === "signin" ? handleSignIn : handleSignUp}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
