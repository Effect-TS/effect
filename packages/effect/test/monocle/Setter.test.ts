import * as assert from "assert"

import { pipe } from "../../src/Function"
import * as I from "../../src/Monocle/Iso"
import * as L from "../../src/Monocle/Lens"
import * as P from "../../src/Monocle/Prism"
import * as S from "../../src/Monocle/Setter"

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

describe("Setter", () => {
  it("modify", () => {
    const setter = L.asSetter(L.fromPath<Demo>()(["nested", "n"]))

    assert.deepStrictEqual(
      pipe(
        d,
        S.modify(setter)((n) => n + 1),
        (k) => k.nested.n
      ),
      2
    )
  })
  it("compose", () => {
    const s0 = L.asSetter(L.fromPath<Demo>()(["nested"]))
    const s1 = L.asSetter(L.fromPath<Nested>()(["n"]))
    const setter = pipe(s0, S.compose(s1))

    assert.deepStrictEqual(
      pipe(
        d,
        setter.modify((n) => n + 1),
        (k) => k.nested.n
      ),
      2
    )
  })
  it("set", () => {
    const s0 = L.asSetter(L.fromPath<Demo>()(["nested"]))
    const s1 = L.asSetter(L.fromPath<Nested>()(["n"]))
    const setter = pipe(s0, S.compose(s1))

    assert.deepStrictEqual(
      pipe(d, S.set(setter)(2), (k) => k.nested.n),
      2
    )
  })
  it("composeTraversal", () => {
    const s0 = L.asSetter(L.fromPath<Demo>()(["nested"]))
    const s1 = L.asTraversal(L.fromPath<Nested>()(["n"]))
    const setter = pipe(s0, S.composeTraversal(s1))

    assert.deepStrictEqual(
      pipe(d, S.set(setter)(2), (k) => k.nested.n),
      2
    )
  })
  it("composeOptional", () => {
    const s0 = L.asSetter(L.fromPath<Demo>()(["nested"]))
    const s1 = L.asOptional(L.fromPath<Nested>()(["n"]))
    const setter = pipe(s0, S.composeOptional(s1))

    assert.deepStrictEqual(
      pipe(d, S.set(setter)(2), (k) => k.nested.n),
      2
    )
  })
  it("composeLens", () => {
    const s0 = L.asSetter(L.fromPath<Demo>()(["nested"]))
    const s1 = L.fromPath<Nested>()(["n"])
    const setter = pipe(s0, S.composeLens(s1))

    assert.deepStrictEqual(
      pipe(d, S.set(setter)(2), (k) => k.nested.n),
      2
    )
  })
  it("composeIso", () => {
    const s0 = L.asSetter(L.fromPath<Demo>()(["nested"]))
    const setter = pipe(
      s0,
      S.composeIso(
        I.create(
          (n) => n.n,
          (n) => ({ n })
        )
      )
    )

    assert.deepStrictEqual(
      pipe(d, S.set(setter)(2), (k) => k.nested.n),
      2
    )
  })
  it("composePrism", () => {
    const s0 = L.asSetter(L.fromPath<Demo>()(["nested"]))
    const setter = pipe(s0, S.composePrism(P.fromPredicate((n) => n.n > 0)))

    assert.deepStrictEqual(
      pipe(d, S.set(setter)({ n: 2 }), (k) => k.nested.n),
      2
    )
  })
})
