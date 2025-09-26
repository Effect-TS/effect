import * as List from "@effect-native/patterns/List"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"

describe("List", () => {
  it("roundtrips iterable input", () => {
    const list = List.fromIterable(["a", "b", "c"])

    assert.isTrue(List.isList(list))
    assert.strictEqual(list.size, 3)
    assert.deepStrictEqual(List.toArray(list), ["a", "b", "c"])
  })

  it("cons supports data-first and data-last usage", () => {
    const base = List.fromIterable([2, 3])

    const dataFirst = List.cons(base, 1)
    const dataLast = List.cons(0)(base)

    assert.deepStrictEqual(List.toArray(dataFirst), [1, 2, 3])
    assert.deepStrictEqual(List.toArray(dataLast), [0, 2, 3])
  })

  it("map transforms values in order regardless of calling style", () => {
    const list = List.fromIterable([1, 2, 3])

    const doubleDataFirst = List.map(list, (value) => value * 2)
    const doubleDataLast = List.map((value: number) => value * 2)(list)

    assert.deepStrictEqual(List.toArray(doubleDataFirst), [2, 4, 6])
    assert.deepStrictEqual(List.toArray(doubleDataLast), [2, 4, 6])
  })

  it("append adds to the tail without mutating the original", () => {
    const list = List.fromIterable(["a", "b"])

    const appended = List.append(list, "c")

    assert.deepStrictEqual(List.toArray(list), ["a", "b"])
    assert.deepStrictEqual(List.toArray(appended), ["a", "b", "c"])
  })

  it("equals and hash codes align with Element equality", () => {
    const left = List.fromIterable([1, 2, 3])
    const right = List.cons(1)(List.cons(2)(List.cons(3)(List.empty<number>())))

    assert.isTrue(Equal.equals(left, right))
    assert.strictEqual(Hash.hash(left), Hash.hash(right))
  })

  it("reduce folds from the head toward the tail", () => {
    const list = List.fromIterable([1, 2, 3, 4])

    const sum = List.reduce(list, 0, (acc, value) => acc + value)

    assert.strictEqual(sum, 10)
  })

  it.effect("forEachEffect visits nodes sequentially", () =>
    Effect.gen(function*() {
      const list = List.fromIterable(["a", "b", "c"])
      const output: Array<string> = []

      yield* List.forEachEffect(list, (value, index) =>
        Effect.sync(() => {
          output.push(`${index}:${value}`)
        }))

      assert.deepStrictEqual(output, ["0:a", "1:b", "2:c"])
    }))
})
