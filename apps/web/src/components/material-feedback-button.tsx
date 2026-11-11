"use client"

import { useState } from "react"
import { Flag, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@kodevo/ui/button"
import { cn } from "@kodevo/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kodevo/ui/dialog"
import { Textarea } from "@kodevo/ui/textarea"

const TYPES = [
  { value: "WRONG_CONTENT", label: "Konten salah / menyesatkan" },
  { value: "TYPO", label: "Typo / kesalahan penulisan" },
  { value: "TOO_EASY", label: "Terlalu mudah untuk levelku" },
  { value: "TOO_HARD", label: "Terlalu sulit untuk levelku" },
  { value: "OTHER", label: "Lainnya" },
] as const

type FeedbackType = (typeof TYPES)[number]["value"]

export function MaterialFeedbackButton({ topicId }: { topicId: string }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!type) return
    setLoading(true)
    try {
      await fetch("/api/feedback/material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, type, message: message.trim() || undefined }),
      })
      setDone(true)
      setTimeout(() => { setOpen(false); setDone(false); setType(null); setMessage("") }, 1500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-accent transition-colors">
        <Flag className="h-3.5 w-3.5" />
        Lapor Masalah
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Lapor Masalah Materi</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium">Terima kasih! Feedback kamu sudah diterima.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors",
                    type === t.value
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Keterangan tambahan (opsional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-sm resize-none"
              rows={3}
            />

            <Button
              onClick={handleSubmit}
              disabled={!type || loading}
              className="w-full"
              size="sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim Laporan"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
