import { deepStrictEqual } from "effect-test/util"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as number from "effect/Number"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as RedBlackTree from "effect/RedBlackTree"
import { inspect } from "node:util"
import { assert, describe, expect, it } from "vitest"

describe.concurrent("RedBlackTree", () => {
  it("toString", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b")
    )

    expect(String(tree)).toEqual(`{
  "_id": "RedBlackTree",
  "values": [
    [
      0,
      "b"
    ],
    [
      1,
      "a"
    ]
  ]
}`)
  })

  it("toJSON", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b")
    )

    expect(tree.toJSON()).toEqual(
      { _id: "RedBlackTree", values: [[0, "b"], [1, "a"]] }
    )
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b")
    )

    expect(inspect(tree)).toEqual(inspect({ _id: "RedBlackTree", values: [[0, "b"], [1, "a"]] }))
  })

  it("forEach", () => {
    const ordered: Array<[number, string]> = []
    pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e"),
      RedBlackTree.forEach((n, s) => {
        ordered.push([n, s])
      })
    )

    deepStrictEqual(ordered, [
      [-2, "d"],
      [-1, "c"],
      [0, "b"],
      [1, "a"],
      [3, "e"]
    ])
  })

  it("iterable", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e")
    )

    assert.strictEqual(RedBlackTree.size(tree), 5)
    deepStrictEqual(Array.from(tree), [
      [-2, "d"],
      [-1, "c"],
      [0, "b"],
      [1, "a"],
      [3, "e"]
    ])
  })

  it("iterable empty", () => {
    const tree = RedBlackTree.empty<number, string>(number.Order)

    assert.strictEqual(RedBlackTree.size(tree), 0)
    deepStrictEqual(Array.from(tree), [])
  })

  it("backwards", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e")
    )

    assert.strictEqual(RedBlackTree.size(tree), 5)
    deepStrictEqual(Array.from(RedBlackTree.reversed(tree)), [
      [3, "e"],
      [1, "a"],
      [0, "b"],
      [-1, "c"],
      [-2, "d"]
    ])
  })

  it("backwards empty", () => {
    const tree = RedBlackTree.empty<number, string>(number.Order)

    assert.strictEqual(RedBlackTree.size(tree), 0)
    deepStrictEqual(Array.from(RedBlackTree.reversed(tree)), [])
  })

  it("values", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e")
    )

    assert.strictEqual(RedBlackTree.size(tree), 5)
    deepStrictEqual(Array.from(RedBlackTree.values(tree)), ["d", "c", "b", "a", "e"])
  })

  it("keys", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e")
    )

    assert.strictEqual(RedBlackTree.size(tree), 5)
    deepStrictEqual(Array.from(RedBlackTree.keys(tree)), [-2, -1, 0, 1, 3])
  })

  it("begin/end", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e")
    )

    deepStrictEqual(RedBlackTree.first(tree), Option.some([-2, "d"]))
    deepStrictEqual(RedBlackTree.last(tree), Option.some([3, "e"]))
    deepStrictEqual(RedBlackTree.getAt(1)(tree), Option.some([-1, "c"]))
  })

  it("forEachGreaterThanEqual", () => {
    const ordered: Array<[number, string]> = []
    pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e"),
      RedBlackTree.forEachGreaterThanEqual(0, (k, v) => {
        ordered.push([k, v])
      })
    )

    deepStrictEqual(ordered, [[0, "b"], [1, "a"], [3, "e"]])
  })

  it("forEachLessThan", () => {
    const ordered: Array<[number, string]> = []
    pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e"),
      RedBlackTree.forEachLessThan(0, (k, v) => {
        ordered.push([k, v])
      })
    )

    deepStrictEqual(ordered, [[-2, "d"], [-1, "c"]])
  })

  it("forEachBetween", () => {
    const ordered: Array<[number, string]> = []
    pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e"),
      RedBlackTree.forEachBetween({
        min: -1,
        max: 2,
        body: (k, v) => {
          ordered.push([k, v])
        }
      })
    )

    deepStrictEqual(ordered, [[-1, "c"], [0, "b"], [1, "a"]])
  })

  it("greaterThan", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e")
    )

    deepStrictEqual(Array.from(RedBlackTree.greaterThan(0)(tree)), [
      [1, "a"],
      [3, "e"]
    ])
    deepStrictEqual(
      Array.from(RedBlackTree.greaterThanReversed(0)(tree)),
      [
        [1, "a"],
        [0, "b"],
        [-1, "c"],
        [-2, "d"]
      ]
    )
  })

  it("greaterThanEqual", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e")
    )

    deepStrictEqual(Array.from(RedBlackTree.greaterThanEqual(0)(tree)), [
      [0, "b"],
      [1, "a"],
      [3, "e"]
    ])
    deepStrictEqual(
      Array.from(RedBlackTree.greaterThanEqualReversed(0)(tree)),
      [
        [0, "b"],
        [-1, "c"],
        [-2, "d"]
      ]
    )
  })

  it("lessThan", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e")
    )

    deepStrictEqual(Array.from(RedBlackTree.lessThan(0)(tree)), [
      [-1, "c"],
      [0, "b"],
      [1, "a"],
      [3, "e"]
    ])
    deepStrictEqual(
      Array.from(RedBlackTree.lessThanReversed(0)(tree)),
      [
        [-1, "c"],
        [-2, "d"]
      ]
    )
  })

  it("lessThanEqual", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(0, "b"),
      RedBlackTree.insert(-1, "c"),
      RedBlackTree.insert(-2, "d"),
      RedBlackTree.insert(3, "e")
    )

    deepStrictEqual(Array.from(RedBlackTree.lessThanEqual(0)(tree)), [
      [0, "b"],
      [1, "a"],
      [3, "e"]
    ])
    deepStrictEqual(
      Array.from(RedBlackTree.lessThanEqualReversed(0)(tree)),
      [
        [0, "b"],
        [-1, "c"],
        [-2, "d"]
      ]
    )
  })

  it("findAll", () => {
    const tree = pipe(
      RedBlackTree.empty<number, string>(number.Order),
      RedBlackTree.insert(1, "a"),
      RedBlackTree.insert(2, "c"),
      RedBlackTree.insert(1, "b"),
      RedBlackTree.insert(3, "d"),
      RedBlackTree.insert(1, "e")
    )

    deepStrictEqual(Array.from(RedBlackTree.findAll(1)(tree)), ["a", "b", "e"])

    const bigintTree = pipe(
      RedBlackTree.empty(Order.bigint),
      RedBlackTree.insert(1n, 1),
      RedBlackTree.insert(1n, 2),
      RedBlackTree.insert(1n, 3),
      RedBlackTree.insert(1n, 4),
      RedBlackTree.insert(1n, 5),
      RedBlackTree.insert(2n, 6)
    )

    deepStrictEqual(Array.from(RedBlackTree.findAll(1n)(bigintTree)), [1, 2, 3, 4, 5])
  })

  it("findAll Eq/Ord", () => {
    class Key {
      constructor(readonly n: number, readonly s: string) {}

      [Hash.symbol](): number {
        return Hash.combine(Hash.hash(this.n))(Hash.hash(this.s))
      }

      [Equal.symbol](that: unknown): boolean {
        return that instanceof Key && this.n === that.n && this.s === that.s
      }
    }

    const ord = pipe(number.Order, Order.mapInput((key: Key) => key.n))

    const tree = pipe(
      RedBlackTree.empty<Key, string>(ord),
      RedBlackTree.insert(new Key(1, "0"), "a"),
      RedBlackTree.insert(new Key(2, "0"), "c"),
      RedBlackTree.insert(new Key(1, "1"), "b"),
      RedBlackTree.insert(new Key(3, "0"), "d"),
      RedBlackTree.insert(new Key(1, "0"), "e"),
      RedBlackTree.insert(new Key(1, "0"), "f"),
      RedBlackTree.insert(new Key(1, "1"), "g")
    )

    deepStrictEqual(Array.from(RedBlackTree.values(tree)), ["g", "f", "e", "b", "a", "c", "d"])
    deepStrictEqual(Array.from(RedBlackTree.findAll(new Key(1, "0"))(tree)), ["a", "e", "f"])
    deepStrictEqual(
      Array.from(RedBlackTree.values(RedBlackTree.removeFirst(new Key(1, "1"))(tree))),
      [
        "f",
        "e",
        "b",
        "a",
        "c",
        "d"
      ]
    )
    deepStrictEqual(
      Array.from(RedBlackTree.values(RedBlackTree.removeFirst(new Key(1, "0"))(tree))),
      [
        "g",
        "f",
        "e",
        "b",
        "c",
        "d"
      ]
    )
  })

  it("Equal.symbol", () => {
    expect(
      Equal.equals(RedBlackTree.empty<number, string>(number.Order), RedBlackTree.empty<number, string>(number.Order))
    ).toBe(true)
    expect(
      Equal.equals(
        RedBlackTree.make(number.Order)([1, true], [2, true]),
        RedBlackTree.make(number.Order)([1, true], [2, true])
      )
    ).toBe(true)
  })
})
