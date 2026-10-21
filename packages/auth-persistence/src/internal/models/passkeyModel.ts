import {
  type PasskeyCeremony,
  type PasskeyCredential,
  PasskeyCredentials,
  PasskeyPersistence
} from "@effect/auth/Passkey"
import type { SubjectId } from "@effect/auth/Schema"
import type { AuthenticationRequirement } from "@effect/auth/Sessions"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { PersistenceMappingError } from "./common.ts"

export type PasskeyColumn<T extends Table> = T["column"]

export type PasskeyMappingSource<M, RSetup = never> =
  | M
  | Effect.Effect<M, PersistenceMappingError, RSetup>

export interface PasskeyCredentialServices {
  readonly passkeyCredentials: PasskeyCredentials["Service"]
}

export interface PasskeyPersistenceServices {
  readonly passkeyPersistence: PasskeyPersistence["Service"]
}

export const passkeyCredentialsLayer = <E, R>(
  services: Effect.Effect<PasskeyCredentialServices, E, R>
): Layer.Layer<PasskeyCredentials, E, R> =>
  Layer.effect(
    PasskeyCredentials,
    Effect.map(services, (value) => value.passkeyCredentials)
  )

export const passkeyPersistenceLayer = <E, R>(
  services: Effect.Effect<PasskeyPersistenceServices, E, R>
): Layer.Layer<PasskeyPersistence, E, R> =>
  Layer.effect(
    PasskeyPersistence,
    Effect.map(services, (value) => value.passkeyPersistence)
  )

/** Native IDs roundtrip exactly; protocol IDs and authentication references are
 * different identities. These callbacks never suspend inside an owner. */
export interface PasskeySubjectIdCodec<N> {
  readonly toNative: (id: SubjectId) => N
  readonly toSubject: (id: N) => SubjectId
  readonly equals: (left: N, right: N) => boolean
}

export interface PasskeyClock<Expression extends SqlExpression = SqlExpression> {
  readonly encodeInstant: (millis: number) => unknown
  readonly decodeInstant: (value: unknown) => number
  readonly engineNowMillis: Expression
  readonly toMillis: (expression: Expression) => Expression
  readonly fromMillis: (expression: Expression) => Expression
}

export interface PasskeySubjectReadTable<
  T extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: T["table"]
  readonly id: PasskeyColumn<T>
  readonly status: PasskeyColumn<T>
  readonly securityRevision: PasskeyColumn<T>
  readonly decodeRequirement: (
    row: T["select"]
  ) => Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
  readonly decodeId: (row: Readonly<Partial<T["select"]>>) => N
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeCondition: Expression
}

export interface PasskeyFactorReadTable<
  T extends Table,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: T["table"]
  readonly subjectId: PasskeyColumn<T>
  readonly credentialId: PasskeyColumn<T>
  readonly revision: PasskeyColumn<T>
  readonly status: PasskeyColumn<T>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeCondition: Expression
}

/** decode uses only these declared columns. Counter columns are native integral
 * numbers; BS may use a consumer enum. Name/creation metadata is not required. */
export interface PasskeyCredentialReadTable<
  T extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: T["table"]
  readonly credentialId: PasskeyColumn<T>
  readonly subjectId: PasskeyColumn<T>
  readonly rpId: PasskeyColumn<T>
  readonly protocolCredentialId: PasskeyColumn<T>
  readonly credentialKey: PasskeyColumn<T>
  readonly userHandle: PasskeyColumn<T>
  readonly publicKey: PasskeyColumn<T>
  readonly algorithm: PasskeyColumn<T>
  readonly profile: PasskeyColumn<T>
  readonly credentialRevision: PasskeyColumn<T>
  readonly status: PasskeyColumn<T>
  readonly primarySignIn: PasskeyColumn<T>
  readonly enrollmentUserVerified: PasskeyColumn<T>
  readonly backupEligible: PasskeyColumn<T>
  readonly backupState: PasskeyColumn<T>
  readonly counter: PasskeyColumn<T>
  readonly decode: (
    row: Readonly<Partial<T["select"]>>
  ) => Omit<PasskeyCredential, "revision" | "active" | "requirement">
  readonly decodeSubjectId: (row: Readonly<Partial<T["select"]>>) => N
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeCondition: Expression
}

export const requiredPasskeyCredentialConstraints = {
  credentialId: ["credentialId"],
  credentialKey: ["credentialKey"],
  factor: ["subjectId", "credentialId"]
} as const

export interface PasskeyCredentialMapping<
  S extends Table,
  C extends Table,
  F extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly subject: PasskeySubjectReadTable<S, N, Expression>
  readonly credential: PasskeyCredentialReadTable<C, N, Expression>
  readonly authority: PasskeyFactorReadTable<F, Expression>
  readonly subjectIds: PasskeySubjectIdCodec<N>
  readonly constraints: typeof requiredPasskeyCredentialConstraints
}

export interface PasskeyFlowInsert {
  readonly ceremony: PasskeyCeremony
}

/** An immutable, single-use challenge. Consuming or expiring it deletes the row. */
export interface PasskeyFlowTable<T extends Table> {
  readonly table: T["table"]
  readonly moduleId: PasskeyColumn<T>
  readonly flowId: PasskeyColumn<T>
  readonly purpose: PasskeyColumn<T>
  readonly snapshot: PasskeyColumn<T>
  readonly requestBindingVerifier: PasskeyColumn<T>
  readonly requestBindingExpiresAt: PasskeyColumn<T>
  readonly issuedAt: PasskeyColumn<T>
  readonly expiresAt: PasskeyColumn<T>
  readonly encodeInsert: (input: PasskeyFlowInsert) => T["insert"]
}

export const requiredPasskeyPersistenceConstraints = {
  flow: ["moduleId", "flowId"]
} as const

export interface PasskeyCeremonyMapping<
  Flow extends Table,
  Expression extends SqlExpression = SqlExpression
> {
  readonly moduleId: string
  readonly flow: PasskeyFlowTable<Flow>
  readonly clock: PasskeyClock<Expression>
  readonly constraints: typeof requiredPasskeyPersistenceConstraints
}

export interface PasskeyPersistenceMapping<
  Read,
  Flow extends Table,
  N,
  Expression extends SqlExpression = SqlExpression,
  Credential extends Table = Table
> extends PasskeyCeremonyMapping<Flow, Expression> {
  readonly read: Read & {
    readonly subjectIds: PasskeySubjectIdCodec<N>
  }
  readonly telemetry: {
    readonly lastUsedAt: PasskeyColumn<Credential>
    readonly encodeBackupEligible: (value: boolean) => unknown
    readonly encodeBackupState: (value: boolean) => unknown
  }
}

export interface D1PasskeyMapping {
  readonly d1: { readonly primary: true }
}
