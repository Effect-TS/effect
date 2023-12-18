import * as Cause from "../Cause.js"
import * as Clock from "../Clock.js"
import * as Context from "../Context.js"
import * as Duration from "../Duration.js"
import type * as Effect from "../Effect.js"
import type * as Exit from "../Exit.js"
import type { FiberRef } from "../FiberRef.js"
import * as FiberRefsPatch from "../FiberRefsPatch.js"
import type { LazyArg } from "../Function.js"
import { dual, pipe } from "../Function.js"
import type * as Layer from "../Layer.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import type * as Runtime from "../Runtime.js"
import type * as Schedule from "../Schedule.js"
import * as ScheduleDecision from "../ScheduleDecision.js"
import * as Intervals from "../ScheduleIntervals.js"
import * as Scope from "../Scope.js"
import type * as Synchronized from "../SynchronizedRef.js"
import type * as Tracer from "../Tracer.js"
import * as effect from "./core-effect.js"
import * as core from "./core.js"
import * as circular from "./effect/circular.js"
import * as fiberRuntime from "./fiberRuntime.js"
import * as EffectOpCodes from "./opCodes/effect.js"
import * as OpCodes from "./opCodes/layer.js"
import * as ref from "./ref.js"
import * as runtime from "./runtime.js"
import * as runtimeFlags from "./runtimeFlags.js"
import * as synchronized from "./synchronizedRef.js"
import * as tracer from "./tracer.js"

/** @internal */
const LayerSymbolKey = "effect/Layer"

/** @internal */
export const LayerTypeId: Layer.LayerTypeId = Symbol.for(
  LayerSymbolKey
) as Layer.LayerTypeId

const layerVariance = {
  /* c8 ignore next */
  _RIn: (_: never) => _,
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _ROut: (_: unknown) => _
}

