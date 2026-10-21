import type { SubjectId } from "@effect/auth/Schema"
import type { AuthenticationRequirement } from "@effect/auth/Sessions"
import type { TotpPolicy } from "@effect/auth/Totp"
import type * as Effect from "effect/Effect"

import type { PersistenceMappingError } from "../mappingError.ts"
import type { SqlExpression, TableModel } from "../tableModel.ts"
import type { ProofClock } from "./proofModel.ts"
import type { PendingAuthenticationTables } from "./sessionModel.ts"

export const requiredTotpConstraints = {
  factor: "unique(scope)",
  credential: "unique(credentialId)",
  subject: "unique(id)"
} as const

export type TotpMappingSource<M, R = never> = M | Effect.Effect<M, PersistenceMappingError, R>

/** One encrypted factor row and the common credential authority. Version protects
 * accepted-step, failure-budget and recovery-code changes; no command receipts. */
export interface TotpMapping<
  S extends TableModel,
  F extends TableModel,
  C extends TableModel,
  N,
  P extends TableModel = TableModel,
  Expression extends SqlExpression = SqlExpression
> {
  readonly moduleId: string
  readonly policy: TotpPolicy
  readonly constraints: typeof requiredTotpConstraints
  readonly d1?: { readonly primary: true }
  readonly subjectIds: {
    readonly toNative: (id: SubjectId) => N
    readonly toSubject: (id: N) => SubjectId
  }
  readonly subject: {
    readonly table: S["table"]
    readonly id: S["column"]
    readonly securityRevision: S["column"]
    readonly factorEnabled: S["column"]
    readonly activeCondition: Expression
    readonly encodeEnabled: (enabled: boolean) => unknown
    readonly decodeRequirement: (row: S["select"]) => AuthenticationRequirement
    /** Required for D1: declare every independently mutable input read by
     * decodeRequirement. An explicit [] promises a constant requirement. */
    readonly requirementColumns?: ReadonlyArray<S["column"]>
  }
  readonly factor: {
    readonly table: F["table"]
    readonly scope: F["column"]
    readonly state: F["column"]
    readonly version: F["column"]
    readonly encodeInsert: (value: {
      readonly scope: string
      readonly state: string
      readonly version: string
    }) => F["insert"]
  }
  readonly credential: {
    readonly table: C["table"]
    readonly id: C["column"]
    readonly subjectId: C["column"]
    readonly revision: C["column"]
    readonly status: C["column"]
    readonly activeCondition: Expression
    readonly encodeStatus: (active: boolean) => unknown
    readonly encodeInsert: (value: {
      readonly credentialId: string
      readonly subjectId: N
      readonly revision: string
      readonly active: boolean
    }) => C["insert"]
  }
  readonly engineNowMillis: Expression
  /** Reset uses the very same Login-kind row owner as pending authentication. */
  readonly pending?: Omit<PendingAuthenticationTables<unknown, P, N>, "login"> & {
    readonly login: Pick<PendingAuthenticationTables<unknown, P, N>["login"], "decode">
    readonly moduleId: string
    readonly clock: ProofClock<Expression>
  }
}
