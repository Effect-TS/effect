import { describe, it } from "@effect/vitest"
import { Equal, Hash, MutableHashMap as HM, Option, pipe } from "effect"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual, strictEqual } from "effect/test/util"

class Key implements Equal.Equal {
  constructor(readonly a: number, readonly b: number) {}

  [Hash.symbol]() {
    return Hash.hash(`${this.a}-${this.b}`)
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof Key && this.a === that.a && this.b === that.b
  }
}

class Value implements Equal.Equal {
  constructor(readonly c: number, readonly d: number) {}

  [Hash.symbol]() {
    return Hash.hash(`${this.c}-${this.d}`)
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof Value && this.c === that.c && this.d === that.d
  }
}

function key(a: number, b: number): Key {
  return new Key(a, b)
}

function value(c: number, d: number): Value {
  return new Value(c, d)
}

describe("MutableHashMap", () => {
  it("toString", () => {
    const map = HM.make(
      [0, "a"],
      [1, "b"]
    )

    strictEqual(
      String(map),
      `{
  "_id": "MutableHashMap",
  "values": [
    [
      0,
      "a"
    ],
    [
      1,
      "b"
    ]
  ]
}`
    )
  })

  it("toJSON", () => {
    const map = HM.make(
      [0, "a"],
      [1, "b"]
    )

    deepStrictEqual(map.toJSON(), { _id: "MutableHashMap", values: [[0, "a"], [1, "b"]] })
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { inspect } = require("node:util")

    const map = HM.make(
      [0, "a"],
      [1, "b"]
    )

    deepStrictEqual(inspect(map), inspect({ _id: "MutableHashMap", values: [[0, "a"], [1, "b"]] }))
  })

  it("make", () => {
    const map = HM.make(
      [key(0, 0), value(0, 0)],
      [key(1, 1), value(1, 1)]
    )

    strictEqual(HM.size(map), 2)
    assertTrue(pipe(map, HM.has(key(0, 0))))
    assertTrue(pipe(map, HM.has(key(1, 1))))
  })

  it("fromIterable", () => {
    const map = HM.fromIterable([
      [key(0, 0), value(0, 0)],
      [key(1, 1), value(1, 1)]
    ])

    strictEqual(HM.size(map), 2)
    assertTrue(pipe(map, HM.has(key(0, 0))))
    assertTrue(pipe(map, HM.has(key(1, 1))))
  })

  it("iterate", () => {
    class Hello {
      [Hash.symbol]() {
        return 0
      }

      [Equal.symbol](that: unknown) {
        return this === that
      }
    }

    const a = new Hello()
    const b = new Hello()

    const map = HM.make(
      [a, 0],
      [b, 0]
    )

    strictEqual(Array.from(map).length, 2)
  })

  it("get", () => {
    const map = pipe(
      HM.empty<Key, Value>(),
      HM.set(key(0, 0), value(0, 0)),
      HM.set(key(0, 0), value(1, 1))
    )

    const result = pipe(
      map,
      HM.get(key(0, 0))
    )

    assertSome(result, value(1, 1))
  })

  it("has", () => {
    const map = HM.make(
      [key(0, 0), value(0, 0)],
      [key(0, 0), value(1, 1)],
      [key(1, 1), value(2, 2)],
      [key(1, 1), value(3, 3)],
      [key(0, 0), value(4, 4)]
    )

    pipe(
      map,
      HM.has(key(0, 0)),
      assertTrue
    )

    pipe(
      map,
      HM.has(key(1, 1)),
      assertTrue
    )

    pipe(
      map,
      HM.has(key(4, 4)),
      assertFalse
    )
  })

  it("keys", () => {
    const map = pipe(
      HM.empty<Key, Value>(),
      HM.set(key(0, 0), value(0, 0)),
      HM.set(key(1, 1), value(1, 1))
    )

    deepStrictEqual(HM.keys(map), [
      key(0, 0),
      key(1, 1)
    ])
  })

  it("modifyAt", () => {
    const map = pipe(
      HM.empty<Key, Value>(),
      HM.set(key(0, 0), value(0, 0)),
      HM.set(key(1, 1), value(1, 1))
    )

    pipe(
      map,
      HM.modifyAt(
        key(0, 0),
        () => Option.some(value(0, 1))
      )
    )

    strictEqual(HM.size(map), 2)
    assertSome(pipe(map, HM.get(key(0, 0))), value(0, 1))

    pipe(
      map,
      HM.modifyAt(
        key(2, 2),
        Option.match({
          onNone: () => Option.some(value(2, 2)),
          onSome: Option.some
        })
      )
    )

    strictEqual(HM.size(map), 3)
    assertSome(pipe(map, HM.get(key(2, 2))), value(2, 2))

    pipe(
      map,
      HM.modifyAt(
        key(2, 2),
        () => Option.none()
      )
    )

    strictEqual(HM.size(map), 2)
  })

  it("remove", () => {
    const map = pipe(
      HM.empty<Key, Value>(),
      HM.set(key(0, 0), value(0, 0)),
      HM.set(key(1, 1), value(1, 1))
    )

    strictEqual(HM.size(map), 2)

    pipe(
      map,
      HM.has(key(1, 1)),
      assertTrue
    )

    pipe(
      map,
      HM.remove(key(1, 1))
    )

    strictEqual(HM.size(map), 1)

    pipe(
      map,
      HM.has(key(1, 1)),
      assertFalse
    )
  })

  it("set", () => {
    const map = pipe(
      HM.empty<Key, Value>(),
      HM.set(key(0, 0), value(0, 0)),
      HM.set(key(0, 0), value(1, 1)),
      HM.set(key(1, 1), value(2, 2)),
      HM.set(key(1, 1), value(3, 3)),
      HM.set(key(0, 0), value(4, 4))
    )

    deepStrictEqual(Array.from(map), [
      [key(0, 0), value(4, 4)],
      [key(1, 1), value(3, 3)]
    ])
  })

  it("size", () => {
    const map = pipe(
      HM.empty<Key, Value>(),
      HM.set(key(0, 0), value(0, 0)),
      HM.set(key(0, 0), value(1, 1)),
      HM.set(key(1, 1), value(2, 2)),
      HM.set(key(1, 1), value(3, 3)),
      HM.set(key(0, 0), value(4, 4))
    )

    strictEqual(HM.size(map), 2)
  })

  it("modify", () => {
    const map = pipe(
      HM.empty<Key, Value>(),
      HM.set(key(0, 0), value(0, 0)),
      HM.set(key(1, 1), value(1, 1))
    )

    pipe(
      map,
      HM.modify(key(0, 0), (v) => value(v.c + 1, v.d + 1))
    )

    assertSome(pipe(map, HM.get(key(0, 0))), value(1, 1))

    pipe(
      map,
      HM.modify(key(1, 1), (v) => value(v.c + 1, v.d + 1))
    )

    assertNone(pipe(
      map,
      HM.remove(key(0, 0)),
      HM.get(key(0, 0))
    ))
  })

  it("pipe()", () => {
    deepStrictEqual(HM.empty<string, string>().pipe(HM.set("key", "value")), HM.make(["key", "value"]))
  })
})
