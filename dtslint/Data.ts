import * as Data from "effect/Data"

declare const readonlyStruct: { readonly a: string }
declare const mutableStruct: { a: string }

declare const readonlyArray: ReadonlyArray<string>
declare const mutableArray: Array<string>

// -------------------------------------------------------------------------------------
// struct
// -------------------------------------------------------------------------------------

// $ExpectType Data<{ readonly a: string; }>
Data.struct(mutableStruct)
// $ExpectType Data<{ readonly a: string; }>
Data.struct(readonlyStruct)

// -------------------------------------------------------------------------------------
// unsafeStruct
// -------------------------------------------------------------------------------------

// $ExpectType Data<{ readonly a: string; }>
Data.unsafeStruct(mutableStruct)
// $ExpectType Data<{ readonly a: string; }>
Data.unsafeStruct(readonlyStruct)

// -------------------------------------------------------------------------------------
// tuple
// -------------------------------------------------------------------------------------

// $ExpectType Data<readonly [string, number]>
Data.tuple("a", 1)

// -------------------------------------------------------------------------------------
// array
// -------------------------------------------------------------------------------------

// $ExpectType Data<readonly string[]>
Data.array(mutableArray)
// $ExpectType Data<readonly string[]>
Data.array(readonlyArray)

// -------------------------------------------------------------------------------------
// unsafeArray
// -------------------------------------------------------------------------------------

// $ExpectType Data<readonly string[]>
Data.unsafeArray(mutableArray)
// $ExpectType Data<readonly string[]>
Data.unsafeArray(readonlyArray)

// -------------------------------------------------------------------------------------
// case
// -------------------------------------------------------------------------------------

interface Person extends Data.Case {
  readonly name: string
}

const Person = Data.case<Person>()

// $ExpectType { readonly name: string; }
export type PersonInput = Parameters<typeof Person>[0]

// -------------------------------------------------------------------------------------
// tagged
// -------------------------------------------------------------------------------------

interface TaggedPerson extends Data.Case {
  readonly _tag: "Person"
  readonly name: string
}

const TaggedPerson = Data.tagged<TaggedPerson>("Person")

// $ExpectType { readonly name: string; }
export type TaggedPersonInput = Parameters<typeof TaggedPerson>[0]

// -------------------------------------------------------------------------------------
// TaggedEnum
// -------------------------------------------------------------------------------------

type HttpError = Data.TaggedEnum<{
  BadRequest: { readonly status: 400; readonly a: string }
  NotFound: { readonly status: 404; readonly b: number }
}>
// $ExpectType Data<{ readonly a: string; readonly status: 400; readonly _tag: "BadRequest"; }>
export type BadRequest = Extract<HttpError, { _tag: "BadRequest" }>
// $ExpectType Data<{ readonly b: number; readonly status: 404; readonly _tag: "NotFound"; }>
export type NotFound = Extract<HttpError, { _tag: "NotFound" }>

// @ts-expect-error
export type Err = Data.TaggedEnum<{
  A: { readonly _tag: "A" }
  B: { readonly tag: "B" }
}>

// -------------------------------------------------------------------------------------
// taggedEnum
// -------------------------------------------------------------------------------------

const HttpError = Data.taggedEnum<
  | Data.Data<{ readonly _tag: "BadRequest"; readonly status: 400; readonly message: string }>
  | Data.Data<{ readonly _tag: "NotFound"; readonly status: 404; readonly message: string }>
>()

export const notFound = HttpError("NotFound")

// $ExpectType { readonly message: string; readonly status: 404; }
export type notFoundInput = Parameters<typeof notFound>[0]

// $ExpectType Data<{ readonly _tag: "NotFound"; readonly status: 404; readonly message: string; }>
export type notFoundOutput = ReturnType<typeof notFound>
