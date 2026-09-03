import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Option } from "effect"
import { DurableDeferred, WorkflowEngine } from "effect/unstable/workflow"
import * as F from "./DeferredServices.fixture.ts"

describe("DurableDeferred.into real memory engine controls", () => {
  for (const style of ["data-first", "data-last"]) {
    it.effect(`${style} success encodes, records, and awaits the stored value`, () => {
      const encoded: Array<string> = []
      return F.inInstance(Effect.gen(function*() {
        const engine = yield* WorkflowEngine.WorkflowEngine
        assert.deepStrictEqual(yield* engine.deferredResult(F.gate), Option.none())
        const operation = style === "data-first"
          ? DurableDeferred.into(Effect.succeed("ok"), F.gate)
          : Effect.succeed("ok").pipe(DurableDeferred.into(F.gate))
        assert.strictEqual(yield* operation, "ok")
        assert.deepStrictEqual(yield* engine.deferredResult(F.gate), Option.some(Exit.succeed("stored:ok")))
        assert.strictEqual(yield* DurableDeferred.await(F.gate), "stored:ok")
        assert.deepStrictEqual(encoded, ["ok"])
      })).pipe(Effect.provideService(F.Encoder, {
        encode: (value) => {
          encoded.push(value)
          return `stored:${value}`
        }
      }))
    })

    it.effect(`${style} error uses its separate encoder and preserves the body failure`, () => {
      const encoded: Array<string> = []
      return F.inInstance(Effect.gen(function*() {
        const engine = yield* WorkflowEngine.WorkflowEngine
        const operation = style === "data-first"
          ? DurableDeferred.into(Effect.fail("boom"), F.errorGate)
          : Effect.fail("boom").pipe(DurableDeferred.into(F.errorGate))
        assert.deepStrictEqual(yield* Effect.exit(operation), Exit.fail("boom"))
        assert.deepStrictEqual(yield* engine.deferredResult(F.errorGate), Option.some(Exit.fail("stored:boom")))
        assert.deepStrictEqual(yield* Effect.exit(DurableDeferred.await(F.errorGate)), Exit.fail("stored:boom"))
        assert.deepStrictEqual(encoded, ["boom"])
      })).pipe(Effect.provideService(F.ErrorEncoder, {
        encode: (value) => {
          encoded.push(value)
          return `stored:${value}`
        }
      }))
    })
  }

  it.effect("body R is independent of the encoder service", () =>
    F.inInstance(Effect.gen(function*() {
      assert.strictEqual(yield* DurableDeferred.into(F.Body, F.gate), "body")
      assert.strictEqual(yield* DurableDeferred.await(F.gate), "stored:body")
    })).pipe(
      Effect.provideService(F.Body, "body"),
      Effect.provideService(F.Encoder, { encode: (value) => `stored:${value}` })
    ))

  it.effect("done reaches the same real encoder and stored completion", () =>
    F.inInstance(Effect.gen(function*() {
      const token = yield* DurableDeferred.token(F.gate)
      yield* DurableDeferred.done(F.gate, { token, exit: Exit.succeed("done") })
      assert.strictEqual(yield* DurableDeferred.await(F.gate), "stored:done")
    })).pipe(Effect.provideService(F.Encoder, { encode: (value) => `stored:${value}` })))

  it.effect("plain schemas still record and await without encoder provision", () =>
    F.inInstance(Effect.gen(function*() {
      assert.strictEqual(yield* DurableDeferred.into(Effect.succeed("plain"), F.plainGate), "plain")
      assert.strictEqual(yield* DurableDeferred.await(F.plainGate), "plain")
    })))

  it.effect("interrupt-only completion records nothing and propagates suspension", () =>
    F.inInstance(Effect.gen(function*() {
      const parent = yield* WorkflowEngine.WorkflowInstance
      const engine = yield* WorkflowEngine.WorkflowEngine
      const body = Effect.gen(function*() {
        const instance = yield* WorkflowEngine.WorkflowInstance
        instance.suspended = true
        return yield* Effect.interrupt
      })
      const exit = yield* Effect.exit(DurableDeferred.into(body, F.plainGate))
      assert(Exit.isFailure(exit))
      assert.isTrue(parent.suspended)
      assert.deepStrictEqual(yield* engine.deferredResult(F.plainGate), Option.none())
    })))
})
