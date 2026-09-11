import { EntityAddress, EntityId, EntityType, Envelope, Message, Reply, ShardId, Snowflake } from "@effect/cluster"
import { Headers } from "@effect/platform"
import { Rpc, RpcSchema } from "@effect/rpc"
import { Context, Effect, Exit, Option, PrimaryKey, Schema } from "effect"

export const GetUserRpc = Rpc.make("GetUser", {
  payload: { id: Schema.Number }
})

export const makeRequest = Effect.fnUntraced(function*(options?: {
  readonly rpc?: Rpc.AnyWithProps
  readonly payload?: any
}) {
  const snowflake = yield* Snowflake.Generator
  const rpc = options?.rpc ?? GetUserRpc
  return new Message.OutgoingRequest({
    envelope: Envelope.makeRequest<any>({
      requestId: snowflake.unsafeNext(),
      address: EntityAddress.EntityAddress.make({
        shardId: ShardId.make("default", 1),
        entityType: EntityType.EntityType.make("test"),
        entityId: EntityId.EntityId.make("1")
      }),
      tag: rpc._tag,
      payload: options?.payload ?? { id: 123 },
      traceId: "noop",
      spanId: "noop",
      sampled: false,
      headers: Headers.empty
    }),
    context: Context.empty() as any,
    rpc,
    lastReceivedReply: Option.none(),
    respond() {
      return Effect.void
    }
  })
})

export class PrimaryKeyTest extends Schema.TaggedRequest<PrimaryKeyTest>()("PrimaryKeyTest", {
  success: Schema.Void,
  failure: Schema.Never,
  payload: {
    id: Schema.Number
  }
}) {
  [PrimaryKey.symbol]() {
    return this.id.toString()
  }
}

export class LongKeyTest extends Schema.TaggedRequest<LongKeyTest>()("LongKeyTest", {
  success: Schema.Void,
  failure: Schema.Never,
  payload: { id: Schema.String }
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

export const LongKeyRpc = Rpc.fromTaggedRequest(LongKeyTest)

export class StreamTest extends Schema.TaggedRequest<StreamTest>()("StreamTest", {
  success: RpcSchema.Stream({
    success: Schema.Void,
    failure: Schema.Never
  }),
  failure: Schema.Never,
  payload: {
    id: Schema.Number
  }
}) {
  [PrimaryKey.symbol]() {
    return this.id.toString()
  }
}
export const StreamRpc = Rpc.fromTaggedRequest(StreamTest)

export const makeReply = Effect.fnUntraced(function*(request: Message.OutgoingRequest<any>) {
  const snowflake = yield* Snowflake.Generator
  return new Reply.ReplyWithContext({
    reply: new Reply.WithExit({
      id: snowflake.unsafeNext(),
      requestId: request.envelope.requestId,
      exit: Exit.void as any
    }),
    context: request.context,
    rpc: request.rpc
  })
})

export const makeAckChunk = Effect.fnUntraced(function*(
  request: Message.OutgoingRequest<any>,
  chunk: Reply.ReplyWithContext<any>
) {
  const snowflake = yield* Snowflake.Generator
  return new Message.OutgoingEnvelope({
    envelope: new Envelope.AckChunk({
      id: snowflake.unsafeNext(),
      address: request.envelope.address,
      requestId: chunk.reply.requestId,
      replyId: chunk.reply.id
    }),
    rpc: request.rpc
  })
})

export const makeChunkReply = Effect.fnUntraced(function*(request: Message.OutgoingRequest<any>, sequence = 0) {
  const snowflake = yield* Snowflake.Generator
  return new Reply.ReplyWithContext({
    reply: new Reply.Chunk({
      id: snowflake.unsafeNext(),
      requestId: request.envelope.requestId,
      sequence,
      values: [undefined]
    }),
    context: request.context,
    rpc: request.rpc
  })
})

export const makeEmptyReply = (request: Message.OutgoingRequest<any>) => {
  return new Reply.ReplyWithContext({
    reply: Reply.Chunk.emptyFrom(request.envelope.requestId),
    context: request.context,
    rpc: request.rpc
  })
}
