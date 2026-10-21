import type * as Shared from "@effect/auth-persistence/Adapter"
import type { SQL, Table } from "drizzle-orm"

import type { ClockMapping } from "./nativeClock.ts"
import type { DrizzleTableModel } from "./tableModel.ts"

export {
  type RequiredPendingAuthenticationConstraints,
  requiredPendingAuthenticationConstraints,
  type RequiredSessionConstraints,
  requiredSessionConstraints,
  type RequiredSignedValidityConstraints,
  requiredSignedValidityConstraints,
  type RequiredStatefulPendingConstraints,
  requiredStatefulPendingConstraints,
  type SessionIdCodec,
  type SessionPendingInsert
} from "@effect/auth-persistence/Adapter"

export type SessionSubjectTables<Subject extends Table, NativeId> = Shared.SessionSubjectTables<
  DrizzleTableModel<Subject>,
  NativeId
>

export type SessionAuthorityTables<
  Subject extends Table,
  Credential extends Table,
  NativeId
> = Shared.SessionAuthorityTables<
  DrizzleTableModel<Subject>,
  DrizzleTableModel<Credential>,
  NativeId
>

export type StatefulSessionTables<
  Claims,
  Session extends Table,
  NativeSubjectId,
  NativeSessionId
> = Shared.StatefulSessionTables<
  Claims,
  DrizzleTableModel<Session>,
  NativeSubjectId,
  NativeSessionId
>

export type SessionPendingTables<
  Pending extends Table,
  NativeSubjectId
> = Shared.SessionPendingTables<DrizzleTableModel<Pending>, NativeSubjectId>

export type PendingAuthenticationTables<
  Claims,
  Pending extends Table,
  NativeSubjectId
> = Shared.PendingAuthenticationTables<Claims, DrizzleTableModel<Pending>, NativeSubjectId>

export type SignedSessionValidityTables<
  Tombstone extends Table,
  NativeSubjectId,
  NativeSessionId
> = Shared.SignedSessionValidityTables<
  DrizzleTableModel<Tombstone>,
  NativeSubjectId,
  NativeSessionId
>

export type AuthenticationAuthorityMapping<
  Claims,
  Subject extends Table,
  Credential extends Table,
  Pending extends Table,
  NativeSubjectId
> = ClockMapping<
  Shared.AuthenticationAuthorityMapping<
    Claims,
    DrizzleTableModel<Subject>,
    DrizzleTableModel<Credential>,
    DrizzleTableModel<Pending>,
    NativeSubjectId,
    SQL
  >
>

export type StatefulSessionMapping<
  Claims,
  Subject extends Table,
  Credential extends Table,
  Session extends Table,
  Pending extends Table,
  NativeSubjectId,
  NativeSessionId
> = ClockMapping<
  Shared.StatefulSessionMapping<
    Claims,
    DrizzleTableModel<Subject>,
    DrizzleTableModel<Credential>,
    DrizzleTableModel<Session>,
    DrizzleTableModel<Pending>,
    NativeSubjectId,
    NativeSessionId,
    SQL
  >
>

export type PendingAuthenticationMapping<
  Claims,
  Subject extends Table,
  Credential extends Table,
  Pending extends Table,
  NativeSubjectId
> = ClockMapping<
  Shared.PendingAuthenticationMapping<
    Claims,
    DrizzleTableModel<Subject>,
    DrizzleTableModel<Credential>,
    DrizzleTableModel<Pending>,
    NativeSubjectId,
    SQL
  >
>

export type SignedSessionValidityMapping<
  Subject extends Table,
  Tombstone extends Table,
  NativeSubjectId,
  NativeSessionId
> = ClockMapping<
  Shared.SignedSessionValidityMapping<
    DrizzleTableModel<Subject>,
    DrizzleTableModel<Tombstone>,
    NativeSubjectId,
    NativeSessionId,
    SQL
  >
>

export type SessionCleanupMapping<
  Pending extends Table,
  Tombstone extends Table,
  NativeSubjectId,
  NativeSessionId
> = ClockMapping<
  Shared.SessionCleanupMapping<
    DrizzleTableModel<Pending>,
    DrizzleTableModel<Tombstone>,
    NativeSubjectId,
    NativeSessionId,
    SQL
  >
>
