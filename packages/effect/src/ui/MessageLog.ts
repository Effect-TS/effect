/**
 * The message log: a development and test hook the runtime calls once per
 * `update` and at every lifecycle step of every instance.
 *
 * It's off by default. The `MessageLog` service defaults to a no-op whose
 * `enabled` flag is `false`, and the runtime checks the flag before it builds
 * an entry, so an app that doesn't provide a log pays nothing for it. Provide
 * `memory` for a ring buffer, `socket` to stream entries to a devtools
 * process, or `fanout` for several sinks. Production observability goes
 * through Effect's tracer, logger and metrics instead.
 *
 * Entries hold decoded values and references, never copies. They're encoded
 * through the component's Schemas only when they're sent somewhere, as the
 * versioned `Wire`.
 *
 * **Example** (Keeping the last 1,000 entries)
 *
 * ```ts
 * import { MessageLog } from "effect/ui"
 *
 * const DevLog = MessageLog.memory({ size: 1_000 })
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import { memoize } from "../Function.ts"
import { redactAST } from "../internal/schemaRedact.ts"
import * as Layer from "../Layer.ts"
import * as Queue from "../Queue.ts"
import type * as Loader from "../reactivity/Loader.ts"
import { canonical } from "../reactivity/Loader.ts"
import * as Redacted from "../Redacted.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as Socket from "../socket/Socket.ts"
import type * as Command from "./Command.ts"
import type * as Component from "./Component.ts"
import type * as loaders from "./internal/loaders.ts"

/**
 * The service the runtime records entries to.
 *
 * **Details**
 *
 * `record` is called synchronously from the runtime and must not throw. The
 * runtime checks `enabled` before it builds an entry, and assigns `seq`
 * itself, so every sink numbers entries the same way. It's runtime input
 * only: it's never part of a component's requirements, and app code can't
 * write entries.
 *
 * @stability experimental
 * @category services
 * @since 4.1.5
 */
export interface MessageLog {
  readonly enabled: boolean
  readonly record: (entry: Entry) => void
}

/**
 * The no-op log: `enabled` is `false` and nothing is recorded.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const noop: MessageLog = { enabled: false, record: () => {} }

/**
 * The `MessageLog` service. It defaults to `noop`, so it never has to be
 * provided.
 *
 * @stability experimental
 * @category services
 * @since 4.1.5
 */
export const MessageLog: Context.Reference<MessageLog> = Context.Reference<MessageLog>("effect/ui/MessageLog", {
  defaultValue: () => noop
})

/**
 * Where a failure happened: the code that threw or failed.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type FailureSource =
  | "init"
  | "update"
  | "view"
  | "content"
  | "domEvent"
  | "mount"
  | "command"
  | "subscription"
  | "layer"
  | "fallback"
  | "onEmit"
  | "onFailure"
  | "head"
  | "send"

/**
 * Which Command run an entry is about: the `seq` of the entry that issued it
 * (an `Update` or a `Mounted`) and its index in that entry's `commands`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Issued {
  readonly seq: number
  readonly index: number
}

/**
 * What sent the message an `update` handled.
 *
 * **Details**
 *
 * `DomEvent` is a view handler, such as a click. `Command` is a Command's result, pointing at
 * the entry that issued it and at its span. `Subscription` is a keyed
 * Subscription. `Emit` is a child's emit, pointing at the child's entry.
 * `Send` is a parent's `$.send`, pointing at the parent's entry.
 * `Mount` is an `onMount` result, and `Dispatch` is a message sent from
 * outside the tree, such as `TestHost`'s `root.send`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Source =
  | { readonly _tag: "DomEvent"; readonly name: string }
  | {
    readonly _tag: "Command"
    readonly name: string
    readonly issued: Issued
    readonly spanId: string | undefined
    readonly traceId: string | undefined
  }
  | { readonly _tag: "Subscription"; readonly key: string }
  | { readonly _tag: "Emit"; readonly path: string; readonly seq: number }
  | { readonly _tag: "Send"; readonly path: string; readonly seq: number }
  | { readonly _tag: "Mount"; readonly name: string }
  | { readonly _tag: "Dispatch" }

/**
 * Fields every entry has: its number, its time from `Clock`, the session it
 * belongs to and the instance path it's about.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Base {
  readonly seq: number
  readonly at: number
  readonly session: string
  readonly path: string
}

/**
 * One `update` call: the message, what sent it, the props and loader slots
 * it saw, the Model after it, and the Commands, events, load mores, resets
 * and sends it returned.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Update extends Base {
  readonly _tag: "Update"
  /** The component, whose Schemas encode the values for the Wire. */
  readonly component: Component.Any
  readonly source: Source
  readonly message: unknown
  readonly props: unknown
  readonly model: unknown
  readonly commands: ReadonlyArray<Command.Command<any, any>>
  readonly events: ReadonlyArray<unknown>
  /** The `$.loadMore` and `$.reset` calls, in order. The wire omits it when empty. */
  readonly lists?: ReadonlyArray<Component.ListIssue> | undefined
  /** The `$.send` calls, in order. The wire omits it when empty. */
  readonly sends?: ReadonlyArray<Component.Send> | undefined
  /**
   * The loader slots `update` read as `$.loaded`, by loader name: what
   * `Story.fromLog` gives it back, as it gives back `props`. Only a
   * component with loaders has them.
   */
  readonly loaded?: Component.Slots | undefined
}

