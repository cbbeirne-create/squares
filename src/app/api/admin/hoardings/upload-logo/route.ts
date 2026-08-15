import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, client_id')
      .eq('id', user.id)
      .single()

    if (!appUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const form       = await req.formData()
    const file       = form.get('file') as File | null
    const hoardingId = form.get('hoardingId') as string | null

    if (!file || !hoardingId) {
      return NextResponse.json({ error: 'Missing file or hoardingId' }, { status: 400 })
    }

    // Validate file type
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, SVG or WebP.' }, { status: 400 })
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 })
    }

    // Verify the hoarding belongs to this admin's client
    const service = createServiceClient()
    const { data: hoarding } = await service
      .from('hoardings')
      .select('id, client_id')
      .eq('id', hoardingId)
      .single()

    if (!hoarding) return NextResponse.json({ error: 'Hoarding not found' }, { status: 404 })
    if (appUser.role === 'club_admin' && hoarding.client_id !== appUser.client_id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    // Upload to Supabase Storage
    const ext      = file.name.split('.').pop() ?? 'png'
    const path     = `${hoarding.client_id}/${hoardingId}.${ext}`
    const buffer   = await file.arrayBuffer()

    const { error: uploadErr } = await service.storage
      .from('hoarding-logos')
      .upload(path, buffer, {
        contentType:  file.type,
        upsert:       true,
      })

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = service.storage
      .from('hoarding-logos')
      .getPublicUrl(path)

    // Update hoarding record
    await service
      .from('hoardings')
      .update({ logo_url: publicUrl })
      .eq('id', hoardingId)

    return NextResponse.json({ url: publicUrl })

  } catch (err) {
    console.error('Hoarding upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
