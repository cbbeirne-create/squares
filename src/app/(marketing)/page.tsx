import type { Metadata } from 'next'
import Link from 'next/link'
import { BadgeEuro, HeartHandshake, MessageSquareText, ShieldCheck } from 'lucide-react'
import { CampaignPreview, ContactBand, FeatureLine, SectionHeading } from '@/components/marketing/Marketing'

export const metadata: Metadata = {
  title: 'Stadium Squares | A place for every supporter',
  description: 'Create a club fundraising campaign that turns supporter names and stories into a permanent digital tribute.',
}

export default function HomePage() {
  return (
    <>
      <section className="overflow-hidden border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-red-800">A digital fundraising campaign for sports clubs</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-7xl">
              Give every supporter a place in your club&apos;s story.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Supporters claim a square, add their name and leave a message that becomes part of a lasting club tribute.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/how-it-works" className="inline-flex min-h-11 items-center justify-center rounded-md bg-red-800 px-5 py-3 text-sm font-semibold text-white hover:bg-red-900 active:translate-y-px">
                See how it works
              </Link>
              <Link href="/for-clubs" className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:border-slate-400 active:translate-y-px">
                Explore the club experience
              </Link>
            </div>
          </div>
          <CampaignPreview />
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <SectionHeading title="Fundraising with a reason to take part" intro="A finite number of squares gives the campaign momentum. The finished board gives supporters something worth returning to." />
          <div>
            <FeatureLine icon={HeartHandshake} title="Built around belonging">Each contribution represents a visible place in the campaign, not just another transaction.</FeatureLine>
            <FeatureLine icon={MessageSquareText} title="Personal to every supporter">Names, dedications and memories turn a fundraising target into a shared record of the club community.</FeatureLine>
            <FeatureLine icon={ShieldCheck} title="Managed by the club">Club administrators review messages, manage campaign content and keep the public board appropriate.</FeatureLine>
            <FeatureLine icon={BadgeEuro} title="Payments connected to the club">Supporter payments are processed through the club&apos;s connected Stripe account, with clear payment confirmation before publication.</FeatureLine>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading title="One campaign, two simple experiences" />
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-7 sm:p-9">
              <p className="text-sm font-semibold text-red-800">For supporters</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">Choose. Contribute. Be remembered.</h3>
              <p className="mt-4 leading-7 text-slate-600">The mobile-first journey makes it easy to find a square, complete payment and submit a message for club approval.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-7 sm:p-9">
              <p className="text-sm font-semibold text-red-800">For clubs</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">Launch with control.</h3>
              <p className="mt-4 leading-7 text-slate-600">Configure the campaign, moderate tributes, feature sponsors and follow progress from one administration area.</p>
            </div>
          </div>
        </div>
      </section>

      <ContactBand title="Could this work for your club?" body="Tell us what you are raising funds for and how you want supporters to be represented." />
    </>
  )
}
