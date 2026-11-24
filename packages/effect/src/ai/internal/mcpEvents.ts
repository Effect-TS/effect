/**
 * The Events extension (SEP-3415): wire schemas on revision 2026-07-28 and
 * the delivery loop behind a push stream.
 */
import * as Cause from "../../Cause.ts"
import * as Clock from "../../Clock.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"
import * as Queue from "../../Queue.ts"
import * as Result from "../../Result.ts"
import * as Rpc from "../../rpc/Rpc.ts"
import * as RpcGroup from "../../rpc/RpcGroup.ts"
import * as Schema from "../../Schema.ts"
import * as Stream from "../../Stream.ts"
import * as PublicMcpSchema from "../McpSchema.ts"
import type * as McpCore from "./mcpCore.ts"
import * as Stateless from "./mcpSchema/v2026_07_28.ts"

const EXTENSION_ID = "io.modelcontextprotocol/events"

/**
 * Adds the extension declaration while any event type is registered. The
 * server sends no `notifications/events/list_changed`, so its settings object
 * is empty.
 *
 * @internal
 */
export const declareExtension = <A>(
  extensions: Readonly<Record<string, A>> | undefined,
  servesEvents: boolean
): Readonly<Record<string, A | {}>> | undefined => servesEvents ? { ...extensions, [EXTENSION_ID]: {} } : extensions

/**
 * @internal
 */
export const unsupportedDelivery = (value: PublicMcpSchema.EventDelivery) =>
  new PublicMcpSchema.Unsupported({
    message: `Delivery mode '${value}' is not supported for this event`,
    data: { feature: "deliveryMode", value }
  })

// =============================================================================
// Wire schemas
// =============================================================================

const optional = Stateless.optional
const Cursor = Schema.NullOr(Schema.String)
const NonNegativeInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

/**
 * @internal
 */
export const ListEventsResult = Schema.StructWithRest(
  Schema.Struct({ ...Stateless.PaginatedResult, events: Schema.Array(PublicMcpSchema.EventDescriptor) }),
  [Stateless.UnknownObject]
)

/**
 * @internal
 */
export class ListEvents extends Rpc.make("events/list", {
  success: ListEventsResult,
  error: Stateless.McpError,
  payload: Stateless.PaginatedRequestParams
}) {}

const SubscriptionParams = {
  ...Stateless.RequestParams.fields,
  name: Schema.String,
  arguments: optional(Stateless.UnknownObject),
  cursor: optional(Cursor),
  maxAgeMs: optional(NonNegativeInt)
}

/**
 * @internal
 */
export const PollEventsResult = Schema.StructWithRest(
  Schema.Struct({
    ...Stateless.ResultMeta,
    events: Schema.Array(PublicMcpSchema.EventOccurrence),
    cursor: Cursor,
    truncated: Schema.Boolean,
    hasMore: Schema.Boolean,
    nextPollMs: NonNegativeInt
  }),
  [Stateless.UnknownObject]
)

/**
 * @internal
 */
export class PollEvents extends Rpc.make("events/poll", {
  success: PollEventsResult,
  error: Stateless.McpError,
  payload: { ...SubscriptionParams, maxEvents: optional(Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))) }
}) {}

/**
 * @internal
 */
export class StreamEvents extends Rpc.make("events/stream", {
  success: Stateless.SubscriptionsListenResult,
  error: Stateless.McpError,
  payload: { ...SubscriptionParams, heartbeatMs: optional(NonNegativeInt) }
}) {}

/**
 * @internal
 */
export class SubscribeEvents extends Rpc.make("events/subscribe", {
  success: Schema.StructWithRest(
    Schema.Struct({
      ...Stateless.ResultMeta,
      id: Schema.String,
      refreshBefore: Schema.NullOr(Schema.String),
      cursor: Cursor,
      truncated: Schema.Boolean
    }),
    [Stateless.UnknownObject]
  ),
  error: Stateless.McpError,
  payload: {
    ...SubscriptionParams,
    delivery: Stateless.UnknownObject,
    ttlMs: optional(Schema.NullOr(NonNegativeInt))
  }
}) {}

/**
 * @internal
 */
export class UnsubscribeEvents extends Rpc.make("events/unsubscribe", {
  success: Schema.StructWithRest(Schema.Struct(Stateless.ResultMeta), [Stateless.UnknownObject]),
  error: Stateless.McpError,
  payload: {
    ...Stateless.RequestParams.fields,
    name: Schema.String,
    arguments: optional(Stateless.UnknownObject),
    delivery: Stateless.UnknownObject
  }
}) {}

/**
 * @internal
 */
export class EventsActiveNotification extends Rpc.make("notifications/events/active", {
  payload: {
    ...Stateless.NotificationParams.fields,
    cursor: Cursor,
    truncated: Schema.Boolean,
    heartbeatMs: NonNegativeInt
  }
}) {}

