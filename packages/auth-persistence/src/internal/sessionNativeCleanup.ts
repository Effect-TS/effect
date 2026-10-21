import type { LifecycleHooks } from "@effect/auth/Hooks"
import type { SessionCleanup } from "@effect/auth/Sessions"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { SqlClient } from "effect/sql/SqlClient"

import type { SessionCleanupMapping } from "./models/sessionModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { sessionUnavailable } from "./sessionNativeState.ts"
import { exactSqlText } from "./sqlChange.ts"
import { cleanupSqlRows, type SqlCleanupTable } from "./sqlCleanup.ts"
import { makeSqlCommitExecutor, SqlBatchCommit } from "./sqlCommit.ts"
import type { AnyTableModel } from "./tableModel.ts"

/**
 * Acquired only by managed composition after checking the physical SQLite
 * table. Kept internal so explicit mappings cannot opt into this assumption.
 *
 * @internal
 */
export const ManagedSqlitePendingCleanup = Context.Reference<object | undefined>(
  "@effect/auth-persistence/Adapter/ManagedSqlitePendingCleanup",
  { defaultValue: () => undefined }
)

export const makeNativeSessionCleanupServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: SessionCleanupMapping<AnyTableModel, AnyTableModel, unknown, unknown>
): Effect.fn.Return<
  { readonly sessionCleanup: SessionCleanup },
  never,
  SqlClient | LifecycleHooks | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit
  const boundedPending = yield* ManagedSqlitePendingCleanup

  const sql = (yield* SqlClient).withoutTransforms()
  const executor = yield* makeSqlCommitExecutor(sessionUnavailable)
  const now = tables.expression(mapping.clock.engineNowMillis)
  const candidates: Array<SqlCleanupTable> = []

  if (mapping.pending !== undefined) {
    const p = mapping.pending,
      table = tables(p.table)

    candidates.push({
      table,
      keys: [p.digest],
      ...(boundedPending === p.table ? { selectedKeysOwnDeletion: true as const } : {}),
      due: sql`${exactSqlText(sql, table.column(p.moduleId), table.value(p.moduleId, mapping.moduleId))} and ${
        tables.expression(mapping.clock.toMillis(table.column(p.expiresAt)))
      } <= ${now}`,
      order: [table.column(p.expiresAt), table.column(p.digest)]
    })
  }
  if (mapping.tombstone !== undefined) {
    const t = mapping.tombstone,
      table = tables(t.table)

    candidates.push({
      table,
      keys: [t.moduleId, t.subjectId, t.sessionId],
      due: sql`${exactSqlText(sql, table.column(t.moduleId), table.value(t.moduleId, mapping.moduleId))} and ${
        tables.expression(mapping.clock.toMillis(table.column(t.absoluteExpiresAt)))
      } <= ${now}`,
      order: [table.column(t.absoluteExpiresAt), table.column(t.sessionId)]
    })
  }

  return {
    sessionCleanup: {
      cleanup: ({ limit }) => {
        if (candidates.length === 0) {
          return executor.read(Effect.succeed({ removed: 0, hasMore: false }))
        }
        const work = cleanupSqlRows(candidates, limit, batch !== undefined)

        return batch === undefined
          ? executor.run(work, candidates.length > 1 ? "transaction" : "statement")
          : executor.batch(work).pipe(Effect.provideService(SqlBatchCommit, batch))
      }
    }
  }
})
