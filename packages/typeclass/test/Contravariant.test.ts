import * as _ from "@effect/typeclass/Contravariant"
import * as PredicateInstances from "@effect/typeclass/data/Predicate"
import { describe, it } from "@effect/vitest"
import * as order from "effect/Order"
import type * as P from "effect/Predicate"
import * as S from "effect/String"
import * as U from "./util.js"

describe.concurrent("Contravariant", () => {
  it("mapComposition", () => {
    const map = _.contramapComposition(
      PredicateInstances.Contravariant,
      PredicateInstances.Contravariant
    )
    const emptyString: P.Predicate<P.Predicate<string>> = (p) => p("") === true
    const a = map(emptyString, (s) => s.length)
    U.deepStrictEqual(a(S.isString), false)
    U.deepStrictEqual(a((n) => n === 0), true)
  })

  it("imap", () => {
    const O = _.imap<order.OrderTypeLambda>(order.mapInput)(
      (s: string) => [s],
      ([s]) => s
    )(
      S.Order
    )
    U.deepStrictEqual(O(["a"], ["b"]), -1)
    U.deepStrictEqual(O(["a"], ["a"]), 0)
    U.deepStrictEqual(O(["b"], ["a"]), 1)
  })
})
