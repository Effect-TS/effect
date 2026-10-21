import { EmailCredentialSnapshot, EmailUnavailable } from "@effect/auth/Email"
import { LoginIdentifier } from "@effect/auth/Identity"
import type { SubjectId } from "@effect/auth/Schema"
import { AuthenticationRevision } from "@effect/auth/Sessions"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import type { AnyEmailSignInMapping } from "./models/emailModel.ts"
import type { NativeSqlTables, SqlTable } from "./nativeSqlTable.ts"
import { exactSqlText } from "./sqlChange.ts"

/** @internal */
export const emailUnavailable = () => EmailUnavailable.make({})

/** @internal */
export const invalidEmailState = () => emailUnavailable()

/**
 * Every role binds the decoded native subject through its own physical column codec.
 *
 * @internal
 */
export const makeNativeEmailReader = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: AnyEmailSignInMapping,
  engineNow?: Fragment
) {
  const sql = (yield* SqlClient).withoutTransforms()

  const s = mapping.subject,
    i = mapping.identifier,
    c = mapping.credential,
    a = mapping.authorityCredential

  const subject = tables(s.table).as("email_subject"),
    targetIdentifier = tables(i.table).as("email_target_identifier"),
    sourceIdentifier = tables(i.table).as("email_source_identifier"),
    targetCredential = tables(c.table).as("email_target_credential"),
    sourceCredential = tables(c.table).as("email_source_credential"),
    authority = tables(a.table).as("email_authority"),
    sourceAuthority = tables(a.table).as("email_source_authority"),
    cardinality = tables(c.table).as("email_cardinality")

  const exact = (t: SqlTable, key: string, value: unknown) => exactSqlText(sql, t.column(key), t.value(key, value))

  const id = (t: SqlTable, key: string, value: unknown) => sql`${t.column(key)} = ${t.value(key, value)}`

  const identifierKey = (t: SqlTable, value: LoginIdentifier) =>
    sql.and([exact(t, i.namespace, value.namespace), exact(t, i.value, value.value)])

  const credentialKey = (t: SqlTable, moduleId: string, value: LoginIdentifier) =>
    sql.and([
      exact(t, c.moduleId, moduleId),
      exact(t, c.identifierNamespace, value.namespace),
      exact(t, c.identifierValue, value.value)
    ])

  const selected = (t: SqlTable, row: Record<string, unknown>, prefix: string, key: string) => {
    const decoded = t.decode(row, prefix)

    return decoded[key] === null || decoded[key] === undefined ? undefined : decoded
  }

  const owned = Effect.fnUntraced(function*(
    row: Record<string, unknown> | undefined,
    key: string,
    subjectId: SubjectId
  ) {
    return row !== undefined && (yield* mapping.subjectId.toSubject(row[key])) === subjectId
  })

  const read = Effect.fnUntraced(function*(input: {
    readonly moduleId: string
    readonly subjectId: SubjectId
    readonly identifier: LoginIdentifier
    readonly sourceCredentialId?: string
    readonly sourceIdentifier?: LoginIdentifier
    readonly single?: boolean
    readonly validity?: Fragment
  }) {
    const native = yield* mapping.subjectId.toNative(input.subjectId)
    let source = input.sourceIdentifier

    if (input.sourceCredentialId !== undefined && source === undefined) {
      const table = tables(c.table)

      const rows = yield* sql`select ${table.fields("email_source_lookup_")} from ${table.name} where ${
        exact(table, c.moduleId, input.moduleId)
      } and ${exact(table, c.credentialId, input.sourceCredentialId)} and ${id(table, c.subjectId, native)} limit 2`

      if (rows.length !== 1) return undefined
      const row = table.decode(rows[0]!, "email_source_lookup_")

      if (!(row[c.credentialId] === input.sourceCredentialId)) return yield* invalidEmailState()
      source = yield* Schema.decodeUnknownEffect(LoginIdentifier)({
        namespace: row[c.identifierNamespace],
        value: row[c.identifierValue]
      })
    }

    const rows = yield* sql`select ${subject.fields("email_subject_")}, ${
      targetIdentifier.fields("email_target_identifier_")
    }, ${sourceIdentifier.fields("email_source_identifier_")}, ${
      targetCredential.fields("email_target_credential_")
    }, ${sourceCredential.fields("email_source_credential_")}, ${authority.fields("email_authority_")}, ${
      sourceAuthority.fields("email_source_authority_")
    }, ${engineNow ?? sql`0`} as engine_now, case when ${
      input.single === true && input.sourceCredentialId === undefined
        ? sql`exists(select 1 from ${cardinality.name} where ${id(cardinality, c.subjectId, native)} and ${
          exact(cardinality, c.moduleId, input.moduleId)
        } and ${id(cardinality, c.status, c.activeStatusValue)})`
        : sql`1 = 0`
    } then 1 else 0 end as cardinality_conflict
      from ${subject.name}
      left join ${targetIdentifier.name} on ${identifierKey(targetIdentifier, input.identifier)}
      left join ${sourceIdentifier.name} on ${
      source === undefined ? sql`1 = 0` : identifierKey(sourceIdentifier, source)
    }
      left join ${targetCredential.name} on ${credentialKey(targetCredential, input.moduleId, input.identifier)}
      left join ${sourceCredential.name} on ${
      input.sourceCredentialId === undefined
        ? sql`1 = 0`
        : sql.and([
          exact(sourceCredential, c.moduleId, input.moduleId),
          exact(sourceCredential, c.credentialId, input.sourceCredentialId)
        ])
    }
      left join ${sourceAuthority.name} on ${
      input.sourceCredentialId === undefined
        ? sql`1 = 0`
        : sql.and([
          id(sourceAuthority, a.subjectId, native),
          exact(sourceAuthority, a.credentialId, input.sourceCredentialId)
        ])
    }
      left join ${authority.name} on ${id(authority, a.subjectId, native)} and ${
      id(authority, a.status, a.activeStatusValue)
    }
      where ${id(subject, s.id, native)} and ${input.validity ?? sql`1 = 1`} limit 65`

    if (!(rows.length <= 64)) return yield* invalidEmailState()
    const first = rows[0]

    if (first === undefined) return undefined
    const subjectRow = subject.decode(first, "email_subject_")

    if (!((yield* mapping.subjectId.toSubject(subjectRow[s.id])) === input.subjectId)) {
      return yield* invalidEmailState()
    }
    if (!s.isActiveStatus(subjectRow[s.status])) return undefined
    const factors: Array<{ readonly credentialId: unknown; readonly revision: unknown }> = []

    for (const row of rows) {
      const factor = selected(authority, row, "email_authority_", a.credentialId)

      if (factor === undefined) continue
      if (
        !(
          (yield* owned(factor, a.subjectId, input.subjectId)) && a.isActiveStatus(factor[a.status])
        )
      ) {
        return yield* invalidEmailState()
      }
      if (factors.some((f) => f.credentialId === factor[a.credentialId])) {
        return yield* invalidEmailState()
      }
      factors.push({ credentialId: factor[a.credentialId], revision: factor[a.revision] })
    }

    const revision = yield* Schema.decodeUnknownEffect(AuthenticationRevision)({
      subjectId: input.subjectId,
      securityRevision: subjectRow[s.securityRevision],
      credentials: factors.sort((a, b) => String(a.credentialId).localeCompare(String(b.credentialId)))
    })

    const targetRow = selected(targetIdentifier, first, "email_target_identifier_", i.namespace),
      sourceRow = selected(sourceIdentifier, first, "email_source_identifier_", i.namespace),
      targetFactor = selected(targetCredential, first, "email_target_credential_", c.credentialId),
      sourceFactor = selected(sourceCredential, first, "email_source_credential_", c.credentialId)

    const snapshot = Effect.fnUntraced(function*(
      identifierRow: Record<string, unknown> | undefined,
      credentialRow: Record<string, unknown> | undefined,
      value: LoginIdentifier | undefined
    ) {
      if (
        identifierRow === undefined ||
        credentialRow === undefined ||
        value === undefined ||
        !i.isCurrent(identifierRow) ||
        identifierRow[i.verifiedAt] === null ||
        identifierRow[i.verifiedAt] === undefined ||
        !c.isActiveStatus(credentialRow[c.status]) ||
        !(yield* owned(identifierRow, i.subjectId, input.subjectId)) ||
        !(yield* owned(credentialRow, c.subjectId, input.subjectId))
      ) {
        return undefined
      }
      if (
        !(
          identifierRow[i.namespace] === value.namespace &&
          identifierRow[i.value] === value.value &&
          credentialRow[c.moduleId] === input.moduleId &&
          credentialRow[c.identifierNamespace] === value.namespace &&
          credentialRow[c.identifierValue] === value.value
        )
      ) {
        return yield* invalidEmailState()
      }
      if (
        !revision.credentials.some(
          (f) =>
            f.credentialId === credentialRow[c.credentialId] &&
            f.revision === credentialRow[c.credentialRevision]
        )
      ) {
        return undefined
      }

      const decoded = yield* c.decode({
        moduleId: input.moduleId,
        subject: subjectRow,
        identifier: identifierRow,
        credential: credentialRow
      })

      return yield* Schema.decodeEffect(EmailCredentialSnapshot)({
        ...decoded,
        revision,
        requirement: yield* s.decodeRequirement(subjectRow)
      })
    })

    if (
      !(
        targetRow === undefined ||
        (targetRow[i.namespace] === input.identifier.namespace &&
          targetRow[i.value] === input.identifier.value)
      )
    ) {
      return yield* invalidEmailState()
    }
    if (
      !(
        targetFactor === undefined ||
        (targetFactor[c.moduleId] === input.moduleId &&
          targetFactor[c.identifierNamespace] === input.identifier.namespace &&
          targetFactor[c.identifierValue] === input.identifier.value)
      )
    ) {
      return yield* invalidEmailState()
    }
    const now = Number(first.engine_now)

    if (!Number.isSafeInteger(now)) return yield* invalidEmailState()

    return {
      native,
      subject: subjectRow,
      revision,
      targetIdentifier: targetRow,
      sourceIdentifier: sourceRow,
      targetCredential: targetFactor,
      sourceCredential: sourceFactor,
      sourceAuthority: selected(sourceAuthority, first, "email_source_authority_", a.credentialId),
      targetSnapshot: yield* snapshot(targetRow, targetFactor, input.identifier),
      sourceSnapshot: yield* snapshot(sourceRow, sourceFactor, source),
      cardinalityConflict: Number(first.cardinality_conflict) === 1,
      now
    }
  })

  const lookup = Effect.fnUntraced(function*(input: {
    readonly moduleId: string
    readonly identifier: LoginIdentifier
  }) {
    const table = tables(i.table)

    const rows = yield* sql`select ${table.fields("email_lookup_")} from ${table.name} where ${
      identifierKey(table, input.identifier)
    } limit 2`

    if (rows.length === 0) return Option.none()
    if (!(rows.length === 1)) return yield* invalidEmailState()
    const row = table.decode(rows[0]!, "email_lookup_")

    if (
      !(row[i.namespace] === input.identifier.namespace && row[i.value] === input.identifier.value)
    ) {
      return yield* invalidEmailState()
    }
    if (!i.isCurrent(row) || row[i.verifiedAt] === null || row[i.verifiedAt] === undefined) {
      return Option.none()
    }
    const subjectId = yield* mapping.subjectId.toSubject(row[i.subjectId])
    const result = yield* read({ ...input, subjectId })

    return Option.fromUndefinedOr(result?.targetSnapshot)
  })

  return { read, lookup }
})
