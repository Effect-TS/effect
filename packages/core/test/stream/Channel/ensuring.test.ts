import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("ensuring", () => {
    it("prompt closure between continuations", async () => {
      const program = Ref.make(List.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((list) => list.append(label))
        const channel =
          Channel.fromEffect(event("Acquire1"))
            .ensuring(event("Release11"))
            .ensuring(event("Release12")) >
          Channel.fromEffect(event("Acquire2")).ensuring(event("Release2"))
        return channel.runDrain() > events.get()
      })

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(
        List("Acquire1", "Release11", "Release12", "Acquire2", "Release2")
      )
    })

    it("last finalizers are deferred to the Managed", async () => {
      const program = Ref.make(List.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((list) => list.append(label))
        const channel = (
          Channel.fromEffect(event("Acquire1"))
            .ensuring(event("Release11"))
            .ensuring(event("Release12")) >
          Channel.fromEffect(event("Acquire2")).ensuring(event("Release2"))
        ).ensuring(event("ReleaseOuter"))

        return channel
          .toPull()
          .use((pull) => pull.exit() > events.get())
          .flatMap((eventsInManaged) =>
            events
              .get()
              .map((eventsAfterManaged) => Tuple(eventsInManaged, eventsAfterManaged))
          )
      })

      const {
        tuple: [before, after]
      } = await program.unsafeRunPromise()

      expect(before.toArray()).toEqual([
        "Acquire1",
        "Release11",
        "Release12",
        "Acquire2"
      ])
      expect(after.toArray()).toEqual([
        "Acquire1",
        "Release11",
        "Release12",
        "Acquire2",
        "Release2",
        "ReleaseOuter"
      ])
    })

    it("mixture of concatMap and ensuring", async () => {
      const program = Ref.make(List.empty<string>()).flatMap((events) => {
        const event = (label: string) => events.update((list) => list.append(label))

        const conduit = Channel.writeAll(1, 2, 3)
          .ensuring(event("Inner"))
          .concatMap((i) => Channel.write({ first: i }).ensuring(event("First write")))
          .ensuring(event("First concatMap"))
          .concatMap((i) =>
            Channel.write({ second: i }).ensuring(event("Second write"))
          )
          .ensuring(event("Second concatMap"))

        return conduit.runCollect().zipFlatten(events.get())
      })

      const {
        tuple: [elements, _, events]
      } = await program.unsafeRunPromise()

      expect(events.toArray()).toEqual([
        "Second write",
        "First write",
        "Second write",
        "First write",
        "Second write",
        "First write",
        "Inner",
        "First concatMap",
        "Second concatMap"
      ])
      expect(elements.toArray()).toEqual([
        { second: { first: 1 } },
        { second: { first: 2 } },
        { second: { first: 3 } }
      ])
    })

    it("finalizer ordering 2", async () => {
      const program = Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .bindValue(
          "push",
          ({ effects }) =>
            (label: string) =>
              effects.update((list) => list.append(label))
        )
        .tap(({ push }) =>
          Channel.writeAll(1, 2)
            .mapOutEffect((n) => push(`pulled ${n}`).as(n))
            .concatMap((n) => Channel.write(n).ensuring(push(`close ${n}`)))
            .runDrain()
        )
        .flatMap(({ effects }) => effects.get())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(["pulled 1", "close 1", "pulled 2", "close 2"])
    })
  })
})
