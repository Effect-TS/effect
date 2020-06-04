import * as assert from "assert"

import { pipe } from "../../src/Function"
import * as G from "../../src/Monocle/Getter"
import * as I from "../../src/Monocle/Iso"
import * as L from "../../src/Monocle/Lens"
import * as P from "../../src/Monocle/Prism"

import { monoidSum } from "@matechs/core/Monoid"

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

describe("Getter", () => {
  it("asFold", () => {
    const getter = L.asGetter(L.fromPath<Demo>()(["nested", "n"]))
    const fold = G.asFold(getter)

    assert.deepStrictEqual(
      pipe(
        d,
        fold.foldMap(monoidSum)((n) => n + 1)
      ),
      2
    )
  })
  it("compose", () => {
    const g0 = L.asGetter(L.fromPath<Demo>()(["nested"]))
    const g1 = L.asGetter(L.fromPath<Nested>()(["n"]))
    const getter = pipe(g0, G.compose(g1))

    assert.deepStrictEqual(pipe(d, getter.get), 1)
  })
  it("composeFold", () => {
    const g0 = L.asGetter(L.fromPath<Demo>()(["nested"]))
    const g1 = G.asFold(L.asGetter(L.fromPath<Nested>()(["n"])))
    const fold = pipe(g0, G.composeFold(g1))

    assert.deepStrictEqual(
      pipe(
        d,
        fold.foldMap(monoidSum)((n) => n + 1)
      ),
      2
    )
  })
  it("composeLens", () => {
    const g0 = L.asGetter(L.fromPath<Demo>()(["nested"]))
    const g1 = L.fromPath<Nested>()(["n"])
    const getter = pipe(g0, G.composeLens(g1))

    assert.deepStrictEqual(pipe(d, getter.get), 1)
  })
  it("composeIso", () => {
    const g0 = L.asGetter(L.fromPath<Demo>()(["nested"]))
    const getter = pipe(
      g0,
      G.composeIso(
        I.create(
          (n) => n.n,
          (n) => ({ n })
        )
      )
    )

    assert.deepStrictEqual(pipe(d, getter.get), 1)
  })
  it("composeOptional", () => {
    const g0 = L.asGetter(L.fromPath<Demo>()(["nested"]))
    const fold = pipe(
      g0,
      G.composeOptional(
        I.asOptional(
          I.create(
            (n) => n.n,
            (n) => ({ n })
          )
        )
      )
    )

    assert.deepStrictEqual(
      pipe(
        d,
        fold.foldMap(monoidSum)((n) => n + 1)
      ),
      2
    )
  })
  it("composeTraversal", () => {
    const g0 = L.asGetter(L.fromPath<Demo>()(["nested"]))
    const fold = pipe(
      g0,
      G.composeTraversal(
        I.asTraversal(
          I.create(
            (n) => n.n,
            (n) => ({ n })
          )
        )
      )
    )

    assert.deepStrictEqual(
      pipe(
        d,
        fold.foldMap(monoidSum)((n) => n + 1)
      ),
      2
    )
  })
  it("composePrism", () => {
    const g0 = L.asGetter(L.fromPath<Demo>()(["nested"]))
    const fold = pipe(g0, G.composePrism(P.fromPredicate((n) => n.n > 0)))

    assert.deepStrictEqual(
      pipe(
        d,
        fold.foldMap(monoidSum)((n) => n.n + 1)
      ),
      2
    )
  })
})
