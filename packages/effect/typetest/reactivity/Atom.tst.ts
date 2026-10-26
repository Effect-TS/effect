import { Context, Effect, hole, Layer, Schema, Stream, SubscriptionRef } from "effect"
import type { Scope } from "effect"
import { type AsyncResult, Atom, type AtomRegistry, type Reactivity } from "effect/reactivity"
import { describe, expect, it } from "tstyche"

describe("Atom", () => {
  describe("query", () => {
    it("infers success and error types for Effects and synchronous factories", () => {
      const effect = hole<Effect.Effect<number, "load-failed", Scope.Scope | AtomRegistry.AtomRegistry>>()
      const input = Atom.make(1)

      expect(Atom.query(effect, { staleTime: "30 seconds" }))
        .type.toBe<Atom.Atom<AsyncResult.AsyncResult<number, "load-failed">>>()
      expect(Atom.query((get) => Effect.succeed(get(input))))
        .type.toBe<Atom.Atom<AsyncResult.AsyncResult<number>>>()
    })

    it("preserves runtime requirements and errors for both input forms", () => {
      class Service extends Context.Service<Service, { readonly value: number }>()("Service") {}
      const runtime = Atom.runtime(hole<Layer.Layer<Service, "setup-failed">>())
      const effect = hole<Effect.Effect<number, "load-failed", Service | Reactivity.Reactivity>>()

      expect(runtime.query(effect))
        .type.toBe<Atom.Atom<AsyncResult.AsyncResult<number, "load-failed" | "setup-failed">>>()
      expect(runtime.query(() => effect))
        .type.toBe<Atom.Atom<AsyncResult.AsyncResult<number, "load-failed" | "setup-failed">>>()
      expect(Atom.query).type.not.toBeCallableWith(effect)
      expect(Atom.runtime(Layer.empty).query).type.not.toBeCallableWith(effect)
    })

    it("rejects Streams and stream-valued Effects without widening their success type", () => {
      const stream = Stream.make(1)
      const effect = Effect.succeed(stream)
      const mixed = hole<Effect.Effect<number | Stream.Stream<number>>>()
      const runtime = Atom.runtime(Layer.empty)

      expect(Atom.query).type.not.toBeCallableWith(stream)
      expect(Atom.query).type.not.toBeCallableWith(() => stream)
      expect(Atom.query).type.not.toBeCallableWith(effect)
      expect(Atom.query).type.not.toBeCallableWith(() => effect)
      expect(Atom.query).type.not.toBeCallableWith(mixed)
      expect(runtime.query).type.not.toBeCallableWith(stream)
      expect(runtime.query).type.not.toBeCallableWith(effect)
      expect(runtime.query).type.not.toBeCallableWith(() => mixed)
    })
  })

  describe("serializable", () => {
    it("rejects Date values as JSON-encoded input", () => {
      const atom = Atom.serializable(Atom.make(new Date()), { key: "date", schema: Schema.Date })

      expect(atom[Atom.SerializableTypeId].decode).type.not.toBeCallableWith(new Date())
    })
  })

  describe("context", () => {
    it("returns a registry runtime factory by default", () => {
      expect(Atom.context()).type.toBe<Atom.RegistryRuntimeFactory>()
    })

    it("returns a registry runtime factory for an atom-backed memo map", () => {
      const memoMap = Atom.make(() => Layer.makeMemoMapUnsafe())

      expect(Atom.context({ memoMap })).type.toBe<Atom.RegistryRuntimeFactory>()
    })

    it("returns a shared runtime factory for a concrete memo map", () => {
      const memoMap = Layer.makeMemoMapUnsafe()

      expect(Atom.context({ memoMap })).type.toBe<Atom.SharedRuntimeFactory>()
    })
  })

  describe("AtomRuntime.subscriptionRef", () => {
    it("includes the runtime error for an infallible ref", () => {
      const runtime = Atom.runtime(Layer.effectDiscard(Effect.fail("setup-failed" as const)))

      expect(runtime.subscriptionRef(SubscriptionRef.make(1)))
        .type.toBe<Atom.Writable<AsyncResult.AsyncResult<number, "setup-failed">, number>>()
    })

    it("preserves ref errors alongside runtime errors for both input forms", () => {
      const runtime = Atom.runtime(Layer.effectDiscard(Effect.fail("setup-failed" as const)))
      const ref: Effect.Effect<SubscriptionRef.SubscriptionRef<number>, "ref-failed"> = Effect.fail("ref-failed")

      expect(runtime.subscriptionRef(ref))
        .type.toBe<Atom.Writable<AsyncResult.AsyncResult<number, "ref-failed" | "setup-failed">, number>>()
      expect(runtime.subscriptionRef(() => ref))
        .type.toBe<Atom.Writable<AsyncResult.AsyncResult<number, "ref-failed" | "setup-failed">, number>>()
    })
  })

  describe("initialValue", () => {
    it("accepts options only in the data-first form", () => {
      const seed = Atom.make(1)

      expect(Atom.initialValue).type.not.toBeCallableWith(seed, { skipInitialRun: true })
    })
  })

  describe("reactivity keys", () => {
    it("accepts any keys when no keys are declared", () => {
      const keys = hole<ReadonlyArray<unknown>>()
      const runtime = Atom.runtime(Layer.empty)

      expect(Atom.withReactivity).type.toBeCallableWith(keys)
      expect(Atom.withReactivity).type.toBeCallableWith({ anything: [1, { id: 1 }] })
      expect(runtime.fn).type.toBeCallableWith(() => Effect.void, { reactivityKeys: keys })
    })
  })

  describe("serializable", () => {
    it("encodes to and decodes from the JSON representation", () => {
      const atom = Atom.serializable(Atom.make(1n), { key: "bigint", schema: Schema.BigInt })
      const serializable = atom[Atom.SerializableTypeId]

      expect(serializable.encode).type.toBe<(value: bigint) => Schema.Json>()
      expect(serializable.decode).type.toBe<(value: Schema.Json) => bigint>()
    })
  })
})
