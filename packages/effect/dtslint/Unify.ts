import * as Option from 'effect/Option'
import * as Either from 'effect/Either'
import * as Unify from 'effect/Unify'

// $ExpectType Option<string | number>
type option = Unify.Unify<Option.Option<number> | Option.Option<string>>

// $ExpectType Either<"LA" | "LB", "RA" | "RB">
type either = Unify.Unify<Either.Either<"LA", "RA"> | Either.Either<"LB", "RB">>

// $ExpectType 0 | Option<string | number> | Either<"LA" | "LB", "RA" | "RB">
type both = Unify.Unify<Either.Either<"LA", "RA"> | Either.Either<"LB", "RB"> | Option.Option<number> | Option.Option<string> | 0>

// $ExpectType { [k: string]: string; }
type obj = Unify.Unify<{ [k: string]: string }>

// $ExpectType <N>(n: N) => Either<string, N>
const b = Unify.unify(<N>(n: N) => Math.random() > 0 ? Either.right(n) : Either.left("ok"))

// $ExpectType Either<string, number>
const c = Unify.unify(Math.random() > 0 ? Either.right(10) : Either.left("ok"))
