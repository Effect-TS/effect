import * as HashMap from 'effect/HashMap'

declare const hmLiterals: HashMap.HashMap<"k", "v">

// -------------------------------------------------------------------------------------
// HashMap.Key
// -------------------------------------------------------------------------------------

// $ExpectType "k"
type K = HashMap.HashMap.Key<typeof hmLiterals>

// -------------------------------------------------------------------------------------
// HashMap.Value
// -------------------------------------------------------------------------------------

// $ExpectType "v"
type V = HashMap.HashMap.Value<typeof hmLiterals>
