import type { Lazy } from "../../Function"
import * as ST from "../../Structural"
import { LazyGetter } from "../../Utils"
import type * as ARM from "../AssertionResultM"
import * as PR from "../primitives"
import type * as R from "../Render"

/**
 * An `AssertionM[A]` is capable of producing assertion results on an `A`. As a
 * proposition, assertions compose using logical conjunction and disjunction,
 * and can be negated.
 */
export abstract class AssertionM<A> implements ST.HasEquals {
  readonly [PR._A]: (_: A) => void

  constructor(
    readonly render: () => R.Render,
    readonly runM: (a: Lazy<A>) => ARM.AssertResultM
  ) {}

  @LazyGetter()
  get stringify(): string {
    return this.render().toString()
  }

  toString(): string {
    return this.stringify
  }

  [ST.equalsSym](that: unknown): boolean {
    if (isAssertionM(that)) {
      return this.stringify === that.stringify
    }

    return false
  }

  @LazyGetter()
  get [ST.hashSym](): number {
    return ST.hashString(this.stringify)
  }
}

export function isAssertionM(that: unknown): that is AssertionM<unknown> {
  return that instanceof AssertionM
}