/**
 * An instance mounted: its props, the Model from `init` (or adopted from the
 * server), and the Commands `init` returned.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Mounted extends Base {
  readonly _tag: "Mounted"
  readonly component: Component.Any
  readonly props: unknown
  readonly model: unknown
  readonly commands: ReadonlyArray<Command.Command<any, any>>
  readonly events: ReadonlyArray<unknown>
  readonly adopted: boolean
}

/**
 * A mounted instance got new props from its parent, without a re-key. Its
 * loaders' args can read them, so `Story.fromLog` applies it to reach the
 * state the instance ended with.
 *
 * **Details**
 *
 * It's logged before the slot writes the new props cause. Props equal to the
 * current ones log nothing.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface PropsChanged extends Base {
  readonly _tag: "PropsChanged"
  /** The component, whose props Schema encodes them for the Wire. */
  readonly component: Component.Any
  readonly props: unknown
}

/**
 * A loader's slot changed: the runtime wrote what the loader's read last
 * returned at its args. `slot` is opaque. `Story.fromLog` applies it to
 * reach the slots the instance ended with.
 *
 * **Details**
 *
 * An instance mounted with restored or hydrated slots logs one entry per
 * non-empty slot right after `Mounted`. A loader with `onChange` logs this
 * entry before the `Update` of the message it returns.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LoaderChanged extends Base {
  readonly _tag: "LoaderChanged"
  /** The component, whose loader Schemas encode the slot for the Wire. */
  readonly component: Component.Any
  /** The loader's name in `loaders`. */
  readonly name: string
  readonly slot: unknown
}

/**
 * A lifecycle step with nothing to add but the path.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Lifecycle extends Base {
  readonly _tag: "Unmounted" | "LayerPending" | "LayerReady"
}

/**
 * A provided Layer failed to build.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LayerFailed extends Base {
  readonly _tag: "LayerFailed"
  readonly cause: Cause.Cause<unknown>
}

/**
 * A Subscription's key started or stopped.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface SubscriptionChanged extends Base {
  readonly _tag: "SubscriptionStarted" | "SubscriptionStopped"
  readonly key: string
}

/**
 * A Command run ended with a result, or was interrupted (by unmount, `switch`,
 * the interrupt Command or a handled Layer failure) and dispatched nothing.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface CommandSettled extends Base {
  readonly _tag: "CommandEnded" | "CommandInterrupted"
  readonly name: string
  readonly issued: Issued
  /**
   * Whether the run was detached: an Effect-shaped `Command.Service` run
   * outside `switch`, owned by its Layer build. When its instance was gone
   * by then, its message was dropped, and this entry is all that reports it.
   */
  readonly detached: boolean
  /**
   * For a run issued with `Command.afterRefetch` that succeeded, how its wait
   * ended: `"settled"` when every awaited entry refetched, `"nothing"` when
   * the awaited set was empty, `"budget"` when the budget ran out,
   * `"switch"` or `"interrupt"` when the run was cut, which delivered its
   * message at once, and `"closed"` when the instance closed and the message
   * was dropped. Absent for any other run.
   */
  readonly waitEnded?: WaitEnded | undefined
  /** With `waitEnded`: the awaited entries still refetching when the wait was cut. */
  readonly outstanding?: ReadonlyArray<AwaitedEntry> | undefined
}

