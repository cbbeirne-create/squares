import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug    = searchParams.get('slug')
  const gridRef = searchParams.get('ref')    // e.g. "R4-C12"
  const fanName = searchParams.get('name')   ?? 'A proud supporter'

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('club_name, primary_color, secondary_color, accent_color, slug')
    .eq('slug', slug)
    .single()

  const clubName     = client?.club_name     ?? 'Stadium Squares'
  const primaryColor = client?.primary_color ?? '#B22222'
  const accentColor  = client?.accent_color  ?? '#FFD700'

  return new ImageResponse(
    (
      <div
        style={{
          display:         'flex',
          flexDirection:   'column',
          width:           '100%',
          height:          '100%',
          background:      primaryColor,
          padding:         '48px',
          fontFamily:      'sans-serif',
          justifyContent:  'space-between',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Stadium Squares
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', lineHeight: 1.2 }}>
            {clubName}
          </div>
        </div>

        {/* Fan card */}
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            background:    'rgba(0,0,0,0.3)',
            borderRadius:  '16px',
            padding:       '32px',
            gap:           '12px',
          }}
        >
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>
            {gridRef ? `Square ${gridRef.replace('-', '–')}` : 'My square'}
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#ffffff' }}>
            {fanName}
          </div>
          <div
            style={{
              display:        'inline-flex',
              background:     accentColor,
              color:          '#000',
              fontSize:       '14px',
              fontWeight:     '600',
              padding:        '8px 20px',
              borderRadius:   '100px',
              alignSelf:      'flex-start',
              marginTop:      '8px',
              letterSpacing:  '0.5px',
            }}
          >
            My place in history ✦
          </div>
        </div>

        {/* Footer */}
        <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>
          stadiumsquares.io/board/{slug}
        </div>
      </div>
    ),
    {
      width:  1200,
      height: 630,
    }
  )
}
