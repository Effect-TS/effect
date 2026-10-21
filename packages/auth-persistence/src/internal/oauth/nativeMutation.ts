import type { OAuthAccountRevision, OAuthExternalIdentity } from "@effect/auth/OAuth"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import { SqlError } from "effect/sql/SqlError"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "../d1Planning.ts"
import { PersistenceMappingError } from "../mappingError.ts"
import type { OAuthOwnershipTable } from "../models/oauthModel.ts"
import type { NativeSqlTables } from "../nativeSqlTable.ts"
import { exactSqlText, executeSqlChange } from "../sqlChange.ts"
import { appendSqlBatchStatement, registerSqlBatchPostcondition, registerSqlPostcondition } from "../sqlCommit.ts"
import type { TableModel } from "../tableModel.ts"
import { makeOAuthNativeAuthority, type OAuthNativeReadMapping } from "./nativeState.ts"
import { invalidState, oauthIdentityKey } from "./state.ts"

/** @internal */
export type OAuthNativeMutationMapping =
  & Pick<
    OAuthNativeReadMapping,
    "subject" | "authority" | "subjectId" | "clock"
  >
  & {
    readonly ownership: OAuthOwnershipTable<TableModel, unknown>
  }

/**
 * Shared semantic predicates for native transactions and fixed D1 statements.
 *
 * @internal
 */
