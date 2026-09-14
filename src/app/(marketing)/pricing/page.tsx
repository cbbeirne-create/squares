import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { PageHero, SectionHeading } from '@/components/marketing/Marketing'

export const metadata: Metadata = {
  title: 'Pricing | Stadium Squares',
  description: 'How Stadium Squares campaign proposals are structured for sports clubs.',
}

const included = [
  'A configured, club-branded campaign board',
  'Supporter square selection and payment journey',
  'Club administration and message moderation',
  'Sponsor placement management',
  'Campaign reporting and notification controls',
  'Launch and operational guidance',
]

export default function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="A clear proposal shaped around the campaign." intro="Pricing will be confirmed before launch. This draft shows how the offer can be explained without publishing invented figures." />
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionHeading title="What the proposal covers" intro="Each proposal should make the club&apos;s costs, responsibilities and payment arrangements easy to understand before any campaign work begins." />
            <Link href="/contact" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-red-800 px-5 py-3 text-sm font-semibold text-white hover:bg-red-900 active:translate-y-px">Request a proposal</Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-7 sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight">Campaign package</h2>
            <p className="mt-3 leading-7 text-slate-600">Final commercial terms depend on the agreed campaign setup, support and long-term hosting arrangements.</p>
            <ul className="mt-7 space-y-4">
              {included.map(item => <li key={item} className="flex gap-3 text-slate-700"><Check className="mt-0.5 shrink-0 text-red-800" size={19} aria-hidden="true" /><span>{item}</span></li>)}
            </ul>
          </div>
        </div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading title="Commercial points to confirm" intro="These decisions should be settled before this page is treated as final public copy." />
          <dl className="mt-10 grid gap-8 md:grid-cols-2">
            <div><dt className="font-semibold text-slate-950">Setup and service fee</dt><dd className="mt-2 leading-7 text-slate-600">Decide whether pricing is fixed, campaign-specific or split between setup and ongoing service.</dd></div>
            <div><dt className="font-semibold text-slate-950">Payment processing</dt><dd className="mt-2 leading-7 text-slate-600">State clearly which Stripe processing charges apply and who is responsible for them.</dd></div>
            <div><dt className="font-semibold text-slate-950">Campaign support</dt><dd className="mt-2 leading-7 text-slate-600">Define the launch, training and operational support included for club administrators.</dd></div>
            <div><dt className="font-semibold text-slate-950">Long-term availability</dt><dd className="mt-2 leading-7 text-slate-600">Confirm how long completed boards remain online and whether archival hosting has a separate cost.</dd></div>
          </dl>
        </div>
      </section>
    </>
  )
}
