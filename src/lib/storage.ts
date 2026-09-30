import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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

export async function putObject(input: {
    key: string
    body: Buffer
    contentType: string
}): Promise<{ key: string; url: string; contentType: string }> {
    const bucket = required('R2_BUCKET')
    const client = getClient()

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: input.key,
            Body: input.body,
            ContentType: input.contentType,
        }),
    )

    return {
        key: input.key,
        url: publicUrlForKey(input.key),
        contentType: input.contentType,
    }
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
