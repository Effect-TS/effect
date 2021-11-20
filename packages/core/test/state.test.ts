import { Tagged } from "../src/Case"
import * as T from "../src/Effect"
import { State } from "../src/Effect/State"
import { pipe } from "../src/Function"

describe("State", () => {
  it("should use state", async () => {
    class Count extends Tagged("Count")<{
      readonly count: number
    }> {
      static of = (n: number) => new Count({ count: n })
    }

    const CountState = State<Count>("Count")

    const program = T.gen(function* (_) {
      const x = yield* _(CountState.get)

      yield* _(CountState.set(x.copy({ count: x.count + 1 })))

      yield* _(CountState.update((_) => _.copy({ count: _.count + 1 })))

      return yield* _(CountState.get)
    })

    const result = await pipe(
      program,
      T.provideSomeLayer(CountState.Live(Count.of(0))),
      T.runPromise
    )

    expect(result.count).toEqual(2)
  })
})
