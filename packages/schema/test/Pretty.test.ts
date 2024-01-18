import * as AST from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Pretty", () => {
  it("exports", () => {
    expect(Pretty.PrettyHookId).exist
  })

  it("make", () => {
    const schema = S.NumberFromString
    const pretty = Pretty.make(schema)
    expect(pretty(1)).toEqual(`1`)
  })

  it("make(S.from(schema))", () => {
    const schema = S.NumberFromString
    const pretty = Pretty.make(S.from(schema))
    expect(pretty("a")).toEqual(`"a"`)
  })

  it("should throw on declarations without annotations", () => {
    const schema = S.declarePrimitive(ParseResult.succeed)
    expect(() => Pretty.make(schema)).toThrow(
      new Error("cannot build an Pretty for a declaration without annotations")
    )
  })

  it("should throw on never", () => {
    const schema = S.never
    const pretty = Pretty.make(schema)
    expect(() => pretty("a" as any as never)).toThrow(
      new Error("cannot pretty print a `never` value")
    )
  })

  it("should allow for custom compilers", () => {
    const match: typeof Pretty.match = {
      ...Pretty.match,
      "BooleanKeyword": () => (b: boolean) => b ? "True" : "False"
    }
    const go = AST.getCompiler(match)
    const pretty = <A>(schema: S.Schema<never, A>) => (a: A): string => go(schema.ast)(a)
    expect(pretty(S.boolean)(true)).toEqual(`True`)
    const schema = S.tuple(S.string, S.boolean)
    expect(pretty(schema)(["a", true])).toEqual(`["a", True]`)
  })

  describe("templateLiteral", () => {
    it("a${string}b", () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
      const pretty = Pretty.make(schema)
      expect(pretty("acb")).toEqual(`"acb"`)
    })
  })

  it("unknown", () => {
    const schema = S.unknown
    const pretty = Pretty.make(schema)
    expect(pretty("a")).toEqual(`"a"`)
    expect(pretty(1n)).toEqual(`1n`)
  })

  it("string", () => {
    const schema = S.string
    const pretty = Pretty.make(schema)
    expect(pretty("a")).toEqual(`"a"`)
  })

  it("number", () => {
    const schema = S.number
    const pretty = Pretty.make(schema)
    expect(pretty(1)).toEqual("1")
    expect(pretty(NaN)).toEqual("NaN")
    expect(pretty(Infinity)).toEqual("Infinity")
    expect(pretty(-Infinity)).toEqual("-Infinity")
  })

  it("boolean", () => {
    const schema = S.boolean
    const pretty = Pretty.make(schema)
    expect(pretty(true)).toEqual("true")
  })

  it("bigint", () => {
    const pretty = Pretty.make(S.bigintFromSelf)
    expect(pretty(1n)).toEqual("1n")
  })

  it("symbol", () => {
    const pretty = Pretty.make(S.symbolFromSelf)
    expect(pretty(Symbol.for("effect/test/a"))).toEqual("Symbol(effect/test/a)")
  })

  it("void", () => {
    const pretty = Pretty.make(S.void)
    expect(pretty(undefined)).toEqual("void(0)")
  })

  describe("literal", () => {
    it("null", () => {
      const schema = S.literal(null)
      const pretty = Pretty.make(schema)
      expect(pretty(null)).toEqual("null")
    })

    it("bigint", () => {
      const schema = S.literal(1n)
      const pretty = Pretty.make(schema)
      expect(pretty(1n)).toEqual("1n")
    })
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.uniqueSymbol(a)
    const pretty = Pretty.make(schema)
    expect(pretty(a)).toEqual("Symbol(@effect/schema/test/a)")
  })

  describe("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.enums(Fruits)
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
      const schema = S.enums(Fruits)
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
      const schema = S.enums(Fruits)
      const pretty = Pretty.make(schema)
      expect(pretty(Fruits.Apple)).toEqual(`"apple"`)
      expect(pretty(Fruits.Banana)).toEqual(`"banana"`)
      expect(pretty(Fruits.Cantaloupe)).toEqual(`3`)
    })
  })

  describe("struct", () => {
    it("empty", () => {
      const schema = S.struct({})
      const pretty = Pretty.make(schema)
      expect(pretty({})).toEqual(
        "{}"
      )
    })

    it("required fields", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const pretty = Pretty.make(schema)
      expect(pretty({ a: "a", b: 1 })).toEqual(
        `{ "a": "a", "b": 1 }`
      )
    })

    it("should not output optional property signatures", () => {
      const schema = S.struct({ a: S.optional(S.number, { exact: true }) })
      const pretty = Pretty.make(schema)
      expect(pretty({})).toEqual("{}")
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
    })

    it("should escape keys", () => {
      const schema = S.struct({ "-": S.number })
      const pretty = Pretty.make(schema)
      expect(pretty({ "-": 1 })).toEqual(`{ "-": 1 }`)
    })

    it("required property signature", () => {
      const schema = S.struct({ a: S.number })
      const pretty = Pretty.make(schema)
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
      const x = { a: 1, b: "b" }
      expect(pretty(x)).toEqual(`{ "a": 1 }`)
    })

    it("required property signature with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const pretty = Pretty.make(schema)
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
      expect(pretty({ a: undefined })).toEqual(`{ "a": undefined }`)
      const x = { a: 1, b: "b" }
      expect(pretty(x)).toEqual(`{ "a": 1 }`)
    })

    it("optional property signature", () => {
      const schema = S.struct({ a: S.optional(S.number, { exact: true }) })
      const pretty = Pretty.make(schema)
      expect(pretty({})).toEqual(`{}`)
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
      const x = { a: 1, b: "b" }
      expect(pretty(x)).toEqual(`{ "a": 1 }`)
    })

    it("optional property signature with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined), { exact: true }) })
      const pretty = Pretty.make(schema)
      expect(pretty({})).toEqual(`{}`)
      expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
      const x = { a: 1, b: "b" }
      expect(pretty(x)).toEqual(`{ "a": 1 }`)
      expect(pretty({ a: undefined })).toEqual(`{ "a": undefined }`)
    })

    it("extend: struct + record", () => {
      const schema = S.struct({ a: S.string }).pipe(
        S.extend(S.record(S.string, S.union(S.string, S.number)))
      )
      const pretty = Pretty.make(schema)
      expect(pretty({ a: "a" })).toEqual(`{ "a": "a" }`)
      expect(pretty({ a: "a", b: "b", c: 1 })).toEqual(`{ "a": "a", "b": "b", "c": 1 }`)
    })
  })

  describe("record", () => {
    it("record(string, string)", () => {
      const schema = S.record(S.string, S.string)
      const pretty = Pretty.make(schema)
      expect(pretty({ a: "a", b: "b" })).toEqual(
        `{ "a": "a", "b": "b" }`
      )
    })

    it("record(symbol, string)", () => {
      const a = Symbol.for("@effect/schema/test/a")
      const schema = S.record(S.symbolFromSelf, S.string)
      const pretty = Pretty.make(schema)
      expect(pretty({ [a]: "a" })).toEqual(
        `{ Symbol(@effect/schema/test/a): "a" }`
      )
    })
  })

  describe("tuple", () => {
    it("required element", () => {
      const schema = S.tuple(S.number)
      const pretty = Pretty.make(schema)
      expect(pretty([1])).toEqual(`[1]`)
      const x = [1, "b"] as any
      expect(pretty(x)).toEqual(`[1]`)
    })

    it("required element with undefined", () => {
      const schema = S.tuple(S.union(S.number, S.undefined))
      const pretty = Pretty.make(schema)
      expect(pretty([1])).toEqual(`[1]`)
      expect(pretty([undefined])).toEqual(`[undefined]`)
      const x = [1, "b"] as any
      expect(pretty(x)).toEqual(`[1]`)
    })

    it("optional element", () => {
      const schema = S.tuple().pipe(S.optionalElement(S.number))
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty([1])).toEqual(`[1]`)
      const x = [1, "b"] as any
      expect(pretty(x)).toEqual(`[1]`)
    })

    it("optional element with undefined", () => {
      const schema = S.tuple().pipe(S.optionalElement(S.union(S.number, S.undefined)))
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty([1])).toEqual(`[1]`)
      const x = [1, "b"] as any
      expect(pretty(x)).toEqual(`[1]`)
      expect(pretty([undefined])).toEqual(`[undefined]`)
    })

    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const pretty = Pretty.make(schema)
      expect(pretty(["a", 1])).toEqual(`["a", 1]`)
    })

    it("empty tuple", () => {
      const schema = S.tuple()
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
    })

    it("optional elements", () => {
      const schema = S.tuple().pipe(S.optionalElement(S.string), S.optionalElement(S.number))
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty(["a"])).toEqual(`["a"]`)
      expect(pretty(["a", 1])).toEqual(`["a", 1]`)
    })

    it("array", () => {
      const schema = S.array(S.string)
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty(["a"])).toEqual(`["a"]`)
    })

    it("post rest element", () => {
      const schema = S.array(S.number).pipe(S.element(S.boolean))
      const pretty = Pretty.make(schema)
      expect(pretty([true])).toEqual(`[true]`)
      expect(pretty([1, true])).toEqual(`[1, true]`)
      expect(pretty([1, 2, true])).toEqual(`[1, 2, true]`)
      expect(pretty([1, 2, 3, true])).toEqual(`[1, 2, 3, true]`)
    })

    it("post rest elements", () => {
      const schema = S.array(S.number).pipe(
        S.element(S.boolean),
        S.element(S.union(S.string, S.undefined))
      )
      const pretty = Pretty.make(schema)
      expect(pretty([true, "c"])).toEqual(`[true, "c"]`)
      expect(pretty([1, true, "c"])).toEqual(`[1, true, "c"]`)
      expect(pretty([1, 2, true, "c"])).toEqual(`[1, 2, true, "c"]`)
      expect(pretty([1, 2, 3, true, "c"])).toEqual(`[1, 2, 3, true, "c"]`)
      expect(pretty([1, 2, 3, true, undefined])).toEqual(`[1, 2, 3, true, undefined]`)
    })

    it("post rest elements when rest is unknown", () => {
      const schema = S.array(S.unknown).pipe(S.element(S.boolean))
      const pretty = Pretty.make(schema)
      expect(pretty([1, "a", 2, "b", true])).toEqual(`[1, "a", 2, "b", true]`)
      expect(pretty([true])).toEqual(`[true]`)
    })

    it("all", () => {
      const schema = S.tuple(S.string).pipe(
        S.rest(S.number),
        S.element(S.boolean)
      )
      const pretty = Pretty.make(schema)
      expect(pretty(["a", true])).toEqual(`["a", true]`)
      expect(pretty(["a", 1, true])).toEqual(`["a", 1, true]`)
      expect(pretty(["a", 1, 2, true])).toEqual(`["a", 1, 2, true]`)
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(S.number)
      const pretty = Pretty.make(schema)
      expect(pretty([1])).toEqual(`[1]`)
      expect(pretty([1, 2])).toEqual(`[1, 2]`)
    })

    it("ReadonlyArray<unknown>", () => {
      const schema = S.array(S.unknown)
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty(["a", 1, true])).toEqual(`["a", 1, true]`)
    })

    it("ReadonlyArray<any>", () => {
      const schema = S.array(S.any)
      const pretty = Pretty.make(schema)
      expect(pretty([])).toEqual(`[]`)
      expect(pretty(["a", 1, true])).toEqual(`["a", 1, true]`)
    })
  })

  describe("union", () => {
    it("primitives", () => {
      const schema = S.union(S.string, S.number)
      const pretty = Pretty.make(schema)
      expect(pretty("a")).toEqual(
        `"a"`
      )
      expect(pretty(1)).toEqual(
        "1"
      )
    })

    it("discriminated", () => {
      const schema = S.union(
        S.struct({ tag: S.literal("a"), a: S.string }),
        S.struct({ tag: S.literal("b"), b: S.number })
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
    const A: S.Schema<never, A> = S.struct({
      a: S.string,
      as: S.array(S.suspend(() => A))
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
    const expectHook = <I, A>(source: S.Schema<never, I, A>) => {
      const schema = source.pipe(Pretty.pretty(() => () => "custom pretty"))
      const pretty = Pretty.make(schema)
      expect(pretty(null as any)).toEqual("custom pretty")
    }

    it("void", () => {
      expectHook(S.void)
    })

    it("never", () => {
      expectHook(S.never)
    })

    it("literal", () => {
      expectHook(S.literal("a"))
    })

    it("symbol", () => {
      expectHook(S.symbol)
    })

    it("uniqueSymbol", () => {
      expectHook(S.uniqueSymbol(Symbol.for("effect/schema/test/a")))
    })

    it("templateLiteral", () => {
      expectHook(S.templateLiteral(S.literal("a"), S.string, S.literal("b")))
    })

    it("undefined", () => {
      expectHook(S.undefined)
    })

    it("unknown", () => {
      expectHook(S.unknown)
    })

    it("any", () => {
      expectHook(S.any)
    })

    it("object", () => {
      expectHook(S.object)
    })

    it("string", () => {
      expectHook(S.string)
    })

    it("number", () => {
      expectHook(S.number)
    })

    it("bigintFromSelf", () => {
      expectHook(S.bigintFromSelf)
    })

    it("boolean", () => {
      expectHook(S.boolean)
    })

    it("enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectHook(S.enums(Fruits))
    })

    it("tuple", () => {
      expectHook(S.tuple(S.string, S.number))
    })

    it("struct", () => {
      expectHook(S.struct({ a: S.string, b: S.number }))
    })

    it("union", () => {
      expectHook(S.union(S.string, S.number))
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<never, A> = S.struct({
        a: S.string,
        as: S.array(S.suspend(() => schema))
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
})
