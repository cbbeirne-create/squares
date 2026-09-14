import type { Metadata } from 'next'
import { ContactBand, PageHero } from '@/components/marketing/Marketing'

export const metadata: Metadata = {
  title: 'Frequently asked questions | Stadium Squares',
  description: 'Answers for clubs and supporters considering a Stadium Squares fundraising campaign.',
}

const faqs = [
  ['What is a Stadium Squares campaign?', 'It is a finite digital fundraising board. Supporters choose an available square, contribute through the club campaign and submit a name or short message for approval.'],
  ['Who is it designed for?', 'The current product is designed for sports clubs and organisations with an established supporter community and a specific fundraising purpose.'],
  ['Does the club control what appears publicly?', 'Yes. A successful payment does not publish a message automatically. Club administrators review submitted tributes before they appear on the board.'],
  ['How are supporter payments handled?', 'Payments are processed by Stripe through an account connected to the participating club. The final public terms will explain processing charges, refunds and club responsibilities.'],
  ['Can two people purchase the same square?', 'The system temporarily reserves a selected square during checkout. Database safeguards prevent two completed purchases from claiming the same position.'],
  ['Can a rejected message be corrected?', 'Yes. A club administrator can provide a secure, single-use resubmission route so the supporter can send a revised message.'],
  ['Can sponsors appear on the board?', 'Yes. Clubs can manage published sponsor placements around the campaign board, including approved logos and website links.'],
  ['Will the completed board stay online?', 'The product is intended to create a lasting digital record. The precise hosting period and any archival arrangement will be confirmed in the club proposal.'],
  ['Does it work on mobile?', 'Yes. The supporter purchase journey and the main club administration tasks are designed for mobile use, with accessible alternatives to the visual grid selector.'],
]

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="Frequently asked questions" title="The practical details, stated plainly." intro="This draft separates what the product already supports from commercial and policy details that still need confirmation." />
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group border-t border-slate-200 py-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold text-slate-950">
                {question}<span aria-hidden="true" className="text-red-800 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 max-w-3xl leading-7 text-slate-600">{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <ContactBand title="Have a question specific to your club?" body="Share the campaign idea, likely audience and timing so the conversation can start with the right context." linkLabel="Ask about your campaign" />
    </>
  )
}
