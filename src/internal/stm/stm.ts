import * as Cause from "../../Cause.js"
import * as Chunk from "../../Chunk.js"
import * as Context from "../../Context.js"
import * as Effect from "../../Effect.js"
import * as Either from "../../Either.js"
import * as Exit from "../../Exit.js"
import type * as FiberId from "../../FiberId.js"
import type { LazyArg } from "../../Function.js"
import { constFalse, constTrue, constVoid, dual, identity, pipe } from "../../Function.js"
import * as Option from "../../Option.js"
import * as predicate from "../../Predicate.js"
import type { Predicate, Refinement } from "../../Predicate.js"
import * as RA from "../../ReadonlyArray.js"
import type * as STM from "../../STM.js"
import * as effectCore from "../core.js"
import * as SingleShotGen from "../singleShotGen.js"
import * as core from "./core.js"
import * as Journal from "./stm/journal.js"
import * as STMState from "./stm/stmState.js"

/** @internal */
export const acquireUseRelease = dual<
  <A, R2, E2, A2, R3, E3, A3>(
    use: (resource: A) => STM.STM<R2, E2, A2>,
    release: (resource: A) => STM.STM<R3, E3, A3>
  ) => <R, E>(
    acquire: STM.STM<R, E, A>
  ) => Effect.Effect<R | R2 | R3, E | E2 | E3, A2>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    acquire: STM.STM<R, E, A>,
    use: (resource: A) => STM.STM<R2, E2, A2>,
    release: (resource: A) => STM.STM<R3, E3, A3>
  ) => Effect.Effect<R | R2 | R3, E | E2 | E3, A2>
>(3, <R, E, A, R2, E2, A2, R3, E3, A3>(
  acquire: STM.STM<R, E, A>,
  use: (resource: A) => STM.STM<R2, E2, A2>,
  release: (resource: A) => STM.STM<R3, E3, A3>
): Effect.Effect<R | R2 | R3, E | E2 | E3, A2> =>
  Effect.uninterruptibleMask((restore) => {
    let state: STMState.STMState<E, A> = STMState.running
    return pipe(
      restore(
        core.unsafeAtomically(
          acquire,
          (exit) => {
            state = STMState.done(exit)
          },
          () => {
            state = STMState.interrupted
          }
        )
      ),
      Effect.matchCauseEffect({
        onFailure: (cause) => {
          if (STMState.isDone(state) && Exit.isSuccess(state.exit)) {
            return pipe(
              release(state.exit.value),
              Effect.matchCauseEffect({
                onFailure: (cause2) => Effect.failCause(Cause.parallel(cause, cause2)),
                onSuccess: () => Effect.failCause(cause)
              })
            )
          }
          return Effect.failCause(cause)
        },
        onSuccess: (a) =>
          pipe(
            restore(use(a)),
            Effect.matchCauseEffect({
              onFailure: (cause) =>
                pipe(
                  release(a),
                  Effect.matchCauseEffect({
                    onFailure: (cause2) => Effect.failCause(Cause.parallel(cause, cause2)),
                    onSuccess: () => Effect.failCause(cause)
                  })
                ),
              onSuccess: (a2) => pipe(release(a), Effect.as(a2))
            })
          )
      })
    )
  }))

/** @internal */
export const as = dual<
  <A2>(value: A2) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, A2>,
  <R, E, A, A2>(self: STM.STM<R, E, A>, value: A2) => STM.STM<R, E, A2>
>(2, (self, value) => pipe(self, core.map(() => value)))

/** @internal */
export const asSome = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, E, Option.Option<A>> =>
  pipe(self, core.map(Option.some))

/** @internal */
export const asSomeError = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, Option.Option<E>, A> =>
  pipe(self, mapError(Option.some))

/** @internal */
export const asUnit = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, E, void> => pipe(self, core.map(constVoid))

/** @internal */
export const attempt = <A>(evaluate: LazyArg<A>): STM.STM<never, unknown, A> =>
  suspend(() => {
    try {
      return core.succeed(evaluate())
    } catch (defect) {
      return core.fail(defect)
    }
  })

export const bind = dual<
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => STM.STM<R2, E2, A>
  ) => <R, E>(self: STM.STM<R, E, K>) => STM.STM<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, N extends string, K, R2, E2, A>(
    self: STM.STM<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => STM.STM<R2, E2, A>
  ) => STM.STM<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>(3, <R, E, N extends string, K, R2, E2, A>(
  self: STM.STM<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => STM.STM<R2, E2, A>
) =>
  core.flatMap(self, (k) =>
    core.map(
      f(k),
      (a): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: a } as any)
    )))

/* @internal */
export const bindTo = dual<
  <N extends string>(tag: N) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<
    R,
    E,
    Record<N, A>
  >,
  <R, E, A, N extends string>(
    self: STM.STM<R, E, A>,
    tag: N
  ) => STM.STM<
    R,
    E,
    Record<N, A>
  >
>(
  2,
  <R, E, A, N extends string>(self: STM.STM<R, E, A>, tag: N): STM.STM<R, E, Record<N, A>> =>
    core.map(self, (a) => ({ [tag]: a } as Record<N, A>))
)

/* @internal */
export const let_ = dual<
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => <R, E>(self: STM.STM<R, E, K>) => STM.STM<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, K, N extends string, A>(
    self: STM.STM<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => STM.STM<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>(3, <R, E, K, N extends string, A>(self: STM.STM<R, E, K>, tag: Exclude<N, keyof K>, f: (_: K) => A) =>
  core.map(
    self,
    (k): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: f(k) } as any)
  ))

/** @internal */
export const catchSome = dual<
  <E, R2, E2, A2>(
    pf: (error: E) => Option.Option<STM.STM<R2, E2, A2>>
  ) => <R, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E | E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    pf: (error: E) => Option.Option<STM.STM<R2, E2, A2>>
  ) => STM.STM<R2 | R, E | E2, A2 | A>
>(2, <R, A, E, R2, E2, A2>(
  self: STM.STM<R, E, A>,
  pf: (error: E) => Option.Option<STM.STM<R2, E2, A2>>
): STM.STM<R2 | R, E | E2, A2 | A> =>
  core.catchAll(
    self,
    (e): STM.STM<R | R2, E | E2, A | A2> => Option.getOrElse(pf(e), () => core.fail(e))
  ))

