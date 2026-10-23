import type { Brand } from "effect"
import { Schema, Tuple } from "effect"
import { describe, expect, it } from "tstyche"

describe("Literals", () => {
  it("revealCodec + annotate", () => {
    const schema = Schema.Literals(["a", "b", "c"])

    expect(schema.literals).type.toBe<readonly ["a", "b", "c"]>()
    expect(schema.members).type.toBe<
      readonly [Schema.Literal<"a">, Schema.Literal<"b">, Schema.Literal<"c">]
    >()

    expect(Schema.revealCodec(schema)).type.toBe<
      Schema.Codec<"a" | "b" | "c", "a" | "b" | "c", never, never>
    >()
    expect(schema).type.toBe<Schema.Literals<readonly ["a", "b", "c"]>>()
    expect(schema.annotate({})).type.toBe<Schema.Literals<readonly ["a", "b", "c"]>>()

    expect(schema).type.toBeAssignableTo<
      Schema.Union<readonly [Schema.Literal<"a">, Schema.Literal<"b">, Schema.Literal<"c">]>
    >()
  })

  it("mapMembers", () => {
    const schema = Schema.Literals(["a", "b", "c"]).mapMembers(Tuple.evolve([
      (a) => Schema.Struct({ _tag: a, a: Schema.String }),
      (b) => Schema.Struct({ _tag: b, b: Schema.Number }),
      (c) => Schema.Struct({ _tag: c, c: Schema.Boolean })
    ]))

    expect(Schema.revealCodec(schema)).type.toBe<
      Schema.Codec<
        { readonly _tag: "a"; readonly a: string } | { readonly _tag: "b"; readonly b: number } | {
          readonly _tag: "c"
          readonly c: boolean
        },
        { readonly _tag: "a"; readonly a: string } | { readonly _tag: "b"; readonly b: number } | {
          readonly _tag: "c"
          readonly c: boolean
        },
        never,
        never
      >
    >()
  })

  it("omit", () => {
    const schema = Schema.Literals(["a", "b", "c", "d"])

    expect(schema.omit(["c", "a"])).type.toBe<Schema.Literals<ReadonlyArray<"b" | "d">>>()
    expect(schema.omit(["c", "a"]).members).type.toBe<ReadonlyArray<Schema.Literal<"b" | "d">>>()
    expect(schema.omit([])).type.toBe<Schema.Literals<ReadonlyArray<"a" | "b" | "c" | "d">>>()
    expect(schema.omit(["a", "b", "c", "d"])).type.toBe<Schema.Literals<ReadonlyArray<never>>>()
    expect(schema.omit).type.not.toBeCallableWith(["x"])

    // a widened omission array may not contain every member of its union at runtime
    const omitted: ReadonlyArray<"a" | "b"> = ["a"]
    expect(schema.omit(omitted)).type.toBe<Schema.Literals<ReadonlyArray<"a" | "b" | "c" | "d">>>()

    // likewise for an omitted tuple element typed as a union
    const ab = "a" as "a" | "b"
    expect(schema.omit([ab])).type.toBe<Schema.Literals<ReadonlyArray<"a" | "b" | "c" | "d">>>()

    // and for a union of omission tuples
    const conditional = ["a"] as readonly ["a"] | readonly ["b"]
    expect(schema.omit(conditional)["Type"]).type.toBe<"a" | "b" | "c" | "d">()

    // and for an omitted element typed as a branded number or bigint
    type Id = number & Brand.Brand<"Id">
    expect(Schema.Literals([1 as Id, 2 as Id, "other"]).omit([1 as Id])["Type"]).type.toBe<Id | "other">()
    type BigId = bigint & Brand.Brand<"BigId">
    expect(Schema.Literals([1n as BigId, 2n as BigId, "other"]).omit([1n as BigId])["Type"]).type.toBe<
      BigId | "other"
    >()

    // a parent element typed as a union may or may not be omitted at runtime
    expect(Schema.Literals([ab, "c"]).omit(["a"])).type.toBe<Schema.Literals<ReadonlyArray<"b" | "c">>>()

    // a branded parent element may share its runtime value with an omitted literal
    expect(Schema.Literals([1 as Id, 1, "other"]).omit([1])).type.toBe<Schema.Literals<ReadonlyArray<Id | "other">>>()

    const widened = Schema.Literals(["a", "b", "c"] as ReadonlyArray<"a" | "b" | "c">)
    expect(widened.omit(["a"])).type.toBe<Schema.Literals<ReadonlyArray<"b" | "c">>>()

    // must not hit the instantiation limit with many literals
    type Many<N extends number, Acc extends Array<string> = []> = Acc["length"] extends N ? Acc
      : Many<N, [...Acc, `k${Acc["length"]}`]>
    const many = Schema.Literals([] as unknown as Many<240>)
    expect(many.omit(["k0", "k239"])["Type"]).type.toBe<Exclude<(typeof many)["Type"], "k0" | "k239">>()
  })

  it("transform", () => {
    const schema = Schema.Literals([0, 1]).transform(["a", "b"])
    expect(schema).type.toBe<
      Schema.Union<
        readonly [
          Schema.decodeTo<Schema.Literal<"a">, Schema.Literal<0>>,
          Schema.decodeTo<Schema.Literal<"b">, Schema.Literal<1>>
        ]
      >
    >()
  })
})
