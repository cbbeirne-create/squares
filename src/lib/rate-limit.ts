import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function requestIp(req: NextRequest): string {
  return req.headers.get('x-real-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
}

export async function checkRateLimit(
  req: NextRequest,
  scope: string,
  limit = 20,
  windowSeconds = 600,
): Promise<boolean> {
  const digest = createHash('sha256')
    .update(`${scope}:${requestIp(req)}`)
    .digest('hex')

  const service = createServiceClient()
  const { data, error } = await service.rpc('consume_rate_limit', {
    p_key: digest,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error('Rate-limit check failed:', error)
    return false
  }

  return data === true
}
