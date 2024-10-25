import type * as Deferred from "effect/Deferred"
import type * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import type * as Exit from "effect/Exit"
import type * as Fiber from "effect/Fiber"
import type * as FiberRef from "effect/FiberRef"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import type * as Micro from "effect/Micro"
import type * as Option from "effect/Option"
import type * as Pool from "effect/Pool"
import type * as Queue from "effect/Queue"
import type * as RcRef from "effect/RcRef"
import type * as Ref from "effect/Ref"
import type * as Resource from "effect/Resource"
import type * as ScopedRef from "effect/ScopedRef"
import type * as Stream from "effect/Stream"
import type * as SubscriptionRef from "effect/SubscriptionRef"
import type * as SynchronizedRef from "effect/SynchronizedRef"
import * as Unify from "effect/Unify"

// $ExpectType Option<string | number>
export type OptionUnify = Unify.Unify<Option.Option<number> | Option.Option<string>>

// $ExpectType Either<"RA" | "RB", "LA" | "LB">
export type EitherUnify = Unify.Unify<Either.Either<"RA", "LA"> | Either.Either<"RB", "LB">>

// $ExpectType 0 | Option<string | number> | Either<"RA" | "RB", "LA" | "LB">
export type EitherOptionUnify = Unify.Unify<
  Either.Either<"RA", "LA"> | Either.Either<"RB", "LB"> | Option.Option<number> | Option.Option<string> | 0
>

// $ExpectType { [k: string]: string; }
export type obj = Unify.Unify<{ [k: string]: string }>

// $ExpectType <N>(n: N) => Either<N, string>
Unify.unify(<N>(n: N) => Math.random() > 0 ? Either.right(n) : Either.left("ok"))

// $ExpectType Either<number, string>
Unify.unify(Math.random() > 0 ? Either.right(10) : Either.left("ok"))

// $ExpectType Stream<0 | "a", "b" | 1, "c" | 2>
export type StreamUnify = Unify.Unify<
  Stream.Stream<0, 1, 2> | Stream.Stream<"a", "b", "c">
>

// $ExpectType Micro<0 | "a", "b" | 1, "c" | 2>
export type MicroUnify = Unify.Unify<
  Micro.Micro<0, 1, 2> | Micro.Micro<"a", "b", "c">
>
// $ExpectType EnvRef<0 | "a">
export type MicroEnvRefUnify = Unify.Unify<
  Micro.EnvRef<0> | Micro.EnvRef<"a">
>
// $ExpectType Handle<0 | "a", "b" | 1>
export type MicroHandleUnify = Unify.Unify<
  Micro.Handle<0, 1> | Micro.Handle<"a", "b">
>
// $ExpectType Effect<0 | "a", "b" | 1, "c" | 2>
export type EffectUnify = Unify.Unify<
  | Effect.Effect<0, 1, 2>
  | Effect.Effect<"a", "b", "c">
>
// $ExpectType Exit<0 | "a", "b" | 1>
export type ExitUnify = Unify.Unify<
  | Exit.Exit<0, 1>
  | Exit.Exit<"a", "b">
>
// $ExpectType Ref<1> | Ref<"a">
export type RefUnify = Unify.Unify<Ref.Ref<1> | Ref.Ref<"a">>
// $ExpectType SynchronizedRef<1> | SynchronizedRef<"a">
export type SynchronizedRefUnify = Unify.Unify<
  | SynchronizedRef.SynchronizedRef<1>
  | SynchronizedRef.SynchronizedRef<"a">
>
// $ExpectType SubscriptionRef<1> | SubscriptionRef<"a">
export type SubscriptionRefUnify = Unify.Unify<
  | SubscriptionRef.SubscriptionRef<1>
  | SubscriptionRef.SubscriptionRef<"a">
>
// $ExpectType RcRef<"a" | 1, "b" | 2>
export type RcRefUnify = Unify.Unify<
  | RcRef.RcRef<1, 2>
  | RcRef.RcRef<"a", "b">
>
// $ExpectType Deferred<1, 2> | Deferred<"a", "b">
export type DeferredUnify = Unify.Unify<
  | Deferred.Deferred<1, 2>
  | Deferred.Deferred<"a", "b">
>
// $ExpectType FiberRef<1> | FiberRef<"a">
export type FiberRefUnify = Unify.Unify<
  | FiberRef.FiberRef<1>
  | FiberRef.FiberRef<"a">
>
// $ExpectType Fiber<"a" | 1, "b" | 2>
export type FiberUnify = Unify.Unify<
  | Fiber.Fiber<1, 2>
  | Fiber.Fiber<"a", "b">
>
// $ExpectType RuntimeFiber<"a" | 1, "b" | 2>
export type RuntimeFiberUnify = Unify.Unify<
  | Fiber.RuntimeFiber<1, 2>
  | Fiber.RuntimeFiber<"a", "b">
>
// $ExpectType ManagedRuntime<1, 2> | ManagedRuntime<"a", "b">
export type ManagedRuntimeUnify = Unify.Unify<
  | ManagedRuntime.ManagedRuntime<1, 2>
  | ManagedRuntime.ManagedRuntime<"a", "b">
>
// $ExpectType Queue<1> | Queue<"a">
export type QueueUnify = Unify.Unify<
  | Queue.Queue<1>
  | Queue.Queue<"a">
>
// $ExpectType Dequeue<"a" | 1>
export type DequeueUnify = Unify.Unify<
  | Queue.Dequeue<1>
  | Queue.Dequeue<"a">
>
// $ExpectType Pool<1, 2> | Pool<"a", "b" | "c">
export type PoolUnify = Unify.Unify<
  | Pool.Pool<1, 2>
  | Pool.Pool<"a", "b">
  | Pool.Pool<"a", "c">
>

// $ExpectType ScopedRef<1> | ScopedRef<"a">
export type ScopedRefUnify = Unify.Unify<
  | ScopedRef.ScopedRef<1>
  | ScopedRef.ScopedRef<"a">
>
// $ExpectType Resource<1, never> | Resource<never, 2> | Resource<1, 2> | Resource<"a", "b"> | Resource<any, any>
export type ResourceUnify = Unify.Unify<
  | Resource.Resource<1>
  | Resource.Resource<never, 2>
  | Resource.Resource<1, 2>
  | Resource.Resource<"a", "b">
  | Resource.Resource<any, any>
>

// $ExpectType 0 | Option<string | number> | Ref<1> | Ref<"a"> | SynchronizedRef<1> | SynchronizedRef<"a"> | SubscriptionRef<1> | SubscriptionRef<"a"> | Deferred<"a", "b"> | FiberRef<1> | FiberRef<"a"> | ManagedRuntime<"a", "b"> | Queue<1> | Queue<"a"> | Dequeue<"a" | 1> | Pool<1, 2> | Pool<"a", "b" | "c"> | ScopedRef<1> | ScopedRef<"a"> | Resource<"a", "b"> | Deferred<1, 0> | Resource<1, 0> | Latch | ManagedRuntime<1, 0> | RcRef<"a" | 1, 0 | "b"> | Fiber<"a" | 1, 0 | "b"> | RuntimeFiber<"a" | 1, 0 | "b"> | Either<"a" | 1, 0 | "b"> | Effect<"a" | 1, 0 | "b", "R" | "R1">
export type AllUnify = Unify.Unify<
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
