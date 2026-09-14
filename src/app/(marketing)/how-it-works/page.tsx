import type { Metadata } from 'next'
import { ContactBand, PageHero, SectionHeading } from '@/components/marketing/Marketing'

export const metadata: Metadata = {
  title: 'How it works | Stadium Squares',
  description: 'See how a Stadium Squares campaign moves from club setup to a completed supporter tribute.',
}

const steps = [
  ['01', 'Shape the campaign', 'The club sets its fundraising purpose, square price, campaign size, colours, messaging and sponsor presence.'],
  ['02', 'Open the board', 'Supporters visit the club campaign on mobile or desktop and select an available square.'],
  ['03', 'Make it personal', 'The supporter adds a name and short message before completing payment through Stripe.'],
  ['04', 'Review each tribute', 'The club checks submitted messages before approved tributes become visible on the public board.'],
  ['05', 'Build towards the finish', 'The board fills in real time, creating a clear shared target and a natural reason to keep promoting the campaign.'],
  ['06', 'Preserve the result', 'Once complete, the board can remain as a digital record of the people and stories behind the campaign.'],
]

export default function HowItWorksPage() {
  return (
    <>
      <PageHero eyebrow="How it works" title="A campaign people can see themselves becoming part of." intro="The club sets the story. Supporters choose their place. Every approved contribution helps complete the board." />
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-x-12 lg:grid-cols-[0.7fr_1.3fr]">
            <SectionHeading title="From first square to finished tribute" intro="The experience is designed to stay clear on mobile for both supporters and club administrators." />
            <div className="mt-10 lg:mt-0">
              {steps.map(([number, title, body]) => (
                <article key={number} className="grid grid-cols-[44px_1fr] gap-4 border-t border-slate-200 py-7 sm:grid-cols-[72px_1fr]">
                  <span className="font-mono text-sm font-semibold text-red-800">{number}</span>
                  <div><h3 className="text-xl font-semibold text-slate-950">{title}</h3><p className="mt-2 max-w-2xl leading-7 text-slate-600">{body}</p></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          <div><p className="text-sm font-semibold text-red-800">Payment</p><p className="mt-3 leading-7 text-slate-700">A square is only treated as paid after confirmation from Stripe.</p></div>
          <div><p className="text-sm font-semibold text-red-800">Moderation</p><p className="mt-3 leading-7 text-slate-700">Payment and publication are separate, giving the club control over public messages.</p></div>
          <div><p className="text-sm font-semibold text-red-800">Availability</p><p className="mt-3 leading-7 text-slate-700">Temporary reservations prevent two supporters from buying the same square at the same time.</p></div>
        </div>
      </section>
      <ContactBand title="Start with the purpose of your campaign." body="We can shape the board, supporter journey and launch plan around the outcome your club wants to fund." />
    </>
  )
}
