import { array, either, stateReaderTaskEither as SRTE, taskEither as TE } from "fp-ts"

import { effect as T, exit as ex } from "../src"
import { applicative } from "../src/Compatibility"
import { pipe } from "../src/Function"

describe("imports from fp-ts can compile", () => {
  test("using array module", async () => {
    const arrSeq = array.sequence(applicative(T.par(T.effect)))
    const program = arrSeq([T.pure(0), T.pure(1)])

    expect(await T.runToPromiseExit(program)).toStrictEqual(ex.done([0, 1]))
  })

  test("using StateReaderTaskEither module", async () => {
    const srte = pipe(
      SRTE.of<number, { inc: (x: number) => number }, string, number>(123),
      SRTE.chain((v) => (s) => ({ inc }) => TE.right([2 * v, inc(s)]))
    )

    const result = await SRTE.run(srte, 0, { inc: (x) => x + 1 })
    expect(result).toStrictEqual(either.right([246, 1]))
  })
})
