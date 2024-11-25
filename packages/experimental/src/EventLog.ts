/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FiberMap from "effect/FiberMap"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import type * as Record from "effect/Record"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import type { Covariant } from "effect/Types"
import type { Event } from "./Event.js"
import type { EventGroup } from "./EventGroup.js"
import type { EntryId, EventJournalError, RemoteId } from "./EventJournal.js"
import { Entry, EventJournal, makeEntryId } from "./EventJournal.js"
import { EventLogEncryption } from "./EventLogEncryption.js"
import { type EventLogRemote } from "./EventLogRemote.js"

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
): Layer.Layer<Event.ToService<Events>, Handlers.Error<Return>, Handlers.Context<Return>> =>
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
    Layer.effectDiscard,
    Layer.provide(Registry.layer)
  ) as any

/**
 * @since 1.0.0
 * @category compaction
 */
export const groupCompaction = <Events extends Event.Any, R>(
  group: EventGroup<Events>,
  options: {
    readonly effect: (options: {
      readonly primaryKey: string
      readonly entries: {
        readonly [Tag in Event.Tag<Events>]: Array<Entry>
      }
      readonly events: {
        readonly [Tag in Event.Tag<Events>]: Array<Event.PayloadWithTag<Events, Tag>>
      }
      readonly write: <Tag extends Event.Tag<Events>>(
        options: {
          readonly tag: Tag
          readonly payload: Event.PayloadWithTag<Events, Tag>
          readonly timestamp?: DateTime.Utc | undefined
        }
      ) => Effect.Effect<void>
    }) => Effect.Effect<void, never, R>
    readonly before?: Duration.DurationInput | undefined
  }
): Layer.Layer<never, never, EventJournal | EventLogEncryption | R | Event.Context<Events>> =>
  Effect.gen(function*() {
    const journal = yield* EventJournal
    const before = options.before ? Duration.decode(options.before) : Duration.zero
    const eventNames = Object.keys(group.events)
    const msgPackArraySchemas = Object.fromEntries(
      Object.entries(group.events).map(([tag, event]) =>
        [tag, Schema.Array((event as unknown as Event.AnyWithProps).payloadMsgPack)] as const
      )
    )
    const encryption = yield* EventLogEncryption

    const deadline = (yield* DateTime.now).pipe(
      DateTime.subtractDuration(before)
    )
    const entries = yield* journal.forEvents({
      events: eventNames,
      before: deadline
    })
    if (entries.length <= 1) return

    const entryIds: Array<EntryId> = []
    const byPrimaryKey = new Map<string, Record<string, Array<Entry>>>()
    for (const entry of entries) {
      entryIds.push(entry.id)

      if (byPrimaryKey.has(entry.primaryKey)) {
        const record = byPrimaryKey.get(entry.primaryKey)!
        if (record[entry.event]) {
          record[entry.event].push(entry)
        } else {
          record[entry.event] = [entry]
        }
      } else {
        byPrimaryKey.set(entry.primaryKey, {
          [entry.event]: [entry]
        })
      }
    }
    const toCreate: Record<
      string,
      Array<{
        readonly tag: string
        readonly payload: any
        readonly timestamp?: DateTime.Utc | undefined
      }>
    > = {}
    const write = (options: {
      readonly tag: string
      readonly payload: any
      readonly timestamp?: DateTime.Utc | undefined
    }) =>
      Effect.sync(() => {
        if (toCreate[options.tag]) {
          toCreate[options.tag].push(options)
        } else {
          toCreate[options.tag] = [options]
        }
      })
    for (const [primaryKey, record] of byPrimaryKey) {
      const payloadsRecord: Record<string, ReadonlyArray<any>> = {}
      for (const [event, entries] of Object.entries(record)) {
        const payloads = yield* (Schema.decode(msgPackArraySchemas[event])(entries.map((entry) =>
          entry.payload
        )) as Effect.Effect<Array<any>>)
        payloadsRecord[event] = payloads
      }
      for (const event of Object.keys(group.events)) {
        payloadsRecord[event] ??= []
      }
      yield* options.effect({
        entries: record as any,
        events: payloadsRecord as any,
        primaryKey,
        write
      })
    }
    const entriesToCreate: Array<Entry> = []
    for (const [event, options] of Object.entries(toCreate)) {
      const encodedPayloads = yield* (Schema.encode(msgPackArraySchemas[event])(options.map((_) =>
        _.payload
      )) as Effect.Effect<ReadonlyArray<Uint8Array>>)
      for (let i = 0; i < encodedPayloads.length; i++) {
        const { payload, timestamp } = options[i]
        const primaryKey = (group.events[event] as any as Event.AnyWithProps).primaryKey(payload)
        // to create a deterministic entry id
        const hash = yield* encryption.sha256(new TextEncoder().encode(`${event}:${primaryKey}`))
        entriesToCreate.push(
          new Entry({
            id: makeEntryId({
              timestamp: timestamp ? timestamp.epochMillis : deadline.epochMillis,
              payload: hash
            }),
            event,
            payload: encodedPayloads[i],
            primaryKey: (group.events[event] as any as Event.AnyWithProps).primaryKey(payload)
          })
        )
      }
    }
    yield* journal.remove(entryIds)
    yield* journal.writeEntries(entriesToCreate)
  }).pipe(
    Effect.orDie,
    Effect.annotateLogs({
      service: "EventLog",
      fiber: "groupCompaction"
    }),
    Layer.scopedDiscard
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
}>() {}

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
  readonly entries: Effect.Effect<ReadonlyArray<Entry>, EventJournalError>
  readonly destroy: Effect.Effect<void, EventJournalError>
}>() {}