export const catchTag = dual<
  <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => STM.STM<R1, E1, A1>
  ) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R | R1, Exclude<E, { _tag: K }> | E1, A | A1>,
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, R1, E1, A1>(
    self: STM.STM<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => STM.STM<R1, E1, A1>
  ) => STM.STM<R | R1, Exclude<E, { _tag: K }> | E1, A | A1>
>(3, (self, k, f) =>
  core.catchAll(self, (e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return f(e as any)
    }
    return core.fail(e as any)
  }))

/** @internal */
export const catchTags: {
  <
    E extends { _tag: string },
    Cases extends {
      [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => STM.STM<any, any, any>
    }
  >(
    cases: Cases
  ): <R, A>(self: STM.STM<R, E, A>) => STM.STM<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => STM.STM<infer R, any, any>) ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => STM.STM<any, infer E, any>) ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => STM.STM<any, any, infer A>) ? A : never
    }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends {
      [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => STM.STM<any, any, any>
    }
  >(
    self: STM.STM<R, E, A>,
    cases: Cases
  ): STM.STM<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => STM.STM<infer R, any, any>) ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => STM.STM<any, infer E, any>) ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => STM.STM<any, any, infer A>) ? A : never
    }[keyof Cases]
  >
} = dual(2, (self, cases) =>
  core.catchAll(self, (e: any) => {
    const keys = Object.keys(cases)
    if ("_tag" in e && keys.includes(e["_tag"])) {
      return cases[e["_tag"]](e as any)
    }
    return core.fail(e as any)
  }))

/** @internal */
export const check = (predicate: LazyArg<boolean>): STM.STM<never, never, void> =>
  suspend(() => predicate() ? unit : core.retry)

/** @internal */
export const collect = dual<
  <A, A2>(pf: (a: A) => Option.Option<A2>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A2>,
  <R, E, A, A2>(self: STM.STM<R, E, A>, pf: (a: A) => Option.Option<A2>) => STM.STM<R, E, A2>
>(2, (self, pf) =>
  collectSTM(
    self,
    (a) => Option.map(pf(a), core.succeed)
  ))

/** @internal */
export const collectSTM = dual<
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<STM.STM<R2, E2, A2>>
  ) => <R, E>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    pf: (a: A) => Option.Option<STM.STM<R2, E2, A2>>
  ) => STM.STM<R2 | R, E2 | E, A2>
>(2, (self, pf) =>
  core.matchSTM(self, {
    onFailure: core.fail,
    onSuccess: (a) => {
      const option = pf(a)
      return Option.isSome(option) ? option.value : core.retry
    }
  }))

/** @internal */
export const commitEither = <R, E, A>(self: STM.STM<R, E, A>): Effect.Effect<R, E, A> =>
  Effect.flatten(core.commit(either(self)))

/** @internal */
export const cond = <E, A>(
  predicate: LazyArg<boolean>,
  error: LazyArg<E>,
  result: LazyArg<A>
): STM.STM<never, E, A> => {
  return suspend(
    () => predicate() ? core.sync(result) : core.failSync(error)
  )
}

/** @internal */
export const either = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, Either.Either<E, A>> =>
  match(self, { onFailure: Either.left, onSuccess: Either.right })

/** @internal */
export const eventually = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, E, A> =>
  core.matchSTM(self, { onFailure: () => eventually(self), onSuccess: core.succeed })

/** @internal */
export const every = dual<
  <A, R, E>(predicate: (a: A) => STM.STM<R, E, boolean>) => (iterable: Iterable<A>) => STM.STM<R, E, boolean>,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>) => STM.STM<R, E, boolean>
>(
  2,
  <A, R, E>(
    iterable: Iterable<A>,
    predicate: (a: A) => STM.STM<R, E, boolean>
  ): STM.STM<R, E, boolean> =>
    pipe(
      core.flatMap(core.sync(() => iterable[Symbol.iterator]()), (iterator) => {
        const loop: STM.STM<R, E, boolean> = suspend(() => {
          const next = iterator.next()
          if (next.done) {
            return core.succeed(true)
          }
          return pipe(
            predicate(next.value),
            core.flatMap((bool) => bool ? loop : core.succeed(bool))
          )
        })
        return loop
      })
    )
)

/** @internal */
export const exists = dual<
  <A, R, E>(predicate: (a: A) => STM.STM<R, E, boolean>) => (iterable: Iterable<A>) => STM.STM<R, E, boolean>,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>) => STM.STM<R, E, boolean>
>(
  2,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>): STM.STM<R, E, boolean> =>
    core.flatMap(core.sync(() => iterable[Symbol.iterator]()), (iterator) => {
      const loop: STM.STM<R, E, boolean> = suspend(() => {
        const next = iterator.next()
        if (next.done) {
          return core.succeed(false)
        }
        return core.flatMap(
          predicate(next.value),
          (bool) => bool ? core.succeed(bool) : loop
        )
      })
      return loop
    })
)

/** @internal */
export const fiberId: STM.STM<never, never, FiberId.FiberId> = core.effect<never, FiberId.FiberId>((_, fiberId) =>
  fiberId
)

/** @internal */
export const filter = dual<
  <A, R, E>(predicate: (a: A) => STM.STM<R, E, boolean>) => (iterable: Iterable<A>) => STM.STM<R, E, Array<A>>,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>) => STM.STM<R, E, Array<A>>
>(
  2,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Array<A>> =>
    Array.from(iterable).reduce(
      (acc, curr) =>
        pipe(
          acc,
          core.zipWith(predicate(curr), (as, p) => {
            if (p) {
              as.push(curr)
              return as
            }
            return as
          })
        ),
      core.succeed([]) as STM.STM<R, E, Array<A>>
    )
)

/** @internal */
export const filterNot = dual<
  <A, R, E>(predicate: (a: A) => STM.STM<R, E, boolean>) => (iterable: Iterable<A>) => STM.STM<R, E, Array<A>>,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>) => STM.STM<R, E, Array<A>>
>(
  2,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Array<A>> =>
    filter(iterable, (a) => negate(predicate(a)))
)

/** @internal */
export const filterOrDie = dual<
  {
    <A, B extends A>(
      refinement: Refinement<A, B>,
      defect: LazyArg<unknown>
    ): <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, B>
    <A, X extends A>(
      predicate: Predicate<X>,
      defect: LazyArg<unknown>
    ): <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>
  },
  {
    <R, E, A, B extends A>(
      self: STM.STM<R, E, A>,
      refinement: Refinement<A, B>,
      defect: LazyArg<unknown>
    ): STM.STM<R, E, B>
    <R, E, A, X extends A>(self: STM.STM<R, E, A>, predicate: Predicate<X>, defect: LazyArg<unknown>): STM.STM<R, E, A>
  }
