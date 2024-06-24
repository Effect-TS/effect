import * as Function from "effect/Function"

// -------------------------------------------------------------------------------------
// dual
// -------------------------------------------------------------------------------------

type f_data_first = (a: number, b: number) => number
type f_data_last = (b: number) => (a: number) => number

const f: f_data_first & f_data_last = Function.dual(2, (a: number, b: number) => a + b)
// $ExpectType f_data_first & f_data_last
f

const f_explicit_types = Function.dual<f_data_last, f_data_first>(2, (a: number, b: number) => a + b)
// $ExpectType f_data_first & f_data_last
f_explicit_types

const f_no_type = Function.dual(2, (a: number, b: number) => a + b)
// $ExpectType (a: number, b: number) => number
f_no_type

// @ts-expect-error
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const f_wrong_impl: f_data_first & f_data_last = Function.dual(2, (a: string, b: string) => a + b)
