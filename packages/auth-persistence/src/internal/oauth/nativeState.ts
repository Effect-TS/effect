import {
  OAuthAccountRevision,
  type OAuthCredentialKey,
  OAuthCredentialSnapshot,
  OAuthExternalIdentity
} from "@effect/auth/OAuth"
import type { SubjectId } from "@effect/auth/Schema"
import type { AuthenticationRequirement } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import type { PersistenceMappingError } from "../mappingError.ts"
import type { OAuthSignInMapping, OAuthSubjectReadTable } from "../models/oauthModel.ts"
import type { NativeSqlTables } from "../nativeSqlTable.ts"
import { exactSqlText } from "../sqlChange.ts"
import { canJoinTextColumns, withStorageValidation } from "../storageValidation.ts"
import type { SqlExpression, TableModel } from "../tableModel.ts"
import { invalidState, oauthIdentityKey, unavailable } from "./state.ts"

// Expression handles are checked by the physical compiler, not domain codecs.
export type OAuthNativeReadMapping = OAuthSignInMapping<
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  unknown,
  SqlExpression
>

type Row = Readonly<Record<string, unknown>>

/** @internal */
export const decodeOAuthRequirement = Effect.fnUntraced(function*(
  subject: OAuthSubjectReadTable<TableModel>,
  row: Row
): Effect.fn.Return<AuthenticationRequirement, PersistenceMappingError> {
  const requirement = subject.decodeAuthenticationRequirement(row)

  return yield* Effect.isEffect(requirement) ? requirement : Effect.succeed(requirement)
})

/**
 * Unlocked snapshots and explicit subject-first reads share decoding rules.
 * No observation registry or discovered-identity placeholder is retained.
 *
 * @internal
 */
