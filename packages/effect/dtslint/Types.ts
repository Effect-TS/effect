import * as Types from 'effect/Types'

// $ExpectType { a: string; } & { b: number; }
type UnionToIntersection = Types.UnionToIntersection<{ a: string } | { b: number }>

// $ExpectType "a" | "b"
type Tags = Types.Tags<string | { _tag: "a" } | { _tag: "b" }> & unknown

// $ExpectType string | { _tag: "b"; }
type ExcludeTag = Types.ExcludeTag<string | { _tag: "a" } | { _tag: "b" }, "a"> & unknown

// $ExpectType { _tag: "b"; b: number; }
type ExtractTag = Types.ExtractTag<string | { _tag: "a", a: number } | { _tag: "b", b: number }, "b"> & unknown

// $ExpectType { a: number; b: number; }
type Simplify = Types.Simplify<object & { a: number } & { b: number }>

// $ExpectType true
type Equals1 = Types.Equals<{ a: number }, { a: number }>

// $ExpectType false
type Equals2 = Types.Equals<{ a: number }, { b: number }>

// $ExpectType { a: number; b: number; }
type MergeLeft = Types.MergeLeft<{ a: number, b: number; }, { a: string }>

// $ExpectType { a: string; b: number; }
type MergeRight = Types.MergeRight<{ a: number, b: number; }, { a: string }>
