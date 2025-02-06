import { Context, Effect } from "effect"

// -------------------------------------------------------------------------------------
// `key` field
// -------------------------------------------------------------------------------------

class A extends Effect.Service<A>()("A", { succeed: { a: "value" } }) {}

// $ExpectType "A"
A.key

class B extends Context.Tag("B")<B, { a: "value" }>() {}

// $ExpectType "B"
B.key

class C extends Context.Reference<C>()("C", { defaultValue: () => 0 }) {}

// $ExpectType "C"
C.key
