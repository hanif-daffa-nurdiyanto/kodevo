import Link from "next/link"
import Image from "next/image"

const links = [
  { href: "#", label: "Tentang" },
  { href: "#", label: "Karier" },
  { href: "#", label: "Kontak" },
]

export function Footer() {
  return (
    <footer className="border-t border-muted bg-white px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo-full.png" alt="Kodevo" width={1710} height={399} className="h-7 w-auto" />
        </div>
        <p className="text-[13px] text-muted-foreground">© 2025 Kodevo. Belajar lebih cepat.</p>
        <nav className="flex flex-wrap gap-5 text-[13px] font-medium text-muted-foreground">
          {links.map((link, index) => (
            <Link key={index} href={link.href} className="hover:text-kodevo-green">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
