import type { User } from '../generated/prisma/client.js'
import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { formatMoney } from '../lib/money.js'
import AuditLogRepository from '../repositories/auditLogRepository.js'
import FinanceRepository, { type FinanceEntryWithRelations } from '../repositories/financeRepository.js'
import {
    financeCategoryCreateSchema,
    financeCategoryUpdateSchema,
    financeEntryCreateSchema,
    financeEntryListSchema,
    financeEntryUpdateSchema,
    financeEntryVoidSchema,
    financeSummarySchema,
} from '../schemas/index.js'

type Actor = Pick<User, 'id' | 'role'>

function displayName(user: { firstName: string | null; lastName: string | null; email: string | null }) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return name || user.email || 'Staff'
}

function serializePerson(
    person: { id: string; email: string | null; firstName: string | null; lastName: string | null; profilePicture: string | null } | null,
) {
    if (!person) return null
    return {
        id: person.id,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        profilePicture: person.profilePicture,
        displayName: displayName(person),
    }
}

function serializeCategory(category: {
    id: string
    name: string
    type: string
    isSystem: boolean
    sortOrder: number
    archivedAt: Date | null
    createdAt: Date
    updatedAt: Date
}) {
    return {
        id: category.id,
        name: category.name,
        type: category.type,
        isSystem: category.isSystem,
        sortOrder: category.sortOrder,
        archivedAt: category.archivedAt?.toISOString() ?? null,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
    }
}

function serializeEntry(entry: FinanceEntryWithRelations) {
    return {
        id: entry.id,
        type: entry.type,
        categoryId: entry.categoryId,
        category: serializeCategory(entry.category),
        amountCents: entry.amountCents,
        amount: formatMoney(entry.amountCents, entry.currency),
        currency: entry.currency,
        occurredAt: entry.occurredAt.toISOString(),
        description: entry.description,
        notes: entry.notes,
        paymentId: entry.paymentId,
        payment: entry.payment
            ? {
                  id: entry.payment.id,
                  bookingId: entry.payment.bookingId,
                  customerUserId: entry.payment.customerUserId,
                  amountCents: entry.payment.amountCents,
                  voidedAt: entry.payment.voidedAt?.toISOString() ?? null,
              }
            : null,
        voidedAt: entry.voidedAt?.toISOString() ?? null,
        voidReason: entry.voidReason,
        voidedBy: serializePerson(entry.voidedBy),
        createdBy: serializePerson(entry.createdBy),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
    }
}

class FinanceService {
    async listCategories(includeArchived = false) {
        const items = await FinanceRepository.listCategories(includeArchived)
        return { items: items.map(serializeCategory) }
    }

