import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const VALID_POSITIONS = ['top', 'bottom', 'left', 'right'] as const
type Position = typeof VALID_POSITIONS[number]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (appUser?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    const form       = await req.formData()
    const file       = form.get('file') as File | null
    const clientSlug = form.get('clientSlug') as string | null
    const position   = form.get('position') as Position | null

    if (!file || !clientSlug || !position) {
      return NextResponse.json({ error: 'Missing file, clientSlug or position' }, { status: 400 })
    }

    if (!VALID_POSITIONS.includes(position)) {
      return NextResponse.json({ error: 'Invalid position. Must be top, bottom, left or right.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, WebP or SVG.' }, { status: 400 })
    }

    const service = createServiceClient()

    // Verify client exists
    const { data: client } = await service
      .from('clients')
      .select('id, slug')
      .eq('slug', clientSlug)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Upload to Supabase Storage
    const ext      = file.type === 'image/svg+xml' ? 'svg'
                   : file.type === 'image/webp'    ? 'webp'
                   : file.type === 'image/png'     ? 'png'
                   : 'jpg'
    const path     = `${clientSlug}/${position}.${ext}`
    const buffer   = await file.arrayBuffer()

    const { error: uploadErr } = await service.storage
      .from('stand-graphics')
      .upload(path, buffer, {
        contentType: file.type,
        upsert:      true,      // replace existing stand graphic
      })

    if (uploadErr) {
      console.error('Stand graphic upload error:', uploadErr)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: { publicUrl } } = service.storage
      .from('stand-graphics')
      .getPublicUrl(path)

    // Update the client record with the new stand URL
    const columnMap: Record<Position, string> = {
      top:    'stand_top',
      bottom: 'stand_bottom',
      left:   'stand_left',
      right:  'stand_right',
    }

    await service
      .from('clients')
      .update({ [columnMap[position]]: publicUrl })
      .eq('id', client.id)

    return NextResponse.json({ success: true, url: publicUrl })

  } catch (err) {
    console.error('Stand upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
