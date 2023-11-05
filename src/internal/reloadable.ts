import { Context } from "../Context.js"
import type { Effect } from "../Effect.js"
import { pipe } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import type { Layer } from "../Layer.js"
import type { Reloadable } from "../Reloadable.js"
import type { Schedule } from "../Schedule.js"
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

/** @internal */
const reloadableVariance = {
  _A: (_: never) => _
}

/** @internal */
export const auto = <Out extends Context.Tag<any, any>, In, E, R>(
  tag: Out,
  options: {
    readonly layer: Layer<In, E, Context.Tag.Identifier<Out>>
    readonly schedule: Schedule<R, unknown, unknown>
  }
): Layer<
  R | In,
  E,
  Reloadable<Context.Tag.Identifier<Out>>
> =>
  _layer.scoped(
    reloadableTag(tag),
    pipe(
      _layer.build(manual(tag, { layer: options.layer })),
      core.map(Context.unsafeGet(reloadableTag(tag))),
      core.tap((reloadable) =>
        fiberRuntime.acquireRelease(
          pipe(
            reloadable.reload(),
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
    readonly layer: Layer<In, E, Context.Tag.Identifier<Out>>
    readonly scheduleFromConfig: (context: Context<In>) => Schedule<R, unknown, unknown>
  }
): Layer<
  R | In,
  E,
  Reloadable<Context.Tag.Identifier<Out>>
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
): Effect<Reloadable<Context.Tag.Identifier<T>>, never, Context.Tag.Service<T>> =>
  core.flatMap(
    reloadableTag(tag),
    (reloadable) => scopedRef.get(reloadable.scopedRef)
  )

/** @internal */
export const manual = <Out extends Context.Tag<any, any>, In, E>(
  tag: Out,
  options: {
    readonly layer: Layer<In, E, Context.Tag.Identifier<Out>>
  }
): Layer<In, E, Reloadable<Context.Tag.Identifier<Out>>> =>
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
            reload: () =>
              pipe(
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
): Context.Tag<Reloadable<Context.Tag.Identifier<T>>, Reloadable<Context.Tag.Service<T>>> => {
  if (tagMap.has(tag)) {
    return tagMap.get(tag)!
  }
  const newTag = Context.Tag<
    Reloadable<Context.Tag.Identifier<T>>,
    Reloadable<Context.Tag.Service<T>>
  >()
  tagMap.set(tag, newTag)
  return newTag
}

/** @internal */
export const reload = <T extends Context.Tag<any, any>>(
  tag: T
): Effect<Reloadable<Context.Tag.Identifier<T>>, unknown, void> =>
  core.flatMap(
    reloadableTag(tag),
    (reloadable) => reloadable.reload()
  )

/** @internal */
export const reloadFork = <T extends Context.Tag<any, any>>(
  tag: T
): Effect<Reloadable<Context.Tag.Identifier<T>>, unknown, void> =>
  core.flatMap(reloadableTag(tag), (reloadable) =>
    pipe(
      reloadable.reload(),
      effect.ignoreLogged,
      fiberRuntime.forkDaemon,
      core.asUnit
    ))
