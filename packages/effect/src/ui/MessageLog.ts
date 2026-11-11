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
 * @since 4.1.3
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import { redactAST } from "../internal/schemaRedact.ts"
import * as Layer from "../Layer.ts"
import * as Queue from "../Queue.ts"
import { canonical } from "../reactivity/Loader.ts"
import * as Redacted from "../Redacted.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as Socket from "../socket/Socket.ts"
import type * as Command from "./Command.ts"
import type * as Component from "./Component.ts"

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
 * @since 4.1.3
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
 * @since 4.1.3
 */
export const noop: MessageLog = { enabled: false, record: () => {} }

/**
 * The `MessageLog` service. It defaults to `noop`, so it never has to be
 * provided.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export const MessageLog: Context.Reference<MessageLog> = Context.Reference<MessageLog>("effect/ui/MessageLog", {
  defaultValue: () => noop
})

/**
 * Where a failure happened: the code that threw or failed.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type FailureSource =
  | "init"
  | "update"
  | "view"
  | "domEvent"
  | "mount"
  | "command"
  | "subscription"
  | "layer"
  | "fallback"
  | "onEmit"
  | "onFailure"
  | "head"

/**
 * Which Command run an entry is about: the `seq` of the entry that issued it
 * (an `Update` or a `Mounted`) and its index in that entry's `commands`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
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
 * `Mount` is an `onMount` result, and `Dispatch` is a message sent from
 * outside the tree, such as `TestHost`'s `root.send`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
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
  | { readonly _tag: "Mount"; readonly name: string }
  | { readonly _tag: "Dispatch" }

/**
 * Fields every entry has: its number, its time from `Clock`, the session it
 * belongs to and the instance path it's about.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Base {
  readonly seq: number
  readonly at: number
  readonly session: string
  readonly path: string
}

/**
 * One `update` call: the message, what sent it, the props it saw, the Model
 * after it, and the Commands and events it returned.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
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
}

/**
 * An instance mounted: its props, the Model from `init` (or adopted from the
 * server), and the Commands `init` returned.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
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
 * A lifecycle step with nothing to add but the path.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Lifecycle extends Base {
  readonly _tag: "Unmounted" | "LayerPending" | "LayerReady"
}

/**
 * A provided Layer failed to build.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
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
 * @since 4.1.3
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
 * @since 4.1.3
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
}

/**
 * A Command that never ran: dropped by its `mode`, by the server, or because
 * an adopted Model already holds its result (a `server: true` Command replayed
 * by hydration or history restore).
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface CommandDropped extends Base {
  readonly _tag: "CommandDropped"
  readonly name: string
  readonly issued: Issued
  readonly reason: "mode" | "server" | "adopted"
}

/**
 * An instance failed (`Failed`), or the root did (`Crashed`), with the real
 * Cause and where it happened.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
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
 * @since 4.1.3
 */
export interface SessionStarted extends Base {
  readonly _tag: "SessionStarted"
  readonly app: string
}

/**
 * Any log entry.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Entry =
  | SessionStarted
  | Update
  | Mounted
  | Lifecycle
  | LayerFailed
  | SubscriptionChanged
  | CommandSettled
  | CommandDropped
  | Failed

/**
 * A ring buffer log whose entries can be read back.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
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
 * @since 4.1.3
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
 * @since 4.1.3
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
 * @since 4.1.3
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
 * @since 4.1.3
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
 * @since 4.1.3
 */
export const wireVersion = 1

/**
 * Where a log comes from, as `Hello` reports it.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.3
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
 * Schemas. Command args are encoded through the Command's `args` Schema,
 * field by field, and a field that doesn't encode falls back to a structural
 * encoding, best effort: a value with no JSON form becomes
 * `{ "~unserialisable": "<kind>" }`, a `Redacted` becomes
 * `{ "~redacted": true }`, and a Model over `maxEntryBytes` becomes
 * `{ "~truncated": bytes }`. A Cause is sent as `Cause.pretty` plus its
 * reasons, best effort.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.3
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
    events: Schema.Array(Schema.Json)
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
  Schema.Struct({ _tag: Schema.Literals(["Unmounted", "LayerPending", "LayerReady"]), ...Seq }),
  Schema.TaggedStruct("LayerFailed", { ...Seq, cause: CauseWire }),
  Schema.Struct({ _tag: Schema.Literals(["SubscriptionStarted", "SubscriptionStopped"]), ...Seq, key: Schema.String }),
  Schema.Struct({
    _tag: Schema.Literals(["CommandEnded", "CommandInterrupted"]),
    ...Seq,
    name: Schema.String,
    issued: IssuedWire,
    detached: Schema.Boolean
  }),
  Schema.TaggedStruct("CommandDropped", {
    ...Seq,
    name: Schema.String,
    issued: IssuedWire,
    reason: Schema.Literals(["mode", "server", "adopted"])
  }),
  Schema.Struct({
    _tag: Schema.Literals(["Failed", "Crashed"]),
    ...Seq,
    source: Schema.String,
    name: Schema.NullOr(Schema.String),
    cause: CauseWire
  })
])

/**
 * One frame of the Wire.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.3
 */
