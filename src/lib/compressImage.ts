import sharp from 'sharp'

export type CompressedImage = {
    buffer: Buffer
    contentType: string
    extension: string
}

const MAX_EDGE = 1920
const WEBP_QUALITY = 80

export async function compressImage(
    input: Buffer,
    mimeType?: string,
): Promise<CompressedImage> {
    const type = (mimeType ?? '').toLowerCase()

    if (type === 'image/svg+xml' || type.includes('svg')) {
        return {
            buffer: input,
            contentType: 'image/svg+xml',
            extension: 'svg',
        }
    }

    if (type === 'image/webp') {
        return {
            buffer: input,
            contentType: 'image/webp',
            extension: 'webp',
        }
    }

    const image = sharp(input, { failOn: 'none' }).rotate()
    const meta = await image.metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0

    let pipeline = image
    if (width > MAX_EDGE || height > MAX_EDGE) {
        pipeline = pipeline.resize({
            width: MAX_EDGE,
            height: MAX_EDGE,
            fit: 'inside',
            withoutEnlargement: true,
        })
    }

    const buffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer()
    return {
        buffer,
        contentType: 'image/webp',
        extension: 'webp',
    }
}

export async function compressImageFile(
    inputPath: string,
    isSvg: boolean,
): Promise<CompressedImage> {
    if (isSvg) {
        const { readFile } = await import('node:fs/promises')
        const buffer = await readFile(inputPath)
        return {
            buffer,
            contentType: 'image/svg+xml',
            extension: 'svg',
        }
    }

    const { readFile } = await import('node:fs/promises')
    const buffer = await readFile(inputPath)
    return compressImage(buffer)
}
