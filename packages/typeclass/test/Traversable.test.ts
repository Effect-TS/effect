import * as ArrayInstances from "@effect/typeclass/data/Array"
import * as OptionInstances from "@effect/typeclass/data/Option"
import * as Traversable from "@effect/typeclass/Traversable"
import { describe, it } from "@effect/vitest"
import { pipe } from "effect/Function"
import * as O from "effect/Option"
import * as U from "./util.js"

describe.concurrent("Traversable", () => {
  it("traverseComposition", () => {
    const traverse = Traversable.traverseComposition(
      ArrayInstances.Traversable,
      ArrayInstances.Traversable
    )(OptionInstances.Applicative)
    U.deepStrictEqual(
      traverse([[1, 2], [3]], (a) => (a > 0 ? O.some(a) : O.none())),
      O.some([[1, 2], [3]])
    )
    U.deepStrictEqual(
      traverse([[1, -2], [3]], (a) => (a > 0 ? O.some(a) : O.none())),
      O.none()
    )
  })

  it("sequence", () => {
    const sequence = Traversable.sequence(ArrayInstances.Traversable)(
      OptionInstances.Applicative
    )
    U.deepStrictEqual(sequence([O.some(1), O.some(2)]), O.some([1, 2]))
    U.deepStrictEqual(sequence([O.some(1), O.none()]), O.none())
  })

  it("traverseTap", () => {
    const traverseTap = Traversable.traverseTap(ArrayInstances.Traversable)(
      OptionInstances.Applicative
    )
    U.deepStrictEqual(
      pipe([], traverseTap((n) => n > 0 ? O.some(n) : O.none())),
      O.some([])
    )
    U.deepStrictEqual(
      pipe(["a", "b", "c"], traverseTap((s) => s.length > 0 ? O.some(s.length) : O.none())),
      O.some(["a", "b", "c"])
    )
    U.deepStrictEqual(
      pipe(["a", "", "c"], traverseTap((s) => s.length > 0 ? O.some(s) : O.none())),
      O.none()
    )
  })
})
