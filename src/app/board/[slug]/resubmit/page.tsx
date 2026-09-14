import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import ResubmitClient from './ResubmitClient'

interface Props {
  params: { slug: string }
  searchParams: { square?: string; token?: string }
}

export default async function ResubmitPage({ params, searchParams }: Props) {
  const service = createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('club_name, slug, primary_color')
    .eq('slug', params.slug)
    .in('status', ['active', 'sold_out'])
    .single()

  if (!client || !searchParams.square || !searchParams.token) notFound()

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10" style={{ '--club-primary': client.primary_color } as React.CSSProperties}>
      <ResubmitClient clubName={client.club_name} slug={client.slug} squareId={searchParams.square} token={searchParams.token} />
    </main>
  )
}