/** @internal */
const proto = {
  [LayerTypeId]: layerVariance,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
const MemoMapTypeIdKey = "effect/Layer/MemoMap"

/** @internal */
export const MemoMapTypeId: Layer.MemoMapTypeId = Symbol.for(
  MemoMapTypeIdKey
) as Layer.MemoMapTypeId

/** @internal */
export type Primitive =
  | ExtendScope
  | Fold
  | Fresh
  | FromEffect
  | Scoped
  | Suspend
  | Locally
  | ProvideTo
  | ZipWith
  | ZipWithPar

/** @internal */
export type Op<Tag extends string, Body = {}> = Layer.Layer<unknown, unknown, unknown> & Body & {
  readonly _tag: Tag
}

/** @internal */
export interface ExtendScope extends
  Op<OpCodes.OP_EXTEND_SCOPE, {
    readonly layer: Layer.Layer<never, never, unknown>
  }>
{}

/** @internal */
export interface Fold extends
  Op<OpCodes.OP_FOLD, {
    readonly layer: Layer.Layer<never, never, unknown>
    failureK(cause: Cause.Cause<unknown>): Layer.Layer<never, never, unknown>
    successK(context: Context.Context<unknown>): Layer.Layer<never, never, unknown>
  }>
{}

/** @internal */
export interface Fresh extends
  Op<OpCodes.OP_FRESH, {
    readonly layer: Layer.Layer<never, never, unknown>
  }>
{}

/** @internal */
export interface FromEffect extends
  Op<OpCodes.OP_FROM_EFFECT, {
    readonly effect: Effect.Effect<unknown, unknown, Context.Context<unknown>>
  }>
{}

/** @internal */
export interface Scoped extends
  Op<OpCodes.OP_SCOPED, {
    readonly effect: Effect.Effect<unknown, unknown, Context.Context<unknown>>
  }>
{}

/** @internal */
export interface Suspend extends
  Op<OpCodes.OP_SUSPEND, {
    evaluate(): Layer.Layer<never, never, unknown>
  }>
{}

/** @internal */
export interface Locally extends
  Op<"Locally", {
    readonly self: Layer.Layer<never, never, unknown>
    f(_: Effect.Effect<any, any, any>): Effect.Effect<any, any, any>
  }>
{}

/** @internal */
export interface ProvideTo extends
  Op<OpCodes.OP_PROVIDE, {
    readonly first: Layer.Layer<never, never, unknown>
    readonly second: Layer.Layer<never, never, unknown>
  }>
{}

/** @internal */
export interface ZipWith extends
  Op<OpCodes.OP_PROVIDE_MERGE, {
    readonly first: Layer.Layer<never, never, unknown>
    readonly second: Layer.Layer<never, never, unknown>
    zipK(left: Context.Context<unknown>, right: Context.Context<unknown>): Context.Context<unknown>
  }>
{}

/** @internal */
export interface ZipWithPar extends
  Op<OpCodes.OP_ZIP_WITH, {
    readonly first: Layer.Layer<never, never, unknown>
    readonly second: Layer.Layer<never, never, unknown>
    zipK(left: Context.Context<unknown>, right: Context.Context<unknown>): Context.Context<unknown>
  }>
{}

/** @internal */
export const isLayer = (u: unknown): u is Layer.Layer<unknown, unknown, unknown> => hasProperty(u, LayerTypeId)

/** @internal */
export const isFresh = <R, E, A>(self: Layer.Layer<R, E, A>): boolean => {
  return (self as Primitive)._tag === OpCodes.OP_FRESH
}

// -----------------------------------------------------------------------------
// MemoMap
// -----------------------------------------------------------------------------

/** @internal */
class MemoMapImpl implements Layer.MemoMap {
  readonly [MemoMapTypeId]: Layer.MemoMapTypeId
  constructor(
    readonly ref: Synchronized.SynchronizedRef<
      Map<
        Layer.Layer<any, any, any>,
        readonly [Effect.Effect<never, any, any>, Scope.Scope.Finalizer]
      >
    >
  ) {
    this[MemoMapTypeId] = MemoMapTypeId
  }

  /**
   * Checks the memo map to see if a layer exists. If it is, immediately
   * returns it. Otherwise, obtains the layer, stores it in the memo map,
   * and adds a finalizer to the `Scope`.
   */
  getOrElseMemoize<RIn, E, ROut>(
    layer: Layer.Layer<RIn, E, ROut>,
    scope: Scope.Scope
  ): Effect.Effect<RIn, E, Context.Context<ROut>> {
    return pipe(
      synchronized.modifyEffect(this.ref, (map) => {
        const inMap = map.get(layer)
        if (inMap !== undefined) {
          const [acquire, release] = inMap
          const cached: Effect.Effect<never, E, Context.Context<ROut>> = pipe(
            acquire as Effect.Effect<never, E, readonly [FiberRefsPatch.FiberRefsPatch, Context.Context<ROut>]>,
            core.flatMap(([patch, b]) => pipe(effect.patchFiberRefs(patch), core.as(b))),
            core.onExit(core.exitMatch({
              onFailure: () => core.unit,
              onSuccess: () => core.scopeAddFinalizerExit(scope, release)
            }))
          )
          return core.succeed([cached, map] as const)
        }
        return pipe(
          ref.make(0),
          core.flatMap((observers) =>
            pipe(
              core.deferredMake<E, readonly [FiberRefsPatch.FiberRefsPatch, Context.Context<ROut>]>(),
              core.flatMap((deferred) =>
                pipe(
                  ref.make<Scope.Scope.Finalizer>(() => core.unit),
                  core.map((finalizerRef) => {
                    const resource = core.uninterruptibleMask((restore) =>
                      pipe(
                        fiberRuntime.scopeMake(),
                        core.flatMap((innerScope) =>
                          pipe(
                            restore(core.flatMap(
                              makeBuilder(layer, innerScope, true),
                              (f) => effect.diffFiberRefs(f(this))
                            )),
                            core.exit,
                            core.flatMap((exit) => {
                              switch (exit._tag) {
                                case EffectOpCodes.OP_FAILURE: {
                                  return pipe(
                                    core.deferredFailCause(deferred, exit.i0),
                                    core.zipRight(core.scopeClose(innerScope, exit)),
                                    core.zipRight(core.failCause(exit.i0))
                                  )
                                }
                                case EffectOpCodes.OP_SUCCESS: {
                                  return pipe(
                                    ref.set(finalizerRef, (exit) =>
                                      pipe(
                                        core.scopeClose(innerScope, exit),
                                        core.whenEffect(
                                          ref.modify(observers, (n) => [n === 1, n - 1] as const)
                                        ),
                                        core.asUnit
                                      )),
                                    core.zipRight(ref.update(observers, (n) => n + 1)),
                                    core.zipRight(
                                      core.scopeAddFinalizerExit(scope, (exit) =>
                                        pipe(
                                          core.sync(() => map.delete(layer)),
                                          core.zipRight(ref.get(finalizerRef)),
                                          core.flatMap((finalizer) => finalizer(exit))
                                        ))
                                    ),
                                    core.zipRight(core.deferredSucceed(deferred, exit.i0)),
                                    core.as(exit.i0[1])
                                  )
                                }
                              }
                            })
                          )
                        )
                      )
                    )
                    const memoized = [
                      pipe(
                        core.deferredAwait(deferred),
                        core.onExit(core.exitMatchEffect({
                          onFailure: () => core.unit,
                          onSuccess: () => ref.update(observers, (n) => n + 1)
                        }))
                      ),
                      (exit: Exit.Exit<unknown, unknown>) =>
                        pipe(
                          ref.get(finalizerRef),
                          core.flatMap((finalizer) => finalizer(exit))
                        )
                    ] as const
                    return [
                      resource,
                      isFresh(layer) ? map : map.set(layer, memoized)
                    ] as const
                  })
                )
              )
            )
          )
        )
      }),
      core.flatten
    )
  }
}

/** @internal */
export const makeMemoMap: Effect.Effect<never, never, Layer.MemoMap> = core.suspend(() =>
  core.map(
    circular.makeSynchronized<
      Map<
        Layer.Layer<any, any, any>,
        readonly [
          Effect.Effect<never, any, any>,
          Scope.Scope.Finalizer
        ]
      >
    >(new Map()),
    (ref) => new MemoMapImpl(ref)
  )
)

/** @internal */
export const build = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Effect.Effect<RIn | Scope.Scope, E, Context.Context<ROut>> =>
  fiberRuntime.scopeWith((scope) => buildWithScope(self, scope))

/** @internal */
export const buildWithScope = dual<
  (
    scope: Scope.Scope
  ) => <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>) => Effect.Effect<RIn, E, Context.Context<ROut>>,
  <RIn, E, ROut>(
    self: Layer.Layer<RIn, E, ROut>,
    scope: Scope.Scope
  ) => Effect.Effect<RIn, E, Context.Context<ROut>>
>(2, (self, scope) =>
  core.flatMap(
    makeMemoMap,
    (memoMap) => core.flatMap(makeBuilder(self, scope), (run) => run(memoMap))
  ))

/** @internal */
export const buildWithMemoMap = dual<
  (
    memoMap: Layer.MemoMap,
    scope: Scope.Scope
  ) => <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>) => Effect.Effect<RIn, E, Context.Context<ROut>>,
  <RIn, E, ROut>(
    self: Layer.Layer<RIn, E, ROut>,
    memoMap: Layer.MemoMap,
    scope: Scope.Scope
  ) => Effect.Effect<RIn, E, Context.Context<ROut>>
>(3, (self, memoMap, scope) => core.flatMap(makeBuilder(self, scope), (run) => run(memoMap)))

