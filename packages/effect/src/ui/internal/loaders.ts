/**
 * What `Component.make` builds from `loaders`: the empty snapshots, the
 * opened views of `h` and the `watch` of `subscriptions`.
 *
 * @internal
 */
import * as Option from "../../Option.ts"
import * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Loader from "../../reactivity/Loader.ts"
import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as Stream from "../../Stream.ts"
import * as Subscription from "../Subscription.ts"

/** The annotation `Loader.Snapshot` puts on its Schema. */
const annotationKey = "~effect/reactivity/Loader/Snapshot/field"

interface Annotation {
  readonly read: string
  readonly label: string
  readonly definition: Loader.Read.Any
}

/**
 * One loader field of a Model.
 *
 * @internal
 */
export interface Field {
  readonly field: string
  readonly label: string
  readonly read: Loader.Read.Any
}

/**
 * What one field's watch carries for the runtime.
 *
 * @internal
 */
export interface Marker {
  readonly read: Loader.Read.Any
  readonly label: string
  /** `undefined`: the loader is disabled, and the marker is inert. */
  readonly args: unknown
  readonly argsKey: string | undefined
  readonly toMsg: (snapshot: unknown, result: AsyncResult.AsyncResult<any, any>) => unknown
}

const markerKey = "~effect/ui/Component/watchMarker"
const watchesKey = "~effect/ui/Component/watches"

/** @internal */
export const markerOf = (subscription: object): Marker | undefined =>
  (subscription as { readonly [markerKey]?: Marker })[markerKey]

/** @internal */
export const isWatchKey = (key: string): boolean => key.startsWith("~loaded/")

/**
 * The snapshot fields of a Model, checked: a snapshot may only be a field of
 * the Model's own struct, and its label is its field's name. Throws
 * otherwise. `Schema.suspend` isn't followed.
 *
 * @internal
 */
export const checkModel = (name: string, schema: Schema.Top): ReadonlyArray<Field> => {
  const out: Array<Field> = []
  const seen = new Set<SchemaAST.AST>()
  const nested = (found: Annotation) =>
    new Error(
      `${name}: the Model holds Loader.Snapshot(${JSON.stringify(found.read)}, ${
        JSON.stringify(found.label)
      }) below its top level. A loader field is a field of the Model's own struct: use a keyed field or a child instance for more.`
    )
  const visit = (ast: SchemaAST.AST, field: string | undefined): void => {
    if (ast._tag === "Declaration") {
      const found = SchemaAST.resolveAt<Annotation>(annotationKey)(ast)
      if (found !== undefined) {
        if (field === undefined) throw nested(found)
        if (found.label !== field) {
          throw new Error(
            `${name}: the Model field "${field}" holds Loader.Snapshot(${JSON.stringify(found.read)}, ${
              JSON.stringify(found.label)
            }). A snapshot's label is its field's name: write Loader.Snapshot(read, "${field}").`
          )
        }
        out.push({ field, label: found.label, read: found.definition })
        return
      }
    }
    if (seen.has(ast)) return
    seen.add(ast)
    switch (ast._tag) {
      case "Declaration":
        for (const param of ast.typeParameters) visit(param, undefined)
        return
      case "Objects": {
        const top = ast === schema.ast
        for (const signature of ast.propertySignatures) {
          visit(signature.type, top && typeof signature.name === "string" ? signature.name : undefined)
        }
        for (const signature of ast.indexSignatures) visit(signature.type, undefined)
        return
      }
      case "Arrays":
        for (const element of ast.elements) visit(element, undefined)
        for (const element of ast.rest) visit(element, undefined)
        return
      case "Union":
        for (const member of ast.types) visit(member, undefined)
        return
      default:
        return
    }
  }
  visit(schema.ast, undefined)
  return out
}

/** Strict open: the stored result at the loader's current args, else `Initial`, waiting when enabled. */
const open = (snapshot: unknown, argsKey: string | undefined): AsyncResult.AsyncResult<any, any> => {
  if (argsKey === undefined) return AsyncResult.initial(false)
  const data = Loader.snapshotData(snapshot)
  if (data?.result === undefined || data.argsKey !== argsKey) return AsyncResult.initial(true)
  return data.result
}

/** Whether the opened value includes an unconfirmed patch. */
const patched = (snapshot: unknown, argsKey: string | undefined): boolean => {
  const data = Loader.snapshotData(snapshot)
  return argsKey !== undefined && data?.argsKey === argsKey && data.patched
}

/** "Keep the previous page": a Success stored for other args, while the loader is enabled. */
const previous = (snapshot: unknown, argsKey: string | undefined): Option.Option<any> => {
  if (argsKey === undefined) return Option.none()
  const data = Loader.snapshotData(snapshot)
  if (data?.result === undefined || data.argsKey === argsKey || data.result._tag !== "Success") return Option.none()
  return Option.some(data.result.value)
}

type LoaderFn = (model: any, props: any, loaded: any) => unknown

/**
 * The views of one `(model, props)`: each loader runs at most once, and the
 * watch, `h.loaded`, `h.previous` and `h.patched` share its args.
 *
 * @internal
 */
