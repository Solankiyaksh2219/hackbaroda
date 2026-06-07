"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ArrowUpRight, BarChart3, Clock, Hash, Layers,
  MessageSquare, Radio, RefreshCw, Send, Sparkles, TrendingDown,
  TrendingUp, Zap, CheckCircle2, AlertCircle, X, Globe, Headphones,
  Cpu, Brain,
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ═══ SOURCES ═══ */
const SOURCES = [
  { id: "reddit", label: "Reddit", icon: MessageSquare, color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
  { id: "discord", label: "Discord", icon: Radio, color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
  { id: "survey", label: "Survey", icon: Cpu, color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  { id: "twitter", label: "Twitter / X", icon: Globe, color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd" },
  { id: "support", label: "Support", icon: Headphones, color: "#f43f5e", bg: "#fff1f2", border: "#fecdd3" },
] as const;

function src(id: string) {
  return SOURCES.find((s) => s.id === id) ?? { id, label: id, icon: MessageSquare, color: "#737373", bg: "#fafafa", border: "#e5e5e5" };
}

/* ═══ TYPES ═══ */
type HP = { created_at: string; sentiment_score?: number; sentiment?: number; source: string; themes: string[] };
type Toast = { id: number; type: "success" | "error" | "info"; message: string };

/* ═══ HELPERS ═══ */
const sc = (h: HP) => h.sentiment_score ?? h.sentiment ?? 0;
const sCol = (s: number) => (s >= 70 ? "#10b981" : s >= 40 ? "#f59e0b" : "#ef4444");
const sLbl = (s: number) => (s >= 70 ? "Positive" : s >= 40 ? "Neutral" : "Negative");
const sBg = (s: number) => (s >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s >= 40 ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-red-50 text-red-600 border-red-200");

function timeAgo(d: string): string {
  const ms = Math.max(0, Date.now() - new Date(d).getTime());
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ═══ PALETTE ═══ */
const P = [
  { bg: "#eef2ff", text: "#4338ca", bar: "#818cf8" },
  { bg: "#ecfdf5", text: "#047857", bar: "#34d399" },
  { bg: "#faf5ff", text: "#7c3aed", bar: "#a78bfa" },
  { bg: "#fff7ed", text: "#c2410c", bar: "#fb923c" },
  { bg: "#fef2f2", text: "#b91c1c", bar: "#f87171" },
  { bg: "#f0f9ff", text: "#0369a1", bar: "#38bdf8" },
  { bg: "#fefce8", text: "#a16207", bar: "#fbbf24" },
  { bg: "#f0fdf4", text: "#15803d", bar: "#4ade80" },
  { bg: "#fdf2f8", text: "#be185d", bar: "#f472b6" },
  { bg: "#ecfeff", text: "#0e7490", bar: "#22d3ee" },
  { bg: "#f5f3ff", text: "#6d28d9", bar: "#8b5cf6" },
  { bg: "#fff1f2", text: "#be123c", bar: "#fb7185" },
];

/* ═══ CHART TOOLTIP ═══ */
function CTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xl text-left">
      <p className="text-[11px] font-medium text-neutral-400 mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color: sCol(v) }}>{v}<span className="text-xs text-neutral-400 font-normal ml-1">/100</span></p>
      <span className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sBg(v)}`}>{sLbl(v)}</span>
    </div>
  );
}

/* ═══ SECTION HEADER ═══ */
function SH({ icon: Icon, title, color, children }: { icon: React.ElementType; title: string; color: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${color}12` }}>
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={2} />
        </div>
        <h2 className="text-[15px] font-semibold text-neutral-900" style={{ fontFamily: "var(--font-display)" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════
   ══════════  MAIN PAGE  ══════════
   ═══════════════════════════════════ */
export default function Home() {
  const [source, setSource] = useState("reddit");
  const [rawText, setRawText] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<{ sentiment: number; themes: string[] } | null>(null);
  const [history, setHistory] = useState<HP[]>([]);
  const [initiative, setInitiative] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const tid = useRef(0);

  const toast = useCallback((type: Toast["type"], msg: string) => {
    const id = ++tid.current;
    setToasts((p) => [...p, { id, type, message: msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => { load(); }, []);

  async function load() {
    setIsLoading(true);
    try {
      const r = await fetch(`${API}/api/trends`);
      if (!r.ok) throw new Error("API " + r.status);
      const d = await r.json();
      setHistory(d.history || []);
      if (d.actionable_initiative) setInitiative(d.actionable_initiative);
    } catch {
      setHistory(DEMO);
      setInitiative("Launch an 'Accessibility & UI Customization' product initiative to introduce adjustable font sizes and text scaling options.");
    } finally { setIsLoading(false); }
  }

  async function handleIngest() {
    if (!rawText.trim()) return;
    setIngesting(true);
    try {
      const r = await fetch(`${API}/api/ingest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, raw_text: rawText }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Error ${r.status}`); }
      const d = await r.json();
      setLastResult({ sentiment: d.sentiment, themes: d.themes });
      setRawText("");
      toast("success", `Analyzed — sentiment ${d.sentiment}/100`);
      load();
    } catch (e: any) { toast("error", e?.message || "Analysis failed"); }
    finally { setIngesting(false); }
  }

  async function handleTrends() {
    setAnalyzing(true);
    try {
      const r = await fetch(`${API}/api/trends`);
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Error ${r.status}`); }
      const d = await r.json();
      setInitiative(d.actionable_initiative);
      setHistory(d.history || []);
      toast("success", "AI insights refreshed!");
    } catch (e: any) { toast("error", e?.message || "Generation failed"); }
    finally { setAnalyzing(false); }
  }

  /* ── Computed ── */
  const filtered = sourceFilter === "all" ? history : history.filter((h) => h.source === sourceFilter);
  const chartData = filtered.map((h) => ({
    name: new Date(h.created_at).toLocaleDateString("en", { month: "short", day: "numeric" }),
    sentiment: sc(h),
  }));
  const avg = history.length ? Math.round(history.reduce((s, h) => s + sc(h), 0) / history.length) : 0;
  const latest = history.length ? sc(history[history.length - 1]) : 0;
  const { trend, trendPct } = (() => {
    if (history.length < 4) return { trend: "neutral" as const, trendPct: "" };
    const recent = history.slice(-3), older = history.slice(-6, -3);
    if (!older.length) return { trend: "neutral" as const, trendPct: "" };
    const rA = recent.reduce((s, h) => s + sc(h), 0) / recent.length;
    const oA = older.reduce((s, h) => s + sc(h), 0) / older.length;
    const p = oA > 0 ? Math.round(((rA - oA) / oA) * 100) : 0;
    if (rA > oA + 3) return { trend: "up" as const, trendPct: `+${p}%` };
    if (rA < oA - 3) return { trend: "down" as const, trendPct: `${p}%` };
    return { trend: "neutral" as const, trendPct: "" };
  })();

  const themeFreq = history.reduce<Record<string, number>>((a, h) => { h.themes?.forEach((t) => { a[t] = (a[t] || 0) + 1; }); return a; }, {});
  const sortedThemes = Object.entries(themeFreq).sort((a, b) => b[1] - a[1]);
  const topThemes = sortedThemes.slice(0, 12);
  const uniqueSources = Array.from(new Set(history.map((h) => h.source)));
  const srcCounts = history.reduce<Record<string, number>>((a, h) => { a[h.source] = (a[h.source] || 0) + 1; return a; }, {});
  const selSrc = src(source);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Ambient BG */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-32 left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-100/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[500px] h-[500px] rounded-full bg-violet-100/30 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8">

        {/* ═══ HEADER ═══ */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900" style={{ fontFamily: "var(--font-display)" }}>
                Feedback<span className="text-indigo-600">Hub</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">AI-Powered Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} disabled={isLoading}
              className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          </div>
        </header>

        {/* ═══ STAT CARDS ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: "Total Entries", value: history.length, sub: "Feedback collected", icon: Layers, accent: "#6366f1" },
            { label: "Avg Sentiment", value: avg, sub: sLbl(avg), icon: BarChart3, accent: sCol(avg), trend, trendPct },
            { label: "Latest Score", value: latest || "—", sub: latest ? sLbl(latest) : "No data", icon: Activity, accent: sCol(latest) },
            { label: "Unique Themes", value: Object.keys(themeFreq).length, sub: "Detected patterns", icon: Hash, accent: "#8b5cf6" },
          ].map((s, i) => (
            <div key={i} className="card p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.accent}12` }}>
                  <s.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: s.accent }} strokeWidth={1.8} />
                </div>
                {s.trend && s.trend !== "neutral" && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold px-2 py-1 rounded-lg ${
                    s.trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                  }`}>
                    {s.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {s.trendPct}
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-neutral-900 leading-none mb-1" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
              <p className="text-xs sm:text-[13px] font-medium text-neutral-500">{s.label}</p>
              <p className="text-[10px] sm:text-[11px] text-neutral-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ═══ INGEST ═══ */}
        <div className="card p-4 sm:p-6 mb-6">
          <SH icon={Send} title="Ingest Feedback" color="#6366f1" />
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <div className="relative sm:w-[160px] shrink-0">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none z-10" style={{ background: selSrc.color }} />
              <select value={source} onChange={(e) => setSource(e.target.value)}
                className="w-full h-11 pl-9 pr-9 rounded-xl border border-neutral-200 bg-white text-sm font-medium text-neutral-700 appearance-none cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
              >
                {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <input value={rawText} onChange={(e) => setRawText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleIngest()}
                placeholder="Paste customer feedback…"
                className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-800 placeholder:text-neutral-400 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
              />
            </div>
            <button type="button" onClick={handleIngest} disabled={ingesting || !rawText.trim()}
              className="h-11 px-5 sm:px-6 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-indigo-700 active:bg-indigo-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-sm shadow-indigo-600/20"
            >
              {ingesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Analyze</span>
            </button>
          </div>

          {/* Result inline */}
          <AnimatePresence>
            {lastResult && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-5 pt-5 border-t border-neutral-100 flex flex-wrap items-center gap-4 sm:gap-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center border" style={{ background: sCol(lastResult.sentiment) + "10", borderColor: sCol(lastResult.sentiment) + "30" }}>
                      <span className="text-lg font-bold" style={{ color: sCol(lastResult.sentiment) }}>{lastResult.sentiment}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Sentiment</p>
                      <p className="text-sm font-semibold" style={{ color: sCol(lastResult.sentiment) }}>{sLbl(lastResult.sentiment)}</p>
                    </div>
                  </div>
                  <div className="hidden sm:block h-8 w-px bg-neutral-200" />
                  <div className="flex gap-2 flex-wrap">
                    {lastResult.themes.map((th, i) => (
                      <span key={th} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: P[i % P.length].bg, color: P[i % P.length].text }}>{th}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ CHART + ACTIVITY ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 mb-6">
          {/* Chart */}
          <div className="card p-4 sm:p-6 lg:col-span-3 min-w-0">
            <SH icon={BarChart3} title="Sentiment Trajectory" color="#10b981">
              <div className="flex gap-1 flex-wrap">
                {["all", ...uniqueSources].map((id) => (
                  <button key={id} type="button" onClick={() => setSourceFilter(id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${
                      sourceFilter === id ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"
                    }`}
                  >
                    {id === "all" ? "All" : src(id).label}
                  </button>
                ))}
              </div>
            </SH>
            <div className="w-full min-w-0" style={{ height: "clamp(200px, 30vw, 300px)" }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 500 }} tickLine={false} axisLine={false} interval="preserveStartEnd" dy={6} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 500 }} tickLine={false} axisLine={false} width={36} />
                    <Tooltip content={<CTip />} />
                    <Area type="monotone" dataKey="sentiment" stroke="#6366f1" strokeWidth={2.5} fill="url(#sg)" dot={{ r: 3.5, fill: "#fff", stroke: "#6366f1", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2.5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <BarChart3 className="w-10 h-10 text-neutral-200" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-neutral-500">No data yet</p>
                  <p className="text-xs">Ingest feedback to see sentiment trends</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity */}
          <div className="card p-4 sm:p-6 lg:col-span-2 min-w-0">
            <SH icon={Clock} title="Recent Activity" color="#8b5cf6" />
            <div className="space-y-0 overflow-y-auto" style={{ maxHeight: "clamp(200px, 30vw, 300px)" }}>
              {(history.length > 0 ? history.slice(-7).reverse() : []).map((entry, i) => {
                const ss = src(entry.source);
                const SIcon = ss.icon;
                const v = sc(entry);
                return (
                  <div key={`${entry.created_at}-${i}`} className="flex items-start gap-3 py-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50/60 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center mt-0.5" style={{ background: ss.bg, border: `1px solid ${ss.border}` }}>
                      <SIcon className="w-4 h-4" style={{ color: ss.color }} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-neutral-800">{ss.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${sBg(v)}`}>{v}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap mb-1">
                        {entry.themes?.slice(0, 2).map((t) => (
                          <span key={t} className="text-[11px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded truncate max-w-[90px]">{t}</span>
                        ))}
                        {(entry.themes?.length ?? 0) > 2 && <span className="text-[11px] text-neutral-400">+{entry.themes.length - 2}</span>}
                      </div>
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(entry.created_at)}</span>
                    </div>
                  </div>
                );
              })}
              {history.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2 text-neutral-400">
                  <Clock className="w-7 h-7 text-neutral-200" />
                  <p className="text-sm font-medium text-neutral-500">No activity yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ THEMES + SOURCES ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
          {topThemes.length > 0 && (
            <div className="card p-4 sm:p-6 lg:col-span-2 min-w-0">
              <SH icon={Hash} title="Recurring Themes" color="#3b82f6">
                <span className="text-xs font-medium text-neutral-400">{sortedThemes.length} detected</span>
              </SH>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {topThemes.map(([theme, count], i) => {
                  const pc = P[i % P.length];
                  const pct = Math.max(15, Math.round((count / topThemes[0][1]) * 100));
                  return (
                    <div key={theme} className="rounded-xl p-3 sm:p-3.5 border cursor-default hover:shadow-sm transition-shadow"
                      style={{ background: pc.bg, borderColor: `${pc.text}15` }}
                    >
                      <div className="flex items-baseline justify-between gap-1 mb-2">
                        <span className="text-xs sm:text-[13px] font-semibold truncate" style={{ color: pc.text }}>{theme}</span>
                        <span className="text-[10px] font-bold shrink-0 opacity-50" style={{ color: pc.text }}>×{count}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/60 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ background: pc.bar, width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {uniqueSources.length > 0 && (
            <div className="card p-4 sm:p-6 min-w-0">
              <SH icon={Layers} title="Sources" color="#f97316" />
              <div className="space-y-4">
                {uniqueSources.map((srcId) => {
                  const s = src(srcId);
                  const SIcon = s.icon;
                  const cnt = srcCounts[srcId] || 0;
                  const pct = history.length ? Math.round((cnt / history.length) * 100) : 0;
                  return (
                    <div key={srcId} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                        <SIcon className="w-4 h-4" style={{ color: s.color }} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] font-medium text-neutral-700">{s.label}</span>
                          <span className="text-xs font-semibold text-neutral-500">{cnt} <span className="text-neutral-400 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ background: s.color, width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ═══ AI INSIGHTS ═══ */}
        <div className="card p-4 sm:p-6 relative overflow-hidden" style={{ borderColor: "#c7d2fe50" }}>
          <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-50/60 blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-[200px] h-[200px] rounded-full bg-violet-50/50 blur-[60px] pointer-events-none" />

          <SH icon={Brain} title="AI Insights" color="#6366f1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">RAG</span>
              <button type="button" onClick={handleTrends} disabled={analyzing}
                className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-indigo-700 transition-all disabled:opacity-40 cursor-pointer shadow-sm shadow-indigo-600/20"
              >
                {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate
              </button>
            </div>
          </SH>

          {initiative ? (
            <div className="relative rounded-xl border border-indigo-100 bg-white/90 backdrop-blur-sm p-5 sm:p-6 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/40 to-transparent -skew-x-12 animate-shimmer pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-widest text-indigo-500 uppercase mb-1.5">Recommended Initiative</p>
                  <p className="text-sm sm:text-[15px] leading-relaxed text-neutral-700 font-medium">{initiative}</p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[11px] font-medium text-indigo-400">Based on {history.length} feedback entries</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col items-center py-10 sm:py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 animate-float">
                <Sparkles className="w-7 h-7 text-indigo-300" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-neutral-500 max-w-sm leading-relaxed">Click Generate to synthesize an actionable initiative from your feedback memory.</p>
            </div>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer className="mt-10 pb-6 flex justify-center">
          <p className="text-[11px] font-medium text-neutral-400">
            Built with <span className="text-neutral-500 font-semibold">Gemini</span> · <span className="text-neutral-500 font-semibold">LangGraph</span> · <span className="text-neutral-500 font-semibold">Supabase</span>
          </p>
        </footer>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.96 }} transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border shadow-lg min-w-[280px] max-w-[380px] ${
                t.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                t.type === "error" ? "bg-red-50 border-red-200 text-red-800" :
                "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              {t.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className="text-sm font-medium flex-1">{t.message}</span>
              <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} className="text-neutral-400 hover:text-neutral-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══ DEMO ═══ */
const DEMO: HP[] = [
  { created_at: new Date(Date.now() - 2 * 3600000).toISOString(), sentiment: 42, source: "reddit", themes: ["latency", "ui-bugs", "onboarding"] },
  { created_at: new Date(Date.now() - 5 * 3600000).toISOString(), sentiment: 55, source: "discord", themes: ["docs", "api-speed", "pricing"] },
  { created_at: new Date(Date.now() - 10 * 3600000).toISOString(), sentiment: 38, source: "survey", themes: ["stability", "features", "latency"] },
  { created_at: new Date(Date.now() - 16 * 3600000).toISOString(), sentiment: 61, source: "reddit", themes: ["ui-refresh", "performance", "mobile"] },
  { created_at: new Date(Date.now() - 22 * 3600000).toISOString(), sentiment: 70, source: "discord", themes: ["community", "docs", "plugins"] },
  { created_at: new Date(Date.now() - 30 * 3600000).toISOString(), sentiment: 65, source: "survey", themes: ["pricing", "support", "stability"] },
  { created_at: new Date(Date.now() - 40 * 3600000).toISOString(), sentiment: 78, source: "reddit", themes: ["performance", "api", "onboarding"] },
  { created_at: new Date(Date.now() - 52 * 3600000).toISOString(), sentiment: 72, source: "discord", themes: ["community", "features", "mobile"] },
];
