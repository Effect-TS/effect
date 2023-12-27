import * as _ from "@effect/typeclass/FlatMap"
import type { TypeLambda } from "effect/HKT"
import { pipe } from "effect/Function"

interface RAW<R, E, A> {
  (r: R): () => Promise<readonly [E, A]>
}

interface RAWTypeLambda extends TypeLambda {
  readonly type: RAW<this["In"], this["Out1"], this["Target"]>
}

declare const FlatMap: _.FlatMap<RAWTypeLambda>

declare const ffa: RAW<{ a: string }, string, RAW<{ b: number }, number, 'a'>>

// $ExpectType RAW<{ b: number; } & { a: string; }, string | number, "a">
pipe(ffa, _.flatten(FlatMap))
