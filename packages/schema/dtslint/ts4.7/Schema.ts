import { pipe } from "@fp-ts/data/Function"
import * as S from "@fp-ts/schema/Schema"

//
// tuple
//

// $ExpectType Schema<readonly [string, number]>
S.tuple(S.string,  S.number)

// --- element ---

// $ExpectType Schema<readonly [string, number, boolean]>
pipe(S.tuple(S.string, S.number), S.element(S.boolean))

// $ExpectType Schema<readonly [string, number, ...boolean[], bigint]>
pipe(S.tuple(S.string, S.number), S.rest(S.boolean), S.element(S.bigint))

// --- optionalElement ---

// $ExpectType Schema<readonly [string, number, (boolean | undefined)?]>
pipe(S.tuple(S.string, S.number), S.optionalElement(S.boolean))

// --- rest ---

// $ExpectType Schema<readonly [string, number]>
pipe(S.tuple(S.string, S.number))

// $ExpectType Schema<readonly [string, number, ...boolean[]]>
pipe(S.tuple(S.string, S.number), S.rest(S.boolean))

// $ExpectType Schema<readonly [string, number, ...(number | boolean)[]]>
pipe(S.tuple(S.string, S.number), S.rest(S.boolean), S.rest(S.number))

//
// struct
//

// $ExpectType Schema<{ readonly a: string; readonly b: number; }>
S.struct({ a: S.string,  b: S.number })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean | undefined; }>
S.struct({ a: S.string,  b: S.number, c: S.optional(S.boolean) })

//
// extend
//

// $ExpectType Schema<{ readonly a: string; readonly b: number; } & { readonly c: boolean; }>
pipe(S.struct({ a: S.string,  b: S.number }), S.extend(S.struct({ c: S.boolean })))

// $ExpectType Schema<{ readonly a: string; readonly b: number; } & { readonly [_: string]: boolean; }>
pipe(S.struct({a: S.string, b: S.number}), S.extend(S.stringIndexSignature(S.boolean)))

// $ExpectType Schema<{ readonly a: string; readonly b: number; } & { readonly [_: symbol]: boolean; }>
pipe(S.struct({a: S.string, b: S.number}), S.extend(S.symbolIndexSignature(S.boolean)))

//
// pick
//

// $ExpectType Schema<{ readonly a: string; }>
pipe(S.struct({ a: S.string,  b: S.number }), S.pick('a'))

//
// omit
//

// $ExpectType Schema<{ readonly b: number; }>
pipe(S.struct({ a: S.string,  b: S.number }), S.omit('a'))
