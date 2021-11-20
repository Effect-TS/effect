import { Tagged } from "../src/Case"
import * as T from "../src/Effect"
import { State } from "../src/Effect/State"
import * as E from "../src/Either"
import { pipe } from "../src/Function"

describe("State", () => {
  it("should use state", async () => {
    class Count extends Tagged("@local/Count")<{
      readonly count: number
    }> {
      static of = (n: number) => new Count({ count: n })
    }

    const CountState = State<Count>(Count._tag)
    const EitherState = State<E.Either<never, Count>>(`Either<Never, ${Count._tag}>`)

    const program = T.gen(function* (_) {
      const x = yield* _(CountState.get)
      const y = yield* _(EitherState.get)

      if (y._tag === "Right") {
        yield* _(CountState.set(x.copy({ count: x.count + y.right.count })))
      }

      yield* _(CountState.set(x.copy({ count: x.count + 1 })))

      yield* _(CountState.update((_) => _.copy({ count: _.count + 1 })))

      return yield* _(CountState.get)
    })

    const result = await pipe(
      program,
      T.provideSomeLayer(
        CountState.Live(Count.of(0))["+++"](EitherState.Live(E.right(Count.of(0))))
      ),
      T.runPromise
    )

    expect(result.count).toEqual(2)
  })
})
