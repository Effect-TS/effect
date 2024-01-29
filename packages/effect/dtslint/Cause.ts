import * as Cause from "effect/Cause"
import { pipe } from "effect/Function"
import type * as Predicate from "effect/Predicate"

declare const err1: Cause.Cause<"err-1">
declare const err2: Cause.Cause<"err-2">

declare const predicateString: Predicate.Predicate<Cause.Cause<string>>

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

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Cause<"err-1">
pipe(err1, Cause.filter(predicateString))
