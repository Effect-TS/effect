import * as Either from "effect/Either"
import type * as Option from "effect/Option"
import * as Unify from "effect/Unify"

// $ExpectType Option<string | number>
export type option = Unify.Unify<Option.Option<number> | Option.Option<string>>

// $ExpectType Either<"LA" | "LB", "RA" | "RB">
export type either = Unify.Unify<Either.Either<"LA", "RA"> | Either.Either<"LB", "RB">>

// $ExpectType 0 | Option<string | number> | Either<"LA" | "LB", "RA" | "RB">
export type both = Unify.Unify<
  Either.Either<"LA", "RA"> | Either.Either<"LB", "RB"> | Option.Option<number> | Option.Option<string> | 0
>

// $ExpectType { [k: string]: string; }
export type obj = Unify.Unify<{ [k: string]: string }>

// $ExpectType <N>(n: N) => Either<string, N>
Unify.unify(<N>(n: N) => Math.random() > 0 ? Either.right(n) : Either.left("ok"))

// $ExpectType Either<string, number>
Unify.unify(Math.random() > 0 ? Either.right(10) : Either.left("ok"))