const makeBuilder = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>,
  scope: Scope.Scope,
  inMemoMap = false
): Effect.Effect<never, never, (memoMap: Layer.MemoMap) => Effect.Effect<RIn, E, Context.Context<ROut>>> => {
  const op = self as Primitive
  switch (op._tag) {
    case "Locally": {
      return core.sync(() => (memoMap: Layer.MemoMap) => op.f(memoMap.getOrElseMemoize(op.self, scope)))
    }
    case "ExtendScope": {
      return core.sync(() => (memoMap: Layer.MemoMap) =>
        fiberRuntime.scopeWith(
          (scope) => memoMap.getOrElseMemoize(op.layer, scope)
        ) as unknown as Effect.Effect<RIn, E, Context.Context<ROut>>
      )
    }
    case "Fold": {
      return core.sync(() => (memoMap: Layer.MemoMap) =>
        pipe(
          memoMap.getOrElseMemoize(op.layer, scope),
          core.matchCauseEffect({
            onFailure: (cause) => memoMap.getOrElseMemoize(op.failureK(cause), scope),
            onSuccess: (value) => memoMap.getOrElseMemoize(op.successK(value), scope)
          })
        )
      )
    }
    case "Fresh": {
      return core.sync(() => (_: Layer.MemoMap) => pipe(op.layer, buildWithScope(scope)))
    }
    case "FromEffect": {
      return inMemoMap
        ? core.sync(() => (_: Layer.MemoMap) => op.effect as Effect.Effect<RIn, E, Context.Context<ROut>>)
        : core.sync(() => (memoMap: Layer.MemoMap) => memoMap.getOrElseMemoize(self, scope))
    }
    case "Provide": {
      return core.sync(() => (memoMap: Layer.MemoMap) =>
        pipe(
          memoMap.getOrElseMemoize(op.first, scope),
          core.flatMap((env) =>
            pipe(
              memoMap.getOrElseMemoize(op.second, scope),
              core.provideContext(env)
            )
          )
        )
      )
    }
    case "Scoped": {
      return inMemoMap
        ? core.sync(() => (_: Layer.MemoMap) =>
          fiberRuntime.scopeExtend(
            op.effect as Effect.Effect<RIn, E, Context.Context<ROut>>,
            scope
          )
        )
        : core.sync(() => (memoMap: Layer.MemoMap) => memoMap.getOrElseMemoize(self, scope))
    }
    case "Suspend": {
      return core.sync(() => (memoMap: Layer.MemoMap) =>
        memoMap.getOrElseMemoize(
          op.evaluate(),
          scope
        )
      )
    }
    case "ProvideMerge": {
      return core.sync(() => (memoMap: Layer.MemoMap) =>
        pipe(
          memoMap.getOrElseMemoize(op.first, scope),
          core.zipWith(
            memoMap.getOrElseMemoize(op.second, scope),
            op.zipK
          )
        )
      )
    }
    case "ZipWith": {
      return core.sync(() => (memoMap: Layer.MemoMap) =>
        pipe(
          memoMap.getOrElseMemoize(op.first, scope),
          fiberRuntime.zipWithOptions(
            memoMap.getOrElseMemoize(op.second, scope),
            op.zipK,
            { concurrent: true }
          )
        )
      )
    }
  }
}

// -----------------------------------------------------------------------------
// Layer
// -----------------------------------------------------------------------------

/** @internal */
export const catchAll = dual<
  <E, R2, E2, A2>(
    onError: (error: E) => Layer.Layer<R2, E2, A2>
  ) => <R, A>(self: Layer.Layer<R, E, A>) => Layer.Layer<R | R2, E2, A & A2>,
  <R, E, A, R2, E2, A2>(
    self: Layer.Layer<R, E, A>,
    onError: (error: E) => Layer.Layer<R2, E2, A2>
  ) => Layer.Layer<R | R2, E2, A & A2>
>(2, (self, onFailure) => match(self, { onFailure, onSuccess: succeedContext }))

/** @internal */
export const catchAllCause = dual<
  <E, R2, E2, A2>(
    onError: (cause: Cause.Cause<E>) => Layer.Layer<R2, E2, A2>
  ) => <R, A>(self: Layer.Layer<R, E, A>) => Layer.Layer<R | R2, E2, A & A2>,
  <R, E, A, R2, E2, A2>(
    self: Layer.Layer<R, E, A>,
    onError: (cause: Cause.Cause<E>) => Layer.Layer<R2, E2, A2>
  ) => Layer.Layer<R | R2, E2, A & A2>
>(2, (self, onFailure) => matchCause(self, { onFailure, onSuccess: succeedContext }))

/** @internal */
export const die = (defect: unknown): Layer.Layer<never, never, unknown> => failCause(Cause.die(defect))

/** @internal */
export const dieSync = (evaluate: LazyArg<unknown>): Layer.Layer<never, never, unknown> =>
  failCauseSync(() => Cause.die(evaluate()))

/** @internal */
export const discard = <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn, E, never> =>
  map(self, () => Context.empty())

/** @internal */
export const context = <R>(): Layer.Layer<R, never, R> => fromEffectContext(core.context<R>())

/** @internal */
export const extendScope = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Layer.Layer<RIn | Scope.Scope, E, ROut> => {
  const extendScope = Object.create(proto)
  extendScope._tag = OpCodes.OP_EXTEND_SCOPE
  extendScope.layer = self
  return extendScope
}

/** @internal */
export const fail = <E>(error: E): Layer.Layer<never, E, unknown> => failCause(Cause.fail(error))

/** @internal */
export const failSync = <E>(evaluate: LazyArg<E>): Layer.Layer<never, E, unknown> =>
  failCauseSync(() => Cause.fail(evaluate()))

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Layer.Layer<never, E, unknown> =>
  fromEffectContext(core.failCause(cause))

/** @internal */
export const failCauseSync = <E>(evaluate: LazyArg<Cause.Cause<E>>): Layer.Layer<never, E, unknown> =>
  fromEffectContext(core.failCauseSync(evaluate))

/** @internal */
export const flatMap = dual<
  <A, R2, E2, A2>(
    f: (context: Context.Context<A>) => Layer.Layer<R2, E2, A2>
  ) => <R, E>(self: Layer.Layer<R, E, A>) => Layer.Layer<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Layer.Layer<R, E, A>,
    f: (context: Context.Context<A>) => Layer.Layer<R2, E2, A2>
  ) => Layer.Layer<R | R2, E | E2, A2>
>(2, (self, f) => match(self, { onFailure: fail, onSuccess: f }))

/** @internal */
export const flatten = dual<
  <R2, E2, A, I>(
    tag: Context.Tag<I, Layer.Layer<R2, E2, A>>
  ) => <R, E>(
    self: Layer.Layer<R, E, I>
  ) => Layer.Layer<R | R2, E | E2, A>,
  <R, E, A, R2, E2, I>(
    self: Layer.Layer<R, E, I>,
    tag: Context.Tag<I, Layer.Layer<R2, E2, A>>
  ) => Layer.Layer<R | R2, E | E2, A>
