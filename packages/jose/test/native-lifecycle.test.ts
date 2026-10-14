import { type Errors, Jwk, Jws } from "@effect/jose"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Redacted, Scope } from "effect"
import { privateJwk, publicJwk, utf8 } from "./fixtures.ts"
import { withNativeGate } from "./utils/nativeGate.ts"

describe("native operation lifecycle", { concurrent: false }, () => {
  for (const operation of ["public key encoding", "private key encoding", "verification"] as const) {
    const methods = operation === "verification"
      ? ["importKey", "verify"] as const
      : ["importKey", "exportKey"] as const
    for (const method of methods) {
      for (const termination of ["caller interruption", "owner closure"] as const) {
        it.effect(`${termination} joins ${operation} during ${method}`, () =>
          Effect.gen(function*() {
            const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
            const signingKey = yield* Jwk.importPrivate(Redacted.make(privateJwk), "ES256")
            const verificationKey = yield* Jwk.importPublic(publicJwk, "ES256")
            const token = yield* Jws.sign(Redacted.make(utf8("payload")), signingKey, { alg: "ES256" })
            let published = false
            let finalized = false
            let work: Effect.Effect<unknown, Errors.VerifyError>
            switch (operation) {
              case "public key encoding":
                work = Jwk.importPublic(publicJwk, "ES256")
                break
              case "private key encoding":
                work = Jwk.importPrivate(Redacted.make(privateJwk), "ES256")
                break
              case "verification":
                work = Jws.verify(token, verificationKey, { algorithms: ["ES256"] })
                break
            }

            yield* withNativeGate(method, (gate) =>
              Effect.gen(function*() {
                const active = yield* Effect.forkIn(
                  work.pipe(
                    Effect.tap(() =>
                      Effect.sync(() => {
                        published = true
                      })
                    ),
                    Effect.ensuring(Effect.sync(() => {
                      finalized = true
                    }))
                  ),
                  owner
                )
                yield* gate.entered
                const terminating = yield* Effect.forkChild(
                  termination === "owner closure" ? Scope.close(owner, Exit.void) : Fiber.interrupt(active),
                  { startImmediately: true }
                )
                yield* Effect.yieldNow
                assert.isFalse(gate.isSettled())
                assert.isUndefined(terminating.pollUnsafe())
                assert.isFalse(finalized)
                yield* gate.release
                yield* Fiber.join(terminating)
                assert.isTrue(gate.isSettled())
                assert.isTrue(finalized)
                assert.isFalse(published)
                const exit = yield* Fiber.await(active)
                assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
              }))
          }))
      }
    }
  }
})
