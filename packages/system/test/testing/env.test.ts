import * as T from "../../src/Effect"
import * as Ex from "../../src/Exit"
import * as F from "../../src/Fiber"
import { pipe } from "../../src/Function"
import * as Rand from "../../src/Random"
import * as FPT from "../../src/Testing/FibersPerTest"
import { TestClock } from "../../src/Testing/TestClock"
import { TestEnvironment } from "../../src/Testing/TestEnvironment"

it("test env", async () => {
  const res = await pipe(
    T.gen(function* (_) {
      const TC = yield* _(TestClock)

      const sleeping = yield* _(T.fork(T.sleep(10_000)))

      yield* _(TC.adjust(10_000))

      const rand = yield* _(Rand.nextInt)

      expect(rand).equals(3700301897)

      return yield* _(F.join(sleeping))
    }),
    FPT.fibersPerTest,
    T.provideLayer(TestEnvironment),
    T.runPromiseExit
  )

  expect(res).equals(Ex.unit)
})
