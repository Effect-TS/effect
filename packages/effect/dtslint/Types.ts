import { hole } from "effect/Function"
import type * as Types from "effect/Types"

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
// MergeLeft
// -------------------------------------------------------------------------------------

// $ExpectType { a: number; b: number; }
hole<Types.MergeLeft<{ a: number; b: number }, { a: string }>>()

// -------------------------------------------------------------------------------------
// MergeRight
// -------------------------------------------------------------------------------------

// $ExpectType { a: string; b: number; }
hole<Types.MergeRight<{ a: number; b: number }, { a: string }>>()

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

// $ExpectType [string, number, boolean, bigint]
hole<[Types.DeepMutable<string>, Types.DeepMutable<number>, Types.DeepMutable<boolean>, Types.DeepMutable<bigint>]>()

// $ExpectType { [x: string]: number; }
hole<Types.DeepMutable<{ readonly [_: string]: number }>>()

// $ExpectType Set<{ value: { _tag: string; value: number[]; }; }>
hole<Types.DeepMutable<ReadonlySet<{ readonly value: TaggedValues<number> }>>>()

// $ExpectType Map<{ _tag: string; value: string[]; }, Set<{ _tag: string; value: number[]; }>>
hole<Types.DeepMutable<ReadonlyMap<TaggedValues<string>, ReadonlySet<TaggedValues<number>>>>>()

// $ExpectType { _tag: string; value: { _tag: string; value: { _tag: string; value: boolean[]; }[]; }[]; }[]
hole<Types.DeepMutable<ReadonlyArray<TaggedValues<TaggedValues<TaggedValues<boolean>>>>>>()

// -------------------------------------------------------------------------------------
// MatchRecord
// -------------------------------------------------------------------------------------

// $ExpectType 1
hole<Types.MatchRecord<{ [x: string]: number }, 1, 0>>()

// $ExpectType 0
hole<Types.MatchRecord<{ a: number }, 1, 0>>()
