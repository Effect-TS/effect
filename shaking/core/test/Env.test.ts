import * as assert from "assert"

import { Do } from "fp-ts-contrib/lib/Do"
import { array } from "fp-ts/lib/Array"
import { pipe } from "fp-ts/lib/pipeable"

import { effect as T } from "../src"

const foo: unique symbol = Symbol()
const bar: unique symbol = Symbol()

interface TestEnv {
  [foo]: string
}

interface TestEnv2 {
  [bar]: string
}

describe("Env", () => {
  it("merge env", async () => {
    const program = T.accessM(({ [bar]: barS, [foo]: fooS }: TestEnv & TestEnv2) =>
      T.sync(() => `${fooS}-${barS}`)
    )

    const result = await T.runToPromise(
      pipe(
        program,
        T.provide<TestEnv & TestEnv2>({ [foo]: "foo", [bar]: "bar" })
      )
    )

    assert.deepStrictEqual(result, "foo-bar")
  })
  it("env should work", async () => {
    const res = await T.runToPromise(
      Do(T.effect)
        .bindL("a", () =>
          T.provide({ [foo]: "a" })(
            T.delay(
              T.access(({ [foo]: s }: TestEnv) => s),
              100
            )
          )
        )
        .bindL("b", () =>
          T.provide<TestEnv>({ [foo]: "b" })(T.access(({ [foo]: s }: TestEnv) => s))
        )
        .return((s) => `${s.a} - ${s.b}`)
    )

    assert.deepStrictEqual(res, "a - b")
  })

  it("env should work - par", async () => {
    const res = await T.runToPromise(
      array.sequence(T.parEffect)([
        T.provide({ [foo]: "a" })(
          T.delay(
            T.access(({ [foo]: s }: TestEnv) => s),
            1000
          )
        ),
        T.provide<TestEnv>({ [foo]: "b" })(T.access(({ [foo]: s }: TestEnv) => s))
      ])
    )

    assert.deepStrictEqual(res.join(" - "), "a - b")
  })
})
