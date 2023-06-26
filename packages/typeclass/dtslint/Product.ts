import * as _ from "@effect/data/typeclass/Product"
import type { TypeLambda } from "@effect/data/HKT"

interface RAW<R, E, A> {
  (r: R): () => Promise<readonly [E, A]>
}

interface RAWTypeLambda extends TypeLambda {
  readonly type: RAW<this["In"], this["Out1"], this["Target"]>
}

declare const fa: RAW<{ a: string }, "a", string>
declare const fb: RAW<{ b: number }, "b", number>
declare const fc: RAW<{ c: boolean }, "c", boolean>

export declare const Product: _.Product<RAWTypeLambda>

// $ExpectType RAW<{ a: string; } & { b: number; } & { c: boolean; }, "a" | "b" | "c", [string, number, boolean]>
_.tuple(Product)(fa, fb, fc)

// $ExpectType RAW<{ a: string; } & { b: number; } & { c: boolean; }, "a" | "b" | "c", { fa: string; fb: number; fc: boolean; }>
_.struct(Product)({ fa, fb, fc })

_.tuple(Product)() // should allow empty tuple
_.struct(Product)({}) // should allow empty structs