const make = Effect.gen(function*() {
  const identity = yield* Identity
  const registry = yield* Registry
  const journal = yield* EventJournal
  const handlers = yield* registry.handlers
  const remotes = yield* FiberMap.make<RemoteId>()
  const journalSemaphore = yield* Effect.makeSemaphore(1)

  const runRemote = (remote: EventLogRemote) =>
    Effect.gen(function*() {
      const startSequence = yield* journal.nextRemoteSequence(remote.id)
      const changes = yield* remote.changes(identity, startSequence)

      yield* changes.takeAll.pipe(
        Effect.tap(([entries]) =>
          journal.writeFromRemote({
            remoteId: remote.id,
            entries: Chunk.toReadonlyArray(entries),
            effect: ({ conflicts, entry }) => {
              const handler = handlers[entry.event]
              if (!handler) return Effect.logDebug(`Event handler not found for: "${entry.event}"`)
              const decodePayload = Schema.decode(
                handlers[entry.event].event.payloadMsgPack as unknown as Schema.Schema<any>
              )
              return Effect.gen(function*() {
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
              }).pipe(
                Effect.catchAllCause(Effect.log),
                Effect.annotateLogs({
                  service: "EventLog",
                  effect: "writeFromRemote",
                  entryId: entry.idString
                })
              )
            }
          }).pipe(
            journalSemaphore.withPermits(1),
            Effect.catchAllCause(Effect.logDebug)
          )
        ),
        Effect.forever,
        Effect.fork,
        Effect.annotateLogs({
          service: "EventLog",
          fiber: "runRemote changes"
        })
      )

      yield* (yield* journal.removals).takeBetween(1, Number.MAX_SAFE_INTEGER).pipe(
        Effect.flatMap((ids) => remote.remove(identity, ids)),
        Effect.catchAllCause(Effect.logDebug),
        Effect.forever,
        Effect.fork
      )

      const write = journal.withRemoteUncommited(remote.id, (entries) => remote.write(identity, entries))
      yield* Effect.addFinalizer(() => Effect.ignore(write))
      yield* write
      yield* Queue.takeBetween(yield* journal.changes, 1, Number.MAX_SAFE_INTEGER).pipe(
        Effect.zipRight(Effect.sleep(500)),
        Effect.zipRight(write),
        Effect.catchAllCause(Effect.logDebug),
        Effect.forever
      )
    }).pipe(
      Effect.scoped,
      Effect.provideService(Identity, identity),
      Effect.interruptible
    )

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
      return Effect.gen(function*() {
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
            handler.handler({
              payload: options.payload,
              entry,
              conflicts: []
            })
        }))
      }).pipe(
        Effect.mapInputContext((context) => Context.merge(handler.context, context))
      )
    },
    entries: journal.entries,
    registerRemote: (remote) =>
      Effect.gen(function*() {
        yield* Effect.acquireRelease(
          FiberMap.run(remotes, remote.id, runRemote(remote)),
          () => FiberMap.remove(remotes, remote.id)
        )
      }),
    destroy: journal.destroy
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layerEventLog: Layer.Layer<EventLog, never, EventJournal | Identity> = Layer.scoped(EventLog, make).pipe(
  Layer.provide(Registry.layer)
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
