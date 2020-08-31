import * as T from "../src/Effect"
import * as Exit from "../src/Exit"
import { flow, identity, pipe } from "../src/Function"
import * as O from "../src/Option"
import * as R from "../src/Ref"
import * as BufferedPull from "../src/Stream/BufferedPull"
import * as Pull from "../src/Stream/Pull"

describe("Stream", () => {
  describe("BufferedPull", () => {
    it("pullArray", () => {
      const program = pipe(
        R.makeRef(0),
        T.chain(
          flow(
            R.modify((i): [T.SyncE<O.Option<never>, readonly number[]>, number] => [
              i < 5 ? T.succeed([i]) : T.fail(O.none),
              i + 1
            ]),
            T.flatten,
            BufferedPull.make
          )
        ),
        T.zip(T.succeed([] as number[])),
        T.chain(([bp, res]) =>
          T.catchAll_(
            T.repeatWhile_(
              BufferedPull.ifNotDone(
                T.foldM_(
                  T.chain_(BufferedPull.pullArray(bp), (a) => {
                    res.push(...a)
                    return T.succeed(a)
                  }),
                  O.fold(() => Pull.end, Pull.fail),
                  () => T.succeed(true)
                )
              )(bp),
              identity
            ),
            () => T.succeed(res)
          )
        )
      )

      expect(T.runSyncExit(program)).toEqual(Exit.succeed([0, 1, 2, 3, 4]))
    })
  })
})
