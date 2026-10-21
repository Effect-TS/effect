import { assert, it } from "@effect/vitest"
import type * as CryptoError from "effect/crypto/CryptoError"
import * as Digest from "effect/crypto/Digest"
import * as Kdf from "effect/crypto/Kdf"
import * as KdfAdmission from "effect/crypto/KdfAdmission"
import type { KdfBusy } from "effect/crypto/KdfAdmission"
import * as WebCrypto from "effect/crypto/WebCrypto"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as TestClock from "effect/testing/TestClock"

it.effect("rejects invalid KDF admission configuration at Layer construction", () =>
  Effect.gen(function*() {
    const result = yield* Layer.build(KdfAdmission.layer({ concurrency: 0 })).pipe(
      Effect.flip
    )

    assert.strictEqual(result.reason._tag, "InvalidArgument")
  }))

// Direct Auth adoption needs one admission region around the whole password
// operation; its nested Kdf call must reuse that permit without admitting children.
it.effect("shares admission with nested work in the same fiber but not forked children", () =>
  Effect.gen(function*() {
    const admission = yield* KdfAdmission.KdfAdmission

    const result = yield* admission.run(
      Effect.gen(function*() {
        const nested = yield* admission.run(Effect.succeed("nested"))

        const child = yield* admission
          .run(Effect.succeed("child"))
          .pipe(Effect.result, Effect.forkChild)

        return { nested, child: yield* Fiber.join(child) }
      })
    )

    assert.strictEqual(result.nested, "nested")
    assert.strictEqual(Result.isFailure(result.child) && result.child.failure._tag, "KdfBusy")
    assert.strictEqual(yield* admission.run(Effect.succeed("reused")), "reused")
  }).pipe(Effect.provide(KdfAdmission.layer({ concurrency: 1, maxQueued: 0 }))))

// Ownership must outlive scoped finalizers so nested cleanup keeps its permit.
it.effect("retains same-fiber admission through scoped cleanup", () =>
  Effect.gen(function*() {
    const admission = yield* KdfAdmission.KdfAdmission
    const cleanup = yield* Deferred.make<string, KdfBusy>()

    yield* admission.run(
      Effect.addFinalizer(() => Deferred.complete(cleanup, admission.run(Effect.succeed("cleaned"))))
    )

    assert.strictEqual(yield* Deferred.await(cleanup), "cleaned")
  }).pipe(Effect.provide(KdfAdmission.layer({ concurrency: 1, maxQueued: 0 }))))

it.effect("bounds queued callers, expires waits, and removes interrupted waiters", () =>
  Effect.gen(function*() {
    const admission = yield* KdfAdmission.KdfAdmission
    const entered = yield* Deferred.make<void>()
    const finish = yield* Deferred.make<void>()
    const active = yield* admission.run(Effect.andThen(Deferred.succeed(entered, undefined), Deferred.await(finish)))
      .pipe(Effect.forkChild)
    yield* Deferred.await(entered)
    const queued = yield* admission.run(Effect.void).pipe(Effect.result, Effect.forkChild)
    yield* TestClock.adjust(1)
    assert.strictEqual((yield* Effect.flip(admission.run(Effect.void)))._tag, "KdfBusy")
    yield* Fiber.interrupt(queued)
    const waiting = yield* admission.run(Effect.void).pipe(Effect.result, Effect.forkChild)
    yield* TestClock.adjust(101)
    const expired = yield* Fiber.join(waiting)
    assert.strictEqual(Result.isFailure(expired) && expired.failure._tag, "KdfBusy")
    yield* Deferred.succeed(finish, undefined)
    yield* Fiber.join(active)
    assert.strictEqual(yield* admission.run(Effect.succeed("reused")), "reused")
  }).pipe(Effect.provide(KdfAdmission.layer({ concurrency: 1, maxQueued: 1, maxWaitMilliseconds: 100 }))))

it.effect("keeps admission and owned secrets until interrupted WebCrypto work settles", () =>
  Effect.gen(function*() {
    const entered = yield* Deferred.make<void, CryptoError.CryptoError | KdfBusy>()
    let finish: ((value: ArrayBuffer) => void) | undefined
    let borrowed: Uint8Array | undefined
    let calls = 0
    const subtle = new Proxy(globalThis.crypto.subtle, {
      get(target, property) {
        if (property === "importKey") {
          return (...args: Parameters<SubtleCrypto["importKey"]>) => {
            if (borrowed === undefined) borrowed = args[1] as Uint8Array
            return target.importKey(...args)
          }
        }
        if (property === "deriveBits") {
          return (...args: Parameters<SubtleCrypto["deriveBits"]>) => {
            calls++
            if (calls !== 1) return target.deriveBits(...args)
            return new Promise<ArrayBuffer>((resolve) => {
              finish = resolve
              Deferred.doneUnsafe(entered, Effect.void)
            })
          }
        }
        const value = Reflect.get(target, property, target)
        return typeof value === "function" ? value.bind(target) : value
      }
    })
    const crypto = new Proxy(globalThis.crypto, {
      get(target, property) {
        if (property === "subtle") return subtle
        const value = Reflect.get(target, property, target)
        return typeof value === "function" ? value.bind(target) : value
      }
    })
    yield* Effect.gen(function*() {
      const kdf = yield* Kdf.Kdf
      const admission = yield* KdfAdmission.KdfAdmission
      const password = new TextEncoder().encode("password")
      const work = admission.run(kdf.derive(Kdf.pbkdf2({ hash: Digest.sha256, iterations: 1 }), password, {
        salt: new TextEncoder().encode("salt"),
        length: 32
      }))
      const first = yield* work.pipe(Effect.tapError((error) => Deferred.fail(entered, error)), Effect.forkChild)
      yield* Deferred.await(entered)
      const interruption = yield* Fiber.interrupt(first).pipe(Effect.forkChild)
      yield* TestClock.adjust(1)
      const overflow = yield* Effect.flip(admission.run(Effect.void))
      const pending = interruption.pollUnsafe() === undefined
      const inputPreserved = borrowed !== password && borrowed?.some((byte) => byte !== 0)
      finish?.(new ArrayBuffer(32))
      yield* Fiber.join(interruption)
      assert.strictEqual(overflow._tag, "KdfBusy")
      assert.isTrue(pending)
      assert.isTrue(inputPreserved)
      assert.isTrue(borrowed?.every((byte) => byte === 0))
      assert.strictEqual(calls, 1)
      assert.deepStrictEqual(password, new TextEncoder().encode("password"))
      assert.strictEqual((yield* work).length, 32)
    }).pipe(Effect.provide(Layer.merge(
      Kdf.layerWebCrypto.pipe(Layer.provide(WebCrypto.layer(crypto))),
      KdfAdmission.layer({ concurrency: 1, maxQueued: 0 })
    )))
  }))
