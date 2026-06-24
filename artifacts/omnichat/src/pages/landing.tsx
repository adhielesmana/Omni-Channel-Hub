import { Link } from "wouter";
import {
  MessageSquare, Zap, Users, BarChart2, Shield, Globe,
  CheckCircle, ArrowRight, Star, ChevronRight, Inbox,
  BotMessageSquare, Bell, SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Inline SVG channel icons ──────────────────────────────────────────── */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#25D366" />
      <path d="M34.5 13.5C32 11 28.6 9.5 25 9.5C17.5 9.5 11.5 15.5 11.5 23C11.5 25.5 12.2 27.9 13.5 30L11 37L18.2 34.5C20.3 35.7 22.6 36.4 25 36.4C32.5 36.4 38.5 30.4 38.5 22.9C38.5 19.3 37 16 34.5 13.5ZM25 34C22.8 34 20.7 33.4 18.8 32.2L18.3 31.9L14.1 33.1L15.3 29L15 28.5C13.7 26.5 13 24.3 13 22C13 16.5 18.5 12 25 12C28.1 12 31 13.2 33.2 15.4C35.4 17.6 36.5 20.5 36.5 22.9C36.5 28.5 31.3 34 25 34ZM31.1 25.1C30.8 24.95 29.3 24.2 29 24.1C28.7 24 28.5 23.9 28.3 24.2C28.1 24.5 27.5 25.2 27.3 25.4C27.1 25.6 26.95 25.65 26.65 25.5C25.3 24.85 24.4 24.3 23.45 22.8C23.2 22.35 23.75 22.4 24.25 21.4C24.35 21.2 24.3 21.05 24.2 20.9C24.1 20.75 23.55 19.25 23.25 18.6C22.95 17.95 22.7 18.05 22.5 18.05C22.3 18.05 22.1 18 21.85 18C21.6 18 21.25 18.1 20.95 18.4C20.65 18.7 19.9 19.4 19.9 20.9C19.9 22.4 21 23.85 21.15 24.05C21.3 24.25 23.55 27.7 27 29.05C29.2 29.95 30.05 30.05 31.15 29.9C31.8 29.8 33.15 29.15 33.45 28.4C33.75 27.65 33.75 27.05 33.65 26.9C33.55 26.75 33.35 26.65 31.1 25.1Z" fill="white" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#ig-grad)" />
      <path d="M24 14.5c-2.6 0-2.9 0-3.9.06-1 .04-1.7.2-2.3.43a4.6 4.6 0 00-1.67 1.09 4.6 4.6 0 00-1.08 1.67c-.23.6-.4 1.3-.44 2.3-.04 1-.05 1.3-.05 3.9s0 2.9.06 3.9c.04 1 .2 1.7.43 2.3a4.6 4.6 0 001.09 1.67 4.6 4.6 0 001.67 1.08c.6.23 1.3.4 2.3.44 1 .04 1.3.05 3.9.05s2.9 0 3.9-.06c1-.04 1.7-.2 2.3-.43a4.84 4.84 0 002.75-2.75c.23-.6.4-1.3.44-2.3.04-1 .05-1.3.05-3.9s0-2.9-.06-3.9c-.04-1-.2-1.7-.43-2.3a4.6 4.6 0 00-1.09-1.67 4.6 4.6 0 00-1.67-1.08c-.6-.23-1.3-.4-2.3-.44-1-.04-1.3-.05-3.9-.05zm0 1.7c2.56 0 2.86 0 3.86.05.93.04 1.44.2 1.77.32.45.17.77.38 1.1.72.34.34.55.65.73 1.1.12.34.28.84.32 1.77.05 1 .05 1.3.05 3.86s0 2.86-.05 3.86c-.04.93-.2 1.44-.32 1.77a3 3 0 01-.72 1.1 3 3 0 01-1.1.73c-.34.12-.84.28-1.77.32-1 .05-1.3.05-3.86.05s-2.86 0-3.86-.05c-.93-.04-1.44-.2-1.77-.32a3 3 0 01-1.1-.72 3 3 0 01-.73-1.1c-.12-.34-.28-.84-.32-1.77-.05-1-.05-1.3-.05-3.86s0-2.86.05-3.86c.04-.93.2-1.44.32-1.77a3 3 0 01.72-1.1 3 3 0 011.1-.73c.34-.12.84-.28 1.77-.32 1-.05 1.3-.05 3.86-.05zM24 18.9a5.1 5.1 0 100 10.2A5.1 5.1 0 0024 18.9zm0 8.4a3.3 3.3 0 110-6.6 3.3 3.3 0 010 6.6zm5.3-8.6a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" fill="white" />
    </svg>
  );
}

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#0084FF" />
      <path d="M24 10C16.27 10 10 15.9 10 23.2c0 4.1 1.9 7.75 4.9 10.3V38l4.8-2.65c1.28.36 2.64.55 4.05.55 7.73 0 14-5.9 14-13.2S31.73 10 24 10zm1.4 17.8l-3.56-3.8-6.95 3.8 7.64-8.1 3.65 3.8 6.86-3.8-7.64 8.1z" fill="white" />
    </svg>
  );
}

