import { AppError } from '../lib/errors.js'
import { compressImage } from '../lib/compressImage.js'
import { buildUploadKey, putObject } from '../lib/storage.js'

const ALLOWED = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
])

class UploadService {
  async create(input: {
    buffer: Buffer
    mimeType: string
    folder?: string
  }) {
    const mimeType = input.mimeType.toLowerCase()
    if (!ALLOWED.has(mimeType) && !mimeType.includes('svg')) {
      throw new AppError(400, 'INVALID_FILE', 'Only jpeg, png, webp, and svg are allowed')
    }

    const compressed = await compressImage(input.buffer, mimeType)
    const key = buildUploadKey(input.folder ?? 'uploads', compressed.extension)
    return putObject({
      key,
      body: compressed.buffer,
      contentType: compressed.contentType,
    })
  }
}

export default new UploadService()
