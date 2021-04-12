import * as HM from "../../src/Collections/Immutable/HashMap"
import * as HS from "../../src/Collections/Immutable/HashSet"
import * as RB from "../../src/Collections/Immutable/RedBlackTree"
import * as SS from "../../src/Collections/Immutable/SortedSet"
import * as Equal from "../../src/Equal"
import { pipe, tuple } from "../../src/Function"
import * as Hash from "../../src/Hash"
import * as O from "../../src/Option"
import * as Ord from "../../src/Ord"
import * as St from "../../src/Structural"

describe("HashMap", () => {
  it("hashes", () => {
    expect(St.hash({ a: { b: 1 } })).toEqual(510)
    expect(St.hash({ a: { b: 2 } })).toEqual(509)
    expect(St.hash({ b: { a: 2 } })).toEqual(509)
  })
  it("use hash-map 4", () => {
    class Index {
      constructor(readonly a: number, readonly b: number) {}
    }
    class Value {
      constructor(readonly c: number, readonly d: number) {}
    }
    const eqIndex = Equal.makeEqual<Index>(
      (x, y) => x === y || (x.a === y.a && x.b === y.b)
    )
    const hashIndex = Hash.makeHash<Index>((x) => St.hashString(`${x.a}-${x.b}`))

    const makeMap = () => HM.make<Index, Value>(eqIndex, hashIndex)
    const map = pipe(
      makeMap(),
      HM.set(new Index(0, 0), new Value(0, 0)),
      HM.set(new Index(0, 0), new Value(1, 1)),
      HM.set(new Index(1, 1), new Value(2, 2)),
      HM.set(new Index(1, 1), new Value(3, 3)),
      HM.set(new Index(0, 0), new Value(4, 4)),
      HM.remove(new Index(1, 1)),
      HM.mutate((m) => {
        HM.set_(m, new Index(2, 2), new Value(5, 5))
        HM.set_(m, new Index(3, 3), new Value(6, 6))
      })
    )
    expect(HM.isEmpty(map)).toEqual(false)
    expect(HM.get_(map, new Index(0, 0))).toEqual(O.some(new Value(4, 4)))
    expect(HM.get_(map, new Index(1, 1))).toEqual(O.none)
    expect(HM.has_(map, new Index(1, 1))).toEqual(false)
    expect(HM.has_(map, new Index(0, 0))).toEqual(true)
    expect(HM.has_(map, new Index(2, 2))).toEqual(true)
    expect(HM.has_(map, new Index(3, 3))).toEqual(true)
    expect(HM.get_(map, new Index(3, 3))).toEqual(O.some(new Value(6, 6)))
    expect(Array.from(map)).toEqual([
      [new Index(0, 0), new Value(4, 4)],
      [new Index(2, 2), new Value(5, 5)],
      [new Index(3, 3), new Value(6, 6)]
    ])
    expect(HM.size(map)).toEqual(3)
    expect(Array.from(HM.keys(map))).toEqual([
      new Index(0, 0),
      new Index(2, 2),
      new Index(3, 3)
    ])
    expect(Array.from(HM.values(map))).toEqual([
      new Value(4, 4),
      new Value(5, 5),
      new Value(6, 6)
    ])
    expect(
      HM.reduceWithIndex_(
        map,
        [] as readonly (readonly [Index, Value])[],
        (z, k, v) => [...z, tuple(k, v)]
      )
    ).toEqual([
      [new Index(0, 0), new Value(4, 4)],
      [new Index(2, 2), new Value(5, 5)],
      [new Index(3, 3), new Value(6, 6)]
    ])
    expect(Array.from(HM.map_(map, (v) => v.d))).toEqual([
      [new Index(0, 0), 4],
      [new Index(2, 2), 5],
      [new Index(3, 3), 6]
    ])
    const map2 = pipe(
      map,
      HM.chainWithIndex((k, v) =>
        pipe(
          makeMap(),
          HM.set(new Index(k.a + 1, k.b + 1), new Value(v.c, v.d + 1)),
          HM.set(new Index(k.a + 6, k.b + 6), new Value(v.c + 1, v.d + 1))
        )
      )
    )
    expect(Array.from(map2)).toEqual([
      [new Index(8, 8), new Value(6, 6)],
      [new Index(4, 4), new Value(6, 7)],
      [new Index(9, 9), new Value(7, 7)],
      [new Index(1, 1), new Value(4, 5)],
      [new Index(6, 6), new Value(5, 5)],
      [new Index(3, 3), new Value(5, 6)]
    ])
    expect(HM.size(map2)).toEqual(6)
  })
  it("default", () => {
    class Index {
      constructor(readonly a: number, readonly b: number) {}
    }
    class Value {
      constructor(readonly c: number, readonly d: number) {}
    }
    const x = new Index(0, 0)
    const m = pipe(
      HM.makeDefault<Index, Value>(),
      HM.set(x, new Value(0, 1)),
      HM.set(x, new Value(0, 2))
    )
    expect(Array.from(m)).toEqual([[x, new Value(0, 2)]])
    const j = pipe(m, HM.set(new Index(0, 0), new Value(0, 3)))
    expect(Array.from(j)).toEqual([
      [x, new Value(0, 3)],
      [x, new Value(0, 2)]
    ])
    expect(HM.size(j)).toEqual(2)
  })
  it("keySet", () => {
    class Index {
      constructor(readonly a: number, readonly b: number) {}
    }
    class Value {
      constructor(readonly c: number, readonly d: number) {}
    }
    const eqIndex: Equal.Equal<Index> = {
      equals: (x, y) => x === y || (x.a === y.a && x.b === y.b)
    }
    const hashIndex: Hash.Hash<Index> = {
      hash: (x) => St.hashString(`${x.a}-${x.b}`)
    }
    const makeMap = () => HM.make<Index, Value>(eqIndex, hashIndex)
    const map = pipe(
      makeMap(),
      HM.set(new Index(0, 0), new Value(0, 0)),
      HM.set(new Index(0, 0), new Value(1, 1)),
      HM.set(new Index(1, 1), new Value(2, 2)),
      HM.set(new Index(1, 1), new Value(3, 3)),
      HM.set(new Index(0, 0), new Value(4, 4)),
      HM.remove(new Index(1, 1)),
      HM.mutate((m) => {
        HM.set_(m, new Index(2, 2), new Value(5, 5))
        HM.set_(m, new Index(3, 3), new Value(6, 6))
      })
    )
    expect(HM.size(map)).toEqual(3)
    const keys = HM.keySet(map)
    const diff = HS.difference_(keys, [new Index(2, 2)])
    expect(HS.size(diff)).toEqual(2)
    expect(Array.from(diff)).toEqual([new Index(0, 0), new Index(3, 3)])
    expect(Array.from(keys)).toEqual([
      new Index(0, 0),
      new Index(2, 2),
      new Index(3, 3)
    ])
  })
})