/**
 * How a `Command.afterRefetch` wait ended.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type WaitEnded = "settled" | "nothing" | "budget" | "switch" | "interrupt" | "closed"

/**
 * An entry a `Command.afterRefetch` run waits for: the read's name and the
 * entry's log key.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface AwaitedEntry {
  readonly read: string
  readonly logKey: string
}

/**
 * A run issued with `Command.afterRefetch` succeeded and waits for the
 * refetches its invalidation started, written at its fiber's exit after
 * the batch's fetch entries. `entries` is the awaited set, which isn't empty:
 * an empty one logs no entry, and `CommandEnded` has `waitEnded: "nothing"`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface CommandAwaiting extends Base {
  readonly _tag: "CommandAwaiting"
  readonly name: string
  readonly issued: Issued
  readonly entries: ReadonlyArray<AwaitedEntry>
}

/**
 * A Command that never ran: dropped by its `mode`, or by the server, where
 * no Command runs. On the server only a Command from `update` is logged;
 * `init`'s are dropped silently, since the client runs them when it adopts.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface CommandDropped extends Base {
  readonly _tag: "CommandDropped"
  readonly name: string
  readonly issued: Issued
  readonly reason: "mode" | "server"
}

/**
 * A `$.send` that reached no child: `path` is the sender's, `ref` the key
 * of the slot it named, and `issued` the sender's `Update` entry and the
 * send's index in its `sends`.
 *
 * **Details**
 *
 * The reason is `unrendered` when no slot of the sender's last render has
 * the ref, `failed` when the child there failed, `fallback` when the slot
 * shows a feature's `fallback` because its Layer is building or failed, and
 * `waiting` when the slot waits for its Layer before it adopts the server's
 * nodes. The message isn't kept for a later instance at that slot.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface SendDropped extends Base {
  readonly _tag: "SendDropped"
  readonly ref: string
  readonly issued: Issued
  readonly reason: "unrendered" | "failed" | "fallback" | "waiting"
}

/**
 * An instance failed (`Failed`), or the root did (`Crashed`), with the real
 * Cause and where it happened.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Failed extends Base {
  readonly _tag: "Failed" | "Crashed"
  readonly source: FailureSource
  readonly name: string | undefined
  readonly cause: Cause.Cause<unknown>
}

/**
 * A `mount` or a server render started. `path` is the root's path.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface SessionStarted extends Base {
  readonly _tag: "SessionStarted"
  readonly app: string
}

/**
 * The loader cache started a fetch. `path` is the root's path.
 *
 * **Details**
 *
 * `logKey` is the entry's args key with every `Schema.Redacted` argument
 * redacted, so two entries that differ only in a secret share it.
 * `restart` marks a fetch that replaced an interrupted one, under the same
 * trigger. `inWindow` marks a fetch of a hydrated entry while the
 * fetch-free window is open. `stored: false` marks a fetcher call whose
 * result goes to `get` callers only. A caller that joins a fetch in flight
 * logs nothing.
 *
 * A list read logs each page it requests as its own entry: `page` is the
 * page's index, from 0, and `cursor` the cursor encoded by the list's
 * `cursor` Schema, absent for the first page. A read that isn't a list has
 * neither.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface FetchStarted extends Base {
  readonly _tag: "FetchStarted"
  readonly read: string
  readonly logKey: string
  readonly trigger: Loader.Trigger
  readonly restart: boolean
  readonly inWindow: boolean
  readonly stored: boolean
  readonly page?: number
  readonly cursor?: Schema.Json
}

/**
 * Any log entry.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Entry =
  | SessionStarted
  | Update
  | Mounted
  | PropsChanged
  | LoaderChanged
  | Lifecycle
  | LayerFailed
  | SubscriptionChanged
  | CommandSettled
  | CommandAwaiting
  | CommandDropped
  | SendDropped
  | Failed
  | FetchStarted

/**
 * A ring buffer log whose entries can be read back.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Memory extends MessageLog {
  /** The surviving entries, oldest first. */
  readonly entries: () => ReadonlyArray<Entry>
}

/**
 * Makes a ring buffer log holding the last `size` entries (1,000 by default).
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const makeMemory = (options?: { readonly size?: number | undefined }): Memory => {
  const size = Math.max(1, options?.size ?? 1_000)
  const buffer: Array<Entry> = []
  let start = 0
  return {
    enabled: true,
    record(entry) {
      if (buffer.length < size) {
        buffer.push(entry)
      } else {
        buffer[start] = entry
        start = (start + 1) % size
      }
    },
    entries: () => buffer.length < size ? buffer.slice() : [...buffer.slice(start), ...buffer.slice(0, start)]
  }
}

/**
 * One ring buffer shared by every instance, 1,000 entries by default.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const memory = (options?: { readonly size?: number | undefined }): Layer.Layer<never> =>
  Layer.succeed(MessageLog, makeMemory(options))

/**
 * Sends every entry to several logs. Enabled when any of them is.
 *
 * **Details**
 *
 * Two Layers of one service can't compose, so this is how a memory buffer and
 * a socket run together.
 *
 * @stability experimental
 * @category combinators
 * @since 4.1.5
 */
export const fanoutAll = (logs: ReadonlyArray<MessageLog>): MessageLog => {
  const enabled = logs.filter((log) => log.enabled)
  return enabled.length === 0 ? noop : {
    enabled: true,
    record: (entry) => {
      for (const log of enabled) log.record(entry)
    }
  }
}

