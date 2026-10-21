import { withStorageValidation } from "@effect/auth-persistence/Adapter"
import {
  type ExternalIdentity,
  ExternalIdentityMutation,
  IdentityConflict,
  IdentityUnavailable,
  SubjectProvisioned,
  SubjectProvisioner,
  type SubjectProvisioningInput
} from "@effect/auth/Identity"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import type { SubjectId } from "@effect/auth/Schema"
import type { D1Client } from "@effect/sql-d1/D1Client"
/* oxlint-disable no-explicit-any -- D1 batch bridges Drizzle SQL objects to Effect SQL Statements at this adapter boundary. */
import { and, eq, getTableColumns, type InferInsertModel, is, SQL, sql, type Table } from "drizzle-orm"
import type { EffectSQLiteD1Database } from "drizzle-orm/effect-d1"
import type { AnySQLiteTable, SQLiteColumn } from "drizzle-orm/sqlite-core"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { Database as DatabaseService } from "./d1Database.ts"
import {
  column,
  type D1ExternalIdentityMapping,
  type D1GeneratedIdentityMapping,
  type D1SubjectProvisioningMapping,
  isMappedConstraintConflict,
  provisioningFingerprint
} from "./model.ts"
import { NativeDatabase, nativeDatabase } from "./nativeDatabase.ts"
import { validateDrizzleStorage } from "./storageValidation.ts"

type RuntimeDatabase = EffectSQLiteD1Database<any> & { readonly $client: D1Client }
const unavailable = () => IdentityUnavailable.make()
const isIdentityFailure = Schema.is(Schema.Union([IdentityConflict, IdentityUnavailable]))

const mapUnavailable = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  reportPersistenceFailure(effect, isIdentityFailure, { markReported: true }).pipe(
    Effect.catchCause((cause) =>
      Effect.failCause(
        Cause.map(cause, (error) => (isIdentityFailure(error) ? error : unavailable()))
      )
    )
  )

const selectFields = <T extends Table>(
  table: T,
  values: InferInsertModel<T>
): Record<string, unknown> => {
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>

  const fields = Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        is(value, SQL) ? value : sql`${sql.param(value, columns[key] as SQLiteColumn)}`
      ])
  )

  for (const [key, mapped] of Object.entries(columns)) {
    if (
      fields[key] !== undefined ||
      (
        mapped as SQLiteColumn & { readonly shouldDisableInsert: () => boolean }
      ).shouldDisableInsert()
    ) {
      continue
    }
    if (mapped.default !== null && mapped.default !== undefined) continue

    const value = mapped.defaultFn !== undefined
      ? mapped.defaultFn()
      : !mapped.default && mapped.onUpdateFn !== undefined
      ? mapped.onUpdateFn()
      : undefined

    if (value !== undefined || mapped.defaultFn !== undefined || mapped.onUpdateFn !== undefined) {
      fields[key] = is(value, SQL) ? value : sql`${sql.param(value, mapped)}`
    }
  }

  return fields
}

/**
 * D1 provisioning is an ordered atomic batch. The receipt captures the
 * database-generated subject id from the first insert via last_insert_rowid;
 * the optional identifier then reads that stable id from the receipt.
 *
 * @internal
 */
