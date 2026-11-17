// Reduce una foto antes de enviarla al tutor: máximo 1280 px por lado, en JPEG.
// Así sube rápido con datos móviles y gasta menos de la API.

export type PreparedImage = { mediaType: 'image/jpeg'; data: string; preview: string; blob: Blob }

const MAX_SIDE = 1280
const MAX_INPUT_BYTES = 15 * 1024 * 1024

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) throw new Error('not_image')
  if (file.size > MAX_INPUT_BYTES) throw new Error('too_big')

  const bitmap = await createImageBitmap(file).catch(async () => {
    // Algunos celulares no soportan createImageBitmap con ciertas fotos: se usa <img>.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  })

  const w = 'width' in bitmap ? bitmap.width : 0
  const h = 'height' in bitmap ? bitmap.height : 0
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.82),
  )
  const preview = canvas.toDataURL('image/jpeg', 0.82)
  return { mediaType: 'image/jpeg', data: preview.split(',')[1], preview, blob }
}