/* ─── Data ───────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Inbox,
    title: "Unified Inbox",
    description:
      "All your WhatsApp, Instagram, and Facebook conversations in one place. No more switching between apps.",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Assign conversations to agents, route by department, and collaborate with internal notes — all in real time.",
    color: "from-sky-500 to-blue-600",
    bg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  {
    icon: Zap,
    title: "Smart Routing",
    description:
      "Round-robin or manual assignment. Conversations land in the right hands automatically, every time.",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: BarChart2,
    title: "Real-time Analytics",
    description:
      "Track agent performance, department workload, and channel-level metrics on a live dashboard.",
    color: "from-emerald-500 to-green-600",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: BotMessageSquare,
    title: "Webhook Automation",
    description:
      "Receive inbound messages automatically from Meta's Cloud API. Contacts and conversations created instantly.",
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50",
    iconColor: "text-pink-600",
  },
  {
    icon: Shield,
    title: "Role-based Access",
    description:
      "Admin, Supervisor, and Agent roles with scoped permissions. Full control over who sees what.",
    color: "from-slate-500 to-gray-700",
    bg: "bg-slate-50",
    iconColor: "text-slate-600",
  },
];

const TESTIMONIALS = [
  {
    text: "OmniChat cut our average response time from 8 minutes to under 90 seconds. Our CSAT went from 74% to 96% in the first month.",
    name: "Daniela Reyes",
    title: "Head of Customer Experience · TechNova",
    initials: "DR",
    color: "bg-violet-100 text-violet-700",
  },
  {
    text: "Managing three channels across two shifts used to be chaos. Now my whole team works from one screen and nothing slips through.",
    name: "Marcus Chen",
    title: "Support Lead · ShopBridge",
    initials: "MC",
    color: "bg-sky-100 text-sky-700",
  },
  {
    text: "We onboarded in a single afternoon. The department routing alone replaced two full-time coordinators.",
    name: "Priya Nair",
    title: "Operations Director · Lumia Health",
    initials: "PN",
    color: "bg-emerald-100 text-emerald-700",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$49",
    period: "/ month",
    description: "Perfect for small teams getting started.",
    highlight: false,
    features: [
      "Up to 5 agents",
      "2 connected channels",
      "1 department",
      "7-day message history",
      "Email support",
    ],
    cta: "Start free trial",
  },
  {
    name: "Growth",
    price: "$149",
    period: "/ month",
    description: "For scaling teams across multiple channels.",
    highlight: true,
    features: [
      "Up to 25 agents",
      "All 3 channels (WhatsApp, IG, FB)",
      "Unlimited departments",
      "90-day message history",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Start free trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Dedicated infrastructure and SLA for large teams.",
    highlight: false,
    features: [
      "Unlimited agents",
      "Unlimited channels",
      "Custom routing rules",
      "Unlimited history",
      "SLA guarantee",
      "Dedicated success manager",
      "Self-hosted option",
    ],
    cta: "Contact sales",
  },
];

const STATS = [
  { value: "12 M+", label: "Messages handled monthly" },
  { value: "3,500+", label: "Teams worldwide" },
  { value: "< 90 s", label: "Avg. first response time" },
  { value: "97%", label: "Customer satisfaction" },
];

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">OmniChat</span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#channels" className="hover:text-gray-900 transition-colors">Channels</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm font-medium">Sign in</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 shadow-sm">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-28 px-6">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-violet-100/60 to-transparent rounded-full blur-3xl" />
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl" />
          <div className="absolute -top-10 -right-20 w-80 h-80 bg-pink-100/40 rounded-full blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-5 inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 border-violet-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3 h-3" /> Now with Meta Cloud API
          </Badge>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.08]">
            Every conversation,{" "}
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              one inbox
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            OmniChat unifies WhatsApp Business, Instagram DM, and Facebook Messenger
            into a single collaborative workspace — with smart routing, team roles,
            and analytics built in.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 h-12 shadow-md shadow-violet-200">
                Start free trial — no card needed
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="font-semibold h-12 px-8 border-gray-200">
                See all features
              </Button>
            </a>
          </div>

          <p className="mt-4 text-sm text-gray-400">14-day free trial · No credit card · Cancel anytime</p>
        </div>

        {/* App screenshot mockup */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-200/80 bg-gray-50">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4 h-6 rounded-md bg-white border border-gray-200 flex items-center px-3">
                <span className="text-xs text-gray-400">app.omnichat.io/inbox</span>
              </div>
            </div>
            {/* Mock UI */}
            <div className="flex h-72 sm:h-96">
              {/* Sidebar */}
              <div className="w-14 bg-white border-r border-gray-100 flex flex-col items-center py-4 gap-3 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                {[Inbox, Users, Globe, BarChart2, SlidersHorizontal].map((Icon, i) => (
                  <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center ${i === 0 ? "bg-violet-600" : "bg-gray-50"}`}>
                    <Icon className={`w-4 h-4 ${i === 0 ? "text-white" : "text-gray-400"}`} />
                  </div>
                ))}
              </div>
              {/* Thread list */}
              <div className="w-56 sm:w-64 border-r border-gray-100 bg-white flex-shrink-0 overflow-hidden">
                <div className="px-3 py-3 border-b border-gray-100">
                  <div className="h-7 bg-gray-100 rounded-lg w-full" />
                </div>
                {[
                  { name: "Emma Thompson", msg: "Hi, I need help with my order", ch: "WA", time: "2m", unread: 2, color: "bg-green-500" },
                  { name: "Carlos Mendez", msg: "When will it arrive?", ch: "IG", time: "8m", unread: 0, color: "bg-gradient-to-br from-pink-500 to-purple-600" },
                  { name: "Aisha Patel", msg: "Thank you so much!", ch: "FB", time: "1h", unread: 0, color: "bg-blue-500" },
                  { name: "Zara Ahmed", msg: "Can I get a refund?", ch: "WA", time: "3h", unread: 1, color: "bg-green-500" },
                ].map((t, i) => (
                  <div key={i} className={`px-3 py-2.5 border-b border-gray-50 flex items-center gap-2.5 ${i === 0 ? "bg-violet-50" : ""}`}>
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-500">
                      {t.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-800 truncate">{t.name}</span>
                        <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">{t.time}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">{t.msg}</div>
                    </div>
                    {t.unread > 0 && (
                      <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0">{t.unread}</span>
                    )}
                  </div>
                ))}
              </div>
              {/* Chat area */}
              <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">ET</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Emma Thompson</div>
                    <div className="text-xs text-green-600 font-medium">via WhatsApp · Open</div>
                  </div>
                </div>
                <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
                  <div className="self-start max-w-xs bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm border border-gray-100 text-xs text-gray-700">Hi, I need some help with my recent order.</div>
                  <div className="self-end max-w-xs bg-violet-600 rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-white">Of course! Could you share your order number?</div>
                  <div className="self-start max-w-xs bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm border border-gray-100 text-xs text-gray-700">Sure, it's #ORD-2948. I haven't received it yet.</div>
                </div>
                <div className="p-3 bg-white border-t border-gray-100">
                  <div className="h-8 bg-gray-100 rounded-xl w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center py-10 px-6 text-center">
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900">{s.value}</div>
              <div className="mt-1 text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CHANNELS ───────────────────────────────────────────────────── */}
      <section id="channels" className="py-24 px-6 bg-gray-50">
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-4 bg-sky-50 text-sky-700 border-sky-200 text-xs font-semibold uppercase tracking-wider px-3 py-1">
            Channels
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Connect every channel your customers use
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            OmniChat integrates natively with Meta's Cloud API — meaning zero middleware, instant delivery, and full webhook support.
          </p>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                Icon: WhatsAppIcon,
                name: "WhatsApp Business",
                desc: "Handle text, images, documents, and templates. Auto-create contacts on first inbound.",
                badge: "Most popular",
                badgeColor: "bg-green-50 text-green-700 border-green-200",
              },
              {
                Icon: InstagramIcon,
                name: "Instagram DM",
                desc: "Reply to DMs and story mentions. All conversation threads in one view.",
                badge: "",
                badgeColor: "",
              },
              {
                Icon: MessengerIcon,
                name: "Facebook Messenger",
                desc: "Centralize page messages and respond as your brand across Facebook.",
                badge: "",
                badgeColor: "",
              },
            ].map(({ Icon, name, desc, badge, badgeColor }) => (
              <div key={name} className="relative bg-white rounded-2xl border border-gray-200 p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                {badge && (
                  <span className={`absolute top-4 right-4 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>{badge}</span>
                )}
                <Icon className="w-12 h-12 mb-4" />
                <h3 className="font-semibold text-gray-900 text-base">{name}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-violet-50 text-violet-700 border-violet-200 text-xs font-semibold uppercase tracking-wider px-3 py-1">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Everything your support team needs
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Built for B2B teams who can't afford to miss a message or a context switch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className={`${f.bg} rounded-2xl p-6 border border-transparent hover:border-gray-200 transition-all hover:shadow-sm`}>
                <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-base">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-violet-600 to-blue-600">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Loved by support teams worldwide
            </h2>
            <div className="flex justify-center items-center gap-1 mt-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
              <span className="ml-2 text-white/80 text-sm font-medium">4.9 / 5 from 800+ reviews</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-7 flex flex-col gap-4 shadow-lg">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${t.color}`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold uppercase tracking-wider px-3 py-1">
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-gray-500">All plans include a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-7 border flex flex-col gap-5 ${
                  p.highlight
                    ? "bg-violet-600 border-violet-600 shadow-2xl shadow-violet-200 scale-105 z-10"
                    : "bg-white border-gray-200 shadow-sm"
                }`}
              >
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${p.highlight ? "text-violet-200" : "text-gray-500"}`}>{p.name}</div>
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${p.highlight ? "text-white" : "text-gray-900"}`}>{p.price}</span>
                    {p.period && <span className={`text-sm mb-1 ${p.highlight ? "text-violet-200" : "text-gray-400"}`}>{p.period}</span>}
                  </div>
                  <p className={`mt-1.5 text-sm ${p.highlight ? "text-violet-200" : "text-gray-500"}`}>{p.description}</p>
                </div>

                <ul className="flex flex-col gap-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${p.highlight ? "text-violet-200" : "text-violet-500"}`} />
                      <span className={p.highlight ? "text-white" : "text-gray-700"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/login" className="mt-auto">
                  <Button
                    className={`w-full font-semibold ${
                      p.highlight
                        ? "bg-white text-violet-600 hover:bg-violet-50"
                        : "bg-violet-600 hover:bg-violet-700 text-white"
                    }`}
                  >
                    {p.cta}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-white">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-violet-600 shadow-lg mb-8">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Ready to respond faster?
          </h2>
          <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">
            Join thousands of support teams that unified their messaging and never looked back.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-10 h-12 shadow-md shadow-violet-200">
                Get started — it's free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">14-day trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-gray-50 py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900">OmniChat</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#channels" className="hover:text-gray-900 transition-colors">Channels</a>
            <a href="mailto:hello@omnichat.io" className="hover:text-gray-900 transition-colors">Contact</a>
          </div>

          <p className="text-xs text-gray-400">© {new Date().getFullYear()} OmniChat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
