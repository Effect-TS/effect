/* oxlint-disable no-explicit-any -- physical mapping generics are erased only at this shared adapter boundary. */
import { AuthenticationClock } from "@effect/auth/Operations"
import * as Passkey from "@effect/auth/Passkey"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import type { PasskeyCredentialMapping, PasskeyPersistenceMapping } from "./models/passkeyModel.ts"
import { type NativeSqlTables, sqlMapping } from "./nativeSqlTable.ts"
import { makePasskeyNativeFlow } from "./passkeyNativeFlow.ts"
import { passkeyCredentialKey } from "./passkeyPolicy.ts"
import { exactSqlText } from "./sqlChange.ts"
import { canJoinTextColumns } from "./storageValidation.ts"
import type { TableModel } from "./tableModel.ts"

// Physical expression types are validated by NativeSqlTables at this boundary.
export type PasskeyNativeRead = PasskeyCredentialMapping<
  TableModel,
  TableModel,
  TableModel,
  unknown,
  any
>

export type PasskeyNativeMapping = PasskeyPersistenceMapping<
  PasskeyNativeRead,
  TableModel,
  unknown,
  any
>

/** @internal */
export type PasskeyNativeRow = Readonly<Record<string, unknown>>

/** @internal */
export const invalidPasskeyState = () => Passkey.PasskeyUnavailable.make({})

