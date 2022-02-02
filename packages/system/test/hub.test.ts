import { pipe } from "@effect-ts/system/Function"

import * as AR from "../src/Collections/Immutable/Array"
import * as Chunk from "../src/Collections/Immutable/Chunk"
import * as T from "../src/Effect"
import * as F from "../src/Fiber"
import * as H from "../src/Hub"
import * as M from "../src/Managed"
import * as P from "../src/Promise"
import * as Q from "../src/Queue"

describe("Hub", () => {
  it("do one to many", async () => {
    const as = AR.range(1, 10)

    const { values1, values2 } = await pipe(
      T.gen(function* (_) {
        const promise1 = yield* _(P.make<never, void>())
        const promise2 = yield* _(P.make<never, void>())
        const hub = yield* _(H.makeUnbounded<number>())
        const subscriber1 = yield* _(
          pipe(
            H.subscribe(hub),
            M.use((subscription) =>
              T.zipRight_(
                P.succeed_(promise1, undefined),
                T.forEach_(as, (_) => Q.take(subscription))
              )
            ),
            T.fork
          )
        )
        const subscriber2 = yield* _(
          pipe(
            H.subscribe(hub),
            M.use((subscription) =>
              T.zipRight_(
                P.succeed_(promise2, undefined),
                T.forEach_(as, (_) => Q.take(subscription))
              )
            ),
            T.fork
          )
        )

        yield* _(P.await(promise1))
        yield* _(P.await(promise2))

        yield* _(T.fork(T.forEach_(as, (a) => H.publish_(hub, a))))

        return {
          values1: yield* _(F.join(subscriber1)),
          values2: yield* _(F.join(subscriber2))
        }
      }),
      T.runPromise
    )

    expect(Chunk.toArray(values1)).toEqual(as)
    expect(Chunk.toArray(values2)).toEqual(as)
  })
})