export interface Context {
  readonly loaded: Record<string, AsyncResult.AsyncResult<any, any>>
  readonly previous: Record<string, Option.Option<any>>
  readonly patched: Record<string, boolean>
  readonly watch: (handlers: Record<string, (snapshot: any, result: any) => unknown>) => unknown
  /** The args of each loader field, for a Story. */
  readonly argsOf: (field: string) => { readonly args: unknown; readonly argsKey: string | undefined }
}

/** @internal */
export interface Bound {
  readonly fields: ReadonlyArray<Field>
  readonly empty: Readonly<Record<string, unknown>>
  readonly context: (model: any, props: any) => Context
  /** Replaces the `watch` Subscription with its per-field ones, which the runtime registers. */
  readonly expand: (
    subscriptions: ReadonlyArray<Subscription.Subscription<any, any> | false | null | undefined>
  ) => Array<Subscription.Subscription<any, any>>
}

interface State {
  readonly model: any
  readonly props: any
  readonly memo: Map<string, { readonly args: unknown; readonly argsKey: string | undefined }>
  readonly running: Array<string>
  loaded: any
}

/**
 * Checks the Model and binds its snapshot fields to `loaders`. `undefined`
 * for a Model with none. Throws at module load on a nested snapshot, a label
 * that isn't its field's name, or a field with no loader.
 *
 * @internal
 */
export const bind = (
  name: string,
  model: Schema.Top,
  loaders: Record<string, LoaderFn> | undefined
): Bound | undefined => {
  const fields = checkModel(name, model)
  if (fields.length === 0) return undefined
  for (const field of fields) {
    if (typeof loaders?.[field.field] !== "function") {
      throw new Error(
        `${name}: the Model field "${field.field}" is a loader field and has no loader. Add loaders.${field.field}.`
      )
    }
  }
  const empty: Record<string, unknown> = {}
  for (const field of fields) {
    empty[field.field] = Loader.makeSnapshot(Loader.defOf(field.read), field.label, undefined, undefined)
  }
  Object.freeze(empty)
  const stateKey = Symbol()
  const argsOf = (state: State, field: Field) => {
    let current = state.memo.get(field.field)
    if (current !== undefined) return current
    if (state.running.includes(field.field)) {
      throw new Error(
        `${name}: the loaders ${
          [...state.running.slice(state.running.indexOf(field.field)), field.field].join(" -> ")
        } read each other in a cycle.`
      )
    }
    state.running.push(field.field)
    let args: unknown
    try {
      args = loaders![field.field](state.model, state.props, state.loaded)
    } finally {
      state.running.pop()
    }
    current = { args, argsKey: args === undefined ? undefined : Loader.defOf(field.read).argsKey(args) }
    state.memo.set(field.field, current)
    return current
  }
  // The three views share prototypes built once here, so a render defines no property.
  const view = (read: (snapshot: unknown, argsKey: string | undefined) => unknown) => {
    const proto = {}
    for (const field of fields) {
      Object.defineProperty(proto, field.field, {
        enumerable: true,
        get(this: any) {
          const state: State = this[stateKey]
          return read(state.model[field.field], argsOf(state, field).argsKey)
        }
      })
    }
    return proto
  }
  const loadedProto = view(open)
  const previousProto = view(previous)
  const patchedProto = view(patched)
  const viewOf = (proto: object, state: State) => {
    const out = Object.create(proto)
    out[stateKey] = state
    return out
  }
  const byField = new Map(fields.map((field) => [field.field, field]))
  const make = (model: any, props: any): Context => {
    const state: State = { model, props, memo: new Map(), running: [], loaded: undefined }
    const loaded = viewOf(loadedProto, state)
    state.loaded = loaded
    return {
      loaded,
      previous: viewOf(previousProto, state),
      patched: viewOf(patchedProto, state),
      argsOf: (field) => argsOf(state, byField.get(field)!),
      watch: (handlers) => ({
        [Subscription.TypeId]: Subscription.TypeId,
        key: "~loaded",
        stream: Stream.never,
        [watchesKey]: fields.map((field) => {
          const toMsg = handlers[field.field]
          if (typeof toMsg !== "function") {
            throw new Error(`${name}: watch has no handler for the loader field "${field.field}".`)
          }
          const { args, argsKey } = argsOf(state, field)
          const marker: Marker = { read: field.read, label: field.label, args, argsKey, toMsg }
          return {
            [Subscription.TypeId]: Subscription.TypeId,
            // New args are a new key, so the old watcher goes before the new one registers.
            key: argsKey === undefined
              ? Subscription.keyOf(`~loaded/${field.label}`)
              : Subscription.keyOf(`~loaded/${field.label}`, argsKey),
            stream: Stream.never,
            [markerKey]: marker
          }
        })
      })
    }
  }
  // One context per (model, props), shared by the watch and the view of that pair.
  const contexts = new WeakMap<object, { readonly props: unknown; readonly context: Context }>()
  return {
    fields,
    empty,
    context: (model, props) => {
      if (typeof model !== "object" || model === null) return make(model, props)
      const found = contexts.get(model)
      if (found !== undefined && found.props === props) return found.context
      const context = make(model, props)
      contexts.set(model, { props, context })
      return context
    },
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
      if (!watched) throw new Error(`${name}: subscriptions must return the Subscription watch({ ... }) makes.`)
      return out
    }
  }
}
