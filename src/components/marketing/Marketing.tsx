import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-sm font-semibold text-red-800">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{intro}</p>
      </div>
    </section>
  )
}

export function SectionHeading({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 text-base leading-7 text-slate-600">{intro}</p>}
    </div>
  )
}

export function FeatureLine({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <article className="grid gap-4 border-t border-slate-200 py-7 sm:grid-cols-[48px_1fr]">
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-red-50 text-red-800"><Icon size={21} aria-hidden="true" /></span>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 max-w-2xl leading-7 text-slate-600">{children}</p>
      </div>
    </article>
  )
}

export function ContactBand({ title, body, linkLabel = 'Discuss your campaign' }: { title: string; body: string; linkLabel?: string }) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 rounded-xl bg-slate-950 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-300">{body}</p>
        </div>
        <Link href="/contact" className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform active:translate-y-px">
          {linkLabel}
        </Link>
      </div>
    </section>
  )
}

export function CampaignPreview() {
  const names = ['M. Kelly', 'The Byrne Family', 'Aoife', 'Club Volunteer', 'P. Murphy', '1998 Team']
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(30,41,59,0.12)] sm:p-6" aria-label="Illustration of a supporter square board">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-semibold text-red-800">Campaign preview</p>
          <p className="mt-1 font-semibold text-slate-950">Your club. Your colours.</p>
        </div>
        <span className="text-xs text-slate-500">68% claimed</span>
      </div>
      <div className="mt-4 grid grid-cols-6 gap-1 rounded-lg bg-emerald-900 p-3 sm:gap-1.5 sm:p-5">
        {Array.from({ length: 36 }).map((_, index) => {
          const claimed = [1, 3, 6, 8, 9, 12, 14, 17, 20, 22, 24, 27, 29, 31, 34].includes(index)
          return <span key={index} className={`aspect-square rounded-[3px] border ${claimed ? 'border-amber-300 bg-amber-300' : 'border-white/35 bg-white/10'}`} />
        })}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-xs text-slate-600 sm:grid-cols-3">
        {names.map(name => <span key={name} className="truncate border-l-2 border-red-800 pl-2">{name}</span>)}
      </div>
    </div>
  )
}