>(2, (self, tag) => flatMap(self, Context.get(tag as any) as any))

/** @internal */
export const fresh = <R, E, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R, E, A> => {
  const fresh = Object.create(proto)
  fresh._tag = OpCodes.OP_FRESH
  fresh.layer = self
  return fresh
}

/** @internal */
export const fromEffect = dual<
  <T extends Context.Tag<any, any>>(
    tag: T
  ) => <R, E>(
    effect: Effect.Effect<R, E, Context.Tag.Service<T>>
  ) => Layer.Layer<R, E, Context.Tag.Identifier<T>>,
  <T extends Context.Tag<any, any>, R, E>(
    tag: T,
    effect: Effect.Effect<R, E, Context.Tag.Service<T>>
  ) => Layer.Layer<R, E, Context.Tag.Identifier<T>>
>(2, (a, b) => {
  const tagFirst = Context.isTag(a)
  const tag = (tagFirst ? a : b) as Context.Tag<unknown, unknown>
  const effect = tagFirst ? b : a
  return fromEffectContext(core.map(effect, (service) => Context.make(tag, service)))
})

/** @internal */
export const fromEffectDiscard = <R, E, _>(effect: Effect.Effect<R, E, _>) =>
  fromEffectContext(core.map(effect, () => Context.empty()))

/** @internal */
export function fromEffectContext<R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
): Layer.Layer<R, E, A> {
  const fromEffect = Object.create(proto)
  fromEffect._tag = OpCodes.OP_FROM_EFFECT
  fromEffect.effect = effect
  return fromEffect
}

/** @internal */
export const fiberRefLocally = dual<
  <X>(ref: FiberRef<X>, value: X) => <R, E, A>(self: Layer.Layer<R, E, A>) => Layer.Layer<R, E, A>,
  <R, E, A, X>(self: Layer.Layer<R, E, A>, ref: FiberRef<X>, value: X) => Layer.Layer<R, E, A>
>(3, (self, ref, value) => locallyEffect(self, core.fiberRefLocally(ref, value)))

/** @internal */
export const locallyEffect = dual<
  <RIn, E, ROut, RIn2, E2, ROut2>(
    f: (_: Effect.Effect<RIn, E, Context.Context<ROut>>) => Effect.Effect<RIn2, E2, Context.Context<ROut2>>
  ) => (self: Layer.Layer<RIn, E, ROut>) => Layer.Layer<RIn2, E2, ROut2>,
  <RIn, E, ROut, RIn2, E2, ROut2>(
    self: Layer.Layer<RIn, E, ROut>,
    f: (_: Effect.Effect<RIn, E, Context.Context<ROut>>) => Effect.Effect<RIn2, E2, Context.Context<ROut2>>
  ) => Layer.Layer<RIn2, E2, ROut2>
>(2, (self, f) => {
  const locally = Object.create(proto)
  locally._tag = "Locally"
  locally.self = self
  locally.f = f
  return locally
})

/** @internal */
export const fiberRefLocallyWith = dual<
  <X>(ref: FiberRef<X>, value: (_: X) => X) => <R, E, A>(self: Layer.Layer<R, E, A>) => Layer.Layer<R, E, A>,
  <R, E, A, X>(self: Layer.Layer<R, E, A>, ref: FiberRef<X>, value: (_: X) => X) => Layer.Layer<R, E, A>
>(3, (self, ref, value) => locallyEffect(self, core.fiberRefLocallyWith(ref, value)))

/** @internal */
export const fiberRefLocallyScoped = <A>(self: FiberRef<A>, value: A): Layer.Layer<never, never, never> =>
  scopedDiscard(fiberRuntime.fiberRefLocallyScoped(self, value))

/** @internal */
export const fiberRefLocallyScopedWith = <A>(self: FiberRef<A>, value: (_: A) => A): Layer.Layer<never, never, never> =>
  scopedDiscard(fiberRuntime.fiberRefLocallyScopedWith(self, value))

/** @internal */
export const fromFunction = <A extends Context.Tag<any, any>, B extends Context.Tag<any, any>>(
  tagA: A,
  tagB: B,
  f: (a: Context.Tag.Service<A>) => Context.Tag.Service<B>
): Layer.Layer<Context.Tag.Identifier<A>, never, Context.Tag.Identifier<B>> =>
  fromEffectContext(core.map(tagA, (a) => Context.make(tagB, f(a))))

/** @internal */
export const launch = <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>): Effect.Effect<RIn, E, never> =>
  fiberRuntime.scopedEffect(
    core.zipRight(
      fiberRuntime.scopeWith((scope) => pipe(self, buildWithScope(scope))),
      core.never
    )
  )

/** @internal */
export const map = dual<
  <A, B>(
    f: (context: Context.Context<A>) => Context.Context<B>
  ) => <R, E>(self: Layer.Layer<R, E, A>) => Layer.Layer<R, E, B>,
  <R, E, A, B>(
    self: Layer.Layer<R, E, A>,
    f: (context: Context.Context<A>) => Context.Context<B>
  ) => Layer.Layer<R, E, B>
>(2, (self, f) => flatMap(self, (context) => succeedContext(f(context))))

/** @internal */
export const mapError = dual<
  <E, E2>(f: (error: E) => E2) => <R, A>(self: Layer.Layer<R, E, A>) => Layer.Layer<R, E2, A>,
  <R, E, A, E2>(self: Layer.Layer<R, E, A>, f: (error: E) => E2) => Layer.Layer<R, E2, A>
>(2, (self, f) => catchAll(self, (error) => failSync(() => f(error))))

/** @internal */
export const matchCause = dual<
  <E, A, R2, E2, A2, R3, E3, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Layer.Layer<R2, E2, A2>
      readonly onSuccess: (context: Context.Context<A>) => Layer.Layer<R3, E3, A3>
    }
  ) => <R>(self: Layer.Layer<R, E, A>) => Layer.Layer<R | R2 | R3, E2 | E3, A2 & A3>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Layer.Layer<R, E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Layer.Layer<R2, E2, A2>
      readonly onSuccess: (context: Context.Context<A>) => Layer.Layer<R3, E3, A3>
    }
  ) => Layer.Layer<R | R2 | R3, E2 | E3, A2 & A3>
