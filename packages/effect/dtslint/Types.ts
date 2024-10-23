import { hole } from "effect/Function"
import type * as Types from "effect/Types"

// -------------------------------------------------------------------------------------
// TupleOf
// -------------------------------------------------------------------------------------

// $ExpectType [number, number, number]
hole<Types.TupleOf<3, number>>()

// -------------------------------------------------------------------------------------
// TupleOfAtLeast
// -------------------------------------------------------------------------------------

// $ExpectType [number, number, number, ...number[]]
hole<Types.TupleOfAtLeast<3, number>>()

// -------------------------------------------------------------------------------------
// UnionToIntersection
// -------------------------------------------------------------------------------------

// $ExpectType { a: string; } & { b: number; }
hole<Types.UnionToIntersection<{ a: string } | { b: number }>>()

// -------------------------------------------------------------------------------------
// Tags
// -------------------------------------------------------------------------------------

// $ExpectType "a" | "b"
hole<Types.Tags<string | { _tag: "a" } | { _tag: "b" }> & unknown>()

// -------------------------------------------------------------------------------------
// ExcludeTag
// -------------------------------------------------------------------------------------

// $ExpectType string | { _tag: "b"; }
hole<Types.ExcludeTag<string | { _tag: "a" } | { _tag: "b" }, "a"> & unknown>()

// $ExpectType { _tag: "b"; b: number; }
hole<Types.ExtractTag<string | { _tag: "a"; a: number } | { _tag: "b"; b: number }, "b"> & unknown>()

// -------------------------------------------------------------------------------------
// Simplify
// -------------------------------------------------------------------------------------

// $ExpectType { a: number; b: number; }
hole<Types.Simplify<object & { a: number } & { b: number }>>()

// -------------------------------------------------------------------------------------
// Equals
// -------------------------------------------------------------------------------------

// $ExpectType true
hole<Types.Equals<{ a: number }, { a: number }>>()

// $ExpectType false
hole<Types.Equals<{ a: number }, { b: number }>>()

// -------------------------------------------------------------------------------------
// MergeRecord
// -------------------------------------------------------------------------------------

// No tests needed as MergeRecord is just an alias of MergeLeft

// -------------------------------------------------------------------------------------
// MergeLeft
// -------------------------------------------------------------------------------------

// No tests needed as MergeLeft is just MergeRight with arguments flipped

// -------------------------------------------------------------------------------------
// MergeRight
// -------------------------------------------------------------------------------------

// mutable overwrites mutable
// $ExpectType { a: string; c: boolean; b: number; }
hole<Types.MergeRight<{ a: number; b: number }, { a: string; c: boolean }>>()

// mutable overwrites readonly
// $ExpectType { a: string; c: boolean; b: number; }
hole<Types.MergeRight<{ readonly a: number; b: number }, { a: string; c: boolean }>>()

// readonly overwrites mutable
// $ExpectType { readonly a: string; c: boolean; b: number; }
hole<Types.MergeRight<{ a: number; b: number }, { readonly a: string; c: boolean }>>()

// required overwrites optional
// $ExpectType { a: string; c: boolean; b: number; }
hole<Types.MergeRight<{ a?: number; b: number }, { a: string; c: boolean }>>()

// optional overwrites optional
// $ExpectType { a?: string; c: boolean; b: number; }
hole<Types.MergeRight<{ a?: number; b: number }, { a?: string; c: boolean }>>()

// optional overwrites required
// $ExpectType { a?: string; c: boolean; b: number; }
hole<Types.MergeRight<{ a: number; b: number }, { a?: string; c: boolean }>>()

// readonly optional overwrites mutable required
// $ExpectType { readonly a?: string; c: boolean; b: number; }
hole<Types.MergeRight<{ a: number; b: number }, { readonly a?: string; c: boolean }>>()

// mutable required overwrites readonly optional
// $ExpectType { a: string; c: boolean; b: number; }
hole<Types.MergeRight<{ readonly a?: number; b: number }, { a: string; c: boolean }>>()

