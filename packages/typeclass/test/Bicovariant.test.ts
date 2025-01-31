import * as _ from "@effect/typeclass/Bicovariant"
import * as ArrayInstances from "@effect/typeclass/data/Array"
import * as EitherInstances from "@effect/typeclass/data/Either"
import { describe, it } from "@effect/vitest"
import * as E from "effect/Either"
import { pipe } from "effect/Function"
import * as U from "./util.js"

describe.concurrent("Bicovariant", () => {
  it("mapLeft", () => {
    const mapLeft = _.mapLeft(EitherInstances.Bicovariant)
    const f = (s: string) => s.length
    U.deepStrictEqual(pipe(E.right(1), mapLeft(f)), E.right(1))
    U.deepStrictEqual(pipe(E.left("eee"), mapLeft(f)), E.left(3))
  })

  it("map", () => {
    const map = _.map(EitherInstances.Bicovariant)
    const g = (n: number) => n * 2
    U.deepStrictEqual(pipe(E.right(1), map(g)), E.right(2))
    U.deepStrictEqual(pipe(E.left("eee"), map(g)), E.left("eee"))
  })

  it("bimapComposition", () => {
    const bimap = _.bimapComposition(ArrayInstances.Covariant, EitherInstances.Bicovariant)
    const f = (s: string) => s.length
    const g = (n: number) => n * 2
    U.deepStrictEqual(bimap([E.right(1), E.right(2), E.left("eee")], f, g), [
      E.right(2),
      E.right(4),
      E.left(3)
    ])
  })
})
