"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lightbulb, MessageCircle, Bug, Sparkles, CheckCircle2, Clock, Loader2, Play, Trash2, User, Mail, FolderKanban, Search, Copy, Check, X, Terminal, RefreshCw, } from "lucide-react";
function getCandidateUrls(path) {
    if (typeof window === "undefined")
        return [path];
    if (path.startsWith("http://") || path.startsWith("https://"))
        return [path];
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const urls = [];
    // Check if current URL is under a subpath (e.g. /pension-planner/admin)
    const segments = window.location.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
        const rootPrefix = `/${segments[0]}`;
        if (!cleanPath.startsWith(rootPrefix)) {
            urls.push(`${rootPrefix}${cleanPath}`);
        }
    }
    // Exact cleanPath
    urls.push(cleanPath);
    return urls;
}
export function FeedbackAdmin({ apiPath = "/api/feedback", implementApiPath = "/api/feedback/implement", backHref = "/", backLabel = "Zurück zur App", title = "Feedback & Produkt-Verbesserungen", subtitle = "Alle gesammelten Ideen, Rückmeldungen & Fehlerberichte gruppiert nach Thema", }) {
    const pathname = usePathname();
    const [items, setItems] = useState([]);
    const [resolvedBackHref, setResolvedBackHref] = useState(backHref);
    useEffect(() => {
        if (!backHref || typeof window === "undefined")
            return;
        const cleanBack = backHref.startsWith("/") ? backHref : `/${backHref}`;
        const fullPath = window.location.pathname.replace(/\/$/, "");
        const routePath = pathname && pathname !== "/" ? pathname.replace(/\/$/, "") : "";
        const basePath = routePath && fullPath.endsWith(routePath)
            ? fullPath.slice(0, fullPath.length - routePath.length)
            : !routePath && fullPath && fullPath !== "/"
                ? fullPath
                : "";
        if (basePath && !cleanBack.startsWith(`${basePath}/`) && cleanBack !== basePath) {
            setResolvedBackHref(cleanBack === "/" ? basePath : `${basePath}${cleanBack}`);
        }
        else {
            setResolvedBackHref(cleanBack);
        }
    }, [backHref, pathname]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    // Modal state for "Implement Improvement"
    const [activeItem, setActiveItem] = useState(null);
    const [additionalContext, setAdditionalContext] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("claude");
    const [isTriggering, setIsTriggering] = useState(false);
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const fetchWithFallback = useCallback(async (path, options) => {
        const candidates = getCandidateUrls(path);
        let lastError = null;
        for (const url of candidates) {
            try {
                const res = await fetch(url, options);
                if (res.ok)
                    return res;
                if (res.status === 404)
                    continue;
                return res;
            }
            catch (err) {
                lastError = err;
            }
        }
        if (lastError)
            throw lastError;
        return new Response(JSON.stringify({ error: "Endpoint not found" }), { status: 404 });
    }, []);
    const fetchFeedback = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithFallback(apiPath, { cache: "no-store" });
            if (res && res.ok) {
                const data = await res.json();
                if (Array.isArray(data.items)) {
                    setItems(data.items);
                    setActiveItem((prev) => {
                        if (!prev)
                            return null;
                        return data.items.find((i) => i.id === prev.id) || prev;
                    });
                }
            }
        }
        catch (err) {
            console.warn("Feedback fetch error:", err);
        }
        finally {
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
    const hasInProgress = useMemo(() => items.some((i) => i.status === "in_progress"), [items]);
    useEffect(() => {
        if (!hasInProgress)
            return;
        const interval = setInterval(() => {
            void fetchFeedback();
        }, 2000);
        return () => clearInterval(interval);
    }, [hasInProgress, fetchFeedback]);
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (filterType !== "all" && item.type !== filterType)
                return false;
            if (filterStatus !== "all" && item.status !== filterStatus)
                return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchMsg = item.message.toLowerCase().includes(q);
                const matchTopic = item.topic.toLowerCase().includes(q);
                const matchAuthor = (item.authorName || "").toLowerCase().includes(q);
                const matchEmail = (item.authorEmail || "").toLowerCase().includes(q);
                if (!matchMsg && !matchTopic && !matchAuthor && !matchEmail)
                    return false;
            }
            return true;
        });
    }, [items, filterType, filterStatus, searchQuery]);
    // Group filtered items by topic
    const groupedByTopic = useMemo(() => {
        const groups = new Map();
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
    const openImplementModal = (item) => {
        setActiveItem(item);
        setAdditionalContext(item.additionalContext || "");
        setSelectedAgent(item.agentUsed || "claude");
    };
    const handleStatusChange = async (id, status) => {
        try {
            const res = await fetchWithFallback(apiPath, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    status,
                    implementedAt: status === "implemented" ? new Date().toISOString() : undefined,
                }),
            });
            if (res && res.ok) {
                void fetchFeedback();
            }
        }
        catch (err) {
            console.warn("Status change error:", err);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm("Diesen Eintrag wirklich löschen?"))
            return;
        try {
            const url = `${apiPath}${apiPath.includes("?") ? "&" : "?"}id=${encodeURIComponent(id)}`;
            const res = await fetchWithFallback(url, {
                method: "DELETE",
            });
            if (res && res.ok) {
                if (activeItem?.id === id)
                    setActiveItem(null);
                void fetchFeedback();
            }
        }
        catch (err) {
            console.warn("Delete error:", err);
        }
    };
    const handleStartImplementation = async (e) => {
        e.preventDefault();
        if (!activeItem || isTriggering)
            return;
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
            if (res && res.ok) {
                await fetchFeedback();
            }
        }
        catch (err) {
            console.warn("Implementation start error:", err);
        }
        finally {
            setIsTriggering(false);
        }
    };
    const buildCopyablePrompt = (item, extraContext) => {
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
        if (!activeItem)
            return;
        navigator.clipboard.writeText(buildCopyablePrompt(activeItem, additionalContext));
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
    };
    const renderTypeBadge = (type) => {
        if (type === "idea") {
            return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200", children: [_jsx(Lightbulb, { className: "w-3 h-3 text-amber-600", "aria-hidden": "true" }), _jsx("span", { children: "Idee" })] }));
        }
        if (type === "bug") {
            return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200", children: [_jsx(Bug, { className: "w-3 h-3 text-red-600", "aria-hidden": "true" }), _jsx("span", { children: "Fehler" })] }));
        }
        return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200", children: [_jsx(MessageCircle, { className: "w-3 h-3 text-blue-600", "aria-hidden": "true" }), _jsx("span", { children: "Feedback" })] }));
    };
    const renderStatusBadge = (status) => {
        if (status === "implemented") {
            return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200", children: [_jsx(CheckCircle2, { className: "w-3 h-3 text-emerald-600", "aria-hidden": "true" }), _jsx("span", { children: "Umgesetzt" })] }));
        }
        if (status === "in_progress") {
            return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200", children: [_jsx(Loader2, { className: "w-3 h-3 text-purple-600 animate-spin", "aria-hidden": "true" }), _jsx("span", { children: "Wird umgesetzt..." })] }));
        }
        return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200", children: [_jsx(Clock, { className: "w-3 h-3 text-slate-500", "aria-hidden": "true" }), _jsx("span", { children: "Offen" })] }));
    };
    return (_jsxs("div", { className: "min-h-screen flex flex-col bg-slate-50 text-slate-900", children: [_jsx("header", { className: "sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200", children: _jsxs("div", { className: "max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [resolvedBackHref && (_jsxs("a", { href: resolvedBackHref, className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors", children: [_jsx(ArrowLeft, { className: "w-3.5 h-3.5", "aria-hidden": "true" }), _jsx("span", { children: backLabel })] })), _jsx("div", { className: "h-5 w-px bg-slate-200 hidden sm:block" }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h1", { className: "font-bold text-base sm:text-lg text-slate-900", children: title }), _jsx("span", { className: "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white rounded-md", children: "Admin" })] }), _jsx("p", { className: "text-xs text-slate-500 hidden md:block", children: subtitle })] })] }), _jsxs("button", { type: "button", onClick: () => void fetchFeedback(), className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors", children: [_jsx(RefreshCw, { className: "w-3.5 h-3.5", "aria-hidden": "true" }), _jsx("span", { className: "hidden sm:inline", children: "Aktualisieren" })] })] }) }), _jsxs("main", { className: "flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3.5", children: [_jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm", children: [_jsx("div", { className: "text-xs font-semibold text-slate-500", children: "Gesamtes Feedback" }), _jsx("div", { className: "text-2xl font-extrabold text-slate-900 mt-1", children: stats.total }), _jsxs("div", { className: "text-[11px] text-slate-400 mt-0.5", children: ["In ", groupedByTopic.length, " Themenbereichen"] })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm", children: [_jsx("div", { className: "text-xs font-semibold text-slate-500", children: "Offen zur Pr\u00FCfung" }), _jsx("div", { className: "text-2xl font-extrabold text-amber-600 mt-1", children: stats.open }), _jsx("div", { className: "text-[11px] text-slate-400 mt-0.5", children: "Bereit f\u00FCr Umsetzung" })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm", children: [_jsx("div", { className: "text-xs font-semibold text-slate-500", children: "In Umsetzung" }), _jsx("div", { className: "text-2xl font-extrabold text-purple-600 mt-1", children: stats.inProgress }), _jsx("div", { className: "text-[11px] text-slate-400 mt-0.5", children: "Aktive KI-Implementierung" })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm", children: [_jsx("div", { className: "text-xs font-semibold text-slate-500", children: "Bereits umgesetzt" }), _jsx("div", { className: "text-2xl font-extrabold text-emerald-600 mt-1", children: stats.implemented }), _jsx("div", { className: "text-[11px] text-slate-400 mt-0.5", children: "Verbesserungen live" })] })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-xs font-bold text-slate-500 mr-1", children: "Typ:" }), [
                                        { key: "all", label: "Alle" },
                                        { key: "idea", label: "💡 Ideen" },
                                        { key: "feedback", label: "💬 Feedback" },
                                        { key: "bug", label: "🐛 Fehler" },
                                    ].map((btn) => (_jsx("button", { type: "button", onClick: () => setFilterType(btn.key), className: `px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterType === btn.key
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`, children: btn.label }, btn.key))), _jsx("div", { className: "h-4 w-px bg-slate-200 mx-1 hidden sm:block" }), _jsx("span", { className: "text-xs font-bold text-slate-500 mr-1", children: "Status:" }), [
                                        { key: "all", label: "Alle" },
                                        { key: "open", label: "Offen" },
                                        { key: "in_progress", label: "In Umsetzung" },
                                        { key: "implemented", label: "Umgesetzt" },
                                    ].map((btn) => (_jsx("button", { type: "button", onClick: () => setFilterStatus(btn.key), className: `px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterStatus === btn.key
                                            ? "bg-red-600 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`, children: btn.label }, btn.key)))] }), _jsxs("div", { className: "relative w-full md:w-72", children: [_jsx(Search, { className: "w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2", "aria-hidden": "true" }), _jsx("input", { type: "search", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Feedback, Name oder Thema suchen...", className: "w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none" })] })] }), loading ? (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-12 text-center", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" }), _jsx("p", { className: "text-xs text-slate-500", children: "Feedback wird geladen..." })] })) : groupedByTopic.length === 0 ? (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2", children: [_jsx("p", { className: "text-sm font-bold text-slate-800", children: "Keine Eintr\u00E4ge f\u00FCr diesen Filter gefunden." }), _jsx("p", { className: "text-xs text-slate-500", children: "Nutze den Feedback-Button, um neue Eintr\u00E4ge zu erfassen." })] })) : (_jsx("div", { className: "space-y-6", children: groupedByTopic.map(([topicName, topicItems]) => (_jsxs("section", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", children: [_jsxs("div", { className: "bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(FolderKanban, { className: "w-4 h-4 text-red-400", "aria-hidden": "true" }), _jsx("h2", { className: "text-sm sm:text-base font-bold", children: topicName })] }), _jsxs("span", { className: "px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 text-xs font-bold", children: [topicItems.length, " ", topicItems.length === 1 ? "Eintrag" : "Einträge"] })] }), _jsx("div", { className: "divide-y divide-slate-200", children: topicItems.map((item) => (_jsxs("article", { className: "p-5 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-4", children: [_jsxs("div", { className: "space-y-2.5 flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [renderTypeBadge(item.type), renderStatusBadge(item.status), _jsx("span", { className: "text-xs text-slate-400", children: new Date(item.createdAt).toLocaleString(undefined, {
                                                                    day: "2-digit",
                                                                    month: "2-digit",
                                                                    year: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                }) }), (item.authorName || item.authorEmail) && (_jsxs("span", { className: "inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full", children: [_jsx(User, { className: "w-3 h-3 text-slate-500", "aria-hidden": "true" }), _jsx("span", { children: item.authorName || "Anonym" }), item.authorEmail && (_jsxs("a", { href: `mailto:${item.authorEmail}`, className: "text-red-600 hover:underline inline-flex items-center gap-0.5 ml-1", children: [_jsx(Mail, { className: "w-3 h-3", "aria-hidden": "true" }), _jsx("span", { children: item.authorEmail })] }))] })), item.pageContext && (_jsxs("span", { className: "text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200", children: ["Seite: ", item.pageContext] }))] }), _jsx("p", { className: "text-sm text-slate-900 leading-relaxed whitespace-pre-wrap", children: item.message }), item.additionalContext && (_jsxs("div", { className: "p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1", children: [_jsx("div", { className: "font-bold text-amber-900", children: "Zus\u00E4tzlicher Implementierungs-Kontext:" }), _jsx("div", { className: "whitespace-pre-wrap", children: item.additionalContext })] })), item.implementationLog && (_jsxs("details", { className: "group rounded-xl bg-slate-950 text-slate-200 border border-slate-800 overflow-hidden text-xs", children: [_jsxs("summary", { className: "px-3.5 py-2 cursor-pointer font-semibold flex items-center justify-between select-none bg-slate-900/90 hover:bg-slate-900", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5 text-emerald-400", children: [_jsx(Terminal, { className: "w-3.5 h-3.5", "aria-hidden": "true" }), _jsxs("span", { children: ["Implementierungs-Protokoll (", item.agentUsed === "agy" ? "Antigravity CLI" : "Claude Code", ")"] })] }), _jsx("span", { className: "text-[11px] text-slate-400", children: "Details ein-/ausblenden" })] }), _jsx("pre", { className: "p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-60 text-emerald-300 whitespace-pre-wrap", children: item.implementationLog })] }))] }), _jsxs("div", { className: "flex flex-wrap lg:flex-col items-center lg:items-end justify-end gap-2 shrink-0", children: [_jsxs("button", { type: "button", onClick: () => openImplementModal(item), className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5", "aria-hidden": "true" }), _jsx("span", { children: "Implement Improvement" })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [item.status !== "implemented" ? (_jsx("button", { type: "button", onClick: () => void handleStatusChange(item.id, "implemented"), className: "px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-semibold transition-colors", title: "Als umgesetzt markieren", children: "Als umgesetzt markieren" })) : (_jsx("button", { type: "button", onClick: () => void handleStatusChange(item.id, "open"), className: "px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold transition-colors", children: "Wieder \u00F6ffnen" })), _jsx("button", { type: "button", onClick: () => void handleDelete(item.id), "aria-label": "Feedback l\u00F6schen", className: "p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors", title: "Eintrag l\u00F6schen", children: _jsx(Trash2, { className: "w-3.5 h-3.5", "aria-hidden": "true" }) })] })] })] }, item.id))) })] }, topicName))) }))] }), _jsx(AnimatePresence, { children: activeItem && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto", children: _jsxs(motion.div, { initial: { opacity: 0, scale: 0.96, y: 10 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 10 }, transition: { duration: 0.18 }, role: "dialog", "aria-label": "Implement Improvement", className: "relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8", children: [_jsxs("div", { className: "bg-slate-900 text-white px-6 py-4 flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider", children: "Implement Improvement" }), _jsx("span", { className: "text-xs text-slate-300", children: activeItem.topic })] }), _jsx("h2", { className: "text-lg font-bold mt-1", children: "Feedback mit zus\u00E4tzlichem Kontext direkt umsetzen" })] }), _jsx("button", { type: "button", onClick: () => setActiveItem(null), "aria-label": "Modal schliessen", className: "p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors", children: _jsx(X, { className: "w-4 h-4", "aria-hidden": "true" }) })] }), _jsxs("form", { onSubmit: handleStartImplementation, className: "p-6 space-y-4", children: [_jsxs("div", { className: "p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [renderTypeBadge(activeItem.type), renderStatusBadge(activeItem.status)] }), (activeItem.authorName || activeItem.authorEmail) && (_jsxs("span", { className: "text-xs text-slate-500", children: ["Von: ", activeItem.authorName || "Anonym", activeItem.authorEmail ? ` (${activeItem.authorEmail})` : ""] }))] }), _jsx("p", { className: "text-sm font-medium text-slate-900 whitespace-pre-wrap", children: activeItem.message })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "implement-additional-context", className: "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5", children: "Zus\u00E4tzlicher Kontext & Umsetzungs-Anweisungen (optional)" }), _jsx("textarea", { id: "implement-additional-context", rows: 4, value: additionalContext, onChange: (e) => setAdditionalContext(e.target.value), placeholder: "Erg\u00E4nze hier genaue Vorgaben, gew\u00FCnschte Platzierung im UI, Berechnungslogik oder Randbedingungen f\u00FCr die Umsetzung...", className: "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none" })] }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-xs font-bold text-slate-700 mb-1", children: "Ausf\u00FChrender Coding-Agent:" }), _jsxs("div", { className: "inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200", children: [_jsx("button", { type: "button", onClick: () => setSelectedAgent("claude"), className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedAgent === "claude"
                                                                    ? "bg-slate-900 text-white shadow-sm"
                                                                    : "text-slate-600 hover:text-slate-900"}`, children: "Claude Code CLI" }), _jsx("button", { type: "button", onClick: () => setSelectedAgent("agy"), className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedAgent === "agy"
                                                                    ? "bg-slate-900 text-white shadow-sm"
                                                                    : "text-slate-600 hover:text-slate-900"}`, children: "Antigravity CLI (agy)" })] })] }), _jsx("button", { type: "button", onClick: handleCopyPrompt, className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors self-start sm:self-end", children: copiedPrompt ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-3.5 h-3.5 text-emerald-600", "aria-hidden": "true" }), _jsx("span", { className: "text-emerald-700", children: "Prompt kopiert!" })] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { className: "w-3.5 h-3.5", "aria-hidden": "true" }), _jsx("span", { children: "Prompt kopieren" })] })) })] }), activeItem.implementationLog && (_jsxs("div", { className: "rounded-xl bg-slate-950 text-emerald-300 border border-slate-800 p-3.5 space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] text-slate-400 font-semibold", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5 text-emerald-400", children: [_jsx(Terminal, { className: "w-3.5 h-3.5", "aria-hidden": "true" }), _jsx("span", { children: "Live Agent Output" })] }), activeItem.status === "in_progress" && (_jsxs("span", { className: "inline-flex items-center gap-1 text-purple-300", children: [_jsx(Loader2, { className: "w-3 h-3 animate-spin", "aria-hidden": "true" }), _jsx("span", { children: "L\u00E4uft..." })] }))] }), _jsx("pre", { className: "font-mono text-[11px] leading-relaxed overflow-x-auto max-h-56 whitespace-pre-wrap", children: activeItem.implementationLog })] })), _jsxs("div", { className: "pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5", children: [_jsx("button", { type: "button", onClick: () => setActiveItem(null), className: "px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors", children: "Schliessen" }), _jsx("button", { type: "submit", disabled: isTriggering || activeItem.status === "in_progress", className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md transition-all", children: isTriggering || activeItem.status === "in_progress" ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin", "aria-hidden": "true" }), _jsx("span", { children: "Umsetzung l\u00E4uft..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { className: "w-4 h-4", "aria-hidden": "true" }), _jsx("span", { children: "Jetzt automatisch umsetzen" })] })) })] })] })] }) })) })] }));
}
//# sourceMappingURL=FeedbackAdmin.js.map