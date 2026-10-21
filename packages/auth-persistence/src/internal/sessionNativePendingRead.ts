import type { SubjectId, TokenDigest } from "@effect/auth/Schema"
import type { PendingAuthenticationKind } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"

import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { makeNativeSessionPending } from "./sessionNativePending.ts"
import {
  invalidSessionState,
  makeNativeSessionAuthorityState,
  type NativeSessionAuthorityMapping,
  sessionUnavailable
} from "./sessionNativeState.ts"
import { exactSqlText } from "./sqlChange.ts"
import { canJoinTextColumns } from "./storageValidation.ts"

/**
 * Both ports re-read the pending row with current authority in one snapshot.
 * Discovery only selects the independently bound owner for incompatible IDs.
 *
 * @internal
 */
export const makeNativeSessionPendingReader = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: NativeSessionAuthorityMapping & Parameters<typeof makeNativeSessionPending>[1],
  batch = false
) {
  const state = yield* makeNativeSessionAuthorityState(tables, mapping, batch)
  const pending = yield* makeNativeSessionPending(tables, mapping, batch)

  const joinedIds = yield* canJoinTextColumns([
    pending.table.unencodedTextColumn?.(pending.p.subjectId),
    state.subject.unencodedTextColumn?.(mapping.subject.id),
    state.credential.unencodedTextColumn?.(mapping.credential.subjectId)
  ]).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, sessionUnavailable))))

  const read = Effect.fnUntraced(function*(kind: PendingAuthenticationKind, digest: TokenDigest) {
    const { sql, now } = state,
      { p, table } = pending

    let discoveredSubjectId: SubjectId | undefined
    let nativeId: unknown

    if (!joinedIds) {
      const selected = yield* pending.read(kind, digest)

      if (selected === undefined) return undefined
      discoveredSubjectId = selected.record.subjectId
      nativeId = yield* mapping.subjectId.toNative(discoveredSubjectId)
    }

    const pt = table.as("authentication_pending"),
      st = state.joinedSubject,
      ct = state.joinedCredential,
      s = mapping.subject,
      c = mapping.credential

    const bindOwner = (table: typeof pt, key: string) =>
      joinedIds
        ? exactSqlText(sql, table.column(key), pt.column(p.subjectId))
        : state.id(table, key, nativeId)

    const rows = yield* sql`select ${pt.fields("p_")}, ${st.fields("s_")}, ${
      ct.fields("c_")
    }, ${now} as engine_now from ${pt.name} join ${st.name} on ${bindOwner(st, s.id)} and ${
      state.activeSubject(st)
    } left join ${ct.name} on ${bindOwner(ct, c.subjectId)} and ${state.activeCredential(ct)} where ${
      pending.predicate(pt, kind, digest)
    }${joinedIds ? sql`` : sql` and ${bindOwner(pt, p.subjectId)}`} limit 65`

    if (rows[0] === undefined) return undefined
    const record = yield* pending.decode(kind, pt.decode(rows[0], "p_"))

    if (!(joinedIds || record.subjectId === discoveredSubjectId)) {
      return yield* invalidSessionState()
    }
    const owner = yield* mapping.subjectId.toNative(record.subjectId)

    const authority = yield* state.decode(
      record.subjectId,
      owner,
      rows[0],
      rows.map((row) => ct.decode(row, "c_")),
      rows[0].engine_now
    )

    return authority === undefined || authority.now >= record.expiresAtMillis
      ? undefined
      : { record, authority }
  })

  return { state, pending, read }
})
