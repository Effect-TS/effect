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
declare const optionalStringStruct: {
  a?: string
  b: number
  c: boolean
}

// -------------------------------------------------------------------------------------
// evolve
// -------------------------------------------------------------------------------------

// $ExpectType { a: boolean; }
S.evolve({ a: 1 }, {
  a: (
    n // $ExpectType number
  ) => n > 0
})

// $ExpectType { a: boolean; }
pipe(
  { a: 1 },
  S.evolve({
    a: (
      n // $ExpectType number
    ) => n > 0
  })
)

// $ExpectType { a: number; b: number; }
S.evolve(
  { a: "a", b: 1 },
  {
    a: (
      s // $ExpectType string
    ) => s.length
  }
)

// $ExpectType { a: number; b: number; }
pipe(
  { a: "a", b: 1 },
  S.evolve({
    a: (
      s // $ExpectType string
    ) => s.length
  })
)

// @ts-expect-error
S.evolve({ a: "a", b: 1 }, { a: (n: number) => n })

// @ts-expect-error
S.evolve(hole<{ a: "a"; b: 1 }>(), hole<Record<string, string>>())

// @ts-expect-error
S.evolve(hole<{ a: "a"; b: 1 }>(), hole<Record<string, (s: string) => null>>())

// @ts-expect-error
pipe({ a: "a", b: 1 }, S.evolve({ a: (n: number) => n }))

// @ts-expect-error
pipe(hole<{ a: "a"; b: 1 }>(), S.evolve(hole<Record<string, string>>()))

// @ts-expect-error
pipe(hole<{ a: "a"; b: 1 }>(), S.evolve(hole<Record<string, (s: string) => null>>()))

// -------------------------------------------------------------------------------------
// get
// -------------------------------------------------------------------------------------

// $ExpectType unknown
pipe({}, S.get("a"))

// $ExpectType string
pipe(stringStruct, S.get("a"))

// $ExpectType string
S.get("a")(stringStruct)

// $ExpectType number | undefined
pipe(stringNumberRecord, S.get("a"))

// $ExpectType <S extends { a?: any; }>(s: S) => MatchRecord<S, S["a"] | undefined, S["a"]>
S.get("a")

// $ExpectType string
pipe(symbolStruct, S.get(asym))

// $ExpectType string
S.get(asym)(symbolStruct)

// $ExpectType number | undefined
pipe(symbolNumberRecord, S.get(asym))

// $ExpectType <S extends { [asym]?: any; }>(s: S) => MatchRecord<S, S[typeof asym] | undefined, S[typeof asym]>
S.get(asym)

// $ExpectType string
pipe(numberStruct, S.get(1))

// $ExpectType string
S.get(1)(numberStruct)

// $ExpectType number | undefined
pipe(numberNumberRecord, S.get(1))

// $ExpectType <S extends { 1?: any; }>(s: S) => MatchRecord<S, S[1] | undefined, S[1]>
S.get(1)

// $ExpectType number | undefined
pipe(templateLiteralNumberRecord, S.get("ab"))

// $ExpectType boolean
pipe(hole<Record<string, number> & { a: boolean }>(), S.get("a"))

// @ts-expect-error
pipe(hole<Record<string, number> & { a: boolean }>(), S.get("b"))

// $ExpectType string | undefined
pipe(optionalStringStruct, S.get("a"))

// $ExpectType string | undefined
S.get("a")(optionalStringStruct)

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

// $ExpectType { a?: number; b?: number; }
pipe(stringNumberRecord, S.pick("a", "b"))

// @ts-expect-error
pipe(symbolStruct, S.pick(dsym))

// @ts-expect-error
S.pick(dsym)(symbolStruct)

// $ExpectType { [x: symbol]: unknown; }
S.pick(dsym as symbol)(symbolStruct)

// $ExpectType { [asym]: string; [bsym]: number; }
pipe(symbolStruct, S.pick(asym, bsym))

// $ExpectType { [asym]?: number; [bsym]?: number; }
pipe(symbolNumberRecord, S.pick(asym, bsym))

// $ExpectType { 1: string; 2: number; }
pipe(numberStruct, S.pick(1, 2))

// @ts-expect-error
pipe(numberStruct, S.pick(4))

// @ts-expect-error
S.pick(4)(numberStruct)

// $ExpectType { [x: number]: unknown; }
S.pick(4 as number)(numberStruct)

// $ExpectType { 1?: number; 2?: number; }
pipe(numberNumberRecord, S.pick(1, 2))

// $ExpectType { ab?: number; aa?: number; }
pipe(templateLiteralNumberRecord, S.pick("aa", "ab"))

// $ExpectType { a: boolean; }
pipe(hole<Record<string, number> & { a: boolean }>(), S.pick("a"))

// @ts-expect-error
pipe(hole<Record<string, number> & { a: boolean }>(), S.pick("b"))

// $ExpectType { a?: string; b: number; }
pipe(optionalStringStruct, S.pick("a", "b"))

// $ExpectType { a: string; b: number; }
S.pick(stringStruct, "a", "b")

// $ExpectType { a?: number; b?: number; }
S.pick(stringNumberRecord, "a", "b")

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

// $ExpectType { a?: string; b: number; }
pipe(optionalStringStruct, S.omit("c"))

// $ExpectType { b: number; c: boolean; }
S.omit(stringStruct, "a")
