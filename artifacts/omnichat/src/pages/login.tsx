import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, Eye, EyeOff, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@omnichat.io", role: "Full access" },
  { label: "Supervisor", email: "supervisor@omnichat.io", role: "Team management" },
  { label: "Agent", email: "sarah.k@omnichat.io", role: "Inbox only" },
];

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      navigate("/inbox");
    } else {
      setError(result.error ?? "Login failed.");
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("demo");
    setError(null);
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL — Brand ────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] flex-col bg-gradient-to-br from-violet-600 via-purple-600 to-blue-700 text-white p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-3 relative">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">OmniChat</span>
          </div>
        </Link>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center relative">
          <div className="max-w-md">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              Welcome back to your
              <br />
              <span className="text-violet-200">unified inbox</span>
            </h1>
            <p className="mt-4 text-violet-100 text-base leading-relaxed">
              Your team's conversations across WhatsApp, Instagram,
              and Facebook — ready and waiting.
            </p>

            {/* Floating feature cards */}
            <div className="mt-12 flex flex-col gap-3">
              {[
                { icon: Zap, text: "Real-time message routing" },
                { icon: MessageSquare, text: "All channels, one inbox" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-sm font-medium">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative text-xs text-violet-200">
          © {new Date().getFullYear()} OmniChat · Trusted by 3,500+ teams
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile logo */}
        <div className="lg:hidden p-6 border-b border-gray-100">
          <Link href="/">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">OmniChat</span>
            </div>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">

            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Sign in</h2>
              <p className="mt-1.5 text-sm text-gray-500">Enter your credentials to continue</p>
            </div>

            {/* Quick fill for the admin account */}
            <div className="mb-6 p-4 rounded-xl bg-violet-50 border border-violet-100">
              <p className="text-xs font-semibold text-violet-700 mb-2.5 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                Use your administrator credentials to sign in.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 text-sm pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold mt-1 shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-gray-400">
              Don't have an account?{" "}
              <a href="#pricing" onClick={() => window.location.href = "/#pricing"} className="text-violet-600 font-medium hover:underline">
                View plans
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
