import type * as _ from "@effect/typeclass/SemiAlternative"
import type { TypeLambda } from "effect/HKT"

interface RAW<R, E, A> {
  (r: R): () => Promise<readonly [E, A]>
}

interface RAWTypeLambda extends TypeLambda {
  readonly type: RAW<this["In"], this["Out1"], this["Target"]>
}

declare const fa: RAW<{ a: string }, string, "fa">
declare const fb: RAW<{ b: number }, number, "fb">

declare const SemiAlternative: _.SemiAlternative<RAWTypeLambda>

// $ExpectType RAW<{ a: string; } & { b: number; }, string | number, "fa" | "fb">
SemiAlternative.coproduct(fa, fb)