export const makeD1SubjectProvisioningServices = Effect.fnUntraced(function*<
  Subject extends AnySQLiteTable,
  Identifier extends AnySQLiteTable,
  Request extends AnySQLiteTable,
  NativeId
>(mapping: D1SubjectProvisioningMapping<Subject, Identifier, Request, NativeId>) {
  const database = yield* DatabaseService

  yield* validateDrizzleStorage(mapping).pipe(
    Effect.provideServiceEffect(NativeDatabase, nativeDatabase(DatabaseService)),
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => IdentityUnavailable.make())))
  )

  const db = database as RuntimeDatabase
  const requestTable = mapping.provisioningRequest.table

  const requestIdColumn = column(
    requestTable,
    mapping.provisioningRequest.requestId
  ) as SQLiteColumn

  const requestFingerprintColumn = column(
    requestTable,
    mapping.provisioningRequest.fingerprint
  ) as SQLiteColumn

  const requestSubjectColumn = column(
    requestTable,
    mapping.provisioningRequest.subjectId
  ) as SQLiteColumn

  const findReceipt = Effect.fnUntraced(function*(requestId: string) {
    const rows = yield* db
      .select({ fingerprint: requestFingerprintColumn, subjectId: requestSubjectColumn })
      .from(requestTable as any)
      .where(eq(requestIdColumn, requestId))
      .limit(1)

    return rows[0]
  })

  const provision = Effect.fn("DrizzleD1Identity.provision")(function*(
    input: SubjectProvisioningInput
  ) {
    const fingerprint = provisioningFingerprint(input)
    const existing = yield* findReceipt(input.requestId)

    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint) return yield* IdentityConflict.make()
      const subjectId = yield* mapping.subjectId.toSubject(existing.subjectId as NativeId)

      return SubjectProvisioned.make({ subjectId })
    }

    const allocated = mapping.subject.allocateId === undefined
      ? mapping.subject.allocateIdSync?.()
      : yield* mapping.subject.allocateId

    const subjectQuery = db
      .insert(mapping.subject.table as any)
      .values(mapping.subject.encodeInsert(input, allocated) as any)
      .toSQL()

    const statements = [db.$client.unsafe(subjectQuery.sql, subjectQuery.params)]

    if (allocated !== undefined) {
      const requestQuery = db
        .insert(requestTable as any)
        .values(
          mapping.provisioningRequest.encodeInsert(input.requestId, fingerprint, allocated) as any
        )
        .toSQL()

      statements.push(db.$client.unsafe(requestQuery.sql, requestQuery.params))

      if (input.identifier !== undefined) {
        const identifierQuery = db
          .insert(mapping.identifier.table as any)
          .values(
            mapping.identifier.encodeInsert(input.identifier, allocated, input.verifiedAt) as any
          )
          .toSQL()

        statements.push(db.$client.unsafe(identifierQuery.sql, identifierQuery.params))
      }
    } else {
      if (mapping.d1.generatedRowIdAlias === undefined) return yield* unavailable()

      const mappedColumnNames = Object.values(getTableColumns(mapping.subject.table)).map((value) =>
        value.name.toLowerCase()
      )

      if (mappedColumnNames.includes(mapping.d1.generatedRowIdAlias.toLowerCase())) {
        return yield* unavailable()
      }
      const subjectIdColumn = column(mapping.subject.table, mapping.subject.id)
      const rowId = sql.identifier(mapping.d1.generatedRowIdAlias)

      const requestQuery = db
        .insert(requestTable as any)
        .values({
          ...mapping.d1.requestInsertWithoutSubject(input.requestId, fingerprint),
          [mapping.provisioningRequest.subjectId]:
            sql`(select ${subjectIdColumn} from ${mapping.subject.table} where ${rowId} = last_insert_rowid())`
        } as any)
        .toSQL()

      statements.push(db.$client.unsafe(requestQuery.sql, requestQuery.params))
    }

    if (allocated === undefined && input.identifier !== undefined) {
      const requestIdParam = sql.param(input.requestId, requestIdColumn)

      const identifierQuery = db
        .insert(mapping.identifier.table as any)
        .values({
          ...mapping.d1.identifierInsertWithoutSubject(input.identifier, input.verifiedAt),
          [mapping.identifier.subjectId]:
            sql`(select ${requestSubjectColumn} from ${requestTable} where ${requestIdColumn} = ${requestIdParam})`
        } as any)
        .toSQL()

      statements.push(db.$client.unsafe(identifierQuery.sql, identifierQuery.params))
    }
    const attempt = db.$client.batch(statements)

    yield* attempt.pipe(
      Effect.catchCause(
        (
          cause
        ): Effect.Effect<
          void,
          | Effect.Error<typeof attempt>
          | Effect.Error<ReturnType<typeof findReceipt>>
          | IdentityConflict
        > => {
          if (
            cause.reasons.length === 0 ||
            !cause.reasons.every(
              (reason) =>
                Cause.isFailReason(reason) &&
                isMappedConstraintConflict(mapping.isConstraintConflict, reason.error)
            )
          ) {
            return Effect.failCause(cause)
          }

          return findReceipt(input.requestId).pipe(
            Effect.flatMap((receipt) =>
              receipt !== undefined && receipt.fingerprint === fingerprint
                ? Effect.void
                : IdentityConflict.make()
            )
          )
        }
      )
    )
    const receipt = yield* findReceipt(input.requestId)

    if (receipt === undefined || receipt.fingerprint !== fingerprint) {
      return yield* IdentityConflict.make()
    }
    const subjectId = yield* mapping.subjectId.toSubject(receipt.subjectId as NativeId)

    return SubjectProvisioned.make({ subjectId })
  }, mapUnavailable)

  return { subjectProvisioner: SubjectProvisioner.of({ provision }) } as const
})