/**
 * A Layer that sends entries to every log the given Layers provide.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const fanout = <const Layers extends ReadonlyArray<Layer.Layer<never, any, any>>>(
  layers: Layers
): Layer.Layer<never, Layer.Error<Layers[number]>, Layer.Services<Layers[number]>> =>
  Layer.effect(
    MessageLog,
    Effect.forEach(layers, (layer) => Effect.map(Layer.build(layer), Context.get(MessageLog))).pipe(
      Effect.map(fanoutAll)
    )
  ) as any

// ---------------------------------------------------------------------------
// Wire
// ---------------------------------------------------------------------------

/**
 * The Wire format's version, sent in every `Hello` frame.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export const wireVersion = 1

/**
 * Where a log comes from, as `Hello` reports it.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export type WireHost = "browser" | "server" | "test"

const Seq = {
  seq: Schema.Number,
  at: Schema.Number,
  session: Schema.String,
  path: Schema.String
}
const IssuedWire = Schema.Struct({ seq: Schema.Number, index: Schema.Number })
const CommandWire = Schema.Struct({
  _tag: Schema.Literals(["Effect", "Stream", "Interrupt"]),
  name: Schema.String,
  group: Schema.NullOr(Schema.String),
  args: Schema.Json
})
const AwaitedEntryWire = Schema.Struct({ read: Schema.String, logKey: Schema.String })
const CauseWire = Schema.Struct({ pretty: Schema.String, reasons: Schema.Array(Schema.Json) })
const SourceWire = Schema.Union([
  Schema.TaggedStruct("DomEvent", { name: Schema.String }),
  Schema.TaggedStruct("Command", {
    name: Schema.String,
    issued: IssuedWire,
    spanId: Schema.NullOr(Schema.String),
    traceId: Schema.NullOr(Schema.String)
  }),
  Schema.TaggedStruct("Subscription", { key: Schema.String }),
  Schema.TaggedStruct("Emit", { path: Schema.String, seq: Schema.Number }),
  Schema.TaggedStruct("Send", { path: Schema.String, seq: Schema.Number }),
  Schema.TaggedStruct("Mount", { name: Schema.String }),
  Schema.TaggedStruct("Dispatch", {})
])

/**
 * The versioned, one-way Schema of what a log sends: a `Hello` once per
 * connection, then entries with their values already encoded.
 *
 * **Details**
 *
 * Models, messages, props and events are encoded through the component's
 * Schemas, and a send's message through its ref's `receives`. Command args are encoded through the Command's `args` Schema,
 * field by field, and a field that doesn't encode falls back to a structural
 * encoding, best effort: a value with no JSON form becomes
 * `{ "~unserialisable": "<kind>" }`, a `Redacted` becomes
 * `{ "~redacted": true }`, and a Model or message over `maxEntryBytes` becomes
 * `{ "~truncated": bytes }`. A Cause is sent as `Cause.pretty` plus its
 * reasons, best effort.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export const Wire = Schema.Union([
  Schema.TaggedStruct("Hello", { version: Schema.Number, host: Schema.Literals(["browser", "server", "test"]) }),
  Schema.TaggedStruct("SessionStarted", { ...Seq, app: Schema.String }),
  Schema.TaggedStruct("Update", {
    ...Seq,
    component: Schema.String,
    source: SourceWire,
    message: Schema.Json,
    props: Schema.Json,
    model: Schema.Json,
    commands: Schema.Array(CommandWire),
    events: Schema.Array(Schema.Json),
    lists: Schema.optionalKey(
      Schema.Array(Schema.Struct({ name: Schema.String, op: Schema.Literals(["loadMore", "reset"]) }))
    ),
    sends: Schema.optionalKey(Schema.Array(Schema.Struct({ ref: Schema.String, message: Schema.Json }))),
    loaded: Schema.optionalKey(Schema.Json)
  }),
  Schema.TaggedStruct("Mounted", {
    ...Seq,
    component: Schema.String,
    props: Schema.Json,
    model: Schema.Json,
    commands: Schema.Array(CommandWire),
    events: Schema.Array(Schema.Json),
    adopted: Schema.Boolean
  }),
  Schema.TaggedStruct("PropsChanged", { ...Seq, component: Schema.String, props: Schema.Json }),
  Schema.TaggedStruct("LoaderChanged", { ...Seq, component: Schema.String, name: Schema.String, slot: Schema.Json }),
  Schema.Struct({ _tag: Schema.Literals(["Unmounted", "LayerPending", "LayerReady"]), ...Seq }),
  Schema.TaggedStruct("LayerFailed", { ...Seq, cause: CauseWire }),
  Schema.Struct({ _tag: Schema.Literals(["SubscriptionStarted", "SubscriptionStopped"]), ...Seq, key: Schema.String }),
  Schema.Struct({
    _tag: Schema.Literals(["CommandEnded", "CommandInterrupted"]),
    ...Seq,
    name: Schema.String,
    issued: IssuedWire,
    detached: Schema.Boolean,
    waitEnded: Schema.optionalKey(Schema.Literals(["settled", "nothing", "budget", "switch", "interrupt", "closed"])),
    outstanding: Schema.optionalKey(Schema.Array(AwaitedEntryWire))
  }),
  Schema.TaggedStruct("CommandAwaiting", {
    ...Seq,
    name: Schema.String,
    issued: IssuedWire,
    entries: Schema.Array(AwaitedEntryWire)
  }),
  Schema.TaggedStruct("CommandDropped", {
    ...Seq,
    name: Schema.String,
    issued: IssuedWire,
    reason: Schema.Literals(["mode", "server"])
  }),
  Schema.TaggedStruct("SendDropped", {
    ...Seq,
    ref: Schema.String,
    issued: IssuedWire,
    reason: Schema.Literals(["unrendered", "failed", "fallback", "waiting"])
  }),
  Schema.Struct({
    _tag: Schema.Literals(["Failed", "Crashed"]),
    ...Seq,
    source: Schema.String,
    name: Schema.NullOr(Schema.String),
    cause: CauseWire
  }),
  Schema.TaggedStruct("FetchStarted", {
    ...Seq,
    read: Schema.String,
    logKey: Schema.String,
    trigger: Schema.Literals([
      "watch",
      "get",
      "prefetch",
      "visibility",
      "connectivity",
      "interval",
      "invalidation",
      "loadMore",
      "reset"
    ]),
    restart: Schema.Boolean,
    inWindow: Schema.Boolean,
    stored: Schema.Boolean,
    page: Schema.optionalKey(Schema.Number),
    cursor: Schema.optionalKey(Schema.Json)
  })
])

/**
 * One frame of the Wire.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export type Wire = typeof Wire.Type

/**
 * The Wire's form of an entry, without the `Hello` frame.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export type WireEntry = Exclude<Wire, { readonly _tag: "Hello" }>

/**
 * Turns entries into Wire frames.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export interface Encoder {
  readonly encode: (entry: Entry) => WireEntry
}

/**
 * Makes an encoder. `onWarning` is called once per component and field the
 * first time its Schema fails to encode a value, which is sent as a
 * placeholder instead.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export const makeEncoder = (options?: {
  readonly maxEntryBytes?: number | undefined
  readonly onWarning?: ((message: string) => void) | undefined
}): Encoder => {
  const maxEntryBytes = options?.maxEntryBytes ?? Infinity
  const warned = new Set<string>()
  const encoders = new WeakMap<Schema.Top, (value: unknown) => unknown>()
  const through = (component: Component.Any, field: "props" | "model" | "message" | "events", value: unknown) =>
    encodeWith(component[field] as Schema.Top, `${component.name}.${field}`, value)
  const encodeWith = (schema: Schema.Top, id: string, value: unknown) => {
    let encode = encoders.get(schema)
    if (encode === undefined) {
      encode = Schema.encodeUnknownSync(
        Schema.toCodecJson(Schema.make<Schema.Codec<unknown, unknown>>(redactAST(schema.ast)))
      )
      encoders.set(schema, encode)
    }
    try {
      return encode(value) as Schema.Json
    } catch (error) {
      if (!warned.has(id)) {
        warned.add(id)
        options?.onWarning?.(`MessageLog: ${id} failed to encode, so it's sent as a placeholder: ${String(error)}`)
      }
      return { "~unserialisable": "encode" }
    }
  }
  const encodeLoaded = (component: Component.Any, loaded: Component.Slots): Schema.Json => {
    const schema = (component["~loaders"] as loaders.Bound | undefined)?.logSchema
    return schema === undefined
      ? { "~unserialisable": "encode" }
      : cap(encodeWith(schema, `${component.name}.loaders`, loaded) as Schema.Json)
  }
  // A message can carry a loader's whole result, so messages are capped like Models and slots.
  const capped = (component: Component.Any, field: "model" | "message", value: unknown): Schema.Json =>
    cap(through(component, field, value) as Schema.Json)
  const cap = (encoded: Schema.Json): Schema.Json => {
    if (maxEntryBytes === Infinity) return encoded
    const bytes = utf8Length(JSON.stringify(encoded))
    return bytes > maxEntryBytes ? { "~truncated": bytes } : encoded
  }
  return {
    encode(entry) {
      switch (entry._tag) {
        case "Update":
          return {
            ...base(entry),
            _tag: "Update",
            component: entry.component.name,
            source: encodeSource(entry.source),
            message: capped(entry.component, "message", entry.message),
            props: through(entry.component, "props", entry.props) as Schema.Json,
            model: capped(entry.component, "model", entry.model),
            commands: entry.commands.map(encodeCommand),
            events: entry.events.map((emitted) => through(entry.component, "events", emitted) as Schema.Json),
            ...(entry.lists === undefined || entry.lists.length === 0 ? undefined : { lists: entry.lists }),
            ...(entry.sends === undefined || entry.sends.length === 0 ? undefined : {
              sends: entry.sends.map((send) => {
                const encoded = encodeSend(send)
                return { ref: encoded.ref, message: cap(encoded.message) }
              })
            }),
            ...(entry.loaded === undefined ? undefined : { loaded: encodeLoaded(entry.component, entry.loaded) })
          }
        case "Mounted":
          return {
            ...base(entry),
            _tag: "Mounted",
            component: entry.component.name,
            props: through(entry.component, "props", entry.props) as Schema.Json,
            model: capped(entry.component, "model", entry.model),
            commands: entry.commands.map(encodeCommand),
            events: entry.events.map((emitted) => through(entry.component, "events", emitted) as Schema.Json),
            adopted: entry.adopted
          }
        case "PropsChanged":
          return {
            ...base(entry),
            _tag: "PropsChanged",
            component: entry.component.name,
            props: through(entry.component, "props", entry.props) as Schema.Json
          }
        case "LoaderChanged": {
          const schema = (entry.component["~loaders"] as loaders.Bound | undefined)?.logSchema.fields[entry.name]
          return {
            ...base(entry),
            _tag: "LoaderChanged",
            component: entry.component.name,
            name: entry.name,
            slot: schema === undefined
              ? { "~unserialisable": "encode" }
              : cap(encodeWith(schema, `${entry.component.name}.loaders.${entry.name}`, entry.slot) as Schema.Json)
          }
        }
        case "LayerFailed":
          return { ...base(entry), _tag: "LayerFailed", cause: encodeCause(entry.cause) }
        case "Failed":
        case "Crashed":
          return {
            ...base(entry),
            _tag: entry._tag,
            source: entry.source,
            name: entry.name ?? null,
            cause: encodeCause(entry.cause)
          }
        case "SessionStarted":
          return { ...base(entry), _tag: "SessionStarted", app: entry.app }
        case "SubscriptionStarted":
        case "SubscriptionStopped":
          return { ...base(entry), _tag: entry._tag, key: entry.key }
        case "CommandEnded":
        case "CommandInterrupted":
          return {
            ...base(entry),
            _tag: entry._tag,
            name: entry.name,
            issued: entry.issued,
            detached: entry.detached,
            ...(entry.waitEnded === undefined ? undefined : { waitEnded: entry.waitEnded }),
            ...(entry.outstanding === undefined ? undefined : { outstanding: entry.outstanding })
          }
        case "CommandAwaiting":
          return {
            ...base(entry),
            _tag: "CommandAwaiting",
            name: entry.name,
            issued: entry.issued,
            entries: entry.entries
          }
        case "CommandDropped":
          return {
            ...base(entry),
            _tag: "CommandDropped",
            name: entry.name,
            issued: entry.issued,
            reason: entry.reason
          }
        case "SendDropped":
          return { ...base(entry), _tag: "SendDropped", ref: entry.ref, issued: entry.issued, reason: entry.reason }
        case "Unmounted":
        case "LayerPending":
        case "LayerReady":
          return { ...base(entry), _tag: entry._tag }
        case "FetchStarted":
          return {
            ...base(entry),
            _tag: "FetchStarted",
            read: entry.read,
            logKey: entry.logKey,
            trigger: entry.trigger,
            restart: entry.restart,
            inWindow: entry.inWindow,
            stored: entry.stored,
            ...(entry.page === undefined ? undefined : { page: entry.page }),
            ...(entry.cursor === undefined ? undefined : { cursor: entry.cursor })
          }
      }
    }
  }
}

const base = (entry: Base) => ({ seq: entry.seq, at: entry.at, session: entry.session, path: entry.path })

const encodeSource = (source: Source): typeof SourceWire.Type => {
  switch (source._tag) {
    case "Command":
      return { ...source, spanId: source.spanId ?? null, traceId: source.traceId ?? null }
    default:
      return source
  }
}

/**
 * Encodes a Command by name, group and args. Args and group fields use the
 * Command's `args` Schema, replacing every `Schema.Redacted` with a
 * placeholder. A leaf that fails to encode falls back to structural encoding.
 * An `Interrupt` has `null` args.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export const encodeCommand = (command: Command.Command<any, any>): typeof CommandWire.Type => ({
  _tag: command._tag,
  name: command.name,
  group: encodeGroup(command),
  args: command._tag === "Interrupt" ? null : encodeArgs(command.argsSchema, command.args)
})

// The scheduling key holds the group fields' real encoding, so the log re-encodes them redacted.
const encodeGroup = (command: Command.Command<any, any>): string | null => {
  if (command.groupKey === undefined) return null
  const source = (command as { readonly "~group"?: Command.GroupSource | undefined })["~group"]
  return source === undefined
    ? JSON.stringify({ "~redacted": true })
    : canonical(encodeArgs(source.schema, source.picked))
}

/**
 * Encodes a `$.send` as the ref's key and the message, through the ref's
 * `receives` Schema the way `encodeArgs` encodes Command args: redacted,
 * with a structural fallback for what doesn't encode.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export const encodeSend = (send: Component.Send): { readonly ref: string; readonly message: Schema.Json } => ({
  ref: send.ref.key,
  message: encodeArgs(send.ref.receives, send.message)
})

/** The redacting codec of `ast`, or `null` when it has none. */
const encoderOf = memoize((ast: SchemaAST.AST): ((value: unknown) => unknown) | null => {
  try {
    return Schema.encodeUnknownSync(
      Schema.toCodecJson(Schema.make<Schema.Codec<unknown, unknown>>(redactAST(ast)))
    )
  } catch {
    return null
  }
})
const guardOf = memoize((ast: SchemaAST.AST): (value: unknown) => boolean => {
  const is = Schema.is(Schema.make<Schema.Top>(ast))
  return (value) => {
    try {
      return is(value)
    } catch {
      return false
    }
  }
})
const isPlainRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !Redacted.isRedacted(value)
/** Whether `ast` declares a `Schema.Redacted` anywhere. */
const holdsRedacted = (ast: SchemaAST.AST): boolean => redactAST(ast) !== ast

