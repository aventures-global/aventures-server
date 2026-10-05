import 'dotenv/config'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { prisma } from '../src/lib/prisma.js'
import { attachmentDisposition, isR2Configured, putObject } from '../src/lib/storage.js'
import VisaRepository from '../src/repositories/visaRepository.js'

const STATIC_PREFIX = '/assets/pdfs/'
const CLIENT_PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/public')

/** Uploads checklist PDFs still served from the client's public folder to R2 and repoints the catalog. Safe to re-run. */
async function main() {
    if (!isR2Configured()) throw new Error('R2 is not configured; set the R2_* variables in server/.env')
    const catalog = await VisaRepository.find()
    if (!catalog) throw new Error('The visa catalog has not been seeded yet')

    let moved = 0
    const services = []
    for (const service of catalog.services) {
        const { href, downloadName } = service.checklistPdf
        if (!href.startsWith(STATIC_PREFIX)) {
            console.log(`skip ${service.id}: already at ${href}`)
            services.push(service)
            continue
        }
        const body = await readFile(path.join(CLIENT_PUBLIC, href))
        const { url } = await putObject({
            key: `visa-checklists/${path.posix.basename(href)}`,
            body,
            contentType: 'application/pdf',
            contentDisposition: attachmentDisposition(downloadName),
        })
        console.log(`moved ${service.id}: ${href} -> ${url}`)
        services.push({ ...service, checklistPdf: { href: url, downloadName } })
        moved += 1
    }

    if (moved > 0) await VisaRepository.update({ services })
    console.log(`${moved} PDF(s) moved to R2`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
