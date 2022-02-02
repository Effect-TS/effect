import "../src/Tracing/Enable"

import { pretty } from "../src/Cause"
import * as T from "../src/Effect"
import { assertsFailure } from "../src/Exit"
import { flow, pipe } from "../src/Function"

const addOne = (n: number) => T.succeedWith(() => n + 1)

it("should not break", async () => {
  expect(
    await pipe(
      T.gen(function* (_) {
        const f = flow(addOne, T.zipRight(T.succeed(yield* _(T.succeed(0)))))
        return yield* _(f(0))
      }),
      T.runPromise
    )
  ).toEqual(0)
})

it("should trace generator", async () => {
  const exit = await pipe(
    T.gen(function* (_) {
      const a = yield* _(T.succeedWith(() => 1))
      const b = yield* _(T.succeed(2))
      return a + b
    }),
    T.chain(T.succeed),
    T.zipRight(T.succeedWith(() => 4)),
    T.chain(T.fail),
    T.runPromiseExit
  )
  assertsFailure(exit)
  console.log(pretty(exit.cause))
})