>(2, (self, { onFailure, onSuccess }) => {
  const fold = Object.create(proto)
  fold._tag = OpCodes.OP_FOLD
  fold.layer = self
  fold.failureK = onFailure
  fold.successK = onSuccess
  return fold
})

/** @internal */
export const match = dual<
  <E, R2, E2, A2, A, R3, E3, A3>(
    options: {
      readonly onFailure: (error: E) => Layer.Layer<R2, E2, A2>
      readonly onSuccess: (context: Context.Context<A>) => Layer.Layer<R3, E3, A3>
    }
  ) => <R>(self: Layer.Layer<R, E, A>) => Layer.Layer<R | R2 | R3, E2 | E3, A2 & A3>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Layer.Layer<R, E, A>,
    options: {
      readonly onFailure: (error: E) => Layer.Layer<R2, E2, A2>
      readonly onSuccess: (context: Context.Context<A>) => Layer.Layer<R3, E3, A3>
    }
  ) => Layer.Layer<R | R2 | R3, E2 | E3, A2 & A3>
>(2, (self, { onFailure, onSuccess }) =>
  matchCause(self, {
    onFailure: (cause) => {
      const failureOrCause = Cause.failureOrCause(cause)
      switch (failureOrCause._tag) {
        case "Left": {
          return onFailure(failureOrCause.left)
        }
        case "Right": {
          return failCause(failureOrCause.right)
        }
      }
    },
    onSuccess
  }))

/** @internal */
export const memoize = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Effect.Effect<Scope.Scope, never, Layer.Layer<RIn, E, ROut>> =>
  fiberRuntime.scopeWith((scope) =>
    core.map(
      effect.memoize(buildWithScope(self, scope)),
      fromEffectContext
    )
  )

/** @internal */
export const merge = dual<
  <RIn2, E2, ROut2>(
    that: Layer.Layer<RIn2, E2, ROut2>
  ) => <RIn, E1, ROut>(self: Layer.Layer<RIn, E1, ROut>) => Layer.Layer<
    RIn | RIn2,
    E1 | E2,
    ROut | ROut2
  >,
  <RIn, E1, ROut, RIn2, E2, ROut2>(self: Layer.Layer<RIn, E1, ROut>, that: Layer.Layer<RIn2, E2, ROut2>) => Layer.Layer<
    RIn | RIn2,
    E1 | E2,
    ROut | ROut2
  >
>(2, (self, that) => zipWith(self, that, (a, b) => Context.merge(a, b)))

/** @internal */
export const mergeAll = <Layers extends [Layer.Layer<any, any, never>, ...Array<Layer.Layer<any, any, never>>]>(
  ...layers: Layers
): Layer.Layer<
  { [k in keyof Layers]: Layer.Layer.Context<Layers[k]> }[number],
  { [k in keyof Layers]: Layer.Layer.Error<Layers[k]> }[number],
  { [k in keyof Layers]: Layer.Layer.Success<Layers[k]> }[number]
> => {
  let final = layers[0]
  for (let i = 1; i < layers.length; i++) {
    final = merge(final, layers[i])
  }
  return final as any
}

/** @internal */
export const orDie = <R, E, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R, never, A> =>
  catchAll(self, (defect) => die(defect))

/** @internal */
export const orElse = dual<
  <R2, E2, A2>(
    that: LazyArg<Layer.Layer<R2, E2, A2>>
  ) => <R, E, A>(self: Layer.Layer<R, E, A>) => Layer.Layer<R | R2, E | E2, A & A2>,
  <R, E, A, R2, E2, A2>(
    self: Layer.Layer<R, E, A>,
    that: LazyArg<Layer.Layer<R2, E2, A2>>
  ) => Layer.Layer<R | R2, E | E2, A & A2>
>(2, (self, that) => catchAll(self, that))

/** @internal */
export const passthrough = <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn, E, RIn | ROut> =>
  merge(context<RIn>(), self)

/** @internal */
export const project = dual<
  <A extends Context.Tag<any, any>, B extends Context.Tag<any, any>>(
    tagA: A,
    tagB: B,
    f: (a: Context.Tag.Service<A>) => Context.Tag.Service<B>
  ) => <RIn, E>(self: Layer.Layer<RIn, E, Context.Tag.Identifier<A>>) => Layer.Layer<RIn, E, Context.Tag.Identifier<B>>,
  <RIn, E, A extends Context.Tag<any, any>, B extends Context.Tag<any, any>>(
    self: Layer.Layer<RIn, E, Context.Tag.Identifier<A>>,
    tagA: A,
    tagB: B,
    f: (a: Context.Tag.Service<A>) => Context.Tag.Service<B>
  ) => Layer.Layer<RIn, E, Context.Tag.Identifier<B>>
>(4, (self, tagA, tagB, f) => map(self, (context) => Context.make(tagB, f(Context.unsafeGet(context, tagA)))))

/** @internal */
export const retry = dual<
  <RIn2, E, X>(
    schedule: Schedule.Schedule<RIn2, E, X>
  ) => <RIn, ROut>(
    self: Layer.Layer<RIn, E, ROut>
  ) => Layer.Layer<RIn | RIn2, E, ROut>,
  <RIn, E, ROut, RIn2, X>(
    self: Layer.Layer<RIn, E, ROut>,
    schedule: Schedule.Schedule<RIn2, E, X>
  ) => Layer.Layer<RIn | RIn2, E, ROut>
>(2, (self, schedule) =>
  suspend(() => {
    const stateTag = Context.Tag<{ state: unknown }>()
    return pipe(
      succeed(stateTag, { state: schedule.initial }),
      flatMap((env: Context.Context<{ state: unknown }>) =>
        retryLoop(self, schedule, stateTag, pipe(env, Context.get(stateTag)).state)
      )
    )
  }))

