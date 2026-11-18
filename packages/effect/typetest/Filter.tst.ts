import { Filter, pipe, Predicate } from "effect"
import { describe, expect, it } from "tstyche"

describe("Filter", () => {
  it("map", () => {
    const defined = Filter.fromPredicate(Predicate.isNotUndefined<number | undefined>)
    type Expected = Filter.Filter<number | undefined, string, undefined>

    expect(Filter.map(defined, (n) => n.toFixed())).type.toBe<Expected>()
    expect(pipe(defined, Filter.map((n) => n.toFixed()))).type.toBe<Expected>()
  })
})
