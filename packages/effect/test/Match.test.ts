import { describe, it } from "@effect/vitest"
import * as E from "effect/Either"
import { pipe } from "effect/Function"
import * as M from "effect/Match"
import * as O from "effect/Option"
import * as Predicate from "effect/Predicate"
import { assertFalse, assertLeft, assertRight, assertSome, assertTrue, strictEqual } from "effect/test/util"
import { assertType } from "effect/test/utils/types"

describe("Match", () => {
  it("exhaustive", () => {
    const match = pipe(
      M.type<{ a: number } | { b: number }>(),
      M.when({ a: M.number }, (_) => _.a),
      M.when({ b: M.number }, (_) => _.b),
      M.exhaustive
    )
    strictEqual(match({ a: 0 }), 0)
    strictEqual(match({ b: 1 }), 1)
  })

  it("exhaustive-literal", () => {
    const match = pipe(
      M.type<{ _tag: "A"; a: number } | { _tag: "B"; b: number }>(),
      M.when({ _tag: "A" }, (_) => E.right(_.a)),
      M.when({ _tag: "B" }, (_) => E.right(_.b)),
      M.exhaustive
    )
    assertRight(match({ _tag: "A", a: 0 }), 0)
    assertRight(match({ _tag: "B", b: 1 }), 1)
  })

  it("schema exhaustive-literal", () => {
    const match = pipe(
      M.type<{ _tag: "A"; a: number | string } | { _tag: "B"; b: number }>(),
      M.when({ _tag: M.is("A", "B"), a: M.number }, (_) => {
        assertType<{ _tag: "A"; a: number }>()(_) satisfies true
        return E.right(_._tag)
      }),
      M.when({ _tag: M.string, a: M.string }, (_) => {
        assertType<{ _tag: "A"; a: string }>()(_) satisfies true
        return E.right(_._tag)
      }),
      M.when({ b: M.number }, (_) => E.left(_._tag)),
      M.orElse((_) => {
        throw "absurd"
      })
    )
    assertRight(match({ _tag: "A", a: 0 }), "A")
    assertRight(match({ _tag: "A", a: "hi" }), "A")
    assertLeft(match({ _tag: "B", b: 1 }), "B")
  })

  it("exhaustive literal with not", () => {
    const match = pipe(
      M.type<number>(),
      M.when(1, (_) => true),
      M.not(1, (_) => false),
      M.exhaustive
    )
    assertTrue(match(1))
    assertFalse(match(2))
  })

  it("inline", () => {
    const result = pipe(
      M.value(E.right(0)),
      M.tag("Right", (_) => _.right),
      M.tag("Left", (_) => _.left),
      M.exhaustive
    )
    strictEqual(result, 0)
  })

  it("piped", () => {
    const result = pipe(
      E.right(0),
      M.value,
      M.when({ _tag: "Right" }, (_) => _.right),
      M.option
    )
    assertSome(result, 0)
  })

  it("tuples", () => {
    const match = pipe(
      M.type<[string, string]>(),
      M.when(["yeah"], (_) => {
        assertType<readonly ["yeah", string]>()(_) satisfies true
        return true
      }),
      M.option
    )

    assertSome(match(["yeah", "a"]), true)
  })

  it("literals", () => {
    const match = pipe(
      M.type<string>(),
      M.when("yeah", (_) => _ === "yeah"),
      M.orElse(() => "nah")
    )

    strictEqual(match("yeah"), true)
    strictEqual(match("a"), "nah")
  })

  it("piped", () => {
    const result = pipe(
      E.right(0),
      M.value,
      M.when({ _tag: "Right" }, (_) => _.right),
      M.option
    )
    assertSome(result, 0)
  })

  it("not schema", () => {
    const match = pipe(
      M.type<string | number>(),
      M.not(M.number, (_) => "a"),
      M.when(M.number, (_) => "b"),
      M.exhaustive
    )
    strictEqual(match("hi"), "a")
    strictEqual(match(123), "b")
  })

  it("not literal", () => {
    const match = pipe(
      M.type<string | number>(),
      M.not("hi", (_) => {
        assertType<string | number>()(_) satisfies true
        return "a"
      }),
      M.orElse((_) => "b")
    )
    strictEqual(match("hello"), "a")
    strictEqual(match("hi"), "b")
  })

  it("tuples", () => {
    const match = pipe(
      M.type<[string, string]>(),
      M.when(["yeah", M.string], (_) => {
        assertType<readonly ["yeah", string]>()(_) satisfies true
        return true
      }),
      M.option
    )

    assertSome(match(["yeah", "a"]), true)
  })

  it("literals", () => {
    const match = pipe(
      M.type<string>(),
      M.when("yeah", (_) => {
        assertType<"yeah">()(_) satisfies true
        return _ === "yeah"
      }),
      M.orElse(() => "nah")
    )

    strictEqual(match("yeah"), true)
    strictEqual(match("a"), "nah")
  })

  it("literals duplicate", () => {
    const result = pipe(
      M.value("yeah" as string),
      M.when("yeah", (_) => _ === "yeah"),
      M.when("yeah", (_) => "dupe"),
      M.orElse((_) => "nah")
    )

    strictEqual(result, true)
  })

  it("discriminator", () => {
    const match = pipe(
      M.type<{ type: "A" } | { type: "B" }>(),
      M.discriminator("type")("A", (_) => _.type),
      M.discriminator("type")("B", (_) => _.type),
      M.exhaustive
    )
    strictEqual(match({ type: "B" }), "B")
  })

  it("discriminator multiple", () => {
    const result = pipe(
      M.value(E.right(0)),
      M.discriminator("_tag")("Right", "Left", (_) => "match"),
      M.exhaustive
    )
    strictEqual(result, "match")
  })

  it("nested", () => {
    const match = pipe(
      M.type<
        | { foo: { bar: { baz: { qux: string } } } }
        | { foo: { bar: { baz: { qux: number } } } }
        | { foo: { bar: null } }
      >(),
      M.when({ foo: { bar: { baz: { qux: 2 } } } }, (_) => {
        assertType<{ foo: { bar: { baz: { qux: 2 } } } }>()(_) satisfies true
        return `literal ${_.foo.bar.baz.qux}`
      }),
      M.when({ foo: { bar: { baz: { qux: "b" } } } }, (_) => {
        assertType<{ foo: { bar: { baz: { qux: "b" } } } }>()(_) satisfies true
        return `literal ${_.foo.bar.baz.qux}`
      }),
      M.when(
        { foo: { bar: { baz: { qux: M.number } } } },
        (_) => _.foo.bar.baz.qux
      ),
      M.when(
        { foo: { bar: { baz: { qux: M.string } } } },
        (_) => _.foo.bar.baz.qux
      ),
      M.when({ foo: { bar: null } }, (_) => _.foo.bar),
      M.exhaustive
    )

    strictEqual(match({ foo: { bar: { baz: { qux: 1 } } } }), 1)
    strictEqual(match({ foo: { bar: { baz: { qux: 2 } } } }), "literal 2")
    strictEqual(match({ foo: { bar: { baz: { qux: "a" } } } }), "a")
    strictEqual(match({ foo: { bar: { baz: { qux: "b" } } } }), "literal b")
    strictEqual(match({ foo: { bar: null } }), null)
  })

  it("nested Option", () => {
    const match = pipe(
      M.type<{ user: O.Option<{ readonly name: string }> }>(),
      M.when({ user: { _tag: "Some" } }, (_) => _.user.value.name),
      M.orElse((_) => "fail")
    )

    strictEqual(match({ user: O.some({ name: "a" }) }), "a")
    strictEqual(match({ user: O.none() }), "fail")
  })

  it("predicate", () => {
    const match = pipe(
      M.type<{ age: number }>(),
      M.when({ age: (a) => a >= 5 }, (_) => `Age: ${_.age}`),
      M.orElse((_) => `${_.age} is too young`)
    )

    strictEqual(match({ age: 5 }), "Age: 5")
    strictEqual(match({ age: 4 }), "4 is too young")
  })

  it("predicate not", () => {
    const match = pipe(
      M.type<{ age: number }>(),
      M.not({ age: (a) => a >= 5 }, (_) => `Age: ${_.age}`),
      M.orElse((_) => `${_.age} is too old`)
    )

    strictEqual(match({ age: 4 }), "Age: 4")
    strictEqual(match({ age: 5 }), "5 is too old")
  })

  it("predicate with functions", () => {
    const match = pipe(
      M.type<{
        a: number
        b: {
          c: string
          f?: (status: number) => Promise<string>
        }
      }>(),
      M.when({ a: 400 }, (_) => "400"),
      M.when({ b: (b) => b.c === "nested" }, (_) => _.b.c),
      M.orElse(() => "fail")
    )

    strictEqual(match({ b: { c: "nested" }, a: 200 }), "nested")
    strictEqual(match({ b: { c: "nested" }, a: 400 }), "400")
  })

  it("predicate at root level", () => {
    const match = pipe(
      M.type<{
        a: number
        b: {
          c: string
          f?: (status: number) => Promise<string>
        }
      }>(),
      M.when(
        (_) => _.a === 400,
        (_) => "400"
      ),
      M.when({ b: (b) => b.c === "nested" }, (_) => _.b.c),
      M.orElse(() => "fail")
    )

    strictEqual(match({ b: { c: "nested" }, a: 200 }), "nested")
    strictEqual(match({ b: { c: "nested" }, a: 400 }), "400")
  })

  it("symbols", () => {
    const thing = {
      symbol: Symbol(),
      name: "thing"
    } as const

    const match = pipe(
      M.value(thing),
      M.when({ name: "thing" }, (_) => _.name),
      M.exhaustive
    )

    strictEqual(match, "thing")
  })

  it("unify", () => {
    const match = pipe(
      M.type<{ readonly _tag: "A" } | { readonly _tag: "B" }>(),
      M.tag("A", () => E.right("a") as E.Either<string, number>),
      M.tag("B", () => E.right(123) as E.Either<number, string>),
      M.exhaustive
    )

    assertRight(match({ _tag: "B" }), 123)
  })

  it("optional props", () => {
    const match = pipe(
      M.type<{ readonly user?: { readonly name: string } | undefined }>(),
      M.when({ user: M.any }, (_) => _.user?.name),
      M.orElse(() => "no user")
    )

    strictEqual(match({}), "no user")
    strictEqual(match({ user: undefined }), undefined)
    strictEqual(match({ user: { name: "Tim" } }), "Tim")
  })

  it("optional props defined", () => {
    const match = pipe(
      M.type<{ readonly user?: { readonly name: string } | null | undefined }>(),
      M.when({ user: M.defined }, (_) => _.user.name),
      M.orElse(() => "no user")
    )

    strictEqual(match({}), "no user")
    strictEqual(match({ user: undefined }), "no user")
    strictEqual(match({ user: null }), "no user")
    strictEqual(match({ user: { name: "Tim" } }), "Tim")
  })

  it("deep recursive", () => {
    type A =
      | null
      | string
      | number
      | { [K in string]: A }

    const match = pipe(
      M.type<A>(),
      M.when(Predicate.isNull, (_) => {
        assertType<null>()(_) satisfies true
        return "null"
      }),
      M.when(Predicate.isBoolean, (_) => {
        assertType<boolean>()(_) satisfies true
        return "boolean"
      }),
      M.when(Predicate.isNumber, (_) => {
        assertType<number>()(_) satisfies true
        return "number"
      }),
      M.when(Predicate.isString, (_) => {
        assertType<string>()(_) satisfies true
        return "string"
      }),
      M.when(M.record, (_) => {
        assertType<
          Record<string, A>
        >()(_) satisfies true
        return "record"
      }),
      M.when(Predicate.isSymbol, (_) => {
        assertType<symbol>()(_) satisfies true
        return "symbol"
      }),
      M.when(Predicate.isReadonlyRecord, (_) => {
        assertType<{
          readonly [x: string]: unknown
          readonly [x: symbol]: unknown
        }>()(_) satisfies true
        return "readonlyrecord"
      }),
      M.exhaustive
    )

    strictEqual(match(null), "null")
    strictEqual(match(123), "number")
    strictEqual(match("hi"), "string")
    strictEqual(match({}), "record")
  })

  it("nested option", () => {
    type ABC =
      | { readonly _tag: "A" }
      | { readonly _tag: "B" }
      | { readonly _tag: "C" }

    const match = pipe(
      M.type<{ readonly abc: O.Option<ABC> }>(),
      M.when({ abc: { value: { _tag: "A" } } }, (_) => _.abc.value._tag),
      M.orElse((_) => "no match")
    )

    strictEqual(match({ abc: O.some({ _tag: "A" }) }), "A")
    strictEqual(match({ abc: O.some({ _tag: "B" }) }), "no match")
    strictEqual(match({ abc: O.none() }), "no match")
  })

  it("getters", () => {
    class Thing {
      get name() {
        return "thing"
      }
    }

    const match = pipe(
      M.value(new Thing()),
      M.when({ name: "thing" }, (_) => _.name),
      M.orElse(() => "fail")
    )

    strictEqual(match, "thing")
  })

  it("whenOr", () => {
    const match = pipe(
      M.type<
        { _tag: "A"; a: number } | { _tag: "B"; b: number } | { _tag: "C" }
      >(),
      M.whenOr({ _tag: "A" }, { _tag: "B" }, (_) => "A or B"),
      M.when({ _tag: "C" }, (_) => "C"),
      M.exhaustive
    )
    strictEqual(match({ _tag: "A", a: 0 }), "A or B")
    strictEqual(match({ _tag: "B", b: 1 }), "A or B")
    strictEqual(match({ _tag: "C" }), "C")
  })

  it("optional array", () => {
    const match = pipe(
      M.type<{ a?: ReadonlyArray<{ name: string }> }>(),
      M.when({ a: (_) => _.length > 0 }, (_) => `match ${_.a.length}`),
      M.orElse(() => "no match")
    )

    strictEqual(match({ a: [{ name: "Tim" }] }), "match 1")
    strictEqual(match({ a: [] }), "no match")
    strictEqual(match({}), "no match")
  })

  it("whenAnd", () => {
    const match = pipe(
      M.type<
        { _tag: "A"; a: number } | { _tag: "B"; b: number } | { _tag: "C" }
      >(),
      M.whenAnd({ _tag: "A" }, { a: M.number }, (_) => "A"),
      M.whenAnd({ _tag: "B" }, { b: M.number }, (_) => "B"),
      M.when({ _tag: "C" }, (_) => "C"),
      M.exhaustive
    )
    strictEqual(match({ _tag: "A", a: 0 }), "A")
    strictEqual(match({ _tag: "B", b: 1 }), "B")
    strictEqual(match({ _tag: "C" }), "C")
  })

  it("whenAnd nested", () => {
    const match = pipe(
      M.type<{
        status: number
        user?: {
          name: string
          manager?: {
            name: string
          }
        }
        company?: {
          name: string
        }
      }>(),
      M.whenAnd(
        { status: 200 },
        { user: { name: M.string } },
        { user: { manager: { name: M.string } } },
        { company: { name: M.string } },
        (_) =>
          [_.status, _.user.name, _.user.manager.name, _.company.name].join(
            ", "
          )
      ),
      M.whenAnd(
        { status: 200 },
        { user: { name: M.string } },
        { company: { name: M.string } },
        (_) => [_.status, _.user.name, _.company.name].join(", ")
      ),
      M.whenAnd(
        { status: 200 },
        { user: { name: M.string } },
        (_) => [_.status, _.user.name].join(", ")
      ),
      M.whenAnd(
        { status: M.number },
        { user: { name: M.string } },
        (_) => ["number", _.user.name].join(", ")
      ),
      M.when({ status: M.number }, (_) => "number"),
      M.exhaustive
    )
    strictEqual(
      match({
        status: 200,
        user: { name: "Tim", manager: { name: "Joe" } },
        company: { name: "Apple" }
      }),
      "200, Tim, Joe, Apple"
    )
    strictEqual(
      match({
        status: 200,
        user: { name: "Tim" },
        company: { name: "Apple" }
      }),
      "200, Tim, Apple"
    )
    strictEqual(
      match({
        status: 200,
        user: { name: "Tim" },
        company: { name: "Apple" }
      }),
      "200, Tim, Apple"
    )
    strictEqual(
      match({
        status: 200,
        user: { name: "Tim" }
      }),
      "200, Tim"
    )
    strictEqual(match({ status: 100, user: { name: "Tim" } }), "number, Tim")
    strictEqual(match({ status: 100 }), "number")
  })

  it("instanceOf", () => {
    const match = pipe(
      M.type<Uint8Array | Uint16Array>(),
      M.when(M.instanceOf(Uint8Array), (_) => {
        assertType<Uint8Array>()(_) satisfies true
        return "uint8"
      }),
      M.when(M.instanceOf(Uint16Array), (_) => {
        assertType<Uint16Array>()(_) satisfies true
        return "uint16"
      }),
      M.orElse((_) => {
        throw "absurd"
      })
    )

    strictEqual(match(new Uint8Array([1, 2, 3])), "uint8")
    strictEqual(match(new Uint16Array([1, 2, 3])), "uint16")
  })

  it("instanceOf doesnt modify type", () => {
    class Test {}
    class Test2 {}

    const a = new Test()

    const result = pipe(
      M.value<Test | Test2>(a),
      M.when(M.instanceOf(Test), (_) => {
        assertType<Test>()(_) satisfies true
        return 1
      }),
      M.orElse(() => 0)
    )

    strictEqual(result, 1)
  })

  it("tags", () => {
    const match = pipe(
      M.type<{ _tag: "A"; a: number } | { _tag: "B"; b: number }>(),
      M.tags({
        A: (_) => _.a,
        B: (_) => "B"
      }),
      M.exhaustive
    )

    strictEqual(match({ _tag: "A", a: 1 }), 1)
    strictEqual(match({ _tag: "B", b: 1 }), "B")
  })

  it("tagsExhaustive", () => {
    const match = pipe(
      M.type<{ _tag: "A"; a: number } | { _tag: "B"; b: number }>(),
      M.tagsExhaustive({
        A: (_) => _.a,
        B: (_) => "B"
      })
    )

    strictEqual(match({ _tag: "A", a: 1 }), 1)
    strictEqual(match({ _tag: "B", b: 1 }), "B")
  })

  it("valueTags", () => {
    type Value = { _tag: "A"; a: number } | { _tag: "B"; b: number }
    const match = pipe(
      { _tag: "A", a: 123 } as Value,
      M.valueTags({
        A: (_) => _.a,
        B: (_) => "B"
      })
    )

    strictEqual(match, 123)
  })

  it("typeTags", () => {
    type Value = { _tag: "A"; a: number } | { _tag: "B"; b: number }
    const matcher = M.typeTags<Value>()

    strictEqual(
      matcher({
        A: (_) => _.a,
        B: (_) => "fail"
      })({ _tag: "A", a: 123 }),
      123
    )

    strictEqual(
      matcher({
        A: (_) => _.a,
        B: (_) => "B"
      })({ _tag: "B", b: 123 }),
      "B"
    )
  })

  it("refinement - with unknown", () => {
    const isArray = (_: unknown): _ is ReadonlyArray<unknown> => Array.isArray(_)

    const match = pipe(
      M.type<string | Array<number>>(),
      M.when(isArray, (_) => {
        assertType<Array<number>>()(_) satisfies true
        return "array"
      }),
      M.when(Predicate.isString, () => "string"),
      M.exhaustive
    )

    strictEqual(match([]), "array")
    strictEqual(match("fail"), "string")
  })

  it("refinement nested - with unknown", () => {
    const isArray = (_: unknown): _ is ReadonlyArray<unknown> => Array.isArray(_)

    const match = pipe(
      M.type<{ readonly a: string | Array<number> }>(),
      M.when({ a: isArray }, (_) => {
        assertType<{ a: ReadonlyArray<number> }>()(_) satisfies true
        return "array"
      }),
      M.orElse(() => "fail")
    )

    strictEqual(match({ a: [123] }), "array")
    strictEqual(match({ a: "fail" }), "fail")
  })

  it("unknown - refinement", () => {
    const match = pipe(
      M.type<unknown>(),
      M.when(Predicate.isReadonlyRecord, (_) => {
        assertType<{
          readonly [x: string]: unknown
          readonly [x: symbol]: unknown
        }>()(_) satisfies true
        return "record"
      }),
      M.orElse(() => "unknown")
    )

    strictEqual(match({}), "record")
    strictEqual(match([]), "unknown")
  })

  it("any - refinement", () => {
    const match = pipe(
      M.type<any>(),
      M.when(Predicate.isReadonlyRecord, (_) => {
        assertType<{
          readonly [x: string]: unknown
          readonly [x: symbol]: unknown
        }>()(_) satisfies true
        return "record"
      }),
      M.orElse(() => "unknown")
    )

    strictEqual(match({}), "record")
    strictEqual(match([]), "unknown")
  })

  it("pattern type is not fixed by the function argument type", () => {
    type T =
      | { resolveType: "A"; value: number }
      | { resolveType: "B"; value: number }
      | { resolveType: "C"; value: number }

    const value = { resolveType: "A", value: 12 } as T

    const doStuff = (x: { value: number }) => x

    const result = pipe(
      M.value(value),
      M.when({ resolveType: M.is("A", "B") }, doStuff),
      M.not({ resolveType: M.is("A", "B") }, doStuff),
      M.exhaustive
    )

    assertType<{ value: number }>()(result) satisfies true
  })

  it("non literal refinement", () => {
    const a: number = 1
    const b: string = "b"

    const match = M.type<{ a: number; b: string }>().pipe(
      M.when({ a, b }, (_) => {
        assertType<{ a: number; b: string }>()(_) satisfies true
        return "ok"
      }),
      M.either
    )

    assertType<
      E.Either<string, { a: number; b: string }>
    >()(match({ a, b })) satisfies true
  })

  it("discriminatorStartsWith", () => {
    const match = pipe(
      M.type<{ type: "A" } | { type: "B" } | { type: "A.A" } | {}>(),
      M.discriminatorStartsWith("type")("A", (_) => 1 as const),
      M.discriminatorStartsWith("type")("B", (_) => 2 as const),
      M.orElse((_) => 3 as const)
    )
    strictEqual(match({ type: "A" }), 1)
    strictEqual(match({ type: "A.A" }), 1)
    strictEqual(match({ type: "B" }), 2)
    strictEqual(match({}), 3)
  })

  it("symbol", () => {
    const match = pipe(
      M.type<unknown>(),
      M.when(M.symbol, (_) => "symbol"),
      M.orElse(() => "else")
    )
    strictEqual(match(Symbol.for("a")), "symbol")
    strictEqual(match(123), "else")
  })

  it("withReturnType", () => {
    const match = pipe(
      M.type<string>(),
      M.withReturnType<string>(),
      M.when("A", (_) => "A"),
      M.orElse(() => "else")
    )
    strictEqual(match("A"), "A")
    strictEqual(match("a"), "else")
  })

  it("withReturnType after predicate", () => {
    const match = pipe(
      M.type<string>(),
      M.when("A", (_) => "A"),
      M.withReturnType<string>(),
      M.orElse(() => "else")
    )
    strictEqual(match("A"), "A")
    strictEqual(match("a"), "else")
  })

  it("withReturnType mismatch", () => {
    const match = pipe(
      M.type<string>(),
      M.withReturnType<string>(),
      // @ts-expect-error
      M.when("A", (_) => 123),
      M.orElse(() => "else")
    )
    // @ts-expect-error
    strictEqual(match("A"), 123)
    strictEqual(match("a"), "else")
  })

  it("withReturnType constraint mismatch", () => {
    pipe(
      M.type<string>(),
      M.when("A", (_) => 123),
      M.withReturnType<string>(),
      // @ts-expect-error
      M.orElse(() => "else")
    )
  })

  it("withReturnType union", () => {
    const match = pipe(
      M.type<string>(),
      M.withReturnType<"a" | "b">(),
      M.when("A", (_) => "a"),
      M.orElse((_) => "b")
    )
    strictEqual(match("A"), "a")
    strictEqual(match("a"), "b")
  })

  it("withReturnType union mismatch", () => {
    pipe(
      M.type<string>(),
      M.withReturnType<"a" | "b">(),
      M.when("A", (_) => "a"),
      // @ts-expect-error
      M.orElse((_) => "c")
    )
  })
})