/** @internal */
const retryLoop = <RIn, E, ROut, RIn2, X>(
  self: Layer.Layer<RIn, E, ROut>,
  schedule: Schedule.Schedule<RIn2, E, X>,
  stateTag: Context.Tag<{ state: unknown }, { state: unknown }>,
  state: unknown
): Layer.Layer<RIn | RIn2, E, ROut> => {
  return pipe(
    self,
    catchAll((error) =>
      pipe(
        retryUpdate(schedule, stateTag, error, state),
        flatMap((env) => fresh(retryLoop(self, schedule, stateTag, pipe(env, Context.get(stateTag)).state)))
      )
    )
  )
}

/** @internal */
const retryUpdate = <RIn, E, X>(
  schedule: Schedule.Schedule<RIn, E, X>,
  stateTag: Context.Tag<{ state: unknown }, { state: unknown }>,
  error: E,
  state: unknown
): Layer.Layer<RIn, E, { state: unknown }> => {
  return fromEffect(
    stateTag,
    pipe(
      Clock.currentTimeMillis,
      core.flatMap((now) =>
        pipe(
          schedule.step(now, error, state),
          core.flatMap(([state, _, decision]) =>
            ScheduleDecision.isDone(decision) ?
              core.fail(error) :
              pipe(
                Clock.sleep(Duration.millis(Intervals.start(decision.intervals) - now)),
                core.as({ state })
              )
          )
        )
      )
    )
  )
}

/** @internal */
export const scoped = dual<
  <T extends Context.Tag<any, any>>(
    tag: T
  ) => <R, E>(
    effect: Effect.Effect<R, E, Context.Tag.Service<T>>
  ) => Layer.Layer<Exclude<R, Scope.Scope>, E, Context.Tag.Identifier<T>>,
  <T extends Context.Tag<any, any>, R, E>(
    tag: T,
    effect: Effect.Effect<R, E, Context.Tag.Service<T>>
  ) => Layer.Layer<Exclude<R, Scope.Scope>, E, Context.Tag.Identifier<T>>
>(2, (a, b) => {
  const tagFirst = Context.isTag(a)
  const tag = (tagFirst ? a : b) as Context.Tag<unknown, unknown>
  const effect = tagFirst ? b : a
  return scopedContext(core.map(effect, (service) => Context.make(tag, service)))
})

/** @internal */
export const scopedDiscard = <R, E, _>(
  effect: Effect.Effect<R, E, _>
): Layer.Layer<Exclude<R, Scope.Scope>, E, never> => scopedContext(pipe(effect, core.as(Context.empty())))

/** @internal */
export const scopedContext = <R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
): Layer.Layer<Exclude<R, Scope.Scope>, E, A> => {
  const scoped = Object.create(proto)
  scoped._tag = OpCodes.OP_SCOPED
  scoped.effect = effect
  return scoped
}

/** @internal */
export const scope: Layer.Layer<never, never, Scope.Scope.Closeable> = scopedContext(
  core.map(
    fiberRuntime.acquireRelease(
      fiberRuntime.scopeMake(),
      (scope, exit) => scope.close(exit)
    ),
    (scope) => Context.make(Scope.Scope, scope)
  )
)

/** @internal */
export const service = <T extends Context.Tag<any, any>>(
  tag: T
): Layer.Layer<Context.Tag.Identifier<T>, never, Context.Tag.Identifier<T>> => fromEffect(tag, tag)

/** @internal */
export const succeed = dual<
  <T extends Context.Tag<any, any>>(
    tag: T
  ) => (
    resource: Context.Tag.Service<T>
  ) => Layer.Layer<never, never, Context.Tag.Identifier<T>>,
  <T extends Context.Tag<any, any>>(
    tag: T,
    resource: Context.Tag.Service<T>
  ) => Layer.Layer<never, never, Context.Tag.Identifier<T>>
>(2, (a, b) => {
  const tagFirst = Context.isTag(a)
  const tag = (tagFirst ? a : b) as Context.Tag<unknown, unknown>
  const resource = tagFirst ? b : a
  return fromEffectContext(core.succeed(Context.make(tag, resource)))
})

/** @internal */
export const succeedContext = <A>(
  context: Context.Context<A>
): Layer.Layer<never, never, A> => {
  return fromEffectContext(core.succeed(context))
}

/** @internal */
export const empty = succeedContext(Context.empty())

/** @internal */
export const suspend = <RIn, E, ROut>(
  evaluate: LazyArg<Layer.Layer<RIn, E, ROut>>
): Layer.Layer<RIn, E, ROut> => {
  const suspend = Object.create(proto)
  suspend._tag = OpCodes.OP_SUSPEND
  suspend.evaluate = evaluate
  return suspend
}

/** @internal */
export const sync = dual<
  <T extends Context.Tag<any, any>>(
    tag: T
  ) => (
    evaluate: LazyArg<Context.Tag.Service<T>>
  ) => Layer.Layer<never, never, Context.Tag.Identifier<T>>,
  <T extends Context.Tag<any, any>>(
    tag: T,
    evaluate: LazyArg<Context.Tag.Service<T>>
  ) => Layer.Layer<never, never, Context.Tag.Identifier<T>>
>(2, (a, b) => {
  const tagFirst = Context.isTag(a)
  const tag = (tagFirst ? a : b) as Context.Tag<unknown, unknown>
  const evaluate = tagFirst ? b : a
  return fromEffectContext(core.sync(() => Context.make(tag, evaluate())))
})

/** @internal */
export const syncContext = <A>(evaluate: LazyArg<Context.Context<A>>): Layer.Layer<never, never, A> => {
  return fromEffectContext(core.sync(evaluate))
}

/** @internal */
export const tap = dual<
  <ROut, XR extends ROut, RIn2, E2, X>(
    f: (context: Context.Context<XR>) => Effect.Effect<RIn2, E2, X>
  ) => <RIn, E>(self: Layer.Layer<RIn, E, ROut>) => Layer.Layer<RIn | RIn2, E | E2, ROut>,
  <RIn, E, ROut, XR extends ROut, RIn2, E2, X>(
    self: Layer.Layer<RIn, E, ROut>,
    f: (context: Context.Context<XR>) => Effect.Effect<RIn2, E2, X>
  ) => Layer.Layer<RIn | RIn2, E | E2, ROut>
