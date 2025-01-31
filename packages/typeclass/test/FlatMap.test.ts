import * as OptionInstances from "@effect/typeclass/data/Option"
import * as _ from "@effect/typeclass/FlatMap"
import { describe, it } from "@effect/vitest"
import { pipe } from "effect/Function"
import * as O from "effect/Option"
import * as U from "./util.js"

describe.concurrent("FlatMap", () => {
  it("flatten", () => {
    const flatten = _.flatten(OptionInstances.FlatMap)
    U.deepStrictEqual(pipe(O.none(), flatten), O.none())
    U.deepStrictEqual(pipe(O.some(O.none()), flatten), O.none())
    U.deepStrictEqual(pipe(O.some(O.some(1)), flatten), O.some(1))
  })

  it("andThen", () => {
    const andThen = _.zipRight(OptionInstances.FlatMap)
    U.deepStrictEqual(pipe(O.none(), andThen(O.none())), O.none())
    U.deepStrictEqual(pipe(O.none(), andThen(O.some(2))), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThen(O.none())), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThen(O.some(2))), O.some(2))
  })

  it("composeK", () => {
    const composeK = _.composeK(OptionInstances.FlatMap)
    const f = (s: string): O.Option<number> => s.length > 0 ? O.some(s.length) : O.none()
    const g = (n: number): O.Option<number> => n > 1 ? O.some(n) : O.none()
    const h = pipe(f, composeK(g))
    U.deepStrictEqual(h(""), O.none())
    U.deepStrictEqual(h("a"), O.none())
    U.deepStrictEqual(h("aa"), O.some(2))
  })
})
