import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as P from "@effect/data/Predicate"
import * as String from "@effect/data/String"
import * as _ from "@effect/typeclass/Invariant"
import * as semigroup from "@effect/typeclass/Semigroup"
import * as U from "./util"

describe.concurrent("Invariant", () => {
  it("imapComposition", () => {
    const imap = _.imapComposition(semigroup.Invariant, O.Invariant)
    const S = imap(O.getOptionalMonoid(String.Semigroup), (s) => [s], ([s]) => s)
    U.deepStrictEqual(S.combine(O.none(), O.none()), O.none())
    U.deepStrictEqual(S.combine(O.none(), O.some(["b"])), O.some(["b"]))
    U.deepStrictEqual(S.combine(O.some(["a"]), O.none()), O.some(["a"]))
    U.deepStrictEqual(
      S.combine(O.some(["a"]), O.some(["b"])),
      O.some(["ab"])
    )
  })

  describe.concurrent("bindTo", () => {
    it("Covariant (Option)", () => {
      const bindTo = _.bindTo(O.Invariant)
      U.deepStrictEqual(pipe(O.none(), bindTo("a")), O.none())
      U.deepStrictEqual(pipe(O.some(1), bindTo("a")), O.some({ a: 1 }))
    })

    it("Contravariant (Predicate)", () => {
      const bindTo = _.bindTo(P.Invariant)
      const p = pipe(String.isString, bindTo("a"))
      U.deepStrictEqual(p({ a: "a" }), true)
      U.deepStrictEqual(p({ a: 1 }), false)
    })
  })

  describe.concurrent("tupled", () => {
    it("Covariant (Option)", () => {
      const tupled = _.tupled(O.Invariant)
      U.deepStrictEqual(pipe(O.none(), tupled), O.none())
      U.deepStrictEqual(pipe(O.some(1), tupled), O.some([1]))
    })

    it("Contravariant (Predicate)", () => {
      const tupled = _.tupled(P.Invariant)
      const p = pipe(String.isString, tupled)
      U.deepStrictEqual(p(["a"]), true)
      U.deepStrictEqual(p([1]), false)
    })
  })
})