>(2, (self, f) => flatMap(self, (context) => fromEffectContext(core.as(f(context), context))))

/** @internal */
export const tapError = dual<
  <E, XE extends E, RIn2, E2, X>(
    f: (e: XE) => Effect.Effect<RIn2, E2, X>
  ) => <RIn, ROut>(self: Layer.Layer<RIn, E, ROut>) => Layer.Layer<RIn | RIn2, E | E2, ROut>,
  <RIn, E, XE extends E, ROut, RIn2, E2, X>(
    self: Layer.Layer<RIn, E, ROut>,
    f: (e: XE) => Effect.Effect<RIn2, E2, X>
  ) => Layer.Layer<RIn | RIn2, E | E2, ROut>
>(2, (self, f) =>
  catchAll(
    self,
    (e) => fromEffectContext(core.flatMap(f(e as any), () => core.fail(e)))
  ))

/** @internal */
export const tapErrorCause = dual<
  <E, XE extends E, RIn2, E2, X>(
    f: (cause: Cause.Cause<XE>) => Effect.Effect<RIn2, E2, X>
  ) => <RIn, ROut>(self: Layer.Layer<RIn, E, ROut>) => Layer.Layer<RIn | RIn2, E | E2, ROut>,
  <RIn, E, XE extends E, ROut, RIn2, E2, X>(
    self: Layer.Layer<RIn, E, ROut>,
    f: (cause: Cause.Cause<XE>) => Effect.Effect<RIn2, E2, X>
  ) => Layer.Layer<RIn | RIn2, E | E2, ROut>
>(2, (self, f) =>
  catchAllCause(
    self,
    (cause) => fromEffectContext(core.flatMap(f(cause as any), () => core.failCause(cause)))
  ))

/** @internal */
export const toRuntime = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Effect.Effect<RIn | Scope.Scope, E, Runtime.Runtime<ROut>> => {
  return pipe(
    fiberRuntime.scopeWith((scope) => pipe(self, buildWithScope(scope))),
    core.flatMap((context) =>
      pipe(
        runtime.runtime<ROut>(),
        core.provideContext(context)
      )
    )
  )
}

/** @internal */
export const provide = dual<
  <RIn, E, ROut>(
    self: Layer.Layer<RIn, E, ROut>
  ) => <RIn2, E2, ROut2>(
    that: Layer.Layer<RIn2, E2, ROut2>
  ) => Layer.Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut2>,
  <RIn2, E2, ROut2, RIn, E, ROut>(
    that: Layer.Layer<RIn2, E2, ROut2>,
    self: Layer.Layer<RIn, E, ROut>
  ) => Layer.Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut2>
>(2, <RIn2, E2, ROut2, RIn, E, ROut>(
  that: Layer.Layer<RIn2, E2, ROut2>,
  self: Layer.Layer<RIn, E, ROut>
) =>
  suspend(() => {
    const provideTo = Object.create(proto)
    provideTo._tag = OpCodes.OP_PROVIDE
    provideTo.first = Object.create(proto, {
      _tag: { value: OpCodes.OP_PROVIDE_MERGE, enumerable: true },
      first: { value: context<Exclude<RIn2, ROut>>(), enumerable: true },
      second: { value: self },
      zipK: { value: (a: Context.Context<ROut>, b: Context.Context<ROut2>) => pipe(a, Context.merge(b)) }
    })
    provideTo.second = that
    return provideTo
  }))

/** @internal */
export const provideMerge = dual<
  <RIn, E, ROut>(
    self: Layer.Layer<RIn, E, ROut>
  ) => <RIn2, E2, ROut2>(
    that: Layer.Layer<RIn2, E2, ROut2>
  ) => Layer.Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut | ROut2>,
  <RIn2, E2, ROut2, RIn, E, ROut>(
    that: Layer.Layer<RIn2, E2, ROut2>,
    self: Layer.Layer<RIn, E, ROut>
  ) => Layer.Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut | ROut2>
>(2, <RIn2, E2, ROut2, RIn, E, ROut>(that: Layer.Layer<RIn2, E2, ROut2>, self: Layer.Layer<RIn, E, ROut>) => {
  const zipWith = Object.create(proto)
  zipWith._tag = OpCodes.OP_PROVIDE_MERGE
  zipWith.first = self
  zipWith.second = provide(that, self)
  zipWith.zipK = (a: Context.Context<ROut>, b: Context.Context<ROut2>): Context.Context<ROut | ROut2> => {
    return pipe(a, Context.merge(b))
  }
  return zipWith
})

/** @internal */
export const zipWith = dual<
  <R2, E2, B, A, C>(
    that: Layer.Layer<R2, E2, B>,
    f: (a: Context.Context<A>, b: Context.Context<B>) => Context.Context<C>
  ) => <R, E>(self: Layer.Layer<R, E, A>) => Layer.Layer<R | R2, E | E2, C>,
  <R, E, R2, E2, B, A, C>(
    self: Layer.Layer<R, E, A>,
    that: Layer.Layer<R2, E2, B>,
    f: (a: Context.Context<A>, b: Context.Context<B>) => Context.Context<C>
  ) => Layer.Layer<R | R2, E | E2, C>
>(3, (self, that, f) =>
  suspend(() => {
    const zipWith = Object.create(proto)
    zipWith._tag = OpCodes.OP_ZIP_WITH
    zipWith.first = self
    zipWith.second = that
    zipWith.zipK = f
    return zipWith
  }))

/** @internal */
export const unwrapEffect = <R, E, R1, E1, A>(
  self: Effect.Effect<R, E, Layer.Layer<R1, E1, A>>
): Layer.Layer<R | R1, E | E1, A> => {
  const tag = Context.Tag<Layer.Layer<R1, E1, A>>()
  return flatMap(fromEffect(tag, self), (context) => Context.get(context, tag))
}

/** @internal */
export const unwrapScoped = <R, E, R1, E1, A>(
  self: Effect.Effect<R, E, Layer.Layer<R1, E1, A>>
): Layer.Layer<R1 | Exclude<R, Scope.Scope>, E | E1, A> => {
  const tag = Context.Tag<Layer.Layer<R1, E1, A>>()
  return flatMap(scoped(tag, self), (context) => Context.get(context, tag))
}

