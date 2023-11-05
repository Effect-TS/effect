import type { HashMap } from "effect/HashMap"

declare const hmLiterals: HashMap<"k", "v">

// -------------------------------------------------------------------------------------
// HashMap.Key
// -------------------------------------------------------------------------------------

// $ExpectType "k"
export type K = HashMap.Key<typeof hmLiterals>

// -------------------------------------------------------------------------------------
// HashMap.Value
// -------------------------------------------------------------------------------------

// $ExpectType "v"
export type V = HashMap.Value<typeof hmLiterals>