/**
 * Detects objects anywhere in `ast` with a redacted index signature beside
 * another named or indexed signature. Each matching signature parses a key,
 * but the codec keeps only the named property's output or the last index
 * signature's. This can discard another signature's redaction, so these
 * Schemas bypass the whole codec.
 */
const holdsRedactedOverlap = memoize((ast: SchemaAST.AST): boolean => {
  const seen = new Set<SchemaAST.AST>()
  const visit = (node: SchemaAST.AST): boolean => {
    if (seen.has(node)) return false
    seen.add(node)
    if (node.encoding !== undefined && node.encoding.some((link) => visit(link.to))) return true
    switch (node._tag) {
      case "Objects":
        return (node.indexSignatures.length + node.propertySignatures.length > 1 &&
          node.indexSignatures.some((index) => holdsRedacted(index.type))) ||
          node.propertySignatures.some((property) => visit(property.type)) ||
          node.indexSignatures.some((index) => visit(index.type))
      case "Arrays":
        return node.elements.some(visit) || node.rest.some(visit)
      case "Union":
        return node.types.some(visit)
      case "Suspend":
        return visit(node.thunk())
      case "Declaration":
        return node.typeParameters.some(visit)
      default:
        return false
    }
  }
  return visit(ast)
})

const redacted: Schema.Json = { "~redacted": true }
const failed: Schema.Json = { "~unserialisable": "encode" }
/** Reading a value can throw, from a getter. The log gets a placeholder for it instead. */
const guarded = (f: () => Schema.Json): Schema.Json => {
  try {
    return f()
  } catch {
    return failed
  }
}