// -----------------------------------------------------------------------------
// tracing
// -----------------------------------------------------------------------------

/** @internal */
export const withSpan = dual<
  (name: string, options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
    readonly onEnd?:
      | ((span: Tracer.Span, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>)
      | undefined
  }) => <R, E, A>(self: Layer.Layer<R, E, A>) => Layer.Layer<Exclude<R, Tracer.ParentSpan>, E, A>,
  <R, E, A>(self: Layer.Layer<R, E, A>, name: string, options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
    readonly onEnd?:
      | ((span: Tracer.Span, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>)
      | undefined
  }) => Layer.Layer<Exclude<R, Tracer.ParentSpan>, E, A>
>((args) => isLayer(args[0]), (self, name, options) =>
  unwrapScoped(
    core.map(
      options?.onEnd
        ? core.tap(
          fiberRuntime.makeSpanScoped(name, options),
          (span) => fiberRuntime.addFinalizer((exit) => options.onEnd!(span, exit))
        )
        : fiberRuntime.makeSpanScoped(name, options),
      (span) => withParentSpan(self, span)
    )
  ))

/** @internal */
export const withParentSpan = dual<
  (
    span: Tracer.ParentSpan
  ) => <R, E, A>(self: Layer.Layer<R, E, A>) => Layer.Layer<Exclude<R, Tracer.ParentSpan>, E, A>,
  <R, E, A>(self: Layer.Layer<R, E, A>, span: Tracer.ParentSpan) => Layer.Layer<Exclude<R, Tracer.ParentSpan>, E, A>
>(2, (self, span) => provide(self, succeedContext(Context.make(tracer.spanTag, span))))

// circular with Effect

const provideSomeLayer = dual<
  <R2, E2, A2>(
    layer: Layer.Layer<R2, E2, A2>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | Exclude<R, A2>, E | E2, A>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    layer: Layer.Layer<R2, E2, A2>
  ) => Effect.Effect<R2 | Exclude<R, A2>, E | E2, A>
>(2, (self, layer) =>
  core.acquireUseRelease(
    fiberRuntime.scopeMake(),
    (scope) =>
      core.flatMap(
        buildWithScope(layer, scope),
        (context) => core.provideSomeContext(self, context)
      ),
    (scope, exit) => core.scopeClose(scope, exit)
  ))

const provideSomeRuntime: {
  <R>(context: Runtime.Runtime<R>): <R1, E, A>(self: Effect.Effect<R1, E, A>) => Effect.Effect<Exclude<R1, R>, E, A>
  <R, R1, E, A>(self: Effect.Effect<R1, E, A>, context: Runtime.Runtime<R>): Effect.Effect<Exclude<R1, R>, E, A>
} = dual<
  <R>(context: Runtime.Runtime<R>) => <R1, E, A>(self: Effect.Effect<R1, E, A>) => Effect.Effect<Exclude<R1, R>, E, A>,
  <R, R1, E, A>(self: Effect.Effect<R1, E, A>, context: Runtime.Runtime<R>) => Effect.Effect<Exclude<R1, R>, E, A>
>(2, (self, rt) => {
  const patchRefs = FiberRefsPatch.diff(runtime.defaultRuntime.fiberRefs, rt.fiberRefs)
  const patchFlags = runtimeFlags.diff(runtime.defaultRuntime.runtimeFlags, rt.runtimeFlags)
  return core.uninterruptibleMask((restore) =>
    core.withFiberRuntime((fiber) => {
      const oldRefs = fiber.getFiberRefs()
      const newRefs = FiberRefsPatch.patch(fiber.id(), oldRefs)(patchRefs)
      const oldFlags = fiber._runtimeFlags
      const newFlags = runtimeFlags.patch(patchFlags)(oldFlags)
      const rollbackRefs = FiberRefsPatch.diff(newRefs, oldRefs)
      const rollbackFlags = runtimeFlags.diff(newFlags, oldFlags)
      fiber.setFiberRefs(newRefs)
      fiber._runtimeFlags = newFlags
      return fiberRuntime.ensuring(
        core.provideSomeContext(restore(self), rt.context),
        core.withFiberRuntime((fiber) => {
          fiber.setFiberRefs(FiberRefsPatch.patch(fiber.id(), fiber.getFiberRefs())(rollbackRefs))
          fiber._runtimeFlags = runtimeFlags.patch(rollbackFlags)(fiber._runtimeFlags)
          return core.unit
        })
      )
    })
  )
})

/** @internal */
export const effect_provide = dual<
  {
    <R2, E2, A2>(
      layer: Layer.Layer<R2, E2, A2>
    ): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | Exclude<R, A2>, E | E2, A>
    <R2>(
      context: Context.Context<R2>
    ): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, R2>, E, A>
    <R2>(
      runtime: Runtime.Runtime<R2>
    ): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, R2>, E, A>
  },
  {
    <R, E, A, R2, E2, A2>(
      self: Effect.Effect<R, E, A>,
      layer: Layer.Layer<R2, E2, A2>
    ): Effect.Effect<R2 | Exclude<R, A2>, E | E2, A>
    <R, E, A, R2>(
      self: Effect.Effect<R, E, A>,
      context: Context.Context<R2>
    ): Effect.Effect<Exclude<R, R2>, E, A>
    <R, E, A, R2>(
      self: Effect.Effect<R, E, A>,
      runtime: Runtime.Runtime<R2>
    ): Effect.Effect<Exclude<R, R2>, E, A>
  }
>(
  2,
  <R, E, A, R2>(
    self: Effect.Effect<R, E, A>,
    source: Layer.Layer<any, any, R2> | Context.Context<R2> | Runtime.Runtime<R2>
  ): Effect.Effect<Exclude<R, R2>, any, any> =>
    isLayer(source)
      ? provideSomeLayer(self, source as Layer.Layer<any, any, R2>)
      : Context.isContext(source)
      ? core.provideSomeContext(self, source)
      : provideSomeRuntime(self, source as Runtime.Runtime<R2>)
)
