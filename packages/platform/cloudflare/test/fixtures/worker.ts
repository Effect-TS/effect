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

  scheduledRows(): Array<Record<string, unknown>> {
    return this.#testState.storage.sql.exec(
      `SELECT request_id, message_id, processed, deliver_at, reply_to
       FROM cluster_messages
       ORDER BY rowid ASC`
    ).toArray()
  }

  getAlarm(): Promise<number | null> {
    return this.#testState.storage.getAlarm()
  }

  override async deliverReply(requestId: string, reply: string): Promise<boolean> {
    await this.#testState.storage.put("test-delayed-reply", { requestId, reply })
    return super.deliverReply(requestId, reply)
  }

  delayedReply(): Promise<{ readonly requestId: string; readonly reply: string } | undefined> {
    return this.#testState.storage.get("test-delayed-reply")
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
    if (url.pathname === "/scheduled-rows") {
      const id = url.searchParams.get("id") ?? "scheduled"
      const stub = env.CLUSTER_ENTITY.getByName(`7:Mailbox${id}`)
      return Response.json({ rows: await stub.scheduledRows(), alarm: await stub.getAlarm() })
    }
    if (url.pathname === "/delayed-reply") {
      const id = url.searchParams.get("id") ?? "caller"
      const stub = env.CLUSTER_ENTITY.getByName(`7:Mailbox${id}`)
      return Response.json({ reply: await stub.delayedReply() })
    }
    if (url.pathname === "/delayed") {
      const id = url.searchParams.get("id") ?? "scheduled"
      const operationId = url.searchParams.get("operationId") ?? "operation"
      const discard = url.searchParams.get("discard") === "true"
      const deliverAt = Number(url.searchParams.get("deliverAt"))
      const requestId = crypto.randomUUID()
      const stub = env.CLUSTER_ENTITY.getByName(`7:Mailbox${id}`)
      const result = await stub.invoke(
        JSON.stringify({
          _tag: "Request",
          requestId,
          address: {
            shardId: { group: "default", id: 1 },
            entityType: "Mailbox",
            entityId: id
          },
          tag: "Add",
          payload: { operationId },
          headers: {}
        }),
        discard,
        {
          deliverAt,
          primaryKey: `Mailbox/${id}/Add/${operationId}`,
          ...(url.searchParams.get("replyTo") === null
            ? undefined
            : { replyTo: url.searchParams.get("replyTo") })
        }
      )
      return Response.json(result)
    }
    if (url.pathname === "/interrupt-delayed") {
      const id = url.searchParams.get("id") ?? "interrupted"
      const deliverAt = Date.now() + 60_000
      const firstRequestId = crypto.randomUUID()
      const secondRequestId = crypto.randomUUID()
      const stub = env.CLUSTER_ENTITY.getByName(`7:Mailbox${id}`)
      const invoke = (requestId: string) =>
        stub.invoke(
          JSON.stringify({
            _tag: "Request",
            requestId,
            address: {
              shardId: { group: "default", id: 1 },
              entityType: "Mailbox",
              entityId: id
            },
            tag: "Add",
            payload: { operationId: "same" },
            headers: {}
          }),
          false,
          { deliverAt, primaryKey: `Mailbox/${id}/Add/same` }
        )
      const first = invoke(firstRequestId)
      const second = invoke(secondRequestId)
      await new Promise((resolve) => setTimeout(resolve, 50))
      await stub.interrupt(firstRequestId, secondRequestId)
      const secondStatus = await Promise.race([
        second.then(() => "resolved", () => "rejected"),
        new Promise<string>((resolve) => setTimeout(() => resolve("pending"), 250))
      ])
      const firstStatus = await Promise.race([
        first.then(() => "settled", () => "settled"),
        new Promise<string>((resolve) => setTimeout(() => resolve("pending"), 50))
      ])
      await stub.interrupt(firstRequestId, firstRequestId)
      await Promise.allSettled([first, second])
      return Response.json({ firstStatus, secondStatus })
    }
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
      const id = url.searchParams.get("id") ?? "counter"
      const stub = env.CLUSTER_ENTITY.getByName(`7:Mailbox${id}`)
      const tag = url.searchParams.get("tag") ?? "Get"
      const operationId = url.searchParams.get("operationId") ?? "operation"
      const requestId = crypto.randomUUID()
      const discardParam = url.searchParams.get("discard")
      const discard = discardParam === null ? tag === "Add" || tag === "AddVolatile" : discardParam === "true"
      try {
        const result = await stub.invoke(
          JSON.stringify({
            _tag: "Request",
            requestId,
            address: {
              shardId: { group: "default", id: 1 },
              entityType: "Mailbox",
              entityId: id
            },
            tag,
            payload: tag === "Get" || tag === "Watch" ? null : { operationId },
            headers: {}
          }),
          discard
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
    const defaultName = binding === "CLUSTER_SINGLETON" ? "Singleton/test" : "4:User42"
    const stub = namespace.getByName(url.searchParams.get("name") ?? defaultName)
    try {
      await stub.fetch(request)
      return new Response("expected the object to reject direct fetch", { status: 500 })
    } catch (error) {
      return new Response(String(error), { status: 200 })
    }
  }
}
