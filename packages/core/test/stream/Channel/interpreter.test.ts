import { Tuple } from "packages/core/src/collection/immutable/Tuple"

import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Exit } from "../../../src/io/Exit"
import { Ref } from "../../../src/io/Ref"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  it("succeed", async () => {
    const program = Channel.succeed(1).runCollect()

    const {
      tuple: [chunk, z]
    } = await program.unsafeRunPromise()

    expect(chunk.isEmpty()).toBe(true)
    expect(z).toBe(1)
  })

  it("fail", async () => {
    const program = Channel.fail("uh oh").runCollect()

    const result = await program.unsafeRunPromiseExit()

    expect(result.untraced()).toEqual(Exit.fail("uh oh"))
  })

  it("map", async () => {
    const program = Channel.succeed(1)
      .map((n) => n + 1)
      .runCollect()

    const {
      tuple: [chunk, z]
    } = await program.unsafeRunPromise()

    expect(chunk.isEmpty()).toBe(true)
    expect(z).toBe(2)
  })

  describe("flatMap", () => {
    it("simple", async () => {
      const program = Channel.Do()
        .bind("x", () => Channel.succeed(1))
        .bind("y", ({ x }) => Channel.succeed(x * 2))
        .bind("z", ({ x, y }) => Channel.succeed(x + y))
        .map(({ x, y, z }) => x + y + z)
        .runCollect()

      const {
        tuple: [chunk, z]
      } = await program.unsafeRunPromise()

      expect(chunk.isEmpty()).toBe(true)
      expect(z).toBe(6)
    })

    it("structure confusion", async () => {
      const program = Channel.write(Chunk(1, 2))
        .concatMap((chunk) => Channel.writeAll(chunk))
        .zipRight(Channel.fail("hello"))
        .runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("hello"))
    })
  })

  describe("catchAll", () => {
    it("structure confusion", async () => {
      const program = Channel.write(8)
        .catchAll(() => Channel.write(0).concatMap(() => Channel.fail("error1")))
        .concatMap(() => Channel.fail("error2"))
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error2"))
    })
  })

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
  })
})
