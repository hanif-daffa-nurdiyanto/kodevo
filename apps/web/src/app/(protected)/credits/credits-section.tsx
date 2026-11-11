"use client"

import Link from "next/link"
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react"
import { Card, CardContent } from "@kodevo/ui/card"
import { cn } from "@kodevo/utils"
import { CheckoutModal } from "@/components/checkout-modal"

type CreditTransactionItem = {
  id: string
  type: "TOPUP" | "DEBIT" | "REFUND" | "ADJUSTMENT"
  amount: number
  balanceAfter: number
  action: string | null
  createdAt: string
}

type CreditsTab = "packages" | "history"

type CreditPackageItem = {
  id: string
  label: string
  description: string | null
  credits: number
  priceIdr: number
}

interface CreditsSectionProps {
  name: string | null
  email: string | null
  upgraded: boolean
  creditBalance: number
  activeTab: CreditsTab
  packages: CreditPackageItem[]
  transactions: CreditTransactionItem[]
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function transactionLabel(transaction: CreditTransactionItem): string {
  if (transaction.type === "TOPUP") return "Top-up credit"
  if (transaction.type === "REFUND") return "Refund credit"
  if (transaction.type === "ADJUSTMENT") return "Adjustment admin"
  return transaction.action ? `Pemakaian ${transaction.action.toLowerCase().replaceAll("_", " ")}` : "Pemakaian credit"
}

export function CreditsSection({
  name,
  email,
  upgraded,
  creditBalance,
  activeTab,
  packages,
  transactions,
}: CreditsSectionProps) {
  return (
    <div className="space-y-6">
      {upgraded && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Pembayaran diterima. Jika saldo belum berubah, tunggu webhook Mayar beberapa detik lalu refresh halaman.
        </div>
      )}

      <section className="rounded-xl border border-[#F3F4F6] bg-[#FAFBFC] p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F0FDF4] text-[#00A88A]">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold">Saldo Credit</h2>
            <p className="text-xs text-muted-foreground">{name ?? "Pengguna"} · {email ?? "email belum tersedia"}</p>
          </div>
        </div>
        <p className="text-[42px] font-extrabold leading-none tabular-nums">{creditBalance.toLocaleString("id-ID")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Credit dipakai untuk generate roadmap, materi, quiz, exercise, project submit, dan chat tutor.
        </p>
      </section>

      <section>
        <div className="mb-4 flex rounded-xl border border-[#F3F4F6] bg-[#FAFBFC] p-1">
          <Link
            href="/credits?tab=packages"
            aria-current={activeTab === "packages" ? "page" : undefined}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
              activeTab === "packages" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Paket Credit
          </Link>
          <Link
            href="/credits?tab=history"
            aria-current={activeTab === "history" ? "page" : undefined}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
              activeTab === "history" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Riwayat
          </Link>
        </div>

        {activeTab === "packages" ? (
          <div>
            <div className="mb-4">
              <h2 className="text-base font-bold">Paket Credit</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pilih paket top-up sesuai kebutuhan belajarmu.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {packages.map((pkg) => {
                return (
                  <Card key={pkg.id} className="border border-[#F3F4F6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                    <CardContent className="flex h-full flex-col gap-4 p-5">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="font-bold">{pkg.label}</h3>
                          <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-bold text-primary">
                            {pkg.credits.toLocaleString("id-ID")} credit
                          </span>
                        </div>
                        <p className="text-2xl font-extrabold">{formatRupiah(pkg.priceIdr)}</p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{pkg.description}</p>
                      </div>
                      <CheckoutModal
                        target="CREDIT"
                        refId={pkg.id}
                        title={pkg.label}
                        description={pkg.description}
                        amountIdr={pkg.priceIdr}
                        detailLabel={`${pkg.credits.toLocaleString("id-ID")} credit`}
                        triggerLabel="Beli Credit"
                        className="mt-auto h-10"
                        buttonClassName="h-10 w-full"
                      />
                    </CardContent>
                  </Card>
                )
              })}
              {packages.length === 0 && (
                <div className="rounded-xl border border-dashed border-muted bg-white p-8 text-center text-sm text-muted-foreground sm:col-span-2">
                  Paket credit belum tersedia.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h2 className="text-base font-bold">Riwayat Credit</h2>
              <p className="mt-1 text-sm text-muted-foreground">Transaksi top-up, pemakaian, refund, dan adjustment terbaru.</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#F3F4F6] bg-white">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Belum ada transaksi credit.
                </div>
              ) : (
                <div className="divide-y divide-[#F3F4F6]">
                  {transactions.map((transaction) => {
                    const isDebit = transaction.type === "DEBIT"
                    return (
                      <div key={transaction.id} className="flex items-center gap-3 px-4 py-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                            isDebit ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                          )}
                        >
                          {isDebit ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{transactionLabel(transaction)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-sm font-bold tabular-nums", isDebit ? "text-red-600" : "text-emerald-600")}>
                            {isDebit ? "-" : "+"}{transaction.amount.toLocaleString("id-ID")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Saldo {transaction.balanceAfter.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
