import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as DataReadonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"

const guardFor = G.guardFor

describe.concurrent("Guard", () => {
  it("exports", () => {
    expect(G.GuardId).exist
    expect(G.make).exist
  })

  it("never", () => {
    const guard = G.guardFor(S.never)
    expect(guard.is("a")).toEqual(false)
  })

  it("string", () => {
    const guard = G.guardFor(S.string)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("number", () => {
    const guard = G.guardFor(S.number)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  it("boolean", () => {
    const guard = G.guardFor(S.boolean)
    expect(guard.is(true)).toEqual(true)
    expect(guard.is(false)).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("bigint", () => {
    const guard = G.guardFor(S.bigint)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(0n)).toEqual(true)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const guard = G.guardFor(S.symbol)
    expect(guard.is(a)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  describe.concurrent("literal", () => {
    it("1 member", () => {
      const schema = S.literal(1)
      const guard = G.guardFor(schema)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is("a")).toEqual(false)
      expect(guard.is(null)).toEqual(false)
    })

    it("2 members", () => {
      const schema = S.literal(1, "a")
      const guard = G.guardFor(schema)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is(null)).toEqual(false)
    })
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.uniqueSymbol(a)
    const guard = G.guardFor(schema)
    expect(guard.is(a)).toEqual(true)
    expect(guard.is(Symbol.for("@fp-ts/schema/test/a"))).toEqual(true)
    expect(guard.is("Symbol(@fp-ts/schema/test/a)")).toEqual(false)
  })

  describe.concurrent("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.nativeEnum(Fruits)
      const guard = G.guardFor(schema)
      expect(guard.is(Fruits.Apple)).toEqual(true)
      expect(guard.is(Fruits.Banana)).toEqual(true)
      expect(guard.is(0)).toEqual(true)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is(3)).toEqual(false)
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.nativeEnum(Fruits)
      const guard = G.guardFor(schema)
      expect(guard.is(Fruits.Apple)).toEqual(true)
      expect(guard.is(Fruits.Cantaloupe)).toEqual(true)
      expect(guard.is("apple")).toEqual(true)
      expect(guard.is("banana")).toEqual(true)
      expect(guard.is(0)).toEqual(true)
      expect(guard.is("Cantaloupe")).toEqual(false)
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.nativeEnum(Fruits)
      const guard = G.guardFor(schema)
      expect(guard.is("apple")).toEqual(true)
      expect(guard.is("banana")).toEqual(true)
      expect(guard.is(3)).toEqual(true)
      expect(guard.is("Cantaloupe")).toEqual(false)
    })
  })

  describe.concurrent("tuple", () => {
    it("required element", () => {
      const schema = S.tuple(S.number)
      const guard = G.guardFor(schema)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([1, "b"])).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is([])).toEqual(false)
      expect(guard.is([undefined])).toEqual(false)
      expect(guard.is(["a"])).toEqual(false)
    })

    it("required element with undefined", () => {
      const schema = S.tuple(S.union(S.number, S.undefined))
      const guard = G.guardFor(schema)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([1, "b"])).toEqual(true)
      expect(guard.is([undefined])).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is([])).toEqual(false)
      expect(guard.is(["a"])).toEqual(false)
    })

    it("optional element", () => {
      const schema = pipe(S.tuple(), S.optionalElement(S.number))
      const guard = G.guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([1, "b"])).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is(["a"])).toEqual(false)
      expect(guard.is([undefined])).toEqual(false)
    })

    it("optional element with undefined", () => {
      const schema = pipe(S.tuple(), S.optionalElement(S.union(S.number, S.undefined)))
      const guard = G.guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([1, "b"])).toEqual(true)
      expect(guard.is([undefined])).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is(["a"])).toEqual(false)
    })

    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const guard = G.guardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is([1, 1])).toEqual(false)
      expect(guard.is(["a", "b"])).toEqual(false)
    })

    it("empty tuple", () => {
      const schema = S.tuple()
      const guard = G.guardFor(schema)
      expect(guard.is([])).toEqual(true)
    })

    it("optional elements", () => {
      const schema = S.partial(S.tuple(S.string, S.number))
      const guard = G.guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
    })

    it("array", () => {
      const schema = S.array(S.string)
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(false)
    })

    it("post rest element", () => {
      const schema = pipe(S.array(S.number), S.element(S.boolean))
      const guard = G.guardFor(schema)
      expect(guard.is([true])).toEqual(true)
      expect(guard.is([1, true])).toEqual(true)
      expect(guard.is([1, 2, true])).toEqual(true)
      expect(guard.is([1, 2, 3, true])).toEqual(true)

      expect(guard.is(["b"])).toEqual(false)
      expect(guard.is([1])).toEqual(false)
      expect(guard.is([1, "b"])).toEqual(false)
      expect(guard.is([1, 2])).toEqual(false)
      expect(guard.is([1, 2, "b"])).toEqual(false)
      expect(guard.is([1, 2, 3])).toEqual(false)
      expect(guard.is([1, 2, 3, "b"])).toEqual(false)
    })

    it("post rest elements", () => {
      const schema = pipe(
        S.array(S.number),
        S.element(S.boolean),
        S.element(S.union(S.string, S.undefined))
      )
      const guard = G.guardFor(schema)
      expect(guard.is([true, "c"])).toEqual(true)
      expect(guard.is([1, true, "c"])).toEqual(true)
      expect(guard.is([1, 2, true, "c"])).toEqual(true)
      expect(guard.is([1, 2, 3, true, "c"])).toEqual(true)
      expect(guard.is([1, 2, 3, true, undefined])).toEqual(true)

      expect(guard.is([])).toEqual(false)
      expect(guard.is([true])).toEqual(false)
      expect(guard.is([1, 2, 3, true])).toEqual(false)
    })

    it("post rest elements when rest is unknown", () => {
      const schema = pipe(S.array(S.unknown), S.element(S.boolean))
      const guard = G.guardFor(schema)
      expect(guard.is([1, "a", 2, "b", true])).toEqual(true)
      expect(guard.is([true])).toEqual(true)
      expect(guard.is([])).toEqual(false)
    })

    it("all", () => {
      const schema = pipe(
        S.tuple(S.string),
        S.rest(S.number),
        S.element(S.boolean)
      )
      const guard = G.guardFor(schema)
      expect(guard.is(["a", true])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
      expect(guard.is(["a", 1, 2, true])).toEqual(true)

      expect(guard.is([])).toEqual(false)
      expect(guard.is(["b"])).toEqual(false)
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(S.number)
      const guard = guardFor(schema)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([1, 2])).toEqual(true)

      expect(guard.is([])).toEqual(false)
    })

    it("ReadonlyArray<unknown>", () => {
      const schema = S.array(S.unknown)
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
    })

    it("ReadonlyArray<any>", () => {
      const schema = S.array(S.any)
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
    })
  })

  describe.concurrent("struct", () => {
    it("required field", () => {
      const schema = S.struct({ a: S.number })
      const guard = G.guardFor(schema)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ a: 1, b: "b" })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: undefined })).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
    })

    it("required field with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const guard = G.guardFor(schema)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ a: 1, b: "b" })).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
    })

    it("optional field", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      const guard = G.guardFor(schema)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ a: 1, b: "b" })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
      expect(guard.is({ a: undefined })).toEqual(false)
    })

    it("optional field with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      const guard = G.guardFor(schema)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ a: 1, b: "b" })).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
    })

    it("{ readonly [_: string]: unknown }", () => {
      const schema = S.stringIndexSignature(S.unknown)
      const guard = guardFor(schema)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    })

    it("{ readonly [_: string]: any }", () => {
      const schema = S.stringIndexSignature(S.any)
      const guard = guardFor(schema)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    })

    it("stringIndexSignature", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.stringIndexSignature(S.string)
      const guard = G.guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
      expect(guard.is({ [a]: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: "b" })).toEqual(true)
      expect(guard.is({ a: "a", b: 1 })).toEqual(false)
      expect(guard.is({ [a]: 1, b: "b" })).toEqual(true)
    })

    it("symbolIndexSignature", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = S.symbolIndexSignature(S.string)
      const guard = G.guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ [a]: "a" })).toEqual(true)
      expect(guard.is({ [a]: 1 })).toEqual(false)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ [a]: "a", [b]: "b" })).toEqual(true)
      expect(guard.is({ [a]: "a", [b]: 1 })).toEqual(false)
      expect(guard.is({ a: 1, [b]: "b" })).toEqual(true)
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  describe.concurrent("lazy", () => {
    it("baseline", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlySet<Category>
      }
      const schema: S.Schema<Category> = S.lazy<Category>(() =>
        S.struct({
          name: S.string,
          categories: DataReadonlySet.schema(schema)
        })
      )
      const guard = G.guardFor(schema)
      expect(guard.is({ name: "a", categories: new Set([]) })).toEqual(true)
      expect(
        guard.is({
          name: "a",
          categories: new Set([{
            name: "b",
            categories: new Set([{ name: "c", categories: new Set([]) }])
          }])
        })
      ).toEqual(true)
      expect(guard.is({ name: "a", categories: new Set([1]) })).toEqual(false)
    })

    it("mutually recursive", () => {
      interface A {
        readonly a: string
        readonly bs: ReadonlySet<B>
      }
      interface B {
        readonly b: number
        readonly as: ReadonlySet<A>
      }
      const schemaA: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          bs: DataReadonlySet.schema(schemaB)
        })
      )
      const schemaB: S.Schema<B> = S.lazy<B>(() =>
        S.struct({
          b: S.number,
          as: DataReadonlySet.schema(schemaA)
        })
      )
      const A = G.guardFor(schemaA)
      const B = G.guardFor(schemaB)
      expect(A.is({ a: "a1", bs: new Set([]) })).toEqual(true)
      expect(A.is({ a: "a1", bs: new Set([{ b: 1, as: new Set([]) }]) })).toEqual(true)
      expect(
        A.is({ a: "a1", bs: new Set([{ b: 1, as: new Set([{ a: "a2", bs: new Set([]) }]) }]) })
      )
        .toEqual(true)
      expect(
        A.is({ a: "a1", bs: new Set([{ b: 1, as: new Set([{ a: "a2", bs: new Set([null]) }]) }]) })
      )
        .toEqual(false)
    })

    it("pick recursive", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlySet<A>
      }
      const A: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          as: DataReadonlySet.schema(A)
        })
      )
      const schemaB = pipe(A, S.pick("as"))
      const B = G.guardFor(schemaB)
      expect(B.is({ as: new Set([]) })).toEqual(true)
      expect(B.is({ as: new Set([{ a: "a", as: new Set() }]) })).toEqual(true)
      expect(B.is({ as: new Set([{ as: new Set() }]) })).toEqual(false)
    })

    it("omit recursive", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlySet<A>
      }
      const A: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          as: DataReadonlySet.schema(A)
        })
      )
      const schemaB = pipe(A, S.omit("a"))
      const B = G.guardFor(schemaB)
      expect(B.is({ as: new Set([]) })).toEqual(true)
      expect(B.is({ as: new Set([{ a: "a", as: new Set() }]) })).toEqual(true)
      expect(B.is({ as: new Set([{ as: new Set() }]) })).toEqual(false)
    })
  })

  it("pick", () => {
    const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
    const schema = pipe(base, S.pick("a", "b"))
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(true)
  })

  describe.concurrent("omit", () => {
    it("baseline", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      const guard = guardFor(schema)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
      expect(guard.is({ b: 1 })).toEqual(false)
    })

    it("involving a symbol", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const base = S.struct({ [a]: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      const guard = guardFor(schema)
      expect(guard.is({ [a]: "a", b: 1 })).toEqual(true)
      expect(guard.is({ [a]: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ [a]: "a", b: 1, c: "a" })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ [a]: "a" })).toEqual(false)
      expect(guard.is({ b: 1 })).toEqual(false)
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  describe.concurrent("rest", () => {
    it("baseline", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean))
      const guard = guardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
      expect(guard.is(["a", 1, true, false])).toEqual(true)
      expect(guard.is(["a", 1, true, "a"])).toEqual(false)
      expect(guard.is(["a", 1, true, "a", true])).toEqual(false)
    })

    it("multiple `rest` calls must result in a union", () => {
      const schema = pipe(
        S.tuple(S.string, S.number),
        S.rest(S.boolean),
        S.rest(S.string)
      )
      const guard = guardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
      expect(guard.is(["a", 1, true, false])).toEqual(true)
      expect(guard.is(["a", 1, true, "a"])).toEqual(true)
      expect(guard.is(["a", 1, true, "a", true])).toEqual(true)
      expect(guard.is(["a", 1, true, "a", true, 1])).toEqual(false)
    })
  })

  describe.concurrent("extend", () => {
    it("struct", () => {
      const schema = pipe(
        S.struct({ a: S.string }),
        S.extend(S.struct({ b: S.number }))
      )
      const guard = guardFor(schema)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)

      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
    })

    it("stringIndexSignature", () => {
      const schema = pipe(
        S.struct({ a: S.string }),
        S.extend(S.stringIndexSignature(S.string))
      )
      const guard = guardFor(schema)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: "a", b: "b" })).toEqual(true)

      expect(guard.is({})).toEqual(false)
      expect(guard.is({ b: "b" })).toEqual(false)
      expect(guard.is({ a: 1 })).toEqual(false)
      expect(guard.is({ a: "a", b: 2 })).toEqual(false)
    })
  })

  describe.concurrent("partial", () => {
    it("type alias", () => {
      const schema = S.partial(DataOption.schema(S.number))
      const guard = guardFor(schema)
      expect(guard.is(O.none)).toEqual(true)
      expect(guard.is(O.some(1))).toEqual(true)
      expect(guard.is({})).toEqual(true)
    })

    it("struct", () => {
      const schema = S.partial(S.struct({ a: S.number }))
      const guard = guardFor(schema)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(false)
    })

    it("tuple", () => {
      const schema = S.partial(S.tuple(S.string, S.number))
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(true)
    })

    it("array", () => {
      const schema = S.partial(S.array(S.number))
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([undefined])).toEqual(true)
      expect(guard.is(["a"])).toEqual(false)
    })

    it("union", () => {
      const schema = S.partial(S.union(S.string, S.array(S.number)))
      const guard = guardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is([])).toEqual(true)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([undefined])).toEqual(true)
      expect(guard.is(["a"])).toEqual(false)
    })
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    const guard = G.guardFor(schema)
    expect(guard.is("")).toEqual(true)
    expect(guard.is("a")).toEqual(true)

    expect(guard.is("aa")).toEqual(false)
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const guard = G.guardFor(schema)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is("aa")).toEqual(true)

    expect(guard.is("")).toEqual(false)
  })

  describe.concurrent("nullables", () => {
    it("nullable (1)", () => {
      /* Schema<{ readonly a: number | null; }> */
      const schema = S.struct({ a: S.union(S.number, S.literal(null)) })
      const guard = guardFor(schema)
      expect(guard.is({})).toBe(false)
      expect(guard.is({ a: null })).toBe(true)
      expect(guard.is({ a: undefined })).toBe(false)
      expect(guard.is({ a: 1 })).toBe(true)
    })

    it("nullable (2)", () => {
      /* Schema<{ readonly a: number | null | undefined; }> */
      const schema = S.struct({ a: S.union(S.number, S.literal(null), S.undefined) })
      const guard = guardFor(schema)
      expect(guard.is({})).toBe(false)
      expect(guard.is({ a: null })).toBe(true)
      expect(guard.is({ a: undefined })).toBe(true)
      expect(guard.is({ a: 1 })).toBe(true)
    })

    it("nullable (3)", () => {
      /* Schema<{ readonly a?: number | null; }> */
      const schema = S.struct({ a: S.optional(S.union(S.number, S.literal(null))) })
      const guard = guardFor(schema)
      expect(guard.is({})).toBe(true)
      expect(guard.is({ a: null })).toBe(true)
      expect(guard.is({ a: undefined })).toBe(false)
      expect(guard.is({ a: 1 })).toBe(true)
    })

    it("nullable (4)", () => {
      /* Schema<{ readonly a?: number | null | undefined; }> */
      const schema = S.struct({ a: S.optional(S.union(S.number, S.literal(null), S.undefined)) })
      const guard = guardFor(schema)
      expect(guard.is({})).toBe(true)
      expect(guard.is({ a: null })).toBe(true)
      expect(guard.is({ a: undefined })).toBe(true)
      expect(guard.is({ a: 1 })).toBe(true)
    })
  })
})