/**
 * Encodes `value` through `ast`. When the whole fails, a struct, record,
 * tuple or array is encoded part by part, and a union through the member the
 * value belongs to, so only the leaf that fails falls back. A failing leaf
 * whose Schema declares a `Schema.Redacted` anywhere is a placeholder, since
 * `structural` can't tell which of its values is secret.
 *
 * Nothing is read that the codec wouldn't read, until a leaf falls back. A
 * cyclic value makes the codec overflow the stack, which is a failure like
 * any other: the walk goes on part by part, and the repeat is a placeholder.
 */
const encodeAt = (ast: SchemaAST.AST, value: unknown, path: Set<object>): Schema.Json => {
  if (typeof value === "object" && value !== null && path.has(value)) return { "~unserialisable": "cycle" }
  const encode = holdsRedactedOverlap(ast) ? null : encoderOf(ast)
  if (encode !== null) {
    try {
      // A Schema such as `Schema.Any` passes a value through, so the result goes through `structural` too.
      return structural(encode(value))
    } catch {
      // Encoded part by part below.
    }
  }
  if (ast.encoding === undefined) {
    switch (ast._tag) {
      case "Suspend":
        return encodeAt(ast.thunk(), value, path)
      case "Objects":
        if (isPlainRecord(value)) return within(path, value, () => encodeObject(ast, value, path))
        break
      case "Arrays":
        if (Array.isArray(value)) return within(path, value, () => encodeArray(ast, value, path))
        break
      case "Union": {
        const member = ast.types.find((type) => guardOf(type)(value))
        if (member !== undefined) return encodeAt(member, value, path)
        break
      }
    }
  }
  return fallback(ast, value)
}
const within = <A>(path: Set<object>, value: object, f: () => A): A => {
  path.add(value)
  try {
    return f()
  } finally {
    path.delete(value)
  }
}
/**
 * The keys the parser outputs, each with every Schema that applies to it: its
 * property signature, if it has one, and every index signature it matches. The
 * parser runs all of them, even when it keeps only one output, so each one's
 * redaction counts. A key that matches nothing is left out. Only keys are read
 * here, never values.
 */
