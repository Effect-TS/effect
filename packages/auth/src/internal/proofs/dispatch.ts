import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"

import type { PreparedCommit } from "../hooks/commit.ts"
import { type ProofCapabilityUnsupported, ProofUnavailable } from "./errors.ts"
import type { ProofRequestReceipt } from "./models.ts"

/** Private process-local delivery. Never serialize its credential-bearing closure.
 * Read only after its outer owner commits. Repeated reads share one schedule/work
 * execution; crash, queue rejection or interruption may leave a code unsent. */
export interface PreparedProofDispatch<R = never> {
  readonly receipt: ProofRequestReceipt
  readonly schedule: Effect.Effect<void, ProofCapabilityUnsupported | ProofUnavailable, R>
}

export interface ProofIssuePlan {
  readonly commit: Effect.Effect<PreparedCommit<PreparedProofDispatch>, ProofUnavailable>
}

export const readProofCommit = <A>(receipt: PreparedCommit<A>) =>
  receipt.read.pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ProofUnavailable.make({}))))
  )