>(
  3,
  <R, E, A, X extends A>(self: STM.STM<R, E, A>, predicate: Predicate<X>, defect: LazyArg<unknown>): STM.STM<R, E, A> =>
    filterOrElse(self, predicate, () => core.dieSync(defect))
)

/** @internal */
export const filterOrDieMessage = dual<
  {
    <A, B extends A>(refinement: Refinement<A, B>, message: string): <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, B>
    <A, X extends A>(predicate: Predicate<X>, message: string): <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>
  },
  {
    <R, E, A, B extends A>(self: STM.STM<R, E, A>, refinement: Refinement<A, B>, message: string): STM.STM<R, E, B>
    <R, E, A, X extends A>(self: STM.STM<R, E, A>, predicate: Predicate<X>, message: string): STM.STM<R, E, A>
  }
>(
  3,
  (self, predicate, message) => filterOrElse(self, predicate, () => core.dieMessage(message))
)

/** @internal */
export const filterOrElse = dual<
  {
    <A, B extends A, X extends A, R2, E2, A2>(
      refinement: Refinement<A, B>,
      orElse: (a: X) => STM.STM<R2, E2, A2>
    ): <R, E>(
      self: STM.STM<R, E, A>
    ) => STM.STM<R2 | R, E2 | E, B | A2>
    <A, X extends A, Y extends A, R2, E2, A2>(
      predicate: Predicate<X>,
      orElse: (a: Y) => STM.STM<R2, E2, A2>
    ): <R, E>(
      self: STM.STM<R, E, A>
    ) => STM.STM<R2 | R, E2 | E, A | A2>
  },
  {
    <R, E, A, B extends A, X extends A, R2, E2, A2>(
      self: STM.STM<R, E, A>,
      refinement: Refinement<A, B>,
      orElse: (a: X) => STM.STM<R2, E2, A2>
    ): STM.STM<R2 | R, E2 | E, B | A2>
    <R, E, A, X extends A, Y extends A, R2, E2, A2>(
      self: STM.STM<R, E, A>,
      predicate: Predicate<X>,
      orElse: (a: Y) => STM.STM<R2, E2, A2>
    ): STM.STM<R2 | R, E2 | E, A | A2>
  }
>(
  3,
  <R, E, A, X extends A, Y extends A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    predicate: Predicate<X>,
    orElse: (a: Y) => STM.STM<R2, E2, A2>
  ): STM.STM<R2 | R, E2 | E, A | A2> =>
    core.flatMap(self, (a): STM.STM<R | R2, E | E2, A | A2> =>
      predicate(a as X) ?
        core.succeed(a) :
        orElse(a as Y))
)

/** @internal */
export const filterOrFail = dual<
  {
    <A, B extends A, X extends A, E2>(
      refinement: Refinement<A, B>,
      orFailWith: (a: X) => E2
    ): <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E2 | E, B>
    <A, X extends A, Y extends A, E2>(
      predicate: Predicate<X>,
      orFailWith: (a: Y) => E2
    ): <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E2 | E, A>
  },
  {
    <R, E, A, B extends A, X extends A, E2>(
      self: STM.STM<R, E, A>,
      refinement: Refinement<A, B>,
      orFailWith: (a: X) => E2
    ): STM.STM<R, E2 | E, B>
    <R, E, A, X extends A, Y extends A, E2>(
      self: STM.STM<R, E, A>,
      predicate: Predicate<X>,
      orFailWith: (a: Y) => E2
    ): STM.STM<R, E2 | E, A>
  }
>(3, (self, predicate, orFailWith) =>
  filterOrElse(
    self,
    predicate,
    (a) => core.failSync(() => orFailWith(a as any))
  ))

/** @internal */
export const flatten = <R, E, R2, E2, A>(self: STM.STM<R, E, STM.STM<R2, E2, A>>): STM.STM<R | R2, E | E2, A> =>
  core.flatMap(self, identity)

/** @internal */
export const flip = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, A, E> =>
  core.matchSTM(self, { onFailure: core.succeed, onSuccess: core.fail })

/** @internal */
export const flipWith = dual<
  <R, A, E, R2, A2, E2>(
    f: (stm: STM.STM<R, A, E>) => STM.STM<R2, A2, E2>
  ) => (
    self: STM.STM<R, E, A>
  ) => STM.STM<R | R2, E | E2, A | A2>,
  <R, A, E, R2, A2, E2>(
    self: STM.STM<R, E, A>,
    f: (stm: STM.STM<R, A, E>) => STM.STM<R2, A2, E2>
  ) => STM.STM<R | R2, E | E2, A | A2>
>(2, (self, f) => flip(f(flip(self))))

/** @internal */
export const match = dual<
  <E, A2, A, A3>(options: {
    readonly onFailure: (error: E) => A2
    readonly onSuccess: (value: A) => A3
  }) => <R>(self: STM.STM<R, E, A>) => STM.STM<R, never, A2 | A3>,
  <R, E, A2, A, A3>(self: STM.STM<R, E, A>, options: {
    readonly onFailure: (error: E) => A2
    readonly onSuccess: (value: A) => A3
  }) => STM.STM<R, never, A2 | A3>
>(2, (self, { onFailure, onSuccess }) =>
  core.matchSTM(self, {
    onFailure: (e) => core.succeed(onFailure(e)),
    onSuccess: (a) => core.succeed(onSuccess(a))
  }))

/** @internal */
export const forEach = dual<
  {
    <A, R, E, A2>(f: (a: A) => STM.STM<R, E, A2>, options?: {
      readonly discard?: false | undefined
    }): (elements: Iterable<A>) => STM.STM<R, E, Array<A2>>
    <A, R, E, A2>(f: (a: A) => STM.STM<R, E, A2>, options: {
      readonly discard: true
    }): (elements: Iterable<A>) => STM.STM<R, E, void>
  },
  {
    <A, R, E, A2>(elements: Iterable<A>, f: (a: A) => STM.STM<R, E, A2>, options?: {
      readonly discard?: false | undefined
    }): STM.STM<R, E, Array<A2>>
    <A, R, E, A2>(elements: Iterable<A>, f: (a: A) => STM.STM<R, E, A2>, options: {
      readonly discard: true
    }): STM.STM<R, E, void>
  }
