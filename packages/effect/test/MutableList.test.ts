import { assert, describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { MutableList } from "effect"

describe("MutableList", () => {
  it("preserves a prepended element when appending to the list", () => {
    const list = MutableList.make<number>()
    MutableList.prepend(list, 1)
    MutableList.append(list, 2)

    strictEqual(MutableList.toArray(list).join(","), "1,2")
    strictEqual(list.length, 2)
  })

  describe("nonempty bulk prepend followed by append", () => {
    const inputs = [
      { name: "array singleton", values: [1], make: () => Object.freeze([1]) },
      { name: "array multiple", values: [1, 2], make: () => Object.freeze([1, 2]) },
      {
        name: "generator singleton",
        values: [1],
        make: function*() {
          yield 1
        }
      },
      {
        name: "generator multiple",
        values: [1, 2],
        make: function*() {
          yield 1
          yield 2
        }
      }
    ]

    for (const input of inputs) {
      for (const state of ["fresh", "drained before", "nonempty", "drained after prepend"]) {
        for (const consumer of ["append", "appendAll"]) {
          it(`${input.name}; ${state}; ${consumer}`, () => {
            const list = MutableList.make<number>()
            if (state === "nonempty") MutableList.append(list, 9)
            if (state === "drained before") {
              MutableList.append(list, 9)
              assert.strictEqual(MutableList.take(list), 9)
              assert.strictEqual(list.length, 0)
            }

            MutableList.prependAll(list, input.make())
            const prepended = [...input.values, ...(state === "nonempty" ? [9] : [])]
            assert.deepStrictEqual(MutableList.toArray(list), prepended)
            assert.strictEqual(list.length, prepended.length)

            let expected = [...prepended, 2]
            if (state === "drained after prepend") {
              assert.deepStrictEqual(MutableList.takeAll(list), prepended)
              assert.strictEqual(MutableList.take(list), MutableList.Empty)
              expected = [2]
            }
            if (consumer === "append") {
              MutableList.append(list, 2)
            } else {
              assert.strictEqual(MutableList.appendAll(list, [2]), 1)
            }

            assert.deepStrictEqual(MutableList.toArray(list), expected)
            assert.strictEqual(list.length, expected.length)
            for (const [index, value] of expected.entries()) {
              assert.strictEqual(MutableList.take(list), value)
              assert.strictEqual(list.length, expected.length - index - 1)
            }
            assert.strictEqual(MutableList.take(list), MutableList.Empty)
            assert.strictEqual(list.length, 0)
          })
        }
      }
    }

    for (const input of inputs.filter((input) => input.values.length === 1)) {
      it(`takes the prepended value before the appended value; ${input.name}`, () => {
        const list = MutableList.make<number>()
        MutableList.prependAll(list, input.make())
        MutableList.append(list, 2)

        assert.strictEqual(MutableList.take(list), 1)
        assert.strictEqual(list.length, 1)
        assert.strictEqual(MutableList.take(list), 2)
        assert.strictEqual(list.length, 0)
        assert.strictEqual(MutableList.take(list), MutableList.Empty)
      })
    }

    for (const mutable of [false, true]) {
      for (const consumer of ["append", "appendAll"]) {
        it(`prependAllUnsafe; mutable=${mutable}; ${consumer}`, () => {
          const list = MutableList.make<number>()
          // Transfer ownership when mutable=true; never access the input afterward.
          MutableList.prependAllUnsafe(list, [1], mutable)
          if (consumer === "append") {
            MutableList.append(list, 2)
          } else {
            assert.strictEqual(MutableList.appendAll(list, [2]), 1)
          }

          assert.deepStrictEqual(MutableList.toArray(list), [1, 2])
          assert.strictEqual(list.length, 2)
          assert.strictEqual(MutableList.take(list), 1)
          assert.strictEqual(MutableList.take(list), 2)
          assert.strictEqual(list.length, 0)
          assert.strictEqual(MutableList.take(list), MutableList.Empty)
        })
      }
    }
  })

  describe("bulk prepend boundaries", () => {
    const inputs: Array<{
      name: string
      prepend: (list: MutableList.MutableList<number>, values: ReadonlyArray<number>) => void
    }> = [
      { name: "array", prepend: (list, values) => MutableList.prependAll(list, values) },
      { name: "frozen array", prepend: (list, values) => MutableList.prependAll(list, Object.freeze([...values])) },
      {
        name: "generator",
        prepend: (list, values) =>
          MutableList.prependAll(
            list,
            (function*() {
              yield* values
            })()
          )
      },
      { name: "unsafe immutable", prepend: (list, values) => MutableList.prependAllUnsafe(list, values, false) },
      // Each copy is transferred without any subsequent caller access.
      { name: "unsafe mutable", prepend: (list, values) => MutableList.prependAllUnsafe(list, [...values], true) }
    ]

    for (const input of inputs) {
      for (const state of ["fresh", "drained"]) {
        for (const repeats of [1, 2]) {
          it(`empty; ${input.name}; ${state}; repeats=${repeats}`, () => {
            const list = MutableList.make<number>()
            if (state === "drained") {
              MutableList.append(list, 9)
              assert.strictEqual(MutableList.take(list), 9)
              assert.strictEqual(list.length, 0)
            }
            for (let i = 0; i < repeats; i++) input.prepend(list, [])
            MutableList.append(list, 1)

            assert.deepStrictEqual(MutableList.toArray(list), [1])
            assert.strictEqual(list.length, 1)
            assert.strictEqual(MutableList.take(list), 1)
            assert.strictEqual(list.length, 0)
            assert.strictEqual(MutableList.take(list), MutableList.Empty)
            assert.strictEqual(list.length, 0)
          })
        }
      }

      for (const consumer of ["append", "appendAll"]) {
        it(`repeated nonempty; ${input.name}; ${consumer}`, () => {
          const list = MutableList.make<number>()
          const first = [2, 3]
          const second = [1]
          input.prepend(list, first)
          input.prepend(list, second)
          if (consumer === "append") {
            MutableList.append(list, 4)
          } else {
            assert.strictEqual(MutableList.appendAll(list, [4]), 1)
          }

          assert.deepStrictEqual(MutableList.toArray(list), [1, 2, 3, 4])
          assert.strictEqual(list.length, 4)
          for (const value of [1, 2, 3, 4]) {
            assert.strictEqual(MutableList.take(list), value)
            assert.strictEqual(list.length, 4 - value)
          }
          assert.strictEqual(MutableList.take(list), MutableList.Empty)
          assert.strictEqual(list.length, 0)
          assert.deepStrictEqual(first, [2, 3])
          assert.deepStrictEqual(second, [1])
        })
      }
    }
  })

  it("returns an empty snapshot for a negative bound", () => {
    const list = MutableList.make<number>()
    MutableList.append(list, 1)

    deepStrictEqual(MutableList.toArrayN(list, -1), [])
  })

  it("normalizes bounded operation counts", () => {
    const takeNaN = MutableList.make<number>()
    MutableList.appendAll(takeNaN, [1, 2, 3])
    deepStrictEqual(MutableList.takeN(takeNaN, Number.NaN), [])
    deepStrictEqual(MutableList.toArray(takeNaN), [1, 2, 3])

    const takeFraction = MutableList.make<number>()
    MutableList.appendAll(takeFraction, [1, 2, 3])
    deepStrictEqual(MutableList.takeN(takeFraction, 1.9), [1])
    deepStrictEqual(MutableList.toArray(takeFraction), [2, 3])

    const discardNaN = MutableList.make<number>()
    MutableList.appendAll(discardNaN, [1, 2, 3])
    MutableList.takeNVoid(discardNaN, Number.NaN)
    deepStrictEqual(MutableList.toArray(discardNaN), [1, 2, 3])

    const discardFraction = MutableList.make<number>()
    MutableList.appendAll(discardFraction, [1, 2, 3])
    MutableList.takeNVoid(discardFraction, 1.9)
    deepStrictEqual(MutableList.toArray(discardFraction), [2, 3])

    const snapshot = MutableList.make<number>()
    MutableList.appendAll(snapshot, [1, 2, 3])
    deepStrictEqual(MutableList.toArrayN(snapshot, Number.NaN), [])
    deepStrictEqual(MutableList.toArrayN(snapshot, 1.9), [1])
  })

  it("appendAll returns 0 and leaves an empty list empty", () => {
    const list = MutableList.make<number>()

    strictEqual(MutableList.appendAll(list, []), 0)
    strictEqual(list.length, 0)
    strictEqual(list.head, undefined)
    strictEqual(list.tail, undefined)
    strictEqual(MutableList.take(list), MutableList.Empty)
  })

  it("appendAll with empty iterables preserves later append order", () => {
    const list = MutableList.make<number>()

    MutableList.appendAll(list, [])
    MutableList.append(list, 1)
    MutableList.appendAll(list, [])
    MutableList.append(list, 2)

    deepStrictEqual(MutableList.takeAll(list), [1, 2])
    strictEqual(MutableList.take(list), MutableList.Empty)
  })

  it("appendAllUnsafe with an empty array is a no-op", () => {
    const list = MutableList.make<number>()

    MutableList.appendAll(list, [1])
    strictEqual(MutableList.appendAllUnsafe(list, []), 0)
    MutableList.append(list, 2)

    deepStrictEqual(MutableList.takeAll(list), [1, 2])
    strictEqual(MutableList.take(list), MutableList.Empty)
  })

  it("filter keeps matching values in place and updates length", () => {
    const list = MutableList.make<number>()
    MutableList.appendAll(list, [1, 2, 3, 4, 5])

    MutableList.filter(list, (n) => n % 2 === 0)

    deepStrictEqual(MutableList.toArrayN(list, 2), [2, 4])
    strictEqual(list.length, 2)
  })

  it("filter restores the empty list state when no values match", () => {
    const list = MutableList.make<number>()
    MutableList.append(list, 1)

    MutableList.filter(list, () => false)

    strictEqual(list.length, 0)
    strictEqual(list.head, undefined)
    strictEqual(list.tail, undefined)
    strictEqual(MutableList.take(list), MutableList.Empty)
  })

  it("remove deletes all strictly equal values and updates length", () => {
    const list = MutableList.make<string>()
    MutableList.appendAll(list, ["apple", "banana", "apple", "cherry", "apple"])

    MutableList.remove(list, "apple")

    deepStrictEqual(MutableList.toArrayN(list, 2), ["banana", "cherry"])
    strictEqual(list.length, 2)
  })
})
