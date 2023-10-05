import { pipe } from 'effect/Function'
import * as RR from 'effect/ReadonlyRecord'
import * as Brand from 'effect/Brand'
import * as E from 'effect/Either'
import * as Option from 'effect/Option'

declare const r: Record<string, number>
declare const rr: Readonly<Record<string, number>>
declare const struct: Record<'a' | 'b', number>

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, boolean>
RR.map(r, (
  value, // $ExpectType number
  _key, // $ExpectType string
) => value > 0)

// $ExpectType Record<string, boolean>
pipe(r, RR.map((
  value, // $ExpectType number
  _key, // $ExpectType string
) => value > 0))

// $ExpectType Record<string, boolean>
RR.map(rr, (
  value, // $ExpectType number
  _key, // $ExpectType string
) => value > 0)

// $ExpectType Record<string, boolean>
pipe(rr, RR.map((
  value, // $ExpectType number
  _key, // $ExpectType string
) => value > 0))

// $ExpectType Record<"a" | "b", boolean>
RR.map(struct, (
  value, // $ExpectType number
  _key, // $ExpectType "a" | "b"
) => value > 0)

// $ExpectType Record<"a" | "b", boolean>
pipe(struct, RR.map((
  value, // $ExpectType number
  _key, // $ExpectType "a" | "b"
) => value > 0))

const constStruct = { a: 1, b: 2 } as const;

function mapToBoolean(): { [K in keyof typeof constStruct]: boolean } {
  return RR.map(constStruct, () => true);
}

// $ExpectType { readonly a: boolean; readonly b: boolean; }
mapToBoolean()

// -------------------------------------------------------------------------------------
// get
// -------------------------------------------------------------------------------------

// $ExpectType Option<number>
pipe(r, RR.get('a'))

// -------------------------------------------------------------------------------------
// replaceOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(r, RR.replaceOption('a', 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(r, RR.replaceOption('a', true))

// -------------------------------------------------------------------------------------
// modifyOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(r, RR.modifyOption('a', () => 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(r, RR.modifyOption('a', () => true))

// -------------------------------------------------------------------------------------
// toEntries
// -------------------------------------------------------------------------------------

// baseline
// $ExpectType [string, number][]
RR.toEntries(r)
// $ExpectType ["a" | "b", number][]
RR.toEntries(struct)
// $ExpectType ["a" | "b" | "c", string | number | boolean][]
RR.toEntries({ a: 'a', b: 2, c: true })

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
RR.collect(r, (_, a) => a)

// $ExpectType number[]
RR.collect(rr, (_, a) => a)

// $ExpectType number[]
pipe(struct, RR.collect((
  _, // $ExpectType "a" | "b"
  a) => a)
)

// $ExpectType number[]
RR.collect(struct, (
  _, // $ExpectType "a" | "b"
  a) => a
)

// -------------------------------------------------------------------------------------
// filterMap
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, string>
RR.filterMap(r, (a,
  _k // $ExpectType string
) => a > 0 ? Option.some('positive') : Option.none())

// $ExpectType Record<string, string>
RR.filterMap(rr, (a,
  _k // $ExpectType string
) => a > 0 ? Option.some('positive') : Option.none())

// $ExpectType Record<string, number>
pipe(struct, RR.filterMap((a,
  k // $ExpectType "a" | "b"
) => k === 'a' ? Option.some(a) : Option.none()))

// $ExpectType Record<string, number>
RR.filterMap(struct, (a,
  k // $ExpectType "a" | "b"
) => k === 'a' ? Option.some(a) : Option.none())

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
RR.filter(r, (a,
  _k // $ExpectType string
) => a > 0)

// $ExpectType Record<string, number>
RR.filter(rr, (a,
  _k // $ExpectType string
) => a > 0)

// $ExpectType Record<string, number>
pipe(struct, RR.filter((_a,
  k // $ExpectType "a" | "b"
) => k === 'a'))

// $ExpectType Record<string, number>
RR.filter(struct, (_a,
  k // $ExpectType "a" | "b"
) => k === 'a')

// -------------------------------------------------------------------------------------
// partitionMap
// -------------------------------------------------------------------------------------

// $ExpectType [Record<string, boolean>, Record<string, string>]
RR.partitionMap(r, (a,
  _k // $ExpectType string
) => a > 0 ? E.right('positive') : E.left(false))

// $ExpectType [Record<string, boolean>, Record<string, string>]
RR.partitionMap(rr, (a,
  _k // $ExpectType string
) => a > 0 ? E.right('positive') : E.left(false))

// $ExpectType [Record<string, boolean>, Record<string, string>]
pipe(struct, RR.partitionMap((a,
  k // $ExpectType "a" | "b"
) => k === 'a' ? E.right('positive') : E.left(false)))

// $ExpectType [Record<string, boolean>, Record<string, string>]
RR.partitionMap(struct, (a,
  k // $ExpectType "a" | "b"
) => k === 'a' ? E.right('positive') : E.left(false))

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [Record<string, number>, Record<string, number>]
RR.partition(r, (a,
  _k // $ExpectType string
) => a > 0)

// $ExpectType [Record<string, number>, Record<string, number>]
RR.partition(rr, (a,
  _k // $ExpectType string
) => a > 0)

// $ExpectType [Record<string, number>, Record<string, number>]
pipe(struct, RR.partition((a,
  k // $ExpectType "a" | "b"
) => k === 'a'))

// $ExpectType [Record<string, number>, Record<string, number>]
RR.partition(struct, (a,
  k // $ExpectType "a" | "b"
) => k === 'a')

