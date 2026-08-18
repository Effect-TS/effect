export {
  ClusterDurableQueue,
  ClusterSingleton,
  ClusterWorkflow
} from "@effect/platform-cloudflare/CloudflareDurableObjects"
import { ClusterEntity as BaseClusterEntity } from "@effect/platform-cloudflare/CloudflareDurableObjects"
import { registerEntity } from "@effect/platform-cloudflare/internal/entityRegistry"
import { Context, Effect, Schema, Stream } from "effect"
import { ClusterSchema, Entity } from "effect/unstable/cluster"
import { Rpc, RpcSchema } from "effect/unstable/rpc"

const Add = Rpc.make("Add", {
  payload: { operationId: Schema.String },
  primaryKey: ({ operationId }) => operationId
}).annotate(ClusterSchema.Persisted, true)
const AddVolatile = Rpc.make("AddVolatile", {
  payload: { operationId: Schema.String }
})
const Get = Rpc.make("Get", { success: Schema.Number })
const Watch = Rpc.make("Watch", {
  success: RpcSchema.Stream(Schema.Number, Schema.Never)
}).annotate(ClusterSchema.Persisted, true)
const Mailbox = Entity.make("Mailbox", [Add, AddVolatile, Get, Watch])
const values = new Map<string, number>()
type TestDurableObjectState = ConstructorParameters<typeof BaseClusterEntity>[0]

export class ClusterEntity extends BaseClusterEntity {
  readonly #testState: TestDurableObjectState

  constructor(ctx: TestDurableObjectState, env: unknown) {
    super(ctx, env)
    this.#testState = ctx
  }

  seedPoison(envelope: string): void {
    const requestId = JSON.parse(envelope).requestId
    this.#testState.storage.sql.exec(
      `INSERT INTO cluster_messages (request_id, message_id, envelope, discard, processed, last_reply_id)
       VALUES (?, NULL, ?, 0, 0, NULL)`,
      requestId,
      envelope
    )
  }
}

registerEntity("Mailbox", {
  entity: Mailbox,
  build: Effect.succeed(Mailbox.of({
    Add: (request) =>
      Effect.sync(() => {
        values.set(request.address.entityId, (values.get(request.address.entityId) ?? 0) + 1)
      }),
    AddVolatile: (request) =>
      Effect.sync(() => {
        values.set(request.address.entityId, (values.get(request.address.entityId) ?? 0) + 1)
      }),
    Get: (request) => Effect.sync(() => values.get(request.address.entityId) ?? 0),
    Watch: (request) =>
      Stream.fromIterable([1, 2]).pipe(
        Stream.rechunk(1),
        Stream.tap((value) =>
          Effect.sync(() => {
            values.set(request.address.entityId, value)
          })
        )
      )
  })),
  options: undefined,
  context: Context.empty()
})

export default {
  async fetch(request: Request, env: Record<string, any>): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === "/seed-poison") {
      const stub = env.CLUSTER_ENTITY.getByName("7:Mailboxcounter")
      await stub.seedPoison(JSON.stringify({
        _tag: "Request",
        requestId: crypto.randomUUID(),
        address: {
          shardId: { group: "default", id: 1 },
          entityType: "Mailbox",
          entityId: "counter"
        },
        tag: "Add",
        payload: { operationId: 123 },
        headers: {}
      }))
      return new Response("seeded")
    }
    if (url.pathname === "/ack") {
      const stub = env.CLUSTER_ENTITY.getByName("7:Mailboxcounter")
      return Response.json(
        await stub.acknowledge(
          url.searchParams.get("requestId"),
          url.searchParams.get("replyId")
        )
      )
    }
    if (url.pathname === "/mailbox") {
      const stub = env.CLUSTER_ENTITY.getByName("7:Mailboxcounter")
      const tag = url.searchParams.get("tag") ?? "Get"
      const operationId = url.searchParams.get("operationId") ?? "operation"
      const requestId = crypto.randomUUID()
      try {
        const result = await stub.invoke(
          JSON.stringify({
            _tag: "Request",
            requestId,
            address: {
              shardId: { group: "default", id: 1 },
              entityType: "Mailbox",
              entityId: "counter"
            },
            tag,
            payload: tag === "Get" || tag === "Watch" ? null : { operationId },
            headers: {}
          }),
          tag === "Add" || tag === "AddVolatile"
        )
        return Response.json(result)
      } catch (error) {
        return new Response(error instanceof Error ? `${error.stack}\n${String(error.cause)}` : String(error), {
          status: 599
        })
      }
    }
    const binding = url.pathname.slice(1)
    const namespace = env[binding]
    if (namespace === undefined) {
      return new Response(`unknown binding: ${binding}`, { status: 404 })
    }
    const stub = namespace.getByName(url.searchParams.get("name") ?? "4:User42")
    try {
      await stub.fetch(request)
      return new Response("expected the object to reject direct fetch", { status: 500 })
    } catch (error) {
      return new Response(String(error), { status: 200 })
    }
  }
}
