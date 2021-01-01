import * as T from "../src/Effect"
import { flow, pipe } from "../src/Function"

const addOne = (n: number) => T.effectTotal(() => n + 1)
it("should not break", async () => {
  expect(
    await pipe(
      T.gen(function* (_) {
        const f = flow(addOne, T.andThen(T.succeed(yield* _(T.succeed(0)))))
        return yield* _(f(0))
      }),
      T.runPromise
    )
  ).toEqual(0)
})
