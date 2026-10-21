import type * as Shared from "@effect/auth-persistence/Adapter"
import type { SQL, Table } from "drizzle-orm"

import type { ClockMapping, MappedClock } from "./nativeClock.ts"
import type { DrizzleTableModel } from "./tableModel.ts"

export { type RequiredProofConstraints, requiredProofConstraints } from "@effect/auth-persistence/Adapter"

export type ProofTable<Proof extends Table> = Shared.ProofTable<DrizzleTableModel<Proof>>
export type ProofClock = MappedClock

export type ProofPersistenceMapping<
  Proof extends Table,
  Subject extends Table,
  NativeSubjectId
> = ClockMapping<
  Shared.ProofPersistenceMapping<
    DrizzleTableModel<Proof>,
    DrizzleTableModel<Subject>,
    NativeSubjectId,
    SQL
  >
>

export type AnyProofPersistenceMapping = ProofPersistenceMapping<Table, Table, unknown>
