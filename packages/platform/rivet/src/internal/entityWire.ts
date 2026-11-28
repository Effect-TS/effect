/** @internal */
import * as EntityAddress from "effect/cluster/EntityAddress"
import * as EntityId from "effect/cluster/EntityId"
import * as EntityType from "effect/cluster/EntityType"
import * as Envelope from "effect/cluster/Envelope"
import * as Reply from "effect/cluster/Reply"
import * as ShardId from "effect/cluster/ShardId"
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Headers from "effect/http/Headers"
import * as Rpc from "effect/rpc/Rpc"
import * as Schema from "effect/Schema"
import type { EntityRegistration } from "./entityRegistry.ts"

type EncodedRequest = Extract<Envelope.Encoded, { readonly _tag: "Request" }>

/**
 * Result of the `clusterEntity` actor's `invoke` action.
 *
 * @internal
 */
export type EntityInvokeResult = {
  readonly _tag: "Success"
  readonly requestId: string
  readonly replies: ReadonlyArray<string>
} | {
  readonly _tag: "MailboxFull"
} | {
  readonly _tag: "EncodedMessageTooLarge"
} | {
  readonly _tag: "AskDeduplicatedToTell"
}

/**
 * The result of an `invoke` action. Constructed in the actor as this
 * schema's `Type` (its JSON encoding is the identity) and decoded once on the
 * caller side.
 *
 * @internal
 */
export const InvokeResult = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal("Success"),
    requestId: Schema.String,
    replies: Schema.Array(Schema.String)
  }),
  Schema.Struct({ _tag: Schema.Literal("MailboxFull") }),
  Schema.Struct({ _tag: Schema.Literal("EncodedMessageTooLarge") }),
  Schema.Struct({ _tag: Schema.Literal("AskDeduplicatedToTell") })
]) satisfies Schema.Codec<EntityInvokeResult>

/** @internal */
export const decodeInvokeResult = (value: unknown): Effect.Effect<EntityInvokeResult> =>
  Effect.orDie(Schema.decodeUnknownEffect(InvokeResult)(value))

const EnvelopePeek = Schema.Struct({ tag: Schema.optional(Schema.String) })

/**
 * Reads the RPC tag out of a stored envelope without decoding the payload,
 * for rows whose full decode already failed.
 *
 * @internal
 */
export const peekEnvelopeTag = (envelopeText: string): Effect.Effect<string | undefined> =>
  Schema.decodeUnknownEffect(EnvelopePeek)(JSON.parse(envelopeText)).pipe(
    Effect.match({ onFailure: () => undefined, onSuccess: ({ tag }) => tag })
  )

/** @internal */
export const runWith = <A>(
  effect: Effect.Effect<A, any, any>,
  context: Context.Context<never>
): Effect.Effect<A> => effect.pipe(Effect.provideContext(context as any), Effect.orDie) as Effect.Effect<A>

/** @internal */
export const encodeRequest = (options: {
  readonly requestId: string
  readonly address: EntityAddress.EntityAddress
  readonly tag: string
  readonly payload: unknown
  readonly headers: unknown
  readonly traceId?: string | undefined
  readonly spanId?: string | undefined
  readonly sampled?: boolean | undefined
}): string =>
  JSON.stringify({
    _tag: "Request",
    requestId: options.requestId,
    address: {
      shardId: options.address.shardId,
      entityType: options.address.entityType,
      entityId: options.address.entityId
    },
    tag: options.tag,
    payload: options.payload,
    headers: options.headers,
    ...(options.traceId === undefined ? undefined : {
      traceId: options.traceId,
      spanId: options.spanId,
      sampled: options.sampled
    })
  })

/** @internal */
export const decodeRequest = (
  registration: EntityRegistration,
  envelopeText: string
): Effect.Effect<Envelope.Request.Any> =>
  runWith(
    Effect.gen(function*() {
      const encoded = JSON.parse(envelopeText) as EncodedRequest
      if (encoded._tag !== "Request" || typeof encoded.requestId !== "string") {
        return yield* Effect.die("Expected an encoded Request envelope")
      }
      const rpc = registration.entity.protocol.requests.get(encoded.tag) as Rpc.AnyWithProps | undefined
      if (rpc === undefined) return yield* Effect.die(`Unknown entity RPC tag: ${encoded.tag}`)
      const payload = yield* Schema.decodeUnknownEffect(Schema.toCodecJson(rpc.payloadSchema))(encoded.payload)
      return Envelope.makeRequest({
        requestId: encoded.requestId as any,
        address: EntityAddress.make({
          shardId: ShardId.make(encoded.address.shardId.group, encoded.address.shardId.id),
          entityType: EntityType.make(encoded.address.entityType),
          entityId: EntityId.make(encoded.address.entityId)
        }),
        tag: encoded.tag,
        payload,
        headers: Headers.fromInput(encoded.headers),
        ...(encoded.traceId === undefined ? undefined : {
          traceId: encoded.traceId,
          spanId: encoded.spanId!,
          sampled: encoded.sampled!
        })
      }) as Envelope.Request.Any
    }),
    registration.context
  )

/**
 * Stream RPCs are rejected before they run, so every reply is a `WithExit`.
 *
 * @internal
 */
export const encodeReplyFor = (
  registration: EntityRegistration,
  rpc: Rpc.AnyWithProps,
  reply: Reply.WithExit<any>
): Effect.Effect<string> =>
  runWith(
    Effect.map(
      Schema.encodeUnknownEffect(Schema.toCodecJson(Rpc.exitSchema(rpc)))(reply.exit),
      (exit) => JSON.stringify({ _tag: "WithExit", requestId: String(reply.requestId), id: String(reply.id), exit })
    ),
    registration.context
  )

/** @internal */
export const decodeReplyFor = (
  rpc: Rpc.AnyWithProps,
  context: Context.Context<never>,
  replyText: string
): Effect.Effect<Reply.WithExit<any>> => {
  const encoded = JSON.parse(replyText) as Reply.Encoded
  if (encoded._tag !== "WithExit") return Effect.die("RivetCluster: unexpected stream chunk")
  return runWith(
    Effect.map(
      Schema.decodeUnknownEffect(Schema.toCodecJson(Rpc.exitSchema(rpc)))(encoded.exit),
      (exit) => new Reply.WithExit({ requestId: encoded.requestId as any, id: encoded.id as any, exit: exit as any })
    ),
    context
  )
}
