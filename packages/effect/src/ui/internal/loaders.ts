/**
 * What `Component.make` builds from `loaders`: the empty snapshots, the
 * opened views of `h` and the `$.watch` of `subscriptions`.
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

/** The annotation `Loader.Snapshot`, `Loader.SnapshotList` and `Loader.SnapshotMap` put on their Schemas. */
const annotationKey = "~effect/reactivity/Loader/Snapshot/field"

interface Annotation {
  readonly read: string
  readonly label: string
  readonly definition: Loader.Read.Any
  readonly keyed: boolean
  readonly list?: boolean | undefined
}

const schemaName = (found: Annotation) =>
  found.keyed ? "Loader.SnapshotMap" : found.list === true ? "Loader.SnapshotList" : "Loader.Snapshot"

/**
 * One loader field of a Model.
 *
 * @internal
 */
export interface Field {
  readonly field: string
  readonly label: string
  readonly read: Loader.Read.Any
  /** A `Loader.SnapshotMap` field. */
  readonly keyed: boolean
  /** A `Loader.SnapshotList` field. */
  readonly list: boolean
}

/**
 * One set of loader arguments and its cache key.
 *
 * @internal
 */
export interface Keyed {
  readonly args: unknown
  readonly argsKey: string
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
  /** Set for one key of a keyed field: its values are collected into the field's message. */
  readonly keyed: boolean
}

/**
 * A keyed field's ordered keys and handler, accompanying its per-key watch markers.
 *
 * @internal
 */
export interface Group {
  readonly field: string
  readonly read: Loader.Read.Any
  readonly label: string
  readonly entries: ReadonlyArray<Keyed>
  readonly toMsg: (snapshots: unknown, loaded: unknown, changes: ReadonlyArray<KeyedChange>) => unknown
}

/** @internal */
export interface KeyedChange {
  readonly args: unknown
  readonly result: AsyncResult.AsyncResult<any, any>
}

const markerKey = "~effect/ui/Component/watchMarker"
const groupKey = "~effect/ui/Component/watchGroup"
const watchesKey = "~effect/ui/Component/watches"

/** @internal */
export const markerOf = (subscription: object): Marker | undefined =>
  (subscription as { readonly [markerKey]?: Marker })[markerKey]

/** @internal */
export const groupOf = (subscription: object): Group | undefined =>
  (subscription as { readonly [groupKey]?: Group })[groupKey]

/** @internal */
export const isWatchKey = (key: string): boolean => key.startsWith("~loaded/")

/**
 * Returns the Model's snapshot fields. Throws if a snapshot is nested or its
 * label differs from its field name. Does not follow `Schema.suspend`.
 *
 * @internal
 */
