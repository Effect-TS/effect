import * as assert from "assert"

import { effect as T } from "../src"
import { array } from "../src/Array"
import { Do } from "../src/Do"
import { pipe } from "../src/Function"

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
      array.sequence(T.par(T.effect))([
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
