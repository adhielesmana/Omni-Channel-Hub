import { Link } from "wouter";
import {
  MessageSquare, Zap, Users, BarChart2, Shield,
  CheckCircle, ArrowRight, Star, ChevronRight,
  Inbox, BotMessageSquare, SlidersHorizontal,
  Globe, Phone, Clock, TrendingUp, HeartHandshake, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── SVG Channel Icons ──────────────────────────────────────────────────── */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <circle cx="24" cy="24" r="24" fill="#25D366" />
      <path d="M34.5 13.5C32 11 28.6 9.5 25 9.5 17.5 9.5 11.5 15.5 11.5 23c0 2.5.7 4.9 2 7L11 37l7.2-2.5c2.1 1.2 4.4 1.9 6.8 1.9 7.5 0 13.5-6 13.5-13.5 0-3.6-1.5-6.9-4-9.4zM25 34c-2.2 0-4.3-.6-6.2-1.8l-.5-.3-4.2 1.2 1.2-4.1-.3-.5C13.7 26.5 13 24.3 13 22c0-5.5 5.5-10 12-10 3.1 0 6 1.2 8.2 3.4 2.2 2.2 3.3 5.1 3.3 7.5C36.5 28.5 31.3 34 25 34zm6.1-8.9c-.3-.15-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.96 1.2-.18.2-.33.25-.63.1-1.35-.65-2.25-1.2-3.2-2.7-.25-.45.3-.4.8-1.4.1-.2.05-.35-.05-.5-.1-.15-.65-1.65-.95-2.3-.3-.65-.55-.55-.75-.55-.2 0-.4-.05-.65-.05-.25 0-.6.1-.9.4-.3.3-1.05 1-1.05 2.5s1.1 2.9 1.25 3.1c.15.2 2.4 3.65 5.85 5 2.2.9 3.05 1 4.15.85.65-.1 2-.75 2.3-1.5.3-.75.3-1.35.2-1.5-.1-.15-.3-.25-2.55-1.25z" fill="white" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <defs>
        <radialGradient id="ig2" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#ig2)" />
      <path d="M24 14.5c-2.6 0-2.9 0-3.9.06-1 .04-1.7.2-2.3.43a4.6 4.6 0 00-1.67 1.09 4.6 4.6 0 00-1.08 1.67c-.23.6-.4 1.3-.44 2.3-.04 1-.05 1.3-.05 3.9s0 2.9.06 3.9c.04 1 .2 1.7.43 2.3a4.6 4.6 0 001.09 1.67 4.6 4.6 0 001.67 1.08c.6.23 1.3.4 2.3.44 1 .04 1.3.05 3.9.05s2.9 0 3.9-.06c1-.04 1.7-.2 2.3-.43a4.84 4.84 0 002.75-2.75c.23-.6.4-1.3.44-2.3.04-1 .05-1.3.05-3.9s0-2.9-.06-3.9c-.04-1-.2-1.7-.43-2.3a4.6 4.6 0 00-1.09-1.67 4.6 4.6 0 00-1.67-1.08c-.6-.23-1.3-.4-2.3-.44-1-.04-1.3-.05-3.9-.05zm0 1.7c2.56 0 2.86 0 3.86.05.93.04 1.44.2 1.77.32.45.17.77.38 1.1.72.34.34.55.65.73 1.1.12.34.28.84.32 1.77.05 1 .05 1.3.05 3.86s0 2.86-.05 3.86c-.04.93-.2 1.44-.32 1.77a3 3 0 01-.72 1.1 3 3 0 01-1.1.73c-.34.12-.84.28-1.77.32-1 .05-1.3.05-3.86.05s-2.86 0-3.86-.05c-.93-.04-1.44-.2-1.77-.32a3 3 0 01-1.1-.72 3 3 0 01-.73-1.1c-.12-.34-.28-.84-.32-1.77-.05-1-.05-1.3-.05-3.86s0-2.86.05-3.86c.04-.93.2-1.44.32-1.77a3 3 0 01.72-1.1 3 3 0 011.1-.73c.34-.12.84-.28 1.77-.32 1-.05 1.3-.05 3.86-.05zM24 18.9a5.1 5.1 0 100 10.2A5.1 5.1 0 0024 18.9zm0 8.4a3.3 3.3 0 110-6.6 3.3 3.3 0 010 6.6zm5.3-8.6a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" fill="white" />
    </svg>
  );
}

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <circle cx="24" cy="24" r="24" fill="#0084FF" />
      <path d="M24 10C16.27 10 10 15.9 10 23.2c0 4.1 1.9 7.75 4.9 10.3V38l4.8-2.65c1.28.36 2.64.55 4.05.55 7.73 0 14-5.9 14-13.2S31.73 10 24 10zm1.4 17.8l-3.56-3.8-6.95 3.8 7.64-8.1 3.65 3.8 6.86-3.8-7.64 8.1z" fill="white" />
    </svg>
  );
}

