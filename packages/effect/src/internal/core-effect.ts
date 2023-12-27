import type * as Cause from "../Cause.js"
import * as Chunk from "../Chunk.js"
import * as Clock from "../Clock.js"
import * as Context from "../Context.js"
import * as Duration from "../Duration.js"
import type * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import type * as Fiber from "../Fiber.js"
import * as FiberId from "../FiberId.js"
import type * as FiberRef from "../FiberRef.js"
import * as FiberRefs from "../FiberRefs.js"
import type * as FiberRefsPatch from "../FiberRefsPatch.js"
import type { LazyArg } from "../Function.js"
import { constFalse, constTrue, constVoid, dual, identity, pipe } from "../Function.js"
import * as HashMap from "../HashMap.js"
import * as HashSet from "../HashSet.js"
import * as List from "../List.js"
import * as LogLevel from "../LogLevel.js"
import * as LogSpan from "../LogSpan.js"
import type * as Metric from "../Metric.js"
import type * as MetricLabel from "../MetricLabel.js"
import * as Option from "../Option.js"
import * as Predicate from "../Predicate.js"
import type * as Random from "../Random.js"
import * as ReadonlyArray from "../ReadonlyArray.js"
import * as Ref from "../Ref.js"
import type * as runtimeFlagsPatch from "../RuntimeFlagsPatch.js"
import * as Tracer from "../Tracer.js"
import * as internalCause from "./cause.js"
import * as core from "./core.js"
import * as defaultServices from "./defaultServices.js"
import * as fiberRefsPatch from "./fiberRefs/patch.js"
import { internalize } from "./internalize.js"
import * as metricLabel from "./metric/label.js"
import * as runtimeFlags from "./runtimeFlags.js"
import * as SingleShotGen from "./singleShotGen.js"
import * as internalTracer from "./tracer.js"

/* @internal */
export const annotateLogs = dual<
  {
    (key: string, value: unknown): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
    (
      values: Record<string, unknown>
    ): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  },
  {
    <R, E, A>(effect: Effect.Effect<R, E, A>, key: string, value: unknown): Effect.Effect<R, E, A>
    <R, E, A>(effect: Effect.Effect<R, E, A>, values: Record<string, unknown>): Effect.Effect<R, E, A>
  }
>(
  (args) => core.isEffect(args[0]),
  function<R, E, A>() {
    const args = arguments
    return core.fiberRefLocallyWith(
      args[0] as Effect.Effect<R, E, A>,
      core.currentLogAnnotations,
      typeof args[1] === "string"
        ? HashMap.set(args[1], args[2])
        : (annotations) =>
          Object.entries(args[1] as Record<string, unknown>).reduce(
            (acc, [key, value]) => HashMap.set(acc, key, value),
            annotations
          )
    )
  }
)

/* @internal */
export const asSome = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Option.Option<A>> =>
  core.map(self, Option.some)

/* @internal */
export const asSomeError = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Option.Option<E>, A> =>
  core.mapError(self, Option.some)

/* @internal */
export const asyncOption = <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Option.Option<Effect.Effect<R, E, A>>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> =>
  core.asyncEither<R, E, A>(
    (cb) => {
      const option = register(cb)
      switch (option._tag) {
        case "None": {
          return Either.left(core.unit)
        }
        case "Some": {
          return Either.right(option.value)
        }
      }
    },
    blockingOn
  )

/* @internal */
export const try_: {
  <A, E>(options: {
    readonly try: LazyArg<A>
    readonly catch: (error: unknown) => E
  }): Effect.Effect<never, E, A>
  <A>(evaluate: LazyArg<A>): Effect.Effect<never, Cause.UnknownException, A>
} = <A, E>(
  arg: LazyArg<A> | {
    readonly try: LazyArg<A>
    readonly catch: (error: unknown) => E
  }
) => {
  let evaluate: LazyArg<A>
  let onFailure: ((error: unknown) => E) | undefined = undefined
  if (typeof arg === "function") {
    evaluate = arg
  } else {
    evaluate = arg.try
    onFailure = arg.catch
  }
  return core.sync(() => {
    try {
      return evaluate()
    } catch (error) {
      throw core.makeEffectError(internalCause.fail(
        onFailure ? onFailure(error) : new core.UnknownException(error)
      ))
    }
  })
}

/* @internal */
export const _catch = dual<
  <N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
    discriminator: N,
    options: {
      readonly failure: K
      readonly onFailure: (error: Extract<E, { [n in N]: K }>) => Effect.Effect<R1, E1, A1>
    }
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<
    R | R1,
    Exclude<E, { [n in N]: K }> | E1,
    A | A1
  >,
  <R, E, A, N extends keyof E, K extends E[N] & string, R1, E1, A1>(
    self: Effect.Effect<R, E, A>,
    discriminator: N,
    options: {
      readonly failure: K
      readonly onFailure: (error: Extract<E, { [n in N]: K }>) => Effect.Effect<R1, E1, A1>
    }
  ) => Effect.Effect<R | R1, Exclude<E, { [n in N]: K }> | E1, A | A1>
>(
  // @ts-expect-error
  3,
  (self, tag, options) =>
    core.catchAll(self, (e) => {
      if (Predicate.hasProperty(e, tag) && e[tag] === options.failure) {
        return options.onFailure(e as any)
      }
      return core.fail(e as any)
    })
)

/* @internal */
export const catchAllDefect = dual<
  <R2, E2, A2>(
    f: (defect: unknown) => Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (defect: unknown) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A | A2>
>(2, (self, f) =>
  core.catchAllCause(
    self,
    core.unified((cause) => {
      const option = internalCause.find(cause, (_) => internalCause.isDieType(_) ? Option.some(_) : Option.none())
      switch (option._tag) {
        case "None": {
          return core.failCause(cause)
        }
        case "Some": {
          return f(option.value.defect)
        }
      }
    })
  ))

/* @internal */
export const catchSomeCause = dual<
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (cause: Cause.Cause<E>) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => Effect.Effect<R | R2, E | E2, A | A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (cause: Cause.Cause<E>) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) =>
    core.matchCauseEffect(self, {
      onFailure: (cause): Effect.Effect<R2, E | E2, A2> => {
        const option = f(cause)
        switch (option._tag) {
          case "None": {
            return core.failCause(cause)
          }
          case "Some": {
            return option.value
          }
        }
      },
      onSuccess: core.succeed
    })
)

/* @internal */
export const catchSomeDefect = dual<
  <R2, E2, A2>(
    pf: (defect: unknown) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    pf: (defect: unknown) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => Effect.Effect<R | R2, E | E2, A | A2>
>(
  2,
  <R, E, A, R2, E2, A2>(self: Effect.Effect<R, E, A>, pf: (_: unknown) => Option.Option<Effect.Effect<R2, E2, A2>>) =>
    core.catchAllCause(
      self,
      core.unified((cause) => {
        const option = internalCause.find(cause, (_) => internalCause.isDieType(_) ? Option.some(_) : Option.none())
        switch (option._tag) {
          case "None": {
            return core.failCause(cause)
          }
          case "Some": {
            const optionEffect = pf(option.value.defect)
            return optionEffect._tag === "Some" ? optionEffect.value : core.failCause(cause)
          }
        }
      })
    )
)

/* @internal */
export const catchTag = dual<
  <K extends (E extends { _tag: string } ? E["_tag"] : never), E, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, Exclude<E, { _tag: K }> | E1, A | A1>,
  <R, E, A, K extends (E extends { _tag: string } ? E["_tag"] : never), R1, E1, A1>(
    self: Effect.Effect<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ) => Effect.Effect<R | R1, Exclude<E, { _tag: K }> | E1, A | A1>
>(3, (self, k, f) => core.catchIf(self, Predicate.isTagged(k), f) as any)

/** @internal */
export const catchTags: {
  <
    E,
    Cases extends (E extends { _tag: string } ? {
        [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>
      } :
      {})
  >(
    cases: Cases
  ): <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<infer R, any, any>) ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, any, infer A>) ? A : never
    }[keyof Cases]
  >
  <
    R,
    E,
    A,
    Cases extends (E extends { _tag: string } ? {
        [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>
      } :
      {})
  >(
    self: Effect.Effect<R, E, A>,
    cases: Cases
  ): Effect.Effect<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<infer R, any, any>) ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, any, infer A>) ? A : never
    }[keyof Cases]
  >
} = dual(2, (self, cases) => {
  let keys: Array<string>
  return core.catchIf(
    self,
    (e): e is { readonly _tag: string } => {
      keys ??= Object.keys(cases)
      return Predicate.hasProperty(e, "_tag") && Predicate.isString(e["_tag"]) && keys.includes(e["_tag"])
    },
    (e) => cases[e["_tag"]](e)
  )
})

