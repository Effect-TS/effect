import { Pkce } from "@effect/auth/oauth"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Scope } from "effect"
import { webCryptoLayer as cryptoLayer } from "../utils/crypto.ts"
import { withNativeGate } from "../utils/nativeGate.ts"
import { codeInput } from "./fixtures.ts"

describe("PKCE native hash lifecycle", { concurrent: false }, () => {
  for (const operation of ["challenge", "make"] as const) {
    for (const termination of ["caller interruption", "owner closure"] as const) {
      it.effect(`${termination} joins the native digest in ${operation}`, () =>
        Effect.gen(function*() {
          const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
          let published = false
          let finalized = false
          const work = Effect.gen(function*() {
            if (operation === "challenge") {
              yield* Pkce.challenge(codeInput.pkceVerifier)
            } else {
              yield* Pkce.make()
            }
            published = true
          }).pipe(Effect.ensuring(Effect.sync(() => {
            finalized = true
          })))

          yield* withNativeGate("digest", (gate) =>
            Effect.gen(function*() {
              const active = yield* Effect.forkIn(work, owner)
              yield* gate.entered
              const terminating = yield* Effect.forkChild(
                termination === "owner closure" ? Scope.close(owner, Exit.void) : Fiber.interrupt(active),
                { startImmediately: true }
              )
              yield* Effect.yieldNow
              assert.isFalse(gate.isSettled())
              assert.isFalse(finalized)
              assert.isUndefined(terminating.pollUnsafe())
              yield* gate.release
              yield* Fiber.join(terminating)
              const exit = yield* Fiber.await(active)
              assert.isTrue(gate.isSettled())
              assert.isTrue(finalized)
              assert.isFalse(published)
              assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
            }))
        }).pipe(Effect.provide(cryptoLayer)))
    }
  }
})