/** @internal */
export const makePasskeyNativeReadState = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  read: PasskeyNativeRead,
  clock?: PasskeyNativeMapping["clock"]
) {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const subject = tables(read.subject.table)
  const credential = tables(read.credential.table)
  const factor = tables(read.authority.table)
  const now = clock === undefined ? sql`0` : tables.expression(clock.engineNowMillis)

  const millis = (expression: Fragment) =>
    clock === undefined ? expression : tables.expression(clock.toMillis(expression))

  const storedNow = clock === undefined ? sql`0` : tables.expression(clock.fromMillis(clock.engineNowMillis))

  const active = (table: "subject" | "credential" | "authority") => tables.expression(read[table].activeCondition)

  const invalidState = invalidPasskeyState
  const sameId = (nativeId: unknown, value: unknown) => read.subjectIds.equals(nativeId, value)

  const native = Effect.fnUntraced(function*(id: Passkey.PasskeyCredential["revision"]["subjectId"]) {
    const value = read.subjectIds.toNative(id)

    if (!(read.subjectIds.toSubject(value) === id)) return yield* invalidState()

    return value
  })

  const revisions = Effect.fnUntraced(function*(
    nativeId: unknown,
    rows: ReadonlyArray<PasskeyNativeRow>
  ) {
    const entries = new Map<string, Passkey.PasskeyCredential["revision"]["securityRevision"]>()

    for (const row of rows) {
      if (row[read.authority.credentialId] === null) continue
      if (!sameId(nativeId, row[read.authority.subjectId])) return yield* invalidState()
      if (!read.authority.isActiveStatus(row[read.authority.status])) continue

      const decoded = yield* Schema.decodeUnknownEffect(Passkey.PasskeyRevision.fields.credentials)([
        {
          credentialId: row[read.authority.credentialId],
          revision: row[read.authority.revision]
        }
      ])

      const entry = decoded[0]

      if (!(entry !== undefined)) return yield* invalidState()
      const previous = entries.get(entry.credentialId)

      if (!(previous === undefined || previous === entry.revision)) return yield* invalidState()
      entries.set(entry.credentialId, entry.revision)
    }
    if (!(entries.size <= 64)) return yield* invalidState()

    return [...entries]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([credentialId, revision]) => ({ credentialId, revision }))
  })

  const revision = Effect.fnUntraced(function*(
    row: PasskeyNativeRow,
    factors: ReadonlyArray<PasskeyNativeRow>
  ) {
    const id = read.subject.decodeId(row)
    const subjectId = read.subjectIds.toSubject(id)

    if (!sameId(yield* native(subjectId), id)) return yield* invalidState()

    return yield* Schema.decodeUnknownEffect(Passkey.PasskeyRevision)({
      subjectId,
      securityRevision: row[read.subject.securityRevision],
      credentials: yield* revisions(id, factors)
    })
  })

  const decodeCredential = Effect.fnUntraced(function*(
    row: PasskeyNativeRow,
    current: Passkey.PasskeyCredential["revision"],
    subjectRow: PasskeyNativeRow
  ) {
    const value = read.credential.decode(row)
    const owned = current.credentials.find((entry) => entry.credentialId === value.credentialId)

    if (
      !read.credential.isActiveStatus(row[read.credential.status]) ||
      owned?.revision !== row[read.credential.credentialRevision]
    ) {
      return undefined
    }
    if (!(read.subjectIds.toSubject(read.credential.decodeSubjectId(row)) === current.subjectId)) {
      return yield* invalidState()
    }

    return Passkey.snapshotPasskeySync(Passkey.PasskeyCredential, {
      ...value,
      revision: current,
      requirement: yield* read.subject.decodeRequirement(subjectRow),
      active: true
    })
  })

  const readAuthority = Effect.fnUntraced(function*(
    nativeId: unknown,
    lock: boolean,
    credentialId?: string
  ) {
    // The subject lock is a distinct first statement; joined FOR UPDATE cannot
    // establish the lock order required by coordinated application transactions.
    if (lock) {
      const locked = yield* sql<PasskeyNativeRow>`select ${
        subject.fields("s_")
      }, ${now} as "engineNow" from ${subject.name} where ${subject.column(read.subject.id)} = ${
        subject.value(read.subject.id, nativeId)
      } and ${active("subject")} ${
        sql.onDialectOrElse({ pg: () => sql`for update`, mysql: () => sql`for update`, orElse: () => sql`` })
      }`

      if (locked.length !== 1) return undefined
      const row = subject.decode(locked[0]!, "s_")

      if (
        !sameId(read.subject.decodeId(row), nativeId) ||
        !read.subject.isActiveStatus(row[read.subject.status])
      ) {
        return undefined
      }

      const lockedFactors = sql`select ${factor.fields("f_")} from ${factor.name} where ${
        factor.column(read.authority.subjectId)
      } = ${factor.value(read.authority.subjectId, nativeId)} and ${active("authority")} order by ${
        factor.column(read.authority.credentialId)
      } limit 65 ${
        sql.onDialectOrElse({ pg: () => sql`for update`, mysql: () => sql`for update`, orElse: () => sql`` })
      }`

      const rows = credentialId === undefined
        ? yield* sql<PasskeyNativeRow>`${lockedFactors}`
        : yield* sql<PasskeyNativeRow>`with locked_factors as ${
          sql.onDialectOrElse({ pg: () => sql`materialized`, orElse: () => sql`` })
        } (${lockedFactors})
        select locked_factors.*, ${credential.fields("c_")} from ${credential.name} left join locked_factors on 1 = 1
        where ${credential.column(read.credential.subjectId)} = ${
          credential.value(read.credential.subjectId, nativeId)
        } and ${
          exactSqlText(
            sql,
            credential.column(read.credential.credentialId),
            credential.value(read.credential.credentialId, credentialId)
          )
        } and ${active("credential")}`

      if (!(rows.length <= 64)) return yield* invalidState()

      return {
        row,
        credential: credentialId === undefined || rows[0] === undefined
          ? undefined
          : credential.decode(rows[0], "c_"),
        revision: yield* revision(
          row,
          rows.map((row) => factor.decode(row, "f_"))
        ),
        nowMillis: yield* Schema.decodeEffect(Schema.Int)(Number(locked[0]!.engineNow))
      }
    }

    const observedSubject = joinedSubject,
      observedFactor = joinedFactor

    const rows = yield* sql<PasskeyNativeRow>`select ${observedSubject.fields("s_")}, ${
      observedFactor.fields("f_")
    }, ${now} as "engineNow" ${credentialId === undefined ? sql`` : sql`, ${joinedCredential.fields("c_")}`} from ${
      selected("subject", "passkey_subject")
    } left join ${selected("authority", "passkey_factor")} on ${observedFactor.column(read.authority.subjectId)} = ${
      observedFactor.value(read.authority.subjectId, nativeId)
    } ${
      credentialId === undefined
        ? sql``
        : sql`join ${selected("credential", "passkey_credential")} on ${
          joinedCredential.column(read.credential.subjectId)
        } = ${joinedCredential.value(read.credential.subjectId, nativeId)} and ${
          exactSqlText(
            sql,
            joinedCredential.column(read.credential.credentialId),
            joinedCredential.value(read.credential.credentialId, credentialId)
          )
        }`
    } where ${observedSubject.column(read.subject.id)} = ${observedSubject.value(read.subject.id, nativeId)} limit 65`

    if (rows.length === 0 || rows.length > 64) return undefined
    const row = observedSubject.decode(rows[0]!, "s_")

    if (
      !sameId(read.subject.decodeId(row), nativeId) ||
      !read.subject.isActiveStatus(row[read.subject.status])
    ) {
      return undefined
    }
    if (
      !rows.every((selected) => {
        const other = observedSubject.decode(selected, "s_")

        return (
          sameId(read.subject.decodeId(other), nativeId) &&
          other[read.subject.securityRevision] === row[read.subject.securityRevision] &&
          read.subject.isActiveStatus(other[read.subject.status])
        )
      })
    ) {
      return yield* invalidState()
    }

    return {
      row,
      credential: credentialId === undefined ? undefined : joinedCredential.decode(rows[0]!, "c_"),
      revision: yield* revision(
        row,
        rows.map((selected) => observedFactor.decode(selected, "f_"))
      ),
      nowMillis: yield* Schema.decodeEffect(Schema.Int)(Number(rows[0]!.engineNow))
    }
  })

  // Active predicates retain their original table qualification inside each
  // subquery; aliases allow applications to map several roles to one table.
  const joinedSubject = subject.as("passkey_subject")
  const joinedFactor = factor.as("passkey_factor")
  const joinedCredential = credential.as("passkey_credential")

  const selected = (kind: "subject" | "authority" | "credential", alias: string) => {
    const table = kind === "subject" ? subject : kind === "authority" ? factor : credential

    return sql`(select * from ${table.name} where ${active(kind)}) as ${sql(alias)}`
  }

  const joinedIds = yield* canJoinTextColumns([
    subject.unencodedTextColumn?.(read.subject.id),
    credential.unencodedTextColumn?.(read.credential.subjectId),
    factor.unencodedTextColumn?.(read.authority.subjectId)
  ]).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Passkey.PasskeyUnavailable.make({}))))
  )

  const lookup = Effect.fnUntraced(function*(rpId: string, protocolCredentialId: string) {
    const key = yield* passkeyCredentialKey(rpId, protocolCredentialId)
    let nativeId: unknown

    if (!joinedIds) {
      const found = yield* sql<PasskeyNativeRow>`select ${credential.fields("c_")} from ${credential.name} where ${
        exactSqlText(
          sql,
          credential.column(read.credential.credentialKey),
          credential.value(read.credential.credentialKey, key)
        )
      } and ${active("credential")}`

      if (found.length !== 1) return undefined
      const row = credential.decode(found[0]!, "c_")

      if (
        !(
          row[read.credential.rpId] === rpId &&
          row[read.credential.protocolCredentialId] === protocolCredentialId
        )
      ) {
        return yield* invalidState()
      }
      nativeId = read.credential.decodeSubjectId(row)
    }

    const s = joinedSubject,
      c = joinedCredential,
      f = joinedFactor

    const bindOwner = (table: typeof subject, key: string) =>
      joinedIds
        ? exactSqlText(sql, table.column(key), c.column(read.credential.subjectId))
        : sql`${table.column(key)} = ${table.value(key, nativeId)}`

    const rows = yield* sql<PasskeyNativeRow>`select ${s.fields("s_")}, ${c.fields("c_")}, ${f.fields("f_")}
      from ${selected("credential", "passkey_credential")}
      join ${selected("subject", "passkey_subject")} on ${bindOwner(s, read.subject.id)}
      left join ${selected("authority", "passkey_factor")} on ${bindOwner(f, read.authority.subjectId)}
      where ${exactSqlText(sql, c.column(read.credential.credentialKey), c.value(read.credential.credentialKey, key))}${
      joinedIds ? sql`` : sql` and ${bindOwner(c, read.credential.subjectId)}`
    } limit 65`

    if (rows.length === 0 || rows.length > 64) return undefined
    const row = c.decode(rows[0]!, "c_")
    const subjectRow = s.decode(rows[0]!, "s_")
    const owner = read.credential.decodeSubjectId(row)

    if (
      !(
        (joinedIds || sameId(owner, nativeId)) &&
        row[read.credential.rpId] === rpId &&
        row[read.credential.protocolCredentialId] === protocolCredentialId
      )
    ) {
      return yield* invalidState()
    }
    if (
      !rows.every((selected) => {
        const other = c.decode(selected, "c_")
        const subjectValue = s.decode(selected, "s_")

        return (
          sameId(owner, read.credential.decodeSubjectId(other)) &&
          sameId(owner, read.subject.decodeId(subjectValue)) &&
          other[read.credential.credentialId] === row[read.credential.credentialId] &&
          other[read.credential.credentialRevision] === row[read.credential.credentialRevision] &&
          subjectValue[read.subject.securityRevision] === subjectRow[read.subject.securityRevision]
        )
      })
    ) {
      return yield* invalidState()
    }

    return yield* decodeCredential(
      row,
      yield* revision(
        subjectRow,
        rows.map((row) => f.decode(row, "f_"))
      ),
      subjectRow
    )
  })

  return {
    sql,
    tables,
    subject,
    credential,
    factor,
    now,
    storedNow,
    millis,
    active,
    native,
    sameId,
    revision,
    decodeCredential,
    readAuthority,
    lookup,
    joinedSubject,
    joinedFactor,
    joinedCredential,
    selected,
    mapped: sqlMapping
  }
})

/** @internal */
export const makePasskeyNativeState = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: PasskeyNativeMapping
) {
  const state = yield* makePasskeyNativeReadState(tables, mapping.read, mapping.clock)
  const clockPolicy = yield* AuthenticationClock
  const ceremony = yield* makePasskeyNativeFlow(tables, mapping)

  return { ...state, clockPolicy, mapping, ceremony, flow: ceremony.flow, access: ceremony.access }
})

/** @internal */
export type PasskeyNativeReadState = Effect.Success<ReturnType<typeof makePasskeyNativeReadState>>
