import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createServiceClient()

  const [{ data: client }, { data: analytics }] = await Promise.all([
    supabase
      .from('clients')
      .select('club_name, promo_headline, primary_color, secondary_color, accent_color')
      .eq('slug', params.slug)
      .single(),
    supabase
      .from('campaign_analytics')
      .select('sold_squares, total_squares, percent_sold, revenue_raised')
      .eq('slug', params.slug)
      .single(),
  ])

  const primary    = client?.primary_color   ?? '#B22222'
  const secondary  = client?.secondary_color ?? '#8B0000'
  const accent     = client?.accent_color    ?? '#FFD700'
  const clubName   = client?.club_name       ?? 'Stadium Squares'
  const headline   = client?.promo_headline  ?? 'Own your place in history'
  const sold       = analytics?.sold_squares ?? 0
  const total      = analytics?.total_squares ?? 500
  const pct        = analytics?.percent_sold ?? 0

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: secondary, fontFamily: 'sans-serif' }}>
        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '56px', background: primary }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', letterSpacing: '3px', textTransform: 'uppercase' }}>
              Stadium Squares
            </div>
            <div style={{ fontSize: '48px', fontWeight: '700', color: '#fff', lineHeight: 1.1 }}>
              {clubName}
            </div>
            <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
              {headline}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { n: sold, l: 'claimed' },
              { n: total - sold, l: 'remaining' },
              { n: `${pct}%`, l: 'complete' },
            ].map(({ n, l }) => (
              <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: accent }}>{n}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — mini grid visualisation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', width: '340px', padding: '40px', gap: '3px', alignContent: 'flex-start' }}>
          {Array.from({ length: 180 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '16px', height: '16px', borderRadius: '2px',
                background: i < sold * 180 / total
                  ? [primary, '#185FA5', '#533AB7', '#0F6E56'][i % 4]
                  : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