export const makeOAuthNativeMutation = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: OAuthNativeMutationMapping,
  batch: boolean
) {
  const authority = yield* makeOAuthNativeAuthority(tables, mapping)
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const ownership = tables(mapping.ownership.table)
  const o = mapping.ownership
  const s = mapping.subject
  const a = mapping.authority

  const exact = (key: string, value: unknown) => exactSqlText(sql, ownership.column(key), ownership.value(key, value))

  const assert = Effect.fnUntraced(function*(condition: Fragment) {
    if (batch) yield* appendSqlBatchStatement(sqlBatchAssertion(sql, condition))
    else {
      const rows = yield* sql`select 1 where ${condition}`

      if (!(rows.length === 1)) return yield* invalidState()
    }
  })

  const change = Effect.fnUntraced(function*(statement: Fragment, expected = 1) {
    if (batch) {
      yield* appendSqlBatchStatement(sql`${statement}`)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = ${expected}`))

      return expected
    }

    return yield* executeSqlChange(sql, statement)
  })

  const finish = (name: string, condition: Fragment) =>
    batch
      ? registerSqlBatchPostcondition({ name, statement: sqlBatchAssertion(sql, condition) })
      : registerSqlPostcondition({
        name,
        check: Effect.gen(function*() {
          const rows = yield* sql`select 1 where ${condition}`

          if (!(rows.length === 1)) {
            return yield* PersistenceMappingError.make({
              operation: "postcondition",
              cause: invalidState()
            })
          }
        })
      })

  const subjectCondition = (
    nativeId: unknown,
    revision: Pick<OAuthAccountRevision, "securityRevision">
  ) => {
    const subject = authority.subject

    return sql.and([
      sql`${subject.column(s.id)} = ${subject.value(s.id, nativeId)}`,
      exactSqlText(
        sql,
        subject.column(s.securityRevision),
        subject.value(s.securityRevision, revision.securityRevision)
      ),
      tables.expression(s.activeCondition)
    ])
  }

  const factorCondition = (nativeId: unknown, revision: OAuthAccountRevision) => {
    const factors = authority.authority
    const factorOwner = sql`${factors.column(a.subjectId)} = ${factors.value(a.subjectId, nativeId)}`
    const active = tables.expression(a.activeCondition)

    return sql.and([
      sql`(select count(*) from ${factors.name} where ${factorOwner} and ${active}) = ${revision.credentials.length}`,
      ...revision.credentials.map(
        (item) =>
          sql`exists(select 1 from ${factors.name} where ${factorOwner} and ${active}
        and ${exactSqlText(sql, factors.column(a.credentialId), factors.value(a.credentialId, item.credentialId))}
        and ${exactSqlText(sql, factors.column(a.revision), factors.value(a.revision, item.revision))})`
      )
    ])
  }

  const authorityCondition = (nativeId: unknown, revision: OAuthAccountRevision) =>
    sql.and([
      sql`exists(select 1 from ${authority.subject.name} where ${subjectCondition(nativeId, revision)})`,
      factorCondition(nativeId, revision)
    ])

  const ownerCondition = (identityKey: string, nativeId: unknown) =>
    sql.and([
      exact(o.identityKey, identityKey),
      sql`${ownership.column(o.subjectId)} = ${ownership.value(o.subjectId, nativeId)}`
    ])

  const insertUnique = (statement: Fragment) =>
    change(statement).pipe(
      Effect.catchCause((cause) =>
        cause.reasons.length > 0 &&
          cause.reasons.every(
            (reason) =>
              Cause.isFailReason(reason) &&
              Schema.is(SqlError)(reason.error) &&
              reason.error.reason._tag === "UniqueViolation"
          )
          ? Effect.succeed(0)
          : Effect.failCause(cause)
      )
    )

  const ensureOwnership = Effect.fnUntraced(function*(
    identity: typeof OAuthExternalIdentity.Type,
    nativeId: unknown
  ) {
    const identityKey = yield* oauthIdentityKey(identity)

    // An existing-owner mapping may deliberately reject creation in encodeInsert.
    // Inspect ownership after the caller's subject lock before invoking that policy.
    const rows = yield* sql`select ${ownership.fields("identity_")} from ${ownership.name} where ${
      exact(o.identityKey, identityKey)
    }`

    if (!(rows.length <= 1)) return yield* invalidState()
    const row = rows[0] === undefined ? undefined : ownership.decode(rows[0], "identity_")

    if (row !== undefined) {
      if (
        !(
          row[o.provider] === identity.provider &&
          row[o.issuer] === identity.issuer &&
          row[o.externalSubject] === identity.subject
        )
      ) {
        return yield* invalidState()
      }
      if (!mapping.subjectId.equals(o.decodeSubjectId(row), nativeId)) return undefined
      if (batch) {
        yield* assert(
          sql`exists(select 1 from ${ownership.name} where ${ownerCondition(identityKey, nativeId)})`
        )
      }

      return identityKey
    }

    const statement = sql`${
      ownership.insert({
        ...o.encodeInsert({ identity, identityKey, subjectId: nativeId }),
        [o.identityKey]: identityKey,
        [o.provider]: identity.provider,
        [o.issuer]: identity.issuer,
        [o.externalSubject]: identity.subject,
        [o.subjectId]: nativeId
      })
    } ${sql.onDialectOrElse({ mysql: () => sql``, orElse: () => sql`on conflict do nothing` })}`

    if (batch) {
      yield* change(statement)

      return identityKey
    }

    const inserted = yield* insertUnique(statement)

    if (inserted === 1) return identityKey

    const raced = yield* sql`select ${ownership.fields("identity_")} from ${ownership.name} where ${
      exact(o.identityKey, identityKey)
    }`

    if (!(raced.length === 1)) return yield* invalidState()
    const committed = ownership.decode(raced[0]!, "identity_")

    if (
      !(
        committed[o.provider] === identity.provider &&
        committed[o.issuer] === identity.issuer &&
        committed[o.externalSubject] === identity.subject
      )
    ) {
      return yield* invalidState()
    }

    return mapping.subjectId.equals(o.decodeSubjectId(committed), nativeId)
      ? identityKey
      : undefined
  })

  const execute = (statement: Fragment) =>
    batch
      ? appendSqlBatchStatement(sql`${statement}`)
      : executeSqlChange(sql, statement).pipe(Effect.asVoid)

  const releaseOwnership = (identityKey: string, nativeId: unknown, referenced: Fragment) =>
    execute(
      sql`delete from ${ownership.name} where ${ownerCondition(identityKey, nativeId)} and not (${referenced})`
    )

  return {
    ...authority,
    sql,
    ownership,
    assert,
    change,
    finish,
    authorityCondition,
    subjectCondition,
    factorCondition,
    ownerCondition,
    ensureOwnership,
    insertUnique,
    releaseOwnership,
    execute
  }
})
