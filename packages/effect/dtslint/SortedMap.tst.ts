import type { Order } from "effect"
import { pipe, SortedMap } from "effect"
import { describe, expect, it } from "tstyche"

declare const stringAndNumberIterable: Iterable<[string, number]>
declare const stringOrUndefinedOrder: Order.Order<string | undefined>

describe("SortedMap", () => {
  it("fromIterable", () => {
    expect(SortedMap.fromIterable(stringAndNumberIterable, stringOrUndefinedOrder))
      .type.toBe<SortedMap.SortedMap<string, number>>()
    expect(pipe(stringAndNumberIterable, SortedMap.fromIterable(stringOrUndefinedOrder)))
      .type.toBe<SortedMap.SortedMap<string, number>>()
  })
})
