import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { SubjectId } from "../../Schema.ts"
import type { CommitJournal, PreparedCommit } from "../hooks/commit.ts"
import type { TotpUnavailable } from "./errors.ts"
import type { TotpDecision, TotpMutation, TotpSnapshot } from "./models.ts"

export type PrepareTotpCommit<A> = (
  value: TotpDecision,
  journal: CommitJournal
) => PreparedCommit<A>

/** Owns subject policy/revision, factor state and digest consumption in one native commit. */
export class TotpPersistence extends Context.Service<
  TotpPersistence,
  {
    /** Return current policy, the complete active credential vector and factor state
     * from one authoritative snapshot; verification preserves that original vector. */
    readonly snapshot: (input: {
      readonly moduleId: string
      readonly subjectId: SubjectId
    }) => Effect.Effect<TotpSnapshot | undefined, TotpUnavailable>
    /** Regeneration changes factor version and codes, preserving subject and
     * credential revisions. Confirm, disable and reset still invalidate sessions. */
    readonly mutate: <A>(
      input: TotpMutation,
      prepare: PrepareTotpCommit<A>
    ) => Effect.Effect<PreparedCommit<A>, TotpUnavailable>
  }
>()("@effect/auth/TotpPersistence") {}
