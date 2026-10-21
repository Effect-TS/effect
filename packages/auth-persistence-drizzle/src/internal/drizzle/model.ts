import {
  type ExternalIdentity,
  ExternalIdentityMutation,
  type LoginIdentifier,
  SubjectProvisioner,
  type SubjectProvisioningInput
} from "@effect/auth/Identity"
import { type AnyColumn, getTableColumns, type InferInsertModel, type Table } from "drizzle-orm"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

export { isMappedConstraintConflict, PersistenceMappingError } from "@effect/auth-persistence/Adapter"

import type { PersistenceMappingError, SubjectIdCodec } from "@effect/auth-persistence/Adapter"

/** @internal */
export class SubjectProvisioningError extends Schema.TaggedError<SubjectProvisioningError>()(
  "SubjectProvisioningError",
  { message: Schema.String }
) {}

export interface InstantCodec<NativeInstant> {
  readonly encode: (instant: DateTime.Utc) => NativeInstant
  readonly decode: (native: NativeInstant) => Effect.Effect<DateTime.Utc, PersistenceMappingError>
}

type ColumnKey<T extends Table> = Extract<keyof T["_"]["columns"], string>

export interface RequiredIdentityConstraints {
  readonly identifier: "unique(namespace,value)"
  readonly externalIdentity: "unique(provider,issuer,subject)"
  readonly provisioningRequest: "unique(requestId)"
  readonly provisioningSubject: "notNull(provisioningRequest.subjectId)"
}

export interface RequiredSubjectProvisioningConstraints {
  readonly identifier: "unique(namespace,value)"
  readonly provisioningRequest: "unique(requestId)"
  readonly provisioningSubject: "notNull(provisioningRequest.subjectId)"
}

export interface RequiredExternalIdentityConstraints {
  readonly externalIdentity: "unique(provider,issuer,subject)"
}

export const requiredIdentityConstraints: RequiredIdentityConstraints = {
  identifier: "unique(namespace,value)",
  externalIdentity: "unique(provider,issuer,subject)",
  provisioningRequest: "unique(requestId)",
  provisioningSubject: "notNull(provisioningRequest.subjectId)"
}

export const requiredSubjectProvisioningConstraints: RequiredSubjectProvisioningConstraints = {
  identifier: "unique(namespace,value)",
  provisioningRequest: "unique(requestId)",
  provisioningSubject: "notNull(provisioningRequest.subjectId)"
}

export const requiredExternalIdentityConstraints: RequiredExternalIdentityConstraints = {
  externalIdentity: "unique(provider,issuer,subject)"
}

export type { SubjectIdCodec } from "@effect/auth-persistence/Adapter"

export interface SubjectProvisioningTables<
  Subject extends Table,
  Identifier extends Table,
  Request extends Table,
  NativeId
> {
  readonly constraints: RequiredSubjectProvisioningConstraints
  readonly subject: {
    readonly table: Subject
    readonly id: ColumnKey<Subject>
    readonly status: ColumnKey<Subject>
    readonly isActiveStatus: (value: unknown) => boolean
    readonly encodeInsert: (
      input: SubjectProvisioningInput,
      allocatedId: NativeId | undefined
    ) => InferInsertModel<Subject>
    readonly allocateId?: Effect.Effect<NativeId, PersistenceMappingError>
    /** Required instead of allocateId when a synchronous-only DO transaction preallocates IDs. */
    readonly allocateIdSync?: () => NativeId
    /** Decodes MySQL `$returningId()` for an autoincrement/runtime-default key. */
    readonly decodeGeneratedId?: (
      rows: ReadonlyArray<unknown>
    ) => Effect.Effect<NativeId, PersistenceMappingError>
  }
  readonly identifier: {
    readonly table: Identifier
    readonly namespace: ColumnKey<Identifier>
    readonly value: ColumnKey<Identifier>
    readonly subjectId: ColumnKey<Identifier>
    readonly encodeInsert: (
      identifier: LoginIdentifier,
      subjectId: NativeId,
      verifiedAt: DateTime.Utc | undefined
    ) => InferInsertModel<Identifier>
  }
  readonly provisioningRequest: {
    readonly table: Request
    readonly requestId: ColumnKey<Request>
    readonly fingerprint: ColumnKey<Request>
    readonly subjectId: ColumnKey<Request>
    readonly encodeInsert: (
      requestId: string,
      fingerprint: string,
      subjectId: NativeId
    ) => InferInsertModel<Request>
  }
  readonly subjectId: SubjectIdCodec<NativeId>
  /** Narrows only database constraint failures; every other cause is unavailable. */
  readonly isConstraintConflict: (cause: unknown) => boolean
}

