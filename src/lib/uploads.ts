const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export function imageExtension(file: File): string {
  return EXTENSIONS[file.type] ?? 'bin'
}

export async function validateImageFile(file: File, maxBytes: number): Promise<string | null> {
  if (!EXTENSIONS[file.type]) return 'Invalid file type. Use PNG, JPG or WebP.'
  if (file.size <= 0 || file.size > maxBytes) {
    return `File must be smaller than ${Math.floor(maxBytes / 1024 / 1024)}MB.`
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const png = bytes.length >= 8
    && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  const jpeg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const webp = bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'

  const valid = file.type === 'image/png' ? png : file.type === 'image/jpeg' ? jpeg : webp
  return valid ? null : 'The file contents do not match the selected image type.'
}

export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

export function validHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}
