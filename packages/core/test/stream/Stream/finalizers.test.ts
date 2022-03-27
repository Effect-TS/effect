import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("ensuring", () => {
    it("runs finalizers in the correct order", async () => {
      const event = (label: string) => (list: List<string>) => list.prepend(label)
      const program = Effect.Do()
        .bind("log", () => Ref.make(List.empty<string>()))
        .tap(({ log }) =>
          Stream.acquireReleaseWith(log.update(event("acquire")), () =>
            log.update(event("release"))
          )
            .flatMap(() => Stream.fromEffect(log.update(event("use"))))
            .ensuring(log.update(event("ensuring")))
            .runDrain()
        )
        .flatMap(({ log }) => log.get())

      const result = await program.unsafeRunPromise()

      expect(result.reverse().toArray()).toEqual([
        "acquire",
        "use",
        "release",
        "ensuring"
      ])
    })
  })
})
