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

Person(
  // $ExpectType { name: string; }
  { name: "name" }
)

// -------------------------------------------------------------------------------------
// tagged
// -------------------------------------------------------------------------------------

interface TaggedPerson extends Data.Case {
  readonly _tag: "Person"
  readonly name: string
}

const TaggedPerson = Data.tagged<TaggedPerson>("Person")

TaggedPerson(
  // $ExpectType { name: string; }
  { name: "name" }
)

// -------------------------------------------------------------------------------------
// TaggedEnum
// -------------------------------------------------------------------------------------

type HttpError = Data.TaggedEnum<{
  BadRequest: { status: 400; a: string }
  NotFound: { status: 404; b: number }
}>
// $ExpectType Data<{ readonly a: string; readonly status: 400; readonly _tag: "BadRequest"; }>
export type BadRequest = Extract<HttpError, { _tag: "BadRequest" }>
// $ExpectType Data<{ readonly b: number; readonly status: 404; readonly _tag: "NotFound"; }>
export type NotFound = Extract<HttpError, { _tag: "NotFound" }>

// @ts-expect-error
export type Err = Data.TaggedEnum<{
  A: { _tag: "A" }
  B: { tag: "B" }
}>
