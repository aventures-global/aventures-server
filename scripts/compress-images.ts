import { mkdir, readdir, copyFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compressImageFile } from '../src/lib/compressImage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const clientAssets = path.resolve(root, '../client/public/assets')
const outDir = path.resolve(root, '.tmp/assets')

async function exists(filePath: string) {
    try {
        await access(filePath)
        return true
    } catch {
        return false
    }
}

async function walk(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true })
    const files: string[] = []
    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            files.push(...(await walk(full)))
        } else {
            files.push(full)
        }
    }
    return files
}

async function main() {
    if (!(await exists(clientAssets))) {
        console.warn(`No client assets at ${clientAssets}`)
        return
    }

    await mkdir(outDir, { recursive: true })
    const files = await walk(clientAssets)
    let converted = 0
    let copied = 0

    for (const file of files) {
        const rel = path.relative(clientAssets, file).replaceAll('\\', '/')
        const ext = path.extname(file).toLowerCase()
        const isSvg = ext === '.svg'
        const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)

        if (!isSvg && !isImage) continue

        const outRel = isSvg
            ? rel
            : rel.replace(/\.(jpe?g|png|webp)$/i, '.webp')
        const outPath = path.join(outDir, outRel)
        await mkdir(path.dirname(outPath), { recursive: true })

        if (isSvg || ext === '.webp') {
            await copyFile(file, outPath)
            copied += 1
            continue
        }

        const compressed = await compressImageFile(file, false)
        await writeFile(outPath, compressed.buffer)
        converted += 1
    }

    console.log(`Compressed ${converted} images, copied ${copied} svg/webp → ${outDir}`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
