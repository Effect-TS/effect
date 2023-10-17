import type * as Data from "effect/Data"

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
