import { requireAdmin } from "@kodevo/auth/admin"
import { StudioSidebar } from "./sidebar"

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f6f8fa" }}>
      <StudioSidebar />
      <main style={{ marginLeft: 220, flex: "1 1 0%", padding: 28, minWidth: 0 }}>
        <div style={{ maxWidth: 1280 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
