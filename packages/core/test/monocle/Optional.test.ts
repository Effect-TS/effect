import * as assert from "assert"

import * as T from "../../src/Effect"
import { pipe } from "../../src/Function"
import * as L from "../../src/Monocle/Lens"
import * as Op from "../../src/Monocle/Optional"
import { monoidSum } from "../../src/Monoid"
import * as O from "../../src/Option"

interface Nested {
  nullable?: number
  opt: O.Option<number>
}

interface Demo {
  nested: Nested
}

const p1: Demo = {
  nested: {
    opt: O.none
  }
}
const p2: Demo = {
  nested: {
    nullable: 1,
    opt: O.none
  }
}
const p3: Demo = {
  nested: {
    opt: O.some(1)
  }
}

describe("Optional", () => {
  it("fromPath", () => {
    const nullable = Op.fromPath<Demo>()(["nested", "nullable"])

    assert.deepStrictEqual(pipe(p1, nullable.getOption), O.none)
    assert.deepStrictEqual(pipe(p2, nullable.getOption), O.some(1))
  })
  it("fromOptionProp", () => {
    const opt = Op.fromOptionProp<Nested>()("opt")
    const nested = pipe(L.fromProp<Demo>()("nested"), L.composeOptional(opt))

    assert.deepStrictEqual(pipe(p1, nested.getOption), O.none)
    assert.deepStrictEqual(pipe(p3, nested.getOption), O.some(1))
  })
  it("fromNullableProp", () => {
    const nullable = Op.fromNullableProp<Nested>()("nullable")
    const nested = pipe(L.fromProp<Demo>()("nested"), L.composeOptional(nullable))

    assert.deepStrictEqual(pipe(p1, nested.getOption), O.none)
    assert.deepStrictEqual(pipe(p2, nested.getOption), O.some(1))
  })
  it("modify", () => {
    const nullable = Op.fromPath<Demo>()(["nested", "nullable"])

    assert.deepStrictEqual(
      pipe(
        p2,
        Op.modify(nullable)((n) => n + 1),
        Op.getOption(nullable)
      ),
      O.some(2)
    )
  })
  it("asTraversal / composeTraversal", () => {
    const tr = pipe(
      Op.fromPath<Demo>()(["nested"]),
      Op.composeTraversal(Op.asTraversal(Op.fromOptionProp<Nested>()("opt")))
    )

    assert.deepStrictEqual(
      pipe(
        p3,
        tr.modifyF(T.effect)((n) => T.pure(n + 1)),
        T.runUnsafeSync,
        (d) => d.nested.opt
      ),
      O.some(2)
    )
  })
  it("asFold / composeFold", () => {
    const tr = pipe(
      Op.fromPath<Demo>()(["nested"]),
      Op.composeFold(Op.asFold(Op.fromOptionProp<Nested>()("opt")))
    )

    assert.deepStrictEqual(
      pipe(
        p3,
        tr.foldMap(monoidSum)((n) => n + 1)
      ),
      2
    )
  })
  it("asSetter / composeSetter", () => {
    const tr = pipe(
      Op.fromPath<Demo>()(["nested"]),
      Op.composeSetter(Op.asSetter(Op.fromOptionProp<Nested>()("opt")))
    )

    assert.deepStrictEqual(
      pipe(
        p3,
        tr.modify((n) => n + 1),
        (d) => d.nested.opt
      ),
      O.some(2)
    )
  })
  it("set", () => {
    const tr = pipe(Op.fromPath<Demo>()(["nested", "nullable"]))

    assert.deepStrictEqual(pipe(p1, tr.set(10), tr.getOption), O.none)
  })
  it("composeIso", () => {
    const tr = pipe(
      Op.fromPath<Demo>()(["nested", "nullable"]),
      Op.composeIso({
        get: (n) => n.toString(),
        reverseGet: (s: string) => parseFloat(s)
      })
    )

    assert.deepStrictEqual(pipe(p2, tr.set("10"), tr.getOption), O.some("10"))
  })
  it("composeLens", () => {
    const nl = L.fromProp<Nested>()("nullable")
    const tr = pipe(Op.fromPath<Demo>()(["nested"]), Op.composeLens(nl))

    assert.deepStrictEqual(pipe(p1, tr.set(10), tr.getOption), O.some(10))
  })
  it("composeGetter", () => {
    const tr = pipe(
      Op.fromPath<Demo>()(["nested"]),
      Op.composeGetter({
        get: (n) => n.opt
      })
    )

    assert.deepStrictEqual(
      pipe(p3, tr.foldMap(O.getMonoid(monoidSum))(O.map((n) => n + 1))),
      O.some(2)
    )
  })
})
