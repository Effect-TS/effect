import * as assert from "assert"

import * as A from "../../src/Array"
import { pipe } from "../../src/Function"
import * as F from "../../src/Monocle/Fold"
import * as L from "../../src/Monocle/Lens"
import * as P from "../../src/Monocle/Prism"
import { monoidSum } from "../../src/Monoid"
import * as O from "../../src/Option"

interface Nested {
  n: number
}
interface Demo {
  nested: Nested
}

const d: Demo = {
  nested: {
    n: 1
  }
}

describe("Fold", () => {
  it("getAll", () => {
    const fold = L.asFold(L.fromPath<Demo>()(["nested", "n"]))

    assert.deepStrictEqual(pipe(d, F.getAll(fold)), [1])
  })
  it("exists", () => {
    const fold = L.asFold(L.fromPath<Demo>()(["nested", "n"]))

    assert.deepStrictEqual(
      pipe(
        d,
        F.exists(fold)((n) => n > 0)
      ),
      true
    )
  })
  it("all", () => {
    const fold = L.asFold(L.fromPath<Demo>()(["nested", "n"]))

    assert.deepStrictEqual(
      pipe(
        d,
        F.all(fold)((n) => n > 0)
      ),
      true
    )
  })
  it("compose", () => {
    const f0 = L.asFold(L.fromPath<Demo>()(["nested"]))
    const f1 = L.asFold(L.fromPath<Nested>()(["n"]))

    const fold = pipe(f0, F.compose(f1))

    assert.deepStrictEqual(
      pipe(
        d,
        F.all(fold)((n) => n > 0)
      ),
      true
    )
  })
  it("composeGetter", () => {
    const f0 = L.asFold(L.fromPath<Demo>()(["nested"]))

    const fold = pipe(
      f0,
      F.composeGetter({
        get: (n) => n.n
      })
    )

    assert.deepStrictEqual(
      pipe(
        d,
        F.all(fold)((n) => n > 0)
      ),
      true
    )
  })
  it("composeIso", () => {
    const f0 = L.asFold(L.fromPath<Demo>()(["nested"]))

    const fold = pipe(
      f0,
      F.composeIso({
        get: (n) => n.n,
        reverseGet: (n: number) => ({
          n
        })
      })
    )

    assert.deepStrictEqual(
      pipe(
        d,
        F.all(fold)((n) => n > 0)
      ),
      true
    )
  })
  it("composeTraversal", () => {
    const f0 = L.asFold(L.fromPath<Demo>()(["nested"]))

    const fold = pipe(f0, F.composeTraversal(L.asTraversal(L.fromProp<Nested>()("n"))))

    assert.deepStrictEqual(
      pipe(
        d,
        F.all(fold)((n) => n > 0)
      ),
      true
    )
  })
  it("composeOptional", () => {
    const f0 = L.asFold(L.fromPath<Demo>()(["nested"]))

    const fold = pipe(f0, F.composeOptional(L.asOptional(L.fromProp<Nested>()("n"))))

    assert.deepStrictEqual(
      pipe(
        d,
        F.all(fold)((n) => n > 0)
      ),
      true
    )
  })
  it("composePrism", () => {
    const f0 = L.asFold(L.fromPath<Demo>()(["nested"]))

    const fold = pipe(f0, F.composePrism(P.fromPredicate((n) => n.n > 0)))

    assert.deepStrictEqual(
      pipe(
        d,
        F.all(fold)((n) => n.n < 0)
      ),
      false
    )
  })
  it("composeLens", () => {
    const f0 = L.asFold(L.fromPath<Demo>()(["nested"]))

    const fold = pipe(f0, F.composeLens(L.fromProp<Nested>()("n")))

    assert.deepStrictEqual(
      pipe(
        d,
        F.all(fold)((n) => n > 0)
      ),
      true
    )
  })
  it("find", () => {
    const f0 = L.asFold(L.fromPath<Demo>()(["nested"]))

    const fold = pipe(f0, F.composeLens(L.fromProp<Nested>()("n")))

    assert.deepStrictEqual(
      pipe(
        d,
        F.find(fold)((n) => n > 0)
      ),
      O.some(1)
    )
  })
  it("headOption", () => {
    const f0 = L.asFold(L.fromPath<Demo>()(["nested"]))

    const fold = pipe(f0, F.composeLens(L.fromProp<Nested>()("n")))

    assert.deepStrictEqual(pipe(d, F.headOption(fold)), O.some(1))
  })
  it("fromFoldable", () => {
    const arrayF = F.fromFoldable(A.array)
    const arrayN = arrayF<number>()

    assert.deepStrictEqual(
      pipe(
        [0, 1, 2],
        arrayN.foldMap(monoidSum)((n) => n + 1)
      ),
      6
    )
  })
})
