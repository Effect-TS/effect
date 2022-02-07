import * as A from "../src/Collections/Immutable/Chunk/index.js"
import * as T from "../src/Effect/index.js"
import { pipe } from "../src/Function/index.js"
import * as S from "../src/Stream/index.js"
import * as SK from "../src/Stream/Sink/index.js"

describe("Sink", () => {
  describe("collectAllToMap", () => {
    it("does not dupe", async () => {
      const stream = S.fromChunk(
        A.make("one", "two", "three", "three", "three", "four", "five")
      )
      const sink = SK.collectAllToMap((k: string) => `key-${k}`)((a, b) => `${a} ${b}`)

      const firstRun = await pipe(stream, S.run(sink), T.runPromise)
      const secondRun = await pipe(stream, S.run(sink), T.runPromise)

      expect(firstRun).toEqual(secondRun)
    })
  })
})