export const makeOAuthNativeAuthority = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: Pick<OAuthNativeReadMapping, "subject" | "authority" | "subjectId" | "clock">
) {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const subject = tables(mapping.subject.table)
  const authority = tables(mapping.authority.table)
  const s = subject.as("oauth_subject")
  const a = authority.as("oauth_authority")
  const now = tables.expression(mapping.clock.engineNowMillis)

  const lock = sql.onDialectOrElse({
    pg: () => sql`for update`,
    mysql: () => sql`for update`,
    orElse: () => sql``
  })

  const active = (kind: "subject" | "authority", alias: string) => {
    const descriptor = mapping[kind]
    const physical = tables(descriptor.table)

    return sql`(select * from ${physical.name} where ${tables.expression(descriptor.activeCondition)}) as ${sql(alias)}`
  }

  const revision = Effect.fnUntraced(function*(
    subjectRow: Row,
    factors: ReadonlyArray<Row>,
    nativeId: unknown
  ) {
    if (!mapping.subject.isActiveStatus(subjectRow[mapping.subject.status])) {
      return yield* invalidState()
    }
    if (!mapping.subjectId.equals(subjectRow[mapping.subject.id], nativeId)) {
      return yield* invalidState()
    }
    if (!(factors.length > 0 && factors.length <= 64)) return yield* invalidState()
    if (
      !factors.every(
        (row) =>
          mapping.subjectId.equals(row[mapping.authority.subjectId], nativeId) &&
          mapping.authority.isActiveStatus(row[mapping.authority.status])
      )
    ) {
      return yield* invalidState()
    }

    const credentials = factors.map((row) => ({
      credentialId: row[mapping.authority.credentialId],
      revision: row[mapping.authority.revision]
    }))

    if (!(new Set(credentials.map((item) => item.credentialId)).size === credentials.length)) {
      return yield* invalidState()
    }

    const value = yield* Schema.decodeUnknownEffect(Schema.toType(OAuthAccountRevision))({
      subjectId: yield* mapping.subjectId.toSubject(nativeId),
      securityRevision: subjectRow[mapping.subject.securityRevision],
      credentials
    })

    return {
      ...value,
      credentials: [...value.credentials].sort((left, right) => left.credentialId.localeCompare(right.credentialId))
    }
  })

  const captureSubject = Effect.fnUntraced(function*(subjectId: SubjectId, locking: boolean) {
    const nativeId = yield* mapping.subjectId.toNative(subjectId)

    const rows = yield* sql`select ${subject.fields("s_")}, ${now} as engine_now from ${subject.name} where ${
      subject.column(mapping.subject.id)
    } = ${subject.value(mapping.subject.id, nativeId)} and ${
      tables.expression(mapping.subject.activeCondition)
    } limit 2 ${locking ? lock : sql``}`

    if (!(rows.length <= 1)) return yield* invalidState()
    if (rows[0] === undefined) return undefined
    const row = subject.decode(rows[0], "s_")

    if (!mapping.subjectId.equals(row[mapping.subject.id], nativeId)) return yield* invalidState()

    return {
      nativeId,
      subject: row,
      securityRevision: yield* Schema.decodeUnknownEffect(
        OAuthAccountRevision.fields.securityRevision
      )(row[mapping.subject.securityRevision]),
      now: yield* Schema.decodeEffect(Schema.Int)(Number(rows[0].engine_now))
    }
  })

  const capture = Effect.fnUntraced(function*(subjectId: SubjectId, locking: boolean) {
    const nativeId = yield* mapping.subjectId.toNative(subjectId)

    if (locking) {
      // Never acquire a credential, identity, flow or policy lock before this.
      const subjects = yield* sql`select ${subject.fields("s_")}, ${now} as engine_now from ${subject.name}
        where ${subject.column(mapping.subject.id)} = ${subject.value(mapping.subject.id, nativeId)}
          and ${tables.expression(mapping.subject.activeCondition)} ${lock}`

      if (subjects.length === 0) return undefined
      if (!(subjects.length === 1)) return yield* invalidState()
      const subjectRow = subject.decode(subjects[0]!, "s_")

      const factors = yield* sql`select ${authority.fields("a_")} from ${authority.name}
        where ${authority.column(mapping.authority.subjectId)} = ${
        authority.value(mapping.authority.subjectId, nativeId)
      }
          and ${tables.expression(mapping.authority.activeCondition)}
        order by ${authority.column(mapping.authority.credentialId)} limit 65 ${lock}`

      if (factors.length === 0) return undefined

      return {
        nativeId,
        subject: subjectRow,
        revision: yield* revision(
          subjectRow,
          factors.map((row) => authority.decode(row, "a_")),
          nativeId
        ),
        now: yield* Schema.decodeEffect(Schema.Int)(Number(subjects[0]!.engine_now))
      }
    }

    // Bind each column's own native codec; the columns need not share an encoding.
    const rows = yield* sql`select ${s.fields("s_")}, ${a.fields("a_")}, ${now} as engine_now
      from ${active("subject", "oauth_subject")}
      join ${active("authority", "oauth_authority")} on
        ${a.column(mapping.authority.subjectId)} = ${a.value(mapping.authority.subjectId, nativeId)}
      where ${s.column(mapping.subject.id)} = ${s.value(mapping.subject.id, nativeId)}
      order by ${a.column(mapping.authority.credentialId)} limit 65`

    if (rows.length === 0) return undefined
    const subjectRow = s.decode(rows[0]!, "s_")

    return {
      nativeId,
      subject: subjectRow,
      revision: yield* revision(
        subjectRow,
        rows.map((row) => a.decode(row, "a_")),
        nativeId
      ),
      now: yield* Schema.decodeEffect(Schema.Int)(Number(rows[0]!.engine_now))
    }
  })

  return { sql, now, lock, subject, authority, capture, captureSubject, revision }
})

