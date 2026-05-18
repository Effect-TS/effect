/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Data from "effect/Data"
import { describe, expect, it, pick } from "tstyche"

declare const readonlyStruct: { readonly a: string }
declare const struct: { a: string }

declare const readonlyArray: ReadonlyArray<string>
declare const array: Array<string>

describe("Data", () => {
  it("struct", () => {
    // Create a readonly struct from a mutable one
    const struct1 = Data.struct(struct)
    expect(struct1).type.toBe<{ readonly a: string }>()

    // Create a readonly struct from a readonly one
    const struct2 = Data.struct(readonlyStruct)
    expect(struct2).type.toBe<{ readonly a: string }>()
  })

  it("unsafeStruct", () => {
    const struct3 = Data.unsafeStruct(struct)
    expect(struct3).type.toBe<{ readonly a: string }>()

    const struct4 = Data.unsafeStruct(readonlyStruct)
    expect(struct4).type.toBe<{ readonly a: string }>()
  })

  it("tuple", () => {
    const tuple1 = Data.tuple("a", 1)
    expect(tuple1).type.toBe<readonly [string, number]>()
  })

  it("array", () => {
    const array1 = Data.array(array)
    expect(array1).type.toBe<ReadonlyArray<string>>()

    const array2 = Data.array(readonlyArray)
    expect(array2).type.toBe<ReadonlyArray<string>>()
  })

  it("unsafeArray", () => {
    const array3 = Data.unsafeArray(array)
    expect(array3).type.toBe<ReadonlyArray<string>>()

    const array4 = Data.unsafeArray(readonlyArray)
    expect(array4).type.toBe<ReadonlyArray<string>>()
  })

  it("case", () => {
    interface Person {
      readonly name: string
    }
    const makePerson = Data.case<Person>()

    expect(makePerson).type.toBe<(args: { readonly name: string }) => Person>()

    const person = makePerson({ name: "Mike" })

    // fields should be readonly
    expect(person).type.toBe<{ readonly name: string }>()
  })

  it("tagged", () => {
    interface TaggedPerson {
      readonly _tag: "Person"
      readonly name: string
      readonly optional?: string
    }
    const taggedPerson = Data.tagged<TaggedPerson>("Person")

    expect(taggedPerson).type.toBe<(args: { readonly name: string; readonly optional?: string }) => TaggedPerson>()
  })

  it("Class", () => {
    class Person extends Data.Class<{ name: string; age?: number }> {}
    const person = new Person({ name: "Mike" })
    // fields should be readonly
    expect(person).type.toBe<{ readonly name: string; readonly age?: number }>()

    class Void extends Data.Class {}
    // void constructor
    expect<ConstructorParameters<typeof Void>>().type.toBe<[args?: void]>()
  })

  it("TaggedClass", () => {
    class Person extends Data.TaggedClass("Person")<{ name: string; age?: number }> {}
    const person = new Person({ name: "Mike" })
    // fields should be readonly
    expect(person).type.toBe<{ readonly name: string; readonly age?: number; readonly _tag: "Person" }>()

    class Void extends Data.TaggedClass("Void") {}
    // void constructor
    expect<ConstructorParameters<typeof Void>>().type.toBe<[args?: void]>()
  })

  it("Error", () => {
    class Err extends Data.Error<{ message: string; a: number; optional?: string }> {}
    const err = new Err({ message: "Oh no!", a: 1 })

    // assignable to Error
    expect<Err>().type.toBeAssignableTo<Error>()

    // non-Error fields should be readonly
    expect(pick(err, "message", "a", "optional")).type.toBe<
      { message: string; readonly a: number; readonly optional?: string }
    >()

    class Void extends Data.Error {}
    // void constructor
    expect<ConstructorParameters<typeof Void>>().type.toBe<[args?: void]>()
  })

  it("TaggedError", () => {
    class Err extends Data.TaggedError("Foo")<{ message?: string; a: number }> {}
    // Test optional props are allowed
    new Err({ a: 1 })

    // assignable to Error
    expect<Err>().type.toBeAssignableTo<Error>()

    const err = new Err({ message: "Oh no!", a: 1 })

    // non-Error fields should be readonly
    expect(pick(err, "message", "a")).type.toBe<{ message: string; readonly a: number }>()

    class Void extends Data.TaggedError("Foo") {}
    // void constructor
    expect<ConstructorParameters<typeof Void>>().type.toBe<[args?: void]>()
  })

  describe("TaggedEnum", () => {
    it("should be able to create a tagged enum", () => {
      type TE = Data.TaggedEnum<{
        A: { readonly required: string }
        B: { readonly optional?: number }
      }>
      expect<Extract<TE, { _tag: "A" }>>().type.toBe<
        { readonly _tag: "A"; readonly required: string }
      >()
      expect<Extract<TE, { _tag: "B" }>>().type.toBe<
        { readonly _tag: "B"; readonly optional?: number }
      >()
    })

    it("should raise an error if one of the variants has a _tag property", () => {
      // @ts-expect-error: It looks like you're trying to create a tagged enum, but one or more of its members already has a `_tag` property.
      type TE = Data.TaggedEnum<{
        A: { readonly _tag: "A" }
        B: { readonly b: number }
      }>
    })
  })

  describe("taggedEnum", () => {
    it("should be able to create a concrete tagged enum", () => {
      type TE = Data.TaggedEnum<{
        A: { readonly required: string }
        B: { readonly optional?: number }
      }>

      const { $is, A, B } = Data.taggedEnum<TE>()
      expect<Parameters<typeof A>>().type.toBe<[{ readonly required: string }]>()
      expect<ReturnType<typeof A>>().type.toBe<{ readonly _tag: "A"; readonly required: string }>()
      expect<Parameters<typeof B>>().type.toBe<[{ readonly optional?: number }]>()
      expect<ReturnType<typeof B>>().type.toBe<{ readonly _tag: "B"; readonly optional?: number }>()
      const isA = $is("A")
      expect(isA).type.toBe<
        (u: unknown) => u is { readonly _tag: "A"; readonly required: string }
      >()
      const isB = $is("B")
      expect(isB).type.toBe<
        (u: unknown) => u is { readonly _tag: "B"; readonly optional?: number }
      >()
    })

    it("should be able to create a generic tagged enum", () => {
      type TE<T> = Data.TaggedEnum<{
        A: { a: T }
        B: { b?: T }
      }>

      interface TEDefinition extends Data.TaggedEnum.WithGenerics<1> {
        readonly taggedEnum: TE<this["A"]>
      }

      const { A, B } = Data.taggedEnum<TEDefinition>()
      expect<typeof A>().type.toBe<(<A>(args: { readonly a: A }) => { readonly _tag: "A"; readonly a: A })>()
      expect<typeof B>().type.toBe<(<B>(args: { readonly b?: B }) => { readonly _tag: "B"; readonly b?: B })>()
    })
  })
})
