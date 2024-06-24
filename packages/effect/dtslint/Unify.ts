import type * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import type * as Micro from "effect/Micro"
import type * as Option from "effect/Option"
import type * as Stream from "effect/Stream"
import * as Unify from "effect/Unify"

// $ExpectType Option<string | number>
export type option = Unify.Unify<Option.Option<number> | Option.Option<string>>

// $ExpectType Either<"RA" | "RB", "LA" | "LB">
export type either = Unify.Unify<Either.Either<"RA", "LA"> | Either.Either<"RB", "LB">>

// $ExpectType 0 | Option<string | number> | Either<"RA" | "RB", "LA" | "LB">
export type both = Unify.Unify<
  Either.Either<"RA", "LA"> | Either.Either<"RB", "LB"> | Option.Option<number> | Option.Option<string> | 0
>

// $ExpectType { [k: string]: string; }
export type obj = Unify.Unify<{ [k: string]: string }>

// $ExpectType <N>(n: N) => Either<N, string>
Unify.unify(<N>(n: N) => Math.random() > 0 ? Either.right(n) : Either.left("ok"))

// $ExpectType Either<number, string>
Unify.unify(Math.random() > 0 ? Either.right(10) : Either.left("ok"))

// $ExpectType Stream<0 | "a", "b" | 1, "c" | 2>
export type SU = Unify.Unify<
  Stream.Stream<0, 1, 2> | Stream.Stream<"a", "b", "c">
>

// $ExpectType Micro<0 | "a", "b" | 1, "c" | 2>
export type MU = Unify.Unify<
  Micro.Micro<0, 1, 2> | Micro.Micro<"a", "b", "c">
>
// $ExpectType Effect<0 | "a", "b" | 1, "c" | 2>
export type EU = Unify.Unify<
  Effect.Effect<0, 1, 2> | Effect.Effect<"a", "b", "c">
>
