import { db, withDbRetry } from '@/lib/db'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view'

export interface AuditContext {
  actorId?: string | null
  actorEmail?: string | null
}

export interface AuditRecordInput {
  action: AuditAction
  entity: string
  entityId?: string
  metadata?: Record<string, unknown>
  ip?: string
}

/**
 * Persist an access-control / data-mutation event to the AuditLog table.
 * Swallows failures so auditing never blocks the primary operation.
 */
export async function recordAudit(
  context: AuditContext,
  input: AuditRecordInput,
): Promise<void> {
  try {
    await withDbRetry(() =>
      db.auditLog.create({
        data: {
          actorId: context.actorId ?? undefined,
          actorEmail: context.actorEmail ?? undefined,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
          ip: input.ip,
        },
      }),
    )
  } catch {
    return
  }
}
