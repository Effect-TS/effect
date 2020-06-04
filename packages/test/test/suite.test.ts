import * as fc from "fast-check"
import { limitRetries } from "retry-ts"

import * as M from "../src"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import { combine } from "@matechs/core/Provider"

interface Sum {
  sum: {
    a: number
    b: number
    e: number
  }
}

interface Mul {
  mul: {
    a: number
    b: number
    e: number
  }
}

interface Div {
  div: {
    a: number
    b: number
    e: number
  }
}

interface Sub {
  sub: {
    a: number
    b: number
    e: number
  }
}

const demoSuite = M.suite("demo")(
  M.testM(
    "sum",
    T.Do()
      .bind("env", T.accessEnvironment<Sum>())
      .bindL("c", ({ env: { sum: { a, b } } }) =>
        T.delay(
          T.sync(() => a + b),
          100
        )
      )
      .return((s) => M.assert.deepStrictEqual(s.c, s.env.sum.e))
  ),
  M.testM(
    "mul",
    T.Do()
      .bind("env", T.accessEnvironment<Mul>())
      .bindL("c", ({ env: { mul: { a, b } } }) =>
        T.delay(
          T.sync(() => a * b),
          100
        )
      )
      .return((s) => M.assert.deepStrictEqual(s.c, s.env.mul.e))
  )
)

const demo2Suite = M.suite("demo2")(
  M.testM(
    "sub",
    T.Do()
      .bind("env", T.accessEnvironment<Sub>())
      .bindL("c", ({ env: { sub: { a, b } } }) =>
        T.delay(
          T.sync(() => a - b),
          500
        )
      )
      .return((s) => M.assert.deepStrictEqual(s.c, s.env.sub.e))
  ),
  M.testM(
    "div",
    T.Do()
      .bind("env", T.accessEnvironment<Div>())
      .bindL("c", ({ env: { div: { a, b } } }) =>
        T.delay(
          T.sync(() => a / b),
          500
        )
      )
      .return((s) => M.assert.deepStrictEqual(s.c, s.env.div.e))
  )
)

const comboSuite = M.suite("combo")(
  demoSuite,
  M.withTimeout(600)(demo2Suite),
  M.testM(
    "simple",
    T.sync(() => M.assert.deepStrictEqual(1, 1))
  )
)

const flackySuite = M.suite("flacky")(
  M.testM(
    "random",
    pipe(
      T.sync(() => Math.random()),
      T.map((n) => M.assert.deepStrictEqual(n < 0.3, true))
    )
  ),
  pipe(
    M.testM(
      "random2",
      pipe(
        T.sync(() => Math.random()),
        T.map((n) => M.assert.deepStrictEqual(n < 0.1, true))
      )
    ),
    M.withRetryPolicy(limitRetries(200))
  )
)

const genSuite = M.suite("generative")(
  M.testM(
    "generate naturals",
    M.propertyM(1000)({
      a: M.arb(fc.nat()),
      b: M.arb(fc.nat())
    })(({ a, b }) =>
      T.access((_: Sum) =>
        M.assert.deepStrictEqual(a > 0 && b > 0 && _.sum.a > 0, true)
      )
    )
  ),
  M.testM(
    "generate strings",
    M.property(1000)({
      a: M.arb(fc.hexaString(2, 100)),
      b: M.arb(fc.hexaString(4, 100))
    })(({ a, b }) => M.assert.deepStrictEqual(a.length >= 2 && b.length >= 4, true))
  )
)

const skipSuite = pipe(
  M.suite("skip suite")(
    M.testM(
      "dummy",
      T.sync(() => M.assert.deepStrictEqual(1, 1))
    )
  ),
  M.withSkip(true)
)

const skip2Suite = pipe(
  M.suite("skip 2 suite")(
    M.testM(
      "dummy2",
      T.sync(() => M.assert.deepStrictEqual(1, 1))
    ),
    pipe(
      M.testM(
        "dummy3",
        T.sync(() => M.assert.deepStrictEqual(1, 1))
      ),
      M.withSkip(false)
    )
  ),
  M.withSkip(true)
)

process.env["EXAMPLE_ENV"] = "demo"

const envSuite = M.suite("env suite")(
  pipe(
    M.testM(
      "skip because env not defined",
      T.sync(() => M.assert.deepStrictEqual(1, 1))
    ),
    M.withEnvFilter("jioejiofjioewjsalcs")(O.isSome)
  ),
  pipe(
    M.testM(
      "not skip because env is demo",
      T.sync(() => M.assert.deepStrictEqual(1, 1))
    ),
    M.withEnvFilter("EXAMPLE_ENV")((x) => O.isSome(x) && x.value === "demo")
  )
)

const pendingSuite = M.suite("pending suite")(M.testM("should ignore not implemented"))

const provideSum = T.provide<Sum>({
  sum: {
    a: 1,
    b: 2,
    e: 3
  }
})

const provideMul = T.provide<Mul>({
  mul: {
    a: 2,
    b: 3,
    e: 6
  }
})

const provideSub = T.provide<Sub>({
  sub: {
    a: 3,
    b: 2,
    e: 1
  }
})

const provideDiv = T.provide<Div>({
  div: {
    a: 6,
    b: 3,
    e: 2
  }
})

export interface OverProvide {
  over: {}
}

const provideOver = T.provide<OverProvide>({
  over: {}
})

const combined = combine()
  .with(provideSub)
  .with(provideSum)
  .with(provideDiv)
  .with(M.provideGenerator)
  .with(provideOver)
  .done()

M.customRun({
  describe,
  it: {
    run: it,
    skip: it.skip,
    todo: it.todo
  }
})(
  pipe(comboSuite, M.withProvider(provideMul), M.withTimeout(300)),
  pipe(flackySuite, M.withRetryPolicy(limitRetries(100))),
  genSuite,
  skipSuite,
  skip2Suite,
  envSuite,
  pendingSuite
)(combined)
