import { has } from "../../src/Classic/Has"
import * as T from "../../src/Effect"
import * as Ref from "../../src/Effect/Ref"
import { pipe } from "../../src/Function"

class ConsoleService {
  logN(n: number) {
    return T.effectTotal(() => {
      console.log(`Number: ${n}`)
    })
  }
}

interface Console extends ConsoleService {}
const Console = has<Console>()

const program = T.gen(function* (_) {
  const { logN } = yield* _(Console)

  const ref = yield* _(Ref.makeRef(0))

  while ((yield* _(ref.get)) < 10) {
    yield* _(
      pipe(
        ref,
        Ref.modify((n) => [n, n + 1]),
        T.delay(100),
        T.chain(logN)
      )
    )
  }

  yield* _(pipe(ref.get, T.chain(logN)))
})

test("21", async () => {
  const f = jest.fn()
  await pipe(
    program,
    T.provideService(Console)({
      logN: (n) =>
        T.effectTotal(() => {
          f(n)
        })
    }),
    T.runPromiseExit
  )

  expect(f.mock.calls).toEqual([[0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10]])
})
