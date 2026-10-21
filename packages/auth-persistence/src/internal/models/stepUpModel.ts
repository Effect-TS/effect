import type { SqlExpression, TableModel as Table } from "../tableModel.ts"
import type {
  SessionAuthorityTables,
  SessionExecution,
  SessionPendingTables,
  SignedSessionValidityTables,
  StatefulSessionTables
} from "./sessionModel.ts"
import { requiredPendingAuthenticationConstraints } from "./sessionModel.ts"

export const requiredSessionStepUpConstraints = requiredPendingAuthenticationConstraints
export type RequiredSessionStepUpConstraints = typeof requiredSessionStepUpConstraints

/** Stateful metadata is decoded from the exact inspected digest's record. No
 * duplicate credentialVersion/authenticatedAt columns or row-version CAS. */
export type SessionStepUpSourceTables<
  Claims,
  Session extends Table,
  Tombstone extends Table,
  NativeSubjectId,
  NativeSessionId
> =
  | { readonly kind: "StatelessSigned" }
  | ({
    readonly kind: "StateAssistedSigned"
    readonly constraints: {
      readonly tombstoneOwner: "unique(tombstone.moduleId,tombstone.subjectId,tombstone.sessionId)"
    }
  } & SignedSessionValidityTables<Tombstone, NativeSubjectId, NativeSessionId>)
  | ({
    readonly kind: "Stateful"
    readonly constraints: { readonly sessionDigest: "unique(session.digest)" }
  } & StatefulSessionTables<Claims, Session, NativeSubjectId, NativeSessionId>)

export type SessionStepUpMapping<
  Claims,
  Subject extends Table,
  Credential extends Table,
  Pending extends Table,
  Session extends Table,
  Tombstone extends Table,
  NativeSubjectId,
  NativeSessionId,
  Expression extends SqlExpression = SqlExpression
> =
  & SessionAuthorityTables<Subject, Credential, NativeSubjectId>
  & SessionPendingTables<Pending, NativeSubjectId>
  & SessionExecution<Expression>
  & {
    readonly source: SessionStepUpSourceTables<
      Claims,
      Session,
      Tombstone,
      NativeSubjectId,
      NativeSessionId
    >
    readonly constraints: RequiredSessionStepUpConstraints
  }