>(
  (args) => predicate.isIterable(args[0]),
  <A, R, E, A2>(iterable: Iterable<A>, f: (a: A) => STM.STM<R, E, A2>, options?: {
    readonly discard?: boolean | undefined
  }): STM.STM<R, E, any> => {
    if (options?.discard) {
      return pipe(
        core.sync(() => iterable[Symbol.iterator]()),
        core.flatMap((iterator) => {
          const loop: STM.STM<R, E, void> = suspend(() => {
            const next = iterator.next()
            if (next.done) {
              return unit
            }
            return pipe(f(next.value), core.flatMap(() => loop))
          })
          return loop
        })
      )
    }

    return suspend(() =>
      RA.fromIterable(iterable).reduce(
        (acc, curr) =>
          core.zipWith(acc, f(curr), (array, elem) => {
            array.push(elem)
            return array
          }),
        core.succeed([]) as STM.STM<R, E, Array<A2>>
      )
    )
  }
)

/** @internal */
export const fromEither = <E, A>(either: Either.Either<E, A>): STM.STM<never, E, A> => {
  switch (either._tag) {
    case "Left": {
      return core.fail(either.left)
    }
    case "Right": {
      return core.succeed(either.right)
    }
  }
}

/** @internal */
export const fromOption = <A>(option: Option.Option<A>): STM.STM<never, Option.Option<never>, A> =>
  Option.match(option, {
    onNone: () => core.fail(Option.none()),
    onSome: core.succeed
  })

/** @internal */
class STMGen {
  constructor(readonly value: STM.STM<any, any, any>) {}
  [Symbol.iterator]() {
    return new SingleShotGen.SingleShotGen(this)
  }
}

const adapter = function() {
  let x = arguments[0]
  for (let i = 1; i < arguments.length; i++) {
    x = arguments[i](x)
  }
  return new STMGen(x) as any
}

/**
 * Inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 * @internal
 */
export const gen: typeof STM.gen = (f) =>
  suspend(() => {
    const iterator = f(adapter)
    const state = iterator.next()
    const run = (
      state: IteratorYieldResult<any> | IteratorReturnResult<any>
    ): STM.STM<any, any, any> =>
      state.done ?
        core.succeed(state.value) :
        core.flatMap(
          state.value.value as unknown as STM.STM<any, any, any>,
          (val: any) => run(iterator.next(val))
        )
    return run(state)
  })

/** @internal */
export const head = <R, E, A>(self: STM.STM<R, E, Iterable<A>>): STM.STM<R, Option.Option<E>, A> =>
  pipe(
    self,
    core.matchSTM({
      onFailure: (e) => core.fail(Option.some(e)),
      onSuccess: (a) => {
        const i = a[Symbol.iterator]()
        const res = i.next()
        if (res.done) {
          return core.fail(Option.none())
        } else {
          return core.succeed(res.value)
        }
      }
    })
  )

/** @internal */
export const if_ = dual<
  <R1, R2, E1, E2, A, A1>(
    options: {
      readonly onTrue: STM.STM<R1, E1, A>
      readonly onFalse: STM.STM<R2, E2, A1>
    }
  ) => <R = never, E = never>(
    self: STM.STM<R, E, boolean> | boolean
  ) => STM.STM<R1 | R2 | R, E1 | E2 | E, A | A1>,
  {
    <R, E, R1, R2, E1, E2, A, A1>(
      self: boolean,
      options: {
        readonly onTrue: STM.STM<R1, E1, A>
        readonly onFalse: STM.STM<R2, E2, A1>
      }
    ): STM.STM<R1 | R2 | R, E1 | E2 | E, A | A1>
    <R, E, R1, R2, E1, E2, A, A1>(
      self: STM.STM<R, E, boolean>,
      options: {
        readonly onTrue: STM.STM<R1, E1, A>
        readonly onFalse: STM.STM<R2, E2, A1>
      }
    ): STM.STM<R1 | R2 | R, E1 | E2 | E, A | A1>
  }
>(
  (args) => typeof args[0] === "boolean" || core.isSTM(args[0]),
  <R, E, R1, R2, E1, E2, A, A1>(
    self: STM.STM<R, E, boolean> | boolean,
    { onFalse, onTrue }: {
      readonly onTrue: STM.STM<R1, E1, A>
      readonly onFalse: STM.STM<R2, E2, A1>
    }
  ) => {
    if (typeof self === "boolean") {
      return self ? onTrue : onFalse
    }

    return core.flatMap(self, (bool): STM.STM<R1 | R2 | R, E1 | E2 | E, A | A1> => bool ? onTrue : onFalse)
  }
)

/** @internal */
export const ignore = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, void> =>
  match(self, { onFailure: () => unit, onSuccess: () => unit })

/** @internal */
export const isFailure = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, boolean> =>
  match(self, { onFailure: constTrue, onSuccess: constFalse })

/** @internal */
export const isSuccess = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, boolean> =>
  match(self, { onFailure: constFalse, onSuccess: constTrue })

/** @internal */
export const iterate = <R, E, Z>(
  initial: Z,
  options: {
    readonly while: (z: Z) => boolean
    readonly body: (z: Z) => STM.STM<R, E, Z>
  }
): STM.STM<R, E, Z> => iterateLoop(initial, options.while, options.body)

const iterateLoop = <R, E, Z>(
  initial: Z,
  cont: (z: Z) => boolean,
  body: (z: Z) => STM.STM<R, E, Z>
): STM.STM<R, E, Z> => {
  if (cont(initial)) {
    return pipe(
      body(initial),
      core.flatMap((z) => iterateLoop(z, cont, body))
    )
  }
  return core.succeed(initial)
}

/** @internal */
export const loop: {
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: (z: Z) => boolean
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => STM.STM<R, E, A>
      readonly discard?: false | undefined
    }
  ): STM.STM<R, E, Array<A>>
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: (z: Z) => boolean
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => STM.STM<R, E, A>
      readonly discard: true
    }
  ): STM.STM<R, E, void>
} = <Z, R, E, A>(
  initial: Z,
  options: {
    readonly while: (z: Z) => boolean
    readonly step: (z: Z) => Z
    readonly body: (z: Z) => STM.STM<R, E, A>
    readonly discard?: boolean | undefined
  }
): STM.STM<R, E, any> =>
  options.discard ?
    loopDiscardLoop(initial, options.while, options.step, options.body) :
    core.map(loopLoop(initial, options.while, options.step, options.body), (a) => Array.from(a))

