import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Either from "effect/Either"
import { equals, symbol } from "effect/Equal"
import * as List from "effect/List"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import { inspect } from "node:util"
import { describe, expect, it } from "vitest"

const testStructuralSharing = <A>(a: List.List<A>, b: List.List<A>, n = 0): number | undefined => {
  if (a === b) {
    return n
  }
  if (List.isCons(a)) {
    return testStructuralSharing(a.tail, b, n + 1)
  }
}

describe.concurrent("List", () => {
  it("exports", () => {
    expect(List.cons).exist
    expect(List.size).exist
    expect(List.filter).exist
    expect(List.filterMap).exist
    expect(List.appendAllNonEmpty).exist
    expect(List.prependAllNonEmpty).exist
  })

  it("is an iterable", () => {
    expect(Array.from(List.make(0, 1, 2, 3))).toEqual([0, 1, 2, 3])
  })

  it("isList", () => {
    expect(List.isList(List.empty())).toEqual(true)
    expect(List.isList(List.make(1))).toEqual(true)
    expect(List.isList(null)).toEqual(false)
    expect(List.isList({})).toEqual(false)
  })

  it("append", () => {
    expect(List.append(List.make(1, 2), 3)).toEqual(List.make(1, 2, 3))
  })

  it("appendAll", () => {
    expect(List.appendAll(List.make(1, 2), List.make(3, 4))).toEqual(List.make(1, 2, 3, 4))
  })

  it("drop", () => {
    expect(List.drop(List.make(1, 2, 3, 4), 2)).toEqual(List.make(3, 4))
    // out of bound
    expect(List.drop(List.make(1, 2), -2)).toEqual(List.make(1, 2))
    expect(List.drop(List.make(1, 2), 3)).toEqual(List.empty())
  })

  it("every", () => {
    expect(List.every(List.empty(), (n) => n > 2)).toEqual(true)
    expect(List.every(List.make(1, 2), (n) => n > 2)).toEqual(false)
    expect(List.every(List.make(2, 3), (n) => n > 2)).toEqual(false)
    expect(List.every(List.make(3, 4), (n) => n > 2)).toEqual(true)
  })

  it("findFirst", () => {
    const item = (a: string, b: string) => ({ a, b })
    const list = List.make(item("a1", "b1"), item("a2", "b2"), item("a3", "b2"))
    expect(List.findFirst(list, ({ b }) => b === "b2")).toEqual(Option.some(item("a2", "b2")))
    expect(List.findFirst(list, ({ b }) => b === "-")).toEqual(Option.none())
  })

  it("flatMap", () => {
    expect(List.flatMap(List.empty(), (n) => List.make(n - 1, n + 1))).toEqual(
      List.empty()
    )
    expect(List.flatMap(List.make(1, 2, 3, 4), (n) => List.make(n - 1, n + 1))).toEqual(
      List.make(0, 2, 1, 3, 2, 4, 3, 5)
    )
    expect(List.flatMap(List.make(1, 2, 3, 4), () => List.empty())).toEqual(
      List.empty()
    )
  })

  it("flatMapNonEmpty", () => {
    expect(List.flatMapNonEmpty(List.make(1, 2, 3, 4), (n) => List.make(n - 1, n + 1))).toEqual(
      List.make(0, 2, 1, 3, 2, 4, 3, 5)
    )
  })

  it("forEach", () => {
    const as: Array<number> = []
    List.forEach(List.make(1, 2, 3, 4), (n) => as.push(n))
    expect(as).toEqual([1, 2, 3, 4])
  })

  it("head", () => {
    expect(List.head(List.empty())).toEqual(Option.none())
    expect(List.head(List.make(1, 2, 3))).toEqual(Option.some(1))
  })

  it("isCons", () => {
    expect(List.isCons(List.empty())).toBe(false)
    expect(List.isCons(List.make(1))).toBe(true)
  })

  it("isNil", () => {
    expect(List.isNil(List.nil())).toBe(true)
    expect(List.isNil(List.make(1))).toBe(false)
  })

  it("map", () => {
    expect(List.map(List.empty(), (n) => n + 1)).toEqual(List.empty())
    expect(List.map(List.make(1, 2, 3, 4), (n) => n + 1)).toEqual(List.make(2, 3, 4, 5))
  })

  it("mapWithIndex", () => {
    expect(List.map(List.empty(), (n, i) => [i, n + 1])).toEqual(List.empty())
    expect(List.map(List.make(1, 2, 3, 4), (n, i) => [i, n ** 2])).toEqual(List.make([0, 1], [1, 4], [2, 9], [3, 16]))
  })

  it("partition", () => {
    expect(List.partition(List.make(1, 2, 3, 4), (n) => n > 2)).toEqual([
      List.make(1, 2),
      List.make(3, 4)
    ])
  })

  it("partitionMap", () => {
    expect(List.partitionMap(List.make(1, 2, 3, 4), (n) =>
      n > 2 ?
        Either.right(n) :
        Either.left(n))).toEqual([List.make(1, 2), List.make(3, 4)])
  })

  it("prependAll", () => {
    expect(List.prependAll(List.empty(), List.make(1, 2))).toEqual(List.make(1, 2))
    expect(List.prependAll(List.make(1, 2), List.empty())).toEqual(List.make(1, 2))
    expect(List.prependAll(List.make(3), List.make(1, 2))).toEqual(List.make(1, 2, 3))
  })

  it("prependAllReversed", () => {
    expect(List.prependAllReversed(List.empty(), List.make(1, 2))).toEqual(List.make(2, 1))
    expect(List.prependAllReversed(List.make(1, 2), List.empty())).toEqual(List.make(1, 2))
    expect(List.prependAllReversed(List.make(3), List.make(1, 2))).toEqual(List.make(2, 1, 3))
  })

  it("reduce", () => {
    expect(List.reduce(List.empty(), "-", (b, a) => b + a)).toEqual("-")
    expect(List.reduce(List.make("a", "b", "c"), "-", (b, a) => b + a)).toEqual("-abc")
  })

  it("reduceRight", () => {
    const f = (b: string, a: string) => b + a
    expect(List.reduceRight(List.empty(), "", f)).toEqual("")
    expect(List.reduceRight(List.make("a", "b", "c"), "", f)).toEqual("cba")
  })

  it("reverse", () => {
    expect(List.reverse(List.empty())).toEqual(List.empty())
    expect(List.reverse(List.make(1, 2, 3))).toEqual(List.make(3, 2, 1))
  })

  it("toChunk", () => {
    expect(List.toChunk(List.empty())).toEqual(Chunk.empty())
    expect(List.toChunk(List.make(1, 2, 3))).toEqual(Chunk.make(1, 2, 3))
  })

  it("toChunk", () => {
    expect(() => List.unsafeHead(List.empty())).toThrowError(new Error("Expected List to be non-empty"))
    expect(List.unsafeHead(List.make(1, 2, 3))).toEqual(1)
  })

  it("some", () => {
    expect(List.some(List.empty(), (n) => n > 2)).toEqual(false)
    expect(List.some(List.make(1, 2), (n) => n > 2)).toEqual(false)
    expect(List.some(List.make(2, 3), (n) => n > 2)).toEqual(true)
    expect(List.some(List.make(3, 4), (n) => n > 2)).toEqual(true)
  })

  it("splitAt", () => {
    expect(List.splitAt(List.make(1, 2, 3, 4), 2)).toEqual([List.make(1, 2), List.make(3, 4)])
  })

  it("take", () => {
    expect(List.take(List.make(1, 2, 3, 4), 2)).toEqual(List.make(1, 2))
    expect(List.take(List.make(1, 2, 3, 4), 0)).toEqual(List.nil())
    expect(List.take(List.make(1, 2, 3, 4), -10)).toEqual(List.nil())
    expect(List.take(List.make(1, 2, 3, 4), 10)).toEqual(List.make(1, 2, 3, 4))
  })

  it("tail", () => {
    expect(List.tail(List.empty())).toEqual(Option.none())
    expect(List.tail(List.make(1, 2, 3))).toEqual(Option.some(List.make(2, 3)))
  })

  it("unsafeLast", () => {
    expect(() => List.unsafeLast(List.empty())).toThrowError(
      new Error("Expected List to be non-empty")
    )
    expect(List.unsafeLast(List.make(1, 2, 3, 4))).toEqual(4)
  })

  it("unsafeTail", () => {
    expect(() => List.unsafeTail(List.empty())).toThrowError(
      new Error("Expected List to be non-empty")
    )
    expect(List.unsafeTail(List.make(1, 2, 3, 4))).toEqual(List.make(2, 3, 4))
  })

  it("pipe()", () => {
    expect(List.empty<string>().pipe(List.prepend("a"))).toEqual(List.make("a"))
  })

  it("toString", () => {
    expect(String(List.empty())).toEqual(`{
  "_id": "List",
  "_tag": "Nil"
}`)
    expect(String(List.make(0, 1, 2))).toEqual(`{
  "_id": "List",
  "_tag": "Cons",
  "values": [
    0,
    1,
    2
  ]
}`)
  })

  it("toJSON", () => {
    expect(List.empty().toJSON()).toEqual(
      { _id: "List", _tag: "Nil" }
    )
    expect(List.make(0, 1, 2).toJSON()).toEqual(
      { _id: "List", _tag: "Cons", values: [0, 1, 2] }
    )
    expect(List.make(0, 1, List.empty()).toJSON()).toEqual(
      { _id: "List", _tag: "Cons", values: [0, 1, { _id: "List", _tag: "Nil" }] }
    )
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    expect(inspect(List.empty())).toEqual(inspect({ _id: "List", _tag: "Nil" }))
    expect(inspect(List.make(0, 1, 2))).toEqual(inspect({ _id: "List", _tag: "Cons", values: [0, 1, 2] }))
  })

  it("equals", () => {
    expect(List.empty()[symbol](List.empty())).toEqual(true)
    expect(List.make(0)[symbol](List.make(0))).toEqual(true)
    expect(List.empty()[symbol](Duration.millis(1))).toEqual(false)
    expect(List.make(0)[symbol](Duration.millis(1))).toEqual(false)

    expect(equals(List.empty(), List.empty())).toEqual(true)
    expect(equals(List.make(0), List.make(0))).toEqual(true)
    expect(equals(List.empty(), Duration.millis(1))).toEqual(false)
    expect(equals(List.make(0), Duration.millis(1))).toEqual(false)
  })

  it("to iterable", () => {
    expect(ReadonlyArray.fromIterable(List.empty())).toEqual([])
    expect(ReadonlyArray.fromIterable(List.make(1, 2, 3))).toEqual([1, 2, 3])
  })

  it("fromIterable", () => {
    expect(List.fromIterable([])).toEqual(List.empty())
    expect(List.fromIterable([1, 2, 3])).toEqual(List.make(1, 2, 3))
  })

  it(".pipe", () => {
    expect(List.empty().pipe(List.prepend(1))).toEqual(List.make(1))
    expect(List.make(2).pipe(List.prepend(1))).toEqual(List.make(1, 2))
  })

  it("getEquivalence", () => {
    const equivalence = List.getEquivalence(equals)
    expect(equivalence(List.empty(), List.empty())).toEqual(true)
    expect(equivalence(List.empty(), List.of(1))).toEqual(false)
    expect(equivalence(List.of(1), List.empty())).toEqual(false)
    expect(equivalence(List.of(1), List.of("a"))).toEqual(false)
    expect(equivalence(List.make(1, 2, 3), List.make(1, 2))).toEqual(false)
    expect(equivalence(List.make(1, 2), List.make(1, 2, 3))).toEqual(false)
  })

  it("compact", () => {
    expect(List.compact(List.empty())).toEqual(List.empty())
    expect(List.compact(List.make(Option.some(1), Option.some(2), Option.some(3)))).toEqual(List.make(1, 2, 3))
    expect(List.compact(List.make(Option.some(1), Option.none(), Option.some(3)))).toEqual(List.make(1, 3))
  })

  it("last", () => {
    expect(List.last(List.empty())).toEqual(Option.none())
    expect(List.last(List.make(1, 2, 3))).toEqual(Option.some(3))
  })

  it("filter", () => {
    const isEven = (n: number) => n % 2 === 0
    expect(testStructuralSharing(List.filter(List.empty(), isEven), List.empty())).toBe(0)

    const share1 = List.of(2)
    const input1 = List.cons(1, share1) // 1, 2
    const r1 = List.filter(input1, isEven)
    expect(r1).toEqual(List.make(2))
    expect(testStructuralSharing(r1, share1)).toBe(0)

    const share2 = List.make(2, 4)
    const input2 = List.cons(1, share2) // 1, 2, 4
    const r2 = List.filter(input2, isEven)
    expect(r2).toEqual(List.make(2, 4))
    expect(testStructuralSharing(r2, share2)).toBe(0)

    const input3 = List.cons(4, List.cons(3, share1)) // 4, 3, 2
    const r3 = List.filter(input3, isEven)
    expect(r3).toEqual(List.make(4, 2))
    expect(testStructuralSharing(r3, share1)).toBe(1)

    expect(List.filter(List.make(2, 4, 1), isEven)).toEqual(List.make(2, 4))
    expect(List.filter(List.make(2, 4, 1, 3), isEven)).toEqual(List.make(2, 4))
    expect(List.filter(List.make(2, 4, 1, 6, 3), isEven)).toEqual(List.make(2, 4, 6))
    const share3 = List.of(6)
    const r4 = List.filter(List.appendAll(List.make(2, 4, 1, 3), share3), isEven)
    expect(r4).toEqual(List.make(2, 4, 6))
    expect(testStructuralSharing(r4, share3)).toBe(2)
    const r5 = List.filter(List.appendAll(List.make(2, 4, 1), share3), isEven)
    expect(r5).toEqual(List.make(2, 4, 6))
    expect(testStructuralSharing(r5, share3)).toBe(2)
  })

  it("toArray", () => {
    expect(List.toArray(List.empty())).toStrictEqual([])
    expect(List.toArray(List.make(1, 2, 3))).toStrictEqual([1, 2, 3])
  })
})
