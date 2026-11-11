"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Sparkles, X, Send, ChevronDown } from "lucide-react"
import { cn } from "@kodevo/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface Props {
  isPremium: boolean
  level: string
}

// Simple markdown renderer — handles code blocks and inline code safely
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g)
  return (
    <div className="space-y-1.5">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lang = part.match(/^```(\w*)/)?.[1] ?? ""
          const code = part.replace(/^```\w*\n?/, "").replace(/\n?```$/, "")
          return (
            <pre key={i} className="bg-gray-900 text-gray-100 rounded-lg p-3 text-[11px] font-mono overflow-x-auto whitespace-pre leading-relaxed">
              {lang && <div className="text-gray-500 text-[10px] mb-1.5">{lang}</div>}
              {code}
            </pre>
          )
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-[11px] font-mono">{part.slice(1, -1)}</code>
        }
        return (
          <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
            {part}
          </p>
        )
      })}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

export function TutorChat({ level }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streaming])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const getContext = useCallback(() => {
    if (pathname.startsWith("/learn/")) {
      const parts = pathname.split("/").filter(Boolean)
      if (parts.length >= 2) return `User sedang di halaman belajar: ${parts.slice(1).join(" › ")}`
    }
    if (pathname === "/dashboard") return "User sedang di halaman dashboard"
    return undefined
  }, [pathname])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    setInput("")
    setError(null)

    const userMessage: Message = { role: "user", content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)

    // Placeholder for streaming response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])
    setStreaming(true)

    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, context: getContext() }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        setMessages((prev) => prev.slice(0, -1)) // remove placeholder
        setError(data.error ?? "Terjadi kesalahan.")
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages((prev) => prev.slice(0, -1))
        setError("Koneksi terputus. Coba lagi.")
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearChat() {
    if (streaming) abortRef.current?.abort()
    setMessages([])
    setError(null)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="flex w-[340px] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
          style={{ height: 480 }}>

          {/* Header */}
          <div className="flex items-center justify-between bg-[#2A92F0] px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">Tutor AI</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">Credit</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="rounded-md px-2 py-1 text-[11px] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-400 gap-3">
                <Sparkles className="h-8 w-8 text-sky-200" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Tanya apa saja soal coding</p>
                  <p className="text-xs mt-1 text-gray-400">Tutor AI siap bantu kamu belajar</p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[
                    "Apa itu flexbox?",
                    "Cara kerja async/await",
                    "Perbedaan let vs const",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus() }}
                      className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 hover:border-sky-300 hover:text-sky-600 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="mr-2 h-6 w-6 rounded-full bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3 w-3 text-sky-500" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2",
                    msg.role === "user"
                      ? "bg-[#2A92F0] text-white rounded-tr-sm"
                      : "bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm",
                  )}
                >
                  {msg.role === "assistant" && msg.content === "" && streaming
                    ? <TypingDots />
                    : msg.role === "user"
                    ? <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    : <MessageContent content={msg.content} />
                  }
                </div>
              </div>
            ))}

            {error && (
              <p className="text-center text-xs text-red-500">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanya sesuatu... (Enter untuk kirim)"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 disabled:opacity-50 max-h-24 overflow-y-auto"
                style={{ lineHeight: "1.5" }}
                onInput={(e) => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = Math.min(el.scrollHeight, 96) + "px"
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2A92F0] text-white transition-colors hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          open
            ? "bg-gray-700 text-white hover:bg-gray-800"
            : "bg-[#2A92F0] text-white hover:bg-blue-500 hover:scale-105",
        )}
        style={{ height: 52, width: 52 }}
        title="Tutor AI"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
    </div>
  )
}