const loopLoop = <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => STM.STM<R, E, A>
): STM.STM<R, E, Chunk.Chunk<A>> => {
  if (cont(initial)) {
    return pipe(
      body(initial),
      core.flatMap((a) => pipe(loopLoop(inc(initial), cont, inc, body), core.map(Chunk.append(a))))
    )
  }
  return core.succeed(Chunk.empty<A>())
}

const loopDiscardLoop = <Z, R, E, X>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => STM.STM<R, E, X>
): STM.STM<R, E, void> => {
  if (cont(initial)) {
    return pipe(
      body(initial),
      core.flatMap(() => loopDiscardLoop(inc(initial), cont, inc, body))
    )
  }
  return unit
}

/** @internal */
export const mapAttempt = dual<
  <A, B>(f: (a: A) => B) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, unknown, B>,
  <R, E, A, B>(self: STM.STM<R, E, A>, f: (a: A) => B) => STM.STM<R, unknown, B>
>(2, <R, E, A, B>(self: STM.STM<R, E, A>, f: (a: A) => B): STM.STM<R, unknown, B> =>
  core.matchSTM(self, {
    onFailure: (e) => core.fail(e),
    onSuccess: (a) => attempt(() => f(a))
  }))

/** @internal */
export const mapBoth = dual<
  <E, E2, A, A2>(options: {
    readonly onFailure: (error: E) => E2
    readonly onSuccess: (value: A) => A2
  }) => <R>(self: STM.STM<R, E, A>) => STM.STM<R, E2, A2>,
  <R, E, E2, A, A2>(self: STM.STM<R, E, A>, options: {
    readonly onFailure: (error: E) => E2
    readonly onSuccess: (value: A) => A2
  }) => STM.STM<R, E2, A2>
>(2, (self, { onFailure, onSuccess }) =>
  core.matchSTM(self, {
    onFailure: (e) => core.fail(onFailure(e)),
    onSuccess: (a) => core.succeed(onSuccess(a))
  }))

/** @internal */
export const mapError = dual<
  <E, E2>(f: (error: E) => E2) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R, E2, A>,
  <R, A, E, E2>(self: STM.STM<R, E, A>, f: (error: E) => E2) => STM.STM<R, E2, A>
>(2, (self, f) =>
  core.matchSTM(self, {
    onFailure: (e) => core.fail(f(e)),
    onSuccess: core.succeed
  }))

/** @internal */
export const merge = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, E | A> =>
  core.matchSTM(self, { onFailure: (e) => core.succeed(e), onSuccess: core.succeed })

/** @internal */
export const mergeAll = dual<
  <A2, A>(zero: A2, f: (a2: A2, a: A) => A2) => <R, E>(iterable: Iterable<STM.STM<R, E, A>>) => STM.STM<R, E, A2>,
  <R, E, A2, A>(iterable: Iterable<STM.STM<R, E, A>>, zero: A2, f: (a2: A2, a: A) => A2) => STM.STM<R, E, A2>
>(
  3,
  <R, E, A2, A>(iterable: Iterable<STM.STM<R, E, A>>, zero: A2, f: (a2: A2, a: A) => A2): STM.STM<R, E, A2> =>
    suspend(() =>
      Array.from(iterable).reduce(
        (acc, curr) => pipe(acc, core.zipWith(curr, f)),
        core.succeed(zero) as STM.STM<R, E, A2>
      )
    )
)

/** @internal */
export const negate = <R, E>(self: STM.STM<R, E, boolean>): STM.STM<R, E, boolean> => pipe(self, core.map((b) => !b))

/** @internal */
export const none = <R, E, A>(self: STM.STM<R, E, Option.Option<A>>): STM.STM<R, Option.Option<E>, void> =>
  core.matchSTM(self, {
    onFailure: (e) => core.fail(Option.some(e)),
    onSuccess: Option.match({
      onNone: () => unit,
      onSome: () => core.fail(Option.none())
    })
  })

/** @internal */
export const option = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, Option.Option<A>> =>
  match(self, { onFailure: () => Option.none(), onSuccess: Option.some })

/** @internal */
export const orDie = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, A> => pipe(self, orDieWith(identity))

/** @internal */
export const orDieWith = dual<
  <E>(f: (error: E) => unknown) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R, never, A>,
  <R, A, E>(self: STM.STM<R, E, A>, f: (error: E) => unknown) => STM.STM<R, never, A>
>(2, (self, f) => pipe(self, mapError(f), core.catchAll(core.die)))

/** @internal */
export const orElse = dual<
  <R2, E2, A2>(that: LazyArg<STM.STM<R2, E2, A2>>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R2 | R, E2, A2 | A>,
  <R, E, A, R2, E2, A2>(self: STM.STM<R, E, A>, that: LazyArg<STM.STM<R2, E2, A2>>) => STM.STM<R2 | R, E2, A2 | A>
>(
  2,
  <R, E, A, R2, E2, A2>(self: STM.STM<R, E, A>, that: LazyArg<STM.STM<R2, E2, A2>>): STM.STM<R2 | R, E2, A2 | A> =>
    core.flatMap(core.effect<R, LazyArg<void>>((journal) => Journal.prepareResetJournal(journal)), (reset) =>
      pipe(
        core.orTry(self, () => core.flatMap(core.sync(reset), that)),
        core.catchAll(() => core.flatMap(core.sync(reset), that))
      ))
)

/** @internal */
export const orElseEither = dual<
  <R2, E2, A2>(
    that: LazyArg<STM.STM<R2, E2, A2>>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2, Either.Either<A, A2>>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    that: LazyArg<STM.STM<R2, E2, A2>>
  ) => STM.STM<R2 | R, E2, Either.Either<A, A2>>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    that: LazyArg<STM.STM<R2, E2, A2>>
  ): STM.STM<R2 | R, E2, Either.Either<A, A2>> =>
    orElse(core.map(self, Either.left), () => core.map(that(), Either.right))
)

