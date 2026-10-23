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

    expect(schema.omit(["c", "a"])).type.toBe<Schema.Literals<readonly ["b", "d"]>>()
    expect(schema.omit(["c", "a"]).members).type.toBe<readonly [Schema.Literal<"b">, Schema.Literal<"d">]>()
    expect(schema.omit).type.not.toBeCallableWith(["x"])

    // a widened omission array may not contain every member of its union at runtime
    const omitted: ReadonlyArray<"a" | "b"> = ["a"]
    expect(schema.omit(omitted)).type.toBe<Schema.Literals<ReadonlyArray<"a" | "b" | "c" | "d">>>()

    const widened = Schema.Literals(["a", "b", "c"] as ReadonlyArray<"a" | "b" | "c">)
    expect(widened.omit(["a"])).type.toBe<Schema.Literals<ReadonlyArray<"b" | "c">>>()
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
