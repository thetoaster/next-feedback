"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus,
  Lightbulb,
  MessageCircle,
  Bug,
  X,
  Send,
  CheckCircle2,
  Loader2,
  LayoutList,
  User,
  Mail,
  Tag,
} from "lucide-react";
import { FeedbackType, FeedbackWidgetProps } from "./types";

const DEFAULT_TOPIC_OPTIONS = [
  { value: "auto", label: "✨ Thema automatisch erkennen" },
  { value: "Ideen & Features", label: "Ideen & Features" },
  { value: "Fehler & Bugs", label: "Fehler & Bugs" },
  { value: "UI, Layout & Design", label: "UI, Layout & Design" },
  { value: "Performance & Ladezeit", label: "Performance & Ladezeit" },
  { value: "Allgemeines & Sonstiges", label: "Allgemeines & Sonstiges" },
];

function getCandidateUrls(path: string): string[] {
  if (typeof window === "undefined") return [path];
  if (path.startsWith("http://") || path.startsWith("https://")) return [path];

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const urls: string[] = [];

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

export function FeedbackWidget({
  apiPath = "/api/feedback",
  adminHref = "/admin",
  topics,
  title = "Feedback & Ideen einreichen",
  subtitle = "Hilf uns, das Tool gezielt zu verbessern",
  triggerLabel = "Feedback & Ideen",
  position = "bottom-right",
  className = "",
}: FeedbackWidgetProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("idea");
  const [topic, setTopic] = useState<string>("auto");
  const [message, setMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const topicOptions = React.useMemo(() => {
    if (!topics || topics.length === 0) return DEFAULT_TOPIC_OPTIONS;
    const mapped = topics.map((t) =>
      typeof t === "string" ? { value: t, label: t } : t
    );
    if (!mapped.some((t) => t.value === "auto")) {
      return [{ value: "auto", label: "✨ Thema automatisch erkennen" }, ...mapped];
    }
    return mapped;
  }, [topics]);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem("app_feedback_name");
      const savedEmail = localStorage.getItem("app_feedback_email");
      if (savedName) setAuthorName(savedName);
      if (savedEmail) setAuthorEmail(savedEmail);
    } catch {
      // Ignore storage access error
    }
  }, []);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const t = setTimeout(() => textareaRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const postFeedback = async (payload: any) => {
    const candidates = getCandidateUrls(apiPath);
    let lastError: any = null;
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) return res;
        if (res.status === 404) continue;
        return res;
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) throw lastError;
    return new Response(JSON.stringify({ error: "Endpoint not found" }), { status: 404 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (authorName.trim()) {
        localStorage.setItem("app_feedback_name", authorName.trim());
      }
      if (authorEmail.trim()) {
        localStorage.setItem("app_feedback_email", authorEmail.trim());
      }
    } catch {
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
    } catch {
      setErrorMsg("Feedback konnte nicht gesendet werden. Bitte erneut versuchen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolvedAdminHref = React.useMemo(() => {
    if (!adminHref) return adminHref;
    const cleanAdmin = adminHref.startsWith("/") ? adminHref : `/${adminHref}`;
    if (typeof window === "undefined") return cleanAdmin;

    const fullPath = window.location.pathname.replace(/\/$/, "");
    const routePath = pathname && pathname !== "/" ? pathname.replace(/\/$/, "") : "";
    const basePath =
      routePath && fullPath.endsWith(routePath)
        ? fullPath.slice(0, fullPath.length - routePath.length)
        : !routePath && fullPath && fullPath !== "/"
        ? fullPath
        : "";

    if (basePath && !cleanAdmin.startsWith(`${basePath}/`) && cleanAdmin !== basePath) {
      return `${basePath}${cleanAdmin}`;
    }
    return cleanAdmin;
  }, [adminHref, pathname, isOpen]);

  const posClasses =
    position === "bottom-left" ? "bottom-5 left-5 items-start" : "bottom-5 right-5 items-end";

  return (
    <div className={`fixed z-50 no-print flex flex-col ${posClasses} ${className}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label={title}
            className="mb-3 w-[360px] sm:w-[400px] max-w-[calc(100vw-2.5rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
                  <MessageSquarePlus className="w-4 h-4 text-white" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-bold leading-tight">{title}</h2>
                  <p className="text-[11px] text-slate-300">{subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Feedback-Fenster schliessen"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {submittedSuccess ? (
              <div className="p-6 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Vielen Dank für dein Feedback!
                </h3>
                <p className="text-xs text-slate-600">
                  Dein Eintrag wurde intern gespeichert und nach Thema gruppiert.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
                {/* Category Pills */}
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Art der Rückmeldung
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setType("idea")}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                        type === "idea"
                          ? "bg-amber-50 border-amber-400 text-amber-900 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Lightbulb
                        className={`w-3.5 h-3.5 ${
                          type === "idea" ? "text-amber-600" : "text-slate-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span>Idee</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType("feedback")}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                        type === "feedback"
                          ? "bg-blue-50 border-blue-400 text-blue-900 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <MessageCircle
                        className={`w-3.5 h-3.5 ${
                          type === "feedback" ? "text-blue-600" : "text-slate-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span>Feedback</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType("bug")}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                        type === "bug"
                          ? "bg-red-50 border-red-400 text-red-900 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Bug
                        className={`w-3.5 h-3.5 ${
                          type === "bug" ? "text-red-600" : "text-slate-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span>Fehler</span>
                    </button>
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <label
                    htmlFor="feedback-widget-msg"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    Beschreibung *
                  </label>
                  <textarea
                    ref={textareaRef}
                    id="feedback-widget-msg"
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        handleSubmit(e);
                      }
                    }}
                    placeholder={
                      type === "idea"
                        ? "Welche Funktion oder Verbesserung würde das Tool noch besser machen?"
                        : type === "bug"
                        ? "Was hat nicht wie erwartet funktioniert?"
                        : "Dein Eindruck oder Verbesserungsvorschlag..."
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none resize-none"
                  />
                </div>

                {/* Topic Selection */}
                <div>
                  <label
                    htmlFor="feedback-widget-topic"
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    <Tag className="w-3 h-3" aria-hidden="true" />
                    <span>Thema / Bereich</span>
                  </label>
                  <select
                    id="feedback-widget-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-900 focus:outline-none"
                  >
                    {topicOptions.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name & Email (Optional) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="feedback-widget-name"
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1"
                    >
                      <User className="w-3 h-3" aria-hidden="true" />
                      <span>Name (optional)</span>
                    </label>
                    <input
                      id="feedback-widget-name"
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Dein Name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="feedback-widget-email"
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1"
                    >
                      <Mail className="w-3 h-3" aria-hidden="true" />
                      <span>E-Mail (optional)</span>
                    </label>
                    <input
                      id="feedback-widget-email"
                      type="email"
                      value={authorEmail}
                      onChange={(e) => setAuthorEmail(e.target.value)}
                      placeholder="name@domain.ch"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs font-semibold text-red-600">{errorMsg}</p>
                )}

                {/* Submit & Admin Footer */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  {resolvedAdminHref && (
                    <a
                      href={resolvedAdminHref}
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Dashboard ({resolvedAdminHref})</span>
                    </a>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all ml-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        <span>Speichert...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Feedback senden</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hovering Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-xl border border-slate-700/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm">
          {isOpen ? (
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </span>
        <span>{triggerLabel}</span>
      </button>
    </div>
  );
}
