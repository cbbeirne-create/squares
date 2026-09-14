import type { Metadata } from 'next'
import { BarChart3, Building2, Megaphone, MessageSquare, Palette, PanelsTopLeft } from 'lucide-react'
import { ContactBand, FeatureLine, PageHero, SectionHeading } from '@/components/marketing/Marketing'

export const metadata: Metadata = {
  title: 'For clubs | Stadium Squares',
  description: 'Explore the campaign controls, supporter experience and club administration available with Stadium Squares.',
}

export default function ForClubsPage() {
  return (
    <>
      <PageHero eyebrow="For clubs" title="Your campaign, presented in the identity of your club." intro="Set the message, manage what appears publicly and give supporters a clear reason to participate." />
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <SectionHeading title="Control without unnecessary complexity" intro="The administration area is built for the people already running club communications, fundraising and supporter engagement." />
          <div>
            <FeatureLine icon={Palette} title="Club presentation">Apply club colours, campaign messaging and stadium graphics without changing the underlying application.</FeatureLine>
            <FeatureLine icon={MessageSquare} title="Message moderation">Approve appropriate tributes, reject unsuitable submissions and invite a supporter to revise a message securely.</FeatureLine>
            <FeatureLine icon={PanelsTopLeft} title="Sponsor visibility">Manage sponsor positions around the board and link published placements to sponsor websites.</FeatureLine>
            <FeatureLine icon={BarChart3} title="Campaign reporting">Follow paid, pending and published squares, monitor progress and export appropriately protected campaign data.</FeatureLine>
            <FeatureLine icon={Megaphone} title="Campaign communications">Use purchase alerts or daily summaries to keep the relevant club contacts informed.</FeatureLine>
          </div>
        </div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading title="What the club brings" intro="The strongest campaigns start with a concrete purpose and a clear community story." />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ['A specific goal', 'A facility, programme or development that supporters can understand and get behind.'],
              ['A promotion plan', 'A committed schedule across club channels, teams, members, sponsors and local media.'],
              ['A responsible team', 'Named contacts for administration, moderation, payments and supporter questions.'],
            ].map(([title, body]) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-7">
                <Building2 size={22} className="text-red-800" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <ContactBand title="Bring us the goal. We will help shape the campaign." body="The first conversation is about fit, timing and what success should look like for your club." />
    </>
  )
}
