import { MergeDecision } from "@effect/core/stream/Channel/MergeDecision"

describe.concurrent("Channel", () => {
  describe.concurrent("mergeWith", () => {
    it("simple merge", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .mergeWith(
          Channel.writeAll(4, 5, 6),
          (exit) => MergeDecision.awaitConst(Effect.done(exit)),
          (exit) => MergeDecision.awaitConst(Effect.done(exit))
        )
        .runCollect

      const [chunk, _] = await program.unsafeRunPromise()

      assert.isTrue(chunk == Chunk(1, 2, 3, 4, 5, 6))
    })

    it("merge with different types", async () => {
      const left = Channel.write(1).flatMap(() =>
        Channel.fromEffect(
          Effect.attempt("whatever").refineOrDie((e) =>
            e instanceof RuntimeError ? Maybe.some(e) : Maybe.none
          )
        )
      )
      const right = Channel.write(2).flatMap(() =>
        Channel.fromEffect(
          Effect.attempt(true).refineOrDie((e) =>
            e instanceof IllegalStateException ? Maybe.some(e) : Maybe.none
          )
        )
      )
      const program = left
        .mergeWith(
          right,
          (exit) => MergeDecision.await((exit2) => Effect.done(exit.zip(exit2))),
          (exit2) => MergeDecision.await((exit) => Effect.done(exit.zip(exit2)))
        )
        .runCollect

      const [chunk, result] = await program.unsafeRunPromise()

      assert.isTrue(chunk == Chunk(1, 2))
      assert.strictEqual(result[0], "whatever")
      assert.isTrue(result[1])
    })

    it("handles polymorphic failures", async () => {
      const left = Channel.write(1).flatMap(() => Channel.failSync("boom").as(true))
      const right = Channel.write(2).flatMap(() => Channel.failSync(true).as(true))
      const program = left
        .mergeWith(
          right,
          (exit) =>
            MergeDecision.await((exit2) =>
              Effect.done(exit).flip.zip(Effect.done(exit2).flip).flip
            ),
          (exit2) =>
            MergeDecision.await((exit) => Effect.done(exit).flip.zip(Effect.done(exit2).flip).flip)
        )
        .runDrain

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Tuple("boom", true)))
    })

    it("interrupts losing side", async () => {
      const program = Deferred.make<never, void>().flatMap((latch) =>
        Ref.make(false).flatMap((interrupted) => {
          const left = Channel.write(1).flatMap(() =>
            Channel.fromEffect(
              (latch.succeed(undefined) > Effect.never).onInterrupt(() => interrupted.set(true))
            )
          )
          const right = Channel.write(2).flatMap(() => Channel.fromEffect(latch.await))
          const merged = left.mergeWith(
            right,
            (exit) => MergeDecision.done(Effect.done(exit)),
            () =>
              MergeDecision.done(
                interrupted
                  .get
                  .flatMap((b) => (b ? Effect.unit : Effect.failSync(undefined)))
              )
          )
          return merged.runDrain
        })
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.isSuccess())
    })
  })
})
