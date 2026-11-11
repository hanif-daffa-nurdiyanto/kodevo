"use client"

import { CheckoutModal } from "@/components/checkout-modal"

export function BundleCheckoutButton({
  trackId,
  title,
  description,
  priceIdr,
  moduleCount,
  disabled,
  className,
  buttonClassName,
}: {
  trackId: string
  title: string
  description?: string | null
  priceIdr: number | null
  moduleCount: number
  disabled: boolean
  className?: string
  buttonClassName?: string
}) {
  return (
    <CheckoutModal
      target="BUNDLE"
      refId={trackId}
      title={title}
      description={description}
      amountIdr={priceIdr ?? 0}
      detailLabel={`${moduleCount.toLocaleString("id-ID")} modul`}
      triggerLabel="Beli Bundle"
      disabled={disabled}
      className={className}
      buttonClassName={buttonClassName}
    />
  )
}