const encodeObject = (ast: SchemaAST.Objects, value: Record<PropertyKey, unknown>, path: Set<object>): Schema.Json => {
  const applies = new Map<string, Array<SchemaAST.AST>>()
  for (const property of ast.propertySignatures) {
    if (typeof property.name === "string" && Object.hasOwn(value, property.name)) {
      applies.set(property.name, [property.type])
    }
  }
  const properties = new Set(applies.keys())
  for (const index of ast.indexSignatures) {
    for (const key of SchemaAST.getIndexSignatureKeys(value, index.parameter)) {
      if (typeof key !== "string") continue
      const types = applies.get(key)
      if (types === undefined) applies.set(key, [index.type])
      else if (!types.includes(index.type)) types.push(index.type)
    }
  }
  const out: Record<string, Schema.Json> = {}
  for (const [key, types] of applies) {
    // Under two Schemas, either one's redaction could apply, so it's a placeholder. Otherwise the
    // parser's output is kept: the property's, or else the last index signature's.
    const type = properties.has(key) ? types[0]! : types[types.length - 1]!
    out[key] = types.length > 1 && types.some(holdsRedacted)
      ? redacted
      : guarded(() => encodeAt(type, value[key], path))
  }
  return out
}
/** Elements, then the rest, then the trailing elements, which take the last positions. */
const encodeArray = (ast: SchemaAST.Arrays, value: ReadonlyArray<unknown>, path: Set<object>): Schema.Json => {
  const [rest, ...tail] = ast.rest
  const tailStart = Math.max(ast.elements.length, value.length - tail.length)
  return value.map((item, i) => {
    const element = i < ast.elements.length
      ? ast.elements[i]
      : rest === undefined
      ? undefined
      : i >= tailStart
      ? tail[i - tailStart]
      : rest
    return element === undefined ? fallback(ast, item) : encodeAt(element, item, path)
  })
}
const fallback = (ast: SchemaAST.AST, value: unknown): Schema.Json =>
  holdsRedacted(ast) ? redacted : guarded(() => structural(value))

/**
 * Encodes a value through a Schema with every `Schema.Redacted` redacted. A
 * leaf that fails to encode, such as a `File` under `Schema.instanceOf`,
 * falls back to `structural` on its own, and its siblings keep their codecs.
 * It never throws: a value that can't be read is a placeholder.
 *
 * @internal
 */
export const encodeArgs = (schema: Schema.Top, value: unknown): Schema.Json => {
  const path = new Set<object>()
  // A struct or a class is encoded field by field.
  const fields = (schema as { readonly fields?: Schema.Struct.Fields }).fields
  if (fields !== undefined && isPlainRecord(value)) {
    return within(path, value, () => {
      const out: Record<string, Schema.Json> = {}
      for (const key of Object.keys(fields)) {
        if (!Object.hasOwn(value, key)) continue
        out[key] = guarded(() => encodeAt((fields[key] as Schema.Top).ast, value[key], path))
      }
      return out
    })
  }
  return guarded(() => encodeAt(schema.ast, value, path))
}

