import type * as Brand from "effect/Brand"
import * as E from "effect/Either"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as RR from "effect/ReadonlyRecord"

declare const record: Record<string, number>
declare const readonlyRecord: Readonly<Record<string, number>>
declare const struct: Record<"a" | "b", number>
declare const struct2: Record<"c" | "d", string>
declare const readonlyStruct: Readonly<Record<"a" | "b", number>>
declare const readonlyStruct2: Readonly<Record<"c" | "d", string>>

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, boolean>
RR.map(record, (
  value, // $ExpectType number
  _key // $ExpectType string
) => value > 0)

// $ExpectType Record<string, boolean>
pipe(
  record,
  RR.map((
    value, // $ExpectType number
    _key // $ExpectType string
  ) => value > 0)
)

// $ExpectType Record<string, boolean>
RR.map(readonlyRecord, (
  value, // $ExpectType number
  _key // $ExpectType string
) => value > 0)

// $ExpectType Record<string, boolean>
pipe(
  readonlyRecord,
  RR.map((
    value, // $ExpectType number
    _key // $ExpectType string
  ) => value > 0)
)

// $ExpectType Record<"a" | "b", boolean>
RR.map(struct, (
  value, // $ExpectType number
  _key // $ExpectType "a" | "b"
) => value > 0)

// $ExpectType Record<"a" | "b", boolean>
pipe(
  struct,
  RR.map((
    value, // $ExpectType number
    _key // $ExpectType "a" | "b"
  ) => value > 0)
)

const constStruct = { a: 1, b: 2 } as const

function mapToBoolean(): { [K in keyof typeof constStruct]: boolean } {
  return RR.map(constStruct, () => true)
}

// $ExpectType { readonly a: boolean; readonly b: boolean; }
mapToBoolean()

// -------------------------------------------------------------------------------------
// get
// -------------------------------------------------------------------------------------

// $ExpectType Option<number>
pipe(record, RR.get("a"))

// -------------------------------------------------------------------------------------
// replaceOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(record, RR.replaceOption("a", 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(record, RR.replaceOption("a", true))

// -------------------------------------------------------------------------------------
// modifyOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(record, RR.modifyOption("a", () => 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(record, RR.modifyOption("a", () => true))

// -------------------------------------------------------------------------------------
// toEntries
// -------------------------------------------------------------------------------------

// baseline
// $ExpectType [string, number][]
RR.toEntries(record)
// $ExpectType ["a" | "b", number][]
RR.toEntries(struct)
// $ExpectType ["a" | "b" | "c", string | number | boolean][]
RR.toEntries({ a: "a", b: 2, c: true })

declare const brandedRecord: Record<string & Brand.Brand<"brandedString">, number>

// should support brands
// $ExpectType [string & Brand<"brandedString">, number][]
RR.toEntries(brandedRecord)

// -------------------------------------------------------------------------------------
// collect
// -------------------------------------------------------------------------------------

// $ExpectType Either<never, number>[]
RR.collect({ a: E.right(1), b: E.right(2), c: E.right(3) }, (_, n) => n)

// $ExpectType Either<never, number>[]
pipe({ a: E.right(1), b: E.right(2), c: E.right(3) }, RR.collect((_, n) => n))

// $ExpectType number[]
RR.collect(record, (_, a) => a)

// $ExpectType number[]
RR.collect(readonlyRecord, (_, a) => a)

// $ExpectType number[]
pipe(
  struct,
  RR.collect((
    _key, // $ExpectType "a" | "b"
    value
  ) => value)
)

// $ExpectType number[]
RR.collect(struct, (
  _key, // $ExpectType "a" | "b"
  value
) => value)