/* ─── Mini App Screenshot ────────────────────────────────────────────────── */
function AppMockup() {
  const threads = [
    { name: "Emma Thompson", msg: "Hi, I need help with my order", time: "2m", unread: 2, active: true },
    { name: "Carlos Mendez", msg: "When will it arrive?", time: "8m", unread: 0, active: false },
    { name: "Aisha Patel", msg: "Thank you so much!", time: "1h", unread: 0, active: false },
    { name: "Zara Ahmed", msg: "Can I get a refund please?", time: "3h", unread: 1, active: false },
    { name: "Lucas Fernandez", msg: "I'd like to upgrade my plan", time: "5h", unread: 0, active: false },
  ];

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f1117]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1d27] border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 mx-4 h-5 rounded bg-[#252836] flex items-center px-3">
          <span className="text-[11px] text-gray-500">app.omnichat.io/inbox</span>
        </div>
      </div>

      <div className="flex h-80">
        {/* Sidebar */}
        <div className="w-12 bg-[#1a1d27] border-r border-white/5 flex flex-col items-center py-3 gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          {[Inbox, Users, Globe, BarChart2, SlidersHorizontal].map((Icon, i) => (
            <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center ${i === 0 ? "bg-violet-600/20" : ""}`}>
              <Icon className={`w-3.5 h-3.5 ${i === 0 ? "text-violet-400" : "text-gray-600"}`} />
            </div>
          ))}
        </div>

        {/* Thread list */}
        <div className="w-52 border-r border-white/5 bg-[#13151f] flex flex-col flex-shrink-0">
          <div className="px-3 py-2.5 border-b border-white/5">
            <div className="h-6 bg-[#252836] rounded-lg" />
          </div>
          <div className="flex gap-2 px-3 py-2">
            {["All", "Open", "Pending"].map((t, i) => (
              <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${i === 0 ? "bg-violet-600 text-white" : "text-gray-500"}`}>{t}</span>
            ))}
          </div>
          {threads.map((t, i) => (
            <div key={i} className={`px-3 py-2.5 flex items-center gap-2 border-b border-white/[0.03] ${t.active ? "bg-violet-600/10" : ""}`}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white">
                {t.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className={`text-[10px] font-semibold truncate ${t.active ? "text-violet-300" : "text-gray-300"}`}>{t.name}</span>
                  <span className="text-[9px] text-gray-600 flex-shrink-0 ml-1">{t.time}</span>
                </div>
                <div className="text-[9px] text-gray-600 truncate">{t.msg}</div>
              </div>
              {t.unread > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-violet-500 text-white text-[8px] flex items-center justify-center flex-shrink-0 font-bold">{t.unread}</span>
              )}
            </div>
          ))}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col bg-[#0f1117] min-w-0">
          <div className="px-4 py-2.5 border-b border-white/5 bg-[#13151f] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-[9px] font-bold text-white">ET</div>
            <div>
              <div className="text-xs font-semibold text-gray-200">Emma Thompson</div>
              <div className="text-[9px] text-green-400 font-medium">via WhatsApp · Open</div>
            </div>
            <div className="ml-auto flex gap-1.5">
              <div className="h-5 px-2 rounded-full bg-violet-600/20 text-violet-400 text-[9px] flex items-center font-medium">Assign</div>
              <div className="h-5 px-2 rounded-full bg-green-500/20 text-green-400 text-[9px] flex items-center font-medium">Resolve</div>
            </div>
          </div>

          <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
            <div className="self-start max-w-[70%] bg-[#1e2130] rounded-2xl rounded-tl-sm px-3 py-2 text-[10px] text-gray-300">
              Hi, I need some help with my recent order.
            </div>
            <div className="self-end max-w-[70%] bg-violet-600 rounded-2xl rounded-tr-sm px-3 py-2 text-[10px] text-white">
              Of course! Could you share your order number?
            </div>
            <div className="self-start max-w-[75%] bg-[#1e2130] rounded-2xl rounded-tl-sm px-3 py-2 text-[10px] text-gray-300">
              Sure, it's #ORD-2948. I haven't received it yet 😔
            </div>
            <div className="self-end max-w-[75%] bg-violet-600 rounded-2xl rounded-tr-sm px-3 py-2 text-[10px] text-white">
              Let me check that for you right now!
            </div>
          </div>

          <div className="p-2.5 border-t border-white/5 bg-[#13151f]">
            <div className="h-7 rounded-lg bg-[#1e2130] flex items-center px-3 gap-2">
              <span className="text-[10px] text-gray-600">Type a message…</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Data ───────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Inbox,
    title: "Unified Inbox",
    desc: "Every WhatsApp, Instagram, and Facebook DM in one place. No tab-switching, no missed messages.",
    color: "text-violet-400",
    glow: "shadow-violet-500/20",
    border: "border-violet-500/20",
    bg: "bg-violet-500/5",
  },
  {
    icon: Zap,
    title: "Smart Routing",
    desc: "Round-robin or manual assignment. The right conversation lands on the right desk, automatically.",
    color: "text-amber-400",
    glow: "shadow-amber-500/20",
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Assign, mention, and leave internal notes. Your team stays in sync without CCing emails.",
    color: "text-sky-400",
    glow: "shadow-sky-500/20",
    border: "border-sky-500/20",
    bg: "bg-sky-500/5",
  },
  {
    icon: BarChart2,
    title: "Live Analytics",
    desc: "Agent performance, channel volume, and department workload — all updated in real time.",
    color: "text-emerald-400",
    glow: "shadow-emerald-500/20",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  {
    icon: BotMessageSquare,
    title: "Webhook Automation",
    desc: "Inbound messages auto-create contacts and conversations via Meta's Cloud API. Zero manual work.",
    color: "text-pink-400",
    glow: "shadow-pink-500/20",
    border: "border-pink-500/20",
    bg: "bg-pink-500/5",
  },
  {
    icon: Shield,
    title: "Role-based Access",
    desc: "Admin, Supervisor, Agent. Each role sees only what they need. Security built in, not bolted on.",
    color: "text-slate-400",
    glow: "shadow-slate-500/20",
    border: "border-slate-500/20",
    bg: "bg-slate-500/5",
  },
];