/* @internal */
export const cause = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Cause.Cause<E>> =>
  core.matchCause(self, { onFailure: identity, onSuccess: () => internalCause.empty })

/* @internal */
export const clockWith: <R, E, A>(f: (clock: Clock.Clock) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  Clock.clockWith

/* @internal */
export const clock: Effect.Effect<never, never, Clock.Clock> = clockWith(core.succeed)

/* @internal */
export const delay = dual<
  (duration: Duration.DurationInput) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, duration: Duration.DurationInput) => Effect.Effect<R, E, A>
>(2, (self, duration) => core.zipRight(Clock.sleep(duration), self))

/* @internal */
export const descriptorWith = <R, E, A>(
  f: (descriptor: Fiber.Fiber.Descriptor) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  core.withFiberRuntime((state, status) =>
    f({
      id: state.id(),
      status,
      interruptors: internalCause.interruptors(state.getFiberRef(core.currentInterruptedCause))
    })
  ) as Effect.Effect<R, E, A>

/* @internal */
export const allowInterrupt: Effect.Effect<never, never, void> = descriptorWith(
  (descriptor) =>
    HashSet.size(descriptor.interruptors) > 0
      ? core.interrupt
      : core.unit
)

/* @internal */
export const descriptor: Effect.Effect<never, never, Fiber.Fiber.Descriptor> = descriptorWith(core.succeed)

/* @internal */
export const diffFiberRefs = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, [FiberRefsPatch.FiberRefsPatch, A]> => summarized(self, fiberRefs, fiberRefsPatch.diff)

/* @internal */
export const diffFiberRefsAndRuntimeFlags = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, [[FiberRefsPatch.FiberRefsPatch, runtimeFlagsPatch.RuntimeFlagsPatch], A]> =>
  summarized(
    self,
    core.zip(fiberRefs, core.runtimeFlags),
    ([refs, flags], [refsNew, flagsNew]) => [fiberRefsPatch.diff(refs, refsNew), runtimeFlags.diff(flags, flagsNew)]
  )

/* @internal */
export const Do: Effect.Effect<never, never, {}> = core.succeed({})

/* @internal */
export const bind = dual<
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>
  ) => <R, E>(self: Effect.Effect<R, E, K>) => Effect.Effect<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, N extends string, K, R2, E2, A>(
    self: Effect.Effect<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>
  ) => Effect.Effect<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>(3, <R, E, N extends string, K, R2, E2, A>(
  self: Effect.Effect<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect.Effect<R2, E2, A>
) =>
  core.flatMap(self, (k) =>
    core.map(
      f(k),
      (a): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: a } as any)
    )))

/* @internal */
export const bindTo = dual<
  <N extends string>(tag: N) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<
    R,
    E,
    Record<N, A>
  >,
  <R, E, A, N extends string>(
    self: Effect.Effect<R, E, A>,
    tag: N
  ) => Effect.Effect<
    R,
    E,
    Record<N, A>
  >
>(
  2,
  <R, E, A, N extends string>(self: Effect.Effect<R, E, A>, tag: N): Effect.Effect<R, E, Record<N, A>> =>
    core.map(self, (a) => ({ [tag]: a } as Record<N, A>))
)

/* @internal */
export const bindValue = dual<
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => <R, E>(self: Effect.Effect<R, E, K>) => Effect.Effect<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, K, N extends string, A>(
    self: Effect.Effect<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => Effect.Effect<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>(3, <R, E, K, N extends string, A>(self: Effect.Effect<R, E, K>, tag: Exclude<N, keyof K>, f: (_: K) => A) =>
  core.map(
    self,
    (k): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: f(k) } as any)
  ))

