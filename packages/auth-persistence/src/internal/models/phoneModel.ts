import type { PhoneLifecyclePolicy, PhoneNumber } from "@effect/auth/PhoneOtp"
import type { SubjectId } from "@effect/auth/Schema"
import type { AuthenticationRequirement } from "@effect/auth/Sessions"
import type * as Effect from "effect/Effect"

import type { AnyTableModel, SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { PersistenceMappingError } from "./common.ts"
import type { ProofPersistenceMapping } from "./proofModel.ts"

type PhoneColumn<T extends Table> = T["column"]

export const requiredPhoneConstraints = {
  subject: "unique(id)",
  identifier: "unique(namespace,value)",
  credential: "unique(credentialId)"
} as const

/** Consumer-owned schema; encoders and allocators are synchronous and side-effect free.
 * Identifiers store permanent number custody. Never delete retired rows to make a recycled number eligible. A consumer's
 * explicit recovery workflow may resolve custody only after independent authentication.
 * Subject defaults own account provisioning; no email/profile schema is prescribed. */
export interface PhoneMapping<
  S extends Table,
  I extends Table,
  C extends Table,
  P extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly moduleId: string
  readonly policy: PhoneLifecyclePolicy
  readonly constraints: typeof requiredPhoneConstraints
  readonly proofs: ProofPersistenceMapping<P, S, N, Expression>
  readonly subjectIds: {
    readonly toNative: (id: SubjectId) => N | Effect.Effect<N, PersistenceMappingError>
    readonly toSubject: (id: N) => SubjectId | Effect.Effect<SubjectId, PersistenceMappingError>
    readonly allocate?: () => N | Effect.Effect<N, PersistenceMappingError>
  }
  readonly subject: {
    readonly table: S["table"]
    readonly id: PhoneColumn<S>
    readonly securityRevision: PhoneColumn<S>
    readonly activeCondition: Expression
    readonly decodeRequirement: (
      row: S["select"]
    ) =>
      | AuthenticationRequirement
      | Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
    /** Current action policy, independently from primary sign-in assurance. */
    readonly decodeActionRequirement?: (
      row: S["select"],
      action: "verify" | "change"
    ) =>
      | AuthenticationRequirement
      | Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
    readonly encodeInsert?: (input: {
      readonly id: N
      readonly securityRevision: string
      readonly phoneNumber: PhoneNumber
    }) => S["insert"]
  }
  readonly identifier: {
    readonly table: I["table"]
    readonly moduleId: PhoneColumn<I>
    readonly credentialId: PhoneColumn<I>
    readonly namespace: PhoneColumn<I>
    readonly value: PhoneColumn<I>
    readonly subjectId: PhoneColumn<I>
    readonly revision: PhoneColumn<I>
    readonly verifiedAt: PhoneColumn<I>
    readonly status: PhoneColumn<I>
    readonly activeCondition: Expression
    readonly encodeStatus: (active: boolean) => unknown
    readonly encodeInsert: (input: {
      readonly moduleId: string
      readonly credentialId: string
      readonly phoneNumber: PhoneNumber
      readonly subjectId: N
      readonly revision: string
      readonly verifiedAtMillis: number
      readonly active: boolean
    }) => I["insert"]
  }
  readonly credential: {
    readonly table: C["table"]
    readonly id: PhoneColumn<C>
    readonly subjectId: PhoneColumn<C>
    readonly revision: PhoneColumn<C>
    readonly status: PhoneColumn<C>
    readonly activeCondition: Expression
    readonly encodeStatus: (active: boolean) => unknown
    readonly encodeInsert: (input: {
      readonly credentialId: string
      readonly subjectId: N
      readonly revision: string
      readonly active: boolean
    }) => C["insert"]
  }
  readonly encodeInstant: (millis: number) => unknown
  readonly engineNowMillis: Expression
}

export type AnyPhoneMapping<Expression extends SqlExpression = SqlExpression> = PhoneMapping<
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  unknown,
  Expression
>
