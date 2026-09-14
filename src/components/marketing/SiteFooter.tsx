import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="font-semibold text-slate-950">Stadium Squares</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            A digital fundraising campaign that gives every supporter a place in the story of their club.
          </p>
        </div>
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-slate-600 sm:grid-cols-3">
          <Link href="/how-it-works" className="hover:text-red-800">How it works</Link>
          <Link href="/for-clubs" className="hover:text-red-800">For clubs</Link>
          <Link href="/pricing" className="hover:text-red-800">Pricing</Link>
          <Link href="/faq" className="hover:text-red-800">FAQs</Link>
          <Link href="/contact" className="hover:text-red-800">Contact</Link>
          <Link href="/auth/login" className="hover:text-red-800">Club login</Link>
        </nav>
      </div>
      <div className="border-t border-slate-100 px-4 py-5 text-center text-xs text-slate-500">
        Product name, domain and legal details will be confirmed before launch.
      </div>
    </footer>
  )
}
