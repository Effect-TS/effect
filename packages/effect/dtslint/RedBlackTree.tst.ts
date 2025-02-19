import type { Order } from "effect"
import { pipe, RedBlackTree } from "effect"
import { describe, expect, it } from "tstyche"

declare const stringAndNumberIterable: Iterable<[string, number]>
declare const stringOrUndefinedOrder: Order.Order<string | undefined>

describe("RedBlackTree", () => {
  it("fromIterable", () => {
    expect(RedBlackTree.fromIterable(stringAndNumberIterable, stringOrUndefinedOrder)).type.toBe<
      RedBlackTree.RedBlackTree<string, number>
    >()
    expect(pipe(stringAndNumberIterable, RedBlackTree.fromIterable(stringOrUndefinedOrder))).type.toBe<
      RedBlackTree.RedBlackTree<string, number>
    >()
  })
})
