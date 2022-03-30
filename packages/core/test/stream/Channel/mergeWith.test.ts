import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { IllegalStateException, RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Channel } from "../../../src/stream/Channel"
import { MergeDecision } from "../../../src/stream/Channel/MergeDecision"

describe("Channel", () => {
  describe("mergeWith", () => {
    it("simple merge", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .mergeWith(
          Channel.writeAll(4, 5, 6),
          (exit) => MergeDecision.awaitConst(Effect.done(exit)),
          (exit) => MergeDecision.awaitConst(Effect.done(exit))
        )
        .runCollect()

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([1, 2, 3, 4, 5, 6])
    })

    it("merge with different types", async () => {
      const left =
        Channel.write(1) >
        Channel.fromEffect(
          Effect.attempt("whatever").refineOrDie((e) =>
            e instanceof RuntimeError ? Option.some(e) : Option.none
          )
        )
      const right =
        Channel.write(2) >
        Channel.fromEffect(
          Effect.attempt(true).refineOrDie((e) =>
            e instanceof IllegalStateException ? Option.some(e) : Option.none
          )
        )
      const program = left
        .mergeWith(
          right,
          (exit) => MergeDecision.await((exit2) => Effect.done(exit.zip(exit2))),
          (exit2) => MergeDecision.await((exit) => Effect.done(exit.zip(exit2)))
        )
        .runCollect()

      const {
        tuple: [chunk, result]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([1, 2])
      expect(result.get(0)).toEqual("whatever")
      expect(result.get(1)).toEqual(true)
    })

    it("handles polymorphic failures", async () => {
      const left = Channel.write(1) > Channel.fail("boom").as(true)
      const right = Channel.write(2) > Channel.fail(true).as(true)
      const program = left
        .mergeWith(
          right,
          (exit) =>
            MergeDecision.await((exit2) =>
              Effect.done(exit).flip().zip(Effect.done(exit2).flip()).flip()
            ),
          (exit2) =>
            MergeDecision.await((exit) =>
              Effect.done(exit).flip().zip(Effect.done(exit2).flip()).flip()
            )
        )
        .runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Tuple("boom", true)))
    })

    it("interrupts losing side", async () => {
      const program = Promise.make<never, void>().flatMap((latch) =>
        Ref.make(false).flatMap((interrupted) => {
          const left =
            Channel.write(1) >
            Channel.fromEffect(
              (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                interrupted.set(true)
              )
            )
          const right = Channel.write(2) > Channel.fromEffect(latch.await())
          const merged = left.mergeWith(
            right,
            (exit) => MergeDecision.done(Effect.done(exit)),
            () =>
              MergeDecision.done(
                interrupted.get.flatMap((b) =>
                  b ? Effect.unit : Effect.fail(undefined)
                )
              )
          )
          return merged.runDrain()
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isSuccess()).toBe(true)
    })
  })
})
