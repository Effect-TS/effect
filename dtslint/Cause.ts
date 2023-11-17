import * as Cause from "effect/Cause"

declare const err1: Cause.Cause<"err-1">
declare const err2: Cause.Cause<"err-2">

// -------------------------------------------------------------------------------------
// andThen
// -------------------------------------------------------------------------------------

// $ExpectType Cause<"err-2">
Cause.andThen(err1, err2)

// $ExpectType Cause<"err-2">
Cause.andThen(err1, () => err2)

// $ExpectType Cause<"err-2">
err1.pipe(Cause.andThen(err2))

// $ExpectType Cause<"err-2">
err1.pipe(Cause.andThen(() => err2))