export interface ExternalIdentityTables<Subject extends Table, External extends Table, NativeId> {
  readonly constraints: RequiredExternalIdentityConstraints
  readonly subject: {
    readonly table: Subject
    readonly id: ColumnKey<Subject>
    readonly status: ColumnKey<Subject>
    readonly isActiveStatus: (value: unknown) => boolean
  }
  readonly externalIdentity: {
    readonly table: External
    readonly provider: ColumnKey<External>
    readonly issuer: ColumnKey<External>
    readonly subject: ColumnKey<External>
    readonly subjectId: ColumnKey<External>
    readonly encodeInsert: (
      identity: ExternalIdentity,
      subjectId: NativeId
    ) => InferInsertModel<External>
  }
  readonly subjectId: SubjectIdCodec<NativeId>
  readonly isConstraintConflict: (cause: unknown) => boolean
}

export interface IdentityTables<
  Subject extends Table,
  Identifier extends Table,
  External extends Table,
  Request extends Table,
  NativeId
> {
  readonly constraints: RequiredIdentityConstraints
  readonly subject: SubjectProvisioningTables<Subject, Identifier, Request, NativeId>["subject"]
  readonly identifier: SubjectProvisioningTables<
    Subject,
    Identifier,
    Request,
    NativeId
  >["identifier"]
  readonly externalIdentity: ExternalIdentityTables<
    Subject,
    External,
    NativeId
  >["externalIdentity"]
  readonly provisioningRequest: SubjectProvisioningTables<
    Subject,
    Identifier,
    Request,
    NativeId
  >["provisioningRequest"]
  readonly subjectId: SubjectIdCodec<NativeId>
  readonly isConstraintConflict: (cause: unknown) => boolean
}

/** Extra encoders used by D1's ordered batch when the subject id is database-generated. */
export interface D1SubjectProvisioningMapping<
  Subject extends Table,
  Identifier extends Table,
  Request extends Table,
  NativeId
> extends SubjectProvisioningTables<Subject, Identifier, Request, NativeId> {
  readonly d1: {
    readonly requestInsertWithoutSubject: (
      requestId: string,
      fingerprint: string
    ) => Partial<InferInsertModel<Request>>
    readonly identifierInsertWithoutSubject: (
      identifier: LoginIdentifier,
      verifiedAt: DateTime.Utc | undefined
    ) => Partial<InferInsertModel<Identifier>>
    /** Unshadowed hidden-rowid alias; omit for WITHOUT ROWID or preallocated IDs. */
    readonly generatedRowIdAlias?: "rowid" | "_rowid_" | "oid"
  }
}

export interface D1ExternalIdentityMapping<
  Subject extends Table,
  External extends Table,
  NativeId
> extends ExternalIdentityTables<Subject, External, NativeId> {
  readonly d1: {
    readonly activeStatusValue: unknown
  }
}

export interface D1GeneratedIdentityMapping<
  Subject extends Table,
  Identifier extends Table,
  External extends Table,
  Request extends Table,
  NativeId
> extends IdentityTables<Subject, Identifier, External, Request, NativeId> {
  readonly d1:
    & D1SubjectProvisioningMapping<Subject, Identifier, Request, NativeId>["d1"]
    & D1ExternalIdentityMapping<Subject, External, NativeId>["d1"]
}

/** @internal */
export const provisioningFingerprint = (input: SubjectProvisioningInput): string =>
  // oxlint-disable-next-line no-restricted-properties -- stable internal provisioning fingerprint, never external JSON.
  JSON.stringify(
    input.identifier === undefined
      ? ["v1", null]
      : [
        "v1",
        input.identifier.namespace,
        input.identifier.value,
        input.verifiedAt === undefined ? null : DateTime.toEpochMillis(input.verifiedAt)
      ]
  )

/**
 * Drizzle wraps Effect SQL failures before adapters observe them. Give the
 * consumer classifier each semantic wrapper in the short `cause`/`reason`
 * chain without exposing query text or bound parameters through public errors.
 *
 * @internal
 */

export const column = <T extends Table>(table: T, key: ColumnKey<T>): AnyColumn =>
  getTableColumns(table)[key] as AnyColumn

/** Acquire an application database in Effect and expose the identity services as one layer. */
export const identityServicesLayer = <E, R>(
  acquire: Effect.Effect<
    {
      readonly subjectProvisioner: SubjectProvisioner["Service"]
      readonly externalIdentityMutation: ExternalIdentityMutation["Service"]
    },
    E,
    R
  >
) =>
  Layer.effectContext(
    Effect.map(acquire, ({ subjectProvisioner, externalIdentityMutation }) =>
      Context.make(SubjectProvisioner, subjectProvisioner).pipe(
        Context.add(ExternalIdentityMutation, externalIdentityMutation)
      ))
  )
