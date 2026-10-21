import * as Effect from "effect/Effect"

import { HostIngressLimiter } from "./hostIngressLimiter.ts"
import { ProofRequestContext } from "./proofRequestContext.ts"

/**
 * Resolve trusted keys for every request, before target lookup or eligibility.
 *
 * @internal
 */
export const proofRequestAdmission = Effect.fnUntraced(function*(action: string) {
  const context = yield* yield* ProofRequestContext

  return yield* (yield* HostIngressLimiter).check({
    action,
    networkKey: context.networkKey,
    ...(context.deviceKey === undefined ? {} : { deviceKey: context.deviceKey })
  })
})
