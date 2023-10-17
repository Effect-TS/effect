import type * as HashMap from "effect/HashMap"

declare const hmLiterals: HashMap.HashMap<"k", "v">

// -------------------------------------------------------------------------------------
// HashMap.Key
// -------------------------------------------------------------------------------------

// $ExpectType "k"
export type K = HashMap.HashMap.Key<typeof hmLiterals>

// -------------------------------------------------------------------------------------
// HashMap.Value
// -------------------------------------------------------------------------------------

// $ExpectType "v"
export type V = HashMap.HashMap.Value<typeof hmLiterals>
