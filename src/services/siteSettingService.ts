import type { z } from 'zod'

import { DEFAULT_BUSINESS_SETTINGS, type BusinessSettings } from '../lib/businessSettings.js'
import AppSettingRepository from '../repositories/appSettingRepository.js'
import AuditLogRepository from '../repositories/auditLogRepository.js'
import { businessSettingsSchema } from '../schemas/index.js'

class SiteSettingService {
    async getBusiness(): Promise<BusinessSettings> {
        const stored = businessSettingsSchema.safeParse(await AppSettingRepository.findValue('business'))
        return stored.success ? stored.data : DEFAULT_BUSINESS_SETTINGS
    }

    async updateBusiness(actorId: string, input: z.infer<typeof businessSettingsSchema>) {
        const settings: BusinessSettings = {
            ...input,
            addressLines: input.addressLines.filter(Boolean),
        }
        await AppSettingRepository.upsert('business', settings)
        await AuditLogRepository.create({
            actorId,
            subjectUserId: null,
            action: 'business_settings.updated',
        })
        return settings
    }
}

export default new SiteSettingService()
