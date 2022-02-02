import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"

import * as T from "../../src/Effect/index.js"
import * as Ref from "../../src/Effect/Ref/index.js"
import { pipe } from "../../src/Function/index.js"
import { tag } from "../../src/Has/index.js"

const ConsoleServiceId = Symbol()

class ConsoleService {
  logN(n: number) {
    return T.succeedWith(() => {
      console.log(`Number: ${n}`)
    })
  }
}

interface Console extends ConsoleService {}
const Console = tag<Console>(ConsoleServiceId)

const program = T.gen(function* (_) {
  const { logN } = yield* _(Console)

  const ref = yield* _(Ref.makeRef(0))

  while ((yield* _(ref.get)) < 10) {
    yield* _(
      pipe(
        ref,
        Ref.modify((n) => Tp.tuple(n, n + 1)),
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
        T.succeedWith(() => {
          f(n)
        })
    }),
    T.runPromiseExit
  )

  expect(f.mock.calls).toEqual([[0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10]])
})
