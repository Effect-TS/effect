import type { ProofIssueRecord } from "@effect/auth/Proofs"

import type { AnyTableModel, SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { SubjectIdCodec } from "./common.ts"

type Column<T extends Table> = T["column"]

/** One current code per canonical identifier and subject. Binding is canonical
 * Schema JSON, and token comparisons are byte exact even on collated columns. */
export interface ProofTable<Proof extends Table> {
  readonly table: Proof["table"]
  readonly moduleId: Column<Proof>
  readonly purpose: Column<Proof>
  readonly seriesKey: Column<Proof>
  readonly proofId: Column<Proof>
  readonly binding: Column<Proof>
  readonly verifierKeyId: Column<Proof>
  readonly verifierDigest: Column<Proof>
  readonly issuedAt: Column<Proof>
  readonly expiresAt: Column<Proof>
  readonly failedAttempts: Column<Proof>
  readonly encodeInsert: (input: {
    readonly record: ProofIssueRecord
    readonly seriesKey: string
  }) => Proof["insert"]
}

export interface ProofClock<Expression extends SqlExpression = SqlExpression> {
  readonly encodeInstant: (millis: number) => unknown
  readonly decodeInstant: (value: unknown) => number
  /** Integer engine wall-clock milliseconds; PostgreSQL uses clock_timestamp(). */
  readonly engineNowMillis: Expression
  readonly toMillis: (expression: Expression) => Expression
  readonly fromMillis: (expression: Expression) => Expression
}

export interface RequiredProofConstraints {
  readonly series: "unique(proof.moduleId,proof.purpose,proof.seriesKey)"
  readonly proof: "unique(proof.moduleId,proof.proofId)"
}

export const requiredProofConstraints: RequiredProofConstraints = {
  series: "unique(proof.moduleId,proof.purpose,proof.seriesKey)",
  proof: "unique(proof.moduleId,proof.proofId)"
}

export interface ProofPersistenceMapping<
  Proof extends Table,
  Subject extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> {
  readonly proof: ProofTable<Proof>
  /** Bare subject-bound redemption takes this lock before touching the proof.
   * Protected mutation owners already holding it use the shared locked primitive. */
  readonly subject: {
    readonly table: Subject["table"]
    readonly id: Column<Subject>
  }
  readonly subjectId: SubjectIdCodec<NativeSubjectId>
  readonly clock: ProofClock<Expression>
  readonly constraints: RequiredProofConstraints
  /** D1 planning reads use the primary engine. */
  readonly d1?: { readonly primary: true }
}

export type AnyProofPersistenceMapping<Expression extends SqlExpression = SqlExpression> = ProofPersistenceMapping<
  AnyTableModel,
  AnyTableModel,
  unknown,
  Expression
>