export const checkModel = (name: string, schema: Schema.Top): ReadonlyArray<Field> => {
  const out: Array<Field> = []
  const seen = new Set<SchemaAST.AST>()
  const nested = (found: Annotation) =>
    new Error(
      `${name}: the Model holds ${schemaName(found)}(${JSON.stringify(found.read)}, ${
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
            `${name}: the Model field "${field}" holds ${schemaName(found)}(${JSON.stringify(found.read)}, ${
              JSON.stringify(found.label)
            }). A snapshot's label is its field's name: write ${schemaName(found)}(read, "${field}").`
          )
        }
        out.push({ field, label: found.label, read: found.definition, keyed: found.keyed, list: found.list === true })
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
  return Option.some(data.def.list === undefined ? data.result.value : listOf(data.def, data.result.value))
}

/** A list's pages, with their items: the dedupe runs once per page array. */
const lists = new WeakMap<object, { readonly items: ReadonlyArray<unknown>; readonly pages: ReadonlyArray<unknown> }>()
const listOf = (def: ReadDef, pages: ReadonlyArray<unknown>) => {
  let out = lists.get(pages)
  if (out === undefined) {
    out = { items: Loader.listItems(def, pages), pages }
    lists.set(pages, out)
  }
  return out
}

/** One opened list per snapshot, so a view and a watch handler share it. */
const openedLists = new WeakMap<object, AsyncResult.AsyncResult<any, any>>()

/**
 * A list's result opened as `h.loaded` shows it: `{ items, pages, more }`.
 *
 * @internal
 */
export const openList = (
  snapshot: unknown,
  result: AsyncResult.AsyncResult<any, any>
): AsyncResult.AsyncResult<any, any> => {
  if (result._tag === "Initial") return result
  const data = Loader.snapshotData(snapshot)!
  const cached = data.result === result ? openedLists.get(snapshot as object) : undefined
  if (cached !== undefined) return cached
  const more = data.more ?? { _tag: "End" }
  const opened = AsyncResult.map(result, (pages: ReadonlyArray<unknown>) => ({ ...listOf(data.def, pages), more }))
  if (data.result === result) openedLists.set(snapshot as object, opened)
  return opened
}

/**
 * A keyed field opened at the loader's keys: an entry per key in its order,
 * each the stored result or `Initial`, waiting, and `get` by args.
 *
 * @internal
 */
export const openKeyed = (
  def: ReadDef,
  snapshots: unknown,
  entries: ReadonlyArray<Keyed>
): ReadonlyArray<{ readonly args: unknown; readonly result: AsyncResult.AsyncResult<any, any> }> => {
  const stored = Loader.snapshotMapData(snapshots)?.entries
  const opened = entries.map((entry) => {
    const data = Loader.snapshotData(stored?.get(entry.argsKey))
    return {
      args: entry.args,
      result: data?.result ?? AsyncResult.initial(true),
      patched: data?.patched ?? false
    }
  })
  const byKey = new Map(opened.map((entry, i) => [entries[i].argsKey, entry]))
  return Object.assign(opened, {
    get: (args: unknown) => Option.fromUndefinedOr(byKey.get(def.argsKey(args)))
  })
}

/**
 * Returns loader arguments deduplicated by key, in first-occurrence order.
 */
const uniqueArgs = (name: string, field: string, def: ReadDef, args: unknown): ReadonlyArray<Keyed> => {
  if (!Array.isArray(args)) {
    throw new Error(`${name}: loaders.${field} is a keyed loader and must return an array of args.`)
  }
  const seen = new Set<string>()
  const out: Array<Keyed> = []
  for (const one of args) {
    const argsKey = def.argsKey(one)
    if (seen.has(argsKey)) continue
    seen.add(argsKey)
    out.push({ args: one, argsKey })
  }
  return out
}

type ReadDef = ReturnType<typeof Loader.defOf>

type LoaderFn = (model: any, props: any, loaded: any) => unknown

/** A field's evaluated loader arguments, deduplicated by key for keyed fields. */
type Current =
  | { readonly args: unknown; readonly argsKey: string | undefined; readonly entries?: undefined }
  | { readonly args: ReadonlyArray<unknown>; readonly argsKey: undefined; readonly entries: ReadonlyArray<Keyed> }

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
  readonly watch: (handlers: Record<string, (...args: Array<any>) => unknown>) => unknown
  /** The args of each loader field, for a Story: a keyed field's are its unique args. */
  readonly argsOf: (field: string) => Current
}

/** @internal */
export interface Bound {
  readonly fields: ReadonlyArray<Field>
  readonly empty: Readonly<Record<string, unknown>>
  readonly context: (model: any, props: any) => Context
  /** Replaces the `$.watch` Subscription with its per-field ones, which the runtime registers. */
  readonly expand: (
    subscriptions: ReadonlyArray<Subscription.Subscription<any, any> | false | null | undefined>
  ) => Array<Subscription.Subscription<any, any>>
}

interface State {
  readonly model: any
  readonly props: any
  readonly memo: Map<string, Current>
  /** The opened keyed fields, built at the first read. */
  readonly opened: Map<string, unknown>
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
    const def = Loader.defOf(field.read)
    empty[field.field] = field.keyed
      ? Loader.makeSnapshotMap(def, field.label, [])
      : Loader.makeSnapshot(def, field.label, undefined, undefined)
  }
  Object.freeze(empty)
  const stateKey = Symbol()
  const argsOf = (state: State, field: Field): Current => {
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
    const def = Loader.defOf(field.read)
    if (field.keyed) {
      const entries = uniqueArgs(name, field.field, def, args)
      current = { args: entries.map((entry) => entry.args), argsKey: undefined, entries }
    } else current = { args, argsKey: args === undefined ? undefined : def.argsKey(args) }
    state.memo.set(field.field, current)
    return current
  }
  // The three views share prototypes built once here, so a render defines no property.
  const view = (
    read: (snapshot: unknown, argsKey: string | undefined, field: Field) => unknown,
    keyed: ((state: State, field: Field) => unknown) | undefined
  ) => {
    const proto = {}
    for (const field of fields) {
      if (field.keyed && keyed === undefined) continue
      Object.defineProperty(proto, field.field, {
        enumerable: true,
        get(this: any) {
          const state: State = this[stateKey]
          return field.keyed
            ? keyed!(state, field)
            : read(state.model[field.field], argsOf(state, field).argsKey, field)
        }
      })
    }
    return proto
  }
  const openField = (state: State, field: Field) => {
    let opened = state.opened.get(field.field)
    if (opened === undefined) {
      opened = openKeyed(Loader.defOf(field.read), state.model[field.field], argsOf(state, field).entries!)
      state.opened.set(field.field, opened)
    }
    return opened
  }
  const loadedProto = view((snapshot, argsKey, field) => {
    const result = open(snapshot, argsKey)
    return field.list ? openList(snapshot, result) : result
  }, openField)
  const previousProto = view(previous, undefined)
  const patchedProto = view(patched, undefined)
  const viewOf = (proto: object, state: State) => {
    const out = Object.create(proto)
    out[stateKey] = state
    return out
  }
  const byField = new Map(fields.map((field) => [field.field, field]))
  const make = (model: any, props: any): Context => {
    const state: State = { model, props, memo: new Map(), opened: new Map(), running: [], loaded: undefined }
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
        [watchesKey]: fields.flatMap((field) => {
          const toMsg = handlers[field.field]
          if (typeof toMsg !== "function") {
            throw new Error(`${name}: $.watch has no handler for the loader field "${field.field}".`)
          }
          const current = argsOf(state, field)
          // A list's handler gets the list opened, as `h.loaded` shows it.
          const fieldMsg = field.list
            ? (snapshot: unknown, result: AsyncResult.AsyncResult<any, any>) =>
              toMsg(snapshot, openList(snapshot, result))
            : toMsg
          const watchOf = (args: unknown, argsKey: string | undefined, keyed: boolean) => {
            const marker: Marker = { read: field.read, label: field.label, args, argsKey, toMsg: fieldMsg, keyed }
            return {
              [Subscription.TypeId]: Subscription.TypeId,
              // New args are a new key, so the old watcher goes before the new one registers.
              key: Subscription.keyOf(`~loaded/${field.label}`, argsKey),
              stream: Stream.never,
              [markerKey]: marker
            }
          }
          if (current.entries === undefined) return [watchOf(current.args, current.argsKey, false)]
          // A keyed field: one watcher per unique key, and the group that collects their values.
          const group: Group = {
            field: field.field,
            read: field.read,
            label: field.label,
            entries: current.entries,
            toMsg: toMsg as Group["toMsg"]
          }
          return [
            {
              [Subscription.TypeId]: Subscription.TypeId,
              key: Subscription.keyOf(`~loaded/${field.label}`),
              stream: Stream.never,
              [groupKey]: group
            },
            ...current.entries.map((entry) => watchOf(entry.args, entry.argsKey, true))
          ]
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
      if (!watched) throw new Error(`${name}: subscriptions must return the Subscription $.watch({ ... }) makes.`)
      return out
    }
  }
}
