import { range } from "../src/Collections/Immutable/Array"
import * as Chunk from "../src/Collections/Immutable/Chunk"
import { Tuple } from "../src/Collections/Immutable/Tuple"
import * as E from "../src/Either"
import { pipe } from "../src/Function"
import * as Sy from "../src/Sync"

describe("Sync", () => {
  it("tupled", () => {
    const program = Sy.tuple(Sy.succeed(0), Sy.succeed("ok"), Sy.fail("e"))
    expect(pipe(program, Sy.runEither)).toEqual(E.left("e"))

    expect(Sy.run(Sy.tuple(Sy.succeed(0), Sy.succeed("ok")))).toEqual(
      new Tuple([0, "ok"])
    )
  })

  it("forEach", () => {
    const f = Sy.forEach_(range(0, 100), (n: number) => Sy.succeedWith(() => n + 1))
    const a = Sy.run(f)
    const b = Sy.run(f)
    expect(Chunk.toArray(a)).toEqual(Chunk.toArray(b))
    expect(Chunk.toArray(b)).toEqual(range(1, 101))
  })
})
