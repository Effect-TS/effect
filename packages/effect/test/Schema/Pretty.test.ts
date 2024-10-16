import { isUnknown } from "effect/Predicate"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("Pretty", () => {
  it("make", () => {
    const schema = S.NumberFromString
    const pretty = Pretty.make(schema)
    expect(pretty(1)).toEqual(`1`)
  })

  it("make(S.encodedSchema(schema))", () => {
    const schema = S.NumberFromString
    const pretty = Pretty.make(S.encodedSchema(schema))
    expect(pretty("a")).toEqual(`"a"`)
  })

  it("should throw on declarations without annotations", () => {
    const schema = S.declare(isUnknown)
    expect(() => Pretty.make(schema)).toThrow(
      new Error(`Missing annotation
details: Generating a Pretty for this schema requires a "pretty" annotation
schema (Declaration): <declaration schema>`)
    )
  })

  it("should throw on never", () => {
    const schema = S.Never
    const pretty = Pretty.make(schema)
    expect(() => pretty("a" as any as never)).toThrow(
      new Error("Cannot pretty print a `never` value")
    )
  })

  it("the errors should disply a path", () => {
    expect(() => Pretty.make(S.Tuple(S.declare(isUnknown)))).toThrow(
      new Error(`Missing annotation
at path: [0]
details: Generating a Pretty for this schema requires a "pretty" annotation
schema (Declaration): <declaration schema>`)
    )
    expect(() => Pretty.make(S.Struct({ a: S.declare(isUnknown) }))).toThrow(
      new Error(`Missing annotation
at path: ["a"]
details: Generating a Pretty for this schema requires a "pretty" annotation
schema (Declaration): <declaration schema>`)
    )
  })

  it("should allow for custom compilers", () => {
    const match: typeof Pretty.match = {
      ...Pretty.match,
      "BooleanKeyword": () => (b: boolean) => b ? "True" : "False"
    }
    const go = AST.getCompiler(match)
    const pretty = <A>(schema: S.Schema<A>) => (a: A): string => go(schema.ast, [])(a)
    expect(pretty(S.Boolean)(true)).toEqual(`True`)
    const schema = S.Tuple(S.String, S.Boolean)
    expect(pretty(schema)(["a", true])).toEqual(`["a", True]`)
  })

  describe("templateLiteral", () => {
    it("a${string}b", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b"))
      const pretty = Pretty.make(schema)
      expect(pretty("acb")).toEqual(`"acb"`)
    })
  })

  it("unknown", () => {
    const schema = S.Unknown
    const pretty = Pretty.make(schema)
    expect(pretty("a")).toEqual(`"a"`)
    expect(pretty(1n)).toEqual(`1n`)
  })

  it("string", () => {
    const schema = S.String
    const pretty = Pretty.make(schema)
    expect(pretty("a")).toEqual(`"a"`)
  })

  it("number", () => {
    const schema = S.Number
    const pretty = Pretty.make(schema)
    expect(pretty(1)).toEqual("1")
    expect(pretty(NaN)).toEqual("NaN")
    expect(pretty(Infinity)).toEqual("Infinity")
    expect(pretty(-Infinity)).toEqual("-Infinity")
  })

  it("boolean", () => {
    const schema = S.Boolean
    const pretty = Pretty.make(schema)
    expect(pretty(true)).toEqual("true")
  })

  it("bigint", () => {
    const pretty = Pretty.make(S.BigIntFromSelf)
    expect(pretty(1n)).toEqual("1n")
  })

  it("symbol", () => {
    const pretty = Pretty.make(S.SymbolFromSelf)
    expect(pretty(Symbol.for("effect/test/a"))).toEqual("Symbol(effect/test/a)")
  })

  it("void", () => {
    const pretty = Pretty.make(S.Void)
    expect(pretty(undefined)).toEqual("void(0)")
  })

  describe("literal", () => {
    it("null", () => {
      const schema = S.Literal(null)
      const pretty = Pretty.make(schema)
      expect(pretty(null)).toEqual("null")
    })

    it("bigint", () => {
      const schema = S.Literal(1n)
      const pretty = Pretty.make(schema)
      expect(pretty(1n)).toEqual("1n")
    })
  })

  it("uniqueSymbolFromSelf", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const schema = S.UniqueSymbolFromSelf(a)
    const pretty = Pretty.make(schema)
    expect(pretty(a)).toEqual("Symbol(effect/Schema/test/a)")
  })

  describe("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.Enums(Fruits)
      const pretty = Pretty.make(schema)
      expect(pretty(Fruits.Apple)).toEqual(`0`)
      expect(pretty(Fruits.Banana)).toEqual(`1`)
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.Enums(Fruits)
      const pretty = Pretty.make(schema)
      expect(pretty(Fruits.Apple)).toEqual(`"apple"`)
      expect(pretty(Fruits.Banana)).toEqual(`"banana"`)
      expect(pretty(Fruits.Cantaloupe)).toEqual(`0`)
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.Enums(Fruits)
      const pretty = Pretty.make(schema)
      expect(pretty(Fruits.Apple)).toEqual(`"apple"`)
      expect(pretty(Fruits.Banana)).toEqual(`"banana"`)
      expect(pretty(Fruits.Cantaloupe)).toEqual(`3`)
    })
  })

  describe("struct", () => {
    it("empty", () => {
      const schema = S.Struct({})
      const pretty = Pretty.make(schema)
      expect(pretty({})).toEqual(
        "{}"
      )
    })

    it("required fields", () => {
      const schema = S.Struct({ a: S.String, b: S.Number })
      const pretty = Pretty.make(schema)
      expect(pretty({ a: "a", b: 1 })).toEqual(
        `{ "a": "a", "b": 1 }`
      )
    })

    it("should not output exact optional property signatures", () => {
      const schema = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      const pretty = Pretty.make(schema)
      expect(pretty({})).toEqual("{}")
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
    })

    it("should escape keys", () => {
      const schema = S.Struct({ "-": S.Number })
      const pretty = Pretty.make(schema)
      expect(pretty({ "-": 1 })).toEqual(`{ "-": 1 }`)
    })

    it("required property signature", () => {
      const schema = S.Struct({ a: S.Number })
      const pretty = Pretty.make(schema)
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
      const x = { a: 1, b: "b" }
      expect(pretty(x)).toEqual(`{ "a": 1 }`)
    })

    it("required property signature with undefined", () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      const pretty = Pretty.make(schema)
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
      expect(pretty({ a: undefined })).toEqual(`{ "a": undefined }`)
      const x = { a: 1, b: "b" }
      expect(pretty(x)).toEqual(`{ "a": 1 }`)
    })

    it("exact optional property signature", () => {
      const schema = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      const pretty = Pretty.make(schema)
      expect(pretty({})).toEqual(`{}`)
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
      const x = { a: 1, b: "b" }
      expect(pretty(x)).toEqual(`{ "a": 1 }`)
    })

    it("exact optional property signature with undefined", () => {
      const schema = S.Struct({ a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true }) })
      const pretty = Pretty.make(schema)
      expect(pretty({})).toEqual(`{}`)
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
      const x = { a: 1, b: "b" }
      expect(pretty(x)).toEqual(`{ "a": 1 }`)
      expect(pretty({ a: undefined })).toEqual(`{ "a": undefined }`)
    })

    it("extend: struct and record", () => {
      const schema = S.Struct({ a: S.String }, S.Record({ key: S.String, value: S.Union(S.String, S.Number) }))
      const pretty = Pretty.make(schema)
      expect(pretty({ a: "a" })).toEqual(`{ "a": "a" }`)
      expect(pretty({ a: "a", b: "b", c: 1 })).toEqual(`{ "a": "a", "b": "b", "c": 1 }`)
    })
  })

  describe("record", () => {
    it("record(string, string)", () => {
      const schema = S.Record({ key: S.String, value: S.String })
      const pretty = Pretty.make(schema)
      expect(pretty({ a: "a", b: "b" })).toEqual(
        `{ "a": "a", "b": "b" }`
      )
    })

    it("record(symbol, string)", () => {
      const a = Symbol.for("effect/Schema/test/a")
      const schema = S.Record({ key: S.SymbolFromSelf, value: S.String })
      const pretty = Pretty.make(schema)
      expect(pretty({ [a]: "a" })).toEqual(
        `{ Symbol(effect/Schema/test/a): "a" }`
      )
    })
  })

  describe("tuple", () => {
    it("required element", () => {
      const schema = S.Tuple(S.Number)
      const pretty = Pretty.make(schema)
      expect(pretty([1])).toEqual(`[1]`)
      const x = [1, "b"] as any
      expect(pretty(x)).toEqual(`[1]`)
    })

    it("required element with undefined", () => {
      const schema = S.Tuple(S.Union(S.Number, S.Undefined))
      const pretty = Pretty.make(schema)
      expect(pretty([1])).toEqual(`[1]`)
      expect(pretty([undefined])).toEqual(`[undefined]`)
      const x = [1, "b"] as any
      expect(pretty(x)).toEqual(`[1]`)
    })

    it("optional element", () => {
      const schema = S.Tuple(S.optionalElement(S.Number))
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty([1])).toEqual(`[1]`)
      const x = [1, "b"] as any
      expect(pretty(x)).toEqual(`[1]`)
    })

    it("optional element with undefined", () => {
      const schema = S.Tuple(S.optionalElement(S.Union(S.Number, S.Undefined)))
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty([1])).toEqual(`[1]`)
      const x = [1, "b"] as any
      expect(pretty(x)).toEqual(`[1]`)
      expect(pretty([undefined])).toEqual(`[undefined]`)
    })

    it("baseline", () => {
      const schema = S.Tuple(S.String, S.Number)
      const pretty = Pretty.make(schema)
      expect(pretty(["a", 1])).toEqual(`["a", 1]`)
    })

    it("empty tuple", () => {
      const schema = S.Tuple()
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
    })

    it("optional elements", () => {
      const schema = S.Tuple(S.optionalElement(S.String), S.optionalElement(S.Number))
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty(["a"])).toEqual(`["a"]`)
      expect(pretty(["a", 1])).toEqual(`["a", 1]`)
    })

    it("array", () => {
      const schema = S.Array(S.String)
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty(["a"])).toEqual(`["a"]`)
    })

    it("post rest element", () => {
      const schema = S.Tuple([], S.Number, S.Boolean)
      const pretty = Pretty.make(schema)
      expect(pretty([true])).toEqual(`[true]`)
      expect(pretty([1, true])).toEqual(`[1, true]`)
      expect(pretty([1, 2, true])).toEqual(`[1, 2, true]`)
      expect(pretty([1, 2, 3, true])).toEqual(`[1, 2, 3, true]`)
    })

    it("post rest elements", () => {
      const schema = S.Tuple([], S.Number, S.Boolean, S.Union(S.String, S.Undefined))
      const pretty = Pretty.make(schema)
      expect(pretty([true, "c"])).toEqual(`[true, "c"]`)
      expect(pretty([1, true, "c"])).toEqual(`[1, true, "c"]`)
      expect(pretty([1, 2, true, "c"])).toEqual(`[1, 2, true, "c"]`)
      expect(pretty([1, 2, 3, true, "c"])).toEqual(`[1, 2, 3, true, "c"]`)
      expect(pretty([1, 2, 3, true, undefined])).toEqual(`[1, 2, 3, true, undefined]`)
    })

    it("post rest elements when rest is unknown", () => {
      const schema = S.Tuple([], S.Unknown, S.Boolean)
      const pretty = Pretty.make(schema)
      expect(pretty([1, "a", 2, "b", true])).toEqual(`[1, "a", 2, "b", true]`)
      expect(pretty([true])).toEqual(`[true]`)
    })

    it("all", () => {
      const schema = S.Tuple([S.String], S.Number, S.Boolean)
      const pretty = Pretty.make(schema)
      expect(pretty(["a", true])).toEqual(`["a", true]`)
      expect(pretty(["a", 1, true])).toEqual(`["a", 1, true]`)
      expect(pretty(["a", 1, 2, true])).toEqual(`["a", 1, 2, true]`)
    })

    it("nonEmptyArray", () => {
      const schema = S.NonEmptyArray(S.Number)
      const pretty = Pretty.make(schema)
      expect(pretty([1])).toEqual(`[1]`)
      expect(pretty([1, 2])).toEqual(`[1, 2]`)
    })

    it("ReadonlyArray<unknown>", () => {
      const schema = S.Array(S.Unknown)
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty(["a", 1, true])).toEqual(`["a", 1, true]`)
    })

    it("ReadonlyArray<any>", () => {
      const schema = S.Array(S.Any)
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty(["a", 1, true])).toEqual(`["a", 1, true]`)
    })
  })

  describe("union", () => {
    it("primitives", () => {
      const schema = S.Union(S.String, S.Number)
      const pretty = Pretty.make(schema)
      expect(pretty("a")).toEqual(
        `"a"`
      )
      expect(pretty(1)).toEqual(
        "1"
      )
    })

    it("discriminated", () => {
      const schema = S.Union(
        S.Struct({ tag: S.Literal("a"), a: S.String }),
        S.Struct({ tag: S.Literal("b"), b: S.Number })
      )
      const pretty = Pretty.make(schema)
      expect(pretty({ tag: "a", a: "-" })).toEqual(
        `{ "tag": "a", "a": "-" }`
      )
      expect(pretty({ tag: "b", b: 1 })).toEqual(
        `{ "tag": "b", "b": 1 }`
      )
    })
  })

  it("suspend", () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const A = S.Struct({
      a: S.String,
      as: S.Array(S.suspend((): S.Schema<A> => A))
    })
    const pretty = Pretty.make(A)
    expect(pretty({ a: "a", as: [] })).toEqual(
      `{ "a": "a", "as": [] }`
    )
  })

  it("transformation", () => {
    const pretty = Pretty.make(S.Trim)
    expect(pretty("a")).toEqual(`"a"`)
  })

  describe("should handle annotations", () => {
    const expectHook = <A, I>(source: S.Schema<A, I>) => {
      const schema = source.annotations({ pretty: () => () => "custom pretty" })
      const pretty = Pretty.make(schema)
      expect(pretty(null as any)).toEqual("custom pretty")
    }

    it("void", () => {
      expectHook(S.Void)
    })

    it("never", () => {
      expectHook(S.Never)
    })

    it("literal", () => {
      expectHook(S.Literal("a"))
    })

    it("symbol", () => {
      expectHook(S.Symbol)
    })

    it("uniqueSymbolFromSelf", () => {
      expectHook(S.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")))
    })

    it("templateLiteral", () => {
      expectHook(S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b")))
    })

    it("undefined", () => {
      expectHook(S.Undefined)
    })

    it("unknown", () => {
      expectHook(S.Unknown)
    })

    it("any", () => {
      expectHook(S.Any)
    })

    it("object", () => {
      expectHook(S.Object)
    })

    it("string", () => {
      expectHook(S.String)
    })

    it("number", () => {
      expectHook(S.Number)
    })

    it("bigintFromSelf", () => {
      expectHook(S.BigIntFromSelf)
    })

    it("boolean", () => {
      expectHook(S.Boolean)
    })

    it("enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectHook(S.Enums(Fruits))
    })

    it("tuple", () => {
      expectHook(S.Tuple(S.String, S.Number))
    })

    it("struct", () => {
      expectHook(S.Struct({ a: S.String, b: S.Number }))
    })

    it("union", () => {
      expectHook(S.Union(S.String, S.Number))
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = S.Struct({
        a: S.String,
        as: S.Array(S.suspend((): S.Schema<A> => schema))
      })
      expectHook(schema)
    })

    it("refinement", () => {
      expectHook(S.Int)
    })

    it("transformation", () => {
      expectHook(S.NumberFromString)
    })
  })

  it("no matching schema error", () => {
    const A = S.Struct({ a: S.optionalWith(S.String, { exact: true }) })
    const schema = S.Union(A, S.Number)
    const x: {} = { a: undefined }
    const input: typeof A.Type = x
    expect(() => Pretty.make(schema)(input)).toThrow(
      new Error(`Unexpected Error
details: Cannot find a matching schema for {"a":undefined}
schema (Union): { readonly a?: string } | number`)
    )
  })
})
