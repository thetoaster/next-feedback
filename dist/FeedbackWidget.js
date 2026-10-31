"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, Lightbulb, MessageCircle, Bug, X, Send, CheckCircle2, Loader2, LayoutList, User, Mail, Tag, } from "lucide-react";
const DEFAULT_TOPIC_OPTIONS = [
    { value: "auto", label: "✨ Thema automatisch erkennen" },
    { value: "Ideen & Features", label: "Ideen & Features" },
    { value: "Fehler & Bugs", label: "Fehler & Bugs" },
    { value: "UI, Layout & Design", label: "UI, Layout & Design" },
    { value: "Performance & Ladezeit", label: "Performance & Ladezeit" },
    { value: "Allgemeines & Sonstiges", label: "Allgemeines & Sonstiges" },
];
function getCandidateUrls(path) {
    if (typeof window === "undefined")
        return [path];
    if (path.startsWith("http://") || path.startsWith("https://"))
        return [path];
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const urls = [];
    const segments = window.location.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
        const rootPrefix = `/${segments[0]}`;
        if (!cleanPath.startsWith(rootPrefix)) {
            urls.push(`${rootPrefix}${cleanPath}`);
        }
    }
    urls.push(cleanPath);
    return urls;
}
export function FeedbackWidget({ apiPath = "/api/feedback", adminHref = "/admin", topics, title = "Feedback & Ideen einreichen", subtitle = "Hilf uns, das Tool gezielt zu verbessern", triggerLabel = "Feedback & Ideen", position = "bottom-right", className = "", }) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState("idea");
    const [topic, setTopic] = useState("auto");
    const [message, setMessage] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [authorEmail, setAuthorEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedSuccess, setSubmittedSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const textareaRef = useRef(null);
    const topicOptions = React.useMemo(() => {
        if (!topics || topics.length === 0)
            return DEFAULT_TOPIC_OPTIONS;
        const mapped = topics.map((t) => typeof t === "string" ? { value: t, label: t } : t);
        if (!mapped.some((t) => t.value === "auto")) {
            return [{ value: "auto", label: "✨ Thema automatisch erkennen" }, ...mapped];
        }
        return mapped;
    }, [topics]);
    useEffect(() => {
        try {
            const savedName = localStorage.getItem("app_feedback_name");
            const savedEmail = localStorage.getItem("app_feedback_email");
            if (savedName)
                setAuthorName(savedName);
            if (savedEmail)
                setAuthorEmail(savedEmail);
        }
        catch {
            // Ignore storage access error
        }
    }, []);
    useEffect(() => {
        if (isOpen && textareaRef.current) {
            const t = setTimeout(() => textareaRef.current?.focus(), 80);
            return () => clearTimeout(t);
        }
    }, [isOpen]);
    const postFeedback = async (payload) => {
        const candidates = getCandidateUrls(apiPath);
        let lastError = null;
        for (const url of candidates) {
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
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
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim() || isSubmitting)
            return;
        setIsSubmitting(true);
        setErrorMsg(null);
        try {
            if (authorName.trim()) {
                localStorage.setItem("app_feedback_name", authorName.trim());
            }
            if (authorEmail.trim()) {
                localStorage.setItem("app_feedback_email", authorEmail.trim());
            }
        }
        catch {
            // Ignore
        }
        const payload = {
            type,
            topic: topic === "auto" ? undefined : topic,
            message: message.trim(),
            authorName: authorName.trim() || undefined,
            authorEmail: authorEmail.trim() || undefined,
            pageContext: pathname || (typeof window !== "undefined" ? window.location.pathname : "/"),
        };
        try {
            const res = await postFeedback(payload);
            if (!res.ok) {
                throw new Error("Failed to save feedback");
            }
            setSubmittedSuccess(true);
            setMessage("");
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("feedback-updated"));
            }
            setTimeout(() => {
                setSubmittedSuccess(false);
                setIsOpen(false);
            }, 1600);
        }
        catch {
            setErrorMsg("Feedback konnte nicht gesendet werden. Bitte erneut versuchen.");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const resolvedAdminHref = React.useMemo(() => {
        if (!adminHref)
            return adminHref;
        if (typeof window === "undefined")
            return adminHref;
        const segments = window.location.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
            const prefix = `/${segments[0]}`;
            if (!adminHref.startsWith(prefix)) {
                return `${prefix}${adminHref.startsWith("/") ? "" : "/"}${adminHref}`;
            }
        }
        return adminHref;
    }, [adminHref]);
    const posClasses = position === "bottom-left" ? "bottom-5 left-5 items-start" : "bottom-5 right-5 items-end";
    return (_jsxs("div", { className: `fixed z-50 no-print flex flex-col ${posClasses} ${className}`, children: [_jsx(AnimatePresence, { children: isOpen && (_jsxs(motion.div, { initial: { opacity: 0, y: 14, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 14, scale: 0.96 }, transition: { duration: 0.18 }, role: "dialog", "aria-label": title, className: "mb-3 w-[360px] sm:w-[400px] max-w-[calc(100vw-2.5rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden", children: [_jsxs("div", { className: "bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center", children: _jsx(MessageSquarePlus, { className: "w-4 h-4 text-white", "aria-hidden": "true" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-sm font-bold leading-tight", children: title }), _jsx("p", { className: "text-[11px] text-slate-300", children: subtitle })] })] }), _jsx("button", { type: "button", onClick: () => setIsOpen(false), "aria-label": "Feedback-Fenster schliessen", className: "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors", children: _jsx(X, { className: "w-4 h-4", "aria-hidden": "true" }) })] }), submittedSuccess ? (_jsxs("div", { className: "p-6 text-center space-y-2.5", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto", children: _jsx(CheckCircle2, { className: "w-6 h-6", "aria-hidden": "true" }) }), _jsx("h3", { className: "text-base font-bold text-slate-900", children: "Vielen Dank f\u00FCr dein Feedback!" }), _jsx("p", { className: "text-xs text-slate-600", children: "Dein Eintrag wurde intern gespeichert und nach Thema gruppiert." })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "p-4 space-y-3.5", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5", children: "Art der R\u00FCckmeldung" }), _jsxs("div", { className: "grid grid-cols-3 gap-1.5", children: [_jsxs("button", { type: "button", onClick: () => setType("idea"), className: `flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${type === "idea"
                                                        ? "bg-amber-50 border-amber-400 text-amber-900 shadow-sm"
                                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`, children: [_jsx(Lightbulb, { className: `w-3.5 h-3.5 ${type === "idea" ? "text-amber-600" : "text-slate-400"}`, "aria-hidden": "true" }), _jsx("span", { children: "Idee" })] }), _jsxs("button", { type: "button", onClick: () => setType("feedback"), className: `flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${type === "feedback"
                                                        ? "bg-blue-50 border-blue-400 text-blue-900 shadow-sm"
                                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`, children: [_jsx(MessageCircle, { className: `w-3.5 h-3.5 ${type === "feedback" ? "text-blue-600" : "text-slate-400"}`, "aria-hidden": "true" }), _jsx("span", { children: "Feedback" })] }), _jsxs("button", { type: "button", onClick: () => setType("bug"), className: `flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${type === "bug"
                                                        ? "bg-red-50 border-red-400 text-red-900 shadow-sm"
                                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`, children: [_jsx(Bug, { className: `w-3.5 h-3.5 ${type === "bug" ? "text-red-600" : "text-slate-400"}`, "aria-hidden": "true" }), _jsx("span", { children: "Fehler" })] })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "feedback-widget-msg", className: "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1", children: "Beschreibung *" }), _jsx("textarea", { ref: textareaRef, id: "feedback-widget-msg", rows: 3, required: true, value: message, onChange: (e) => setMessage(e.target.value), onKeyDown: (e) => {
                                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                                    handleSubmit(e);
                                                }
                                            }, placeholder: type === "idea"
                                                ? "Welche Funktion oder Verbesserung würde das Tool noch besser machen?"
                                                : type === "bug"
                                                    ? "Was hat nicht wie erwartet funktioniert?"
                                                    : "Dein Eindruck oder Verbesserungsvorschlag...", className: "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none resize-none" })] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "feedback-widget-topic", className: "flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1", children: [_jsx(Tag, { className: "w-3 h-3", "aria-hidden": "true" }), _jsx("span", { children: "Thema / Bereich" })] }), _jsx("select", { id: "feedback-widget-topic", value: topic, onChange: (e) => setTopic(e.target.value), className: "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-900 focus:outline-none", children: topicOptions.map((t) => (_jsx("option", { value: t.value, children: t.label }, t.value))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsxs("label", { htmlFor: "feedback-widget-name", className: "flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1", children: [_jsx(User, { className: "w-3 h-3", "aria-hidden": "true" }), _jsx("span", { children: "Name (optional)" })] }), _jsx("input", { id: "feedback-widget-name", type: "text", value: authorName, onChange: (e) => setAuthorName(e.target.value), placeholder: "Dein Name", className: "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none" })] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "feedback-widget-email", className: "flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1", children: [_jsx(Mail, { className: "w-3 h-3", "aria-hidden": "true" }), _jsx("span", { children: "E-Mail (optional)" })] }), _jsx("input", { id: "feedback-widget-email", type: "email", value: authorEmail, onChange: (e) => setAuthorEmail(e.target.value), placeholder: "name@domain.ch", className: "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none" })] })] }), errorMsg && (_jsx("p", { className: "text-xs font-semibold text-red-600", children: errorMsg })), _jsxs("div", { className: "pt-1 flex items-center justify-between gap-2", children: [resolvedAdminHref && (_jsxs(Link, { href: resolvedAdminHref, onClick: () => setIsOpen(false), className: "inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors", children: [_jsx(LayoutList, { className: "w-3.5 h-3.5", "aria-hidden": "true" }), _jsxs("span", { children: ["Dashboard (", adminHref, ")"] })] })), _jsx("button", { type: "submit", disabled: isSubmitting || !message.trim(), className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all ml-auto", children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin", "aria-hidden": "true" }), _jsx("span", { children: "Speichert..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { className: "w-3.5 h-3.5", "aria-hidden": "true" }), _jsx("span", { children: "Feedback senden" })] })) })] })] }))] })) }), _jsxs("button", { type: "button", onClick: () => setIsOpen((prev) => !prev), className: "group inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-xl border border-slate-700/80 transition-all hover:scale-[1.02] active:scale-[0.98]", children: [_jsx("span", { className: "w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm", children: isOpen ? (_jsx(X, { className: "w-3.5 h-3.5", "aria-hidden": "true" })) : (_jsx(MessageSquarePlus, { className: "w-3.5 h-3.5", "aria-hidden": "true" })) }), _jsx("span", { children: triggerLabel })] })] }));
}
//# sourceMappingURL=FeedbackWidget.js.map