import type { AuthenticationEvidence } from "@effect/auth/Sessions"
import { SessionUnavailable } from "@effect/auth/Sessions"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"

import { PersistenceMappingError } from "./mappingError.ts"

/** @internal */
export const preservesRevision = (
  completed: AuthenticationEvidence,
  original: AuthenticationEvidence
): boolean => {
  const current = new Map(
    completed.revision.credentials.map((item) => [item.credentialId, item.revision])
  )

  return (
    completed.flowId === original.flowId &&
    completed.bindingDigest === original.bindingDigest &&
    completed.revision.subjectId === original.revision.subjectId &&
    completed.revision.securityRevision === original.revision.securityRevision &&
    original.revision.credentials.every(
      (item) => current.get(item.credentialId) === item.revision
    ) &&
    original.proofs.every((expected) =>
      completed.proofs.some(
        (proof) =>
          proof.method === expected.method &&
          proof.credentialId === expected.credentialId &&
          proof.userVerified === expected.userVerified &&
          proof.phishingResistant === expected.phishingResistant &&
          DateTime.toEpochMillis(proof.verifiedAt) ===
            DateTime.toEpochMillis(expected.verifiedAt) &&
          proof.factors.length === expected.factors.length &&
          proof.factors.every((factor, index) => factor === expected.factors[index])
      )
    )
  )
}

/** @internal */
export const allocateSessionValue = <A>(
  mode: "interactive" | "synchronous" | "batch",
  asynchronous: Effect.Effect<A, PersistenceMappingError> | undefined,
  synchronous: (() => A) | undefined
): Effect.Effect<A, PersistenceMappingError | SessionUnavailable> => {
  if (mode === "synchronous") {
    return synchronous === undefined
      ? Effect.fail(SessionUnavailable.make({}))
      : Effect.try({
        try: synchronous,
        catch: (cause) => PersistenceMappingError.make({ operation: "allocate", cause })
      })
  }
  if (asynchronous !== undefined) return asynchronous

  return synchronous === undefined
    ? Effect.fail(SessionUnavailable.make({}))
    : Effect.try({
      try: synchronous,
      catch: (cause) => PersistenceMappingError.make({ operation: "allocate", cause })
    })
}
