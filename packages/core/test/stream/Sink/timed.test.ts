import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Clock } from "../../../src/io/Clock"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("timed", () => {
    it("should time execution of a sink", async () => {
      const program = Stream.fromIterable(Chunk(1, 10))
        .mapEffect((i) => Clock.sleep(10).as(i))
        .run(Sink.timed())

      const result = await program.unsafeRunPromise()

      expect(result.milliseconds).toBeGreaterThanOrEqual(10)
    })
  })
})
