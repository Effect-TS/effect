import type * as Types from "effect/Types"

// -------------------------------------------------------------------------------------
// UnionToIntersection
// -------------------------------------------------------------------------------------

// $ExpectType { a: string; } & { b: number; }
export type UnionToIntersection = Types.UnionToIntersection<{ a: string } | { b: number }>

// -------------------------------------------------------------------------------------
// Tags
// -------------------------------------------------------------------------------------

// $ExpectType "a" | "b"
export type Tags = Types.Tags<string | { _tag: "a" } | { _tag: "b" }> & unknown

// -------------------------------------------------------------------------------------
// ExcludeTag
// -------------------------------------------------------------------------------------

// $ExpectType string | { _tag: "b"; }
export type ExcludeTag = Types.ExcludeTag<string | { _tag: "a" } | { _tag: "b" }, "a"> & unknown

// $ExpectType { _tag: "b"; b: number; }
export type ExtractTag = Types.ExtractTag<string | { _tag: "a"; a: number } | { _tag: "b"; b: number }, "b"> & unknown

// -------------------------------------------------------------------------------------
// Simplify
// -------------------------------------------------------------------------------------

// $ExpectType { a: number; b: number; }
export type Simplify = Types.Simplify<object & { a: number } & { b: number }>

// -------------------------------------------------------------------------------------
// Equals
// -------------------------------------------------------------------------------------

// $ExpectType true
export type Equals1 = Types.Equals<{ a: number }, { a: number }>

// $ExpectType false
export type Equals2 = Types.Equals<{ a: number }, { b: number }>

// -------------------------------------------------------------------------------------
// MergeLeft
// -------------------------------------------------------------------------------------

// $ExpectType { a: number; b: number; }
export type MergeLeft = Types.MergeLeft<{ a: number; b: number }, { a: string }>

// -------------------------------------------------------------------------------------
// MergeRight
// -------------------------------------------------------------------------------------

// $ExpectType { a: string; b: number; }
export type MergeRight = Types.MergeRight<{ a: number; b: number }, { a: string }>

// -------------------------------------------------------------------------------------
// Mutable
// -------------------------------------------------------------------------------------

// $ExpectType { a: string; b: number; }
export type MutableStruct = Types.Simplify<Types.Mutable<{ readonly a: string; readonly b: number }>>

// $ExpectType string[]
export type MutableArray = Types.Mutable<ReadonlyArray<string>>

// $ExpectType [string, number]
export type MutableTuple = Types.Mutable<readonly [string, number]>

// $ExpectType { [x: string]: number; }
export type MutableRecord = Types.Simplify<Types.Mutable<{ readonly [_: string]: number }>>
