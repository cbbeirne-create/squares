import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    // Get user role to redirect correctly
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, client_id')
      .eq('id', data.user.id)
      .single()

    const redirect = appUser?.role === 'super_admin'
      ? '/superadmin/clients'
      : '/admin/moderation'

    return NextResponse.json({ success: true, redirect })

  } catch (err) {
    console.error('Sign in error:', err)
    return NextResponse.json({ error: 'Sign in failed' }, { status: 500 })
  }
}
