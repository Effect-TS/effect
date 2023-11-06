import * as Either from "../Either.js"
import { identity } from "../Function.js"
import type {
  Case,
  Matcher,
  MatcherTypeId,
  Not,
  SafeRefinement,
  TypeMatcher,
  Types,
  ValueMatcher,
  When
} from "../Match.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import type * as Predicate from "../Predicate.js"
import type { Unify } from "../Unify.js"

/** @internal */
export const TypeId: MatcherTypeId = Symbol.for(
  "@effect/matcher/Matcher"
) as MatcherTypeId

const TypeMatcherProto: Omit<TypeMatcher<any, any, any, any>, "cases"> = {
  [TypeId]: {
    _input: identity,
    _filters: identity,
    _remaining: identity,
    _result: identity
  },
  _tag: "TypeMatcher",
  add<I, R, RA, A>(
    this: TypeMatcher<any, any, any, any>,
    _case: Case
  ): TypeMatcher<I, R, RA, A> {
    return makeTypeMatcher([...this.cases, _case])
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

function makeTypeMatcher<I, R, RA, A>(
  cases: ReadonlyArray<Case>
): TypeMatcher<I, R, RA, A> {
  const matcher = Object.create(TypeMatcherProto)
  matcher.cases = cases
  return matcher
}

const ValueMatcherProto: Omit<
  ValueMatcher<any, any, any, any, any>,
  "provided" | "value"
> = {
  [TypeId]: {
    _input: identity,
    _filters: identity,
    _result: identity
  },
  _tag: "ValueMatcher",
  add<I, R, RA, A, Pr>(
    this: ValueMatcher<any, any, any, any, any>,
    _case: Case
  ): ValueMatcher<I, R, RA, A, Pr> {
    if (this.value._tag === "Right") {
      return this
    }

    if (_case._tag === "When" && _case.guard(this.provided) === true) {
      return makeValueMatcher(
        this.provided,
        Either.right(_case.evaluate(this.provided))
      )
    } else if (_case._tag === "Not" && _case.guard(this.provided) === false) {
      return makeValueMatcher(
        this.provided,
        Either.right(_case.evaluate(this.provided))
      )
    }

    return this
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

function makeValueMatcher<I, R, RA, A, Pr>(
  provided: Pr,
  value: Either.Either<RA, Pr>
): ValueMatcher<I, R, RA, A, Pr> {
  const matcher = Object.create(ValueMatcherProto)
  matcher.provided = provided
  matcher.value = value
  return matcher
}

const makeWhen = (
  guard: (u: unknown) => boolean,
  evaluate: (input: unknown) => any
): When => ({
  _tag: "When",
  guard,
  evaluate
})

const makeNot = (
  guard: (u: unknown) => boolean,
  evaluate: (input: unknown) => any
): Not => ({
  _tag: "Not",
  guard,
  evaluate
})

const makePredicate = (pattern: unknown): Predicate.Predicate<unknown> => {
  if (typeof pattern === "function") {
    return pattern as Predicate.Predicate<unknown>
  } else if (Array.isArray(pattern)) {
    const predicates = pattern.map(makePredicate)
    const len = predicates.length

    return (u: unknown) => {
      if (!Array.isArray(u)) {
        return false
      }

      for (let i = 0; i < len; i++) {
        if (predicates[i](u[i]) === false) {
          return false
        }
      }

      return true
    }
  } else if (pattern !== null && typeof pattern === "object") {
    const keysAndPredicates = Object.entries(pattern).map(
      ([k, p]) => [k, makePredicate(p)] as const
    )
    const len = keysAndPredicates.length

    return (u: unknown) => {
      if (typeof u !== "object" || u === null) {
        return false
      }

      for (let i = 0; i < len; i++) {
        const [key, predicate] = keysAndPredicates[i]
        if (!(key in u) || predicate((u as any)[key]) === false) {
          return false
        }
      }

      return true
    }
  }

  return (u: unknown) => u === pattern
}

const makeOrPredicate = (
  patterns: ReadonlyArray<unknown>
): Predicate.Predicate<unknown> => {
  const predicates = patterns.map(makePredicate)
  const len = predicates.length

  return (u: unknown) => {
    for (let i = 0; i < len; i++) {
      if (predicates[i](u) === true) {
        return true
      }
    }

    return false
  }
}

const makeAndPredicate = (
  patterns: ReadonlyArray<unknown>
): Predicate.Predicate<unknown> => {
  const predicates = patterns.map(makePredicate)
  const len = predicates.length

  return (u: unknown) => {
    for (let i = 0; i < len; i++) {
      if (predicates[i](u) === false) {
        return false
      }
    }

    return true
  }
}

/** @internal */
export const type = <I>(): Matcher<
  I,
  Types.Without<never>,
  I,
  never,
  never
> => makeTypeMatcher([])

/** @internal */
export const value = <const I>(
  i: I
): Matcher<I, Types.Without<never>, I, never, I> => makeValueMatcher(i, Either.left(i))

/** @internal */
export const valueTags = <
  const I,
  P extends {
    readonly [Tag in Types.Tags<"_tag", I> & string]: (
      _: Extract<I, { readonly _tag: Tag }>
    ) => any
  }
>(
  fields: P
) => {
  const match: any = tagsExhaustive(fields)(makeTypeMatcher([]))
  return (input: I): Unify<ReturnType<P[keyof P]>> => match(input)
}

/** @internal */
export const typeTags = <I>() =>
<
  P extends {
    readonly [Tag in Types.Tags<"_tag", I> & string]: (
      _: Extract<I, { readonly _tag: Tag }>
    ) => any
  }
>(
  fields: P
) => {
  const match: any = tagsExhaustive(fields)(makeTypeMatcher([]))
  return (input: I): Unify<ReturnType<P[keyof P]>> => match(input)
}

/** @internal */
export const when = <
  R,
  const P extends Types.PatternPrimitive<R> | Types.PatternBase<R>,
  Fn extends (_: Types.WhenMatch<R, P>) => unknown
>(
  pattern: P,
  f: Fn
) =>
<I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
): Matcher<
  I,
  Types.AddWithout<F, Types.PForExclude<P>>,
  Types.ApplyFilters<I, Types.AddWithout<F, Types.PForExclude<P>>>,
  A | ReturnType<Fn>,
  Pr
> => (self as any).add(makeWhen(makePredicate(pattern), f as any))

/** @internal */
export const whenOr = <
  R,
  const P extends ReadonlyArray<
    Types.PatternPrimitive<R> | Types.PatternBase<R>
  >,
  Fn extends (_: Types.WhenMatch<R, P[number]>) => unknown
>(
  ...args: [...patterns: P, f: Fn]
) =>
<I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
): Matcher<
  I,
  Types.AddWithout<F, Types.PForExclude<P[number]>>,
  Types.ApplyFilters<I, Types.AddWithout<F, Types.PForExclude<P[number]>>>,
  A | ReturnType<Fn>,
  Pr
> => {
  const onMatch = args[args.length - 1] as any
  const patterns = args.slice(0, -1) as unknown as P
  return (self as any).add(makeWhen(makeOrPredicate(patterns), onMatch))
}

/** @internal */
export const whenAnd = <
  R,
  const P extends ReadonlyArray<
    Types.PatternPrimitive<R> | Types.PatternBase<R>
  >,
  Fn extends (_: Types.WhenMatch<R, Types.ArrayToIntersection<P>>) => unknown
>(
  ...args: [...patterns: P, f: Fn]
) =>
<I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
): Matcher<
  I,
  Types.AddWithout<F, Types.PForExclude<Types.ArrayToIntersection<P>>>,
  Types.ApplyFilters<
    I,
    Types.AddWithout<F, Types.PForExclude<Types.ArrayToIntersection<P>>>
  >,
  A | ReturnType<Fn>,
  Pr
> => {
  const onMatch = args[args.length - 1] as any
  const patterns = args.slice(0, -1) as unknown as P
  return (self as any).add(makeWhen(makeAndPredicate(patterns), onMatch))
}

/** @internal */
export const discriminator = <D extends string>(field: D) =>
<R, P extends Types.Tags<D, R> & string, B>(
  ...pattern: [
    first: P,
    ...values: Array<P>,
    f: (_: Extract<R, Record<D, P>>) => B
  ]
) => {
  const f = pattern[pattern.length - 1]
  const values: Array<P> = pattern.slice(0, -1) as any
  const pred = values.length === 1
    ? (_: any) => _[field] === values[0]
    : (_: any) => values.includes(_[field])

  return <I, F, A, Pr>(
    self: Matcher<I, F, R, A, Pr>
  ): Matcher<
    I,
    Types.AddWithout<F, Extract<R, Record<D, P>>>,
    Types.ApplyFilters<I, Types.AddWithout<F, Extract<R, Record<D, P>>>>,
    A | B,
    Pr
  > => (self as any).add(makeWhen(pred, f as any)) as any
}

/** @internal */
export const discriminatorStartsWith = <D extends string>(field: D) =>
<R, P extends string, B>(
  pattern: P,
  f: (_: Extract<R, Record<D, `${P}${string}`>>) => B
) => {
  const pred = (_: any) => typeof _[field] === "string" && _[field].startsWith(pattern)

  return <I, F, A, Pr>(
    self: Matcher<I, F, R, A, Pr>
  ): Matcher<
    I,
    Types.AddWithout<F, Extract<R, Record<D, `${P}${string}`>>>,
    Types.ApplyFilters<
      I,
      Types.AddWithout<F, Extract<R, Record<D, `${P}${string}`>>>
    >,
    A | B,
    Pr
  > => (self as any).add(makeWhen(pred, f as any)) as any
}

/** @internal */
export const discriminators = <D extends string>(field: D) =>
<
  R,
  P extends {
    readonly [Tag in Types.Tags<D, R> & string]?: (
      _: Extract<R, Record<D, Tag>>
    ) => any
  }
>(
  fields: P
) => {
  const predicates: Array<When> = []
  for (const key in fields) {
    const pred = (_: any) => _[field] === key
    const f = fields[key]
    if (f) {
      predicates.push(makeWhen(pred, f as any))
    }
  }
  const len = predicates.length

  return <I, F, A, Pr>(
    self: Matcher<I, F, R, A, Pr>
  ): Matcher<
    I,
    Types.AddWithout<F, Extract<R, Record<D, keyof P>>>,
    Types.ApplyFilters<I, Types.AddWithout<F, Extract<R, Record<D, keyof P>>>>,
    A | ReturnType<P[keyof P] & {}>,
    Pr
  > => {
    let matcher: any = self
    for (let i = 0; i < len; i++) {
      matcher = matcher.add(predicates[i])
    }
    return matcher
  }
}

/** @internal */
export const discriminatorsExhaustive: <D extends string>(
  field: D
) => <
  R,
  P extends {
    readonly [Tag in Types.Tags<D, R> & string]: (
      _: Extract<R, Record<D, Tag>>
    ) => any
  }
>(
  fields: P
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => [Pr] extends [never] ? (u: I) => Unify<A | ReturnType<P[keyof P]>>
  : Unify<A | ReturnType<P[keyof P]>> = (field: string) => (fields: object) => {
    const addCases = discriminators(field)(fields)
    return (matcher: any) => exhaustive(addCases(matcher))
  }

/** @internal */
export const tag: <R, P extends Types.Tags<"_tag", R> & string, B>(
  ...pattern: [
    first: P,
    ...values: Array<P>,
    f: (_: Extract<R, Record<"_tag", P>>) => B
  ]
) => <I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => Matcher<
  I,
  Types.AddWithout<F, Extract<R, Record<"_tag", P>>>,
  Types.ApplyFilters<I, Types.AddWithout<F, Extract<R, Record<"_tag", P>>>>,
  B | A,
  Pr
> = discriminator("_tag")

/** @internal */
export const tagStartsWith = discriminatorStartsWith("_tag")

/** @internal */
export const tags = discriminators("_tag")

/** @internal */
export const tagsExhaustive = discriminatorsExhaustive("_tag")

/** @internal */
export const not = <
  R,
  const P extends Types.PatternPrimitive<R> | Types.PatternBase<R>,
  Fn extends (_: Types.NotMatch<R, P>) => unknown
>(
  pattern: P,
  f: Fn
) =>
<I, F, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
): Matcher<
  I,
  Types.AddOnly<F, Types.WhenMatch<R, P>>,
  Types.ApplyFilters<I, Types.AddOnly<F, Types.WhenMatch<R, P>>>,
  A | ReturnType<Fn>,
  Pr
> => (self as any).add(makeNot(makePredicate(pattern), f as any))

/** @internal */
export const nonEmptyString: SafeRefinement<string, never> =
  ((u: unknown) => typeof u === "string" && u.length > 0) as any

/** @internal */
export const is: <
  Literals extends ReadonlyArray<string | number | boolean | null | bigint>
>(
  ...literals: Literals
) => Predicate.Refinement<unknown, Literals[number]> = (...literals): any => {
  const len = literals.length
  return (u: unknown) => {
    for (let i = 0; i < len; i++) {
      if (u === literals[i]) {
        return true
      }
    }
    return false
  }
}

/** @internal */
export const any: SafeRefinement<unknown, any> = (() => true) as any

/** @internal */
export const defined = <A>(u: A): u is A & {} => (u !== undefined && u !== null) as any

/** @internal */
export const instanceOf = <A extends abstract new(...args: any) => any>(
  constructor: A
): SafeRefinement<InstanceType<A>, never> => ((u: unknown) => u instanceof constructor) as any

/** @internal */
export const instanceOfUnsafe: <A extends abstract new(...args: any) => any>(
  constructor: A
) => SafeRefinement<InstanceType<A>, InstanceType<A>> = instanceOf

/** @internal */
export const orElse = <RA, B>(f: (b: RA) => B) =>
<I, R, A, Pr>(
  self: Matcher<I, R, RA, A, Pr>
): [Pr] extends [never] ? (input: I) => Unify<A | B> : Unify<A | B> => {
  const result = either(self)

  if (Either.isEither(result)) {
    // @ts-expect-error
    return result._tag === "Right" ? result.right : f(result.left)
  }

  // @ts-expect-error
  return (input: I) => {
    const a = result(input)
    return a._tag === "Right" ? a.right : f(a.left)
  }
}

/** @internal */
export const orElseAbsurd = <I, R, RA, A, Pr>(
  self: Matcher<I, R, RA, A, Pr>
): [Pr] extends [never] ? (input: I) => Unify<A> : Unify<A> =>
  orElse(() => {
    throw new Error("absurd")
  })(self)

/** @internal */
export const either: <I, F, R, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => [Pr] extends [never] ? (input: I) => Either.Either<R, Unify<A>>
  : Either.Either<R, Unify<A>> = (<I, R, RA, A>(self: Matcher<I, R, RA, A, I>) => {
    if (self._tag === "ValueMatcher") {
      return self.value
    }

    const len = self.cases.length
    return (input: I): Either.Either<RA, A> => {
      for (let i = 0; i < len; i++) {
        const _case = self.cases[i]
        if (_case._tag === "When" && _case.guard(input) === true) {
          return Either.right(_case.evaluate(input))
        } else if (_case._tag === "Not" && _case.guard(input) === false) {
          return Either.right(_case.evaluate(input))
        }
      }

      return Either.left(input as any)
    }
  }) as any

/** @internal */
export const option: <I, F, R, A, Pr>(
  self: Matcher<I, F, R, A, Pr>
) => [Pr] extends [never] ? (input: I) => Option.Option<Unify<A>>
  : Option.Option<Unify<A>> = (<I, A>(self: Matcher<I, any, any, A, I>) => {
    const toEither = either(self)
    if (Either.isEither(toEither)) {
      return Either.match(toEither, {
        onLeft: () => Option.none(),
        onRight: Option.some
      })
    }
    return (input: I): Option.Option<A> =>
      Either.match((toEither as any)(input), {
        onLeft: () => Option.none(),
        onRight: Option.some as any
      })
  }) as any

/** @internal */
export const exhaustive: <I, F, A, Pr>(
  self: Matcher<I, F, never, A, Pr>
) => [Pr] extends [never] ? (u: I) => Unify<A> : Unify<A> = (<I, F, A>(
  self: Matcher<I, F, never, A, I>
) => {
  const toEither = either(self as any)

  if (Either.isEither(toEither)) {
    if (toEither._tag === "Right") {
      return toEither.right
    }

    throw new Error("@effect/match: exhaustive absurd")
  }

  return (u: I): A => {
    // @ts-expect-error
    const result = toEither(u)

    if (result._tag === "Right") {
      return result.right as any
    }

    throw new Error("@effect/match: exhaustive absurd")
  }
}) as any