    async createCategory(actor: Actor, input: z.infer<typeof financeCategoryCreateSchema>) {
        const category = await FinanceRepository.createCategory({
            name: input.name,
            type: input.type,
            sortOrder: input.sortOrder ?? 100,
            isSystem: false,
        })
        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: null,
            action: 'finance.category.created',
            metadata: { categoryId: category.id, name: category.name, type: category.type },
        })
        return serializeCategory(category)
    }

    async updateCategory(actor: Actor, id: string, input: z.infer<typeof financeCategoryUpdateSchema>) {
        const existing = await FinanceRepository.findCategoryById(id)
        if (!existing) throw new AppError(404, 'NOT_FOUND', 'Category not found')
        if (existing.isSystem && input.name !== undefined && input.name !== existing.name) {
            throw new AppError(400, 'SYSTEM_CATEGORY', 'System categories cannot be renamed')
        }
        if (existing.isSystem && input.archived === true) {
            throw new AppError(400, 'SYSTEM_CATEGORY', 'System categories cannot be archived')
        }

        const category = await FinanceRepository.updateCategory(id, {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
            ...(input.archived === true ? { archivedAt: new Date() } : {}),
            ...(input.archived === false ? { archivedAt: null } : {}),
        })

        if (input.archived === true) {
            await AuditLogRepository.create({
                actorId: actor.id,
                subjectUserId: null,
                action: 'finance.category.archived',
                metadata: { categoryId: id },
            })
        }

        return serializeCategory(category)
    }

    async listEntries(query: z.infer<typeof financeEntryListSchema>) {
        const skip = (query.page - 1) * query.limit
        const { items, total } = await FinanceRepository.listEntries({
            q: query.q,
            type: query.type,
            categoryId: query.categoryId,
            currency: query.currency,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            includeVoided: query.includeVoided ?? false,
            skip,
            take: query.limit,
        })
        return {
            items: items.map(serializeEntry),
            total,
            page: query.page,
            limit: query.limit,
        }
    }

    async getEntry(id: string) {
        const entry = await FinanceRepository.findEntryById(id)
        if (!entry) throw new AppError(404, 'NOT_FOUND', 'Finance entry not found')
        return serializeEntry(entry)
    }

    async createEntry(actor: Actor, input: z.infer<typeof financeEntryCreateSchema>) {
        const category = await FinanceRepository.findCategoryById(input.categoryId)
        if (!category || category.archivedAt) {
            throw new AppError(400, 'INVALID_CATEGORY', 'Category not found or archived')
        }
        if (category.type !== input.type) {
            throw new AppError(400, 'CATEGORY_TYPE_MISMATCH', 'Category type must match entry type')
        }
        if (category.isSystem) {
            throw new AppError(
                400,
                'SYSTEM_CATEGORY',
                'Customer payments income is created automatically from payments',
            )
        }

        const entry = await FinanceRepository.createEntry({
            type: input.type,
            category: { connect: { id: category.id } },
            amountCents: input.amountCents,
            currency: input.currency,
            occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
            description: input.description,
            notes: input.notes ?? null,
            createdBy: { connect: { id: actor.id } },
        })

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: null,
            action: 'finance.entry.created',
            metadata: {
                entryId: entry.id,
                type: entry.type,
                amountCents: entry.amountCents,
                categoryId: entry.categoryId,
            },
        })

        return serializeEntry(entry)
    }

    async updateEntry(actor: Actor, id: string, input: z.infer<typeof financeEntryUpdateSchema>) {
        const existing = await FinanceRepository.findEntryById(id)
        if (!existing) throw new AppError(404, 'NOT_FOUND', 'Finance entry not found')
        if (existing.voidedAt) throw new AppError(400, 'ENTRY_VOIDED', 'Cannot update a voided entry')
        if (existing.paymentId) {
            throw new AppError(400, 'LINKED_PAYMENT', 'Edit the linked payment instead of this auto-posted entry')
        }

        if (input.categoryId) {
            const category = await FinanceRepository.findCategoryById(input.categoryId)
            if (!category || category.archivedAt) {
                throw new AppError(400, 'INVALID_CATEGORY', 'Category not found or archived')
            }
            if (category.type !== existing.type) {
                throw new AppError(400, 'CATEGORY_TYPE_MISMATCH', 'Category type must match entry type')
            }
            if (category.isSystem) {
                throw new AppError(400, 'SYSTEM_CATEGORY', 'Cannot move entries into the system payment category')
            }
        }

        const entry = await FinanceRepository.updateEntry(id, {
            ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
            ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : {}),
            ...(input.currency !== undefined ? { currency: input.currency } : {}),
            ...(input.occurredAt !== undefined ? { occurredAt: new Date(input.occurredAt) } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
        })

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: null,
            action: 'finance.entry.updated',
            metadata: { entryId: id, changes: input },
        })

        return serializeEntry(entry)
    }

    async voidEntry(actor: Actor, id: string, input: z.infer<typeof financeEntryVoidSchema>) {
        const existing = await FinanceRepository.findEntryById(id)
        if (!existing) throw new AppError(404, 'NOT_FOUND', 'Finance entry not found')
        if (existing.voidedAt) throw new AppError(400, 'ALREADY_VOIDED', 'Entry is already voided')
        if (existing.paymentId) {
            throw new AppError(400, 'LINKED_PAYMENT', 'Void the linked payment to reverse this income entry')
        }

        const entry = await FinanceRepository.updateEntry(id, {
            voidedAt: new Date(),
            voidReason: input.reason ?? null,
            voidedBy: { connect: { id: actor.id } },
        })

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: null,
            action: 'finance.entry.voided',
            metadata: { entryId: id, reason: input.reason ?? null },
        })

        return serializeEntry(entry)
    }

    async summary(query: z.infer<typeof financeSummarySchema>) {
        const from = query.from ? new Date(query.from) : undefined
        const to = query.to ? new Date(query.to) : undefined
        const currency = query.currency
        const { byType, byCategory, categoryMap } = await FinanceRepository.summary({ from, to, currency })

        const incomeCents = byType.find((row) => row.type === 'INCOME')?._sum.amountCents ?? 0
        const expenseCents = byType.find((row) => row.type === 'EXPENSE')?._sum.amountCents ?? 0
        const displayCurrency = currency ?? 'USD'

        return {
            from: from?.toISOString() ?? null,
            to: to?.toISOString() ?? null,
            currency: displayCurrency,
            incomeCents,
            income: formatMoney(incomeCents, displayCurrency),
            expenseCents,
            expense: formatMoney(expenseCents, displayCurrency),
            netCents: incomeCents - expenseCents,
            net: formatMoney(incomeCents - expenseCents, displayCurrency),
            byCategory: byCategory.map((row) => {
                const category = categoryMap.get(row.categoryId)
                return {
                    categoryId: row.categoryId,
                    name: category?.name ?? 'Unknown',
                    type: row.type,
                    count: row._count._all,
                    amountCents: row._sum.amountCents ?? 0,
                    amount: formatMoney(row._sum.amountCents ?? 0, displayCurrency),
                }
            }),
        }
    }
}

export default new FinanceService()
