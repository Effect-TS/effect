import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "@effect/vitest/utils"
import { Array, Chunk, Duration, Either, List, Option } from "effect"
import { equals, symbol } from "effect/Equal"

const testStructuralSharing = <A>(a: List.List<A>, b: List.List<A>, n = 0): number | undefined => {
  if (a === b) {
    return n
  }
  if (List.isCons(a)) {
    return testStructuralSharing(a.tail, b, n + 1)
  }
}

describe("List", () => {
  it("is an iterable", () => {
    deepStrictEqual(Array.fromIterable(List.make(0, 1, 2, 3)), [0, 1, 2, 3])
  })

  it("isList", () => {
    assertTrue(List.isList(List.empty()))
    assertTrue(List.isList(List.make(1)))
    assertFalse(List.isList(null))
    assertFalse(List.isList({}))
  })

  it("append", () => {
    deepStrictEqual(List.append(List.make(1, 2), 3), List.make(1, 2, 3))
  })

  it("appendAll", () => {
    deepStrictEqual(List.appendAll(List.make(1, 2), List.make(3, 4)), List.make(1, 2, 3, 4))
  })

  it("drop", () => {
    deepStrictEqual(List.drop(List.make(1, 2, 3, 4), 2), List.make(3, 4))
    // out of bound
    deepStrictEqual(List.drop(List.make(1, 2), -2), List.make(1, 2))
    deepStrictEqual(List.drop(List.make(1, 2), 3), List.empty())
  })

  it("every", () => {
    assertTrue(List.every(List.empty(), (n) => n > 2))
    assertFalse(List.every(List.make(1, 2), (n) => n > 2))
    assertFalse(List.every(List.make(2, 3), (n) => n > 2))
    assertTrue(List.every(List.make(3, 4), (n) => n > 2))
  })

  it("findFirst", () => {
    const item = (a: string, b: string) => ({ a, b })
    const list = List.make(item("a1", "b1"), item("a2", "b2"), item("a3", "b2"))
    assertSome(List.findFirst(list, ({ b }) => b === "b2"), item("a2", "b2"))
    assertNone(List.findFirst(list, ({ b }) => b === "-"))
  })

  it("flatMap", () => {
    deepStrictEqual(List.flatMap(List.empty(), (n) => List.make(n - 1, n + 1)), List.empty())
    deepStrictEqual(
      List.flatMap(List.make(1, 2, 3, 4), (n) => List.make(n - 1, n + 1)),
      List.make(0, 2, 1, 3, 2, 4, 3, 5)
    )
    deepStrictEqual(List.flatMap(List.make(1, 2, 3, 4), () => List.empty()), List.empty())
  })

  it("forEach", () => {
    const as: Array<number> = []
    List.forEach(List.make(1, 2, 3, 4), (n) => as.push(n))
    deepStrictEqual(as, [1, 2, 3, 4])
  })

  it("head", () => {
    assertNone(List.head(List.empty()))
    assertSome(List.head(List.make(1, 2, 3)), 1)
  })

  it("isCons", () => {
    assertFalse(List.isCons(List.empty()))
    assertTrue(List.isCons(List.make(1)))
  })

  it("isNil", () => {
    assertTrue(List.isNil(List.nil()))
    assertFalse(List.isNil(List.make(1)))
  })

  it("map", () => {
    deepStrictEqual(List.map(List.empty(), (n) => n + 1), List.empty())
    deepStrictEqual(List.map(List.make(1, 2, 3, 4), (n) => n + 1), List.make(2, 3, 4, 5))
  })

  it("mapWithIndex", () => {
    deepStrictEqual(List.map(List.empty(), (n, i) => [i, n + 1]), List.empty())
    deepStrictEqual(List.map(List.make(1, 2, 3, 4), (n, i) => [i, n ** 2]), List.make([0, 1], [1, 4], [2, 9], [3, 16]))
  })

  it("partition", () => {
    deepStrictEqual(List.partition(List.make(1, 2, 3, 4), (n) => n > 2), [
      List.make(1, 2),
      List.make(3, 4)
    ])
  })

  it("partitionMap", () => {
    deepStrictEqual(
      List.partitionMap(List.make(1, 2, 3, 4), (n) =>
        n > 2 ?
          Either.right(n) :
          Either.left(n)),
      [List.make(1, 2), List.make(3, 4)]
    )
  })

  it("prependAll", () => {
    deepStrictEqual(List.prependAll(List.empty(), List.make(1, 2)), List.make(1, 2))
    deepStrictEqual(List.prependAll(List.make(1, 2), List.empty()), List.make(1, 2))
    deepStrictEqual(List.prependAll(List.make(3), List.make(1, 2)), List.make(1, 2, 3))
  })

  it("prependAllReversed", () => {
    deepStrictEqual(List.prependAllReversed(List.empty(), List.make(1, 2)), List.make(2, 1))
    deepStrictEqual(List.prependAllReversed(List.make(1, 2), List.empty()), List.make(1, 2))
    deepStrictEqual(List.prependAllReversed(List.make(3), List.make(1, 2)), List.make(2, 1, 3))
  })

  it("reduce", () => {
    deepStrictEqual(List.reduce(List.empty(), "-", (b, a) => b + a), "-")
    deepStrictEqual(List.reduce(List.make("a", "b", "c"), "-", (b, a) => b + a), "-abc")
  })

  it("reduceRight", () => {
    const f = (b: string, a: string) => b + a
    deepStrictEqual(List.reduceRight(List.empty(), "", f), "")
    deepStrictEqual(List.reduceRight(List.make("a", "b", "c"), "", f), "cba")
  })

  it("reverse", () => {
    deepStrictEqual(List.reverse(List.empty()), List.empty())
    deepStrictEqual(List.reverse(List.make(1, 2, 3)), List.make(3, 2, 1))
  })

  it("toChunk", () => {
    deepStrictEqual(List.toChunk(List.empty()), Chunk.empty())
    deepStrictEqual(List.toChunk(List.make(1, 2, 3)), Chunk.make(1, 2, 3))
  })

  it("toChunk", () => {
    throws(() => List.unsafeHead(List.empty()), new Error("Expected List to be non-empty"))
    deepStrictEqual(List.unsafeHead(List.make(1, 2, 3)), 1)
  })

  it("some", () => {
    assertFalse(List.some(List.empty(), (n) => n > 2))
    assertFalse(List.some(List.make(1, 2), (n) => n > 2))
    assertTrue(List.some(List.make(2, 3), (n) => n > 2))
    assertTrue(List.some(List.make(3, 4), (n) => n > 2))
  })

  it("splitAt", () => {
    deepStrictEqual(List.splitAt(List.make(1, 2, 3, 4), 2), [List.make(1, 2), List.make(3, 4)])
  })

  it("take", () => {
    deepStrictEqual(List.take(List.make(1, 2, 3, 4), 2), List.make(1, 2))
    deepStrictEqual(List.take(List.make(1, 2, 3, 4), 0), List.nil())
    deepStrictEqual(List.take(List.make(1, 2, 3, 4), -10), List.nil())
    deepStrictEqual(List.take(List.make(1, 2, 3, 4), 10), List.make(1, 2, 3, 4))
  })

  it("tail", () => {
    assertNone(List.tail(List.empty()))
    assertSome(List.tail(List.make(1, 2, 3)), List.make(2, 3))
  })

  it("unsafeLast", () => {
    throws(() => List.unsafeLast(List.empty()), new Error("Expected List to be non-empty"))
    strictEqual(List.unsafeLast(List.make(1, 2, 3, 4)), 4)
  })

  it("unsafeTail", () => {
    throws(() => List.unsafeTail(List.empty()), new Error("Expected List to be non-empty"))
    deepStrictEqual(List.unsafeTail(List.make(1, 2, 3, 4)), List.make(2, 3, 4))
  })

  it("pipe()", () => {
    deepStrictEqual(List.empty<string>().pipe(List.prepend("a")), List.make("a"))
  })

  it("toString", () => {
    strictEqual(
      String(List.empty()),
      `{
  "_id": "List",
  "_tag": "Nil"
}`
    )
    strictEqual(
      String(List.make(0, 1, 2)),
      `{
  "_id": "List",
  "_tag": "Cons",
  "values": [
    0,
    1,
    2
  ]
}`
    )
  })

  it("toJSON", () => {
    deepStrictEqual(List.empty().toJSON(), { _id: "List", _tag: "Nil" })
    deepStrictEqual(List.make(0, 1, 2).toJSON(), { _id: "List", _tag: "Cons", values: [0, 1, 2] })
    deepStrictEqual(List.make(0, 1, List.empty()).toJSON(), {
      _id: "List",
      _tag: "Cons",
      values: [0, 1, { _id: "List", _tag: "Nil" }]
    })
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inspect } = require("node:util")
    deepStrictEqual(inspect(List.empty()), inspect({ _id: "List", _tag: "Nil" }))
    deepStrictEqual(inspect(List.make(0, 1, 2)), inspect({ _id: "List", _tag: "Cons", values: [0, 1, 2] }))
  })

  it("equals", () => {
    assertTrue(List.empty()[symbol](List.empty()))
    assertTrue(List.make(0)[symbol](List.make(0)))
    assertFalse(List.empty()[symbol](Duration.millis(1)))
    assertFalse(List.make(0)[symbol](Duration.millis(1)))

    assertTrue(equals(List.empty(), List.empty()))
    assertTrue(equals(List.make(0), List.make(0)))
    assertFalse(equals(List.empty(), Duration.millis(1)))
    assertFalse(equals(List.make(0), Duration.millis(1)))
  })

  it("to iterable", () => {
    deepStrictEqual(Array.fromIterable(List.empty()), [])
    deepStrictEqual(Array.fromIterable(List.make(1, 2, 3)), [1, 2, 3])
  })

  it("fromIterable", () => {
    deepStrictEqual(List.fromIterable([]), List.empty())
    deepStrictEqual(List.fromIterable([1, 2, 3]), List.make(1, 2, 3))
  })

  it(".pipe", () => {
    deepStrictEqual(List.empty().pipe(List.prepend(1)), List.make(1))
    deepStrictEqual(List.make(2).pipe(List.prepend(1)), List.make(1, 2))
  })

  it("getEquivalence", () => {
    const equivalence = List.getEquivalence(equals)
    assertTrue(equivalence(List.empty(), List.empty()))
    assertFalse(equivalence(List.empty(), List.of(1)))
    assertFalse(equivalence(List.of(1), List.empty()))
    assertFalse(equivalence(List.of(1), List.of("a")))
    assertFalse(equivalence(List.make(1, 2, 3), List.make(1, 2)))
    assertFalse(equivalence(List.make(1, 2), List.make(1, 2, 3)))
  })

  it("compact", () => {
    deepStrictEqual(List.compact(List.empty()), List.empty())
    deepStrictEqual(List.compact(List.make(Option.some(1), Option.some(2), Option.some(3))), List.make(1, 2, 3))
    deepStrictEqual(List.compact(List.make(Option.some(1), Option.none(), Option.some(3))), List.make(1, 3))
  })

  it("last", () => {
    assertNone(List.last(List.empty()))
    assertSome(List.last(List.make(1, 2, 3)), 3)
  })

  it("filter", () => {
    const isEven = (n: number) => n % 2 === 0
    strictEqual(testStructuralSharing(List.filter(List.empty(), isEven), List.empty()), 0)

    const share1 = List.of(2)
    const input1 = List.cons(1, share1) // 1, 2
    const r1 = List.filter(input1, isEven)
    deepStrictEqual(r1, List.make(2))
    strictEqual(testStructuralSharing(r1, share1), 0)

    const share2 = List.make(2, 4)
    const input2 = List.cons(1, share2) // 1, 2, 4
    const r2 = List.filter(input2, isEven)
    deepStrictEqual(r2, List.make(2, 4))
    strictEqual(testStructuralSharing(r2, share2), 0)

    const input3 = List.cons(4, List.cons(3, share1)) // 4, 3, 2
    const r3 = List.filter(input3, isEven)
    deepStrictEqual(r3, List.make(4, 2))
    strictEqual(testStructuralSharing(r3, share1), 1)

    deepStrictEqual(List.filter(List.make(2, 4, 1), isEven), List.make(2, 4))
    deepStrictEqual(List.filter(List.make(2, 4, 1, 3), isEven), List.make(2, 4))
    deepStrictEqual(List.filter(List.make(2, 4, 1, 6, 3), isEven), List.make(2, 4, 6))
    const share3 = List.of(6)
    const r4 = List.filter(List.appendAll(List.make(2, 4, 1, 3), share3), isEven)
    deepStrictEqual(r4, List.make(2, 4, 6))
    strictEqual(testStructuralSharing(r4, share3), 2)
    const r5 = List.filter(List.appendAll(List.make(2, 4, 1), share3), isEven)
    deepStrictEqual(r5, List.make(2, 4, 6))
    strictEqual(testStructuralSharing(r5, share3), 2)
  })

  it("toArray", () => {
    deepStrictEqual(List.toArray(List.empty()), [])
    deepStrictEqual(List.toArray(List.make(1, 2, 3)), [1, 2, 3])
  })
})