/** @internal */
export const makeD1ExternalIdentityServices = Effect.fnUntraced(function*<
  Subject extends AnySQLiteTable,
  External extends AnySQLiteTable,
  NativeId
>(mapping: D1ExternalIdentityMapping<Subject, External, NativeId>) {
  const database = yield* DatabaseService

  yield* validateDrizzleStorage(mapping).pipe(
    Effect.provideServiceEffect(NativeDatabase, nativeDatabase(DatabaseService)),
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => IdentityUnavailable.make())))
  )

  const db = database as RuntimeDatabase
  const externalTable = mapping.externalIdentity.table

  const externalSubjectIdColumn = column(
    externalTable,
    mapping.externalIdentity.subjectId
  ) as SQLiteColumn

  const externalProviderColumn = column(
    externalTable,
    mapping.externalIdentity.provider
  ) as SQLiteColumn

  const externalIssuerColumn = column(
    externalTable,
    mapping.externalIdentity.issuer
  ) as SQLiteColumn

  const externalSubjectColumn = column(
    externalTable,
    mapping.externalIdentity.subject
  ) as SQLiteColumn

  const bind = Effect.fn("DrizzleD1Identity.bindExternalIdentity")(function*(
    subjectId: SubjectId,
    identity: ExternalIdentity
  ) {
    const nativeId = yield* mapping.subjectId.toNative(subjectId)
    const subjectIdColumn = column(mapping.subject.table, mapping.subject.id)
    const subjectStatusColumn = column(mapping.subject.table, mapping.subject.status)
    const nativeIdParam = sql.param(nativeId, subjectIdColumn)
    const activeStatusParam = sql.param(mapping.d1.activeStatusValue, subjectStatusColumn)

    const selection = selectFields(
      externalTable,
      mapping.externalIdentity.encodeInsert(identity, nativeId)
    )

    selection[mapping.externalIdentity.subjectId] = subjectIdColumn

    const inserted = yield* db
      .insert(externalTable as any)
      .select(
        db
          .select(selection as any)
          .from(mapping.subject.table as any)
          .where(
            and(eq(subjectIdColumn, nativeIdParam), eq(subjectStatusColumn, activeStatusParam))
          ) as any
      )
      .returning({ subjectId: externalSubjectIdColumn })
      .pipe(
        Effect.catchCause((cause) => {
          if (
            cause.reasons.length === 0 ||
            !cause.reasons.every(
              (reason) =>
                Cause.isFailReason(reason) &&
                isMappedConstraintConflict(mapping.isConstraintConflict, reason.error)
            )
          ) {
            return Effect.failCause(cause)
          }

          return db
            .select({ subjectId: externalSubjectIdColumn })
            .from(externalTable as any)
            .innerJoin(
              mapping.subject.table as any,
              and(
                eq(externalSubjectIdColumn, subjectIdColumn),
                eq(subjectStatusColumn, mapping.d1.activeStatusValue)
              )
            )
            .where(
              and(
                eq(externalProviderColumn, identity.provider),
                eq(externalIssuerColumn, identity.issuer),
                eq(externalSubjectColumn, identity.subject),
                eq(externalSubjectIdColumn, nativeId)
              )
            )
            .limit(1)
        })
      )

    const row = inserted[0]

    if (row === undefined) return yield* IdentityConflict.make()
    const linked = row.subjectId as NativeId

    if (!mapping.subjectId.equals(linked, nativeId)) return yield* IdentityConflict.make()
  }, mapUnavailable)

  return { externalIdentityMutation: ExternalIdentityMutation.of({ bind }) } as const
})

/** @internal */
export const makeD1IdentityServices = Effect.fnUntraced(function*<
  Subject extends AnySQLiteTable,
  Identifier extends AnySQLiteTable,
  External extends AnySQLiteTable,
  Request extends AnySQLiteTable,
  NativeId
>(mapping: D1GeneratedIdentityMapping<Subject, Identifier, External, Request, NativeId>) {
  return {
    ...(yield* makeD1SubjectProvisioningServices(mapping)),
    ...(yield* makeD1ExternalIdentityServices(mapping))
  }
}, withStorageValidation)
