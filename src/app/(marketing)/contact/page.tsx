import type { Metadata } from 'next'
import { CalendarRange, Mail, Target, Users } from 'lucide-react'
import { PageHero, SectionHeading } from '@/components/marketing/Marketing'

export const metadata: Metadata = {
  title: 'Club enquiry | Stadium Squares',
  description: 'Start a conversation about a Stadium Squares fundraising campaign for your club.',
}

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Club enquiry" title="Tell us what your club wants to make possible." intro="A useful first conversation starts with the fundraising purpose, the supporter community and your preferred timing." />
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading title="What we would like to understand" intro="These are the proposed enquiry topics. The final form and contact address will be connected after the brand and domain are confirmed." />
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              [Target, 'The fundraising goal', 'What the club wants to fund and the target it hopes to reach.'],
              [Users, 'The supporter community', 'Who the campaign should reach and which club channels can support it.'],
              [CalendarRange, 'The timing', 'Any launch date, milestone, anniversary or completion deadline.'],
              [Mail, 'The club contact', 'The person responsible for the initial conversation and internal coordination.'],
            ].map(([Icon, title, body]) => {
              const ItemIcon = Icon as typeof Target
              return <article key={String(title)} className="rounded-xl border border-slate-200 bg-slate-50 p-6"><ItemIcon size={21} className="text-red-800" aria-hidden="true" /><h2 className="mt-5 font-semibold text-slate-950">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{String(body)}</p></article>
            })}
          </div>
        </div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">Contact route to be confirmed</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">No email address or enquiry destination has been invented for this draft. Once confirmed, this page can provide a short form with club name, contact details, sport, fundraising purpose and preferred timing.</p>
        </div>
      </section>
    </>
  )
}