/** @internal */
export const orElseFail = dual<
  <E2>(error: LazyArg<E2>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E2, A>,
  <R, E, A, E2>(self: STM.STM<R, E, A>, error: LazyArg<E2>) => STM.STM<R, E2, A>
>(
  2,
  <R, E, A, E2>(self: STM.STM<R, E, A>, error: LazyArg<E2>): STM.STM<R, E2, A> =>
    orElse(self, () => core.failSync(error))
)

/** @internal */
export const orElseOptional = dual<
  <R2, E2, A2>(
    that: LazyArg<STM.STM<R2, Option.Option<E2>, A2>>
  ) => <R, E, A>(
    self: STM.STM<R, Option.Option<E>, A>
  ) => STM.STM<R2 | R, Option.Option<E2 | E>, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, Option.Option<E>, A>,
    that: LazyArg<STM.STM<R2, Option.Option<E2>, A2>>
  ) => STM.STM<R2 | R, Option.Option<E2 | E>, A2 | A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, Option.Option<E>, A>,
    that: LazyArg<STM.STM<R2, Option.Option<E2>, A2>>
  ): STM.STM<R2 | R, Option.Option<E2 | E>, A2 | A> =>
    core.catchAll(
      self,
      Option.match({
        onNone: that,
        onSome: (e) => core.fail(Option.some<E | E2>(e))
      })
    )
)

/** @internal */
export const orElseSucceed = dual<
  <A2>(value: LazyArg<A2>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, never, A2 | A>,
  <R, E, A, A2>(self: STM.STM<R, E, A>, value: LazyArg<A2>) => STM.STM<R, never, A2 | A>
>(
  2,
  <R, E, A, A2>(self: STM.STM<R, E, A>, value: LazyArg<A2>): STM.STM<R, never, A2 | A> =>
    orElse(self, () => core.sync(value))
)

/** @internal */
export const provideContext = dual<
  <R>(env: Context.Context<R>) => <E, A>(self: STM.STM<R, E, A>) => STM.STM<never, E, A>,
  <E, A, R>(self: STM.STM<R, E, A>, env: Context.Context<R>) => STM.STM<never, E, A>
>(2, (self, env) => core.mapInputContext(self, (_: Context.Context<never>) => env))

/** @internal */
export const provideSomeContext = dual<
  <R>(context: Context.Context<R>) => <R1, E, A>(self: STM.STM<R1, E, A>) => STM.STM<Exclude<R1, R>, E, A>,
  <R, R1, E, A>(self: STM.STM<R1, E, A>, context: Context.Context<R>) => STM.STM<Exclude<R1, R>, E, A>
>(2, <R, R1, E, A>(
  self: STM.STM<R1, E, A>,
  context: Context.Context<R>
): STM.STM<Exclude<R1, R>, E, A> =>
  core.mapInputContext(
    self,
    (parent: Context.Context<Exclude<R1, R>>): Context.Context<R1> => Context.merge(parent, context) as any
  ))

/** @internal */
export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    resource: Context.Tag.Service<T>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<Exclude<R, Context.Tag.Identifier<T>>, E, A>,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: STM.STM<R, E, A>,
    tag: T,
    resource: Context.Tag.Service<T>
  ) => STM.STM<Exclude<R, Context.Tag.Identifier<T>>, E, A>
>(3, (self, tag, resource) => provideServiceSTM(self, tag, core.succeed(resource)))

/** @internal */
export const provideServiceSTM = dual<
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    stm: STM.STM<R1, E1, Context.Tag.Service<T>>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A>,
  <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
    self: STM.STM<R, E, A>,
    tag: T,
    stm: STM.STM<R1, E1, Context.Tag.Service<T>>
  ) => STM.STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A>
>(3, <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
  self: STM.STM<R, E, A>,
  tag: T,
  stm: STM.STM<R1, E1, Context.Tag.Service<T>>
): STM.STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A> =>
  core.contextWithSTM((env: Context.Context<R1 | Exclude<R, Context.Tag.Identifier<T>>>) =>
    core.flatMap(
      stm,
      (service) =>
        provideContext(
          self,
          Context.add(env, tag, service) as Context.Context<R | R1>
        )
    )
  ))

/** @internal */
export const reduce = dual<
  <S, A, R, E>(zero: S, f: (s: S, a: A) => STM.STM<R, E, S>) => (iterable: Iterable<A>) => STM.STM<R, E, S>,
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM.STM<R, E, S>) => STM.STM<R, E, S>
>(
  3,
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM.STM<R, E, S>): STM.STM<R, E, S> =>
    suspend(() =>
      Array.from(iterable).reduce(
        (acc, curr) => pipe(acc, core.flatMap((s) => f(s, curr))),
        core.succeed(zero) as STM.STM<R, E, S>
      )
    )
)

/** @internal */
export const reduceAll = dual<
  <R2, E2, A>(
    initial: STM.STM<R2, E2, A>,
    f: (x: A, y: A) => A
  ) => <R, E>(
    iterable: Iterable<STM.STM<R, E, A>>
  ) => STM.STM<R2 | R, E2 | E, A>,
  <R, E, R2, E2, A>(
    iterable: Iterable<STM.STM<R, E, A>>,
    initial: STM.STM<R2, E2, A>,
    f: (x: A, y: A) => A
  ) => STM.STM<R2 | R, E2 | E, A>
>(3, <R, E, R2, E2, A>(
  iterable: Iterable<STM.STM<R, E, A>>,
  initial: STM.STM<R2, E2, A>,
  f: (x: A, y: A) => A
): STM.STM<R2 | R, E2 | E, A> =>
  suspend(() =>
    Array.from(iterable).reduce(
      (acc, curr) => pipe(acc, core.zipWith(curr, f)),
      initial as STM.STM<R | R2, E | E2, A>
    )
  ))

/** @internal */
export const reduceRight = dual<
  <S, A, R, E>(zero: S, f: (s: S, a: A) => STM.STM<R, E, S>) => (iterable: Iterable<A>) => STM.STM<R, E, S>,
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM.STM<R, E, S>) => STM.STM<R, E, S>
>(
  3,
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM.STM<R, E, S>): STM.STM<R, E, S> =>
    suspend(() =>
      Array.from(iterable).reduceRight(
        (acc, curr) => pipe(acc, core.flatMap((s) => f(s, curr))),
        core.succeed(zero) as STM.STM<R, E, S>
      )
    )
)

/** @internal */
export const refineOrDie = dual<
  <E, E2>(pf: (error: E) => Option.Option<E2>) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R, E2, A>,
  <R, A, E, E2>(self: STM.STM<R, E, A>, pf: (error: E) => Option.Option<E2>) => STM.STM<R, E2, A>
