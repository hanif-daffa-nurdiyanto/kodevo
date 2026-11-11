"use client"

import { Button } from "@kodevo/ui/button"
import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <Button variant="outline" className="h-12 gap-2 px-6 print:hidden" onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" />
      Unduh Sertifikat
    </Button>
  )
}