const STATS = [
  { value: "12M+", label: "Messages / month", icon: MessageSquare },
  { value: "3,500+", label: "Teams worldwide", icon: Globe },
  { value: "< 90s", label: "Avg. first reply", icon: Clock },
  { value: "97%", label: "Customer satisfaction", icon: HeartHandshake },
];

const TESTIMONIALS = [
  {
    text: "OmniChat cut our response time from 8 minutes to under 90 seconds. CSAT went from 74% to 96% in the first month.",
    name: "Daniela Reyes",
    title: "Head of CX · TechNova",
    initials: "DR",
    bg: "from-violet-600 to-purple-700",
  },
  {
    text: "Managing three channels across two shifts used to be chaos. Now my whole team works from one screen.",
    name: "Marcus Chen",
    title: "Support Lead · ShopBridge",
    initials: "MC",
    bg: "from-sky-600 to-blue-700",
  },
  {
    text: "We onboarded in a single afternoon. The department routing alone replaced two full-time coordinators.",
    name: "Priya Nair",
    title: "Operations Director · Lumia Health",
    initials: "PN",
    bg: "from-emerald-600 to-teal-700",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$49",
    per: "/mo",
    desc: "Perfect for small teams.",
    highlight: false,
    features: ["5 agents", "2 channels", "1 department", "7-day history", "Email support"],
    cta: "Start free trial",
  },
  {
    name: "Growth",
    price: "$149",
    per: "/mo",
    desc: "For scaling support teams.",
    highlight: true,
    badge: "Most popular",
    features: ["25 agents", "All 3 channels", "Unlimited departments", "90-day history", "Analytics", "Priority support"],
    cta: "Start free trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    desc: "Dedicated SLA & infrastructure.",
    highlight: false,
    features: ["Unlimited agents", "Unlimited channels", "Custom routing", "Unlimited history", "SLA guarantee", "Dedicated CSM", "Self-hosted option"],
    cta: "Contact sales",
  },
];

