import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'

/** Former public bases still present in stored URLs after switching off *.r2.dev. */
const LEGACY_PUBLIC_BASES = ['https://pub-99ebb469dda04547813e7149f4af3469.r2.dev'] as const

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
    const bases = [
        process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, ''),
        ...LEGACY_PUBLIC_BASES,
    ].filter((base): base is string => Boolean(base))

    for (const base of bases) {
        if (!url.startsWith(`${base}/`)) continue
        return decodeURIComponent(url.slice(base.length + 1).split(/[?#]/)[0]) || null
    }
    return null
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

export async function deleteObject(key: string): Promise<void> {
    const bucket = required('R2_BUCKET')
    await getClient().send(
        new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        }),
    )
}

/** Best-effort delete for a stored public URL; no-op for non-R2 URLs. */
export async function deletePublicUrl(url: string | null | undefined): Promise<void> {
    const key = url ? keyForPublicUrl(url) : null
    if (!key) return
    try {
        await deleteObject(key)
    } catch {
        // Profile updates should not fail because cleanup did.
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

/** Private object key — never exposed via the public CDN base URL. */
export function buildPrivateDocumentKey(extension: string): string {
    const ext = extension.replace(/^\./, '').toLowerCase() || 'bin'
    return `private/documents/${randomUUID()}.${ext}`
}

/** Upload a private object. Does not return a public URL. */
export async function putPrivateObject(input: {
    key: string
    body: Buffer
    contentType: string
    contentDisposition?: string
}): Promise<{ key: string; contentType: string }> {
    const bucket = required('R2_BUCKET')
    await getClient().send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: input.key,
            Body: input.body,
            ContentType: input.contentType,
            ContentDisposition: input.contentDisposition,
        }),
    )
    return { key: input.key, contentType: input.contentType }
}

export async function getObjectStream(key: string): Promise<{
    body: Readable
    contentType: string | undefined
    contentLength: number | undefined
}> {
    const bucket = required('R2_BUCKET')
    const result = await getClient().send(
        new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        }),
    )
    if (!result.Body) {
        throw new Error(`Object has no body: ${key}`)
    }
    return {
        body: result.Body as Readable,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
    }
}

export async function getObjectBuffer(key: string): Promise<{
    body: Buffer
    contentType: string | undefined
    contentLength: number | undefined
}> {
    const object = await getObjectStream(key)
    const chunks: Buffer[] = []
    for await (const chunk of object.body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const body = Buffer.concat(chunks)
    return {
        body,
        contentType: object.contentType,
        contentLength: object.contentLength ?? body.length,
    }
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
