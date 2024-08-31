import type * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import type * as Exit from "effect/Exit"
import type * as Micro from "effect/Micro"
import type * as Option from "effect/Option"
import type * as RcRef from "effect/RcRef"
import type * as Ref from "effect/Ref"
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

// $ExpectType 0 | Option<string | number> | Ref<1> | SynchronizedRef<1> | SubscriptionRef<1> | Ref<"A"> | SynchronizedRef<"A"> | SubscriptionRef<"A"> | Either<1 | "A", 0 | "E"> | Effect<1 | "A", 0 | "E", "R" | "R1"> | RcRef<1 | "A", 0 | "E">
export type AllUnify = Unify.Unify<
  | Either.Either<1, 0>
  | Either.Either<"A", "E">
  | Option.Option<number>
  | Option.Option<string>
  | Effect.Effect<"A", "E", "R">
  | Effect.Effect<1, 0, "R1">
  | Ref.Ref<1>
  | Ref.Ref<"A">
  | SynchronizedRef.SynchronizedRef<1>
  | SynchronizedRef.SynchronizedRef<"A">
  | SubscriptionRef.SubscriptionRef<1>
  | SubscriptionRef.SubscriptionRef<"A">
  | RcRef.RcRef<1, 0>
  | RcRef.RcRef<"A", "E">
  | 0
>
