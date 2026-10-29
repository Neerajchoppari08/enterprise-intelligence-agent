"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Globe2,
  Menu,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

type Source = {
  name: string;
  detail?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  latency?: number;
  status?: string;
};

const suggestions = [
  {
    number: "01",
    title: "Information security",
    question: "Summarize our information security policies.",
  },
  {
    number: "02",
    title: "Employee policies",
    question: "What are the key employee leave policies?",
  },
  {
    number: "03",
    title: "Business expenses",
    question: "Explain our business expense reimbursement policy.",
  },
];

function normalizeSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    if (typeof item === "string") {
      return { name: item };
    }

    if (item && typeof item === "object") {
      const source = item as Record<string, unknown>;

      return {
        name: String(
          source.title ??
            source.filename ??
            source.name ??
            source.source ??
            `Document ${index + 1}`,
        ),
        detail:
          typeof source.content === "string"
            ? source.content
            : typeof source.snippet === "string"
              ? source.snippet
              : undefined,
      };
    }

    return { name: `Document ${index + 1}` };
  });
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedSources, setExpandedSources] = useState<string | null>(null);

  const conversationStarted = messages.length > 0;

  async function sendQuestion(
    event?: FormEvent<HTMLFormElement>,
    suggestedQuestion?: string,
  ) {
    event?.preventDefault();

    const prompt = (suggestedQuestion ?? question).trim();

    if (!prompt || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    };

    setMessages((previous) => [...previous, userMessage]);
    setQuestion("");
    setLoading(true);
    setExpandedSources(null);

    try {
      const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const response = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "neeraj-local",
        },
        body: JSON.stringify({ question: prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item: { msg?: string }) => item.msg ?? "Request validation failed").join("; ")
          : data.detail;
        throw new Error(
          detail ?? data.message ?? `Request failed (${response.status})`,
        );
      }

      const answer =
        data.answer ??
        data.response ??
        data.result ??
        "The request completed, but the API did not return an answer.";

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          typeof answer === "string" ? answer : JSON.stringify(answer, null, 2),
        sources: normalizeSources(data.sources ?? data.documents),
        latency:
          typeof data.metrics?.latency === "number"
            ? data.metrics.latency
            : typeof data.latency === "number"
              ? data.latency
              : undefined,
        status: typeof data.status === "string" ? data.status : undefined,
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred.";

      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I couldn't reach the intelligence service. ${message}\n\nPlease check that the backend is running and that its CORS settings allow this frontend's origin.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setQuestion("");
    setExpandedSources(null);
    setMenuOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#172c3b]">
      {/* Top navigation */}
      <header className="relative z-20 border-b border-[#172c3b]/10 bg-[#f7f6f2]/95">
        <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-14">
          <button
            onClick={startNewChat}
            className="flex items-center gap-3 text-left"
            aria-label="Go to home"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-[#172c3b] text-[#f7f6f2]">
              <Building2 size={21} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-serif text-[19px] leading-tight tracking-[-0.5px]">
                Meridian
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[2.5px] text-[#617887]">
                Enterprise intelligence
              </p>
            </div>
          </button>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#platform"
              className="text-xs text-[#536673] transition hover:text-[#172c3b]"
            >
              Platform
            </a>
            <a
              href="#capabilities"
              className="text-xs text-[#536673] transition hover:text-[#172c3b]"
            >
              Capabilities
            </a>
            <a
              href="#workspace"
              className="text-xs text-[#536673] transition hover:text-[#172c3b]"
            >
              Workspace
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#d9dfd9] px-3 py-2 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#64866f]" />
              <span className="text-[10px] tracking-wide text-[#536673]">
                Private workspace
              </span>
            </div>

            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center border border-[#d9dfd9] transition hover:bg-white md:hidden"
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-[#172c3b]/10 bg-[#f7f6f2] px-6 md:hidden"
            >
              <div className="flex flex-col gap-5 py-5 text-sm">
                <a href="#platform" onClick={() => setMenuOpen(false)}>
                  Platform
                </a>
                <a href="#capabilities" onClick={() => setMenuOpen(false)}>
                  Capabilities
                </a>
                <a href="#workspace" onClick={() => setMenuOpen(false)}>
                  Workspace
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Hero */}
      <section id="platform" className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="hero-architecture absolute inset-0"
            role="img"
            aria-label="Contemporary glass office towers"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#101f2b]/95 via-[#142b3b]/85 to-[#142b3b]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#142b3b]/55 via-transparent to-[#142b3b]/15" />
        </div>

        <div className="relative mx-auto grid min-h-[530px] max-w-[1600px] items-center gap-12 px-5 py-20 sm:px-8 lg:min-h-[570px] lg:grid-cols-[1.2fr_0.8fr] lg:px-14 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-[730px]"
          >
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-9 bg-[#c1d0c7]" />
              <span className="text-[10px] uppercase tracking-[3px] text-[#d3ddd7]">
                Intelligence for modern enterprises
              </span>
            </div>

            <h1 className="max-w-[720px] font-serif text-[45px] font-normal leading-[1.08] tracking-[-1.6px] text-[#fffdf7] sm:text-6xl lg:text-[76px]">
              Your knowledge.
              <br />
              <span className="italic text-[#c4d2c9]">In a new light.</span>
            </h1>

            <p className="mt-7 max-w-[510px] text-sm leading-7 text-white/75 sm:text-base sm:leading-8">
              Bring your organisation&apos;s knowledge into focus. Ask
              questions, uncover insights, and find answers grounded in your
              own documents.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#workspace"
                className="group inline-flex items-center gap-5 bg-[#f7f6f2] px-6 py-4 text-xs font-medium text-[#172c3b] transition hover:bg-white"
              >
                Explore your knowledge
                <ArrowDownRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1 group-hover:translate-y-1"
                />
              </a>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <ShieldCheck size={16} strokeWidth={1.5} />
                Built for internal knowledge
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden justify-self-end lg:block"
          >
            <div className="w-[280px] border border-white/25 bg-white/[0.08] p-6 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <Globe2 size={19} className="text-[#d0ded5]" strokeWidth={1.4} />
                <span className="text-[9px] uppercase tracking-[2px] text-white/65">
                  Workspace 001
                </span>
              </div>
              <div className="my-8 h-px bg-white/20" />
              <p className="font-serif text-3xl text-white">One source.</p>
              <p className="font-serif text-3xl italic text-[#c4d2c9]">
                Clear answers.
              </p>
              <p className="mt-4 text-xs leading-6 text-white/65">
                Discover relevant information across your organisation&apos;s
                internal documents.
              </p>
              <div className="mt-7 flex items-center gap-2 text-[10px] text-[#d0ded5]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a6c2ad]" />
                Intelligence workspace
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative border-t border-white/20">
          <div className="mx-auto grid max-w-[1600px] grid-cols-1 divide-y divide-white/15 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-14">
            <div className="flex items-center gap-3 py-5 sm:pr-6">
              <ShieldCheck size={17} className="text-[#c4d2c9]" />
              <span className="text-[11px] tracking-wide text-white/75">
                Grounded in your documents
              </span>
            </div>
            <div className="flex items-center gap-3 py-5 sm:px-6">
              <FileText size={17} className="text-[#c4d2c9]" />
              <span className="text-[11px] tracking-wide text-white/75">
                Context-aware answers
              </span>
            </div>
            <div className="flex items-center gap-3 py-5 sm:pl-6">
              <Sparkles size={17} className="text-[#c4d2c9]" />
              <span className="text-[11px] tracking-wide text-white/75">
                Designed for clarity
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Workspace */}
      <section
        id="workspace"
        className="mx-auto max-w-[1600px] scroll-mt-8 px-5 py-20 sm:px-8 lg:px-14 lg:py-28"
      >
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-7 bg-[#82998a]" />
              <span className="text-[10px] uppercase tracking-[2.7px] text-[#617887]">
                The intelligence desk
              </span>
            </div>

            <h2 className="max-w-md font-serif text-4xl font-normal leading-tight tracking-[-1px] sm:text-5xl">
              A better way to
              <br />
              <span className="italic text-[#718b7c]">find what matters.</span>
            </h2>

            <p className="mt-6 max-w-md text-sm leading-7 text-[#667783]">
              Your organisation already has the answers. Start a conversation
              with your knowledge base and let the relevant information come to
              you.
            </p>

            <div className="mt-9 border-t border-[#dce0da] pt-5">
              <p className="mb-4 text-[10px] uppercase tracking-[2px] text-[#81908e]">
                Try a suggested inquiry
              </p>

              <div className="space-y-2">
                {suggestions.map((item, index) => (
                  <motion.button
                    key={item.number}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    onClick={() => {
                      document
                        .getElementById("chat-input")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      void sendQuestion(undefined, item.question);
                    }}
                    disabled={loading}
                    className="group flex w-full items-center gap-4 border-b border-[#e0e3dd] py-4 text-left transition hover:border-[#718b7c] disabled:opacity-50"
                  >
                    <span className="font-mono text-[10px] text-[#879792]">
                      {item.number}
                    </span>
                    <span className="flex-1 text-sm text-[#263e4d]">
                      {item.title}
                    </span>
                    <ArrowRight
                      size={15}
                      className="text-[#9aa8a0] transition group-hover:translate-x-1 group-hover:text-[#263e4d]"
                    />
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-sm bg-[#eaece5] p-4">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0 text-[#607a68]"
              />
              <p className="text-[11px] leading-5 text-[#5b6c67]">
                Answers are generated by your connected intelligence service.
                Always review important information against the original source.
              </p>
            </div>
          </motion.div>

          {/* Chat panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex min-h-[600px] flex-col border border-[#dfe2dc] bg-white shadow-[0_18px_60px_rgba(23,44,59,0.045)]"
          >
            <div className="flex items-center justify-between border-b border-[#e9ebe6] px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-[#e9eee8] text-[#526f5d]">
                  <Sparkles size={19} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#213747]">
                    Intelligence assistant
                  </h3>
                  <p className="mt-1 text-[10px] text-[#85938e]">
                    Internal knowledge · AI-powered
                  </p>
                </div>
              </div>

              <button
                onClick={startNewChat}
                className="inline-flex items-center gap-2 border border-[#e1e5df] px-3 py-2 text-[10px] text-[#667783] transition hover:bg-[#f7f6f2]"
              >
                <Plus size={13} />
                <span className="hidden sm:inline">New conversation</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>

            <div className="flex flex-1 flex-col px-5 py-6 sm:px-7 sm:py-8">
              {!conversationStarted ? (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="mb-6 flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[#dce4dc] bg-[#f3f5f0]"
                  >
                    <MessageSquare
                      size={26}
                      strokeWidth={1.3}
                      className="text-[#607b68]"
                    />
                  </motion.div>

                  <p className="mb-3 text-[10px] uppercase tracking-[2.5px] text-[#82938a]">
                    Your workspace is ready
                  </p>

                  <h4 className="max-w-sm font-serif text-3xl leading-tight text-[#213747] sm:text-[34px]">
                    What would you like to know?
                  </h4>

                  <p className="mt-4 max-w-sm text-xs leading-6 text-[#89958f]">
                    Ask about policies, procedures, internal documents, or
                    business information.
                  </p>

                  <div className="mt-8 flex flex-wrap justify-center gap-2">
                    {["Summarize a policy", "Find key information"].map(
                      (item) => (
                        <button
                          key={item}
                          onClick={() => {
                            setQuestion(
                              item === "Summarize a policy"
                                ? "Summarize our key internal policies."
                                : "Find the most important information in our internal documents.",
                            );
                            document
                              .getElementById("chat-input")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="border border-[#e2e6df] px-3 py-2 text-[10px] text-[#687c73] transition hover:border-[#aab9ac] hover:bg-[#f7f8f5]"
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 space-y-7 pb-6">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {message.role === "user" ? (
                        <div className="ml-auto max-w-[90%] bg-[#edf0ea] px-4 py-3 text-sm leading-6 text-[#263e4d]">
                          {message.content}
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center bg-[#172c3b] text-white">
                            <Sparkles size={15} strokeWidth={1.5} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-medium text-[#2c4351]">
                                Meridian AI
                              </span>
                              <span className="text-[10px] text-[#98a29c]">
                                Response
                              </span>
                            </div>

                            <div className="whitespace-pre-wrap break-words text-[13px] leading-7 text-[#50616b]">
                              {message.content}
                            </div>

                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-5 border border-[#e4e8e1]">
                                <button
                                  onClick={() =>
                                    setExpandedSources((current) =>
                                      current === message.id ? null : message.id,
                                    )
                                  }
                                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#f8f9f6]"
                                >
                                  <span className="flex items-center gap-2 text-[11px] font-medium text-[#536c5d]">
                                    <FileText size={14} />
                                    Sources ({message.sources.length})
                                  </span>
                                  <ChevronDown
                                    size={15}
                                    className={`text-[#87958c] transition-transform ${
                                      expandedSources === message.id
                                        ? "rotate-180"
                                        : ""
                                    }`}
                                  />
                                </button>

                                <AnimatePresence>
                                  {expandedSources === message.id && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="space-y-2 border-t border-[#e4e8e1] p-3">
                                        {message.sources.map((source, index) => (
                                          <div
                                            key={`${source.name}-${index}`}
                                            className="flex items-start gap-3 bg-[#f7f8f5] p-3"
                                          >
                                            <FileText
                                              size={15}
                                              className="mt-0.5 shrink-0 text-[#718b7c]"
                                            />
                                            <div className="min-w-0">
                                              <p className="break-words text-xs text-[#344b59]">
                                                {source.name}
                                              </p>
                                              {source.detail && (
                                                <p className="mt-1 line-clamp-3 text-[10px] leading-5 text-[#829089]">
                                                  {source.detail}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}

                            {(message.latency !== undefined ||
                              message.status !== undefined) && (
                              <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[#93a098]">
                                {message.latency !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <Clock3 size={11} />
                                    {message.latency.toFixed(2)}s
                                  </span>
                                )}
                                {message.status && (
                                  <span className="flex items-center gap-1">
                                    <Check size={11} />
                                    {message.status}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center bg-[#172c3b] text-white">
                        <Sparkles size={15} />
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] text-[#687c73]">
                          Reviewing your knowledge base
                        </p>
                        <div className="flex gap-1">
                          {[0, 1, 2].map((dot) => (
                            <motion.span
                              key={dot}
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{
                                duration: 1.1,
                                repeat: Infinity,
                                delay: dot * 0.2,
                              }}
                              className="h-1.5 w-1.5 rounded-full bg-[#718b7c]"
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              <form
                onSubmit={(event) => void sendQuestion(event)}
                className="mt-auto"
              >
                <div
                  id="chat-input"
                  className="border border-[#dfe4dd] bg-white transition focus-within:border-[#8da393] focus-within:shadow-[0_0_0_3px_rgba(141,163,147,0.10)]"
                >
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        void sendQuestion();
                      }
                    }}
                    placeholder="Ask a question about your organisation..."
                    rows={2}
                    disabled={loading}
                    className="w-full resize-none bg-transparent px-4 pt-4 text-sm leading-6 text-[#263e4d] outline-none placeholder:text-[#a0aaa4] disabled:opacity-60 sm:px-5"
                  />

                  <div className="flex items-center justify-between px-3 pb-3 pt-2 sm:px-4">
                    <p className="text-[9px] text-[#a0aaa4]">
                      Enter to send · Shift + Enter for a new line
                    </p>
                    <button
                      type="submit"
                      disabled={!question.trim() || loading}
                      aria-label="Send question"
                      className="flex h-9 w-9 items-center justify-center bg-[#172c3b] text-white transition hover:bg-[#29495b] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp size={17} />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-center text-[9px] leading-5 text-[#a0aaa4]">
                  AI-generated responses may require verification. Consult
                  original documents for critical decisions.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section
        id="capabilities"
        className="border-t border-[#e0e3dc] bg-[#efefe9]"
      >
        <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-14 lg:py-24">
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-4 text-[10px] uppercase tracking-[2.7px] text-[#71877a]">
                Designed around your knowledge
              </p>
              <h2 className="max-w-xl font-serif text-4xl leading-tight tracking-[-1px] sm:text-5xl">
                Clarity across the
                <br />
                <span className="italic text-[#718b7c]">complexity.</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#718079]">
              Turn internal documentation into a more accessible resource for
              the people who need it.
            </p>
          </div>

          <div className="grid gap-px border border-[#dfe2da] bg-[#dfe2da] sm:grid-cols-3">
            {[
              {
                no: "01",
                title: "Find the signal",
                description:
                  "Ask questions in plain language instead of searching through documents one by one.",
                icon: <MessageSquare size={20} strokeWidth={1.4} />,
              },
              {
                no: "02",
                title: "See the sources",
                description:
                  "Inspect the documents returned with an answer and use them to verify important details.",
                icon: <FileText size={20} strokeWidth={1.4} />,
              },
              {
                no: "03",
                title: "Work with context",
                description:
                  "Explore policies, procedures, and organisational information through one interface.",
                icon: <Globe2 size={20} strokeWidth={1.4} />,
              },
            ].map((item, index) => (
              <motion.div
                key={item.no}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group bg-[#f7f6f2] p-7 transition-colors hover:bg-white sm:p-9 lg:p-10"
              >
                <div className="mb-12 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#8c9b91]">
                    {item.no}
                  </span>
                  <span className="text-[#718b7c]">{item.icon}</span>
                </div>
                <h3 className="font-serif text-2xl text-[#243a48]">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-sm text-xs leading-6 text-[#788780]">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#172c3b] text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
          <div className="flex items-center gap-3">
            <Building2 size={18} strokeWidth={1.4} />
            <span className="font-serif text-lg">Meridian</span>
            <span className="ml-1 text-[9px] uppercase tracking-[1.8px] text-white/45">
              Enterprise intelligence
            </span>
          </div>
          <p className="text-[10px] leading-5 text-white/50">
            A focused workspace for organisational knowledge.
          </p>
        </div>
      </footer>
    </main>
  );
}