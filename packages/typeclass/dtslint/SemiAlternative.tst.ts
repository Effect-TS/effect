import type { SemiAlternative } from "@effect/typeclass"
import type { HKT } from "effect"
import { describe, expect, it } from "tstyche"

interface RAW<R, E, A> {
  (r: R): () => Promise<readonly [E, A]>
}

interface RAWTypeLambda extends HKT.TypeLambda {
  readonly type: RAW<this["In"], this["Out1"], this["Target"]>
}

declare const fa: RAW<{ a: string }, string, "fa">
declare const fb: RAW<{ b: number }, number, "fb">

declare const SemiAlternativeInstance: SemiAlternative.SemiAlternative<RAWTypeLambda>

describe("SemiAlternative", () => {
  it("coproduct", () => {
    expect(SemiAlternativeInstance.coproduct(fa, fb))
      .type.toBe<RAW<{ a: string } & { b: number }, string | number, "fa" | "fb">>()
  })
})