// optionality of non involved keys must be preserved
// $ExpectType { readonly c?: string; readonly a?: number; b: number; }
hole<Types.MergeRight<{ readonly a?: number; b: number }, { readonly c?: string }>>()

// -------------------------------------------------------------------------------------
// Mutable
// -------------------------------------------------------------------------------------

// $ExpectType { a: string; b: number; }
hole<Types.Simplify<Types.Mutable<{ readonly a: string; readonly b: number }>>>()

// $ExpectType string[]
hole<Types.Mutable<ReadonlyArray<string>>>()

// $ExpectType [string, number]
hole<Types.Mutable<readonly [string, number]>>()

// $ExpectType { [x: string]: number; }
hole<Types.Simplify<Types.Mutable<{ readonly [_: string]: number }>>>()

// -------------------------------------------------------------------------------------
// DeepMutable
// -------------------------------------------------------------------------------------

type TaggedValues<A> = {
  readonly _tag: string
  readonly value: ReadonlyArray<A>
}

// primitive types and literals
// $ExpectType [string, number, boolean, bigint, symbol, never, null, "a", 1, true]
hole<
  [
    Types.DeepMutable<string>,
    Types.DeepMutable<number>,
    Types.DeepMutable<boolean>,
    Types.DeepMutable<bigint>,
    Types.DeepMutable<symbol>,
    Types.DeepMutable<never>,
    Types.DeepMutable<null>,
    Types.DeepMutable<"a">,
    Types.DeepMutable<1>,
    Types.DeepMutable<true>
  ]
>()

// record
// $ExpectType { [x: string]: number; }
hole<Types.DeepMutable<{ readonly [_: string]: number }>>()
// $ExpectType { [x: string]: number; }
hole<Types.DeepMutable<{ [_: string]: number }>>()

// structs
// $ExpectType {}
hole<Types.DeepMutable<{}>>()
// $ExpectType { _tag: string; value: { _tag: string; value: { _tag: string; value: boolean[]; }[]; }[]; }[]
hole<Types.DeepMutable<ReadonlyArray<TaggedValues<TaggedValues<TaggedValues<boolean>>>>>>()

// array
// $ExpectType []
hole<Types.DeepMutable<readonly []>>()
// $ExpectType string[]
hole<Types.DeepMutable<ReadonlyArray<string>>>()
// $ExpectType string[]
hole<Types.DeepMutable<Array<string>>>()

// tuples
// $ExpectType [string, number, boolean]
hole<Types.DeepMutable<readonly [string, number, boolean]>>()
// $ExpectType [string, number, boolean]
hole<Types.DeepMutable<[string, number, boolean]>>()

// ReadonlySet
// $ExpectType Set<{ value: { _tag: string; value: number[]; }; }>
hole<Types.DeepMutable<ReadonlySet<{ readonly value: TaggedValues<number> }>>>()
// $ExpectType Set<{ value: { _tag: string; value: number[]; }; }>
hole<Types.DeepMutable<Set<{ readonly value: TaggedValues<number> }>>>()

// ReadonlyMap
// $ExpectType Map<{ _tag: string; value: string[]; }, Set<{ _tag: string; value: number[]; }>>
hole<Types.DeepMutable<ReadonlyMap<TaggedValues<string>, ReadonlySet<TaggedValues<number>>>>>()
// $ExpectType Map<{ _tag: string; value: string[]; }, Set<{ _tag: string; value: number[]; }>>
hole<Types.DeepMutable<Map<TaggedValues<string>, ReadonlySet<TaggedValues<number>>>>>()

// -------------------------------------------------------------------------------------
// MatchRecord
// -------------------------------------------------------------------------------------

// $ExpectType 1
hole<Types.MatchRecord<{ [x: string]: number }, 1, 0>>()

// $ExpectType 0
hole<Types.MatchRecord<{ a: number }, 1, 0>>()
