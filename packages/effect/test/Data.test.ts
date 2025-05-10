import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Data, Equal, pipe } from "effect"

describe("Data", () => {
  it("struct", () => {
    const x = Data.struct({ a: 0, b: 1, c: 2 })
    const y = Data.struct({ a: 0, b: 1, c: 2 })
    const { a, b, c } = x
    strictEqual(a, 0)
    strictEqual(b, 1)
    strictEqual(c, 2)
    assertTrue(Equal.equals(x, y))
    assertFalse(Equal.equals(x, Data.struct({ a: 0 })))

    // different keys length
    assertFalse(Equal.equals(Data.struct({ a: 0, b: 1 }), Data.struct({ a: 0 })))
    // same length but different keys
    assertFalse(Equal.equals(Data.struct({ a: 0 }), Data.struct({ b: 1 })))
  })

  it("unsafeStruct", () => {
    const x = Data.unsafeStruct({ a: 0, b: 1, c: 2 })
    const y = Data.unsafeStruct({ a: 0, b: 1, c: 2 })
    const { a, b, c } = x
    strictEqual(a, 0)
    strictEqual(b, 1)
    strictEqual(c, 2)
    assertTrue(Equal.equals(x, y))
  })

  it("tuple", () => {
    const x = Data.tuple(0, 1, 2)
    const y = Data.tuple(0, 1, 2)
    const [a, b, c] = x
    strictEqual(a, 0)
    strictEqual(b, 1)
    strictEqual(c, 2)
    assertTrue(Equal.equals(x, y))
    assertFalse(Equal.equals(x, Data.tuple(0, 1)))
  })

  it("array", () => {
    const x = Data.array([0, 1, 2])
    const y = Data.array([0, 1, 2])
    const [a, b, c] = x
    strictEqual(a, 0)
    strictEqual(b, 1)
    strictEqual(c, 2)
    assertTrue(Equal.equals(x, y))
    assertTrue(Equal.equals(x, Data.tuple(0, 1, 2)))
    assertFalse(Equal.equals(x, Data.array([0, 1])))

    // different length
    assertFalse(Equal.equals(Data.array([0, 1, 2]), Data.array([0, 1])))
  })

  it("case", () => {
    interface Person {
      readonly name: string
    }

    const Person = Data.case<Person>()

    const a = Person({ name: "Mike" })
    const b = Person({ name: "Mike" })
    const c = Person({ name: "Foo" })

    strictEqual(a.name, "Mike")
    strictEqual(b.name, "Mike")
    strictEqual(c.name, "Foo")
    assertTrue(Equal.equals(a, b))
    assertFalse(Equal.equals(a, c))

    const Empty = Data.case()
    assertTrue(Equal.equals(Empty(), Empty()))
  })

  it("tagged", () => {
    interface Person {
      readonly _tag: "Person"
      readonly name: string
    }

    const Person = Data.tagged<Person>("Person")

    const a = Person({ name: "Mike" })
    const b = Person({ name: "Mike" })
    const c = Person({ name: "Foo" })

    strictEqual(a._tag, "Person")
    strictEqual(a.name, "Mike")
    strictEqual(b.name, "Mike")
    strictEqual(c.name, "Foo")
    assertTrue(Equal.equals(a, b))
    assertFalse(Equal.equals(a, c))
  })

  it("case class", () => {
    class Person extends Data.Class<{ name: string }> {}
    const a = new Person({ name: "Mike" })
    const b = new Person({ name: "Mike" })
    const c = new Person({ name: "Foo" })

    strictEqual(a.name, "Mike")
    strictEqual(b.name, "Mike")
    strictEqual(c.name, "Foo")
    assertTrue(Equal.equals(a, b))
    assertFalse(Equal.equals(a, c))

    // different keys length
    class D extends Data.Class<{ d: string; e: string }> {}
    const d = new D({ d: "d", e: "e" })
    assertFalse(Equal.equals(a, d))
    // same length but different keys
    class E extends Data.Class<{ e: string }> {}
    const e = new E({ e: "e" })
    assertFalse(Equal.equals(a, e))
  })

  it("date compares by value", () => {
    const date = new Date()
    const a = Data.struct({ date: new Date(date.toISOString()) })
    const b = Data.struct({ date: new Date(date.toISOString()) })

    assertTrue(Equal.equals(a, b))
  })

  it("URL compares by value", () => {
    const a = Data.struct({ date: new URL("http://example.com") })
    const b = Data.struct({ date: new URL("http://example.com") })
    const c = Data.struct({ date: new URL("https://effect.website") })

    assertTrue(Equal.equals(a, b))
    assertFalse(Equal.equals(a, c))
  })

  it("tagged class", () => {
    class Person extends Data.TaggedClass("Person")<{ name: string }> {}
    const a = new Person({ name: "Mike" })
    const b = new Person({ name: "Mike" })
    const c = new Person({ name: "Foo" })

    strictEqual(a._tag, "Person")
    strictEqual(a.name, "Mike")
    strictEqual(b.name, "Mike")
    strictEqual(c.name, "Foo")
    assertTrue(Equal.equals(a, b))
    assertFalse(Equal.equals(a, c))
  })

  it("tagged - empty", () => {
    interface Person {
      readonly _tag: "Person"
    }

    const Person = Data.tagged<Person>("Person")

    const a = Person()
    const b = Person()

    assertTrue(Equal.equals(a, b))
  })

  it("TaggedClass - empty", () => {
    class Person extends Data.TaggedClass("Person")<{}> {}

    const a = new Person()
    const b = new Person()

    assertTrue(Equal.equals(a, b))
  })

  it("tagged - don't override tag", () => {
    interface Foo {
      readonly _tag: "Foo"
      readonly value: string
    }
    const Foo = Data.tagged<Foo>("Foo")
    interface Bar {
      readonly _tag: "Bar"
      readonly value: number
    }
    const Bar = Data.tagged<Bar>("Bar")

    const foo = Foo({ value: "test" })
    const bar = Bar({ ...foo, value: 10 })

    strictEqual(bar._tag, "Bar")
  })

  it("taggedEnum", () => {
    type HttpError = Data.TaggedEnum<{
      NotFound: {}
      InternalServerError: { reason: string }
    }>
    const {
      $is,
      $match,
      InternalServerError,
      NotFound
    } = Data.taggedEnum<HttpError>()

    const a = NotFound()
    const b = InternalServerError({ reason: "test" })
    const c = InternalServerError({ reason: "test" })

    strictEqual(a._tag, "NotFound")
    strictEqual(b._tag, "InternalServerError")

    strictEqual(b.reason, "test")
    strictEqual(c.reason, "test")

    assertFalse(Equal.equals(a, b))
    assertTrue(Equal.equals(b, c))

    assertTrue($is("NotFound")(a))
    assertFalse($is("InternalServerError")(a))
    const matcher = $match({
      NotFound: () => 0,
      InternalServerError: () => 1
    })
    strictEqual(matcher(a), 0)
    strictEqual(matcher(b), 1)
  })

  it("taggedEnum - generics", () => {
    type Result<E, A> = Data.TaggedEnum<{
      Success: { value: A }
      Failure: {
        error: E
        message?: string
      }
    }>
    interface ResultDefinition extends Data.TaggedEnum.WithGenerics<2> {
      readonly taggedEnum: Result<this["A"], this["B"]>
    }
    const { $is, $match, Failure, Success } = Data.taggedEnum<ResultDefinition>()

    const a = Success({ value: 1 }) satisfies Result<unknown, number>
    const b = Failure({ error: "test" }) satisfies Result<string, unknown>
    const c = Success({ value: 1 }) satisfies Result<string, number>

    strictEqual(a._tag, "Success")
    strictEqual(b._tag, "Failure")
    strictEqual(c._tag, "Success")

    strictEqual(a.value, 1)
    strictEqual(b.error, "test")

    assertFalse(Equal.equals(a, b))
    assertTrue(Equal.equals(a, c))

    const aResult = Success({ value: 1 }) as Result<unknown, number>
    const bResult = Failure({ error: "boom" }) as Result<string, number>

    strictEqual(
      $match(aResult, {
        Success: (_) => 1,
        Failure: (_) => 2
      }),
      1
    )
    const result = pipe(
      bResult,
      $match({
        Success: (_) => _.value,
        Failure: (_) => _.error
      })
    )
    result satisfies string | number
    strictEqual(result, "boom")

    assertTrue($is("Success")(aResult))
    aResult satisfies { readonly _tag: "Success"; readonly value: number }
    strictEqual(aResult.value, 1)

    assertTrue($is("Failure")(bResult))
    bResult satisfies { readonly _tag: "Failure"; readonly error: string }
    strictEqual(bResult.error, "boom")
  })

  describe("Error", () => {
    it("should support a message field", () => {
      class MyError extends Data.Error<{ message: string; a: number }> {}
      const e = new MyError({ message: "Oh no!", a: 1 })
      strictEqual(e.message, "Oh no!")
      strictEqual(e.a, 1)
    })

    it("toJSON includes all args", () => {
      class MyError extends Data.Error<{ message: string; a: number; cause: string }> {}
      const e = new MyError({ message: "Oh no!", a: 1, cause: "Boom" })
      deepStrictEqual(e.toJSON(), { message: "Oh no!", a: 1, cause: "Boom" })
    })
  })

  describe("TaggedError", () => {
    it("toJSON includes all args", () => {
      class MyError extends Data.TaggedError("MyError")<{ message: string; a: number; cause: string }> {}
      const e = new MyError({ message: "Oh no!", a: 1, cause: "Boom" })
      deepStrictEqual(e.toJSON(), {
        _tag: "MyError",
        message: "Oh no!",
        a: 1,
        cause: "Boom"
      })
    })
  })
})
