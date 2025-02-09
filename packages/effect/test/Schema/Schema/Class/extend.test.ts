import { JSONSchema, Option, Schema as S, SchemaAST as AST } from "effect"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

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
    expect(PersonWithAge.fields).toStrictEqual({
      ...Person.fields,
      age: S.Number
    })
    expect(PersonWithAge.identifier).toStrictEqual("PersonWithAge")
    expect(person.name).toEqual("John")
    expect(person.age).toEqual(30)
    expect(person.isAdult).toEqual(true)
    expect(person.upperName).toEqual("JOHN")
    expect(typeof person.upperName).toEqual("string")
  })

  it("2 extend", () => {
    const person = S.decodeUnknownSync(PersonWithNick)({
      id: 1,
      name: "John",
      age: 30,
      nick: "Joe"
    })
    expect(person.age).toEqual(30)
    expect(person.nick).toEqual("Joe")
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
    await Util.expectDecodeUnknownSuccess(A, new A({ base: "base", a: 1, b: 1 }))
    await Util.expectDecodeUnknownFailure(
      A,
      { base: "base", a: 1, b: 2 },
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ Predicate refinement failure
         └─ a should be equal to b`
    )
    expect(() => new A({ base: "base", a: 1, b: 2 })).toThrow(
      new Error(`A (Constructor)
└─ Predicate refinement failure
   └─ a should be equal to b`)
    )
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
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
    expect(b instanceof B).toEqual(true)
    expect(b.a()).toEqual("1a")
    expect(b.b()).toEqual("1b")
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

    expect(new OverrideExtended1({ a: "a", c: "c" }).b).toEqual(2)
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

    expect(new OverrideExtended2({ a: "a", c: "c" }).b()).toEqual(2)
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

    expect(new OverrideExtended3({ a: "a", c: "c" }).a).toEqual("default")
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

    expect(new OverrideExtended4({ a: "a", b: 2 }).b).toEqual(1)
  })

  describe("should support annotations when declaring the Class", () => {
    it("single argument", async () => {
      class A extends S.Class<A>("A")({
        a: S.NonEmptyString
      }) {}
      class B extends A.extend<B>("B")({
        b: S.NonEmptyString
      }, { title: "mytitle" }) {}

      expect(B.ast.to.annotations[AST.TitleAnnotationId]).toEqual("mytitle")

      await Util.expectEncodeFailure(
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
      expect(AST.getIdentifierAnnotation(B.ast.to)).toEqual(Option.some("TypeID"))
      expect(AST.getIdentifierAnnotation(B.ast)).toEqual(Option.some("TransformationID"))
      expect(AST.getIdentifierAnnotation(B.ast.from)).toEqual(Option.some("EncodedID"))

      await Util.expectDecodeUnknownFailure(
        B,
        {},
        `TransformationID
└─ Encoded side transformation failure
   └─ EncodedID
      └─ ["a"]
         └─ is missing`
      )

      await Util.expectEncodeFailure(
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

      Util.expectConstructorFailure(
        ctor,
        null,
        `TypeID
└─ ["a"]
   └─ is missing`
      )

      expect(JSONSchema.make(S.typeSchema(B))).toStrictEqual({
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

      expect(JSONSchema.make(B)).toStrictEqual(
        {
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
        }
      )
    })
  })
})
