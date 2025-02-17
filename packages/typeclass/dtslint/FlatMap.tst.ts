import { FlatMap } from "@effect/typeclass"
import type { HKT } from "effect"
import { pipe } from "effect"
import { describe, expect, it } from "tstyche"

interface RAW<R, E, A> {
  (r: R): () => Promise<readonly [E, A]>
}

interface RAWTypeLambda extends HKT.TypeLambda {
  readonly type: RAW<this["In"], this["Out1"], this["Target"]>
}

declare const FlatMapInstance: FlatMap.FlatMap<RAWTypeLambda>
declare const ffa: RAW<{ a: string }, string, RAW<{ b: number }, number, "a">>

describe("FlatMap", () => {
  it("flatten", () => {
    expect(pipe(ffa, FlatMap.flatten(FlatMapInstance)))
      .type.toBe<RAW<{ b: number } & { a: string }, string | number, "a">>()
  })
})