const encodeCause = (cause: Cause.Cause<unknown>): typeof CauseWire.Type => ({
  pretty: Cause.pretty(cause),
  reasons: cause.reasons.map((reason): Schema.Json =>
    Cause.isFailReason(reason)
      ? { _tag: "Fail", error: structural(reason.error) }
      : Cause.isDieReason(reason)
      ? { _tag: "Die", defect: structural(reason.defect) }
      : { _tag: "Interrupt", fiberId: reason.fiberId ?? null }
  )
})

/**
 * Encodes any value as JSON, best effort, with the Wire's placeholders for
 * what has no JSON form.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.5
 */
export const structural = (value: unknown, seen: Set<unknown> = new Set()): Schema.Json => {
  switch (typeof value) {
    case "string":
    case "boolean":
      return value
    case "number":
      return Number.isFinite(value) ? value : { "~unserialisable": "number" }
    case "undefined":
      return null
    case "bigint":
    case "symbol":
    case "function":
      return { "~unserialisable": typeof value }
  }
  if (value === null) return null
  if (Redacted.isRedacted(value)) return { "~redacted": true }
  if (seen.has(value)) return { "~unserialisable": "cycle" }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? { "~unserialisable": "Date" } : value.toISOString()
  if (value instanceof Error) return { name: value.name, message: value.message }
  seen.add(value)
  try {
    if (Array.isArray(value)) return value.map((item) => structural(item, seen))
    const proto = Object.getPrototypeOf(value as object)
    if (proto !== Object.prototype && proto !== null) {
      if (typeof (value as any).toJSON === "function") return structural((value as any).toJSON(), seen)
      if (value instanceof Map || value instanceof Set || ArrayBuffer.isView(value)) {
        return { "~unserialisable": value.constructor.name }
      }
    }
    const out: Record<string, Schema.Json> = {}
    for (const key of Object.keys(value as object)) out[key] = structural((value as any)[key], seen)
    return out
  } finally {
    seen.delete(value)
  }
}

const utf8Length = (text: string): number => {
  let bytes = 0
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code < 0xdc00) {
      bytes += 4
      index++
    } else bytes += 3
  }
  return bytes
}

/**
 * Streams entries to a devtools process over a WebSocket, as newline-free
 * JSON Wire frames, one per message.
 *
 * **Details**
 *
 * `record` only pushes to a Queue. The Layer's fiber encodes whatever it
 * takes and keeps the last `buffer` frames (1,000 by default), which every new
 * connection receives after its `Hello`, so devtools that connect late see
 * the recent past. A lost connection is retried with backoff, and one warning
 * is logged.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const socket = (url: string, options?: {
  readonly buffer?: number | undefined
  readonly maxEntryBytes?: number | undefined
  readonly host?: WireHost | undefined
}): Layer.Layer<never, never, Socket.WebSocketConstructor> =>
  Layer.effect(
    MessageLog,
    Effect.gen(function*() {
      const size = Math.max(1, options?.buffer ?? 1_000)
      const entries = yield* Queue.unbounded<Entry>()
      const outbox = yield* Queue.unbounded<string>()
      const replay: Array<string> = []
      const warnings: Array<string> = []
      const encoder = makeEncoder({
        maxEntryBytes: options?.maxEntryBytes,
        onWarning: (message) => warnings.push(message)
      })
      const hello = JSON.stringify({ _tag: "Hello", version: wireVersion, host: options?.host ?? "browser" })

      yield* Queue.takeAll(entries).pipe(
        Effect.flatMap((batch) =>
          Effect.suspend(() => {
            for (const entry of batch) {
              const frame = JSON.stringify(encoder.encode(entry))
              replay.push(frame)
              if (replay.length > size) replay.shift()
              Queue.offerUnsafe(outbox, frame)
            }
            const logged = warnings.splice(0)
            return logged.length === 0 ? Effect.void : Effect.forEach(logged, (message) => Effect.logWarning(message))
          })
        ),
        Effect.forever,
        Effect.forkScoped
      )

      const connection = Effect.gen(function*() {
        const ws = yield* Socket.makeWebSocket(url)
        const writer = yield* ws.writer
        const reader = yield* ws.reader
        // What's queued is already in the replay buffer, so it's sent from there.
        const backlog = yield* Effect.map(Queue.clear(outbox), () => [hello, ...replay])
        yield* Effect.forEach(backlog, (frame) => writer.write(frame), { discard: true })
        return yield* Effect.raceFirst(
          Effect.forever(Effect.flatMap(Queue.take(outbox), (frame) => writer.write(frame))),
          Effect.forever(reader.pull)
        )
      }).pipe(Effect.scoped)

      let warned = false
      yield* connection.pipe(
        Effect.tapCause((cause) =>
          warned ? Effect.void : Effect.suspend(() => {
            warned = true
            return Effect.logWarning(`MessageLog: lost the connection to ${url}, retrying`, cause)
          })
        ),
        Effect.retry(Schedule.min([Schedule.exponential("200 millis"), Schedule.spaced("10 seconds")])),
        Effect.forever,
        Effect.forkScoped
      )

      return {
        enabled: true,
        record: (entry: Entry) => {
          Queue.offerUnsafe(entries, entry)
        }
      }
    })
  )
