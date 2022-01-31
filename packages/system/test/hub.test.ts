import { pipe } from "@effect-ts/system/Function/index.js"

import * as AR from "../src/Collections/Immutable/Array/index.js"
import * as Chunk from "../src/Collections/Immutable/Chunk/index.js"
import * as T from "../src/Effect/index.js"
import * as F from "../src/Fiber/index.js"
import * as H from "../src/Hub/index.js"
import * as M from "../src/Managed/index.js"
import * as P from "../src/Promise/index.js"
import * as Q from "../src/Queue/index.js"

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
