"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Lightbulb,
  MessageCircle,
  Bug,
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Trash2,
  User,
  Mail,
  FolderKanban,
  Search,
  Copy,
  Check,
  X,
  Terminal,
  RefreshCw,
} from "lucide-react";
import {
  FeedbackAdminProps,
  FeedbackItem,
  FeedbackStatus,
  FeedbackType,
} from "./types";

export function FeedbackAdmin({
  apiPath = "/api/feedback",
  implementApiPath = "/api/feedback/implement",
  backHref = "/",
  backLabel = "Zurück zur App",
  title = "Feedback & Produkt-Verbesserungen",
  subtitle = "Alle gesammelten Ideen, Rückmeldungen & Fehlerberichte gruppiert nach Thema",
}: FeedbackAdminProps) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | FeedbackType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | FeedbackStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state for "Implement Improvement"
  const [activeItem, setActiveItem] = useState<FeedbackItem | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<"claude" | "agy">("claude");
  const [isTriggering, setIsTriggering] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const resolvePath = useCallback((path: string) => {
    return path;
  }, []);

  const fetchWithFallback = useCallback(async (path: string, options?: RequestInit) => {
    let res = await fetch(path, options);
    if (!res.ok && res.status === 404 && typeof window !== "undefined") {
      const prefix = window.location.pathname.split("/").filter(Boolean)[0];
      if (prefix && !path.startsWith(`/${prefix}`)) {
        const fallback = `/${prefix}${path.startsWith("/") ? "" : "/"}${path}`;
        const retryRes = await fetch(fallback, options);
        if (retryRes.ok) return retryRes;
      }
    }
    return res;
  }, []);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetchWithFallback(apiPath, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setItems(data.items);
          setActiveItem((prev) => {
            if (!prev) return null;
            return data.items.find((i: FeedbackItem) => i.id === prev.id) || prev;
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [apiPath, fetchWithFallback]);

  useEffect(() => {
    void fetchFeedback();
    const onUpdated = () => void fetchFeedback();
    window.addEventListener("feedback-updated", onUpdated);
    return () => window.removeEventListener("feedback-updated", onUpdated);
  }, [fetchFeedback]);

  // Auto-poll while any item is in_progress
  const hasInProgress = useMemo(
    () => items.some((i) => i.status === "in_progress"),
    [items]
  );

  useEffect(() => {
    if (!hasInProgress) return;
    const interval = setInterval(() => {
      void fetchFeedback();
    }, 2000);
    return () => clearInterval(interval);
  }, [hasInProgress, fetchFeedback]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMsg = item.message.toLowerCase().includes(q);
        const matchTopic = item.topic.toLowerCase().includes(q);
        const matchAuthor = (item.authorName || "").toLowerCase().includes(q);
        const matchEmail = (item.authorEmail || "").toLowerCase().includes(q);
        if (!matchMsg && !matchTopic && !matchAuthor && !matchEmail) return false;
      }
      return true;
    });
  }, [items, filterType, filterStatus, searchQuery]);

  // Group filtered items by topic
  const groupedByTopic = useMemo(() => {
    const groups = new Map<string, FeedbackItem[]>();
    for (const item of filteredItems) {
      const topicKey = item.topic || "Allgemeines & Sonstiges";
      const list = groups.get(topicKey) || [];
      list.push(item);
      groups.set(topicKey, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredItems]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      open: items.filter((i) => i.status === "open").length,
      inProgress: items.filter((i) => i.status === "in_progress").length,
      implemented: items.filter((i) => i.status === "implemented").length,
    };
  }, [items]);

  const openImplementModal = (item: FeedbackItem) => {
    setActiveItem(item);
    setAdditionalContext(item.additionalContext || "");
    setSelectedAgent((item.agentUsed as any) || "claude");
  };

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    const res = await fetchWithFallback(apiPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        implementedAt: status === "implemented" ? new Date().toISOString() : undefined,
      }),
    });
    if (res.ok) {
      void fetchFeedback();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    const url = `${apiPath}${apiPath.includes("?") ? "&" : "?"}id=${encodeURIComponent(id)}`;
    const res = await fetchWithFallback(url, {
      method: "DELETE",
    });
    if (res.ok) {
      if (activeItem?.id === id) setActiveItem(null);
      void fetchFeedback();
    }
  };

  const handleStartImplementation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || isTriggering) return;

    setIsTriggering(true);
    try {
      const payload = {
        id: activeItem.id,
        additionalContext: additionalContext.trim(),
        agent: selectedAgent,
      };
      const res = await fetchWithFallback(implementApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchFeedback();
      }
    } finally {
      setIsTriggering(false);
    }
  };

  const buildCopyablePrompt = (item: FeedbackItem, extraContext: string) => {
    return [
      `Implementiere folgende Verbesserung:`,
      `- Typ: ${item.type === "idea" ? "Idee" : item.type === "bug" ? "Fehlerbericht" : "Feedback"}`,
      `- Thema: ${item.topic}`,
      `- Rückmeldung: ${item.message}`,
      extraContext.trim() ? `- Zusätzlicher Kontext / Vorgaben: ${extraContext.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleCopyPrompt = () => {
    if (!activeItem) return;
    navigator.clipboard.writeText(buildCopyablePrompt(activeItem, additionalContext));
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const renderTypeBadge = (type: FeedbackType) => {
    if (type === "idea") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Lightbulb className="w-3 h-3 text-amber-600" aria-hidden="true" />
          <span>Idee</span>
        </span>
      );
    }
    if (type === "bug") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
          <Bug className="w-3 h-3 text-red-600" aria-hidden="true" />
          <span>Fehler</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
        <MessageCircle className="w-3 h-3 text-blue-600" aria-hidden="true" />
        <span>Feedback</span>
      </span>
    );
  };

  const renderStatusBadge = (status: FeedbackStatus) => {
    if (status === "implemented") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
          <span>Umgesetzt</span>
        </span>
      );
    }
    if (status === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Loader2 className="w-3 h-3 text-purple-600 animate-spin" aria-hidden="true" />
          <span>Wird umgesetzt...</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="w-3 h-3 text-slate-500" aria-hidden="true" />
        <span>Offen</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {backHref && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{backLabel}</span>
              </Link>
            )}
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-slate-900">{title}</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white rounded-md">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchFeedback()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Aktualisieren</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Gesamtes Feedback</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              In {groupedByTopic.length} Themenbereichen
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Offen zur Prüfung</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{stats.open}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Bereit für Umsetzung</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">In Umsetzung</div>
            <div className="text-2xl font-extrabold text-purple-600 mt-1">
              {stats.inProgress}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Aktive KI-Implementierung</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Bereits umgesetzt</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {stats.implemented}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Verbesserungen live</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1">Typ:</span>
            {(
              [
                { key: "all", label: "Alle" },
                { key: "idea", label: "💡 Ideen" },
                { key: "feedback", label: "💬 Feedback" },
                { key: "bug", label: "🐛 Fehler" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setFilterType(btn.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  filterType === btn.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {btn.label}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
            {(
              [
                { key: "all", label: "Alle" },
                { key: "open", label: "Offen" },
                { key: "in_progress", label: "In Umsetzung" },
                { key: "implemented", label: "Umgesetzt" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setFilterStatus(btn.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  filterStatus === btn.key
                    ? "bg-red-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Feedback, Name oder Thema suchen..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Grouped Feedback List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Feedback wird geladen...</p>
          </div>
        ) : groupedByTopic.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
            <p className="text-sm font-bold text-slate-800">
              Keine Einträge für diesen Filter gefunden.
            </p>
            <p className="text-xs text-slate-500">
              Nutze den Feedback-Button, um neue Einträge zu erfassen.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByTopic.map(([topicName, topicItems]) => (
              <section
                key={topicName}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Topic Group Header */}
                <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <FolderKanban className="w-4 h-4 text-red-400" aria-hidden="true" />
                    <h2 className="text-sm sm:text-base font-bold">{topicName}</h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 text-xs font-bold">
                    {topicItems.length} {topicItems.length === 1 ? "Eintrag" : "Einträge"}
                  </span>
                </div>

                {/* Items inside Topic */}
                <div className="divide-y divide-slate-200">
                  {topicItems.map((item) => (
                    <article
                      key={item.id}
                      className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                    >
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderTypeBadge(item.type)}
                          {renderStatusBadge(item.status)}
                          <span className="text-xs text-slate-400">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {(item.authorName || item.authorEmail) && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                              <User className="w-3 h-3 text-slate-500" aria-hidden="true" />
                              <span>{item.authorName || "Anonym"}</span>
                              {item.authorEmail && (
                                <a
                                  href={`mailto:${item.authorEmail}`}
                                  className="text-red-600 hover:underline inline-flex items-center gap-0.5 ml-1"
                                >
                                  <Mail className="w-3 h-3" aria-hidden="true" />
                                  <span>{item.authorEmail}</span>
                                </a>
                              )}
                            </span>
                          )}
                          {item.pageContext && (
                            <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              Seite: {item.pageContext}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                          {item.message}
                        </p>

                        {item.additionalContext && (
                          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1">
                            <div className="font-bold text-amber-900">
                              Zusätzlicher Implementierungs-Kontext:
                            </div>
                            <div className="whitespace-pre-wrap">{item.additionalContext}</div>
                          </div>
                        )}

                        {item.implementationLog && (
                          <details className="group rounded-xl bg-slate-950 text-slate-200 border border-slate-800 overflow-hidden text-xs">
                            <summary className="px-3.5 py-2 cursor-pointer font-semibold flex items-center justify-between select-none bg-slate-900/90 hover:bg-slate-900">
                              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                                <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>
                                  Implementierungs-Protokoll (
                                  {item.agentUsed === "agy" ? "Antigravity CLI" : "Claude Code"})
                                </span>
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Details ein-/ausblenden
                              </span>
                            </summary>
                            <pre className="p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-60 text-emerald-300 whitespace-pre-wrap">
                              {item.implementationLog}
                            </pre>
                          </details>
                        )}
                      </div>

                      {/* Right Action Column */}
                      <div className="flex flex-wrap lg:flex-col items-center lg:items-end justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openImplementModal(item)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Implement Improvement</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {item.status !== "implemented" ? (
                            <button
                              type="button"
                              onClick={() => void handleStatusChange(item.id, "implemented")}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-semibold transition-colors"
                              title="Als umgesetzt markieren"
                            >
                              Als umgesetzt markieren
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleStatusChange(item.id, "open")}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold transition-colors"
                            >
                              Wieder öffnen
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            aria-label="Feedback löschen"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eintrag löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* "Implement Improvement" Modal */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-label="Implement Improvement"
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider">
                      Implement Improvement
                    </span>
                    <span className="text-xs text-slate-300">{activeItem.topic}</span>
                  </div>
                  <h2 className="text-lg font-bold mt-1">
                    Feedback mit zusätzlichem Kontext direkt umsetzen
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  aria-label="Modal schliessen"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleStartImplementation} className="p-6 space-y-4">
                {/* Original Feedback Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {renderTypeBadge(activeItem.type)}
                      {renderStatusBadge(activeItem.status)}
                    </div>
                    {(activeItem.authorName || activeItem.authorEmail) && (
                      <span className="text-xs text-slate-500">
                        Von: {activeItem.authorName || "Anonym"}
                        {activeItem.authorEmail ? ` (${activeItem.authorEmail})` : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">
                    {activeItem.message}
                  </p>
                </div>

                {/* Additional Context Input */}
                <div>
                  <label
                    htmlFor="implement-additional-context"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Zusätzlicher Kontext & Umsetzungs-Anweisungen (optional)
                  </label>
                  <textarea
                    id="implement-additional-context"
                    rows={4}
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="Ergänze hier genaue Vorgaben, gewünschte Platzierung im UI, Berechnungslogik oder Randbedingungen für die Umsetzung..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                {/* Coding Agent Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <span className="block text-xs font-bold text-slate-700 mb-1">
                      Ausführender Coding-Agent:
                    </span>
                    <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedAgent("claude")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedAgent === "claude"
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Claude Code CLI
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAgent("agy")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedAgent === "agy"
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Antigravity CLI (agy)
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors self-start sm:self-end"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span className="text-emerald-700">Prompt kopiert!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Prompt kopieren</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Implementation Log inside Modal */}
                {activeItem.implementationLog && (
                  <div className="rounded-xl bg-slate-950 text-emerald-300 border border-slate-800 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                      <span className="inline-flex items-center gap-1.5 text-emerald-400">
                        <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Live Agent Output</span>
                      </span>
                      {activeItem.status === "in_progress" && (
                        <span className="inline-flex items-center gap-1 text-purple-300">
                          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                          <span>Läuft...</span>
                        </span>
                      )}
                    </div>
                    <pre className="font-mono text-[11px] leading-relaxed overflow-x-auto max-h-56 whitespace-pre-wrap">
                      {activeItem.implementationLog}
                    </pre>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveItem(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Schliessen
                  </button>
                  <button
                    type="submit"
                    disabled={isTriggering || activeItem.status === "in_progress"}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md transition-all"
                  >
                    {isTriggering || activeItem.status === "in_progress" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Umsetzung läuft...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" aria-hidden="true" />
                        <span>Jetzt automatisch umsetzen</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
