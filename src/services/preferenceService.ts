import type { z } from 'zod'

import type { UserPreference } from '../generated/prisma/client.js'
import PreferenceRepository from '../repositories/preferenceRepository.js'
import { preferencesSchema, type preferencesUpdateSchema } from '../schemas/index.js'

type Preferences = z.infer<typeof preferencesSchema>

const DEFAULT_PREFERENCES: Preferences = {
    theme: 'system',
    accent: 'royal',
    font: 'poppins',
    textSize: 'default',
    density: 'comfortable',
    motion: 'system',
}

/** Unknown stored values (e.g. from a removed option) fall back to the default for that field. */
function serialize(row: UserPreference | null): Preferences {
    if (!row) return DEFAULT_PREFERENCES
    const shape = preferencesSchema.shape
    const pick = <K extends keyof Preferences>(key: K): Preferences[K] => {
        const parsed = shape[key].safeParse(row[key])
        return parsed.success ? (parsed.data as Preferences[K]) : DEFAULT_PREFERENCES[key]
    }
    return {
        theme: pick('theme'),
        accent: pick('accent'),
        font: pick('font'),
        textSize: pick('textSize'),
        density: pick('density'),
        motion: pick('motion'),
    }
}

class PreferenceService {
    async get(userId: string): Promise<Preferences> {
        return serialize(await PreferenceRepository.findByUserId(userId))
    }

    async update(userId: string, input: z.infer<typeof preferencesUpdateSchema>): Promise<Preferences> {
        return serialize(await PreferenceRepository.upsert(userId, input))
    }
}

export default new PreferenceService()
