'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FieldHint } from '@/components/ui/label'

/**
 * Resizes the chosen image to 256px and stores it as a data URL on the profile.
 * No third-party upload service, and nothing leaves the browser until the
 * profile is saved.
 */
export function AvatarPicker({
  name,
  value,
  onChange,
}: {
  name: string
  value: string | null
  onChange: (value: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }
    if (file.size > 6_000_000) {
      setError('That image is larger than 6 MB.')
      return
    }
    setBusy(true)
    try {
      const dataUrl = await resize(file)
      onChange(dataUrl)
    } catch {
      setError('Could not read that image.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || 'New member'} src={value} size={64} />
      <div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ''
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {busy ? 'Processing…' : value ? 'Change photo' : 'Add photo'}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 /> Remove
            </Button>
          ) : null}
        </div>
        <FieldHint>Optional. Resized to 256px in your browser.</FieldHint>
        {error ? <p className="mt-1 text-[12px] font-medium text-danger">{error}</p> : null}
      </div>
    </div>
  )
}

async function resize(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const width = bitmap.width * scale
  const height = bitmap.height * scale
  ctx.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}
