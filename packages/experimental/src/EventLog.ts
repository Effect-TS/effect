/**
 * @since 1.0.0
 */
import type * as Error from "@effect/platform/Error"
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberMap from "effect/FiberMap"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as ParseResult from "effect/ParseResult"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import type * as Record from "effect/Record"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import type { Covariant } from "effect/Types"
import type { Event } from "./Event.js"
import type { EventGroup } from "./EventGroup.js"
import type { EventJournalError, RemoteEntry, RemoteId } from "./EventJournal.js"
import { Entry, EventJournal, makeEntryId } from "./EventJournal.js"
import { type EventLogRemote } from "./EventLogRemote.js"
import * as Reactivity from "./Reactivity.js"

/**
 * @since 1.0.0
 * @category schema
 */
export const SchemaTypeId: unique symbol = Symbol.for("@effect/experimental/EventLog/EventLogSchema")

/**
 * @since 1.0.0
 * @category schema
 */
export type SchemaTypeId = typeof SchemaTypeId

/**
 * @since 1.0.0
 * @category schema
 */
export const isEventLogSchema = (u: unknown): u is EventLogSchema<any> => Predicate.hasProperty(u, SchemaTypeId)

/**
 * @since 1.0.0
 * @category schema
 */
export interface EventLogSchema<Groups extends EventGroup.Any> {
  new(_: never): {}
  readonly [SchemaTypeId]: SchemaTypeId
  readonly groups: ReadonlyArray<Groups>
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schema = <Groups extends ReadonlyArray<EventGroup.Any>>(
  ...groups: Groups
): EventLogSchema<Groups[number]> => {
  function EventLog() {}
  EventLog[SchemaTypeId] = SchemaTypeId
  EventLog.groups = groups
  return EventLog as any
}

/**
 * @since 1.0.0
 * @category handlers
 */
export const HandlersTypeId: unique symbol = Symbol.for("@effect/experimental/EventLog/Handlers")

/**
 * @since 1.0.0
 * @category handlers
 */
export type HandlersTypeId = typeof HandlersTypeId

/**
 * Represents a handled `EventGroup`.
 *
 * @since 1.0.0
 * @category handlers
 */
export interface Handlers<
  R,
  Events extends Event.Any = never
> extends Pipeable {
  readonly [HandlersTypeId]: {
    _Endpoints: Covariant<Events>
  }
  readonly group: EventGroup.AnyWithProps
  readonly handlers: Record.ReadonlyRecord<string, Handlers.Item<R>>
  readonly context: Context.Context<any>

  /**
   * Add the implementation for an `Event` to a `Handlers` group.
   */
  handle<Tag extends Events["tag"], R1>(
    name: Tag,
    handler: (
      options: {
        readonly payload: Event.PayloadWithTag<Events, Tag>
        readonly entry: Entry
        readonly conflicts: Array<{
          readonly entry: Entry
          readonly payload: Event.PayloadWithTag<Events, Tag>
        }>
      }
    ) => Effect.Effect<Event.SuccessWithTag<Events, Tag>, Event.ErrorWithTag<Events, Tag>, R1>
  ): Handlers<
    R | R1,
    Event.ExcludeTag<Events, Tag>
  >
}

/**
 * @since 1.0.0
 * @category handlers
 */
export declare namespace Handlers {
  /**
   * @since 1.0.0
   * @category handlers
   */
  export interface Any {
    readonly [HandlersTypeId]: any
  }

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Item<R> = {
    readonly event: Event.AnyWithProps
    readonly context: Context.Context<any>
    readonly handler: (options: {
      readonly payload: any
      readonly entry: Entry
      readonly conflicts: Array<{
        readonly entry: Entry
        readonly payload: any
      }>
    }) => Effect.Effect<any, R>
  }

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type ValidateReturn<A> = A extends (
    | Handlers<
      infer _R,
      infer _Events
    >
    | Effect.Effect<
      Handlers<
        infer _R,
        infer _Events
      >,
      infer _EX,
      infer _RX
    >
  ) ? [_Events] extends [never] ? A
    : `Event not handled: ${Event.Tag<_Events>}` :
    `Must return the implemented handlers`

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Error<A> = A extends Effect.Effect<
    Handlers<
      infer _R,
      infer _Events
    >,
    infer _EX,
    infer _RX
  > ? _EX :
    never

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Context<A> = A extends Handlers<
    infer _R,
    infer _Events
  > ? _R | Event.Context<_Events> :
    A extends Effect.Effect<
      Handlers<
        infer _R,
        infer _Events
      >,
      infer _EX,
      infer _RX
    > ? _R | _RX | Event.Context<_Events> :
    never
}

const handlersProto = {
  [HandlersTypeId]: {
    _Endpoints: identity
  },
  handle<Tag extends string, R1>(
    this: Handlers<any, any>,
    tag: Tag,
    handler: (payload: any) => Effect.Effect<any, R1>
  ): Handlers<any, any> {
    return makeHandlers({
      group: this.group,
      context: this.context,
      handlers: {
        ...this.handlers,
        [tag]: {
          event: this.group.events[tag],
          context: this.context,
          handler
        }
      }
    })
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeHandlers = <Events extends Event.Any>(options: {
  readonly group: EventGroup.AnyWithProps
  readonly handlers: Record.ReadonlyRecord<string, Handlers.Item<any>>
  readonly context: Context.Context<any>
}): Handlers<never, Events> => Object.assign(Object.create(handlersProto), options)

/**
 * @since 1.0.0
 * @category handlers
 */
export const group = <Events extends Event.Any, Return>(
  group: EventGroup<Events>,
  f: (handlers: Handlers<never, Events>) => Handlers.ValidateReturn<Return>
): Layer.Layer<Event.ToService<Events>, Handlers.Error<Return>, Exclude<Handlers.Context<Return>, Scope>> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<Handlers.Context<Return>>()
    const result = f(makeHandlers({
      group: group as any,
      handlers: {},
      context
    }))
    const handlers = Effect.isEffect(result) ? yield* (result as any as Effect.Effect<any>) : result
    const registry = yield* Registry
    yield* registry.add(handlers)
  }).pipe(
    Layer.scopedDiscard,
    Layer.provide(Registry.layer)
  ) as any

/**
 * @since 1.0.0
 * @category compaction
 */
export const groupCompaction = <Events extends Event.Any, R>(
  group: EventGroup<Events>,
  effect: (options: {
    readonly primaryKey: string
    readonly entries: Array<Entry>
    readonly events: Array<Event.TaggedPayload<Events>>
    readonly write: <Tag extends Event.Tag<Events>>(
      tag: Tag,
      payload: Event.PayloadWithTag<Events, Tag>
    ) => Effect.Effect<void>
  }) => Effect.Effect<void, never, R>
): Layer.Layer<never, never, Identity | EventJournal | R | Event.Context<Events>> =>
  Effect.gen(function*() {
    const log = yield* EventLog
    const context = yield* Effect.context<R | Event.Context<Events>>()

    yield* log.registerCompaction({
      events: Object.keys(group.events),
      effect: Effect.fnUntraced(function*({ entries, write }) {
        const writePayload = (timestamp: number, tag: string, payload: any) =>
          Effect.gen(function*() {
            const event = group.events[tag] as any as Event.AnyWithProps
            const entry = new Entry({
              id: makeEntryId({ msecs: timestamp }),
              event: tag,
              payload: yield* (Schema.encode(event.payloadMsgPack)(payload).pipe(
                Effect.locally(FiberRef.currentContext, context),
                Effect.orDie
              ) as Effect.Effect<Uint8Array>),
              primaryKey: event.primaryKey(payload)
            }, { disableValidation: true })
            yield* write(entry)
          })

        const byPrimaryKey = new Map<
          string,
          {
            readonly entries: Array<Entry>
            readonly taggedPayloads: Array<{
              readonly _tag: string
              readonly payload: any
            }>
          }
        >()
        for (const entry of entries) {
          const payload =
            yield* (Schema.decodeUnknown((group.events[entry.event] as any).payloadMsgPack)(entry.payload).pipe(
              Effect.locally(FiberRef.currentContext, context)
            ) as Effect.Effect<any>)

          if (byPrimaryKey.has(entry.primaryKey)) {
            const record = byPrimaryKey.get(entry.primaryKey)!
            record.entries.push(entry)
            record.taggedPayloads.push({
              _tag: entry.event,
              payload
            })
          } else {
            byPrimaryKey.set(entry.primaryKey, {
              entries: [entry],
              taggedPayloads: [{ _tag: entry.event, payload }]
            })
          }
        }

        for (const [primaryKey, { entries, taggedPayloads }] of byPrimaryKey) {
          yield* (effect({
            primaryKey,
            entries,
            events: taggedPayloads as any,
            write(tag, payload) {
              return writePayload(entries[0].createdAtMillis, tag, payload)
            }
          }).pipe(
            Effect.locally(FiberRef.currentContext, context)
          ) as Effect.Effect<void>)
        }
      })
    })
  }).pipe(
    Layer.scopedDiscard,
    Layer.provide(layerEventLog)
  )

/**
 * @since 1.0.0
 * @category reactivity
 */
export const groupReactivity = <Events extends Event.Any>(
  group: EventGroup<Events>,
  keys:
    | { readonly [Tag in Event.Tag<Events>]?: ReadonlyArray<string> }
    | ReadonlyArray<string>
): Layer.Layer<never, never, Identity | EventJournal> =>
  Effect.gen(function*() {
    const log = yield* EventLog
    if (!Array.isArray(keys)) {
      yield* log.registerReactivity(keys as any)
      return
    }
    const obj: Record<string, ReadonlyArray<string>> = {}
    for (const tag in group.events) {
      obj[tag] = keys
    }
    yield* log.registerReactivity(obj)
  }).pipe(
    Layer.scopedDiscard,
    Layer.provide(layerEventLog)
  )

/**
 * @since 1.0.0
 * @category layers
 */
export class Registry extends Context.Tag("@effect/experimental/EventLog/Registry")<
  Registry,
  {
    readonly add: (handlers: Handlers.Any) => Effect.Effect<void>
    readonly handlers: Effect.Effect<Record.ReadonlyRecord<string, Handlers.Item<any>>>
  }
>() {
  /**
   * @since 1.0.0
   */
  static layer = Layer.sync(Registry, () => {
    const items: Record<string, Handlers.Item<any>> = {}

    return {
      add: (handlers: Handlers<any, never>) =>
        Effect.sync(() => {
          for (const tag in handlers.handlers) {
            items[tag] = handlers.handlers[tag]
          }
        }),
      handlers: Effect.sync(() => items)
    } as any
  })
}

/**
 * @since 1.0.0
 * @category tags
 */
export class Identity extends Context.Tag("@effect/experimental/EventLog/Identity")<Identity, {
  readonly publicKey: string
  readonly privateKey: Redacted.Redacted<Uint8Array>
}>() {
  /**
   * @since 1.0.0
   */
  static makeRandom() {
    return Identity.of({
      publicKey: crypto.randomUUID(),
      privateKey: Redacted.make(crypto.getRandomValues(new Uint8Array(32)))
    })
  }
  /**
   * @since 1.0.0
   */
  static readonly Schema = Schema.Struct({
    publicKey: Schema.String,
    privateKey: Schema.Redacted(Schema.Uint8ArrayFromBase64)
  })
  /**
   * @since 1.0.0
   */
  static readonly SchemaFromString = Schema.StringFromBase64Url.pipe(
    Schema.compose(Schema.parseJson(this.Schema))
  )

  /**
   * @since 1.0.0
   */
  static decodeString = (s: string): Identity["Type"] => Schema.decodeSync(Identity.SchemaFromString)(s)
  /**
   * @since 1.0.0
   */
  static encodeString = (identity: Identity["Type"]): string => Schema.encodeSync(Identity.SchemaFromString)(identity)
}

/**
 * Generates a random `Identity` and stores it in a `KeyValueStore`.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerIdentityKvs = (options: {
  readonly key: string
}): Layer.Layer<Identity, ParseResult.ParseError | Error.PlatformError, KeyValueStore.KeyValueStore> =>
  Layer.effect(
    Identity,
    Effect.gen(function*() {
      const store = (yield* KeyValueStore.KeyValueStore).forSchema(Identity.Schema)
      const current = yield* store.get(options.key)
      if (Option.isSome(current)) {
        return current.value
      }
      const identity = Identity.makeRandom()
      yield* store.set(options.key, identity)
      return identity
    })
  )

/**
 * @since 1.0.0
 * @category tags
 */
export class EventLog extends Context.Tag("@effect/experimental/EventLog/EventLog")<EventLog, {
  readonly write: <Groups extends EventGroup.Any, Tag extends Event.Tag<EventGroup.Events<Groups>>>(options: {
    readonly schema: EventLogSchema<Groups>
    readonly event: Tag
    readonly payload: Event.PayloadWithTag<EventGroup.Events<Groups>, Tag>
  }) => Effect.Effect<
    Event.SuccessWithTag<EventGroup.Events<Groups>, Tag>,
    Event.ErrorWithTag<EventGroup.Events<Groups>, Tag> | EventJournalError
  >
  readonly registerRemote: (remote: EventLogRemote) => Effect.Effect<void, never, Scope>
  readonly registerCompaction: (options: {
    readonly events: ReadonlyArray<string>
    readonly effect: (options: {
      readonly entries: ReadonlyArray<Entry>
      readonly write: (entry: Entry) => Effect.Effect<void>
    }) => Effect.Effect<void>
  }) => Effect.Effect<void, never, Scope>
  readonly registerReactivity: (keys: Record<string, ReadonlyArray<string>>) => Effect.Effect<void, never, Scope>
  readonly entries: Effect.Effect<ReadonlyArray<Entry>, EventJournalError>
  readonly destroy: Effect.Effect<void, EventJournalError>
}>() {}

const make = Effect.gen(function*() {
  const identity = yield* Identity
  const registry = yield* Registry
  const journal = yield* EventJournal
  const handlers = yield* registry.handlers
  const remotes = yield* FiberMap.make<RemoteId>()
  const compactors = new Map<string, {
    readonly events: ReadonlySet<string>
    readonly effect: (options: {
      readonly entries: ReadonlyArray<Entry>
      readonly write: (entry: Entry) => Effect.Effect<void>
    }) => Effect.Effect<void>
  }>()
  const journalSemaphore = yield* Effect.makeSemaphore(1)

  const reactivity = yield* Reactivity.Reactivity
  const reactivityKeys: Record<string, ReadonlyArray<string>> = {}

  const runRemote = Effect.fnUntraced(
    function*(remote: EventLogRemote) {
      const startSequence = yield* journal.nextRemoteSequence(remote.id)
      const changes = yield* remote.changes(identity, startSequence)

      yield* changes.takeAll.pipe(
        Effect.flatMap(([entries]) =>
          journal.writeFromRemote({
            remoteId: remote.id,
            entries: Chunk.toReadonlyArray(entries),
            compact: compactors.size > 0 ?
              Effect.fnUntraced(function*(remoteEntries) {
                let unprocessed = remoteEntries as Array<RemoteEntry>
                const brackets: Array<[Array<Entry>, Array<RemoteEntry>]> = []
                let uncompacted: Array<Entry> = []
                let uncompactedRemote: Array<RemoteEntry> = []
                while (true) {
                  let i = 0
                  for (; i < unprocessed.length; i++) {
                    const remoteEntry = unprocessed[i]
                    if (!compactors.has(remoteEntry.entry.event)) {
                      uncompacted.push(remoteEntry.entry)
                      uncompactedRemote.push(remoteEntry)
                      continue
                    }
                    if (uncompacted.length > 0) {
                      brackets.push([uncompacted, uncompactedRemote])
                      uncompacted = []
                      uncompactedRemote = []
                    }
                    const compactor = compactors.get(remoteEntry.entry.event)!
                    const entry = remoteEntry.entry
                    const entries = [entry]
                    const remoteEntries = [remoteEntry]
                    const compacted: Array<Entry> = []
                    const currentEntries = unprocessed
                    unprocessed = []
                    for (let j = i + 1; j < currentEntries.length; j++) {
                      const nextRemoteEntry = currentEntries[j]
                      if (!compactor.events.has(nextRemoteEntry.entry.event)) {
                        unprocessed.push(nextRemoteEntry)
                        continue
                      }
                      entries.push(nextRemoteEntry.entry)
                      remoteEntries.push(nextRemoteEntry)
                    }
                    yield* compactor.effect({
                      entries,
                      write(entry) {
                        return Effect.sync(() => {
                          compacted.push(entry)
                        })
                      }
                    })
                    brackets.push([compacted, remoteEntries])
                    break
                  }
                  if (i === unprocessed.length) {
                    brackets.push([unprocessed.map((_) => _.entry), unprocessed])
                    break
                  }
                }
                return brackets
              }) :
              undefined,
            effect: Effect.fnUntraced(
              function*({ conflicts, entry }) {
                const handler = handlers[entry.event]
                if (!handler) {
                  return yield* Effect.logDebug(`Event handler not found for: "${entry.event}"`)
                }
                const decodePayload = Schema.decode(
                  handlers[entry.event].event.payloadMsgPack as unknown as Schema.Schema<any>
                )
                const decodedConflicts: Array<{ entry: Entry; payload: any }> = new Array(conflicts.length)
                for (let i = 0; i < conflicts.length; i++) {
                  decodedConflicts[i] = {
                    entry: conflicts[i],
                    payload: yield* decodePayload(conflicts[i].payload)
                  }
                }
                yield* handler.handler({
                  payload: yield* decodePayload(entry.payload),
                  entry,
                  conflicts: decodedConflicts
                })
                if (reactivityKeys[entry.event]) {
                  for (const key of reactivityKeys[entry.event]) {
                    reactivity.unsafeInvalidate({
                      [key]: [entry.primaryKey]
                    })
                  }
                }
              },
              Effect.catchAllCause(Effect.log),
              (effect, { entry }) =>
                Effect.annotateLogs(effect, {
                  service: "EventLog",
                  effect: "writeFromRemote",
                  entryId: entry.idString
                })
            )
          }).pipe(journalSemaphore.withPermits(1))
        ),
        Effect.catchAllCause(Effect.log),
        Effect.forever,
        Effect.annotateLogs({
          service: "EventLog",
          effect: "runRemote consume"
        }),
        Effect.fork
      )

      const write = journal.withRemoteUncommited(remote.id, (entries) => remote.write(identity, entries))
      yield* Effect.addFinalizer(() => Effect.ignore(write))
      yield* write
      return yield* Queue.takeBetween(yield* journal.changes, 1, Number.MAX_SAFE_INTEGER).pipe(
        Effect.zipRight(Effect.sleep(500)),
        Effect.zipRight(write),
        Effect.catchAllCause(Effect.log),
        Effect.forever
      )
    },
    Effect.scoped,
    Effect.provideService(Identity, identity),
    Effect.interruptible
  )

  const writeHandler = Effect.fnUntraced(function*(handler: Handlers.Item<any>, options: {
    readonly schema: EventLogSchema<any>
    readonly event: string
    readonly payload: any
  }) {
    const payload = yield* Effect.orDie(
      Schema.encode(handlers[options.event].event.payloadMsgPack as unknown as Schema.Schema<Uint8Array>)(
        options.payload
      )
    )
    return yield* journalSemaphore.withPermits(1)(journal.write({
      event: options.event,
      primaryKey: handler.event.primaryKey(options.payload),
      payload,
      effect: (entry) =>
        Effect.tap(
          handler.handler({
            payload: options.payload,
            entry,
            conflicts: []
          }),
          () => {
            if (reactivityKeys[entry.event]) {
              for (const key of reactivityKeys[entry.event]) {
                reactivity.unsafeInvalidate({
                  [key]: [entry.primaryKey]
                })
              }
            }
          }
        )
    }))
  }, (effect, handler) => Effect.mapInputContext(effect, (context) => Context.merge(handler.context, context)))

  return EventLog.of({
    write: (options: {
      readonly schema: EventLogSchema<any>
      readonly event: string
      readonly payload: any
    }) => {
      const handler = handlers[options.event]
      if (handler === undefined) {
        return Effect.die(`Event handler not found for: "${options.event}"`)
      }
      return writeHandler(handler, options) as any
    },
    entries: journal.entries,
    registerRemote: (remote) =>
      Effect.acquireRelease(
        FiberMap.run(remotes, remote.id, runRemote(remote)),
        () => FiberMap.remove(remotes, remote.id)
      ),
    registerCompaction: (options) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const events = new Set(options.events)
          const compactor = {
            events,
            effect: options.effect
          }
          for (const event of options.events) {
            compactors.set(event, compactor)
          }
        }),
        () =>
          Effect.sync(() => {
            for (const event of options.events) {
              compactors.delete(event)
            }
          })
      ),
    registerReactivity: (keys) =>
      Effect.sync(() => {
        Object.assign(reactivityKeys, keys)
      }),
    destroy: journal.destroy
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layerEventLog: Layer.Layer<EventLog, never, EventJournal | Identity> = Layer.scoped(EventLog, make).pipe(
  Layer.provide([Registry.layer, Reactivity.layer])
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = <Groups extends EventGroup.Any>(_schema: EventLogSchema<Groups>): Layer.Layer<
  EventLog,
  never,
  EventGroup.ToService<Groups> | EventJournal | Identity
> => layerEventLog as any

/**
 * @since 1.0.0
 * @category client
 */
export const makeClient = <Groups extends EventGroup.Any>(
  schema: EventLogSchema<Groups>
): Effect.Effect<
  (<Tag extends Event.Tag<EventGroup.Events<Groups>>>(
    event: Tag,
    payload: Event.PayloadWithTag<EventGroup.Events<Groups>, Tag>
  ) => Effect.Effect<
    Event.SuccessWithTag<EventGroup.Events<Groups>, Tag>,
    Event.ErrorWithTag<EventGroup.Events<Groups>, Tag> | EventJournalError
  >),
  never,
  EventLog
> =>
  Effect.gen(function*() {
    const log = yield* EventLog

    return <Tag extends Event.Tag<EventGroup.Events<Groups>>>(
      event: Tag,
      payload: Event.PayloadWithTag<EventGroup.Events<Groups>, Tag>
    ): Effect.Effect<
      Event.SuccessWithTag<EventGroup.Events<Groups>, Tag>,
      Event.ErrorWithTag<EventGroup.Events<Groups>, Tag> | EventJournalError
    > => log.write({ schema, event, payload })
  })