const LOGOS = ["Shopify", "Zendesk", "Salesforce", "HubSpot", "Slack", "Zapier"];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#07080f] text-white antialiased">

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#07080f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">OmniChat</span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#product" className="hover:text-white transition-colors">Product</a>
            <a href="#channels" className="hover:text-white transition-colors">Channels</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                Log in
              </button>
            </Link>
            <Link href="/login">
              <button className="text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-violet-600/25">
                Get started free
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-16 px-6">
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-72 h-72 bg-pink-600/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-5xl text-center relative">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Now live · Meta Cloud API integration
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[74px] font-extrabold leading-[1.04] tracking-tight text-white">
            The messaging platform
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
              built for your whole team
            </span>
          </h1>

          <p className="mt-7 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            OmniChat unifies WhatsApp Business, Instagram DM, and Facebook Messenger
            into one collaborative inbox — with smart routing, live analytics, and
            role-based access built in from day one.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <button className="inline-flex items-center gap-2 px-8 h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors shadow-xl shadow-violet-600/30">
                Start for free — no card needed
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <a href="#product">
              <button className="inline-flex items-center gap-2 px-8 h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors">
                See how it works
              </button>
            </a>
          </div>

          <p className="mt-4 text-xs text-gray-600">
            14-day free trial · No credit card · Cancel anytime
          </p>
        </div>

        {/* App mockup */}
        <div id="product" className="mx-auto mt-16 max-w-5xl relative">
          {/* Glow behind screenshot */}
          <div className="absolute inset-x-20 -top-4 h-20 bg-violet-600/20 blur-2xl rounded-full" />
          <AppMockup />
        </div>
      </section>

      {/* ── TRUST LOGOS ────────────────────────────────────────────────── */}
      <section className="py-14 border-y border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs text-gray-600 uppercase tracking-widest font-semibold mb-8">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
            {LOGOS.map((logo) => (
              <span key={logo} className="text-sm font-bold text-gray-700 hover:text-gray-500 transition-colors tracking-wide">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center text-center p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{value}</div>
              <div className="mt-1 text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CHANNELS ───────────────────────────────────────────────────── */}
      <section id="channels" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-semibold mb-5">
              <Layers className="w-3 h-3" /> Channels
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              One platform. Every channel your{" "}
              <br className="hidden sm:block" />
              customers already use.
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              Connect natively to Meta's Cloud API — no middleware, no delays.
              New contacts and conversations are created automatically on first contact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                Icon: WhatsAppIcon,
                name: "WhatsApp Business",
                desc: "Text, images, documents, templates. Handle multiple WABA numbers with per-channel routing.",
                badge: "Most used",
                badgeStyle: "bg-green-500/10 text-green-400 border-green-500/20",
              },
              {
                Icon: InstagramIcon,
                name: "Instagram DM",
                desc: "Reply to DMs and story mentions. Full conversation history across all Instagram interactions.",
                badge: "",
                badgeStyle: "",
              },
              {
                Icon: MessengerIcon,
                name: "Facebook Messenger",
                desc: "Manage page messages and respond as your brand across all your Facebook pages.",
                badge: "",
                badgeStyle: "",
              },
            ].map(({ Icon, name, desc, badge, badgeStyle }) => (
              <div
                key={name}
                className="group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all"
              >
                {badge && (
                  <span className={`absolute top-4 right-4 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
                    {badge}
                  </span>
                )}
                <Icon className="w-11 h-11 mb-5" />
                <h3 className="font-semibold text-white text-base mb-2">{name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold mb-5">
              <TrendingUp className="w-3 h-3" /> Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Everything your support team needs,
              <br className="hidden sm:block" />
              and nothing they don't.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`p-6 rounded-2xl border ${f.border} ${f.bg} hover:scale-[1.01] transition-transform`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Loved by support teams worldwide
            </h2>
            <p className="mt-3 text-gray-400 text-sm">4.9/5 from 800+ reviews across G2 and Capterra</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col gap-5 p-7 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.bg} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold mb-5">
              <Phone className="w-3 h-3" /> Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Simple pricing, no surprises
            </h2>
            <p className="mt-3 text-gray-400 text-sm">All plans include a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl p-7 flex flex-col gap-6 border transition-all ${
                  p.highlight
                    ? "bg-violet-600 border-violet-500 shadow-2xl shadow-violet-500/20 md:-mt-3"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white text-violet-700 shadow">
                      Most popular
                    </span>
                  </div>
                )}

                <div>
                  <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${p.highlight ? "text-violet-200" : "text-gray-500"}`}>
                    {p.name}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${p.highlight ? "text-white" : "text-white"}`}>{p.price}</span>
                    {p.per && <span className={`text-sm mb-1.5 ${p.highlight ? "text-violet-200" : "text-gray-500"}`}>{p.per}</span>}
                  </div>
                  <p className={`mt-1 text-sm ${p.highlight ? "text-violet-200" : "text-gray-500"}`}>{p.desc}</p>
                </div>

                <ul className="flex flex-col gap-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${p.highlight ? "text-violet-200" : "text-violet-400"}`} />
                      <span className={p.highlight ? "text-white" : "text-gray-300"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/login">
                  <button
                    className={`w-full h-10 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      p.highlight
                        ? "bg-white text-violet-700 hover:bg-violet-50"
                        : "border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    }`}
                  >
                    {p.cta} <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-blue-600/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-600/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-3xl text-center relative">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-xl shadow-violet-500/30 mb-8">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Start responding faster today
          </h2>
          <p className="mt-5 text-gray-400 max-w-xl mx-auto leading-relaxed">
            Join thousands of support teams that ditched the chaos and built a single,
            powerful hub for every customer conversation.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <button className="inline-flex items-center gap-2 px-10 h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors shadow-xl shadow-violet-600/30">
                Get started free
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-600">14-day trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-12 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-white">OmniChat</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                The omnichannel messaging platform for modern B2B support teams.
              </p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <div className="font-semibold text-gray-400 mb-3 text-xs uppercase tracking-wider">Product</div>
                <ul className="space-y-2">
                  {["Features", "Channels", "Pricing", "Changelog"].map(l => (
                    <li key={l}><a href="#" className="text-gray-600 hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-gray-400 mb-3 text-xs uppercase tracking-wider">Company</div>
                <ul className="space-y-2">
                  {["About", "Blog", "Careers", "Contact"].map(l => (
                    <li key={l}><a href="#" className="text-gray-600 hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-gray-400 mb-3 text-xs uppercase tracking-wider">Legal</div>
                <ul className="space-y-2">
                  <li><Link href="/privacy" className="text-gray-600 hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-gray-600 hover:text-white transition-colors">Terms of Service</Link></li>
                  <li><Link href="/data-deletion" className="text-gray-600 hover:text-white transition-colors">Data Deletion</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-700">© {new Date().getFullYear()} OmniChat Inc. All rights reserved.</p>
            <p className="text-xs text-gray-700">Made with ❤ for support teams worldwide</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
