import * as assert from "assert"

import * as A from "../../src/Array"
import * as T from "../../src/Effect"
import { pipe } from "../../src/Function"
import * as L from "../../src/Monocle/Lens"
import * as P from "../../src/Monocle/Prism"
import * as Tr from "../../src/Monocle/Traversal"

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

describe("Traversal", () => {
  it("compose", () => {
    const nestedT = L.asTraversal(L.fromProp<Demo>()("nested"))
    const nT = L.asTraversal(L.fromProp<Nested>()("n"))

    const comp = pipe(nestedT, Tr.compose(nT))

    assert.deepStrictEqual(
      pipe(d, Tr.modifyF(comp)(T.effect)(T.pure), T.runUnsafeSync),
      d
    )
  })
  it("modify", () => {
    const nestedT = L.asTraversal(L.fromProp<Demo>()("nested"))
    const nT = L.asTraversal(L.fromProp<Nested>()("n"))

    const comp = pipe(nestedT, Tr.compose(nT))

    assert.deepStrictEqual(
      pipe(
        d,
        Tr.modify(comp)((n) => n + 1),
        (k) => k.nested.n
      ),
      2
    )
  })
  it("composeSetter / asSetter", () => {
    const nestedT = L.asTraversal(L.fromProp<Demo>()("nested"))
    const nT = L.asTraversal(L.fromProp<Nested>()("n"))

    const comp = pipe(nestedT, Tr.composeSetter(Tr.asSetter(nT)))

    assert.deepStrictEqual(
      pipe(
        d,
        comp.modify((n) => n + 1),
        (k) => k.nested.n
      ),
      2
    )
  })
  it("composeFold / asFold", () => {
    const nestedT = L.asTraversal(L.fromProp<Demo>()("nested"))
    const nT = L.asTraversal(L.fromProp<Nested>()("n"))

    const comp = pipe(nestedT, Tr.composeFold(Tr.asFold(nT)))

    assert.deepStrictEqual(
      pipe(
        d,
        comp.foldMap(monoidSum)((n) => n + 1)
      ),
      2
    )
  })
  it("composeGetter", () => {
    const nestedT = L.asTraversal(L.fromProp<Demo>()("nested"))

    const comp = pipe(
      nestedT,
      Tr.composeGetter({
        get: (n) => n.n
      })
    )

    assert.deepStrictEqual(
      pipe(
        d,
        comp.foldMap(monoidSum)((n) => n + 1)
      ),
      2
    )
  })
  it("composeIso", () => {
    const nestedT = L.asTraversal(L.fromProp<Demo>()("nested"))

    const comp = pipe(
      nestedT,
      Tr.composeIso({
        get: (s) => s.n,
        reverseGet: (n: number) => ({ n })
      })
    )

    assert.deepStrictEqual(
      pipe(
        d,
        comp.modifyF(T.effect)((n) => T.pure(n + 1)),
        T.map((d) => d.nested.n),
        T.runUnsafeSync
      ),
      2
    )
  })
  it("composeLens", () => {
    const nestedT = L.asTraversal(L.fromProp<Demo>()("nested"))

    const comp = pipe(nestedT, Tr.composeLens(L.fromProp<Nested>()("n")))

    assert.deepStrictEqual(
      pipe(
        d,
        comp.modifyF(T.effect)((n) => T.pure(n + 1)),
        T.map((d) => d.nested.n),
        T.runUnsafeSync
      ),
      2
    )
  })
  it("composeOptional", () => {
    const nestedT = L.asTraversal(L.fromProp<Demo>()("nested"))

    const comp = pipe(
      nestedT,
      Tr.composeOptional(L.asOptional(L.fromProp<Nested>()("n")))
    )

    assert.deepStrictEqual(
      pipe(
        d,
        comp.modifyF(T.effect)((n) => T.pure(n + 1)),
        T.map((d) => d.nested.n),
        T.runUnsafeSync
      ),
      2
    )
  })
  it("composePrism", () => {
    const nestedT = L.asTraversal(L.fromProp<Demo>()("nested"))

    const comp = pipe(nestedT, Tr.composePrism(P.fromPredicate((n) => n.n > 1)))
    const comp2 = pipe(nestedT, Tr.composePrism(P.fromPredicate((n) => n.n === 1)))

    assert.deepStrictEqual(
      pipe(
        d,
        comp.modifyF(T.effect)((n) =>
          T.pure({
            n: n.n + 1
          })
        ),
        T.map((d) => d.nested.n),
        T.runUnsafeSync
      ),
      1
    )
    assert.deepStrictEqual(
      pipe(
        d,
        comp2.modifyF(T.effect)((n) =>
          T.pure({
            n: n.n + 1
          })
        ),
        T.map((d) => d.nested.n),
        T.runUnsafeSync
      ),
      2
    )
  })
  it("fromTraversable", () => {
    const arrayT = Tr.fromTraversable(A.array)
    const arrayN = arrayT<number>()

    assert.deepStrictEqual(
      pipe(
        [0, 1, 2],
        arrayN.modifyF(T.effect)((n) => T.pure(n + 1)),
        T.runUnsafeSync
      ),
      [1, 2, 3]
    )
  })
})