describe("RedBlackTree", () => {
  it("forEach", () => {
    const ordered: [number, string][] = []
    pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e"),
      RB.forEach((n, s) => {
        ordered.push([n, s])
      })
    )
    expect(ordered).toEqual([
      [-2, "d"],
      [-1, "c"],
      [0, "b"],
      [1, "a"],
      [3, "e"]
    ])
  })
  it("iterable", () => {
    const tree = pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e")
    )

    expect(RB.size(tree)).toEqual(5)

    expect(Array.from(tree)).toEqual([
      [-2, "d"],
      [-1, "c"],
      [0, "b"],
      [1, "a"],
      [3, "e"]
    ])
  })
  it("iterable empty", () => {
    const tree = RB.make<number, string>(Ord.number)

    expect(RB.size(tree)).toEqual(0)

    expect(Array.from(tree)).toEqual([])
  })
  it("backwards", () => {
    const tree = pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e")
    )
    expect(RB.size(tree)).toEqual(5)

    expect(Array.from(RB.backwards(tree))).toEqual([
      [3, "e"],
      [1, "a"],
      [0, "b"],
      [-1, "c"],
      [-2, "d"]
    ])
  })
  it("backwards empty", () => {
    const tree = RB.make<number, string>(Ord.number)

    expect(RB.size(tree)).toEqual(0)

    expect(Array.from(RB.backwards(tree))).toEqual([])
  })
  it("values", () => {
    const tree = pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e")
    )

    expect(RB.size(tree)).toEqual(5)

    expect(Array.from(RB.values_(tree))).toEqual(["d", "c", "b", "a", "e"])
  })
  it("keys", () => {
    const tree = pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e")
    )

    expect(RB.size(tree)).toEqual(5)

    expect(Array.from(RB.keys_(tree))).toEqual([-2, -1, 0, 1, 3])
  })
  it("begin/end", () => {
    const tree = pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e")
    )

    expect(RB.getFirst(tree)).toEqual(O.some([-2, "d"]))
    expect(RB.getLast(tree)).toEqual(O.some([3, "e"]))
    expect(RB.getAt_(tree, 1)).toEqual(O.some([-1, "c"]))
  })
  it("forEachGe", () => {
    const ordered: [number, string][] = []

    pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e"),
      RB.forEachGe(0, (k, v) => {
        ordered.push([k, v])
      })
    )

    expect(ordered).toEqual([
      [0, "b"],
      [1, "a"],
      [3, "e"]
    ])
  })
  it("forEachLt", () => {
    const ordered: [number, string][] = []

    pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e"),
      RB.forEachLt(0, (k, v) => {
        ordered.push([k, v])
      })
    )

    expect(ordered).toEqual([
      [-2, "d"],
      [-1, "c"]
    ])
  })
  it("forEachBetween", () => {
    const ordered: [number, string][] = []

    pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e"),
      RB.forEachBetween(-1, 2, (k, v) => {
        ordered.push([k, v])
      })
    )

    expect(ordered).toEqual([
      [-1, "c"],
      [0, "b"],
      [1, "a"]
    ])
  })
  it("ge", () => {
    const tree = pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(0, "b"),
      RB.insert(-1, "c"),
      RB.insert(-2, "d"),
      RB.insert(3, "e")
    )

    expect(Array.from(RB.ge_(tree, 0))).toEqual([
      [0, "b"],
      [1, "a"],
      [3, "e"]
    ])
    expect(Array.from(RB.ge_(tree, 0, "Backward"))).toEqual([
      [0, "b"],
      [-1, "c"],
      [-2, "d"]
    ])
  })
  it("find", () => {
    const tree = pipe(
      RB.make<number, string>(Ord.number),
      RB.insert(1, "a"),
      RB.insert(2, "c"),
      RB.insert(1, "b"),
      RB.insert(3, "d"),
      RB.insert(1, "e")
    )

    expect(RB.find_(tree, 1)).toEqual(["e", "b", "a"])
  })
  it("find Eq/Ord", () => {
    class Key {
      constructor(readonly n: number, readonly s: string) {}
    }
    const tree = pipe(
      RB.make<Key, string>(
        Ord.contramap_(Ord.number, (_) => _.n),
        Equal.struct({ n: Equal.number, s: Equal.string })
      ),
      RB.insert(new Key(1, "0"), "a"),
      RB.insert(new Key(2, "0"), "c"),
      RB.insert(new Key(1, "1"), "b"),
      RB.insert(new Key(3, "0"), "d"),
      RB.insert(new Key(1, "0"), "e"),
      RB.insert(new Key(1, "0"), "f"),
      RB.insert(new Key(1, "1"), "g")
    )
    expect(Array.from(RB.values_(tree))).toEqual(["g", "f", "e", "b", "a", "c", "d"])
    expect(RB.find_(tree, new Key(1, "0"))).toEqual(["f", "e", "a"])
    expect(
      Array.from(RB.values_(pipe(tree, RB.removeFirst(new Key(1, "1")))))
    ).toEqual(["f", "e", "b", "a", "c", "d"])
    expect(
      Array.from(RB.values_(pipe(tree, RB.removeFirst(new Key(1, "0")))))
    ).toEqual(["g", "e", "b", "a", "c", "d"])
  })
})

describe("SortedSet", () => {
  it("use sortedSet", () => {
    expect(
      pipe(
        SS.make(Ord.number),
        SS.add(2),
        SS.add(0),
        SS.add(1),
        SS.add(4),
        SS.add(0),
        SS.add(3),
        Array.from
      )
    ).toEqual([0, 1, 2, 3, 4])
  })
  it("use sortedSet with different Eq", () => {
    class Key {
      constructor(readonly n: number, readonly s: string) {}
    }
    const set = pipe(
      SS.make<Key>(
        Ord.contramap_(Ord.number, (_) => _.n),
        Equal.struct({ n: Equal.number, s: Equal.string })
      ),
      SS.add(new Key(2, "0")),
      SS.add(new Key(0, "0")),
      SS.add(new Key(1, "0")),
      SS.add(new Key(4, "0")),
      SS.add(new Key(0, "0")),
      SS.add(new Key(3, "0")),
      SS.add(new Key(0, "1"))
    )
    expect(Array.from(set)).toEqual([
      new Key(0, "1"),
      new Key(0, "0"),
      new Key(1, "0"),
      new Key(2, "0"),
      new Key(3, "0"),
      new Key(4, "0")
    ])
  })
})
