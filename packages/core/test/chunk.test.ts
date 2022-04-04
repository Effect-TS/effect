import { pipe } from "@effect-ts/core/Function"
import { Chunk, Equal } from "@effect-ts/core/index.js"

it("should uniq", () => {
  const res = pipe(
    Chunk.from(["a", "b", "a", "c", "c"]),
    Chunk.uniq(Equal.string),
    Chunk.toArray
  )
  expect(res).toEqual(["a", "b", "c"])
})
