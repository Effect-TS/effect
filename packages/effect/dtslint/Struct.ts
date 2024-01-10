import { hole, pipe } from "effect/Function"
import * as S from "effect/Struct"

const asym = Symbol.for("effect/dtslint/a")
const bsym = Symbol.for("effect/dtslint/b")
const csym = Symbol.for("effect/dtslint/c")
const dsym = Symbol.for("effect/dtslint/d")

declare const stringNumberRecord: Record<string, number>
declare const symbolNumberRecord: Record<symbol, number>
declare const numberNumberRecord: Record<number, number>
declare const templateLiteralNumberRecord: Record<`a${string}`, number>

const stringStruct = { a: "a", b: 1, c: true }
const symbolStruct = { [asym]: "a", [bsym]: 1, [csym]: true }
const numberStruct = { 1: "a", 2: 1, 3: true }

// -------------------------------------------------------------------------------------
// evolve
// -------------------------------------------------------------------------------------

// $ExpectType { a: boolean; }
S.evolve({ a: 1 }, { a: (x) => x > 0 })

// $ExpectType { a: number; b: number; }
pipe({ a: "a", b: 2 }, S.evolve({ a: (s) => s.length }))

// -------------------------------------------------------------------------------------
// get
// -------------------------------------------------------------------------------------

// @ts-expect-error
pipe({}, S.get("a"))

// $ExpectType string
pipe(stringStruct, S.get("a"))

// $ExpectType string
S.get("a")(stringStruct)

// $ExpectType number | undefined
pipe(stringNumberRecord, S.get("a"))

// $ExpectType <S extends Record<"a", any>>(s: S) => MatchRecord<S, S["a"] | undefined, S["a"]>
S.get("a")

// $ExpectType string
pipe(symbolStruct, S.get(asym))

// $ExpectType string
S.get(asym)(symbolStruct)

// $ExpectType number | undefined
pipe(symbolNumberRecord, S.get(asym))

// $ExpectType <S extends Record<typeof asym, any>>(s: S) => MatchRecord<S, S[typeof asym] | undefined, S[typeof asym]>
S.get(asym)

// $ExpectType string
pipe(numberStruct, S.get(1))

// $ExpectType string
S.get(1)(numberStruct)

// $ExpectType number | undefined
pipe(numberNumberRecord, S.get(1))

// $ExpectType <S extends Record<1, any>>(s: S) => MatchRecord<S, S[1] | undefined, S[1]>
S.get(1)

// $ExpectType number | undefined
pipe(templateLiteralNumberRecord, S.get("ab"))

// $ExpectType boolean
pipe(hole<Record<string, number> & { a: boolean }>(), S.get("a"))

// @ts-expect-error
pipe(hole<Record<string, number> & { a: boolean }>(), S.get("b"))

// -------------------------------------------------------------------------------------
// pick
// -------------------------------------------------------------------------------------

// @ts-expect-error
pipe(stringStruct, S.pick("d"))

// @ts-expect-error
S.pick("d")(stringStruct)

// $ExpectType { [x: string]: unknown; }
S.pick("d" as string)(stringStruct)

// $ExpectType { a: string; b: number; }
pipe(stringStruct, S.pick("a", "b"))

// $ExpectType { a: number | undefined; b: number | undefined; }
pipe(stringNumberRecord, S.pick("a", "b"))

// @ts-expect-error
pipe(symbolStruct, S.pick(dsym))

// @ts-expect-error
S.pick(dsym)(symbolStruct)

// $ExpectType { [x: symbol]: unknown; }
S.pick(dsym as symbol)(symbolStruct)

// $ExpectType { [asym]: string; [bsym]: number; }
pipe(symbolStruct, S.pick(asym, bsym))

// $ExpectType { [asym]: number | undefined; [bsym]: number | undefined; }
pipe(symbolNumberRecord, S.pick(asym, bsym))

// $ExpectType { 2: number; 1: string; }
pipe(numberStruct, S.pick(1, 2))

// @ts-expect-error
pipe(numberStruct, S.pick(4))

// @ts-expect-error
S.pick(4)(numberStruct)

// $ExpectType { [x: number]: unknown; }
S.pick(4 as number)(numberStruct)

// $ExpectType { 2: number | undefined; 1: number | undefined; }
pipe(numberNumberRecord, S.pick(1, 2))

// $ExpectType { ab: number | undefined; aa: number | undefined; }
pipe(templateLiteralNumberRecord, S.pick("aa", "ab"))

// $ExpectType { a: boolean; }
pipe(hole<Record<string, number> & { a: boolean }>(), S.pick("a"))

// @ts-expect-error
pipe(hole<Record<string, number> & { a: boolean }>(), S.pick("b"))

// -------------------------------------------------------------------------------------
// omit
// -------------------------------------------------------------------------------------

// @ts-expect-error
pipe(stringStruct, S.omit("d"))

// @ts-expect-error
S.omit("d")(stringStruct)

// $ExpectType { b: number; c: boolean; }
pipe(stringStruct, S.omit("a"))

// @ts-expect-error
pipe(symbolStruct, S.omit(dsym))

// @ts-expect-error
S.omit(dsym)(symbolStruct)

// $ExpectType { [bsym]: number; [csym]: boolean; }
pipe(symbolStruct, S.omit(asym))

// @ts-expect-error
pipe(numberStruct, S.omit(4))

// @ts-expect-error
S.omit(4)(numberStruct)

// $ExpectType { 2: number; 3: boolean; }
pipe(numberStruct, S.omit(1))

// $ExpectType { [x: string]: number; }
pipe(stringNumberRecord, S.omit("a"))

// $ExpectType { [x: symbol]: number; }
pipe(symbolNumberRecord, S.omit(asym))

// $ExpectType { [x: number]: number; }
pipe(numberNumberRecord, S.omit(1))
