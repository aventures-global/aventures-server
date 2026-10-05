import { CopyObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'

function required(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new Error(`${name} is not set`)
    }
    return value
}

function getClient() {
    const accountId = required('R2_ACCOUNT_ID')
    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: required('R2_ACCESS_KEY_ID'),
            secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
        },
    })
}

export function publicUrlForKey(key: string): string {
    const base = required('R2_PUBLIC_BASE_URL').replace(/\/$/, '')
    return `${base}/${key.replace(/^\//, '')}`
}

/** The R2 key behind one of our public URLs, or `null` for any other URL. */
export function keyForPublicUrl(url: string): string | null {
    const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '')
    if (!base || !url.startsWith(`${base}/`)) return null
    return decodeURIComponent(url.slice(base.length + 1).split(/[?#]/)[0]) || null
}

/** `Content-Disposition` that makes browsers download the file under `name`, including non-ASCII names. */
export function attachmentDisposition(name: string): string {
    const ascii = name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7e]/g, '')
        .replace(/["\\]/g, '')
        .trim()
    return `attachment; filename="${ascii || 'download'}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export async function putObject(input: {
    key: string
    body: Buffer
    contentType: string
    contentDisposition?: string
}): Promise<{ key: string; url: string; contentType: string }> {
    const bucket = required('R2_BUCKET')
    const client = getClient()

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: input.key,
            Body: input.body,
            ContentType: input.contentType,
            ContentDisposition: input.contentDisposition,
        }),
    )

    return {
        key: input.key,
        url: publicUrlForKey(input.key),
        contentType: input.contentType,
    }
}

/** Rewrites a stored PDF's headers in place so downloads use `name`. */
export async function setDownloadName(key: string, name: string): Promise<void> {
    const bucket = required('R2_BUCKET')
    await getClient().send(
        new CopyObjectCommand({
            Bucket: bucket,
            Key: key,
            CopySource: `${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`,
            MetadataDirective: 'REPLACE',
            ContentType: 'application/pdf',
            ContentDisposition: attachmentDisposition(name),
        }),
    )
}

export function buildUploadKey(folder: string, extension: string): string {
    const safeFolder = folder.replace(/^\/+|\/+$/g, '') || 'uploads'
    return `${safeFolder}/${randomUUID()}.${extension}`
}

export function isR2Configured(): boolean {
    return Boolean(
        process.env.R2_ACCOUNT_ID &&
            process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY &&
            process.env.R2_BUCKET &&
            process.env.R2_PUBLIC_BASE_URL,
    )
}
