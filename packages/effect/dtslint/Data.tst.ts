import * as Data from "effect/Data"
import { describe, expect, it } from "tstyche"

declare const readonlyStruct: { readonly a: string }
declare const mutableStruct: { a: string }

declare const readonlyArray: ReadonlyArray<string>
declare const mutableArray: Array<string>

describe("Data", () => {
  it("struct", () => {
    // Create a readonly struct from a mutable one
    const struct1 = Data.struct(mutableStruct)
    expect(struct1).type.toBe<{ readonly a: string }>()

    // @ts-expect-error: `a` should be readonly
    struct1.a = "a"

    // Create a readonly struct from a readonly one
    const struct2 = Data.struct(readonlyStruct)
    expect(struct2).type.toBe<{ readonly a: string }>()

    // @ts-expect-error: `a` is readonly
    struct2.a = "a"
  })

  it("unsafeStruct", () => {
    const struct3 = Data.unsafeStruct(mutableStruct)
    expect(struct3).type.toBe<{ readonly a: string }>()

    // @ts-expect-error: cannot assign to readonly property
    struct3.a = "a"

    const struct4 = Data.unsafeStruct(readonlyStruct)
    expect(struct4).type.toBe<{ readonly a: string }>()

    // @ts-expect-error
    struct4.a = "a"
  })

  it("tuple", () => {
    const tuple1 = Data.tuple("a", 1)
    expect(tuple1).type.toBe<readonly [string, number]>()

    // @ts-expect-error: tuple elements are readonly
    tuple1[0] = "a"

    // @ts-expect-error: tuple elements are readonly
    tuple1[1] = 1
  })

  it("array", () => {
    const array1 = Data.array(mutableArray)
    expect(array1).type.toBe<ReadonlyArray<string>>()

    // @ts-expect-error: cannot assign to readonly array element
    array1[0] = "a"

    const array2 = Data.array(readonlyArray)
    expect(array2).type.toBe<ReadonlyArray<string>>()

    // @ts-expect-error: cannot assign to readonly array element
    array2[0] = "a"
  })

  it("unsafeArray", () => {
    const array3 = Data.unsafeArray(mutableArray)
    expect(array3).type.toBe<ReadonlyArray<string>>()

    // @ts-expect-error: cannot assign to readonly array element
    array3[0] = "a"

    const array4 = Data.unsafeArray(readonlyArray)
    expect(array4).type.toBe<ReadonlyArray<string>>()

    // @ts-expect-error
    array4[0] = "a"
  })

  it("case", () => {
    interface Person {
      readonly name: string
    }
    const person = Data.case<Person>()

    expect<Parameters<typeof person>[0]>().type.toBe<{ readonly name: string; }>()

    // @ts-expect-error: property `name` is readonly
    person({ name: "" }).name = "a"
  })

  it("tagged", () => {
    interface TaggedPerson {
      readonly _tag: "Person"
      readonly name: string
      readonly optional?: string
    }
    const taggedPerson = Data.tagged<TaggedPerson>("Person")

    expect<Parameters<typeof taggedPerson>[0]>().type.toBe<{ readonly name: string; readonly optional?: string; }>()

    // @ts-expect-error: cannot assign to readonly property
    taggedPerson.name = "a"
  })

  it("TaggedEnum", () => {
    type HttpError = Data.TaggedEnum<{
      BadRequest: { readonly status: 400; readonly a: string }
      NotFound: { readonly status: 404; readonly b: number }
    }>
    expect<Extract<HttpError, { _tag: "BadRequest" }>>().type.toBe<{ readonly _tag: "BadRequest"; readonly status: 400; readonly a: string; }>()
    expect<Extract<HttpError, { _tag: "NotFound" }>>().type.toBe<{ readonly _tag: "NotFound"; readonly status: 404; readonly b: number; }>()

    // @ts-expect-error: Incorrect tagged enum definition
    export type Err = Data.TaggedEnum<{
      A: { readonly _tag: "A" }
      B: { readonly tag: "B" }
    }>
  })

  it("taggedEnum", () => {
    const { NotFound } = Data.taggedEnum<
      | { readonly _tag: "BadRequest"; readonly status: 400; readonly message: string }
      | { readonly _tag: "NotFound"; readonly status: 404; readonly message: string }
    >()
    expect<Parameters<typeof NotFound>[0]>().type.toBe<{ readonly status: 404; readonly message: string; }>()
    expect<ReturnType<typeof NotFound>>().type.toBe<{ readonly _tag: "NotFound"; readonly status: 404; readonly message: string; }>()
    const notFound = NotFound({ status: 404, message: "mesage" })

    // @ts-expect-error: cannot assign to readonly property
    notFound.message = "a"
  })

  it("Class", () => {
    class PersonClass extends Data.Class<{ name: string; age?: number }> {}
    class VoidClass extends Data.Class {}
    const mike1 = new PersonClass({ name: "Mike" })

    // @ts-expect-error: cannot assign to readonly property
    mike1.name = "a"

    expect<ConstructorParameters<typeof VoidClass>>().type.toBe<[args?: void]>()
  })

  it("TaggedClass", () => {
    class PersonTaggedClass extends Data.TaggedClass("Person")<{ name: string; age?: number }> {}
    class VoidTaggedClass extends Data.TaggedClass("Void") {}
    const mike2 = new PersonTaggedClass({ name: "Mike" })

    // @ts-expect-error: cannot assign to readonly property
    mike2.name = "a"

    expect<ConstructorParameters<typeof VoidTaggedClass>>().type.toBe<[args?: void]>()
  })

  it("Error", () => {
    class MyError extends Data.Error<{ message: string; a: number; optional?: string }> {}
    class VoidError extends Data.Error {}
    const myError1 = new MyError({ message: "Oh no!", a: 1 })

    // @ts-expect-error: cannot assign to readonly property
    myError1.message = "a"

    // @ts-expect-error: cannot assign to readonly property
    myError1.a = 2

    expect<ConstructorParameters<typeof VoidError>>().type.toBe<[args?: void]>()
  })

  it("TaggedError", () => {
    class MyTaggedError extends Data.TaggedError("Foo")<{ message?: string; a: number }> {}
    class VoidTaggedError extends Data.TaggedError("Foo") {}
    const myTaggedError1 = new MyTaggedError({ message: "Oh no!", a: 1 })
    // Test optional props are allowed
    new MyTaggedError({ a: 1 })

    // @ts-expect-error: cannot assign to readonly property
    myTaggedError1._tag = "a"

    // @ts-expect-error: cannot assign to readonly property
    myTaggedError1.message = "a"

    expect<ConstructorParameters<typeof VoidTaggedError>>().type.toBe<[args?: void]>()
  })
})
