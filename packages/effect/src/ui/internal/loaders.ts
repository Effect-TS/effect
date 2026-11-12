/**
 * What `Component.make` builds from `loaders`: the loader slots an instance
 * holds beside its Model, their Schema, the opened views of `h` and `$`,
 * and the watches the runtime registers.
 *
 * A slot holds a snapshot: the last settled result of the loader's read, at
 * the args it was taken for. The Model plus the slots is an instance's state.
 *
 * @internal
 */
import * as Duration from "../../Duration.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Loader from "../../reactivity/Loader.ts"
import * as Schema from "../../Schema.ts"
import * as Stream from "../../Stream.ts"
import * as Subscription from "../Subscription.ts"

type LoaderFn = (model: any, props: any, loaded: any) => unknown

/**
 * One entry of `loaders`.
 *
 * @internal
 */
export interface Entry {
  readonly name: string
  readonly read: Loader.Read.Any
  /** A `loadMany` entry. */
  readonly keyed: boolean
  /** A `load` of a list read. */
  readonly list: boolean
  readonly args: LoaderFn
  /** From `debounce`: how many milliseconds a fetch for changed args waits. */
  readonly debounce: number | undefined
  readonly onChange: ((...args: Array<any>) => unknown) | undefined
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
 * What one loader's watch carries for the runtime.
 *
 * @internal
 */
export interface Marker {
  readonly read: Loader.Read.Any
  readonly name: string
  /** `undefined`: the loader is disabled, and the marker is inert. */
  readonly args: unknown
  readonly argsKey: string | undefined
  /** Set for one key of a keyed loader: its values are collected into the loader's slot. */
  readonly keyed: boolean
  readonly debounce: number | undefined
}

/**
 * A keyed loader's ordered keys, accompanying its per-key watch markers.
 *
 * @internal
 */
export interface Group {
  readonly name: string
  readonly read: Loader.Read.Any
  readonly entries: ReadonlyArray<Keyed>
}

/** @internal */
export interface KeyedChange {
  readonly args: unknown
  readonly result: AsyncResult.AsyncResult<any, any>
}

/**
 * An instance's loader slots, by loader name.
 *
 * @internal
 */
export type Slots = Readonly<Record<string, unknown>>

const markerKey = "~effect/ui/Component/watchMarker"
const groupKey = "~effect/ui/Component/watchGroup"

/** @internal */
export const markerOf = (subscription: object): Marker | undefined =>
  (subscription as { readonly [markerKey]?: Marker })[markerKey]

/** @internal */
export const groupOf = (subscription: object): Group | undefined =>
  (subscription as { readonly [groupKey]?: Group })[groupKey]

/** @internal */
export const isWatchKey = (key: string): boolean => key.startsWith("~loaded/")

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

/** One opened list per snapshot, so a view and `onChange` share it. */
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
 * A keyed slot opened at the loader's keys: an entry per key in its order,
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
const uniqueArgs = (component: string, name: string, def: ReadDef, args: unknown): ReadonlyArray<Keyed> => {
  if (!Array.isArray(args)) {
    throw new Error(`${component}: loaders.${name} is a loadMany loader, and its args must return an array.`)
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

const isRead = (u: unknown): u is Loader.Read.Any => Predicate.hasProperty(u, Loader.TypeId)

/**
 * Checks the entries of `loaders`. Throws at module load on an entry that
 * isn't `{ load, args }` or `{ loadMany, args }`.
 *
 * @internal
 */
export const parse = (component: string, loaders: unknown): ReadonlyArray<Entry> => {
  if (loaders === undefined) return []
  if (typeof loaders !== "object" || loaders === null) {
    throw new Error(`${component}: loaders must be a record of { load, args } or { loadMany, args } entries.`)
  }
  return Object.entries(loaders).map(([name, entry]): Entry => {
    const fail = (why: string) => new Error(`${component}: loaders.${name} ${why}`)
    if (typeof entry !== "object" || entry === null) throw fail("must be { load, args } or { loadMany, args }.")
    const { args, debounce, load, loadMany, onChange } = entry as Record<string, unknown>
    if ((load === undefined) === (loadMany === undefined)) throw fail("must have exactly one of load and loadMany.")
    const read = load ?? loadMany
    if (!isRead(read)) throw fail(`has a ${load === undefined ? "loadMany" : "load"} that isn't a read.`)
    if (typeof args !== "function") throw fail("must have an args function.")
    if (onChange !== undefined && typeof onChange !== "function") throw fail("has an onChange that isn't a function.")
    const list = Loader.defOf(read).list !== undefined
    if (loadMany !== undefined && list) throw fail("loads a list read with loadMany. A list read takes load.")
    return {
      name,
      read,
      keyed: loadMany !== undefined,
      list,
      args: args as LoaderFn,
      debounce: debounce === undefined ? undefined : Duration.toMillis(debounce as Duration.Input),
      onChange: onChange as Entry["onChange"]
    }
  })
}

/** A loader's evaluated arguments, deduplicated by key for a keyed loader. */
type Current =
  | { readonly args: unknown; readonly argsKey: string | undefined; readonly entries?: undefined }
  | { readonly args: ReadonlyArray<unknown>; readonly argsKey: undefined; readonly entries: ReadonlyArray<Keyed> }

/**
 * The views of one `(model, props, slots)`: each loader runs at most once,
 * and the watches, `loaded`, `previous` and `patched` share its args.
 *
 * @internal
 */
export interface Context {
  readonly loaded: Record<string, any>
  readonly previous: Record<string, Option.Option<any>>
  readonly patched: Record<string, boolean>
  /** The watch markers and keyed groups of every loader, which the runtime registers. */
  readonly watches: () => ReadonlyArray<Subscription.Subscription<any, any>>
  /** The args of a loader: a keyed loader's are its unique args. */
  readonly argsOf: (name: string) => Current
  /**
   * The message a loader's `onChange` returns for its slot as these views open
   * it, or `undefined` without `onChange`. A keyed loader's also gets `changes`.
   */
  readonly changed: (name: string, changes: ReadonlyArray<KeyedChange>) => { readonly value: unknown } | undefined
}

/** @internal */
export interface Bound {
  readonly entries: ReadonlyArray<Entry>
  readonly byName: ReadonlyMap<string, Entry>
  /** Every slot empty: an instance's slots before a loader writes one. */
  readonly empty: Slots
  /** The Schema of each slot, by loader name, for page state and the log. */
  readonly schemas: { readonly [name: string]: Schema.Top }
  /** The Schema of the slots: a struct of `schemas`. */
  readonly schema: Schema.Codec<Slots, unknown>
  readonly context: (model: unknown, props: unknown, slots: Slots | undefined) => Context
  /** A single or list loader's slot holding `result` at `entry`. */
  readonly slot: (
    entry: Entry,
    at: Keyed,
    result: AsyncResult.Success<any, any> | AsyncResult.Failure<any, any>,
    patched: boolean,
    more: Loader.More<any> | undefined
  ) => unknown
  /** A keyed loader's slot holding `snapshots`, one per args key. */
  readonly slotMany: (entry: Entry, snapshots: Iterable<unknown>) => unknown
}

interface State {
  readonly model: any
  readonly props: any
  readonly slots: Slots
  readonly memo: Map<string, Current>
  /** The opened keyed slots, built at the first read. */
  readonly opened: Map<string, unknown>
  readonly running: Array<string>
  loaded: any
}

/**
 * Binds `loaders`. `undefined` without any.
 *
 * @internal
 */
export const bind = (component: string, loaders: unknown): Bound | undefined => {
  const entries = parse(component, loaders)
  if (entries.length === 0) return undefined
  const byName = new Map(entries.map((entry) => [entry.name, entry]))
  const empty: Record<string, unknown> = {}
  const fields: Record<string, Schema.Top> = {}
  for (const entry of entries) {
    const def = Loader.defOf(entry.read)
    empty[entry.name] = entry.keyed
      ? Loader.makeSnapshotMap(def, entry.name, [])
      : Loader.makeSnapshot(def, entry.name, undefined, undefined)
    fields[entry.name] = entry.keyed
      ? Loader.snapshotMapSchema(entry.read, entry.name)
      : Loader.snapshotSchema(entry.read, entry.name)
  }
  Object.freeze(empty)
  const schema = Schema.Struct(fields) as unknown as Schema.Codec<Slots, unknown>
  const stateKey = Symbol()
  const argsOf = (state: State, entry: Entry): Current => {
    let current = state.memo.get(entry.name)
    if (current !== undefined) return current
    if (state.running.includes(entry.name)) {
      throw new Error(
        `${component}: the loaders ${
          [...state.running.slice(state.running.indexOf(entry.name)), entry.name].join(" -> ")
        } read each other in a cycle.`
      )
    }
    state.running.push(entry.name)
    let args: unknown
    try {
      args = entry.args(state.model, state.props, state.loaded)
    } finally {
      state.running.pop()
    }
    const def = Loader.defOf(entry.read)
    if (entry.keyed) {
      const keyed = uniqueArgs(component, entry.name, def, args)
      current = { args: keyed.map((one) => one.args), argsKey: undefined, entries: keyed }
    } else current = { args, argsKey: args === undefined ? undefined : def.argsKey(args) }
    state.memo.set(entry.name, current)
    return current
  }
  // The three views share prototypes built once here, so a render defines no property.
  const view = (
    read: (snapshot: unknown, argsKey: string | undefined, entry: Entry) => unknown,
    keyed: ((state: State, entry: Entry) => unknown) | undefined
  ) => {
    const proto = {}
    for (const entry of entries) {
      if (entry.keyed && keyed === undefined) continue
      Object.defineProperty(proto, entry.name, {
        enumerable: true,
        get(this: any) {
          const state: State = this[stateKey]
          return entry.keyed
            ? keyed!(state, entry)
            : read(state.slots[entry.name], argsOf(state, entry).argsKey, entry)
        }
      })
    }
    return proto
  }
  const openSlot = (state: State, entry: Entry) => {
    let opened = state.opened.get(entry.name)
    if (opened === undefined) {
      opened = openKeyed(Loader.defOf(entry.read), state.slots[entry.name], argsOf(state, entry).entries!)
      state.opened.set(entry.name, opened)
    }
    return opened
  }
  const loadedProto = view((snapshot, argsKey, entry) => {
    const result = open(snapshot, argsKey)
    return entry.list ? openList(snapshot, result) : result
  }, openSlot)
  const previousProto = view(previous, undefined)
  const patchedProto = view(patched, undefined)
  const viewOf = (proto: object, state: State) => {
    const out = Object.create(proto)
    out[stateKey] = state
    return out
  }
  const watchesOf = (state: State) =>
    entries.flatMap((entry) => {
      const current = argsOf(state, entry)
      const watchOf = (args: unknown, argsKey: string | undefined, keyed: boolean) => {
        const marker: Marker = { read: entry.read, name: entry.name, args, argsKey, keyed, debounce: entry.debounce }
        return {
          [Subscription.TypeId]: Subscription.TypeId,
          // New args are a new key, so the old watcher goes before the new one registers.
          key: Subscription.keyOf(`~loaded/${entry.name}`, argsKey),
          stream: Stream.never,
          [markerKey]: marker
        } as unknown as Subscription.Subscription<any, any>
      }
      if (current.entries === undefined) return [watchOf(current.args, current.argsKey, false)]
      // A keyed loader: one watcher per unique key, and the group that collects their values.
      const group: Group = { name: entry.name, read: entry.read, entries: current.entries }
      return [
        {
          [Subscription.TypeId]: Subscription.TypeId,
          key: Subscription.keyOf(`~loaded/${entry.name}`),
          stream: Stream.never,
          [groupKey]: group
        } as unknown as Subscription.Subscription<any, any>,
        ...current.entries.map((one) => watchOf(one.args, one.argsKey, true))
      ]
    })
  const make = (model: any, props: any, slots: Slots): Context => {
    const state: State = { model, props, slots, memo: new Map(), opened: new Map(), running: [], loaded: undefined }
    const loaded = viewOf(loadedProto, state)
    state.loaded = loaded
    return {
      loaded,
      previous: viewOf(previousProto, state),
      patched: viewOf(patchedProto, state),
      argsOf: (name) => argsOf(state, byName.get(name)!),
      watches: () => watchesOf(state),
      changed: (name, changes) => {
        const entry = byName.get(name)!
        if (entry.onChange === undefined) return undefined
        return { value: entry.keyed ? entry.onChange(loaded[name], changes) : entry.onChange(loaded[name]) }
      }
    }
  }
  // One context per (model, props, slots), shared by the watches and the view of that triple.
  const contexts = new WeakMap<
    object,
    { readonly model: unknown; readonly props: unknown; readonly context: Context }
  >()
  return {
    entries,
    byName,
    empty,
    schemas: fields,
    schema,
    context: (model, props, slots = empty) => {
      const found = contexts.get(slots)
      if (found !== undefined && found.model === model && found.props === props) return found.context
      const context = make(model, props, slots)
      contexts.set(slots, { model, props, context })
      return context
    },
    slot: (entry, at, result, patched, more) =>
      Loader.makeSnapshot(Loader.defOf(entry.read), entry.name, at, result, patched, more),
    slotMany: (entry, snapshots) => Loader.makeSnapshotMap(Loader.defOf(entry.read), entry.name, snapshots)
  }
}
