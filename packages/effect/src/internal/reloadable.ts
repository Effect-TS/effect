import * as Context from "../Context.js"
import type * as Effect from "../Effect.js"
import { pipe } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import type * as Layer from "../Layer.js"
import type * as Reloadable from "../Reloadable.js"
import type * as Schedule from "../Schedule.js"
import * as effect from "./core-effect.js"
import * as core from "./core.js"
import * as fiberRuntime from "./fiberRuntime.js"
import * as _layer from "./layer.js"
import * as _schedule from "./schedule.js"
import * as scopedRef from "./scopedRef.js"

/** @internal */
const ReloadableSymbolKey = "effect/Reloadable"

/** @internal */
export const ReloadableTypeId: Reloadable.ReloadableTypeId = Symbol.for(
  ReloadableSymbolKey
) as Reloadable.ReloadableTypeId

const reloadableVariance = {
  /* c8 ignore next */
  _A: (_: any) => _
}

/** @internal */
export const auto = <Out extends Context.Tag<any, any>, In, E, R>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<In, E, Context.Tag.Identifier<Out>>
    readonly schedule: Schedule.Schedule<R, unknown, unknown>
  }
): Layer.Layer<
  R | In,
  E,
  Reloadable.Reloadable<Context.Tag.Identifier<Out>>
> =>
  _layer.scoped(
    reloadableTag(tag),
    pipe(
      _layer.build(manual(tag, { layer: options.layer })),
      core.map(Context.unsafeGet(reloadableTag(tag))),
      core.tap((reloadable) =>
        fiberRuntime.acquireRelease(
          pipe(
            reloadable.reload,
            effect.ignoreLogged,
            _schedule.schedule_Effect(options.schedule),
            fiberRuntime.forkDaemon
          ),
          core.interruptFiber
        )
      )
    )
  )

/** @internal */
export const autoFromConfig = <Out extends Context.Tag<any, any>, In, E, R>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<In, E, Context.Tag.Identifier<Out>>
    readonly scheduleFromConfig: (context: Context.Context<In>) => Schedule.Schedule<R, unknown, unknown>
  }
): Layer.Layer<
  R | In,
  E,
  Reloadable.Reloadable<Context.Tag.Identifier<Out>>
> =>
  _layer.scoped(
    reloadableTag(tag),
    pipe(
      core.context<In>(),
      core.flatMap((env) =>
        pipe(
          _layer.build(auto(tag, {
            layer: options.layer,
            schedule: options.scheduleFromConfig(env)
          })),
          core.map(Context.unsafeGet(reloadableTag(tag)))
        )
      )
    )
  )

/** @internal */
export const get = <T extends Context.Tag<any, any>>(
  tag: T
): Effect.Effect<Reloadable.Reloadable<Context.Tag.Identifier<T>>, never, Context.Tag.Service<T>> =>
  core.flatMap(
    reloadableTag(tag),
    (reloadable) => scopedRef.get(reloadable.scopedRef)
  )

/** @internal */
export const manual = <Out extends Context.Tag<any, any>, In, E>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<In, E, Context.Tag.Identifier<Out>>
  }
): Layer.Layer<In, E, Reloadable.Reloadable<Context.Tag.Identifier<Out>>> =>
  _layer.scoped(
    reloadableTag(tag),
    pipe(
      core.context<In>(),
      core.flatMap((env) =>
        pipe(
          scopedRef.fromAcquire(pipe(_layer.build(options.layer), core.map(Context.unsafeGet(tag)))),
          core.map((ref) => ({
            [ReloadableTypeId]: reloadableVariance,
            scopedRef: ref,
            reload: pipe(
              scopedRef.set(ref, pipe(_layer.build(options.layer), core.map(Context.unsafeGet(tag)))),
              core.provideContext(env)
            )
          }))
        )
      )
    )
  )

/** @internal */
const tagMap = globalValue(
  Symbol.for("effect/Reloadable/tagMap"),
  () => new WeakMap<Context.Tag<any, any>, Context.Tag<any, any>>([])
)

/** @internal */
export const reloadableTag = <T extends Context.Tag<any, any>>(
  tag: T
): Context.Tag<Reloadable.Reloadable<Context.Tag.Identifier<T>>, Reloadable.Reloadable<Context.Tag.Service<T>>> => {
  if (tagMap.has(tag)) {
    return tagMap.get(tag)!
  }
  const newTag = Context.Tag<
    Reloadable.Reloadable<Context.Tag.Identifier<T>>,
    Reloadable.Reloadable<Context.Tag.Service<T>>
  >()
  tagMap.set(tag, newTag)
  return newTag
}

/** @internal */
export const reload = <T extends Context.Tag<any, any>>(
  tag: T
): Effect.Effect<Reloadable.Reloadable<Context.Tag.Identifier<T>>, unknown, void> =>
  core.flatMap(
    reloadableTag(tag),
    (reloadable) => reloadable.reload
  )

/** @internal */
export const reloadFork = <T extends Context.Tag<any, any>>(
  tag: T
): Effect.Effect<Reloadable.Reloadable<Context.Tag.Identifier<T>>, unknown, void> =>
  core.flatMap(reloadableTag(tag), (reloadable) =>
    pipe(
      reloadable.reload,
      effect.ignoreLogged,
      fiberRuntime.forkDaemon,
      core.asUnit
    ))
