import type {
  Context,
  Deferred,
  Effect,
  Exit,
  Fiber,
  FiberRef,
  ManagedRuntime,
  Micro,
  Option,
  Pool,
  Queue,
  RcRef,
  Ref,
  Resource,
  ScopedRef,
  STM,
  Stream,
  SubscriptionRef,
  SynchronizedRef
} from "effect"
import { Either, Unify } from "effect"
import { describe, expect, it } from "tstyche"

describe("Unify", () => {
  describe("Unify", () => {
    it("should unify Context types", () => {
      expect<Unify.Unify<Context.Tag<0, 1> | Context.Tag<"a", "b">>>()
        .type.toBe<Context.Tag<0, 1> | Context.Tag<"a", "b">>()
    })

    it("should unify Option types", () => {
      expect<Unify.Unify<Option.Option<number> | Option.Option<string>>>()
        .type.toBe<Option.Option<string | number>>()
    })

    it("should unify Either types", () => {
      expect<Unify.Unify<Either.Either<"RA", "LA"> | Either.Either<"RB", "LB">>>()
        .type.toBe<Either.Either<"RA" | "RB", "LA" | "LB">>()
    })

    it("should unify a mixed union of Either, Option, and primitive value", () => {
      expect<
        Unify.Unify<
          | Either.Either<"RA", "LA">
          | Either.Either<"RB", "LB">
          | Option.Option<number>
          | Option.Option<string>
          | 0
        >
      >().type.toBe<0 | Option.Option<string | number> | Either.Either<"RA" | "RB", "LA" | "LB">>()
    })

    it("should unify a record type", () => {
      expect<Unify.Unify<{ [k: string]: string }>>()
        .type.toBe<{ [k: string]: string }>()
    })

    it("should unify Stream types", () => {
      expect<Unify.Unify<Stream.Stream<0, 1, 2> | Stream.Stream<"a", "b", "c">>>()
        .type.toBe<Stream.Stream<0 | "a", "b" | 1, "c" | 2>>()
    })

    it("should unify Micro types", () => {
      expect<Unify.Unify<Micro.Micro<0, 1, 2> | Micro.Micro<"a", "b", "c">>>()
        .type.toBe<Micro.Micro<0 | "a", "b" | 1, "c" | 2>>()
    })

    it("should unify Effect types", () => {
      expect<
        Unify.Unify<
          | Effect.Effect<0, 1, 2>
          | Effect.Effect<"a", "b", "c">
        >
      >().type.toBe<Effect.Effect<0 | "a", "b" | 1, "c" | 2>>()
    })

    it("should unify STM types", () => {
      expect<
        Unify.Unify<
          | STM.STM<0, 1, 2>
          | STM.STM<"a", "b", "c">
        >
      >().type.toBe<STM.STM<0 | "a", "b" | 1, "c" | 2>>()
    })

    it("should unify Exit types", () => {
      expect<Unify.Unify<Exit.Exit<0, 1> | Exit.Exit<"a", "b">>>()
        .type.toBe<Exit.Exit<0 | "a", "b" | 1>>()
    })

    it("should unify Ref types", () => {
      expect<Unify.Unify<Ref.Ref<1> | Ref.Ref<"a">>>()
        .type.toBe<Ref.Ref<1> | Ref.Ref<"a">>()
    })

    it("should unify SynchronizedRef types", () => {
      expect<
        Unify.Unify<
          | SynchronizedRef.SynchronizedRef<1>
          | SynchronizedRef.SynchronizedRef<"a">
        >
      >()
        .type.toBe<SynchronizedRef.SynchronizedRef<1> | SynchronizedRef.SynchronizedRef<"a">>()
    })

    it("should unify SubscriptionRef types", () => {
      expect<
        Unify.Unify<
          | SubscriptionRef.SubscriptionRef<1>
          | SubscriptionRef.SubscriptionRef<"a">
        >
      >()
        .type.toBe<SubscriptionRef.SubscriptionRef<1> | SubscriptionRef.SubscriptionRef<"a">>()
    })

    it("should unify RcRef types", () => {
      expect<Unify.Unify<RcRef.RcRef<1, 2> | RcRef.RcRef<"a", "b">>>()
        .type.toBe<RcRef.RcRef<"a" | 1, "b" | 2>>()
    })

    it("should unify Deferred types", () => {
      expect<Unify.Unify<Deferred.Deferred<1, 2> | Deferred.Deferred<"a", "b">>>()
        .type.toBe<Deferred.Deferred<1, 2> | Deferred.Deferred<"a", "b">>()
    })

    it("should unify FiberRef types", () => {
      expect<Unify.Unify<FiberRef.FiberRef<1> | FiberRef.FiberRef<"a">>>()
        .type.toBe<FiberRef.FiberRef<1> | FiberRef.FiberRef<"a">>()
    })

    it("should unify Fiber types", () => {
      expect<Unify.Unify<Fiber.Fiber<1, 2> | Fiber.Fiber<"a", "b">>>()
        .type.toBe<Fiber.Fiber<"a" | 1, "b" | 2>>()
    })

    it("should unify RuntimeFiber types", () => {
      expect<Unify.Unify<Fiber.RuntimeFiber<1, 2> | Fiber.RuntimeFiber<"a", "b">>>()
        .type.toBe<Fiber.RuntimeFiber<"a" | 1, "b" | 2>>()
    })

    it("should unify ManagedRuntime types", () => {
      expect<
        Unify.Unify<
          | ManagedRuntime.ManagedRuntime<1, 2>
          | ManagedRuntime.ManagedRuntime<"a", "b">
        >
      >().type.toBe<ManagedRuntime.ManagedRuntime<1, 2> | ManagedRuntime.ManagedRuntime<"a", "b">>()
    })

    it("should unify Queue types", () => {
      expect<Unify.Unify<Queue.Queue<1> | Queue.Queue<"a">>>()
        .type.toBe<Queue.Queue<1> | Queue.Queue<"a">>()
    })

    it("should unify Dequeue types", () => {
      expect<Unify.Unify<Queue.Dequeue<1> | Queue.Dequeue<"a">>>()
        .type.toBe<Queue.Dequeue<"a" | 1>>()
    })

    it("should unify Pool types", () => {
      expect<
        Unify.Unify<
          | Pool.Pool<1, 2>
          | Pool.Pool<"a", "b">
          | Pool.Pool<"a", "c">
        >
      >()
        .type.toBe<Pool.Pool<1, 2> | Pool.Pool<"a", "b" | "c">>()
    })

    it("should unify ScopedRef types", () => {
      expect<Unify.Unify<ScopedRef.ScopedRef<1> | ScopedRef.ScopedRef<"a">>>()
        .type.toBe<ScopedRef.ScopedRef<1> | ScopedRef.ScopedRef<"a">>()
    })

    it("should unify Resource types", () => {
      expect<
        Unify.Unify<
          | Resource.Resource<1>
          | Resource.Resource<never, 2>
          | Resource.Resource<1, 2>
          | Resource.Resource<"a", "b">
          | Resource.Resource<any, any>
        >
      >()
        .type.toBe<
        | Resource.Resource<1, never>
        | Resource.Resource<never, 2>
        | Resource.Resource<1, 2>
        | Resource.Resource<"a", "b">
        | Resource.Resource<any, any>
      >()
    })

    it("should unify a huge union", () => {
      expect<
        Unify.Unify<
          | Context.Tag<0, 1>
          | Context.Tag<"a", "b">
          | Either.Either<1, 0>
          | Either.Either<"a", "b">
          | Option.Option<number>
          | Option.Option<string>
          | Effect.Effect<"a", "b", "R">
          | Effect.Effect<1, 0, "R1">
          | STM.STM<0, 1, 2>
          | STM.STM<"a", "b", "c">
          | Ref.Ref<1>
          | Ref.Ref<"a">
          | SynchronizedRef.SynchronizedRef<1>
          | SynchronizedRef.SynchronizedRef<"a">
          | SubscriptionRef.SubscriptionRef<1>
          | SubscriptionRef.SubscriptionRef<"a">
          | RcRef.RcRef<1, 0>
          | RcRef.RcRef<"a", "b">
          | Deferred.Deferred<1, 0>
          | Deferred.Deferred<"a", "b">
          | FiberRef.FiberRef<1>
          | FiberRef.FiberRef<"a">
          | Fiber.Fiber<1, 0>
          | Fiber.Fiber<"a", "b">
          | Fiber.RuntimeFiber<1, 0>
          | Fiber.RuntimeFiber<"a", "b">
          | Queue.Queue<1>
          | Queue.Queue<"a">
          | Queue.Dequeue<1>
          | Queue.Dequeue<"a">
          | Pool.Pool<1, 2>
          | Pool.Pool<"a", "b">
          | Pool.Pool<"a", "c">
          | ScopedRef.ScopedRef<1>
          | ScopedRef.ScopedRef<"a">
          | Resource.Resource<1, 0>
          | Resource.Resource<"a", "b">
          | Effect.Latch
          | ManagedRuntime.ManagedRuntime<1, 0>
          | ManagedRuntime.ManagedRuntime<"a", "b">
          | 0
        >
      >()
        .type.toBe<
        | Context.Tag<0, 1>
        | Context.Tag<"a", "b">
        | 0
        | Option.Option<string | number>
        | STM.STM<0 | "a", "b" | 1, "c" | 2>
        | Ref.Ref<1>
        | Ref.Ref<"a">
        | SynchronizedRef.SynchronizedRef<1>
        | SynchronizedRef.SynchronizedRef<"a">
        | SubscriptionRef.SubscriptionRef<1>
        | SubscriptionRef.SubscriptionRef<"a">
        | Deferred.Deferred<"a", "b">
        | FiberRef.FiberRef<1>
        | FiberRef.FiberRef<"a">
        | ManagedRuntime.ManagedRuntime<"a", "b">
        | Queue.Queue<1>
        | Queue.Queue<"a">
        | Queue.Dequeue<"a" | 1>
        | Pool.Pool<1, 2>
        | Pool.Pool<"a", "b" | "c">
        | ScopedRef.ScopedRef<1>
        | ScopedRef.ScopedRef<"a">
        | Resource.Resource<"a", "b">
        | Deferred.Deferred<1, 0>
        | Resource.Resource<1, 0>
        | Effect.Latch
        | ManagedRuntime.ManagedRuntime<1, 0>
        | RcRef.RcRef<"a" | 1, 0 | "b">
        | Fiber.Fiber<"a" | 1, 0 | "b">
        | Fiber.RuntimeFiber<"a" | 1, 0 | "b">
        | Either.Either<"a" | 1, 0 | "b">
        | Effect.Effect<"a" | 1, 0 | "b", "R" | "R1">
      >()
    })
  })

  describe("unify", () => {
    it("should infer the type of Unify.unify for a function", () => {
      function f<N>(n: N) {
        return Math.random() > 0 ? Either.right(n) : Either.left("ok")
      }
      type Expected = <N>(n: N) => Either.Either<N, string>
      expect(Unify.unify(f))
        .type.toBe<Expected>()
    })

    it("should unify a value using Unify.unify", () => {
      expect(
        Unify.unify(Math.random() > 0 ? Either.right(10) : Either.left("ok"))
      ).type.toBe<Either.Either<number, string>>()
    })
  })
})