/** @internal */
export const makeOAuthNativeState = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: OAuthNativeReadMapping
) {
  const state = yield* makeOAuthNativeAuthority(tables, mapping)
  const { sql, subject, authority, revision } = state
  const ownership = tables(mapping.ownership.table)
  const credential = tables(mapping.credential.table)
  const s = subject.as("oauth_subject")
  const o = ownership.as("oauth_identity")
  const c = credential.as("oauth_credential")
  const a = authority.as("oauth_authority")

  const exact = (
    left: Parameters<typeof exactSqlText>[1],
    right: Parameters<typeof exactSqlText>[2]
  ) => exactSqlText(sql, left, right)

  const active = (kind: "subject" | "credential" | "authority", alias: string) => {
    const descriptor = mapping[kind]
    const physical = tables(descriptor.table)

    return sql`(select * from ${physical.name} where ${tables.expression(descriptor.activeCondition)}) as ${sql(alias)}`
  }

  const [joinedIds, joinedIdentityKeys] = yield* Effect.forEach(
    [
      [
        ownership.unencodedTextColumn?.(mapping.ownership.subjectId),
        subject.unencodedTextColumn?.(mapping.subject.id),
        credential.unencodedTextColumn?.(mapping.credential.subjectId),
        authority.unencodedTextColumn?.(mapping.authority.subjectId)
      ],
      [
        credential.unencodedTextColumn?.(mapping.credential.identityKey),
        ownership.unencodedTextColumn?.(mapping.ownership.identityKey)
      ]
    ],
    canJoinTextColumns
  ).pipe(
    withStorageValidation,
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
  )

  const decodeSnapshot = Effect.fnUntraced(function*(
    rows: ReadonlyArray<Row>,
    moduleId: string,
    nativeId?: unknown
  ) {
    const first = rows[0]

    if (first === undefined) return undefined
    const owned = o.decode(first, "o_")

    const identity = yield* Schema.decodeUnknownEffect(OAuthExternalIdentity)({
      provider: owned[mapping.ownership.provider],
      issuer: owned[mapping.ownership.issuer],
      subject: owned[mapping.ownership.externalSubject]
    })

    const identityKey = yield* oauthIdentityKey(identity)

    if (!(owned[mapping.ownership.identityKey] === identityKey)) return yield* invalidState()
    const ownerId = mapping.ownership.decodeSubjectId(owned)

    if (nativeId !== undefined) {
      if (!mapping.subjectId.equals(ownerId, nativeId)) return yield* invalidState()
    }
    const login = c.decode(first, "c_")

    if (!mapping.subjectId.equals(login[mapping.credential.subjectId], ownerId)) {
      return yield* invalidState()
    }
    if (!(login[mapping.credential.identityKey] === identityKey)) return yield* invalidState()
    if (!mapping.credential.isActiveStatus(login[mapping.credential.status])) {
      return yield* invalidState()
    }

    const current = yield* revision(
      s.decode(first, "s_"),
      rows.map((row) => a.decode(row, "a_")),
      ownerId
    )

    const credentialId = login[mapping.credential.credentialId]
    const credentialRevision = login[mapping.credential.credentialRevision]

    if (
      !current.credentials.some(
        (item) => item.credentialId === credentialId && item.revision === credentialRevision
      )
    ) {
      return undefined
    }

    return yield* Schema.decodeUnknownEffect(Schema.toType(OAuthCredentialSnapshot))({
      moduleId,
      identity,
      credentialId,
      credentialRevision,
      revision: current,
      requirement: yield* decodeOAuthRequirement(mapping.subject, s.decode(first, "s_"))
    })
  })

  const resolve = Effect.fnUntraced(function*(
    moduleId: string,
    identity: typeof OAuthExternalIdentity.Type
  ) {
    const identityKey = yield* oauthIdentityKey(identity)
    let nativeId: unknown

    if (!joinedIds) {
      const found = yield* sql`select ${ownership.fields("o_")} from ${ownership.name}
        where ${
        exact(
          ownership.column(mapping.ownership.identityKey),
          ownership.value(mapping.ownership.identityKey, identityKey)
        )
      }`

      if (found.length === 0) return undefined
      if (!(found.length === 1)) return yield* invalidState()
      const row = ownership.decode(found[0]!, "o_")

      if (
        !(
          row[mapping.ownership.provider] === identity.provider &&
          row[mapping.ownership.issuer] === identity.issuer &&
          row[mapping.ownership.externalSubject] === identity.subject
        )
      ) {
        return yield* invalidState()
      }
      nativeId = mapping.ownership.decodeSubjectId(row)
    }

    const bindOwner = (table: typeof s, key: string) =>
      joinedIds
        ? exact(table.column(key), o.column(mapping.ownership.subjectId))
        : sql`${table.column(key)} = ${table.value(key, nativeId)}`

    const rows = yield* sql`select ${o.fields("o_")}, ${s.fields("s_")}, ${c.fields("c_")}, ${a.fields("a_")}
      from ${o.name}
      join ${active("subject", "oauth_subject")} on ${bindOwner(s, mapping.subject.id)}
      join ${active("credential", "oauth_credential")} on ${bindOwner(c, mapping.credential.subjectId)}
        and ${exact(c.column(mapping.credential.moduleId), c.value(mapping.credential.moduleId, moduleId))}
        and ${exact(c.column(mapping.credential.identityKey), c.value(mapping.credential.identityKey, identityKey))}
      join ${active("authority", "oauth_authority")} on ${bindOwner(a, mapping.authority.subjectId)}
      where ${exact(o.column(mapping.ownership.identityKey), o.value(mapping.ownership.identityKey, identityKey))}
      order by ${a.column(mapping.authority.credentialId)} limit 65`

    const result = yield* decodeSnapshot(rows, moduleId, joinedIds ? undefined : nativeId)

    if (result !== undefined) {
      if (
        !(
          result.identity.provider === identity.provider &&
          result.identity.issuer === identity.issuer &&
          result.identity.subject === identity.subject
        )
      ) {
        return yield* invalidState()
      }
    }

    return result
  })

  const readCredential = Effect.fnUntraced(function*(
    input: typeof OAuthCredentialKey.Type,
    metadataAccess: Fragment = sql`true`
  ) {
    const nativeId = yield* mapping.subjectId.toNative(input.subjectId)
    let identityKey: unknown

    if (!joinedIdentityKeys) {
      const selected = yield* sql`select ${credential.fields("c_")} from ${credential.name}
        where ${
        exact(
          credential.column(mapping.credential.moduleId),
          credential.value(mapping.credential.moduleId, input.moduleId)
        )
      }
          and ${
        exact(
          credential.column(mapping.credential.credentialId),
          credential.value(mapping.credential.credentialId, input.credentialId)
        )
      }
          and ${credential.column(mapping.credential.subjectId)} = ${
        credential.value(mapping.credential.subjectId, nativeId)
      }`

      if (selected.length === 0) return undefined
      if (!(selected.length === 1)) return yield* invalidState()
      identityKey = credential.decode(selected[0]!, "c_")[mapping.credential.identityKey]
    }

    const owner = (table: typeof s, key: string) => sql`${table.column(key)} = ${table.value(key, nativeId)}`

    const rows = yield* sql`select ${o.fields("o_")}, ${s.fields("s_")}, ${c.fields("c_")}, ${a.fields("a_")}
      from ${active("credential", "oauth_credential")}
      join ${o.name} on ${
      joinedIdentityKeys
        ? exact(o.column(mapping.ownership.identityKey), c.column(mapping.credential.identityKey))
        : exact(o.column(mapping.ownership.identityKey), o.value(mapping.ownership.identityKey, identityKey))
    }
        and ${owner(o, mapping.ownership.subjectId)}
      join ${active("subject", "oauth_subject")} on ${owner(s, mapping.subject.id)}
      join ${active("authority", "oauth_authority")} on ${owner(a, mapping.authority.subjectId)}
      where ${metadataAccess} and ${owner(c, mapping.credential.subjectId)}
        and ${exact(c.column(mapping.credential.moduleId), c.value(mapping.credential.moduleId, input.moduleId))}
        and ${
      exact(c.column(mapping.credential.credentialId), c.value(mapping.credential.credentialId, input.credentialId))
    }
      order by ${a.column(mapping.authority.credentialId)} limit 65`

    return yield* decodeSnapshot(rows, input.moduleId, nativeId)
  })

  return { ...state, ownership, credential, resolve, readCredential }
})
