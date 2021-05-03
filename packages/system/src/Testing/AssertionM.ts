import * as L from "../Collections/Immutable/List"
import * as T from "../Effect"
import type { Lazy } from "../Function"
import { pipe } from "../Function"
import * as O from "../Option"
import * as ST from "../Structural"
import { LazyGetter } from "../Utils"
import * as AMD from "./AssertionMData"
import type * as AR from "./AssertionResult"
import * as ARM from "./AssertionResultM"
import * as AV from "./AssertionValue"
import * as BA from "./BoolAlgebra"
import * as BAM from "./BoolAlgebraM"
import * as PR from "./primitives"
import * as R from "./Render"

/**
 * An `AssertionM[A]` is capable of producing assertion results on an `A`. As a
 * proposition, assertions compose using logical conjunction and disjunction,
 * and can be negated.
 */
export abstract class AssertionM<A> {
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

export function apply<A>(
  render: () => R.Render,
  runM: (a: Lazy<A>) => ARM.AssertResultM
): AssertionM<A> {
  return new (class extends AssertionM<A> {})(render, runM)
}

/**
 * Returns a new assertion that succeeds only if both assertions succeed.
 */
export function and<A>(self: AssertionM<A>, that: Lazy<AssertionM<A>>) {
  return new (class extends AssertionM<A> {})(
    () => R.infix(R.param(self), "&&", R.param(that)),
    (actual) => ARM.and_(self.runM(actual), that().runM(actual))
  )
}

/**
 * Returns a new assertion that succeeds if either assertion succeeds.
 */
export function or<A>(self: AssertionM<A>, that: Lazy<AssertionM<A>>) {
  return new (class extends AssertionM<A> {})(
    () => R.infix(R.param(self), "||", R.param(that)),
    (actual) => ARM.or_(self.runM(actual), that().runM(actual))
  )
}

export function isAssertionM(that: unknown): that is AssertionM<unknown> {
  return that instanceof AssertionM
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
              ? BA.success(AV.makeAssertionValue(assertion, () => actualValue, result))
              : BA.failure(AV.makeAssertionValue(assertion, () => actualValue, result))

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
  return <B>(assertion: AssertionM<B>) => <A>(
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
          BAM.chain(
            (p): ARM.AssertResultM => {
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
                                AV.makeAssertionValue(
                                  assertion,
                                  () => (actualValue as unknown) as B,
                                  result
                                )
                              )
                            : BA.failure(
                                AV.makeAssertionValue(
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
            }
          )
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
  )<A>((_) => ARM.not(assertion.runM(_)))
}