>(2, (self, pf) => refineOrDieWith(self, pf, identity))

/** @internal */
export const refineOrDieWith = dual<
  <E, E2>(
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => <R, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R, E2, A>,
  <R, A, E, E2>(
    self: STM.STM<R, E, A>,
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => STM.STM<R, E2, A>
>(3, (self, pf, f) =>
  core.catchAll(
    self,
    (e) =>
      Option.match(pf(e), {
        onNone: () => core.die(f(e)),
        onSome: core.fail
      })
  ))

/** @internal */
export const reject = dual<
  <A, E2>(pf: (a: A) => Option.Option<E2>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E2 | E, A>,
  <R, E, A, E2>(self: STM.STM<R, E, A>, pf: (a: A) => Option.Option<E2>) => STM.STM<R, E2 | E, A>
>(2, (self, pf) =>
  rejectSTM(
    self,
    (a) => Option.map(pf(a), core.fail)
  ))

/** @internal */
export const rejectSTM = dual<
  <A, R2, E2>(
    pf: (a: A) => Option.Option<STM.STM<R2, E2, E2>>
  ) => <R, E>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2>(
    self: STM.STM<R, E, A>,
    pf: (a: A) => Option.Option<STM.STM<R2, E2, E2>>
  ) => STM.STM<R2 | R, E2 | E, A>
>(2, (self, pf) =>
  core.flatMap(self, (a) =>
    Option.match(pf(a), {
      onNone: () => core.succeed(a),
      onSome: core.flatMap(core.fail)
    })))

/** @internal */
export const repeatUntil = dual<
  <A>(predicate: Predicate<A>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>) => STM.STM<R, E, A>
>(2, (self, predicate) => repeatUntilLoop(self, predicate))

const repeatUntilLoop = <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>): STM.STM<R, E, A> =>
  core.flatMap(self, (a) =>
    predicate(a) ?
      core.succeed(a) :
      repeatUntilLoop(self, predicate))

/** @internal */
export const repeatWhile = dual<
  <A>(predicate: Predicate<A>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>) => STM.STM<R, E, A>
>(2, (self, predicate) => repeatWhileLoop(self, predicate))

const repeatWhileLoop = <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>): STM.STM<R, E, A> =>
  pipe(
    core.flatMap(self, (a) =>
      predicate(a) ?
        repeatWhileLoop(self, predicate) :
        core.succeed(a))
  )

/** @internal */
export const replicate = dual<
  (n: number) => <R, E, A>(self: STM.STM<R, E, A>) => Array<STM.STM<R, E, A>>,
  <R, E, A>(self: STM.STM<R, E, A>, n: number) => Array<STM.STM<R, E, A>>
>(2, (self, n) => Array.from({ length: n }, () => self))

/** @internal */
export const replicateSTM = dual<
  (n: number) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, Array<A>>,
  <R, E, A>(self: STM.STM<R, E, A>, n: number) => STM.STM<R, E, Array<A>>
>(2, (self, n) => all(replicate(self, n)))

/** @internal */
export const replicateSTMDiscard = dual<
  (n: number) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, void>,
  <R, E, A>(self: STM.STM<R, E, A>, n: number) => STM.STM<R, E, void>
>(2, (self, n) => all(replicate(self, n), { discard: true }))

/** @internal */
export const retryUntil = dual<
  {
    <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, B>
    <A>(predicate: Predicate<A>): <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>
  },
  {
    <R, E, A, B extends A>(self: STM.STM<R, E, A>, refinement: Refinement<A, B>): STM.STM<R, E, B>
    <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>): STM.STM<R, E, A>
  }
>(
  2,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>) =>
    core.matchSTM(self, { onFailure: core.fail, onSuccess: (a) => predicate(a) ? core.succeed(a) : core.retry })
)

/** @internal */
export const retryWhile = dual<
  <A>(predicate: Predicate<A>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>) => STM.STM<R, E, A>
>(
  2,
  (self, predicate) =>
    core.matchSTM(self, { onFailure: core.fail, onSuccess: (a) => !predicate(a) ? core.succeed(a) : core.retry })
)

/** @internal */
export const partition = dual<
  <R, E, A, A2>(
    f: (a: A) => STM.STM<R, E, A2>
  ) => (
    elements: Iterable<A>
  ) => STM.STM<R, never, [excluded: Array<E>, satisfying: Array<A2>]>,
  <R, E, A, A2>(
    elements: Iterable<A>,
    f: (a: A) => STM.STM<R, E, A2>
  ) => STM.STM<R, never, [excluded: Array<E>, satisfying: Array<A2>]>
>(2, (elements, f) =>
  pipe(
    forEach(elements, (a) => either(f(a))),
    core.map((as) => effectCore.partitionMap(as, identity))
  ))

/** @internal */
export const some = <R, E, A>(self: STM.STM<R, E, Option.Option<A>>): STM.STM<R, Option.Option<E>, A> =>
  core.matchSTM(self, {
    onFailure: (e) => core.fail(Option.some(e)),
    onSuccess: Option.match({
      onNone: () => core.fail(Option.none()),
      onSome: core.succeed
    })
  })

/* @internal */
export const all = ((
  input: Iterable<STM.All.STMAny> | Record<string, STM.All.STMAny>,
  options?: STM.All.Options
): STM.STM<any, any, any> => {
  if (Symbol.iterator in input) {
    return forEach(input, identity, options as any)
  } else if (options?.discard) {
    return forEach(Object.values(input), identity, options as any)
  }

  return core.map(
    forEach(
      Object.entries(input),
      ([_, e]) => core.map(e, (a) => [_, a] as const)
    ),
    (values) => {
      const res = {}
      for (const [k, v] of values) {
        ;(res as any)[k] = v
      }
      return res
    }
  )
}) as STM.All.Signature

/** @internal */
export const succeedNone: STM.STM<never, never, Option.Option<never>> = core.succeed(Option.none())

/** @internal */
export const succeedSome = <A>(value: A): STM.STM<never, never, Option.Option<A>> => core.succeed(Option.some(value))