export type Wire = typeof Wire.Type

/**
 * The Wire's form of an entry, without the `Hello` frame.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.3
 */
export type WireEntry = Exclude<Wire, { readonly _tag: "Hello" }>

/**
 * Turns entries into Wire frames.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.3
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
 * @since 4.1.3
 */
export const makeEncoder = (options?: {
  readonly maxEntryBytes?: number | undefined
  readonly onWarning?: ((message: string) => void) | undefined
}): Encoder => {
  const maxEntryBytes = options?.maxEntryBytes ?? Infinity
  const warned = new Set<string>()
  const encoders = new WeakMap<Schema.Top, (value: unknown) => unknown>()
  const through = (component: Component.Any, field: "props" | "model" | "message" | "events", value: unknown) => {
    const schema = component[field] as Schema.Top
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
      const id = `${component.name}.${field}`
      if (!warned.has(id)) {
        warned.add(id)
        options?.onWarning?.(`MessageLog: ${id} failed to encode, so it's sent as a placeholder: ${String(error)}`)
      }
      return { "~unserialisable": "encode" }
    }
  }
  const model = (component: Component.Any, value: unknown): Schema.Json => {
    const encoded = through(component, "model", value) as Schema.Json
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
            message: through(entry.component, "message", entry.message) as Schema.Json,
            props: through(entry.component, "props", entry.props) as Schema.Json,
            model: model(entry.component, entry.model),
            commands: entry.commands.map(encodeCommand),
            events: entry.events.map((emitted) => through(entry.component, "events", emitted) as Schema.Json)
          }
        case "Mounted":
          return {
            ...base(entry),
            _tag: "Mounted",
            component: entry.component.name,
            props: through(entry.component, "props", entry.props) as Schema.Json,
            model: model(entry.component, entry.model),
            commands: entry.commands.map(encodeCommand),
            events: entry.events.map((emitted) => through(entry.component, "events", emitted) as Schema.Json),
            adopted: entry.adopted
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
          return { ...base(entry), _tag: entry._tag, name: entry.name, issued: entry.issued, detached: entry.detached }
        case "CommandDropped":
          return {
            ...base(entry),
            _tag: "CommandDropped",
            name: entry.name,
            issued: entry.issued,
            reason: entry.reason
          }
        case "Unmounted":
        case "LayerPending":
        case "LayerReady":
          return { ...base(entry), _tag: entry._tag }
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
 * Encodes a Command by name, group and args. The args go through the
 * Command's `args` Schema with every `Schema.Redacted` redacted, and a leaf
 * that fails to encode is encoded structurally instead. The group is the
 * group fields encoded the same way, so a redacted group field is a
 * placeholder there too. An `Interrupt` has `null` args.
 *
 * @stability experimental
 * @category Wire
 * @since 4.1.3
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

const leafEncoders = new WeakMap<SchemaAST.AST, ((value: unknown) => unknown) | undefined>()
const encoderOf = (ast: SchemaAST.AST): ((value: unknown) => unknown) | undefined => {
  if (leafEncoders.has(ast)) return leafEncoders.get(ast)
  let encode: ((value: unknown) => unknown) | undefined
  try {
    encode = Schema.encodeUnknownSync(
      Schema.toCodecJson(Schema.make<Schema.Codec<unknown, unknown>>(redactAST(ast)))
    )
  } catch {
    encode = undefined
  }
  leafEncoders.set(ast, encode)
  return encode
}
const guards = new WeakMap<SchemaAST.AST, (value: unknown) => boolean>()
const guardOf = (ast: SchemaAST.AST): (value: unknown) => boolean => {
  let guard = guards.get(ast)
  if (guard === undefined) {
    const is = Schema.is(Schema.make<Schema.Top>(ast))
    guard = (value) => {
      try {
        return is(value)
      } catch {
        return false
      }
    }
    guards.set(ast, guard)
  }
  return guard
}
const isPlainRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !Redacted.isRedacted(value)
/** Whether `ast` declares a `Schema.Redacted` anywhere. */
const holdsRedacted = (ast: SchemaAST.AST): boolean => redactAST(ast) !== ast

const overlaps = new WeakMap<SchemaAST.AST, boolean>()
/**
 * Whether `ast` holds, anywhere, an object with an index signature that
 * declares a `Schema.Redacted` beside another signature, named or indexed. A
 * key two of them match is parsed by each, and the codec keeps only one
 * output: a named property's, or else the last index signature's. Another
 * one's redaction can be lost, so the whole codec is never used for such a
 * Schema.
 */
const holdsRedactedOverlap = (ast: SchemaAST.AST): boolean => {
  const cached = overlaps.get(ast)
  if (cached !== undefined) return cached
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
  const result = visit(ast)
  overlaps.set(ast, result)
  return result
}

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
  const encode = holdsRedactedOverlap(ast) ? undefined : encoderOf(ast)
  if (encode !== undefined) {
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
      : i >= tailStart && tail.length > 0
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
 * @since 4.1.3
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
 * @since 4.1.3
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
