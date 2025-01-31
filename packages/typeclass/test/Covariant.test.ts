import * as _ from "@effect/typeclass/Covariant"
import * as ArrayInstances from "@effect/typeclass/data/Array"
import * as OptionInstances from "@effect/typeclass/data/Option"
import { describe, it } from "@effect/vitest"
import { pipe } from "effect/Function"
import * as O from "effect/Option"

import * as U from "./util.js"

describe.concurrent("Covariant", () => {
  it("mapComposition", () => {
    const map = _.mapComposition(ArrayInstances.Covariant, ArrayInstances.Covariant)
    const f = (a: string) => a + "!"
    U.deepStrictEqual(map([], f), [])
    U.deepStrictEqual(map([[]], f), [[]])
    U.deepStrictEqual(map([["a"]], f), [["a!"]])
    U.deepStrictEqual(map([["a"], ["b"]], f), [["a!"], ["b!"]])
    U.deepStrictEqual(map([["a", "c"], ["b", "d", "e"]], f), [["a!", "c!"], [
      "b!",
      "d!",
      "e!"
    ]])
  })

  it("flap", () => {
    const flap = _.flap(OptionInstances.Covariant)
    U.deepStrictEqual(pipe(1, flap(O.none())), O.none())
    U.deepStrictEqual(pipe(1, flap(O.some(U.double))), O.some(2))
  })

  it("as", () => {
    const as = _.as(OptionInstances.Covariant)
    U.deepStrictEqual(pipe(O.none(), as(1)), O.none())
    U.deepStrictEqual(pipe(O.some(1), as(2)), O.some(2))
  })

  it("asVoid", () => {
    const asVoid = _.asVoid(OptionInstances.Covariant)
    U.deepStrictEqual(pipe(O.none(), asVoid), O.none())
    U.deepStrictEqual(pipe(O.some(1), asVoid), O.some(undefined))
  })

  it("let", () => {
    const letOption = _.let(OptionInstances.Covariant)
    U.deepStrictEqual(
      pipe(O.some({ a: 1, b: 2 }), letOption("c", ({ a, b }) => a + b)),
      O.some({ a: 1, b: 2, c: 3 })
    )
  })

  it("imap", () => {
    const f = _.imap<O.OptionTypeLambda>(O.map)((s: string) => [s], ([s]) => s)
    U.deepStrictEqual(pipe(O.none(), f), O.none())
    U.deepStrictEqual(pipe(O.some("a"), f), O.some(["a"]))
  })
})