// -------------------------------------------------------------------------------------
// filterMap
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, string>
RR.filterMap(record, (
  value,
  // $ExpectType string
  _key
) => value > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<string, string>
RR.filterMap(readonlyRecord, (
  value,
  // $ExpectType string
  _key
) => value > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<string, number>
pipe(
  struct,
  RR.filterMap((
    value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a" ? Option.some(value) : Option.none())
)

// $ExpectType Record<string, number>
RR.filterMap(struct, (
  value,
  // $ExpectType "a" | "b"
  key
) => key === "a" ? Option.some(value) : Option.none())

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
RR.filter(record, (
  value,
  // $ExpectType string
  _key
) => value > 0)

// $ExpectType Record<string, number>
RR.filter(readonlyRecord, (
  value,
  // $ExpectType string
  _key
) => value > 0)

// $ExpectType Record<string, number>
pipe(
  struct,
  RR.filter((
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a")
)

// $ExpectType Record<string, number>
RR.filter(struct, (
  _value,
  // $ExpectType "a" | "b"
  key
) => key === "a")

// -------------------------------------------------------------------------------------
// partitionMap
// -------------------------------------------------------------------------------------

// $ExpectType [Record<string, boolean>, Record<string, string>]
RR.partitionMap(record, (
  value,
  // $ExpectType string
  _key
) => value > 0 ? E.right("positive") : E.left(false))

// $ExpectType [Record<string, boolean>, Record<string, string>]
RR.partitionMap(readonlyRecord, (
  value,
  // $ExpectType string
  _key
) => value > 0 ? E.right("positive") : E.left(false))

// $ExpectType [Record<string, boolean>, Record<string, string>]
pipe(
  struct,
  RR.partitionMap((
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a" ? E.right("positive") : E.left(false))
)

// $ExpectType [Record<string, boolean>, Record<string, string>]
RR.partitionMap(struct, (
  _value,
  // $ExpectType "a" | "b"
  key
) => key === "a" ? E.right("positive") : E.left(false))

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [Record<string, number>, Record<string, number>]
RR.partition(record, (
  value,
  // $ExpectType string
  _key
) => value > 0)

// $ExpectType [Record<string, number>, Record<string, number>]
RR.partition(readonlyRecord, (
  value,
  // $ExpectType string
  _key
) => value > 0)

// $ExpectType [Record<string, number>, Record<string, number>]
pipe(
  struct,
  RR.partition((
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a")
)

// $ExpectType [Record<string, number>, Record<string, number>]
RR.partition(struct, (
  _value,
  // $ExpectType "a" | "b"
  key
) => key === "a")

// -------------------------------------------------------------------------------------
// keys
// -------------------------------------------------------------------------------------

// $ExpectType string[]
RR.keys(struct)

// -------------------------------------------------------------------------------------
// values
// -------------------------------------------------------------------------------------

// $ExpectType number[]
RR.values(struct)

// -------------------------------------------------------------------------------------
// upsert
// -------------------------------------------------------------------------------------
// $ExpectType Record<string, number | boolean>
RR.upsert(record, "a", true)

// -------------------------------------------------------------------------------------
// update
// -------------------------------------------------------------------------------------
// $ExpectType Record<string, number | boolean>
RR.update(record, "a", true)

// -------------------------------------------------------------------------------------
// reduce
// -------------------------------------------------------------------------------------

RR.reduce(struct, "", (
  // $ExpectType string
  _acc,
  // $ExpectType number
  _value,
  // $ExpectType "a" | "b"
  key
) => key)

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

RR.every(struct, (
  _value,
  // $ExpectType "a" | "b"
  _key
) => false)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

RR.some(struct, (
  _value,
  // $ExpectType "a" | "b"
  _key
) => false)

// -------------------------------------------------------------------------------------
// union
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
RR.union(record, readonlyRecord, (_, b) => b)

// $ExpectType Record<"a" | "b" | "c" | "d", string | number>
RR.union(struct, struct2, (_, b) => b)

// $ExpectType Record<"a" | "b" | "c" | "d", string | number>
RR.union(readonlyStruct, readonlyStruct2, (_, b) => b)

// -------------------------------------------------------------------------------------
// singleton
// -------------------------------------------------------------------------------------

// $ExpectType Record<"a", number>
RR.singleton("a", 1)
