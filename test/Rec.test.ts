import * as assert from "assert"

import { effect as T, exit as EX, recursionSchemes as R } from "../src"
import { sequenceS } from "../src/Apply"
import { pipe } from "../src/Function"

interface ConstF {
  readonly _tag: "ConstF"
  readonly d: number
}

interface VarF {
  readonly _tag: "VarF"
  readonly s: string
}

interface TimesF<R> {
  readonly _tag: "TimesF"
  readonly l: R
  readonly r: R
}

interface PlusF<R> {
  readonly _tag: "PlusF"
  readonly l: R
  readonly r: R
}

type ExprF<R> = ConstF | VarF | TimesF<R> | PlusF<R>

const URI = "RS/ExprF"
type URI = typeof URI

declare module "../src/Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: ExprF<A>
  }
}

type Ex = R.Fix<URI>

const v = (s: string): Ex =>
  R.fix({
    _tag: "VarF",
    s
  })

const num = (d: number): Ex =>
  R.fix({
    _tag: "ConstF",
    d
  })

const mul = (l: Ex, r: Ex): Ex =>
  R.fix({
    _tag: "TimesF",
    l,
    r
  })

const add = (l: Ex, r: Ex): Ex =>
  R.fix({
    _tag: "PlusF",
    l,
    r
  })

const alg = R.algebra<URI, string>()((_) => {
  switch (_._tag) {
    case "ConstF":
      return T.pure(`${_.d}`)
    case "PlusF":
      return T.pure(`${_.l} + ${_.r}`)
    case "TimesF":
      return T.pure(
        _.l === _.r
          ? `${_.l}^2`
          : _.l.indexOf("^") !== -1
          ? _.l.split("^")[0] === _.r
            ? `${_.r}^${parseInt(_.l.split("^")[1], 10) + 1}`
            : `${_.l} * ${_.r}`
          : `${_.l} * ${_.r}`
      )
    case "VarF":
      return T.pure(_.s)
  }
})

const coalg = R.coalgebra<URI, number>()((n) => {
  switch (n) {
    case 0:
      return T.pure({
        _tag: "ConstF",
        d: 2
      })
    case 1:
      return T.pure({
        _tag: "ConstF",
        d: 3
      })
    default:
      return T.pure({
        _tag: "TimesF",
        l: n - 2,
        r: n - 1
      })
  }
})

const mapper = R.functorM<URI>()((ta, f) => {
  switch (ta._tag) {
    case "ConstF":
      return T.pure({
        _tag: ta._tag,
        d: ta.d
      })
    case "VarF":
      return T.pure({
        _tag: ta._tag,
        s: ta.s
      })
    case "PlusF":
      return sequenceS(T.effect)({
        _tag: T.pure(ta._tag),
        l: f(ta.l),
        r: f(ta.r)
      })
    case "TimesF":
      return sequenceS(T.effect)({
        _tag: T.pure(ta._tag),
        l: f(ta.l),
        r: f(ta.r)
      })
  }
})

const ex = add(mul(mul(v("x"), v("x")), v("x")), add(mul(num(3), v("x")), num(4)))

let exStack: Ex = num(0)

for (let n = 0; n < 50000; n += 1) {
  exStack = mul(exStack, num(0))
}

describe("Recursion Schemes", () => {
  it("cata", async () => {
    const result = await pipe(R.cata(mapper)(alg)(ex), T.runToPromiseExit)
    assert.deepStrictEqual(result, EX.done("x^3 + 3 * x + 4"))
  })

  it("cata - stack safe", async () => {
    const result = await pipe(R.cata(mapper)(alg)(exStack), T.runToPromiseExit)
    assert.deepStrictEqual(EX.isDone(result) && result.value, "0^50001")
  })

  it("ana", async () => {
    const result = await pipe(
      R.ana(mapper)(coalg)(3),
      T.chain(R.cata(mapper)(alg)),
      T.runToPromiseExit
    )
    assert.deepStrictEqual(result, EX.done("3 * 2 * 3"))
  })

  it("hylo", async () => {
    const result = await pipe(R.hylo(mapper)(alg, coalg)(3), T.runToPromiseExit)
    assert.deepStrictEqual(result, EX.done("3 * 2 * 3"))
  })
})
