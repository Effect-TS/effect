import * as Context from "../Context.js"
import type * as Effect from "../Effect.js"
import { pipe } from "../Function.js"
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
export const auto = <Out extends Context.Tag<any, any>, E, In, R>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<Context.Tag.Identifier<Out>, E, In>
    readonly schedule: Schedule.Schedule<unknown, unknown, R>
  }
): Layer.Layer<Reloadable.Reloadable<Context.Tag.Identifier<Out>>, E, R | In> =>
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
export const autoFromConfig = <Out extends Context.Tag<any, any>, E, In, R>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<Context.Tag.Identifier<Out>, E, In>
    readonly scheduleFromConfig: (context: Context.Context<In>) => Schedule.Schedule<unknown, unknown, R>
  }
): Layer.Layer<Reloadable.Reloadable<Context.Tag.Identifier<Out>>, E, R | In> =>
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
): Effect.Effect<Context.Tag.Service<T>, never, Reloadable.Reloadable<Context.Tag.Identifier<T>>> =>
  core.flatMap(
    reloadableTag(tag),
    (reloadable) => scopedRef.get(reloadable.scopedRef)
  )

/** @internal */
export const manual = <Out extends Context.Tag<any, any>, In, E>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<Context.Tag.Identifier<Out>, E, In>
  }
): Layer.Layer<Reloadable.Reloadable<Context.Tag.Identifier<Out>>, E, In> =>
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
export const reloadableTag = <T extends Context.Tag<any, any>>(
  tag: T
): Context.Tag<Reloadable.Reloadable<Context.Tag.Identifier<T>>, Reloadable.Reloadable<Context.Tag.Service<T>>> => {
  return Context.GenericTag<
    Reloadable.Reloadable<Context.Tag.Identifier<T>>,
    Reloadable.Reloadable<Context.Tag.Service<T>>
  >(`effect/Reloadable<${tag.key}>`)
}

/** @internal */
export const reload = <T extends Context.Tag<any, any>>(
  tag: T
): Effect.Effect<void, unknown, Reloadable.Reloadable<Context.Tag.Identifier<T>>> =>
  core.flatMap(
    reloadableTag(tag),
    (reloadable) => reloadable.reload
  )

/** @internal */
export const reloadFork = <T extends Context.Tag<any, any>>(
  tag: T
): Effect.Effect<void, unknown, Reloadable.Reloadable<Context.Tag.Identifier<T>>> =>
  core.flatMap(reloadableTag(tag), (reloadable) =>
    pipe(
      reloadable.reload,
      effect.ignoreLogged,
      fiberRuntime.forkDaemon,
      core.asVoid
    ))
