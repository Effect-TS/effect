import { pipe, Struct } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("TaggedClass", () => {
  it("the constructor should add a `_tag` field", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    expect({ ...new TA({ a: "a" }) }).toStrictEqual({ _tag: "TA", a: "a" })
  })

  it("should expose the fields and the tag", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    Util.expectFields(TA.fields, { _tag: S.getClassTag("TA"), a: S.String })
    expect(S.Struct(TA.fields).make({ a: "a" })).toStrictEqual({ _tag: "TA", a: "a" })
    expect(TA._tag).toBe("TA")
  })

  it("should expose the identifier", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    expect(TA.identifier).toEqual("TA")
    class TB extends S.TaggedClass<TB>("id")("TB", { a: S.String }) {}
    expect(TB.identifier).toEqual("id")
  })

  it("constructor parameters should not overwrite the tag", async () => {
    class A extends S.TaggedClass<A>()("A", {
      a: S.String
    }) {}
    expect(new A({ ...{ _tag: "B", a: "a" } })._tag).toBe("A")
    expect(new A({ ...{ _tag: "B", a: "a" } }, true)._tag).toBe("A")
  })

  it("a TaggedClass with no fields should have a void constructor", () => {
    class TA extends S.TaggedClass<TA>()("TA", {}) {}
    expect({ ...new TA() }).toStrictEqual({ _tag: "TA" })
    expect({ ...new TA(undefined) }).toStrictEqual({ _tag: "TA" })
    expect({ ...new TA(undefined, true) }).toStrictEqual({ _tag: "TA" })
  })

  it("a custom _tag field should be not allowed", () => {
    expect(() => {
      class _TA extends S.TaggedClass<_TA>()("TA", { _tag: S.Literal("X"), a: S.String }) {}
      _TA
    }).toThrow(
      new Error(`Duplicate property signature
details: Duplicate key "_tag"`)
    )
  })

  it("should accept a Struct as argument", () => {
    const fields = { a: S.String, b: S.Number }
    class A extends S.TaggedClass<A>()("A", S.Struct(fields)) {}
    Util.expectFields(A.fields, { _tag: S.getClassTag("A"), ...fields })
  })

  it("should accept a refinement of a Struct as argument", async () => {
    const fields = { a: S.Number, b: S.Number }
    class A extends S.TaggedClass<A>()(
      "A",
      S.Struct(fields).pipe(S.filter(({ a, b }) => a === b ? undefined : "a should be equal to b"))
    ) {}
    Util.expectFields(A.fields, { _tag: S.getClassTag("A"), ...fields })
    await Util.expectDecodeUnknownSuccess(A, new A({ a: 1, b: 1 }))
    await Util.expectDecodeUnknownFailure(
      A,
      { _tag: "A", a: 1, b: 2 },
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ Predicate refinement failure
         └─ a should be equal to b`
    )
    expect(() => new A({ a: 1, b: 2 })).toThrow(
      new Error(`A (Constructor)
└─ Predicate refinement failure
   └─ a should be equal to b`)
    )
  })

  it("decoding", async () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.NonEmptyString }) {}
    await Util.expectDecodeUnknownSuccess(TA, { _tag: "TA", a: "a" }, new TA({ a: "a" }))
    await Util.expectDecodeUnknownFailure(
      TA,
      { a: "a" },
      `(TA (Encoded side) <-> TA)
└─ Encoded side transformation failure
   └─ TA (Encoded side)
      └─ ["_tag"]
         └─ is missing`
    )
    await Util.expectDecodeUnknownFailure(
      TA,
      { _tag: "TA", a: "" },
      `(TA (Encoded side) <-> TA)
└─ Encoded side transformation failure
   └─ TA (Encoded side)
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
    )
  })

  it("encoding", async () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.NonEmptyString }) {}
    await Util.expectEncodeSuccess(TA, new TA({ a: "a" }), { _tag: "TA", a: "a" })
    await Util.expectEncodeSuccess(TA, { _tag: "TA", a: "a" } as any, { _tag: "TA", a: "a" })
    await Util.expectEncodeFailure(
      TA,
      new TA({ a: "" }, true),
      `(TA (Encoded side) <-> TA)
└─ Encoded side transformation failure
   └─ TA (Encoded side)
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
    )
  })

  it("can be extended with Class fields", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    class B extends S.Class<B>("B")({
      b: S.Number,
      ...TA.fields
    }) {}
    Util.expectFields(B.fields, {
      _tag: S.getClassTag("TA"),
      a: S.String,
      b: S.Number
    })
    expect({ ...new B({ _tag: "TA", a: "a", b: 1 }) }).toStrictEqual({ _tag: "TA", a: "a", b: 1 })
  })

  it("can be extended with TaggedClass fields", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    class TB extends S.TaggedClass<TB>()("TB", {
      b: S.Number,
      ...pipe(TA.fields, Struct.omit("_tag"))
    }) {}
    Util.expectFields(TB.fields, {
      _tag: S.getClassTag("TB"),
      a: S.String,
      b: S.Number
    })
    expect({ ...new TB({ a: "a", b: 1 }) }).toStrictEqual({ _tag: "TB", a: "a", b: 1 })
  })

  it("equivalence", () => {
    class A extends S.TaggedClass<A>()("A", {
      a: S.String
    }) {}
    const eqA = S.equivalence(A)
    expect(eqA(new A({ a: "a" }), new A({ a: "a" }))).toBe(true)
    expect(eqA(new A({ a: "a" }), new A({ a: "b" }))).toBe(false)

    class B extends S.TaggedClass<B>()("B", {
      b: S.Number,
      as: S.Array(A)
    }) {}
    const eqB = S.equivalence(B)
    expect(eqB(new B({ b: 1, as: [] }), new B({ b: 1, as: [] }))).toBe(true)
    expect(eqB(new B({ b: 1, as: [] }), new B({ b: 2, as: [] }))).toBe(false)
    expect(eqB(new B({ b: 1, as: [new A({ a: "a" })] }), new B({ b: 1, as: [new A({ a: "a" })] }))).toBe(true)
    expect(eqB(new B({ b: 1, as: [new A({ a: "a" })] }), new B({ b: 1, as: [new A({ a: "b" })] }))).toBe(false)
  })

  it("baseline", () => {
    class TaggedPerson extends S.TaggedClass<TaggedPerson>()("TaggedPerson", {
      id: S.Number,
      name: S.String.pipe(S.nonEmptyString())
    }) {
      get upperName() {
        return this.name.toUpperCase()
      }
    }

    class TaggedPersonWithAge extends TaggedPerson.extend<TaggedPersonWithAge>("TaggedPersonWithAge")({
      age: S.Number
    }) {
      get isAdult() {
        return this.age >= 18
      }
    }

    let person = new TaggedPersonWithAge({ id: 1, name: "John", age: 30 })

    expect(String(person)).toEqual(
      `TaggedPersonWithAge({ "_tag": "TaggedPerson", "id": 1, "name": "John", "age": 30 })`
    )
    expect(person._tag).toEqual("TaggedPerson")
    expect(person.upperName).toEqual("JOHN")

    expect(() => S.decodeUnknownSync(TaggedPersonWithAge)({ id: 1, name: "John", age: 30 })).toThrow(
      new Error(
        `(TaggedPersonWithAge (Encoded side) <-> TaggedPersonWithAge)
└─ Encoded side transformation failure
   └─ TaggedPersonWithAge (Encoded side)
      └─ ["_tag"]
         └─ is missing`
      )
    )
    person = S.decodeUnknownSync(TaggedPersonWithAge)({
      _tag: "TaggedPerson",
      id: 1,
      name: "John",
      age: 30
    })
    expect(person._tag).toEqual("TaggedPerson")
    expect(person.upperName).toEqual("JOHN")
  })

  it("should expose a make constructor", () => {
    class TA extends S.TaggedClass<TA>()("TA", {
      n: S.NumberFromString
    }) {
      a() {
        return this.n + "a"
      }
    }
    const ta = TA.make({ n: 1 })
    expect(ta instanceof TA).toEqual(true)
    expect(ta._tag).toEqual("TA")
    expect(ta.a()).toEqual("1a")
  })
})
