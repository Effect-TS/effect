import * as OptionInstances from "@effect/typeclass/data/Option"
import * as PredicateInstances from "@effect/typeclass/data/Predicate"
import * as StringInstances from "@effect/typeclass/data/String"
import * as _ from "@effect/typeclass/Invariant"
import * as Semigroup from "@effect/typeclass/Semigroup"
import { describe, it } from "@effect/vitest"
import { pipe } from "effect/Function"
import * as O from "effect/Option"
import * as String from "effect/String"
import * as U from "./util.js"

describe.concurrent("Invariant", () => {
  it("imapComposition", () => {
    const imap = _.imapComposition(Semigroup.Invariant, OptionInstances.Invariant)
    const S = imap(
      OptionInstances.getOptionalMonoid(StringInstances.Semigroup),
      (s) => [s],
      ([s]) => s
    )
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
      const bindTo = _.bindTo(OptionInstances.Invariant)
      U.deepStrictEqual(pipe(O.none(), bindTo("a")), O.none())
      U.deepStrictEqual(pipe(O.some(1), bindTo("a")), O.some({ a: 1 }))
    })

    it("Contravariant (Predicate)", () => {
      const bindTo = _.bindTo(PredicateInstances.Invariant)
      const p = pipe(String.isString, bindTo("a"))
      U.deepStrictEqual(p({ a: "a" }), true)
      U.deepStrictEqual(p({ a: 1 }), false)
    })
  })

  describe.concurrent("tupled", () => {
    it("Covariant (Option)", () => {
      const tupled = _.tupled(OptionInstances.Invariant)
      U.deepStrictEqual(pipe(O.none(), tupled), O.none())
      U.deepStrictEqual(pipe(O.some(1), tupled), O.some([1]))
    })

    it("Contravariant (Predicate)", () => {
      const tupled = _.tupled(PredicateInstances.Invariant)
      const p = pipe(String.isString, tupled)
      U.deepStrictEqual(p(["a"]), true)
      U.deepStrictEqual(p([1]), false)
    })
  })
})
