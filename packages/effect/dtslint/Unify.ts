import type * as Deferred from "effect/Deferred"
import type * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import type * as Exit from "effect/Exit"
import type * as Fiber from "effect/Fiber"
import type * as FiberRef from "effect/FiberRef"
import { hole } from "effect/Function"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import type * as Micro from "effect/Micro"
import type * as Option from "effect/Option"
import type * as Pool from "effect/Pool"
import type * as Queue from "effect/Queue"
import type * as RcRef from "effect/RcRef"
import type * as Ref from "effect/Ref"
import type * as Resource from "effect/Resource"
import type * as ScopedRef from "effect/ScopedRef"
import type * as STM from "effect/STM"
import type * as Stream from "effect/Stream"
import type * as SubscriptionRef from "effect/SubscriptionRef"
import type * as SynchronizedRef from "effect/SynchronizedRef"
import * as Unify from "effect/Unify"

// $ExpectType Option<string | number>
hole<Unify.Unify<Option.Option<number> | Option.Option<string>>>()

// $ExpectType Either<"RA" | "RB", "LA" | "LB">
hole<Unify.Unify<Either.Either<"RA", "LA"> | Either.Either<"RB", "LB">>>()

// $ExpectType 0 | Option<string | number> | Either<"RA" | "RB", "LA" | "LB">
hole<
  Unify.Unify<
    Either.Either<"RA", "LA"> | Either.Either<"RB", "LB"> | Option.Option<number> | Option.Option<string> | 0
  >
>()

// $ExpectType { [k: string]: string; }
hole<Unify.Unify<{ [k: string]: string }>>()

// $ExpectType <N>(n: N) => Either<N, string>
Unify.unify(<N>(n: N) => Math.random() > 0 ? Either.right(n) : Either.left("ok"))

// $ExpectType Either<number, string>
Unify.unify(Math.random() > 0 ? Either.right(10) : Either.left("ok"))

// $ExpectType Stream<0 | "a", "b" | 1, "c" | 2>
hole<
  Unify.Unify<
    Stream.Stream<0, 1, 2> | Stream.Stream<"a", "b", "c">
  >
>()

// $ExpectType Micro<0 | "a", "b" | 1, "c" | 2>
hole<
  Unify.Unify<
    Micro.Micro<0, 1, 2> | Micro.Micro<"a", "b", "c">
  >
>()

// $ExpectType Effect<0 | "a", "b" | 1, "c" | 2>
hole<
  Unify.Unify<
    | Effect.Effect<0, 1, 2>
    | Effect.Effect<"a", "b", "c">
  >
>()
// $ExpectType STM<0 | "a", "b" | 1, "c" | 2>
hole<
  Unify.Unify<
    | STM.STM<0, 1, 2>
    | STM.STM<"a", "b", "c">
  >
>()

// $ExpectType Exit<0 | "a", "b" | 1>
hole<
  Unify.Unify<
    | Exit.Exit<0, 1>
    | Exit.Exit<"a", "b">
  >
>()

// $ExpectType Ref<1> | Ref<"a">
hole<Unify.Unify<Ref.Ref<1> | Ref.Ref<"a">>>()

// $ExpectType SynchronizedRef<1> | SynchronizedRef<"a">
hole<
  Unify.Unify<
    | SynchronizedRef.SynchronizedRef<1>
    | SynchronizedRef.SynchronizedRef<"a">
  >
>()

// $ExpectType SubscriptionRef<1> | SubscriptionRef<"a">
hole<
  Unify.Unify<
    | SubscriptionRef.SubscriptionRef<1>
    | SubscriptionRef.SubscriptionRef<"a">
  >
>()

// $ExpectType RcRef<"a" | 1, "b" | 2>
hole<
  Unify.Unify<
    | RcRef.RcRef<1, 2>
    | RcRef.RcRef<"a", "b">
  >
>()

// $ExpectType Deferred<1, 2> | Deferred<"a", "b">
hole<
  Unify.Unify<
    | Deferred.Deferred<1, 2>
    | Deferred.Deferred<"a", "b">
  >
>()

// $ExpectType FiberRef<1> | FiberRef<"a">
hole<
  Unify.Unify<
    | FiberRef.FiberRef<1>
    | FiberRef.FiberRef<"a">
  >
>()

// $ExpectType Fiber<"a" | 1, "b" | 2>
hole<
  Unify.Unify<
    | Fiber.Fiber<1, 2>
    | Fiber.Fiber<"a", "b">
  >
>()

// $ExpectType RuntimeFiber<"a" | 1, "b" | 2>
hole<
  Unify.Unify<
    | Fiber.RuntimeFiber<1, 2>
    | Fiber.RuntimeFiber<"a", "b">
  >
>()

// $ExpectType ManagedRuntime<1, 2> | ManagedRuntime<"a", "b">
hole<
  Unify.Unify<
    | ManagedRuntime.ManagedRuntime<1, 2>
    | ManagedRuntime.ManagedRuntime<"a", "b">
  >
>()

// $ExpectType Queue<1> | Queue<"a">
hole<
  Unify.Unify<
    | Queue.Queue<1>
    | Queue.Queue<"a">
  >
>()

// $ExpectType Dequeue<"a" | 1>
hole<
  Unify.Unify<
    | Queue.Dequeue<1>
    | Queue.Dequeue<"a">
  >
>()

// $ExpectType Pool<1, 2> | Pool<"a", "b" | "c">
hole<
  Unify.Unify<
    | Pool.Pool<1, 2>
    | Pool.Pool<"a", "b">
    | Pool.Pool<"a", "c">
  >
>()

// $ExpectType ScopedRef<1> | ScopedRef<"a">
hole<
  Unify.Unify<
    | ScopedRef.ScopedRef<1>
    | ScopedRef.ScopedRef<"a">
  >
>()

// $ExpectType Resource<1, never> | Resource<never, 2> | Resource<1, 2> | Resource<"a", "b"> | Resource<any, any>
hole<
  Unify.Unify<
    | Resource.Resource<1>
    | Resource.Resource<never, 2>
    | Resource.Resource<1, 2>
    | Resource.Resource<"a", "b">
    | Resource.Resource<any, any>
  >
>()

// $ExpectType 0 | Option<string | number> | Ref<1> | Ref<"a"> | SynchronizedRef<1> | SynchronizedRef<"a"> | SubscriptionRef<1> | SubscriptionRef<"a"> | Deferred<"a", "b"> | FiberRef<1> | FiberRef<"a"> | ManagedRuntime<"a", "b"> | Queue<1> | Queue<"a"> | Dequeue<"a" | 1> | Pool<1, 2> | Pool<"a", "b" | "c"> | ScopedRef<1> | ScopedRef<"a"> | Resource<"a", "b"> | Deferred<1, 0> | Resource<1, 0> | Latch | ManagedRuntime<1, 0> | RcRef<"a" | 1, 0 | "b"> | Fiber<"a" | 1, 0 | "b"> | RuntimeFiber<"a" | 1, 0 | "b"> | Either<"a" | 1, 0 | "b"> | Effect<"a" | 1, 0 | "b", "R" | "R1">
hole<
  Unify.Unify<
    | Either.Either<1, 0>
    | Either.Either<"a", "b">
    | Option.Option<number>
    | Option.Option<string>
    | Effect.Effect<"a", "b", "R">
    | Effect.Effect<1, 0, "R1">
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
