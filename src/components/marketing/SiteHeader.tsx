import Link from 'next/link'
import { Menu } from 'lucide-react'

const navigation = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/for-clubs', label: 'For clubs' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQs' },
]

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight text-slate-950">
          <span aria-hidden="true" className="grid h-8 w-8 grid-cols-2 gap-0.5 rounded-md bg-red-800 p-1.5">
            <span className="rounded-[2px] bg-white" />
            <span className="rounded-[2px] bg-white/75" />
            <span className="rounded-[2px] bg-white/75" />
            <span className="rounded-[2px] bg-white" />
          </span>
          Stadium Squares
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
          {navigation.map(item => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-red-800">
              {item.label}
            </Link>
          ))}
          <Link href="/contact" className="rounded-md bg-red-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-900 active:translate-y-px">
            Club enquiry
          </Link>
        </nav>

        <details className="relative md:hidden">
          <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-md border border-slate-200 text-slate-800">
            <Menu size={20} aria-label="Open navigation" />
          </summary>
          <nav aria-label="Mobile navigation" className="absolute right-0 top-12 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(30,41,59,0.12)]">
            {navigation.map(item => (
              <Link key={item.href} href={item.href} className="block min-h-11 rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {item.label}
              </Link>
            ))}
            <Link href="/contact" className="mt-1 block min-h-11 rounded-md bg-red-800 px-3 py-3 text-center text-sm font-semibold text-white">
              Club enquiry
            </Link>
          </nav>
        </details>
      </div>
    </header>
  )
}
