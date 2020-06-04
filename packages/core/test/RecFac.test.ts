import * as assert from "assert"

import { effect as T, exit as EX, recursionSchemes as R } from "../src"
import { sequenceS } from "../src/Apply"
import { pipe } from "../src/Function"

interface ConsF<A> {
  readonly _tag: "cons"
  readonly head: bigint
  readonly tail: A
}

interface NilF {
  readonly _tag: "nil"
}

type ListF<A> = ConsF<A> | NilF

const URI = "RS/ListF"
type URI = typeof URI

declare module "../src/Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: ListF<A>
  }
}

type Ex = R.Fix<URI>

const cons = (head: bigint, tail: Ex): Ex =>
  R.fix({
    _tag: "cons",
    head,
    tail
  })

const nil: Ex = R.fix({
  _tag: "nil"
})

const mapper: R.FunctorM<URI, never, unknown, never> = (ta, f) => {
  switch (ta._tag) {
    case "nil":
      return T.pure(ta)
    case "cons":
      return sequenceS(T.effect)({
        _tag: T.pure(ta._tag),
        head: T.pure(ta.head),
        tail: f(ta.tail)
      })
  }
}

const ex = cons(BigInt(2), cons(BigInt(1), cons(BigInt(1), nil)))

const show: R.Algebra<URI, never, unknown, never, string> = (ex) => {
  switch (ex._tag) {
    case "cons":
      return T.pure(ex.tail.length > 0 ? `(${ex.head}, ${ex.tail})` : `(${ex.head})`)
    case "nil":
      return T.pure("")
  }
}

const mul: R.Algebra<URI, never, unknown, never, bigint> = (ex) => {
  switch (ex._tag) {
    case "cons":
      return T.pure(ex.head * ex.tail)
    case "nil":
      return T.pure(BigInt(1))
  }
}

const gen: R.Coalgebra<URI, never, unknown, never, bigint> = (n) => {
  switch (n) {
    case BigInt(-1):
      return T.pure({
        _tag: "nil"
      })
    case BigInt(0):
      return T.pure({
        _tag: "cons",
        head: BigInt(1),
        tail: BigInt(-1)
      })
    case BigInt(1):
      return T.pure({
        _tag: "cons",
        head: BigInt(1),
        tail: BigInt(0)
      })
    default:
      return T.pure({
        _tag: "cons",
        head: n,
        tail: n - BigInt(1)
      })
  }
}

describe("Recursion Schemes Fatorial", () => {
  it("show", async () => {
    const result = await pipe(R.cata(mapper)(show)(ex), T.runToPromiseExit)
    assert.deepStrictEqual(result, EX.done("(2, (1, (1)))"))
  })
  it("gen", async () => {
    const result = await pipe(R.hylo(mapper)(show, gen)(BigInt(2)), T.runToPromiseExit)
    assert.deepStrictEqual(result, EX.done("(2, (1, (1)))"))
  })
  it("mul", async () => {
    const result = await pipe(R.cata(mapper)(mul)(ex), T.runToPromiseExit)
    assert.deepStrictEqual(result, EX.done(BigInt(2)))
  })
  it("fac", async () => {
    const result = await pipe(R.hylo(mapper)(mul, gen)(BigInt(100)), T.runToPromiseExit)
    assert.deepStrictEqual(
      result,
      EX.done(
        BigInt(
          "93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000"
        )
      )
    )
  })
})
