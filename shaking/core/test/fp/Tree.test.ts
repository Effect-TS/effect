import * as assert from "assert"

import { eq, Eq, eqNumber } from "../../src/Eq"
import { identity } from "../../src/Function"
import * as I from "../../src/Identity"
import { monoidString } from "../../src/Monoid"
import { showString } from "../../src/Show"
import {
  drawTree,
  elem,
  getEq,
  getShow,
  Tree,
  tree,
  unfoldTree,
  unfoldTreeM,
  make,
  fold
} from "../../src/Tree"

describe("Tree", () => {
  it("map", () => {
    const double = (n: number): number => n * 2
    const fa = make(1, [make(2), make(3)])
    const expected = make(2, [make(4), make(6)])
    assert.deepStrictEqual(tree.map(fa, double), expected)
  })

  it("ap", () => {
    const double = (n: number): number => n * 2
    const fab = tree.of(double)
    const fa = make(1, [make(2), make(3)])
    const expected = make(2, [make(4), make(6)])
    assert.deepStrictEqual(tree.ap(fab, fa), expected)
  })

  it("chain", () => {
    const f = (n: number) => tree.of(n * 2)
    const fa = make(1, [make(2), make(3)])
    const expected = make(2, [make(4), make(6)])
    assert.deepStrictEqual(tree.chain(fa, f), expected)
  })

  it("extract", () => {
    const fa = make(1, [make(2), make(3)])
    assert.deepStrictEqual(tree.extract(fa), 1)
  })

  it("extend", () => {
    const fa = make("a", [make("foo"), make("b")])
    const f = (fa: Tree<string>) => fa.value.length + fa.forest.length
    const expected = make(3, [make(3), make(1)])
    assert.deepStrictEqual(tree.extend(fa, f), expected)
  })

  it("reduce", () => {
    const fa = make("a", [make("b"), make("c")])
    assert.deepStrictEqual(
      tree.reduce(fa, "", (b, a) => b + a),
      "abc"
    )
  })

  it("foldMap", () => {
    const foldMap = tree.foldMap(monoidString)
    const x1 = make("a", [make("b"), make("c")])
    const f1 = identity
    assert.deepStrictEqual(foldMap(x1, f1), "abc")
  })

  it("reduceRight", () => {
    const reduceRight = tree.reduceRight
    const x1 = make("a", [make("b"), make("c")])
    const init1 = ""
    const f1 = (a: string, acc: string) => acc + a
    assert.deepStrictEqual(reduceRight(x1, init1, f1), "cba")
  })

  it("traverse", () => {
    const fa = make("a", [make("b"), make("c")])
    assert.deepStrictEqual(
      tree.traverse(I.identity)(fa, (a) => I.identity.of(a)),
      I.identity.of(fa)
    )
  })

  it("sequence", () => {
    const sequence = tree.sequence(I.identity)
    const x1 = make(I.identity.of<string>("a"), [
      make(I.identity.of("b")),
      make(I.identity.of("c"))
    ])
    assert.deepStrictEqual(
      sequence(x1),
      I.identity.of(make("a", [make("b"), make("c")]))
    )
  })

  it("drawTree", () => {
    const tree = make("a")
    assert.deepStrictEqual(drawTree(tree), "a")

    const tree1 = make("a", [
      make("b"),
      make("c"),
      make("d", [make("e"), make("f")]),
      make("g")
    ])
    assert.deepStrictEqual(
      drawTree(tree1),
      `a
├─ b
├─ c
├─ d
│  ├─ e
│  └─ f
└─ g`
    )

    const tree2 = make("a", [make("b", [make("c")])])
    assert.deepStrictEqual(
      drawTree(tree2),
      `a
└─ b
   └─ c`
    )

    const tree3 = make("a", [make("b", [make("c")]), make("d", [make("e")])])
    assert.deepStrictEqual(
      drawTree(tree3),
      `a
├─ b
│  └─ c
└─ d
   └─ e`
    )

    const tree4 = make("a", [
      make("b", [make("c", [make("d")]), make("e", [make("f")])]),
      make("e")
    ])
    assert.deepStrictEqual(
      drawTree(tree4),
      `a
├─ b
│  ├─ c
│  │  └─ d
│  └─ e
│     └─ f
└─ e`
    )
  })

  it("getEq", () => {
    const S = getEq(eqNumber)
    const x = make(1, [make(2)])
    const y = make(2, [make(2)])
    const z = make(1, [make(1)])
    assert.deepStrictEqual(S.equals(x, x), true)
    assert.deepStrictEqual(S.equals(x, y), false)
    assert.deepStrictEqual(S.equals(x, z), false)
  })

  it("unfoldTree", () => {
    const fa = unfoldTree(1, (b) => [b, b < 3 ? [b + 1, b + 2] : []])
    const expected = make(1, [make(2, [make(3), make(4)]), make(3)])
    assert.deepStrictEqual(fa, expected)
  })

  it("unfoldTreeM", () => {
    const fa = unfoldTreeM(I.identity)(1, (b) =>
      I.identity.of([b, b < 3 ? [b + 1, b + 2] : []])
    )
    const expected = I.identity.of(make(1, [make(2, [make(3), make(4)]), make(3)]))
    assert.deepStrictEqual(fa, expected)
  })

  it("elem", () => {
    interface User {
      readonly id: number
    }
    const S: Eq<User> = eq.contramap(eqNumber, (user: User) => user.id)
    const users = make({ id: 1 }, [
      make({ id: 1 }, [make({ id: 3 }), make({ id: 4 })]),
      make({ id: 2 })
    ])
    assert.deepStrictEqual(elem(S)({ id: 1 }, users), true)
    assert.deepStrictEqual(elem(S)({ id: 4 }, users), true)
    assert.deepStrictEqual(elem(S)({ id: 5 }, users), false)
  })

  it("getShow", () => {
    const S = getShow(showString)
    const t1 = make("a")
    assert.deepStrictEqual(S.show(t1), `make("a")`)
    const t2 = make("a", [make("b"), make("c")])
    assert.deepStrictEqual(S.show(t2), `make("a", [make("b"), make("c")])`)
  })

  it("fold", () => {
    const t = make(1, [make(2), make(3)])
    assert.deepStrictEqual(
      fold((a: number, bs: ReadonlyArray<number>) =>
        bs.reduce((b, acc) => Math.max(b, acc), a)
      )(t),
      3
    )
  })
})
