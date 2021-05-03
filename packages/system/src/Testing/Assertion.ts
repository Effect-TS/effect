import * as L from "../Collections/Immutable/List"
import * as T from "../Effect"
import type { Lazy } from "../Function"
import * as O from "../Option"
import * as ST from "../Structural"
import { LazyGetter } from "../Utils"
import * as AD from "./AssertionData"
import type * as AM from "./AssertionM"
import * as AR from "./AssertionResult"
import type * as ARM from "./AssertionResultM"
import * as AV from "./AssertionValue"
import * as BA from "./BoolAlgebra"
import * as BAM from "./BoolAlgebraM"
import * as PR from "./primitives"
import * as R from "./Render"

export class Assertion<A> implements AM.AssertionM<A> {
  readonly [PR._A]: (_: A) => void

  constructor(
    readonly render: () => R.Render,
    readonly run: (a: Lazy<A>) => AR.AssertResult
  ) {
    this.runM = this.runM.bind(this)
    this.toString = this.toString.bind(this)
  }

  runM(a: Lazy<A>): ARM.AssertResultM {
    return new BAM.BoolAlgebraM(T.succeed(this.run(a)))
  }

  @LazyGetter()
  get stringify(): string {
    return this.render().toString()
  }

  toString(): string {
    return this.stringify
  }

  [ST.equalsSym](that: unknown): boolean {
    if (isAssertion(that)) {
      return this.stringify === that.stringify
    }

    return false
  }

  @LazyGetter()
  get [ST.hashSym](): number {
    return ST.hashString(this.stringify)
  }
}

export function isAssertion(that: unknown): that is Assertion<any> {
  return that instanceof Assertion
}

export function makeAssertion(name: string, ...params: R.RenderParam[]) {
  return <A>(run: (a: Lazy<A>) => boolean) => {
    const assertion = makeAssertionDirect(
      name,
      ...params
    )<A>((actual) => {
      const actualValue = actual()
      const result = (): AR.AssertResult =>
        run(() => actualValue)
          ? BA.success(AV.makeAssertionValue(assertion, () => actualValue, result))
          : BA.failure(AV.makeAssertionValue(assertion, () => actualValue, result))

      return result()
    })

    return assertion
  }
}

export function makeAssertionDirect(name: string, ...params: R.RenderParam[]) {
  return <A>(run: (a: Lazy<A>) => AR.AssertResult) =>
    new Assertion(() => R.function_(name, L.of(L.from(params))), run)
}

export const isFalse = makeAssertion("isFalse")<boolean>((a) => !a())

export const isEmptyString = makeAssertion("isEmptyString")<string>(
  (a) => a().length === 0
)

export function equalTo<A>(expected: A): Assertion<A> {
  return makeAssertion(
    "EqualTo",
    R.param(expected)
  )<A>((actual) => {
    const actualValue = actual()

    return ST.equals(expected, actualValue)
  })
}

export function makeAssertionRec(name: string, ...params: R.RenderParam[]) {
  return <B>(assertion: Assertion<B>) => {
    return <A>(
      get: (a: Lazy<A>) => O.Option<B>,
      orElse: (ad: AD.AssertionData) => AR.AssertResult = AD.asFailure
    ) => {
      const resultAssertion = (): Assertion<A> =>
        makeAssertionDirect(
          name,
          ...params
        )<A>((a) => {
          const actualValue = a()

          return O.fold_(
            get(a),
            () => orElse(AD.makeAssertionData(resultAssertion(), actualValue)),
            (b) => {
              const innerResult = assertion.run(() => b)
              const result = (): AR.AssertResult =>
                AR.isSuccess(innerResult)
                  ? BA.success(
                      AV.makeAssertionValue(
                        resultAssertion(),
                        () => actualValue,
                        result
                      )
                    )
                  : BA.failure(
                      AV.makeAssertionValue(
                        resultAssertion(),
                        () => (b as unknown) as A,
                        () => innerResult
                      )
                    )
              return result()
            }
          )
        })

      return resultAssertion()
    }
  }
}

export function hasProperty<A, B>(
  name: string,
  proj: (a: A) => B,
  assertion: Assertion<B>
): Assertion<A> {
  return makeAssertionRec(
    "hasField",
    R.param(R.quoted(name)),
    R.param(R.field(name)),
    R.param(assertion)
  )(assertion)<A>((actual) => {
    return O.some(proj(actual()))
  })
}

export function and<A>(self: Assertion<A>, that: Assertion<A>): Assertion<A> {
  return new Assertion(
    () => R.infix(R.param(self), "&&", R.param(that)),
    (actual) => AR.and_(self.run(actual), that.run(actual))
  )
}

export function or<A>(self: Assertion<A>, that: Assertion<A>): Assertion<A> {
  return new Assertion(
    () => R.infix(R.param(self), "||", R.param(that)),
    (actual) => AR.or_(self.run(actual), that.run(actual))
  )
}
