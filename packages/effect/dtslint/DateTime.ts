import * as DateTime from "effect/DateTime"

declare const utc: DateTime.Utc
declare const zoned: DateTime.Zoned
declare const any: DateTime.DateTime

// -------------------------------------------------------------------------------------
// min
// -------------------------------------------------------------------------------------

// $ExpectType Utc | Zoned
DateTime.min(utc, zoned)

// $ExpectType Utc
DateTime.min(utc, utc)

// $ExpectType Zoned
DateTime.min(zoned, zoned)

// $ExpectType DateTime
DateTime.min(any, zoned)

// $ExpectType DateTime
DateTime.min(any, utc)

// $ExpectType DateTime
DateTime.min(any, any)

// $ExpectType Utc | Zoned
utc.pipe(DateTime.min(zoned))

// $ExpectType Utc | Zoned
zoned.pipe(DateTime.min(utc))

// $ExpectType Utc
utc.pipe(DateTime.min(utc))

// $ExpectType Zoned
zoned.pipe(DateTime.min(zoned))

// $ExpectType DateTime
any.pipe(DateTime.min(zoned))

// $ExpectType DateTime
any.pipe(DateTime.min(utc))

// $ExpectType DateTime
any.pipe(DateTime.min(any))

// -------------------------------------------------------------------------------------
// max
// -------------------------------------------------------------------------------------

// $ExpectType Utc | Zoned
DateTime.max(utc, zoned)

// $ExpectType Utc
DateTime.max(utc, utc)

// $ExpectType Zoned
DateTime.max(zoned, zoned)

// $ExpectType DateTime
DateTime.max(any, zoned)

// $ExpectType DateTime
DateTime.max(any, utc)

// $ExpectType DateTime
DateTime.max(any, any)

// $ExpectType Utc | Zoned
utc.pipe(DateTime.max(zoned))

// $ExpectType Utc | Zoned
zoned.pipe(DateTime.max(utc))

// $ExpectType Utc
utc.pipe(DateTime.max(utc))

// $ExpectType Zoned
zoned.pipe(DateTime.max(zoned))

// $ExpectType DateTime
any.pipe(DateTime.max(zoned))

// $ExpectType DateTime
any.pipe(DateTime.max(utc))

// $ExpectType DateTime
any.pipe(DateTime.max(any))
