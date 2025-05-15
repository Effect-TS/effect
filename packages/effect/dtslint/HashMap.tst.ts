/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Option } from "effect"
import { HashMap, hole, pipe, Predicate } from "effect"
import { describe, expect, it } from "tstyche"

declare const literals: HashMap.HashMap<"k", "v">
declare const string$numberOrString: HashMap.HashMap<string, number | string>

describe("HashMap", () => {
  it("HashMap.Key type helper", () => {
    type K = HashMap.HashMap.Key<typeof literals>
    expect(hole<K>()).type.toBe<"k">()
  })

  it("HashMap.Value type helper", () => {
    type V = HashMap.HashMap.Value<typeof literals>
    expect<V>().type.toBe<"v">()
  })

  it("HashMap.Entry type helper", () => {
    expect<HashMap.HashMap.Entry<typeof literals>>().type.toBe<["k", "v"]>()
  })

  it("filter", () => {
    // Predicate
    expect(
      HashMap.filter(string$numberOrString, (value, key) => {
        expect(value).type.toBe<string | number>()
        expect(key).type.toBe<string>()
        return true
      })
    ).type.toBe<HashMap.HashMap<string, string | number>>()
    expect(
      pipe(
        string$numberOrString,
        HashMap.filter((value, key) => {
          expect(value).type.toBe<string | number>()
          expect(key).type.toBe<string>()
          return true
        })
      )
    ).type.toBe<HashMap.HashMap<string, string | number>>()

    // Refinement
    expect(HashMap.filter(string$numberOrString, Predicate.isNumber)).type.toBe<HashMap.HashMap<string, number>>()
    expect(
      pipe(string$numberOrString, HashMap.filter(Predicate.isNumber))
    ).type.toBe<HashMap.HashMap<string, number>>()
  })

  it("findFirst", () => {
    // Predicate
    expect(HashMap.findFirst(string$numberOrString, (value, key) => {
      expect(value).type.toBe<string | number>()
      expect(key).type.toBe<string>()
      return true
    })).type.toBe<Option.Option<[string, string | number]>>()
    expect(pipe(
      string$numberOrString,
      HashMap.findFirst((value, key) => {
        expect(value).type.toBe<string | number>()
        expect(key).type.toBe<string>()
        return true
      })
    )).type.toBe<Option.Option<[string, string | number]>>()

    // Refinement
    expect(HashMap.findFirst(string$numberOrString, Predicate.isNumber))
      .type.toBe<Option.Option<[string, number]>>()
    expect(
      pipe(string$numberOrString, HashMap.findFirst(Predicate.isNumber))
    ).type.toBe<Option.Option<[string, number]>>()
  })
})
