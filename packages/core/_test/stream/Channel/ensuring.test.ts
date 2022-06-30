import { First, Second } from "@effect/core/test/stream/Channel/test-utils"

describe.concurrent("Channel", () => {
  describe.concurrent("ensuring", () => {
    it("prompt closure between continuations", async () => {
      const program = Ref.make(Chunk.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((chunk) => chunk.append(label))
        const channel = Channel.fromEffect(event("Acquire1"))
          .ensuring(event("Release11"))
          .ensuring(event("Release12")) >
          Channel.fromEffect(event("Acquire2")).ensuring(event("Release2"))
        return channel.runDrain > events.get()
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("Acquire1", "Release11", "Release12", "Acquire2", "Release2"))
    })

    it("last finalizers are deferred to the Managed", async () => {
      const program = Ref.make(Chunk.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((chunk) => chunk.append(label))
        const channel = (
          Channel.fromEffect(event("Acquire1"))
            .ensuring(event("Release11"))
            .ensuring(event("Release12")) >
            Channel.fromEffect(event("Acquire2")).ensuring(event("Release2"))
        ).ensuring(event("ReleaseOuter"))

        return Effect.scoped(
          channel.toPull.flatMap((pull) => pull.exit > events.get())
        ).flatMap((eventsInManaged) =>
          events
            .get()
            .map((eventsAfterManaged) => Tuple(eventsInManaged, eventsAfterManaged))
        )
      })

      const {
        tuple: [before, after]
      } = await program.unsafeRunPromise()

      assert.isTrue(
        before == Chunk(
          "Acquire1",
          "Release11",
          "Release12",
          "Acquire2"
        )
      )
      assert.isTrue(
        after == Chunk(
          "Acquire1",
          "Release11",
          "Release12",
          "Acquire2",
          "Release2",
          "ReleaseOuter"
        )
      )
    })

    it("mixture of concatMap and ensuring", async () => {
      const program = Ref.make(Chunk.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((chunk) => chunk.append(label))

        const conduit = Channel.writeAll(1, 2, 3)
          .ensuring(event("Inner"))
          .concatMap((i) => Channel.write(new First(i)).ensuring(event("First write")))
          .ensuring(event("First concatMap"))
          .concatMap((i) => Channel.write(new Second(i)).ensuring(event("Second write")))
          .ensuring(event("Second concatMap"))

        return conduit.runCollect.zipFlatten(events.get())
      })

      const {
        tuple: [elements, _, events]
      } = await program.unsafeRunPromise()

      assert.isTrue(
        events == Chunk(
          "Second write",
          "First write",
          "Second write",
          "First write",
          "Second write",
          "First write",
          "Inner",
          "First concatMap",
          "Second concatMap"
        )
      )
      assert.isTrue(
        elements == Chunk(
          new Second(new First(1)),
          new Second(new First(2)),
          new Second(new First(3))
        )
      )
    })

    it("finalizer ordering 2", async () => {
      const program = Effect.Do()
        .bind("effects", () => Ref.make(Chunk.empty<string>()))
        .bindValue(
          "push",
          ({ effects }) => (label: string) => effects.update((chunk) => chunk.append(label))
        )
        .tap(({ push }) =>
          Channel.writeAll(1, 2)
            .mapOutEffect((n) => push(`pulled ${n}`).as(n))
            .concatMap((n) => Channel.write(n).ensuring(push(`close ${n}`)))
            .runDrain
        )
        .flatMap(({ effects }) => effects.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("pulled 1", "close 1", "pulled 2", "close 2"))
    })
  })
})
