import * as Data from "effect/Data"

declare const readonlyStruct: { readonly a: string }
declare const mutableStruct: { a: string }

declare const readonlyArray: ReadonlyArray<string>
declare const mutableArray: Array<string>

// -------------------------------------------------------------------------------------
// struct
// -------------------------------------------------------------------------------------

// $ExpectType { readonly a: string; }
const struct1 = Data.struct(mutableStruct)

// @ts-expect-error
struct1.a = "a"

// $ExpectType { readonly a: string; }
const struct2 = Data.struct(readonlyStruct)

// @ts-expect-error
struct2.a = "a"

// -------------------------------------------------------------------------------------
// unsafeStruct
// -------------------------------------------------------------------------------------

// $ExpectType { readonly a: string; }
const struct3 = Data.unsafeStruct(mutableStruct)

// @ts-expect-error
struct3.a = "a"

// $ExpectType { readonly a: string; }
const struct4 = Data.unsafeStruct(readonlyStruct)

// @ts-expect-error
struct4.a = "a"

// -------------------------------------------------------------------------------------
// tuple
// -------------------------------------------------------------------------------------

// $ExpectType readonly [string, number]
const tuple1 = Data.tuple("a", 1)

// @ts-expect-error
tuple1[0] = "a"
// @ts-expect-error
tuple1[1] = 1

// -------------------------------------------------------------------------------------
// array
// -------------------------------------------------------------------------------------

// $ExpectType readonly string[]
const array1 = Data.array(mutableArray)

// @ts-expect-error
array1[0] = "a"

// $ExpectType readonly string[]
const array2 = Data.array(readonlyArray)

// @ts-expect-error
array2[0] = "a"

// -------------------------------------------------------------------------------------
// unsafeArray
// -------------------------------------------------------------------------------------

// $ExpectType readonly string[]
const array3 = Data.unsafeArray(mutableArray)

// @ts-expect-error
array3[0] = "a"

// $ExpectType readonly string[]
const array4 = Data.unsafeArray(readonlyArray)

// @ts-expect-error
array4[0] = "a"

// -------------------------------------------------------------------------------------
// case
// -------------------------------------------------------------------------------------

interface Person {
  readonly name: string
}

const person = Data.case<Person>()

// $ExpectType { readonly name: string; }
export type PersonInput = Parameters<typeof person>[0]

// @ts-expect-error
person({ name: "" }).name = "a"

// -------------------------------------------------------------------------------------
// tagged
// -------------------------------------------------------------------------------------

interface TaggedPerson {
  readonly _tag: "Person"
  readonly name: string
  readonly optional?: string
}

const taggedPerson = Data.tagged<TaggedPerson>("Person")

// $ExpectType { readonly name: string; readonly optional?: string; }
export type TaggedPersonInput = Parameters<typeof taggedPerson>[0]

// @ts-expect-error
taggedPerson.name = "a"

// -------------------------------------------------------------------------------------
// TaggedEnum
// -------------------------------------------------------------------------------------

type HttpError = Data.TaggedEnum<{
  BadRequest: { readonly status: 400; readonly a: string }
  NotFound: { readonly status: 404; readonly b: number }
}>
// $ExpectType { readonly _tag: "BadRequest"; readonly status: 400; readonly a: string; }
export type BadRequest = Extract<HttpError, { _tag: "BadRequest" }>
// $ExpectType { readonly _tag: "NotFound"; readonly status: 404; readonly b: number; }
export type NotFound = Extract<HttpError, { _tag: "NotFound" }>

// @ts-expect-error
export type Err = Data.TaggedEnum<{
  A: { readonly _tag: "A" }
  B: { readonly tag: "B" }
}>

// -------------------------------------------------------------------------------------
// taggedEnum
// -------------------------------------------------------------------------------------

const { NotFound } = Data.taggedEnum<
  | { readonly _tag: "BadRequest"; readonly status: 400; readonly message: string }
  | { readonly _tag: "NotFound"; readonly status: 404; readonly message: string }
>()

// $ExpectType { readonly status: 404; readonly message: string; }
export type notFoundInput = Parameters<typeof NotFound>[0]

// $ExpectType { readonly _tag: "NotFound"; readonly status: 404; readonly message: string; }
export type notFoundOutput = ReturnType<typeof NotFound>

const notFound = NotFound({ status: 404, message: "mesage" })

// @ts-expect-error
notFound.message = "a"

// -------------------------------------------------------------------------------------
// Class
// -------------------------------------------------------------------------------------

class PersonClass extends Data.Class<{ name: string; age?: number }> {}
class VoidClass extends Data.Class {}

const mike1 = new PersonClass({ name: "Mike" })

// @ts-expect-error
mike1.name = "a"

// $ExpectType [args?: void]
export type VoidClassParams = ConstructorParameters<typeof VoidClass>

// -------------------------------------------------------------------------------------
// TaggedClass
// -------------------------------------------------------------------------------------

class PersonTaggedClass extends Data.TaggedClass("Person")<{ name: string; age?: number }> {}
class VoidTaggedClass extends Data.TaggedClass("Void") {}

const mike2 = new PersonTaggedClass({ name: "Mike" })

// @ts-expect-error
mike2.name = "a"

// $ExpectType [args?: void]
export type VoidTaggedClassParams = ConstructorParameters<typeof VoidTaggedClass>

// -------------------------------------------------------------------------------------
// Error
// -------------------------------------------------------------------------------------

class MyError extends Data.Error<{ message: string; a: number; optional?: string }> {}
class VoidError extends Data.Error {}

const myError1 = new MyError({ message: "Oh no!", a: 1 })

// @ts-expect-error
myError1.message = "a"
// @ts-expect-error
myError1.a = 2

// $ExpectType [args?: void]
export type VoidErrorParams = ConstructorParameters<typeof VoidError>

// -------------------------------------------------------------------------------------
// TaggedError
// -------------------------------------------------------------------------------------

class MyTaggedError extends Data.TaggedError("Foo")<{
  message?: string
  a: number
}> {}
class VoidTaggedError extends Data.TaggedError("Foo") {}

// $ExpectType (cause: unknown) => MyTaggedError
const myFromCause = MyTaggedError.fromCause({ a: 2 })

// $ExpectType MyTaggedError
myFromCause(2)

const myTaggedError1 = new MyTaggedError({ message: "Oh no!", a: 1 })

// test optional props
new MyTaggedError({ a: 1 })

// @ts-expect-error
myTaggedError1._tag = "a"
// @ts-expect-error
myTaggedError1.message = "a"

// $ExpectType [args?: void]
export type VoidTaggedErrorParams = ConstructorParameters<typeof VoidTaggedError>

class MyTaggedWithKnownCauseError extends Data.TaggedError("MyTaggedWithKnownCauseError")<{
  cause: number
}> {}

// $ExpectType (cause: number) => MyTaggedWithKnownCauseError
const myTaggedWithKnownCauseErrorFromCause = MyTaggedWithKnownCauseError.fromCause()

// $ExpectType MyTaggedWithKnownCauseError
myTaggedWithKnownCauseErrorFromCause(2)

class MyTaggedWithKnownCauseInheritedError extends MyTaggedWithKnownCauseError {}

// $ExpectType (cause: number) => MyTaggedWithKnownCauseInheritedError
const myTaggedWithKnownCauseInheritedErrorFromCause = MyTaggedWithKnownCauseInheritedError.fromCause()

// $ExpectType MyTaggedWithKnownCauseInheritedError
myTaggedWithKnownCauseInheritedErrorFromCause(2)
