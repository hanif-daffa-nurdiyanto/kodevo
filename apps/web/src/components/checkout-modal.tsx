"use client"

import { useState } from "react"
import { CreditCard, Loader2, ShoppingBag, Tag } from "lucide-react"
import { Badge } from "@kodevo/ui/badge"
import { Button } from "@kodevo/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kodevo/ui/dialog"
import { Input } from "@kodevo/ui/input"
import { Label } from "@kodevo/ui/label"
import { Separator } from "@kodevo/ui/separator"
import { cn } from "@kodevo/utils"

type CheckoutTarget = "CREDIT" | "BUNDLE"

type PromoQuote = {
  valid: true
  code: string
  type: string
  description: string | null
  originalAmountIdr: number
  discountAmountIdr: number
  finalAmountIdr: number
}

export function formatCheckoutRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function CheckoutModal({
  target,
  refId,
  title,
  description,
  amountIdr,
  detailLabel,
  triggerLabel,
  disabled,
  className,
  buttonClassName,
}: {
  target: CheckoutTarget
  refId: string
  title: string
  description?: string | null
  amountIdr: number
  detailLabel: string
  triggerLabel: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [promoCode, setPromoCode] = useState("")
  const [quote, setQuote] = useState<PromoQuote | null>(null)
  const [validating, setValidating] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finalAmount = quote?.finalAmountIdr ?? amountIdr
  const discountAmount = quote?.discountAmountIdr ?? 0
  const TriggerIcon = target === "CREDIT" ? CreditCard : ShoppingBag

  function resetPromo() {
    setQuote(null)
    setError(null)
  }

  async function validatePromoCode(): Promise<PromoQuote | null> {
    const code = promoCode.trim()
    if (!code) {
      setError("Masukkan kode promo dulu.")
      return null
    }

    setValidating(true)
    setError(null)
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, target, refId }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setQuote(null)
        setError(data.error ?? "Kode promo tidak bisa digunakan.")
        return null
      }
      setQuote(data)
      return data
    } catch {
      setQuote(null)
      setError("Gagal mengecek kode promo. Silakan coba lagi.")
      return null
    } finally {
      setValidating(false)
    }
  }

  async function checkout() {
    setCheckingOut(true)
    setError(null)
    try {
      const appliedQuote = promoCode.trim() && !quote ? await validatePromoCode() : quote
      if (promoCode.trim() && !appliedQuote) return

      const res = await fetch(target === "CREDIT" ? "/api/credit/topup" : `/api/bundles/${refId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          target === "CREDIT"
            ? { packageId: refId, promoCode: appliedQuote?.code }
            : { promoCode: appliedQuote?.code }
        ),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error ?? "Gagal membuat link pembayaran.")
    } catch {
      setError("Gagal membuat link pembayaran. Silakan coba lagi.")
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className={cn("shrink-0", className)}>
      <Button
        type="button"
        className={cn("h-[46px] px-6", buttonClassName)}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <TriggerIcon className="mr-1.5 h-4 w-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[460px] gap-5 p-5">
          <DialogHeader>
            <DialogTitle>Checkout {target === "CREDIT" ? "Credit" : "Bundle"}</DialogTitle>
            <DialogDescription>Periksa detail harga dan gunakan kode promo sebelum lanjut ke Mayar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-[#F3F4F6] bg-[#FAFBFC] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{description ?? detailLabel}</p>
                </div>
                <Badge variant={target === "CREDIT" ? "builder" : "explorer"} className="shrink-0">
                  {detailLabel}
                </Badge>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Harga awal</span>
                  <span className="font-semibold tabular-nums">{formatCheckoutRupiah(amountIdr)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Diskon promo</span>
                  <span className={cn("font-semibold tabular-nums", discountAmount > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                    {discountAmount > 0 ? `-${formatCheckoutRupiah(discountAmount)}` : formatCheckoutRupiah(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 text-base">
                  <span className="font-bold">Total bayar</span>
                  <span className="font-extrabold tabular-nums">{formatCheckoutRupiah(finalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`promo-${target.toLowerCase()}-${refId}`}>Kode Promo</Label>
              <div className="flex gap-2">
                <Input
                  id={`promo-${target.toLowerCase()}-${refId}`}
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase())
                    resetPromo()
                  }}
                  placeholder="MASUKKAN KODE"
                  className="uppercase"
                />
                <Button type="button" variant="outline" className="h-11 px-3" disabled={validating || checkingOut || !promoCode.trim()} onClick={validatePromoCode}>
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                  Terapkan
                </Button>
              </div>
              {quote && (
                <p className="text-xs font-semibold text-emerald-700">
                  Promo {quote.code} diterapkan. Total hemat {formatCheckoutRupiah(quote.discountAmountIdr)}.
                </p>
              )}
              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
            </div>
          </div>

          <DialogFooter className="-mx-5 -mb-5 px-5">
            <Button type="button" variant="outline" disabled={checkingOut} onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="button" disabled={checkingOut || validating || disabled} onClick={checkout}>
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {finalAmount <= 0 ? "Klaim Gratis" : "Lanjut ke Mayar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
