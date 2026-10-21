import { assert, describe, it } from "@effect/vitest"
import * as Kdf from "effect/crypto/Kdf"
import * as KdfAdmission from "effect/crypto/KdfAdmission"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"
import { readFileSync } from "node:fs"
import { bytes, encode } from "../utils/crypto.ts"
import { argon2Vectors, nativeArgon2Vectors } from "./fixtures/argon2-vectors.ts"

const module = new WebAssembly.Module(readFileSync(new URL("../../src/crypto/argon2.wasm", import.meta.url)))

it("ships a WASM compressor with only the documented memory import", () => {
  assert.deepStrictEqual(WebAssembly.Module.imports(module), [{ module: "env", name: "memory", kind: "memory" }])
  assert.deepStrictEqual(WebAssembly.Module.exports(module).map((entry) => entry.name).sort(), [
    "__heap_base",
    "argon2_block"
  ])
})

for (const [backend, layer] of [["TypeScript", Kdf.layerPortable], ["WASM", Kdf.layerWasm(module)]] as const) {
  describe(backend, { concurrent: false }, () => {
    for (const vector of argon2Vectors) {
      it.effect(`Argon2id v19 known answer ${vector.sourceIndex}`, () =>
        Effect.gen(function*() {
          const kdf = yield* Kdf.Kdf
          const password = bytes(vector.passwordHex)
          const salt = bytes(vector.saltHex)
          const result = yield* kdf.derive(
            Kdf.argon2id({ memory: vector.m, passes: vector.t, parallelism: vector.p }),
            password,
            {
              salt,
              length: 32,
              secret: vector.secretHex === undefined ? undefined : bytes(vector.secretHex),
              associatedData: vector.dataHex === undefined ? undefined : bytes(vector.dataHex)
            }
          )
          assert.strictEqual(Hex.encode(result), vector.expectedHex)
          assert.strictEqual(Hex.encode(password), vector.passwordHex)
          assert.strictEqual(Hex.encode(salt), vector.saltHex)
        }).pipe(Effect.provide(layer)), { timeout: 60_000 })
    }

    for (const vector of nativeArgon2Vectors) {
      it.effect(`binary input, memory rounding and output length: ${vector.id}`, () =>
        Effect.gen(function*() {
          const kdf = yield* Kdf.Kdf
          const result = yield* kdf.derive(
            Kdf.argon2id({ memory: vector.m, passes: vector.t, parallelism: vector.p }),
            bytes(vector.passwordHex),
            {
              salt: bytes(vector.saltHex),
              length: vector.length
            }
          )
          assert.strictEqual(Hex.encode(result), vector.expectedHex)
        }).pipe(Effect.provide(layer)))
    }

    it.effect("keeps concurrent derivation buffers independent across scheduler yields", () =>
      Effect.gen(function*() {
        const kdf = yield* Kdf.Kdf
        yield* Effect.forEach(
          argon2Vectors.filter((vector) => vector.m === 256),
          (vector) =>
            kdf.derive(
              Kdf.argon2id({ memory: vector.m, passes: vector.t, parallelism: vector.p }),
              bytes(vector.passwordHex),
              {
                salt: bytes(vector.saltHex),
                length: 32
              }
            ).pipe(
              Effect.tap((output) => Effect.sync(() => assert.strictEqual(Hex.encode(output), vector.expectedHex)))
            ),
          { concurrency: 2 }
        )
      }).pipe(Effect.provide(layer)))

    it.effect("interrupts at a batch boundary and releases admission after cleanup", () =>
      Effect.gen(function*() {
        const kdf = yield* Kdf.Kdf
        const admission = yield* KdfAdmission.KdfAdmission
        const tasks: Array<() => void> = []
        const scheduler: Scheduler.Scheduler = {
          executionMode: "sync",
          shouldYield: () => false,
          makeDispatcher: () => ({
            scheduleTask: (task) => tasks.push(task),
            flush: () => {
              while (tasks.length > 0) tasks.shift()!()
            }
          })
        }
        const fiber = yield* admission.run(
          kdf.derive(Kdf.argon2id({ memory: 8192, passes: 2, parallelism: 1 }), encode("password"), {
            salt: encode("somesalt"),
            length: 32
          })
        ).pipe(Effect.provideService(Scheduler.Scheduler, scheduler), Effect.forkChild({ startImmediately: true }))
        const suspended = tasks.length > 0 && fiber.pollUnsafe() === undefined
        const interruption = yield* Fiber.interrupt(fiber).pipe(Effect.forkChild({ startImmediately: true }))
        for (const task of tasks.splice(0)) task()
        const stoppedAtBoundary = fiber.pollUnsafe() !== undefined
        while (tasks.length > 0) tasks.shift()!()
        yield* Fiber.join(interruption)
        const result = yield* admission.run(
          kdf.derive(Kdf.argon2id({ memory: 8, passes: 1, parallelism: 1 }), encode("password"), {
            salt: encode("somesalt"),
            length: 32
          })
        )
        assert.isTrue(suspended)
        assert.isTrue(stoppedAtBoundary)
        assert.strictEqual(result.length, 32)
      }).pipe(Effect.provide(Layer.merge(layer, KdfAdmission.layer({ concurrency: 1, maxQueued: 0 })))))
  })
}

it.effect("delegates other algorithms to the supplied WASM fallback", () =>
  Effect.gen(function*() {
    const kdf = yield* Kdf.Kdf
    const fallback = yield* kdf.derive(Kdf.scrypt(), encode("password"), {
      salt: encode("salt"),
      length: 32
    })
    assert.deepStrictEqual(fallback, new Uint8Array(32).fill(7))
    const derived = yield* kdf.derive(Kdf.argon2id({ memory: 8, passes: 1, parallelism: 1 }), new Uint8Array(), {
      salt: bytes("00ff800102030001"),
      length: 4
    })
    assert.strictEqual(Hex.encode(derived), "669220f8")
  }).pipe(Effect.provide(Kdf.layerWasm(
    module,
    Layer.succeed(Kdf.Kdf, {
      derive: (_algorithm, _password, options) => Effect.succeed(new Uint8Array(options.length).fill(7))
    })
  ))))
