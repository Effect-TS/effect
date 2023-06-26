import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as RA from "@effect/data/ReadonlyArray"
import * as _ from "@effect/typeclass/Bicovariant"
import * as U from "./util"

describe.concurrent("Bicovariant", () => {
  it("mapLeft", () => {
    const mapLeft = _.mapLeft(E.Bicovariant)
    const f = (s: string) => s.length
    U.deepStrictEqual(pipe(E.right(1), mapLeft(f)), E.right(1))
    U.deepStrictEqual(pipe(E.left("eee"), mapLeft(f)), E.left(3))
  })

  it("map", () => {
    const map = _.map(E.Bicovariant)
    const g = (n: number) => n * 2
    U.deepStrictEqual(pipe(E.right(1), map(g)), E.right(2))
    U.deepStrictEqual(pipe(E.left("eee"), map(g)), E.left("eee"))
  })

  it("bimapComposition", () => {
    const bimap = _.bimapComposition(RA.Covariant, E.Bicovariant)
    const f = (s: string) => s.length
    const g = (n: number) => n * 2
    U.deepStrictEqual(bimap([E.right(1), E.right(2), E.left("eee")], f, g), [
      E.right(2),
      E.right(4),
      E.left(3)
    ])
  })
})
