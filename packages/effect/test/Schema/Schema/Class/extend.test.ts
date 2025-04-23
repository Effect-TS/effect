import { describe, it } from "@effect/vitest"
import { assertInstanceOf, assertSome, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { JSONSchema, Schema as S, SchemaAST as AST } from "effect"
import * as Util from "../../TestUtils.js"

class Person extends S.Class<Person>("Person")({
  id: S.Number,
  name: S.String.pipe(S.nonEmptyString())
}) {
  get upperName() {
    return this.name.toUpperCase()
  }
}

class PersonWithAge extends Person.extend<PersonWithAge>("PersonWithAge")({
  age: S.Number
}) {
  get isAdult() {
    return this.age >= 18
  }
}

class PersonWithNick extends PersonWithAge.extend<PersonWithNick>("PersonWithNick")({
  nick: S.String
}) {}

describe("extend", () => {
  it("1 extend", () => {
    const person = S.decodeUnknownSync(PersonWithAge)({
      id: 1,
      name: "John",
      age: 30
    })
    deepStrictEqual(PersonWithAge.fields, {
      ...Person.fields,
      age: S.Number
    })
    strictEqual(PersonWithAge.identifier, "PersonWithAge")
    strictEqual(person.name, "John")
    strictEqual(person.age, 30)
    strictEqual(person.isAdult, true)
    strictEqual(person.upperName, "JOHN")
    strictEqual(typeof person.upperName, "string")
  })

  it("2 extend", () => {
    const person = S.decodeUnknownSync(PersonWithNick)({
      id: 1,
      name: "John",
      age: 30,
      nick: "Joe"
    })
    strictEqual(person.age, 30)
    strictEqual(person.nick, "Joe")
  })

  it("should accept a Struct as argument", () => {
    const baseFields = { base: S.String }
    class Base extends S.Class<Base>("Base")(baseFields) {}
    const fields = { a: S.String, b: S.Number }
    class A extends Base.extend<A>("A")(S.Struct(fields)) {}
    Util.expectFields(A.fields, { ...baseFields, ...fields })
  })

  it("should accept a refinement of a Struct as argument", async () => {
    const baseFields = { base: S.String }
    class Base extends S.Class<Base>("Base")(baseFields) {}
    const fields = { a: S.Number, b: S.Number }
    class A extends Base.extend<A>("A")(
      S.Struct(fields).pipe(S.filter(({ a, b }) => a === b ? undefined : "a should be equal to b"))
    ) {}
    Util.expectFields(A.fields, { ...baseFields, ...fields })
    await Util.assertions.decoding.succeed(A, new A({ base: "base", a: 1, b: 1 }))
    await Util.assertions.decoding.fail(
      A,
      { base: "base", a: 1, b: 2 },
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ Predicate refinement failure
         └─ a should be equal to b`
    )
    Util.assertions.parseError(
      () => new A({ base: "base", a: 1, b: 2 }),
      `A (Constructor)
└─ Predicate refinement failure
   └─ a should be equal to b`
    )
  })

  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      PersonWithAge,
      { id: 1, name: "John" },
      `(PersonWithAge (Encoded side) <-> PersonWithAge)
└─ Encoded side transformation failure
   └─ PersonWithAge (Encoded side)
      └─ ["age"]
         └─ is missing`
    )
  })

  it("should expose a make constructor", () => {
    class A extends S.Class<A>("A")({
      n: S.NumberFromString
    }) {
      a() {
        return this.n + "a"
      }
    }
    class B extends A.extend<B>("B")({
      c: S.String
    }) {
      b() {
        return this.n + "b"
      }
    }
    const b = B.make({ n: 1, c: "c" })
    assertInstanceOf(b, B)
    strictEqual(b.a(), "1a")
    strictEqual(b.b(), "1b")
  })

  it("users can override an instance member property", () => {
    class OverrideBase1 extends S.Class<OverrideBase1>("OverrideBase1")(S.Struct({
      a: S.String
    })) {
      readonly b: number = 1
    }

    class OverrideExtended1 extends OverrideBase1.extend<OverrideExtended1>(
      "OverrideExtended1"
    )({
      c: S.String
    }) {
      override readonly b = 2
    }

    strictEqual(new OverrideExtended1({ a: "a", c: "c" }).b, 2)
  })

  it("users can override an instance member function", () => {
    class OverrideBase2 extends S.Class<OverrideBase2>("OverrideBase2")(S.Struct({
      a: S.String
    })) {
      b(): number {
        return 1
      }
    }

    class OverrideExtended2 extends OverrideBase2.extend<OverrideExtended2>(
      "OverrideExtended2"
    )({
      c: S.String
    }) {
      override b(): 2 {
        return 2
      }
    }

    strictEqual(new OverrideExtended2({ a: "a", c: "c" }).b(), 2)
  })

  it("users can override a field with an instance member property", () => {
    class OverrideBase3 extends S.Class<OverrideBase3>("OverrideBase3")(S.Struct({
      a: S.String
    })) {}

    class OverrideExtended3 extends OverrideBase3.extend<OverrideExtended3>(
      "OverrideExtended3"
    )({
      c: S.String
    }) {
      override readonly a = "default"
    }

    strictEqual(new OverrideExtended3({ a: "a", c: "c" }).a, "default")
  })

  it("users can't override an instance member property with a field", () => {
    class OverrideBase4 extends S.Class<OverrideBase4>("OverrideBase4")(S.Struct({
      a: S.String
    })) {
      readonly b = 1
    }

    class OverrideExtended4 extends OverrideBase4.extend<OverrideExtended4>(
      "OverrideExtended4"
    )({
      b: S.Number
    }) {}

    strictEqual(new OverrideExtended4({ a: "a", b: 2 }).b, 1)
  })

  describe("should support annotations when declaring the Class", () => {
    it("single argument", async () => {
      class A extends S.Class<A>("A")({
        a: S.NonEmptyString
      }) {}
      class B extends A.extend<B>("B")({
        b: S.NonEmptyString
      }, { title: "mytitle" }) {}

      strictEqual(B.ast.to.annotations[AST.TitleAnnotationId], "mytitle")

      await Util.assertions.encoding.fail(
        B,
        { a: "a", b: "" },
        `(B (Encoded side) <-> B)
└─ Type side transformation failure
   └─ mytitle
      └─ ["b"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
      )
    })

    it("tuple argument", async () => {
      class A extends S.Class<A>("A")({
        a: S.NonEmptyString
      }) {}
      class B extends A.extend<B>("B")({
        b: S.NonEmptyString
      }, [
        { identifier: "TypeID", description: "TypeDescription" },
        { identifier: "TransformationID" },
        { identifier: "EncodedID" }
      ]) {}
      assertSome(AST.getIdentifierAnnotation(B.ast.to), "TypeID")
      assertSome(AST.getIdentifierAnnotation(B.ast), "TransformationID")
      assertSome(AST.getIdentifierAnnotation(B.ast.from), "EncodedID")

      await Util.assertions.decoding.fail(
        B,
        {},
        `TransformationID
└─ Encoded side transformation failure
   └─ EncodedID
      └─ ["a"]
         └─ is missing`
      )

      await Util.assertions.encoding.fail(
        B,
        { a: "a", b: "" },
        `TransformationID
└─ Type side transformation failure
   └─ TypeID
      └─ ["b"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
      )

      const ctor = { make: B.make.bind(B) }

      Util.assertions.make.fail(
        ctor,
        null as any,
        `TypeID
└─ ["a"]
   └─ is missing`
      )

      deepStrictEqual(JSONSchema.make(S.typeSchema(B)), {
        "$defs": {
          "NonEmptyString": {
            "title": "nonEmptyString",
            "description": "a non empty string",
            "minLength": 1,
            "type": "string"
          },
          "TypeID": {
            "additionalProperties": false,
            "description": "TypeDescription",
            "properties": {
              "a": {
                "$ref": "#/$defs/NonEmptyString"
              },
              "b": {
                "$ref": "#/$defs/NonEmptyString"
              }
            },
            "required": ["a", "b"],
            "type": "object"
          }
        },
        "$ref": "#/$defs/TypeID",
        "$schema": "http://json-schema.org/draft-07/schema#"
      })

      deepStrictEqual(JSONSchema.make(B), {
        "$defs": {
          "NonEmptyString": {
            "title": "nonEmptyString",
            "description": "a non empty string",
            "minLength": 1,
            "type": "string"
          },
          "TransformationID": {
            "additionalProperties": false,
            "description": "TypeDescription",
            "properties": {
              "a": {
                "$ref": "#/$defs/NonEmptyString"
              },
              "b": {
                "$ref": "#/$defs/NonEmptyString"
              }
            },
            "required": ["a", "b"],
            "type": "object"
          }
        },
        "$ref": "#/$defs/TransformationID",
        "$schema": "http://json-schema.org/draft-07/schema#"
      })
    })
  })
})
