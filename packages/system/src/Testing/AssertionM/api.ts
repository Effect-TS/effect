// ets_tracing: off

import * as L from "../../Collections/Immutable/List/index.js"
import * as T from "../../Effect/index.js"
import type { Lazy } from "../../Function/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as AMD from "../AssertionMData/index.js"
import type * as AR from "../AssertionResult/index.js"
import type * as ARM from "../AssertionResultM/index.js"
import * as makeAssertionValue from "../AssertionValue/makeAssertionValue.js"
import * as BA from "../BoolAlgebra/index.js"
import * as BAM from "../BoolAlgebraM/index.js"
import * as R from "../Render/index.js"
import { apply } from "./apply.js"
import { AssertionM } from "./AssertionM.js"

/**
 * Returns a new assertion that succeeds only if both assertions succeed.
 */
export function and<A>(self: AssertionM<A>, that: Lazy<AssertionM<A>>): AssertionM<A> {
  return new (class extends AssertionM<A> {})(
    () => R.infix(R.param(self), "&&", R.param(that)),
    (actual) => BAM.and_(self.runM(actual), that().runM(actual))
  )
}

/**
 * Returns a new assertion that succeeds if either assertion succeeds.
 */
export function or<A>(self: AssertionM<A>, that: Lazy<AssertionM<A>>): AssertionM<A> {
  return new (class extends AssertionM<A> {})(
    () => R.infix(R.param(self), "||", R.param(that)),
    (actual) => BAM.or_(self.runM(actual), that().runM(actual))
  )
}

/**
 * Labels this assertion with the specified string.
 */
export function label_<A>(self: AssertionM<A>, str: string) {
  return apply(() => R.infix(R.param(self), "??", R.param(R.quoted(str))), self.runM)
}

/**
 * Labels this assertion with the specified string.
 */
export function label(str: string) {
  return <A>(self: AssertionM<A>) => label_(self, str)
}
/**
 * Makes a new `AssertionM` from a pretty-printing and a function.
 */
export function makeAssertionDirect(name: string, ...params: R.RenderParam[]) {
  return <A>(run: (a: Lazy<A>) => ARM.AssertResultM): AssertionM<A> => {
    return apply(() => R.function_(name, L.of(L.from(params))), run)
  }
}

/**
 * Makes a new `AssertionM` from a pretty-printing and a function.
 */
export function makeAssertionM(name: string, ...params: R.RenderParam[]) {
  return <A>(run: (a: Lazy<A>) => T.UIO<boolean>) => {
    const assertion = makeAssertionDirect(
      name,
      ...params
    )<A>((actual) => {
      const actualValue = actual()

      return pipe(
        run(() => actualValue),
        BAM.fromEffect,
        BAM.chain((p) => {
          const result = (): AR.AssertResult =>
            p
              ? BA.success(
                  makeAssertionValue.makeAssertionValue(
                    assertion,
                    () => actualValue,
                    result
                  )
                )
              : BA.failure(
                  makeAssertionValue.makeAssertionValue(
                    assertion,
                    () => actualValue,
                    result
                  )
                )

          return new BAM.BoolAlgebraM(T.succeed(result()))
        })
      )
    })

    return assertion
  }
}

/**
 * Makes a new `AssertionM` from a pretty-printing and a function.
 */
export function makeAssertionRecM(name: string, ...params: R.RenderParam[]) {
  return <B>(assertion: AssertionM<B>) =>
    <A>(
      get: (a: Lazy<A>) => T.Effect<unknown, never, O.Option<B>>,
      orElse: (amd: AMD.AssertionMData) => ARM.AssertResultM = AMD.asFailureM
    ): AssertionM<A> => {
      const resultAssertion = () =>
        makeAssertionDirect(
          name,
          ...params
        )<A>((a) => {
          const actualValue = a()

          return pipe(
            get(() => actualValue),
            BAM.fromEffect,
            BAM.chain((p): ARM.AssertResultM => {
              return O.fold_(
                p,
                () =>
                  orElse(AMD.makeAssertionMData(resultAssertion(), () => actualValue)),
                (b) => {
                  return new BAM.BoolAlgebraM(
                    pipe(
                      assertion.runM(() => b).run,
                      T.map((p) => {
                        const result = (): AR.AssertResult =>
                          BA.isSuccess(p)
                            ? BA.success(
                                makeAssertionValue.makeAssertionValue(
                                  assertion,
                                  () => actualValue as unknown as B,
                                  result
                                )
                              )
                            : BA.failure(
                                makeAssertionValue.makeAssertionValue(
                                  assertion,
                                  () => b,
                                  () => p
                                )
                              )

                        return result()
                      })
                    )
                  )
                }
              )
            })
          )
        })

      return resultAssertion()
    }
}

/**
 * Makes a new assertion that negates the specified assertion.
 */
export function not<A>(assertion: AssertionM<A>) {
  return makeAssertionDirect(
    "not",
    R.param(assertion)
  )<A>((_) => BAM.not(assertion.runM(_)))
}
