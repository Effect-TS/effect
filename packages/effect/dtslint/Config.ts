import * as Config from "effect/Config"
import { hole, pipe } from "effect/Function"

declare const string: Config.Config<string>
declare const number: Config.Config<number>
declare const stringArray: Array<Config.Config<string>>
declare const numberRecord: Record<string, Config.Config<number>>

// -------------------------------------------------------------------------------------
// all - tuple
// -------------------------------------------------------------------------------------

// $ExpectType Config<[string, number]>
Config.all([string, number])

// $ExpectType Config<[string, number]>
pipe([string, number] as const, Config.all)

// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Config<{ a: string; b: number; }>
Config.all({ a: string, b: number })

// $ExpectType Config<{ a: string; b: number; }>
pipe({ a: string, b: number }, Config.all)

// -------------------------------------------------------------------------------------
// all - array
// -------------------------------------------------------------------------------------

// $ExpectType Config<string[]>
Config.all(stringArray)

// $ExpectType Config<string[]>
pipe(stringArray, Config.all)

// -------------------------------------------------------------------------------------
// all - record
// -------------------------------------------------------------------------------------

// $ExpectType Config<{ [x: string]: number; }>
Config.all(numberRecord)

// $ExpectType Config<{ [x: string]: number; }>
pipe(numberRecord, Config.all)

// -------------------------------------------------------------------------------------
// Success
// -------------------------------------------------------------------------------------

// $ExpectType string
hole<Config.Config.Success<typeof string>>()

// $ExpectType number
hole<Config.Config.Success<typeof number>>()

const object = Config.all({ a: string, b: number })

// $ExpectType { a: string; b: number; }
hole<Config.Config.Success<typeof object>>()