/* @internal */
export const dropUntil = dual<
  <A, R, E>(
    predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <A, R, E>(
    elements: Iterable<A>,
    predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => Effect.Effect<R, E, Array<A>>
>(2, <A, R, E>(
  elements: Iterable<A>,
  predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>
) =>
  core.suspend(() => {
    const iterator = elements[Symbol.iterator]()
    const builder: Array<A> = []
    let next: IteratorResult<A, any>
    let dropping: Effect.Effect<R, E, boolean> = core.succeed(false)
    let i = 0
    while ((next = iterator.next()) && !next.done) {
      const a = next.value
      const index = i++
      dropping = core.flatMap(dropping, (bool) => {
        if (bool) {
          builder.push(a)
          return core.succeed(true)
        }
        return predicate(a, index)
      })
    }
    return core.map(dropping, () => builder)
  }))

/* @internal */
export const dropWhile = dual<
  <R, E, A>(
    predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <R, E, A>(
    elements: Iterable<A>,
    predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => Effect.Effect<R, E, Array<A>>
>(
  2,
  <R, E, A>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>) =>
    core.suspend(() => {
      const iterator = elements[Symbol.iterator]()
      const builder: Array<A> = []
      let next
      let dropping: Effect.Effect<R, E, boolean> = core.succeed(true)
      let i = 0
      while ((next = iterator.next()) && !next.done) {
        const a = next.value
        const index = i++
        dropping = core.flatMap(dropping, (d) =>
          core.map(d ? predicate(a, index) : core.succeed(false), (b) => {
            if (!b) {
              builder.push(a)
            }
            return b
          }))
      }
      return core.map(dropping, () => builder)
    })
)

/* @internal */
export const contextWith = <R, A>(f: (context: Context.Context<R>) => A): Effect.Effect<R, never, A> =>
  core.map(core.context<R>(), f)

/* @internal */
export const eventually = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> =>
  core.orElse(self, () => core.flatMap(core.yieldNow(), () => eventually(self)))

/* @internal */
export const filterMap = dual<
  <A, B>(
    pf: (a: A) => Option.Option<B>
  ) => <R, E>(elements: Iterable<Effect.Effect<R, E, A>>) => Effect.Effect<R, E, Array<B>>,
  <R, E, A, B>(
    elements: Iterable<Effect.Effect<R, E, A>>,
    pf: (a: A) => Option.Option<B>
  ) => Effect.Effect<R, E, Array<B>>
>(2, (elements, pf) =>
  core.map(
    core.forEachSequential(elements, identity),
    ReadonlyArray.filterMap(pf)
  ))

/* @internal */
export const filterOrDie = dual<
  {
    <A, B extends A, X extends A>(
      filter: Predicate.Refinement<A, B>,
      orDieWith: (a: X) => unknown
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
    <A, X extends A, Y extends A>(
      filter: Predicate.Predicate<X>,
      orDieWith: (a: Y) => unknown
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  },
  {
    <R, E, A, B extends A, X extends A>(
      self: Effect.Effect<R, E, A>,
      filter: Predicate.Refinement<A, B>,
      orDieWith: (a: X) => unknown
    ): Effect.Effect<R, E, B>
    <R, E, A, X extends A, Y extends A>(
      self: Effect.Effect<R, E, A>,
      filter: Predicate.Predicate<X>,
      orDieWith: (a: Y) => unknown
    ): Effect.Effect<R, E, A>
  }
>(3, <R, E, A, X extends A, Y extends A>(
  self: Effect.Effect<R, E, A>,
  filter: Predicate.Predicate<X>,
  orDieWith: (a: Y) => unknown
): Effect.Effect<R, E, A> => filterOrElse(self, filter, (a) => core.dieSync(() => orDieWith(a as Y))))

/* @internal */
export const filterOrDieMessage = dual<
  {
    <A, B extends A>(
      filter: Predicate.Refinement<A, B>,
      message: string
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
    <A, X extends A>(
      filter: Predicate.Predicate<X>,
      message: string
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  },
  {
    <R, E, A, B extends A>(
      self: Effect.Effect<R, E, A>,
      filter: Predicate.Refinement<A, B>,
      message: string
    ): Effect.Effect<R, E, B>
    <R, E, A, X extends A>(
      self: Effect.Effect<R, E, A>,
      filter: Predicate.Predicate<X>,
      message: string
    ): Effect.Effect<R, E, A>
  }
>(3, <R, E, A, X extends A>(
  self: Effect.Effect<R, E, A>,
  filter: Predicate.Predicate<X>,
  message: string
): Effect.Effect<R, E, A> => filterOrElse(self, filter, () => core.dieMessage(message)))

/* @internal */
export const filterOrElse = dual<
  {
    <A, B extends A, X extends A, R2, E2, C>(
      filter: Predicate.Refinement<A, B>,
      orElse: (a: X) => Effect.Effect<R2, E2, C>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, B | C>
    <A, X extends A, Y extends A, R2, E2, B>(
      filter: Predicate.Predicate<X>,
      orElse: (a: Y) => Effect.Effect<R2, E2, B>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | B>
  },
  {
    <R, E, A, B extends A, X extends A, R2, E2, C>(
      self: Effect.Effect<R, E, A>,
      filter: Predicate.Refinement<A, B>,
      orElse: (a: X) => Effect.Effect<R2, E2, C>
    ): Effect.Effect<R | R2, E | E2, B | C>
    <R, E, A, X extends A, Y extends A, R2, E2, B>(
      self: Effect.Effect<R, E, A>,
      filter: Predicate.Predicate<X>,
      orElse: (a: Y) => Effect.Effect<R2, E2, B>
    ): Effect.Effect<R | R2, E | E2, A | B>
  }
>(3, <R, E, A, R2, E2, B>(
  self: Effect.Effect<R, E, A>,
  filter: Predicate.Predicate<A>,
  orElse: (a: A) => Effect.Effect<R2, E2, B>
): Effect.Effect<R | R2, E | E2, A | B> =>
  core.flatMap(
    self,
    (a) => filter(a) ? core.succeed<A | B>(a) : orElse(a)
  ))

/* @internal */
export const filterOrFail = dual<
  {
    <A, B extends A, X extends A, E2>(
      filter: Predicate.Refinement<A, B>,
      orFailWith: (a: X) => E2
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, B>
    <A, X extends A, Y extends A, E2>(
      filter: Predicate.Predicate<X>,
      orFailWith: (a: Y) => E2
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, A>
  },
  {
    <R, E, A, B extends A, X extends A, E2>(
      self: Effect.Effect<R, E, A>,
      filter: Predicate.Refinement<A, B>,
      orFailWith: (a: X) => E2
    ): Effect.Effect<R, E | E2, B>
    <R, E, A, X extends A, Y extends A, E2>(
      self: Effect.Effect<R, E, A>,
      filter: Predicate.Predicate<X>,
      orFailWith: (a: Y) => E2
    ): Effect.Effect<R, E | E2, A>
  }
>(3, <R, E, A, X extends A, Y extends A, E2>(
  self: Effect.Effect<R, E, A>,
  filter: Predicate.Predicate<X>,
  orFailWith: (a: Y) => E2
): Effect.Effect<R, E | E2, A> => filterOrElse(self, filter, (a) => core.failSync(() => orFailWith(a as Y))))

/* @internal */
export const findFirst = dual<
  <A, R, E>(
    f: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Option.Option<A>>,
  <A, R, E>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => Effect.Effect<R, E, Option.Option<A>>
>(2, (elements, f) =>
  core.suspend(() => {
    const iterator = elements[Symbol.iterator]()
    const next = iterator.next()
    if (!next.done) {
      return findLoop(iterator, 0, f, next.value)
    }
    return core.succeed(Option.none())
  }))

const findLoop = <A, R, E>(
  iterator: Iterator<A>,
  index: number,
  f: (a: A, i: number) => Effect.Effect<R, E, boolean>,
  value: A
): Effect.Effect<R, E, Option.Option<A>> =>
  core.flatMap(f(value, index), (result) => {
    if (result) {
      return core.succeed(Option.some(value))
    }
    const next = iterator.next()
    if (!next.done) {
      return findLoop(iterator, index + 1, f, next.value)
    }
    return core.succeed(Option.none())
  })

/* @internal */
export const firstSuccessOf = <R, E, A>(effects: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A> =>
  core.suspend(() => {
    const list = Chunk.fromIterable(effects)
    if (!Chunk.isNonEmpty(list)) {
      return core.dieSync(() => new core.IllegalArgumentException(`Received an empty collection of effects`))
    }
    return pipe(
      Chunk.tailNonEmpty(list),
      ReadonlyArray.reduce(Chunk.headNonEmpty(list), (left, right) => core.orElse(left, () => right))
    )
  })

/* @internal */
export const flipWith = dual<
  <R, A, E, R2, A2, E2>(
    f: (effect: Effect.Effect<R, A, E>) => Effect.Effect<R2, A2, E2>
  ) => (self: Effect.Effect<R, E, A>) => Effect.Effect<R2, E2, A2>,
  <R, A, E, R2, A2, E2>(
    self: Effect.Effect<R, E, A>,
    f: (effect: Effect.Effect<R, A, E>) => Effect.Effect<R2, A2, E2>
  ) => Effect.Effect<R2, E2, A2>
>(2, (self, f) => core.flip(f(core.flip(self))))

/* @internal */
export const match = dual<
  <E, A, A2, A3>(
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, A2 | A3>,
  <R, E, A, A2, A3>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ) => Effect.Effect<R, never, A2 | A3>
>(2, (self, { onFailure, onSuccess }) =>
  core.matchEffect(self, {
    onFailure: (e) => core.succeed(onFailure(e)),
    onSuccess: (a) => core.succeed(onSuccess(a))
  }))

/* @internal */
export const every = dual<
  <R, E, A>(
    f: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, boolean>,
  <R, E, A>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, boolean>) => Effect.Effect<R, E, boolean>
>(2, (elements, f) => core.suspend(() => forAllLoop(elements[Symbol.iterator](), 0, f)))

const forAllLoop = <R, E, A>(
  iterator: Iterator<A>,
  index: number,
  f: (a: A, i: number) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, boolean> => {
  const next = iterator.next()
  return next.done
    ? core.succeed(true)
    : core.flatMap(
      f(next.value, index),
      (b) => b ? forAllLoop(iterator, index + 1, f) : core.succeed(b)
    )
}

/* @internal */
export const forever = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, never> => {
  const loop: Effect.Effect<R, E, never> = core.flatMap(core.flatMap(self, () => core.yieldNow()), () => loop)
  return loop
}

/** @internal */
class EffectGen {
  constructor(readonly value: Effect.Effect<any, any, any>) {
  }
  [Symbol.iterator]() {
    return new SingleShotGen.SingleShotGen(this)
  }
}

const adapter = function() {
  let x = arguments[0]
  for (let i = 1; i < arguments.length; i++) {
    x = arguments[i](x)
  }
  return new EffectGen(x) as any
}

/**
 * Inspired by https://github.com/tusharmath/qio/pull/22 (revised)
  @internal */
export const gen: typeof Effect.gen = function() {
  let f: any
  if (arguments.length === 1) {
    f = arguments[0]
  } else {
    f = arguments[1].bind(arguments[0])
  }
  internalize(f)
  return core.suspend(() => {
    const iterator = f(adapter)
    const state = iterator.next()
    const run = (
      state: IteratorYieldResult<any> | IteratorReturnResult<any>
    ): Effect.Effect<any, any, any> => (state.done
      ? core.succeed(state.value)
      : pipe(
        state.value.value as unknown as Effect.Effect<any, any, any>,
        core.flatMap((val: any) => run(iterator.next(val)))
      ))
    return run(state)
  })
}

/* @internal */
export const fiberRefs: Effect.Effect<never, never, FiberRefs.FiberRefs> = core.withFiberRuntime<
  never,
  never,
  FiberRefs.FiberRefs
>((state) => core.succeed(state.getFiberRefs()))

/* @internal */
export const head = <R, E, A>(
  self: Effect.Effect<R, E, Iterable<A>>
): Effect.Effect<R, E | Cause.NoSuchElementException, A> =>
  core.flatMap(self, (as) => {
    const iterator = as[Symbol.iterator]()
    const next = iterator.next()
    if (next.done) {
      return core.fail(new core.NoSuchElementException())
    }
    return core.succeed(next.value)
  })

/* @internal */
export const ignore = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, void> =>
  match(self, { onFailure: constVoid, onSuccess: constVoid })

/* @internal */
export const ignoreLogged = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, void> =>
  core.matchCauseEffect(self, {
    onFailure: (cause) => logDebug(cause, "An error was silently ignored because it is not anticipated to be useful"),
    onSuccess: () => core.unit
  })

/* @internal */
export const inheritFiberRefs = (childFiberRefs: FiberRefs.FiberRefs) =>
  updateFiberRefs((parentFiberId, parentFiberRefs) => FiberRefs.joinAs(parentFiberRefs, parentFiberId, childFiberRefs))

/* @internal */
export const isFailure = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, boolean> =>
  match(self, { onFailure: constTrue, onSuccess: constFalse })

/* @internal */
export const isSuccess = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, boolean> =>
  match(self, { onFailure: constFalse, onSuccess: constTrue })

/* @internal */
export const iterate = <Z, R, E>(
  initial: Z,
  options: {
    readonly while: Predicate.Predicate<Z>
    readonly body: (z: Z) => Effect.Effect<R, E, Z>
  }
): Effect.Effect<R, E, Z> =>
  core.suspend<R, E, Z>(() => {
    if (options.while(initial)) {
      return core.flatMap(options.body(initial), (z2) => iterate(z2, options))
    }
    return core.succeed(initial)
  })

const logWithLevel = (level?: LogLevel.LogLevel) =>
<A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
): Effect.Effect<never, never, void> => {
  const levelOption = Option.fromNullable(level)
  let message: unknown
  let cause: Cause.Cause<unknown>
  if (internalCause.isCause(messageOrCause)) {
    cause = messageOrCause
    message = (supplementary as unknown) ?? ""
  } else {
    message = messageOrCause
    cause = (supplementary as Cause.Cause<unknown>) ?? internalCause.empty
  }
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, levelOption)
    return core.unit
  })
}

/** @internal */
export const log: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect.Effect<never, never, void> = logWithLevel()

/** @internal */
export const logTrace: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect.Effect<never, never, void> = logWithLevel(LogLevel.Trace)

/** @internal */
export const logDebug: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect.Effect<never, never, void> = logWithLevel(LogLevel.Debug)

/** @internal */
export const logInfo: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect.Effect<never, never, void> = logWithLevel(LogLevel.Info)

/** @internal */
export const logWarning: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect.Effect<never, never, void> = logWithLevel(LogLevel.Warning)

/** @internal */
export const logError: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect.Effect<never, never, void> = logWithLevel(LogLevel.Error)

/** @internal */
export const logFatal: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect.Effect<never, never, void> = logWithLevel(LogLevel.Fatal)

/* @internal */
export const withLogSpan = dual<
  (label: string) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, label: string) => Effect.Effect<R, E, A>
>(2, (effect, label) =>
  core.flatMap(Clock.currentTimeMillis, (now) =>
    core.fiberRefLocallyWith(
      effect,
      core.currentLogSpan,
      List.prepend(LogSpan.make(label, now))
    )))

/* @internal */
export const logAnnotations: Effect.Effect<never, never, HashMap.HashMap<string, unknown>> = core
  .fiberRefGet(
    core.currentLogAnnotations
  )

/* @internal */
// @ts-expect-error
export const loop: {
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: Predicate.Predicate<Z>
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => Effect.Effect<R, E, A>
      readonly discard?: false | undefined
    }
  ): Effect.Effect<R, E, Array<A>>
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: Predicate.Predicate<Z>
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => Effect.Effect<R, E, A>
      readonly discard: true
    }
  ): Effect.Effect<R, E, void>
} = <Z, R, E, A>(
  initial: Z,
  options: {
    readonly while: Predicate.Predicate<Z>
    readonly step: (z: Z) => Z
    readonly body: (z: Z) => Effect.Effect<R, E, A>
    readonly discard?: boolean | undefined
  }
): Effect.Effect<R, E, Array<A>> | Effect.Effect<R, E, void> =>
  options.discard
    ? loopDiscard(initial, options.while, options.step, options.body)
    : core.map(loopInternal(initial, options.while, options.step, options.body), (x) => Array.from(x))

const loopInternal = <Z, R, E, A>(
  initial: Z,
  cont: Predicate.Predicate<Z>,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, List.List<A>> =>
  core.suspend(() =>
    cont(initial)
      ? core.flatMap(body(initial), (a) =>
        core.map(
          loopInternal(inc(initial), cont, inc, body),
          List.prepend(a)
        ))
      : core.sync(() => List.empty())
  )

const loopDiscard = <Z, R, E, X>(
  initial: Z,
  cont: Predicate.Predicate<Z>,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, X>
): Effect.Effect<R, E, void> =>
  core.suspend(() =>
    cont(initial)
      ? core.flatMap(
        body(initial),
        () => loopDiscard(inc(initial), cont, inc, body)
      )
      : core.unit
  )

/* @internal */
export const mapAccum = dual<
  <A, B, R, E, Z>(
    zero: Z,
    f: (z: Z, a: A, i: number) => Effect.Effect<R, E, readonly [Z, B]>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, [Z, Array<B>]>,
  <A, B, R, E, Z>(
    elements: Iterable<A>,
    zero: Z,
    f: (z: Z, a: A, i: number) => Effect.Effect<R, E, readonly [Z, B]>
  ) => Effect.Effect<R, E, [Z, Array<B>]>
>(3, <A, B, R, E, Z>(
  elements: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A, i: number) => Effect.Effect<R, E, readonly [Z, B]>
): Effect.Effect<R, E, [Z, Array<B>]> =>
  core.suspend(() => {
    const iterator = elements[Symbol.iterator]()
    const builder: Array<B> = []
    let result: Effect.Effect<R, E, Z> = core.succeed(zero)
    let next: IteratorResult<A, any>
    let i = 0
    while (!(next = iterator.next()).done) {
      const index = i++
      result = core.flatMap(result, (state) =>
        core.map(f(state, next.value, index), ([z, b]) => {
          builder.push(b)
          return z
        }))
    }
    return core.map(result, (z) => [z, builder])
  }))

/* @internal */
export const mapErrorCause = dual<
  <E, E2>(
    f: (cause: Cause.Cause<E>) => Cause.Cause<E2>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E2, A>,
  <R, E, A, E2>(self: Effect.Effect<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => Effect.Effect<R, E2, A>
>(2, (self, f) =>
  core.matchCauseEffect(self, {
    onFailure: (c) => core.failCauseSync(() => f(c)),
    onSuccess: core.succeed
  }))

/* @internal */
export const memoize = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<never, never, Effect.Effect<R, E, A>> =>
  pipe(
    core.deferredMake<E, [[FiberRefsPatch.FiberRefsPatch, runtimeFlagsPatch.RuntimeFlagsPatch], A]>(),
    core.flatMap((deferred) =>
      pipe(
        diffFiberRefsAndRuntimeFlags(self),
        core.intoDeferred(deferred),
        once,
        core.map((complete) =>
          core.zipRight(
            complete,
            pipe(
              core.deferredAwait(deferred),
              core.flatMap(([patch, a]) =>
                core.as(core.zip(patchFiberRefs(patch[0]), core.updateRuntimeFlags(patch[1])), a)
              )
            )
          )
        )
      )
    )
  )

/* @internal */
export const merge = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, E | A> =>
  core.matchEffect(self, {
    onFailure: (e) => core.succeed(e),
    onSuccess: core.succeed
  })

/* @internal */
export const negate = <R, E>(self: Effect.Effect<R, E, boolean>): Effect.Effect<R, E, boolean> =>
  core.map(self, (b) => !b)

/* @internal */
export const none = <R, E, A>(
  self: Effect.Effect<R, E, Option.Option<A>>
): Effect.Effect<R, E | Cause.NoSuchElementException, void> =>
  core.flatMap(self, (option) => {
    switch (option._tag) {
      case "None": {
        return core.unit
      }
      case "Some": {
        return core.fail(new core.NoSuchElementException())
      }
    }
  })

/* @internal */
export const once = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<never, never, Effect.Effect<R, E, void>> =>
  core.map(
    Ref.make(true),
    (ref) => core.asUnit(core.whenEffect(self, Ref.getAndSet(ref, false)))
  )

/* @internal */
export const option = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Option.Option<A>> =>
  core.matchEffect(self, {
    onFailure: () => core.succeed(Option.none()),
    onSuccess: (a) => core.succeed(Option.some(a))
  })

/* @internal */
export const orElseFail = dual<
  <E2>(evaluate: LazyArg<E2>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E2, A>,
  <R, E, A, E2>(self: Effect.Effect<R, E, A>, evaluate: LazyArg<E2>) => Effect.Effect<R, E2, A>
>(2, (self, evaluate) => core.orElse(self, () => core.failSync(evaluate)))

/* @internal */
export const orElseSucceed = dual<
  <A2>(evaluate: LazyArg<A2>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, A | A2>,
  <R, E, A, A2>(self: Effect.Effect<R, E, A>, evaluate: LazyArg<A2>) => Effect.Effect<R, never, A | A2>
>(2, (self, evaluate) => core.orElse(self, () => core.sync(evaluate)))

/* @internal */
export const parallelErrors = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Array<E>, A> =>
  core.matchCauseEffect(self, {
    onFailure: (cause) => {
      const errors = Array.from(internalCause.failures(cause))
      return errors.length === 0
        ? core.failCause(cause as Cause.Cause<never>)
        : core.fail(errors)
    },
    onSuccess: core.succeed
  })

/* @internal */
export const patchFiberRefs = (patch: FiberRefsPatch.FiberRefsPatch): Effect.Effect<never, never, void> =>
  updateFiberRefs((fiberId, fiberRefs) => pipe(patch, fiberRefsPatch.patch(fiberId, fiberRefs)))

/* @internal */
export const promise = <A>(evaluate: (signal: AbortSignal) => Promise<A>): Effect.Effect<never, never, A> =>
  evaluate.length >= 1
    ? core.async<never, never, A>((resolve, signal) => {
      evaluate(signal)
        .then((a) => resolve(core.exitSucceed(a)))
        .catch((e) => resolve(core.exitDie(e)))
    })
    : core.async<never, never, A>((resolve) => {
      ;(evaluate as LazyArg<Promise<A>>)()
        .then((a) => resolve(core.exitSucceed(a)))
        .catch((e) => resolve(core.exitDie(e)))
    })

/* @internal */
export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Context.Tag.Identifier<T>>, E, A>,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Effect.Effect<R, E, A>,
    tag: T,
    service: Context.Tag.Service<T>
  ) => Effect.Effect<Exclude<R, Context.Tag.Identifier<T>>, E, A>
>(
  3,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Effect.Effect<R, E, A>,
    tag: T,
    service: Context.Tag.Service<T>
  ): Effect.Effect<Exclude<R, Context.Tag.Identifier<T>>, E, A> =>
    core.contextWithEffect((env) =>
      core.provideContext(
        self as Effect.Effect<Context.Tag.Identifier<T> | Exclude<R, Context.Tag.Identifier<T>>, E, A>,
        Context.add(env, tag, service)
      )
    )
)

/* @internal */
export const provideServiceEffect = dual<
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R1 | Exclude<R, Context.Tag.Identifier<T>>, E | E1, A>,
  <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
    self: Effect.Effect<R, E, A>,
    tag: T,
    effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
  ) => Effect.Effect<R1 | Exclude<R, Context.Tag.Identifier<T>>, E | E1, A>
>(3, <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
  self: Effect.Effect<R, E, A>,
  tag: T,
  effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
) =>
  core.contextWithEffect((env: Context.Context<R1 | Exclude<R, Context.Tag.Identifier<T>>>) =>
    core.flatMap(
      effect,
      (service) => core.provideContext(self, pipe(env, Context.add(tag, service)) as Context.Context<R | R1>)
    )
  ))

/* @internal */
export const random: Effect.Effect<never, never, Random.Random> = defaultServices.randomWith(core.succeed)

/* @internal */
export const reduce = dual<
  <Z, A, R, E>(
    zero: Z,
    f: (z: Z, a: A, i: number) => Effect.Effect<R, E, Z>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Z>,
  <Z, A, R, E>(
    elements: Iterable<A>,
    zero: Z,
    f: (z: Z, a: A, i: number) => Effect.Effect<R, E, Z>
  ) => Effect.Effect<R, E, Z>
>(
  3,
  <Z, A, R, E>(elements: Iterable<A>, zero: Z, f: (z: Z, a: A, i: number) => Effect.Effect<R, E, Z>) =>
    ReadonlyArray.fromIterable(elements).reduce(
      (acc, el, i) => core.flatMap(acc, (a) => f(a, el, i)),
      core.succeed(zero) as Effect.Effect<R, E, Z>
    )
)

/* @internal */
export const reduceRight = dual<
  <A, Z, R, E>(
    zero: Z,
    f: (a: A, z: Z, i: number) => Effect.Effect<R, E, Z>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Z>,
  <A, Z, R, E>(
    elements: Iterable<A>,
    zero: Z,
    f: (a: A, z: Z, i: number) => Effect.Effect<R, E, Z>
  ) => Effect.Effect<R, E, Z>
>(
  3,
  <A, Z, R, E>(elements: Iterable<A>, zero: Z, f: (a: A, z: Z, i: number) => Effect.Effect<R, E, Z>) =>
    ReadonlyArray.fromIterable(elements).reduceRight(
      (acc, el, i) => core.flatMap(acc, (a) => f(el, a, i)),
      core.succeed(zero) as Effect.Effect<R, E, Z>
    )
)

/* @internal */
export const reduceWhile = dual<
  <A, R, E, Z>(
    zero: Z,
    options: {
      readonly while: Predicate.Predicate<Z>
      readonly body: (s: Z, a: A, i: number) => Effect.Effect<R, E, Z>
    }
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Z>,
  <A, R, E, Z>(
    elements: Iterable<A>,
    zero: Z,
    options: {
      readonly while: Predicate.Predicate<Z>
      readonly body: (s: Z, a: A, i: number) => Effect.Effect<R, E, Z>
    }
  ) => Effect.Effect<R, E, Z>
>(3, <A, R, E, Z>(
  elements: Iterable<A>,
  zero: Z,
  options: {
    readonly while: Predicate.Predicate<Z>
    readonly body: (s: Z, a: A, i: number) => Effect.Effect<R, E, Z>
  }
) =>
  core.flatMap(
    core.sync(() => elements[Symbol.iterator]()),
    (iterator) => reduceWhileLoop(iterator, 0, zero, options.while, options.body)
  ))

const reduceWhileLoop = <A, R, E, Z>(
  iterator: Iterator<A>,
  index: number,
  state: Z,
  predicate: Predicate.Predicate<Z>,
  f: (s: Z, a: A, i: number) => Effect.Effect<R, E, Z>
): Effect.Effect<R, E, Z> => {
  const next = iterator.next()
  if (!next.done && predicate(state)) {
    return core.flatMap(
      f(state, next.value, index),
      (nextState) => reduceWhileLoop(iterator, index + 1, nextState, predicate, f)
    )
  }
  return core.succeed(state)
}

/* @internal */
export const repeatN = dual<
  (n: number) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, n: number) => Effect.Effect<R, E, A>
>(2, (self, n) => core.suspend(() => repeatNLoop(self, n)))

/* @internal */
const repeatNLoop = <R, E, A>(self: Effect.Effect<R, E, A>, n: number): Effect.Effect<R, E, A> =>
  core.flatMap(self, (a) =>
    n <= 0
      ? core.succeed(a)
      : core.zipRight(core.yieldNow(), repeatNLoop(self, n - 1)))

/* @internal */
export const sandbox = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Cause.Cause<E>, A> =>
  core.matchCauseEffect(self, {
    onFailure: core.fail,
    onSuccess: core.succeed
  })

/* @internal */
export const setFiberRefs = (fiberRefs: FiberRefs.FiberRefs): Effect.Effect<never, never, void> =>
  core.suspend(() => FiberRefs.setAll(fiberRefs))

/* @internal */
export const sleep: (duration: Duration.DurationInput) => Effect.Effect<never, never, void> = Clock.sleep

/* @internal */
export const succeedNone: Effect.Effect<never, never, Option.Option<never>> = core.succeed(Option.none())

/* @internal */
export const succeedSome = <A>(value: A): Effect.Effect<never, never, Option.Option<A>> =>
  core.succeed(Option.some(value))

/* @internal */
export const summarized = dual<
  <R2, E2, B, C>(
    summary: Effect.Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, [C, A]>,
  <R, E, A, R2, E2, B, C>(
    self: Effect.Effect<R, E, A>,
    summary: Effect.Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ) => Effect.Effect<R | R2, E | E2, [C, A]>
>(
  3,
  (self, summary, f) =>
    core.flatMap(
      summary,
      (start) => core.flatMap(self, (value) => core.map(summary, (end) => [f(start, end), value]))
    )
)

/* @internal */
export const tagMetrics = dual<
  {
    (key: string, value: string): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
    (
      values: Record<string, string>
    ): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  },
  {
    <R, E, A>(effect: Effect.Effect<R, E, A>, key: string, value: string): Effect.Effect<R, E, A>
    <R, E, A>(effect: Effect.Effect<R, E, A>, values: Record<string, string>): Effect.Effect<R, E, A>
  }
>((args) => core.isEffect(args[0]), function() {
  return labelMetrics(
    arguments[0],
    typeof arguments[1] === "string"
      ? [metricLabel.make(arguments[1], arguments[2])]
      : Object.entries<string>(arguments[1]).map(([k, v]) => metricLabel.make(k, v))
  )
})

/* @internal */
export const labelMetrics = dual<
  (labels: Iterable<MetricLabel.MetricLabel>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, labels: Iterable<MetricLabel.MetricLabel>) => Effect.Effect<R, E, A>
>(
  2,
  (self, labels) => core.fiberRefLocallyWith(self, core.currentMetricLabels, (old) => ReadonlyArray.union(old, labels))
)

/* @internal */
export const takeUntil = dual<
  <R, E, A>(
    predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <R, E, A>(
    elements: Iterable<A>,
    predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => Effect.Effect<R, E, Array<A>>
>(
  2,
  <R, E, A>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>) =>
    core.suspend(() => {
      const iterator = elements[Symbol.iterator]()
      const builder: Array<A> = []
      let next: IteratorResult<A, any>
      let effect: Effect.Effect<R, E, boolean> = core.succeed(false)
      let i = 0
      while ((next = iterator.next()) && !next.done) {
        const a = next.value
        const index = i++
        effect = core.flatMap(effect, (bool) => {
          if (bool) {
            return core.succeed(true)
          }
          builder.push(a)
          return predicate(a, index)
        })
      }
      return core.map(effect, () => builder)
    })
)

/* @internal */
export const takeWhile = dual<
  <R, E, A>(
    predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <R, E, A>(
    elements: Iterable<A>,
    predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>
  ) => Effect.Effect<R, E, Array<A>>
>(
  2,
  <R, E, A>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect.Effect<R, E, boolean>) =>
    core.suspend(() => {
      const iterator = elements[Symbol.iterator]()
      const builder: Array<A> = []
      let next: IteratorResult<A, any>
      let taking: Effect.Effect<R, E, boolean> = core.succeed(true)
      let i = 0
      while ((next = iterator.next()) && !next.done) {
        const a = next.value
        const index = i++
        taking = core.flatMap(taking, (taking) =>
          pipe(
            taking ? predicate(a, index) : core.succeed(false),
            core.map((bool) => {
              if (bool) {
                builder.push(a)
              }
              return bool
            })
          ))
      }
      return core.map(taking, () => builder)
    })
)

/* @internal */
export const tapBoth = dual<
  <E, XE extends E, A, XA extends A, R2, E2, X, R3, E3, X1>(
    options: {
      readonly onFailure: (e: XE) => Effect.Effect<R2, E2, X>
      readonly onSuccess: (a: XA) => Effect.Effect<R3, E3, X1>
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | R3, E | E2 | E3, A>,
  <R, E, A, XE extends E, XA extends A, R2, E2, X, R3, E3, X1>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onFailure: (e: XE) => Effect.Effect<R2, E2, X>
      readonly onSuccess: (a: XA) => Effect.Effect<R3, E3, X1>
    }
  ) => Effect.Effect<R | R2 | R3, E | E2 | E3, A>
>(2, (self, { onFailure, onSuccess }) =>
  core.matchCauseEffect(self, {
    onFailure: (cause) => {
      const either = internalCause.failureOrCause(cause)
      switch (either._tag) {
        case "Left": {
          return core.zipRight(onFailure(either.left as any), core.failCause(cause))
        }
        case "Right": {
          return core.failCause(cause)
        }
      }
    },
    onSuccess: (a) => core.as(onSuccess(a as any), a)
  }))

/* @internal */
export const tapDefect = dual<
  <R2, E2, X>(
    f: (cause: Cause.Cause<never>) => Effect.Effect<R2, E2, X>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, X>(
    self: Effect.Effect<R, E, A>,
    f: (cause: Cause.Cause<never>) => Effect.Effect<R2, E2, X>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, f) =>
  core.catchAllCause(self, (cause) =>
    Option.match(internalCause.keepDefects(cause), {
      onNone: () => core.failCause(cause),
      onSome: (a) => core.zipRight(f(a), core.failCause(cause))
    })))

/* @internal */
export const tapError = dual<
  <E, XE extends E, R2, E2, X>(
    f: (e: XE) => Effect.Effect<R2, E2, X>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, XE extends E, A, R2, E2, X>(
    self: Effect.Effect<R, E, A>,
    f: (e: XE) => Effect.Effect<R2, E2, X>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, f) =>
  core.matchCauseEffect(self, {
    onFailure: (cause) => {
      const either = internalCause.failureOrCause(cause)
      switch (either._tag) {
        case "Left": {
          return core.zipRight(f(either.left as any), core.failCause(cause))
        }
        case "Right": {
          return core.failCause(cause)
        }
      }
    },
    onSuccess: core.succeed
  }))

/* @internal */
export const tapErrorTag = dual<
  <K extends (E extends { _tag: string } ? E["_tag"] : never), E, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E1, A>,
  <R, E, A, K extends (E extends { _tag: string } ? E["_tag"] : never), R1, E1, A1>(
    self: Effect.Effect<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ) => Effect.Effect<R | R1, E | E1, A>
>(3, (self, k, f) =>
  tapError(self, (e) => {
    if (Predicate.isTagged(e, k)) {
      return f(e as any)
    }
    return core.unit as any
  }))

/* @internal */
export const tapErrorCause = dual<
  <E, XE extends E, R2, E2, X>(
    f: (cause: Cause.Cause<XE>) => Effect.Effect<R2, E2, X>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, XE extends E, R2, E2, X>(
    self: Effect.Effect<R, E, A>,
    f: (cause: Cause.Cause<XE>) => Effect.Effect<R2, E2, X>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, f) =>
  core.matchCauseEffect(self, {
    onFailure: (cause) => core.zipRight(f(cause as any), core.failCause(cause)),
    onSuccess: core.succeed
  }))

/* @internal */
export const timed = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, [Duration.Duration, A]> => timedWith(self, Clock.currentTimeNanos)

/* @internal */
export const timedWith = dual<
  <R1, E1>(
    nanoseconds: Effect.Effect<R1, E1, bigint>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E1, [Duration.Duration, A]>,
  <R, E, A, R1, E1>(
    self: Effect.Effect<R, E, A>,
    nanoseconds: Effect.Effect<R1, E1, bigint>
  ) => Effect.Effect<R | R1, E | E1, [Duration.Duration, A]>
>(
  2,
  (self, nanos) => summarized(self, nanos, (start, end) => Duration.nanos(end - start))
)

/* @internal */
export const tracerWith: <R, E, A>(f: (tracer: Tracer.Tracer) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  Tracer.tracerWith

/** @internal */
export const tracer: Effect.Effect<never, never, Tracer.Tracer> = tracerWith(core.succeed)

/* @internal */
export const tryPromise: {
  <A, E>(
    options: {
      readonly try: (signal: AbortSignal) => Promise<A>
      readonly catch: (error: unknown) => E
    }
  ): Effect.Effect<never, E, A>
  <A>(try_: (signal: AbortSignal) => Promise<A>): Effect.Effect<never, Cause.UnknownException, A>
} = <A, E>(
  arg: ((signal: AbortSignal) => Promise<A>) | {
    readonly try: (signal: AbortSignal) => Promise<A>
    readonly catch: (error: unknown) => E
  }
): Effect.Effect<never, E | Cause.UnknownException, A> => {
  let evaluate: (signal?: AbortSignal) => Promise<A>
  let catcher: ((error: unknown) => E) | undefined = undefined
  if (typeof arg === "function") {
    evaluate = arg as (signal?: AbortSignal) => Promise<A>
  } else {
    evaluate = arg.try as (signal?: AbortSignal) => Promise<A>
    catcher = arg.catch
  }

  if (evaluate.length >= 1) {
    return core.async((resolve, signal) => {
      try {
        evaluate(signal)
          .then((a) => resolve(core.exitSucceed(a)))
          .catch((e) =>
            resolve(core.fail(
              catcher ? catcher(e) : new core.UnknownException(e)
            ))
          )
      } catch (e) {
        resolve(core.fail(
          catcher ? catcher(e) : new core.UnknownException(e)
        ))
      }
    })
  }

  return core.async((resolve) => {
    try {
      evaluate()
        .then((a) => resolve(core.exitSucceed(a)))
        .catch((e) =>
          resolve(core.fail(
            catcher ? catcher(e) : new core.UnknownException(e)
          ))
        )
    } catch (e) {
      resolve(core.fail(
        catcher ? catcher(e) : new core.UnknownException(e)
      ))
    }
  })
}

/* @internal */
export const tryMap = dual<
  <A, B, E1>(
    options: {
      readonly try: (a: A) => B
      readonly catch: (error: unknown) => E1
    }
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E1, B>,
  <R, E, A, B, E1>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly try: (a: A) => B
      readonly catch: (error: unknown) => E1
    }
  ) => Effect.Effect<R, E | E1, B>
>(2, (self, options) =>
  core.flatMap(self, (a) =>
    try_({
      try: () => options.try(a),
      catch: options.catch
    })))

/* @internal */
export const tryMapPromise = dual<
  <A, B, E1>(
    options: {
      readonly try: (a: A, signal: AbortSignal) => Promise<B>
      readonly catch: (error: unknown) => E1
    }
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E1, B>,
  <R, E, A, B, E1>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly try: (a: A, signal: AbortSignal) => Promise<B>
      readonly catch: (error: unknown) => E1
    }
  ) => Effect.Effect<R, E | E1, B>
>(2, <R, E, A, B, E1>(
  self: Effect.Effect<R, E, A>,
  options: {
    readonly try: (a: A, signal: AbortSignal) => Promise<B>
    readonly catch: (error: unknown) => E1
  }
): Effect.Effect<R, E | E1, B> =>
  core.flatMap(self, (a) =>
    tryPromise({
      try: options.try.length >= 1
        ? (signal) => options.try(a, signal)
        : () => (options.try as (a: A) => Promise<B>)(a),
      catch: options.catch
    })))

/* @internal */
export const unless = dual<
  (predicate: LazyArg<boolean>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, Option.Option<A>>,
  <R, E, A>(self: Effect.Effect<R, E, A>, predicate: LazyArg<boolean>) => Effect.Effect<R, E, Option.Option<A>>
>(2, (self, predicate) =>
  core.suspend(() =>
    predicate()
      ? succeedNone
      : asSome(self)
  ))

/* @internal */
export const unlessEffect = dual<
  <R2, E2>(
    predicate: Effect.Effect<R2, E2, boolean>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, Option.Option<A>>,
  <R, E, A, R2, E2>(
    self: Effect.Effect<R, E, A>,
    predicate: Effect.Effect<R2, E2, boolean>
  ) => Effect.Effect<R | R2, E | E2, Option.Option<A>>
>(2, (self, predicate) => core.flatMap(predicate, (b) => (b ? succeedNone : asSome(self))))

/* @internal */
export const unsandbox = <R, E, A>(self: Effect.Effect<R, Cause.Cause<E>, A>) =>
  mapErrorCause(self, internalCause.flatten)

/* @internal */
export const updateFiberRefs = (
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
): Effect.Effect<never, never, void> =>
  core.withFiberRuntime<never, never, void>((state) => {
    state.setFiberRefs(f(state.id(), state.getFiberRefs()))
    return core.unit
  })

/* @internal */
export const updateService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | Context.Tag.Identifier<T>, E, A>,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Effect.Effect<R, E, A>,
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => Effect.Effect<R | Context.Tag.Identifier<T>, E, A>
>(3, <R, E, A, T extends Context.Tag<any, any>>(
  self: Effect.Effect<R, E, A>,
  tag: T,
  f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
) =>
  core.mapInputContext(self, (context) =>
    Context.add(
      context,
      tag,
      f(Context.unsafeGet(context, tag))
    )) as Effect.Effect<R | Context.Tag.Identifier<T>, E, A>)

/* @internal */
export const when = dual<
  (predicate: LazyArg<boolean>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, Option.Option<A>>,
  <R, E, A>(self: Effect.Effect<R, E, A>, predicate: LazyArg<boolean>) => Effect.Effect<R, E, Option.Option<A>>
>(2, (self, predicate) =>
  core.suspend(() =>
    predicate()
      ? core.map(self, Option.some)
      : core.succeed(Option.none())
  ))

/* @internal */
export const whenFiberRef = dual<
  <S>(
    fiberRef: FiberRef.FiberRef<S>,
    predicate: Predicate.Predicate<S>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, [S, Option.Option<A>]>,
  <R, E, A, S>(
    self: Effect.Effect<R, E, A>,
    fiberRef: FiberRef.FiberRef<S>,
    predicate: Predicate.Predicate<S>
  ) => Effect.Effect<R, E, [S, Option.Option<A>]>
>(
  3,
  <R, E, A, S>(self: Effect.Effect<R, E, A>, fiberRef: FiberRef.FiberRef<S>, predicate: Predicate.Predicate<S>) =>
    core.flatMap(core.fiberRefGet(fiberRef), (s) =>
      predicate(s)
        ? core.map(self, (a) => [s, Option.some(a)])
        : core.succeed<[S, Option.Option<A>]>([s, Option.none()]))
)

/* @internal */
export const whenRef = dual<
  <S>(
    ref: Ref.Ref<S>,
    predicate: Predicate.Predicate<S>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, [S, Option.Option<A>]>,
  <R, E, A, S>(
    self: Effect.Effect<R, E, A>,
    ref: Ref.Ref<S>,
    predicate: Predicate.Predicate<S>
  ) => Effect.Effect<R, E, [S, Option.Option<A>]>
>(
  3,
  <R, E, A, S>(self: Effect.Effect<R, E, A>, ref: Ref.Ref<S>, predicate: Predicate.Predicate<S>) =>
    core.flatMap(Ref.get(ref), (s) =>
      predicate(s)
        ? core.map(self, (a) => [s, Option.some(a)])
        : core.succeed<[S, Option.Option<A>]>([s, Option.none()]))
)

/* @internal */
export const withMetric = dual<
  <Type, In, Out>(
    metric: Metric.Metric<Type, In, Out>
  ) => <R, E, A extends In>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A extends In, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, In, Out>
  ) => Effect.Effect<R, E, A>
>(2, (self, metric) => metric(self))

/** @internal */
export const serviceFunctionEffect = <T extends Context.Tag<any, any>, Args extends Array<any>, R, E, A>(
  service: T,
  f: (_: Context.Tag.Service<T>) => (...args: Args) => Effect.Effect<R, E, A>
) =>
(...args: Args): Effect.Effect<R | Context.Tag.Identifier<T>, E, A> => core.flatMap(service, (a) => f(a)(...args))

/** @internal */
export const serviceFunction = <T extends Context.Tag<any, any>, Args extends Array<any>, A>(
  service: T,
  f: (_: Context.Tag.Service<T>) => (...args: Args) => A
) =>
(...args: Args): Effect.Effect<Context.Tag.Identifier<T>, never, A> => core.map(service, (a) => f(a)(...args))

/** @internal */
export const serviceFunctions = <I, S>(
  tag: Context.Tag<I, S>
): {
  [k in { [k in keyof S]: S[k] extends (...args: Array<any>) => Effect.Effect<any, any, any> ? k : never }[keyof S]]:
    S[k] extends (...args: infer Args) => Effect.Effect<infer R, infer E, infer A>
      ? (...args: Args) => Effect.Effect<R | I, E, A>
      : never
} =>
  new Proxy({} as any, {
    get(_target: any, prop: any, _receiver) {
      return (...args: Array<any>) => core.flatMap(tag, (s: any) => s[prop](...args))
    }
  })

/** @internal */
export const serviceConstants = <I, S>(
  tag: Context.Tag<I, S>
): {
  [k in { [k in keyof S]: S[k] extends Effect.Effect<any, any, any> ? k : never }[keyof S]]: S[k] extends
    Effect.Effect<infer R, infer E, infer A> ? Effect.Effect<R | I, E, A> : never
} =>
  new Proxy({} as any, {
    get(_target: any, prop: any, _receiver) {
      return core.flatMap(tag, (s: any) => s[prop])
    }
  })

/** @internal */
export const serviceMembers = <I, S>(tag: Context.Tag<I, S>): {
  functions: {
    [k in { [k in keyof S]: S[k] extends (...args: Array<any>) => Effect.Effect<any, any, any> ? k : never }[keyof S]]:
      S[k] extends (...args: infer Args) => Effect.Effect<infer R, infer E, infer A>
        ? (...args: Args) => Effect.Effect<R | I, E, A>
        : never
  }
  constants: {
    [k in { [k in keyof S]: S[k] extends Effect.Effect<any, any, any> ? k : never }[keyof S]]: S[k] extends
      Effect.Effect<infer R, infer E, infer A> ? Effect.Effect<R | I, E, A> : never
  }
} => ({
  functions: serviceFunctions(tag),
  constants: serviceConstants(tag)
})

/** @internal */
export const serviceOption = <I, S>(tag: Context.Tag<I, S>) => core.map(core.context<never>(), Context.getOption(tag))

/** @internal */
export const serviceOptional = <I, S>(tag: Context.Tag<I, S>) =>
  core.flatMap(core.context<never>(), Context.getOption(tag))

// -----------------------------------------------------------------------------
// tracing
// -----------------------------------------------------------------------------

/* @internal */
export const annotateCurrentSpan: {
  (key: string, value: unknown): Effect.Effect<never, never, void>
  (values: Record<string, unknown>): Effect.Effect<never, never, void>
} = function(): Effect.Effect<never, never, void> {
  const args = arguments
  return ignore(core.flatMap(
    currentSpan,
    (span) =>
      core.sync(() => {
        if (typeof args[0] === "string") {
          span.attribute(args[0], args[1])
        } else {
          for (const key in args[0]) {
            span.attribute(key, args[0][key])
          }
        }
      })
  ))
}

/* @internal */
export const annotateSpans = dual<
  {
    (key: string, value: unknown): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
    (
      values: Record<string, unknown>
    ): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  },
  {
    <R, E, A>(effect: Effect.Effect<R, E, A>, key: string, value: unknown): Effect.Effect<R, E, A>
    <R, E, A>(effect: Effect.Effect<R, E, A>, values: Record<string, unknown>): Effect.Effect<R, E, A>
  }
>(
  (args) => core.isEffect(args[0]),
  function<R, E, A>() {
    const args = arguments
    return core.fiberRefLocallyWith(
      args[0] as Effect.Effect<R, E, A>,
      core.currentTracerSpanAnnotations,
      typeof args[1] === "string"
        ? HashMap.set(args[1], args[2])
        : (annotations) =>
          Object.entries(args[1] as Record<string, unknown>).reduce(
            (acc, [key, value]) => HashMap.set(acc, key, value),
            annotations
          )
    )
  }
)

/** @internal */
export const currentParentSpan: Effect.Effect<never, Cause.NoSuchElementException, Tracer.ParentSpan> = serviceOptional(
  internalTracer.spanTag
)

/** @internal */
export const currentSpan: Effect.Effect<never, Cause.NoSuchElementException, Tracer.Span> = core.flatMap(
  core.context<never>(),
  (context) => {
    const span = context.unsafeMap.get(internalTracer.spanTag) as Tracer.ParentSpan | undefined
    return span !== undefined && span._tag === "Span"
      ? core.succeed(span)
      : core.fail(new core.NoSuchElementException())
  }
)

const bigint0 = BigInt(0)
/** @internal */
export const currentTimeNanosTracing = core.fiberRefGetWith(
  core.currentTracerTimingEnabled,
  (enabled) => enabled ? Clock.currentTimeNanos : core.succeed(bigint0)
)

/* @internal */
export const linkSpans = dual<
  (
    span: Tracer.ParentSpan,
    attributes?: Record<string, unknown>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    span: Tracer.ParentSpan,
    attributes?: Record<string, unknown>
  ) => Effect.Effect<R, E, A>
>(
  (args) => core.isEffect(args[0]),
  (self, span, attributes) =>
    core.fiberRefLocallyWith(
      self,
      core.currentTracerSpanLinks,
      Chunk.append(
        {
          _tag: "SpanLink",
          span,
          attributes: attributes ?? {}
        } as const
      )
    )
)

/** @internal */
export const makeSpan = (
  name: string,
  options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  }
) =>
  core.flatMap(fiberRefs, (fiberRefs) =>
    core.sync(() => {
      const context = FiberRefs.getOrDefault(fiberRefs, core.currentContext)
      const services = FiberRefs.getOrDefault(fiberRefs, defaultServices.currentServices)

      const tracer = Context.get(services, internalTracer.tracerTag)
      const clock = Context.get(services, Clock.Clock)
      const timingEnabled = FiberRefs.getOrDefault(fiberRefs, core.currentTracerTimingEnabled)
      const annotationsFromEnv = FiberRefs.get(fiberRefs, core.currentTracerSpanAnnotations)
      const linksFromEnv = FiberRefs.get(fiberRefs, core.currentTracerSpanLinks)

      const parent = options?.parent
        ? Option.some(options.parent)
        : options?.root
        ? Option.none()
        : Context.getOption(context, internalTracer.spanTag)

      const links = linksFromEnv._tag === "Some" ?
        [
          ...Chunk.toReadonlyArray(linksFromEnv.value),
          ...(options?.links ?? [])
        ] :
        options?.links ?? []

      const span = tracer.span(
        name,
        parent,
        options?.context ?? Context.empty(),
        links,
        timingEnabled ? clock.unsafeCurrentTimeNanos() : bigint0
      )

      if (annotationsFromEnv._tag === "Some") {
        HashMap.forEach(annotationsFromEnv.value, (value, key) => span.attribute(key, value))
      }
      if (options?.attributes) {
        Object.entries(options.attributes).forEach(([k, v]) => span.attribute(k, v))
      }

      return span
    }))

/* @internal */
export const spanAnnotations: Effect.Effect<never, never, HashMap.HashMap<string, unknown>> = core
  .fiberRefGet(core.currentTracerSpanAnnotations)

/* @internal */
export const spanLinks: Effect.Effect<never, never, Chunk.Chunk<Tracer.SpanLink>> = core
  .fiberRefGet(core.currentTracerSpanLinks)

/** @internal */
export const useSpan: {
  <R, E, A>(name: string, evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
  <R, E, A>(name: string, options: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  }, evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
} = <R, E, A>(
  name: string,
  ...args: [evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>] | [
    options: any,
    evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>
  ]
) => {
  const options: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  } | undefined = args.length === 1 ? undefined : args[0]
  const evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A> = args[args.length - 1]

  return core.acquireUseRelease(
    makeSpan(name, options),
    evaluate,
    (span, exit) =>
      core.flatMap(
        currentTimeNanosTracing,
        (endTime) => core.sync(() => span.end(endTime, exit))
      )
  )
}

/** @internal */
export const withParentSpan = dual<
  (
    span: Tracer.ParentSpan
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Tracer.ParentSpan>, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, span: Tracer.ParentSpan) => Effect.Effect<Exclude<R, Tracer.ParentSpan>, E, A>
>(2, (self, span) => provideService(self, internalTracer.spanTag, span))

/** @internal */
export const withSpan = dual<
  (name: string, options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  }) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Tracer.ParentSpan>, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  }) => Effect.Effect<Exclude<R, Tracer.ParentSpan>, E, A>
>(
  (args) => typeof args[0] !== "string",
  (self, name, options) =>
    useSpan(
      name,
      options ?? {},
      (span) => withParentSpan(self, span)
    )
)

// -------------------------------------------------------------------------------------
// optionality
// -------------------------------------------------------------------------------------

/* @internal */
export const fromNullable = <A>(value: A): Effect.Effect<never, Cause.NoSuchElementException, NonNullable<A>> =>
  value == null ? core.fail(new core.NoSuchElementException()) : core.succeed(value as NonNullable<A>)

/* @internal */
export const optionFromOptional = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, Exclude<E, Cause.NoSuchElementException>, Option.Option<A>> =>
  core.catchAll(
    core.map(self, Option.some),
    (error) =>
      core.isNoSuchElementException(error) ?
        succeedNone :
        core.fail(error as Exclude<E, Cause.NoSuchElementException>)
  )
