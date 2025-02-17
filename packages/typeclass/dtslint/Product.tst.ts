import { Product } from "@effect/typeclass"
import type { HKT } from "effect"
import { describe, expect, it } from "tstyche"

interface RAW<R, E, A> {
  (r: R): () => Promise<readonly [E, A]>
}

interface RAWTypeLambda extends HKT.TypeLambda {
  readonly type: RAW<this["In"], this["Out1"], this["Target"]>
}

declare const fa: RAW<{ a: string }, "a", string>
declare const fb: RAW<{ b: number }, "b", number>
declare const fc: RAW<{ c: boolean }, "c", boolean>

declare const ProductInstance: Product.Product<RAWTypeLambda>

describe("Product", () => {
  it("tuple", () => {
    expect(Product.tuple(ProductInstance)(fa, fb, fc))
      .type.toBe<RAW<{ a: string } & { b: number } & { c: boolean }, "a" | "b" | "c", [string, number, boolean]>>()
    // should allow empty tuple
    expect(Product.tuple(ProductInstance)()).type.toBe<RAW<unknown, never, []>>()
  })

  it("struct", () => {
    expect(Product.struct(ProductInstance)({ fa, fb, fc }))
      .type.toBe<
      RAW<{ a: string } & { b: number } & { c: boolean }, "a" | "b" | "c", { fa: string; fb: number; fc: boolean }>
    >()
    // should allow empty structs
    expect(Product.struct(ProductInstance)({})).type.toBe<RAW<unknown, never, {}>>()
  })
})
