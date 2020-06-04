import * as assert from "assert"

import * as T from "../../src/Effect"
import { pipe } from "../../src/Function"
import * as P from "../../src/Monocle/Prism"
import { monoidSum } from "../../src/Monoid"
import * as O from "../../src/Option"

type Num = { _tag: "number"; n: number }
type Str = { _tag: "string"; s: string }
type Adt = Num | Str

const numP = P.fromPredicate((a: Adt): a is Num => a._tag === "number")

const num = (n: number): Num => ({
  _tag: "number",
  n
})

const str = (s: string): Str => ({
  _tag: "string",
  s
})

const sum = (y: Num) => (x: Num): Num => ({
  _tag: "number",
  n: x.n + y.n
})

type Positive = Num & { _brand: "Positive" }

function increment(p: Positive): Positive {
  return {
    _tag: "number",
    n: p.n + 1
  } as Positive
}

const pos = P.fromPredicate((n: Num): n is Positive => n.n > 0)

describe("Prism", () => {
  it("fromPredicate / modify", () => {
    const result = pipe(num(1), P.modify(pos)(increment))
    const result2 = pipe(num(-1), P.modify(pos)(increment))

    assert.deepStrictEqual(result, num(2))
    assert.deepStrictEqual(result2, num(-1))
  })
  it("some", () => {
    const prism = P.some<number>()

    assert.deepStrictEqual(
      pipe(
        O.none,
        P.modify(prism)((n) => n + 1),
        P.getOption(prism)
      ),
      O.none
    )
    assert.deepStrictEqual(
      pipe(
        O.some(1),
        P.modify(prism)((n) => n + 1),
        P.getOption(prism)
      ),
      O.some(2)
    )
  })
  it("modifyOption", () => {
    assert.deepStrictEqual(
      pipe(num(1), P.modifyOption(numP)(sum(num(1)))),
      O.some(num(2))
    )
    assert.deepStrictEqual(pipe(str("1"), P.modifyOption(numP)(sum(num(1)))), O.none)
  })
  it("set", () => {
    assert.deepStrictEqual(pipe(num(1), P.set(numP)(num(2))), num(2))
  })
  it("asOptional / composeOptional", () => {
    const posAdt = pipe(numP, P.composeOptional(P.asOptional(pos)))

    assert.deepStrictEqual(pipe(str("ok"), posAdt.set(num(1) as Positive)), str("ok"))
    assert.deepStrictEqual(pipe(num(2), posAdt.set(num(2) as Positive)), num(2))
  })
  it("asTraversal / composeTraversal", () => {
    const posAdt = pipe(numP, P.composeTraversal(P.asTraversal(pos)))

    assert.deepStrictEqual(
      pipe(
        num(1),
        posAdt.modifyF(T.effect)((x) => T.pure(increment(x))),
        T.runUnsafeSync
      ),
      num(2)
    )
  })
  it("asSetter / composeSetter", () => {
    const posAdt = pipe(numP, P.composeSetter(P.asSetter(pos)))

    assert.deepStrictEqual(pipe(num(1), posAdt.modify(increment)), num(2))
  })
  it("asFold / composeFold", () => {
    const posAdt = pipe(numP, P.composeFold(P.asFold(pos)))

    assert.deepStrictEqual(
      pipe(
        num(1),
        posAdt.foldMap(monoidSum)((n) => n.n)
      ),
      1
    )
  })
  it("compose", () => {
    const postAdt = pipe(numP, P.compose(pos))

    assert.deepStrictEqual(pipe(num(1), postAdt.getOption), O.some(num(1)))
    assert.deepStrictEqual(pipe(str("n"), postAdt.getOption), O.none)
  })
  it("composeGetter", () => {
    const foldN = pipe(
      numP,
      P.composeGetter({
        get: (n) => n.n
      })
    )

    assert.deepStrictEqual(
      pipe(
        num(1),
        foldN.foldMap(monoidSum)((n) => n + 1)
      ),
      2
    )
  })
  it("composeIso", () => {
    const prismN = pipe(
      numP,
      P.composeIso({
        get: (n) => n.n,
        reverseGet: num
      })
    )

    assert.deepStrictEqual(
      pipe(
        num(1),
        P.modify(prismN)((n) => n + 1)
      ),
      num(2)
    )
  })
  it("composeLens", () => {
    const optN = pipe(
      numP,
      P.composeLens({
        get: (n) => n.n,
        set: (n: number) => () => num(n)
      })
    )

    assert.deepStrictEqual(pipe(num(1), optN.set(2)), num(2))
  })
})
