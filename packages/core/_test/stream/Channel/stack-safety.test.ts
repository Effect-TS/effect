import { List } from "../../../src/collection/immutable/List"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("stack safety", () => {
    it("mapOut is stack safe", async () => {
      const N = 10_000

      const program = List.range(1, N + 1)
        .reduce(Channel.write(1), (channel, n) => channel.mapOut((_) => _ + n))
        .runCollect()

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      expect(chunk.unsafeHead()).toBe(List.range(1, N + 1).reduce(1, (a, b) => a + b))
    })

    it("concatMap is stack safe", async () => {
      const N = 10_000

      const program = List.range(1, N + 1)
        .reduce(Channel.write(1), (channel, n) =>
          channel.concatMap(() => Channel.write(n)).asUnit()
        )
        .runCollect()

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      expect(chunk.unsafeHead()).toBe(N)
    })

    it("flatMap is stack safe", async () => {
      const N = 10_000

      const program = List.range(1, N + 1)
        .reduce(Channel.write(0), (channel, n) =>
          channel.flatMap(() => Channel.write(n))
        )
        .runCollect()

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual(List.range(0, N + 1).toArray())
    })
  })
})