/** @internal */
export const summarized = dual<
  <R2, E2, A2, A3>(
    summary: STM.STM<R2, E2, A2>,
    f: (before: A2, after: A2) => A3
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, [A3, A]>,
  <R, E, A, R2, E2, A2, A3>(
    self: STM.STM<R, E, A>,
    summary: STM.STM<R2, E2, A2>,
    f: (before: A2, after: A2) => A3
  ) => STM.STM<R2 | R, E2 | E, [A3, A]>
>(3, (self, summary, f) =>
  core.flatMap(summary, (start) =>
    core.flatMap(self, (value) =>
      core.map(
        summary,
        (end) => [f(start, end), value]
      ))))

/** @internal */
export const suspend = <R, E, A>(evaluate: LazyArg<STM.STM<R, E, A>>): STM.STM<R, E, A> => flatten(core.sync(evaluate))

/** @internal */
export const tap = dual<
  <A, X extends A, R2, E2, _>(
    f: (a: X) => STM.STM<R2, E2, _>
  ) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R2 | R, E2 | E, A>,
  <R, E, A, X extends A, R2, E2, _>(
    self: STM.STM<R, E, A>,
    f: (a: X) => STM.STM<R2, E2, _>
  ) => STM.STM<R2 | R, E2 | E, A>
>(2, (self, f) => core.flatMap(self, (a) => as(f(a as any), a)))

/** @internal */
export const tapBoth = dual<
  <E, XE extends E, R2, E2, A2, A, XA extends A, R3, E3, A3>(
    options: {
      readonly onFailure: (error: XE) => STM.STM<R2, E2, A2>
      readonly onSuccess: (value: XA) => STM.STM<R3, E3, A3>
    }
  ) => <R>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R3 | R, E | E2 | E3, A>,
  <R, E, XE extends E, R2, E2, A2, A, XA extends A, R3, E3, A3>(
    self: STM.STM<R, E, A>,
    options: {
      readonly onFailure: (error: XE) => STM.STM<R2, E2, A2>
      readonly onSuccess: (value: XA) => STM.STM<R3, E3, A3>
    }
  ) => STM.STM<R2 | R3 | R, E | E2 | E3, A>
>(2, (self, { onFailure, onSuccess }) =>
  core.matchSTM(self, {
    onFailure: (e) => pipe(onFailure(e as any), core.zipRight(core.fail(e))),
    onSuccess: (a) => pipe(onSuccess(a as any), as(a))
  }))

/** @internal */
export const tapError = dual<
  <E, X extends E, R2, E2, _>(
    f: (error: X) => STM.STM<R2, E2, _>
  ) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R2 | R, E | E2, A>,
  <R, A, E, X extends E, R2, E2, _>(
    self: STM.STM<R, E, A>,
    f: (error: X) => STM.STM<R2, E2, _>
  ) => STM.STM<R2 | R, E | E2, A>
>(2, (self, f) =>
  core.matchSTM(self, {
    onFailure: (e) => core.zipRight(f(e as any), core.fail(e)),
    onSuccess: core.succeed
  }))

/** @internal */
export const try_: {
  <A, E>(options: {
    readonly try: LazyArg<A>
    readonly catch: (u: unknown) => E
  }): STM.STM<never, E, A>
  <A>(try_: LazyArg<A>): STM.STM<never, unknown, A>
} = <A, E>(
  arg: LazyArg<A> | {
    readonly try: LazyArg<A>
    readonly catch: (u: unknown) => E
  }
) => {
  const evaluate = typeof arg === "function" ? arg : arg.try
  return suspend(() => {
    try {
      return core.succeed(evaluate())
    } catch (error) {
      return core.fail("catch" in arg ? arg.catch(error) : error)
    }
  })
}

/** @internal */
export const unit: STM.STM<never, never, void> = core.succeed(void 0)

/** @internal */
export const unless = dual<
  (predicate: LazyArg<boolean>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, Option.Option<A>>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: LazyArg<boolean>) => STM.STM<R, E, Option.Option<A>>
>(2, (self, predicate) =>
  suspend(
    () => predicate() ? succeedNone : asSome(self)
  ))

/** @internal */
export const unlessSTM = dual<
  <R2, E2>(
    predicate: STM.STM<R2, E2, boolean>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A>>,
  <R, E, A, R2, E2>(
    self: STM.STM<R, E, A>,
    predicate: STM.STM<R2, E2, boolean>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A>>
>(2, (self, predicate) =>
  core.flatMap(
    predicate,
    (bool) => bool ? succeedNone : asSome(self)
  ))

/** @internal */
export const unsome = <R, E, A>(self: STM.STM<R, Option.Option<E>, A>): STM.STM<R, E, Option.Option<A>> =>
  core.matchSTM(self, {
    onFailure: Option.match({
      onNone: () => core.succeed(Option.none()),
      onSome: core.fail
    }),
    onSuccess: (a) => core.succeed(Option.some(a))
  })

/** @internal */
export const validateAll = dual<
  <R, E, A, B>(
    f: (a: A) => STM.STM<R, E, B>
  ) => (
    elements: Iterable<A>
  ) => STM.STM<R, RA.NonEmptyArray<E>, Array<B>>,
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A) => STM.STM<R, E, B>
  ) => STM.STM<R, RA.NonEmptyArray<E>, Array<B>>
>(
  2,
  (elements, f) =>
    core.flatMap(partition(elements, f), ([errors, values]) =>
      RA.isNonEmptyArray(errors) ?
        core.fail(errors) :
        core.succeed(values))
)

/** @internal */
export const validateFirst = dual<
  <R, E, A, B>(f: (a: A) => STM.STM<R, E, B>) => (elements: Iterable<A>) => STM.STM<R, Array<E>, B>,
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => STM.STM<R, E, B>) => STM.STM<R, Array<E>, B>
>(2, (elements, f) => flip(forEach(elements, (a) => flip(f(a)))))

/** @internal */
export const when = dual<
  (predicate: LazyArg<boolean>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, Option.Option<A>>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: LazyArg<boolean>) => STM.STM<R, E, Option.Option<A>>
>(2, (self, predicate) =>
  suspend(
    () => predicate() ? asSome(self) : succeedNone
  ))

/** @internal */
export const whenSTM = dual<
  <R2, E2>(
    predicate: STM.STM<R2, E2, boolean>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A>>,
  <R, E, A, R2, E2>(
    self: STM.STM<R, E, A>,
    predicate: STM.STM<R2, E2, boolean>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A>>
>(2, (self, predicate) =>
  core.flatMap(
    predicate,
    (bool) => bool ? asSome(self) : succeedNone
  ))
