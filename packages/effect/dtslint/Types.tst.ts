import type * as Types from "effect/Types"
import { describe, expect, it } from "tstyche"

describe("Types", () => {
  it("TupleOf", () => {
    expect<Types.TupleOf<3, number>>()
      .type.toBe<[number, number, number]>()
  })

  it("TupleOfAtLeast", () => {
    expect<Types.TupleOfAtLeast<3, number>>()
      .type.toBe<[number, number, number, ...Array<number>]>()
  })

  it("UnionToIntersection", () => {
    expect<Types.UnionToIntersection<{ a: string } | { b: number }>>()
      .type.toBe<{ a: string } & { b: number }>()
  })

  it("Tags", () => {
    expect<Types.Tags<string | { _tag: "a" } | { _tag: "b" }> & unknown>()
      .type.toBe<"a" | "b">()
  })

  it("ExcludeTag", () => {
    expect<Types.ExcludeTag<string | { _tag: "a" } | { _tag: "b" }, "a"> & unknown>()
      .type.toBe<string | { _tag: "b" }>()
  })

  it("ExtractTag", () => {
    expect<Types.ExtractTag<string | { _tag: "a"; a: number } | { _tag: "b"; b: number }, "b"> & unknown>()
      .type.toBe<{ _tag: "b"; b: number }>()
  })

  it("Simplify", () => {
    expect<Types.Simplify<object & { a: number } & { b: number }>>()
      .type.toBe<{ a: number; b: number }>()
  })

  describe("Equals", () => {
    it("should return true for identical types", () => {
      expect<Types.Equals<{ a: number }, { a: number }>>()
        .type.toBe<true>()
    })
    it("should return false for different types", () => {
      expect<Types.Equals<{ a: number }, { b: number }>>()
        .type.toBe<false>()
    })
  })

  describe("MergeRight", () => {
    it("mutable overwrites mutable", () => {
      expect<Types.MergeRight<{ a: number; b: number }, { a: string; c: boolean }>>()
        .type.toBe<{ a: string; c: boolean; b: number }>()
    })

    it("mutable overwrites readonly", () => {
      expect<Types.MergeRight<{ readonly a: number; b: number }, { a: string; c: boolean }>>()
        .type.toBe<{ a: string; c: boolean; b: number }>()
    })

    it("readonly overwrites mutable", () => {
      expect<Types.MergeRight<{ a: number; b: number }, { readonly a: string; c: boolean }>>()
        .type.toBe<{ readonly a: string; c: boolean; b: number }>()
    })

    it("required overwrites optional", () => {
      expect<Types.MergeRight<{ a?: number; b: number }, { a: string; c: boolean }>>()
        .type.toBe<{ a: string; c: boolean; b: number }>()
    })

    it("optional overwrites optional", () => {
      expect<Types.MergeRight<{ a?: number; b: number }, { a?: string; c: boolean }>>()
        .type.toBe<{ a?: string; c: boolean; b: number }>()
    })

    it("optional overwrites required", () => {
      expect<Types.MergeRight<{ a: number; b: number }, { a?: string; c: boolean }>>()
        .type.toBe<{ a?: string; c: boolean; b: number }>()
    })

    it("readonly optional overwrites mutable required", () => {
      expect<Types.MergeRight<{ a: number; b: number }, { readonly a?: string; c: boolean }>>()
        .type.toBe<{ readonly a?: string; c: boolean; b: number }>()
    })

    it("mutable required overwrites readonly optional", () => {
      expect<Types.MergeRight<{ readonly a?: number; b: number }, { a: string; c: boolean }>>()
        .type.toBe<{ a: string; c: boolean; b: number }>()
    })

    it("optionality of non involved keys must be preserved", () => {
      expect<Types.MergeRight<{ readonly a?: number; b: number }, { readonly c?: string }>>()
        .type.toBe<{ readonly c?: string; readonly a?: number; b: number }>()
    })
  })

  describe("Mutable", () => {
    it("should convert a readonly object to mutable", () => {
      expect<Types.Simplify<Types.Mutable<{ readonly a: string; readonly b: number }>>>()
        .type.toBe<{ a: string; b: number }>()
    })

    it("should convert a ReadonlyArray to a mutable array", () => {
      expect<Types.Mutable<ReadonlyArray<string>>>()
        .type.toBe<Array<string>>()
    })

    it("should convert a readonly tuple to a mutable tuple", () => {
      expect<Types.Mutable<readonly [string, number]>>()
        .type.toBe<[string, number]>()
    })

    it("should convert a readonly record to a mutable record", () => {
      expect<Types.Simplify<Types.Mutable<{ readonly [x: string]: number }>>>()
        .type.toBe<{ [x: string]: number }>()
    })
  })

  describe("DeepMutable", () => {
    type TaggedValues<A> = {
      readonly _tag: string
      readonly value: ReadonlyArray<A>
    }

    it("primitives and literals", () => {
      expect<
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
      >().type.toBe<[string, number, boolean, bigint, symbol, never, null, "a", 1, true]>()
    })

    describe("record", () => {
      it("should convert a readonly record to a mutable record", () => {
        expect<Types.DeepMutable<{ readonly [x: string]: number }>>()
          .type.toBe<{ [x: string]: number }>()
      })

      it("should leave a mutable record unchanged", () => {
        expect<Types.DeepMutable<{ [_: string]: number }>>()
          .type.toBe<{ [x: string]: number }>()
      })
    })

    describe("struct", () => {
      it("should convert an empty object", () => {
        expect<Types.DeepMutable<{}>>()
          .type.toBe<{}>()
      })

      it("should deeply mutate nested structs", () => {
        expect<Types.DeepMutable<ReadonlyArray<TaggedValues<TaggedValues<TaggedValues<boolean>>>>>>()
          .type.toBe<
          Array<{
            _tag: string
            value: Array<{
              _tag: string
              value: Array<{
                _tag: string
                value: Array<boolean>
              }>
            }>
          }>
        >()
      })
    })

    describe("array", () => {
      it("should convert a readonly empty array to a mutable empty array", () => {
        expect<Types.DeepMutable<readonly []>>()
          .type.toBe<[]>()
      })

      it("should leave a mutable empty array unchanged", () => {
        expect<Types.DeepMutable<[]>>()
          .type.toBe<[]>()
      })

      it("should convert a readonly array to a mutable array", () => {
        expect<Types.DeepMutable<ReadonlyArray<string>>>()
          .type.toBe<Array<string>>()
      })

      it("should leave a mutable array unchanged", () => {
        expect<Types.DeepMutable<Array<string>>>()
          .type.toBe<Array<string>>()
      })
    })

    describe("tuple", () => {
      it("should convert a readonly tuple", () => {
        expect<Types.DeepMutable<readonly [string, number, boolean]>>()
          .type.toBe<[string, number, boolean]>()
      })

      it("should leave a mutable tuple unchanged", () => {
        expect<Types.DeepMutable<[string, number, boolean]>>()
          .type.toBe<[string, number, boolean]>()
      })
    })

    describe("Set", () => {
      it("should convert a ReadonlySet to a mutable Set", () => {
        expect<Types.DeepMutable<ReadonlySet<{ readonly value: TaggedValues<number> }>>>()
          .type.toBe<Set<{ value: { _tag: string; value: Array<number> } }>>()
      })

      it("should leave a mutable Set unchanged", () => {
        expect<Types.DeepMutable<Set<{ readonly value: TaggedValues<number> }>>>()
          .type.toBe<Set<{ value: { _tag: string; value: Array<number> } }>>()
      })
    })

    describe("Map", () => {
      it("should convert a ReadonlyMap to a mutable Map", () => {
        expect<Types.DeepMutable<ReadonlyMap<TaggedValues<string>, ReadonlySet<TaggedValues<number>>>>>()
          .type.toBe<Map<{ _tag: string; value: Array<string> }, Set<{ _tag: string; value: Array<number> }>>>()
      })

      it("should leave a mutable Map unchanged", () => {
        expect<Types.DeepMutable<Map<TaggedValues<string>, ReadonlySet<TaggedValues<number>>>>>()
          .type.toBe<Map<{ _tag: string; value: Array<string> }, Set<{ _tag: string; value: Array<number> }>>>()
      })
    })
  })

  describe("MatchRecord", () => {
    it("should yield 1 when matching a record type", () => {
      expect<Types.MatchRecord<{ [x: string]: number }, 1, 0>>().type.toBe<1>()
    })

    it("should yield 0 when not matching a record type", () => {
      expect<Types.MatchRecord<{ a: number }, 1, 0>>().type.toBe<0>()
    })
  })
})
