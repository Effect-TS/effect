/** @internal */
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import * as EntityId from "effect/unstable/cluster/EntityId"
import * as EntityType from "effect/unstable/cluster/EntityType"
import * as Envelope from "effect/unstable/cluster/Envelope"
import * as Reply from "effect/unstable/cluster/Reply"
import * as ShardId from "effect/unstable/cluster/ShardId"
import * as Headers from "effect/unstable/http/Headers"
import * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcSchema from "effect/unstable/rpc/RpcSchema"
import type { EntityRegistration } from "./entityRegistry.ts"

type EncodedRequest = Extract<Envelope.Encoded, { readonly _tag: "Request" }>

/** @internal */
export const decodeRequest = (
  registration: EntityRegistration,
  envelopeText: string
): Effect.Effect<Envelope.Request.Any> =>
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
  }).pipe(Effect.provideContext(registration.context as any), Effect.orDie) as Effect.Effect<Envelope.Request.Any>

/** @internal */
export const encodeReplyFor = (
  registration: EntityRegistration,
  rpc: Rpc.AnyWithProps,
  reply: Reply.Reply<any>
): Effect.Effect<string> => {
  if (reply._tag === "WithExit") {
    return Effect.map(
      Schema.encodeUnknownEffect(Schema.toCodecJson(Rpc.exitSchema(rpc)))(reply.exit),
      (exit) => JSON.stringify({ _tag: "WithExit", requestId: String(reply.requestId), id: String(reply.id), exit })
    ).pipe(
      Effect.provideContext(registration.context as any),
      Effect.orDie
    ) as Effect.Effect<string>
  }
  if (!RpcSchema.isStreamSchema(rpc.successSchema)) {
    return Effect.die(`Expected a stream RPC: ${rpc._tag}`)
  }
  return Effect.map(
    Schema.encodeUnknownEffect(Schema.toCodecJson(Schema.NonEmptyArray(rpc.successSchema.success)))(reply.values),
    (values) =>
      JSON.stringify({
        _tag: "Chunk" as const,
        requestId: String(reply.requestId),
        id: String(reply.id),
        sequence: reply.sequence,
        values
      })
  ).pipe(
    Effect.provideContext(registration.context as any),
    Effect.orDie
  ) as Effect.Effect<string>
}

/** @internal */
export const decodeReplyFor = (
  rpc: Rpc.AnyWithProps,
  context: Context.Context<never>,
  replyText: string
): Effect.Effect<Reply.Reply<any>> => {
  const encoded = JSON.parse(replyText) as Reply.Encoded
  if (encoded._tag === "WithExit") {
    return Effect.map(
      Schema.decodeUnknownEffect(Schema.toCodecJson(Rpc.exitSchema(rpc)))(encoded.exit),
      (exit) => new Reply.WithExit({ requestId: encoded.requestId as any, id: encoded.id as any, exit: exit as any })
    ).pipe(Effect.provideContext(context as any), Effect.orDie) as Effect.Effect<Reply.Reply<any>>
  }
  if (!RpcSchema.isStreamSchema(rpc.successSchema)) {
    return Effect.die(`Expected a stream RPC: ${rpc._tag}`)
  }
  return Effect.map(
    Schema.decodeUnknownEffect(Schema.toCodecJson(Schema.NonEmptyArray(rpc.successSchema.success)))(encoded.values),
    (values) =>
      new Reply.Chunk({
        requestId: encoded.requestId as any,
        id: encoded.id as any,
        sequence: encoded.sequence,
        values
      })
  ).pipe(Effect.provideContext(context as any), Effect.orDie) as Effect.Effect<Reply.Reply<any>>
}
