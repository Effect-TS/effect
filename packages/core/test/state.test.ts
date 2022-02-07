import { Tagged } from "../src/Case/index.js"
import { FiberState } from "../src/Effect/FiberState/index.js"
import * as T from "../src/Effect/index.js"
import { State } from "../src/Effect/State/index.js"
import * as E from "../src/Either/index.js"
import { pipe } from "../src/Function/index.js"

describe("State", () => {
  it("should use fiber state", async () => {
    class Count extends Tagged("@local/Count")<{
      readonly count: number
    }> {}

    const CountState = FiberState<Count>(Count._tag)

    const EitherState = FiberState<E.Either<never, Count>>(
      `Either<Never, ${Count._tag}>`
    )

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
        CountState.Live(Count.make({ count: 0 }))["+++"](
          EitherState.Live(E.right(Count.make({ count: 0 })))
        )
      ),
      T.runPromise
    )

    expect(result.count).toEqual(2)
  })

  it("should use state", async () => {
    class Count extends Tagged("@local/Count")<{
      readonly count: number
    }> {}

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
        CountState.Live(Count.make({ count: 0 }))["+++"](
          EitherState.Live(E.right(Count.make({ count: 0 })))
        )
      ),
      T.runPromise
    )

    expect(result.count).toEqual(2)
  })
})