/**
 * @internal
 */
export class EventsEventNotification extends Rpc.make("notifications/events/event", {
  payload: { ...PublicMcpSchema.EventOccurrence.fields, ...Stateless.NotificationParams.fields }
}) {}

/**
 * @internal
 */
export class EventsHeartbeatNotification extends Rpc.make("notifications/events/heartbeat", {
  payload: { ...Stateless.NotificationParams.fields, cursor: Cursor }
}) {}

/**
 * @internal
 */
export class EventsErrorNotification extends Rpc.make("notifications/events/error", {
  payload: { ...Stateless.NotificationParams.fields, error: Stateless.McpError }
}) {}

/**
 * @internal
 */
export class EventsTerminatedNotification extends Rpc.make("notifications/events/terminated", {
  payload: { ...Stateless.NotificationParams.fields, error: Stateless.McpError }
}) {}

/**
 * The extension's requests on revision 2026-07-28.
 *
 * @internal
 */
export class StatelessRpcs
  extends RpcGroup.make(ListEvents, PollEvents, StreamEvents, SubscribeEvents, UnsubscribeEvents)
{}

/**
 * The notifications a push stream carries.
 *
 * @internal
 */
export class ServerNotificationRpcs extends RpcGroup.make(
  EventsActiveNotification,
  EventsEventNotification,
  EventsHeartbeatNotification,
  EventsErrorNotification,
  EventsTerminatedNotification
) {}

// =============================================================================
// Push delivery
// =============================================================================

const DEFAULT_HEARTBEAT_MS = 30_000
const MIN_HEARTBEAT_MS = 1_000
const MAX_HEARTBEAT_MS = 300_000
// Occurrences the handler may run ahead of a slow client before it waits.
const PENDING_ITEMS = 16

/**
 * The heartbeat interval granted for a suggested one.
 *
 * @internal
 */
export const grantHeartbeat = (suggested: number | undefined): number =>
  Math.min(MAX_HEARTBEAT_MS, Math.max(MIN_HEARTBEAT_MS, suggested ?? DEFAULT_HEARTBEAT_MS))

const isJson = Schema.is(Schema.Json)

/**
 * @internal
 */
export const wireError = (failure: McpCore.EventFailure): Stateless.McpError => ({
  code: failure.code,
  message: failure.message,
  ...(failure.data !== undefined && isJson(failure.data) ? { data: failure.data } : {})
})

/**
 * Sends `notifications/events/active`, then each occurrence, and a heartbeat
 * with the position checked so far whenever `heartbeatMs` passes without
 * another message. A failure of the subscription's items ends it with
 * `notifications/events/terminated`. `send` adds the subscription id.
 *
 * @internal
 */
export const deliver = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly subscription: McpCore.EventSubscription
  readonly heartbeatMs: number
  readonly send: (tag: string, payload: Readonly<Record<string, unknown>>) => Effect.Effect<void>
}) {
  const { heartbeatMs, name, subscription } = options
  let cursor = subscription.cursor
  // Measured from the last message sent: a Position changes the cursor but sends nothing.
  let sentAt = 0
  const send = (tag: string, payload: Readonly<Record<string, unknown>>) =>
    options.send(tag, payload).pipe(
      Effect.andThen(Clock.currentTimeMillis),
      Effect.map((at) => {
        sentAt = at
      })
    )
  const active = (truncated: boolean) => send(EventsActiveNotification._tag, { cursor, truncated, heartbeatMs })
  yield* active(subscription.truncated)
  const items = yield* Stream.toQueue(subscription.items, { capacity: PENDING_ITEMS })
  while (true) {
    const wait = Math.max(0, sentAt + heartbeatMs - (yield* Clock.currentTimeMillis))
    const next = yield* Queue.take(items).pipe(Effect.timeoutOption(Duration.millis(wait)), Effect.result)
    if (Result.isFailure(next)) {
      if (!Cause.isDone(next.failure)) {
        yield* send(EventsTerminatedNotification._tag, { error: wireError(next.failure) })
      }
      return
    }
    if (Option.isNone(next.success)) {
      yield* send(EventsHeartbeatNotification._tag, { cursor })
      continue
    }
    const item = next.success.value
    switch (item._tag) {
      case "Event": {
        cursor = item.cursor
        const { _tag, ...occurrence } = item
        yield* send(EventsEventNotification._tag, { ...occurrence, name })
        break
      }
      case "Position": {
        cursor = item.cursor
        break
      }
      case "Gap": {
        cursor = item.cursor
        yield* active(true)
        break
      }
      case "Error": {
        yield* send(EventsErrorNotification._tag, { error: wireError(item.error) })
        break
      }
    }
  }
}, Effect.scoped)
