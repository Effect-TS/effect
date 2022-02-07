import type * as Cause from "../../src/Cause/index.js"
import * as Chunk from "../../src/Collections/Immutable/Chunk/index.js"
import * as T from "../../src/Effect/index.js"
import * as C from "../../src/Experimental/Stream/Channel/index.js"
import { pipe } from "../../src/Function/index.js"
import * as M from "../../src/Managed/index.js"

function collectLoop<Err, A>(
  state: Chunk.Chunk<A>
): C.Channel<unknown, Err, A, void, Err, never, Chunk.Chunk<A>> {
  return C.readWithCause(
    (i: A) => collectLoop(Chunk.append_(state, i)),
    (e: Cause.Cause<Err>) => C.failCause(e),
    () => C.end(state)
  )
}

export function collect<Err, A>() {
  return collectLoop<Err, A>(Chunk.empty())
}

describe("Channel", () => {
  it("simple drain", async () => {
    const result = await pipe(
      C.write(0),
      C.chain(() => C.write(1)),
      C.pipeTo(collect()),
      C.drain,
      C.runManaged,
      M.useNow,
      T.runPromise
    )

    expect(Chunk.toArray(result)).toEqual([0, 1])
  })
})
