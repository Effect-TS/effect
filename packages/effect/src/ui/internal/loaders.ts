/**
 * PROTOTYPE (EFF-3558). What `Component.make` builds from `loaders`: the empty
 * snapshots, `h.loaded` and the `watch` of `subscriptions`.
 *
 * @internal
 */
import type * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as snapshots from "../../reactivity/internal/loaderSnapshot.ts"
import type * as Loader from "../../reactivity/Loader.ts"
import type * as Schema from "../../Schema.ts"
import * as Stream from "../../Stream.ts"
import * as Subscription from "../Subscription.ts"
import * as services from "./services.ts"

const LoaderTypeId: typeof Loader.TypeId = "~effect/reactivity/Loader"

/**
 * What one field's watch carries for the runtime.
 *
 * @internal
 */
export interface Marker {
  readonly read: Loader.AnyDefinition
  readonly label: string
  /** `undefined`: the read is disabled, and the marker is inert. */
  readonly args: unknown
  readonly argsKey: string | undefined
  readonly toMsg: (snapshot: Loader.Snapshot<any, any>) => unknown
}

/** @internal */
export const markerOf = (subscription: object): Marker | undefined => (subscription as any)[services.loadedMarker]

/** The per-field Subscriptions inside the one `watch` returns. */
const watchesKey: unique symbol = Symbol.for("effect/ui/Component/watches") as any

type LoaderFn = (model: any, props: any, loaded: any) => unknown

/** @internal */
export interface Context {
  /** `h.loaded`: one lazy getter per snapshot field. */
  readonly loaded: Record<string, AsyncResult.AsyncResult<any, any>>
  readonly watch: (handlers: Record<string, (snapshot: any) => unknown>) => Subscription.Subscription<any, any>
}

/** @internal */
export interface Bound {
  readonly empty: Record<string, Loader.Snapshot<any, any>>
  /** For one (model, props): each loader runs at most once. */
  readonly context: (model: any, props: any) => Context
  /** Replaces the `watch` Subscription with its per-field ones, which the runtime registers. */
  readonly expand: (
    subscriptions: ReadonlyArray<Subscription.Subscription<any, any> | false | null | undefined>
  ) => Array<Subscription.Subscription<any, any>>
}

/**
 * Checks the Model and binds its snapshot fields to `loaders`. `undefined` for
 * a Model with no snapshot field.
 *
 * @internal
 */
export const bind = (
  name: string,
  model: Schema.Top,
  loaders: Record<string, LoaderFn> | undefined,
  hasSubscriptions: boolean
): Bound | undefined => {
  const fields = snapshots.checkModel(name, model)
  if (fields.length === 0) return undefined
  for (const field of fields) {
    if (typeof loaders?.[field.field] !== "function") {
      throw new Error(
        `${name}: the Model field "${field.field}" is a snapshot and has no loader. Add loaders.${field.field}.`
      )
    }
  }
  if (!hasSubscriptions) {
    throw new Error(`${name}: the Model has snapshot fields, so subscriptions must return [watch({ ... })].`)
  }
  const empty: Record<string, Loader.Snapshot<any, any>> = {}
  for (const field of fields) empty[field.field] = snapshots.emptySnapshot(field.definition, field.label)
  Object.freeze(empty)
  const context = (model: any, props: any): Context => {
    const memo = new Map<string, { readonly args: unknown; readonly argsKey: string | undefined }>()
    const running = new Set<string>()
    const loaded: Record<string, AsyncResult.AsyncResult<any, any>> = {}
    const argsOf = (field: snapshots.Found & { readonly field: string }) => {
      let current = memo.get(field.field)
      if (current === undefined) {
        if (running.has(field.field)) {
          throw new Error(`${name}: the loader "${field.field}" reads its own result through a cycle of loaders.`)
        }
        running.add(field.field)
        const args = loaders![field.field](model, props, loaded)
        running.delete(field.field)
        current = { args, argsKey: args === undefined ? undefined : field.definition[LoaderTypeId].argsKey(args) }
        memo.set(field.field, current)
      }
      return current
    }
    for (const field of fields) {
      Object.defineProperty(loaded, field.field, {
        enumerable: true,
        get: () => snapshots.open(model[field.field], argsOf(field).argsKey)
      })
    }
    return {
      loaded,
      watch: (handlers) => ({
        [Subscription.TypeId]: Subscription.TypeId,
        key: "~loaded",
        stream: Stream.never,
        [watchesKey]: fields.map((field) => {
          const toMsg = handlers[field.field]
          if (typeof toMsg !== "function") {
            throw new Error(`${name}: watch has no handler for the snapshot field "${field.field}".`)
          }
          const { args, argsKey } = argsOf(field)
          const marker: Marker = { read: field.definition, label: field.label, args, argsKey, toMsg }
          return {
            [Subscription.TypeId]: Subscription.TypeId,
            // The label and the args key are the Subscription key, so a re-key closes the old watcher first.
            key: argsKey === undefined
              ? Subscription.keyOf(`~loaded/${field.label}`)
              : Subscription.keyOf(`~loaded/${field.label}`, argsKey),
            stream: Stream.never,
            [services.loadedMarker]: marker
          }
        })
      } as any)
    }
  }
  return {
    empty,
    context,
    expand: (subscriptions) => {
      const out: Array<Subscription.Subscription<any, any>> = []
      let watched = false
      for (const subscription of subscriptions) {
        if (!subscription) continue
        const watches = (subscription as any)[watchesKey] as Array<Subscription.Subscription<any, any>> | undefined
        if (watches === undefined) out.push(subscription)
        else if (!watched) {
          watched = true
          for (const watch of watches) out.push(watch)
        }
      }
      if (!watched) throw new Error(`${name}: subscriptions must return the Subscription made by watch({ ... }).`)
      return out
    }
  }
}
