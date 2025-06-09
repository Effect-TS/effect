import type { Envelope } from "@effect/cluster"
import { ClusterSchema, Entity } from "@effect/cluster"
import type { RpcGroup } from "@effect/rpc"
import { Rpc, RpcSchema } from "@effect/rpc"
import { Effect, Layer, Mailbox, MutableRef, Option, PrimaryKey, Schedule, Schema, Stream } from "effect"

export class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

export class StreamWithKey extends Schema.TaggedRequest<StreamWithKey>()("StreamWithKey", {
  success: RpcSchema.Stream({
    success: Schema.Number,
    failure: Schema.Never
  }),
  failure: Schema.Never,
  payload: { key: Schema.String }
}) {
  [PrimaryKey.symbol]() {
    return this.key
  }
}

export const TestEntity = Entity.make("TestEntity", [
  Rpc.make("GetUser", {
    success: User,
    payload: { id: Schema.Number }
  }),
  Rpc.make("GetUserVolatile", {
    success: User,
    payload: { id: Schema.Number }
  }).annotate(ClusterSchema.Persisted, false),
  Rpc.make("Never"),
  Rpc.make("NeverFork"),
  Rpc.make("NeverVolatile").annotate(ClusterSchema.Persisted, false),
  Rpc.make("RequestWithKey", {
    payload: { key: Schema.String },
    primaryKey: ({ key }) => key
  }),
  Rpc.fromTaggedRequest(StreamWithKey),
  Rpc.make("GetAllUsers", {
    success: User,
    payload: { ids: Schema.Array(Schema.Number) },
    stream: true
  })
]).annotateRpcs(ClusterSchema.Persisted, true)

export class TestEntityState extends Effect.Service<TestEntityState>()("TestEntityState", {
  effect: Effect.gen(function*() {
    const messages = yield* Mailbox.make<void>()
    const streamMessages = yield* Mailbox.make<void>()
    const envelopes = yield* Mailbox.make<
      RpcGroup.Rpcs<typeof TestEntity.protocol> extends infer R ? R extends Rpc.Any ? Envelope.Request<R> : never
        : never
    >()
    const interrupts = yield* Mailbox.make<
      RpcGroup.Rpcs<typeof TestEntity.protocol> extends infer R ? R extends Rpc.Any ? Envelope.Request<R> : never
        : never
    >()
    const defectTrigger = MutableRef.make(false)
    const layerBuilds = MutableRef.make(0)

    return {
      messages,
      streamMessages,
      envelopes,
      interrupts,
      defectTrigger,
      layerBuilds
    } as const
  })
}) {}

export const TestEntityNoState = TestEntity.toLayer(
  Effect.gen(function*() {
    const state = yield* TestEntityState

    MutableRef.update(state.layerBuilds, (count) => count + 1)

    const never = (envelope: any) =>
      Effect.suspend(() => {
        state.envelopes.unsafeOffer(envelope)
        return Effect.never
      }).pipe(Effect.onInterrupt(() => {
        state.interrupts.unsafeOffer(envelope)
        return Effect.void
      }))
    return {
      GetUser: (envelope) =>
        Effect.sync(() => {
          state.envelopes.unsafeOffer(envelope)
          if (state.defectTrigger.current) {
            MutableRef.set(state.defectTrigger, false)
            throw new Error("User not found")
          }
          return new User({ id: envelope.payload.id, name: `User ${envelope.payload.id}` })
        }),
      GetUserVolatile: (envelope) =>
        Effect.sync(() => {
          state.envelopes.unsafeOffer(envelope)
          return new User({ id: envelope.payload.id, name: `User ${envelope.payload.id}` })
        }),
      Never: never,
      NeverFork: (envelope) => Rpc.fork(never(envelope)),
      NeverVolatile: never,
      RequestWithKey: (envelope) => {
        state.envelopes.unsafeOffer(envelope)
        return Effect.orDie(state.messages.take)
      },
      StreamWithKey: (envelope) => {
        let sequence = envelope.lastSentChunkValue.pipe(
          Option.map((value) => value + 1),
          Option.getOrElse(() => 0)
        )
        return Mailbox.toStream(state.streamMessages).pipe(
          Stream.map(() => sequence++)
        )
      },
      GetAllUsers: (envelope) => {
        state.envelopes.unsafeOffer(envelope)
        return Stream.fromIterable(envelope.payload.ids.map((id) => new User({ id, name: `User ${id}` }))).pipe(
          Stream.rechunk(1)
        )
      }
    }
  }),
  { defectRetryPolicy: Schedule.forever }
)

export const TestEntityLayer = TestEntityNoState.pipe(Layer.provideMerge(TestEntityState.Default))
