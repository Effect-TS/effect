export { ClusterDurableQueue, ClusterSingleton } from "@effect/platform-cloudflare/CloudflareDurableObjects"
import {
  ClusterEntity as BaseClusterEntity,
  ClusterWorkflow as BaseClusterWorkflow
} from "@effect/platform-cloudflare/CloudflareDurableObjects"
import { encodeName } from "@effect/platform-cloudflare/internal/clusterName"
import { registerEntity } from "@effect/platform-cloudflare/internal/entityRegistry"
import { decodeResult, encodePayload } from "@effect/platform-cloudflare/internal/workflowWire"
import { Context, Deferred, Effect, Exit, Schema, Stream } from "effect"
import { ClusterSchema, Entity } from "effect/unstable/cluster"
import { Rpc, RpcSchema } from "effect/unstable/rpc"
import { Workflow } from "effect/unstable/workflow"

const FixtureWorkflow = Workflow.make("User", {
  payload: {},
  idempotencyKey: () => "fixture"
})
export class ClusterWorkflow extends BaseClusterWorkflow.make({
  workflows: FixtureWorkflow.toLayer(() => Effect.void)
}) {}

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
type ScheduledRow = {
  readonly request_id: string
  readonly message_id: string | null
  readonly processed: number
  readonly deliver_at: number | null
  readonly reply_to: string | null
}

export class ClusterEntity extends BaseClusterEntity {
  readonly #testState: TestDurableObjectState

  constructor(ctx: TestDurableObjectState, env: unknown) {
    super(ctx, env)
    this.#testState = ctx
    entityEnv = env as Record<string, any>
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

  scheduledRows(): Array<ScheduledRow> {
    return this.#testState.storage.sql.exec<ScheduledRow>(
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

// The Durable Object env, captured on construction so entity handlers can
// invoke other entities through the CLUSTER_ENTITY namespace.
let entityEnv: Record<string, any> | undefined

const requestEnvelope = (entityType: string, entityId: string, tag: string) =>
  JSON.stringify({
    _tag: "Request",
    requestId: crypto.randomUUID(),
    address: {
      shardId: { group: "default", id: 1 },
      entityType,
      entityId
    },
    tag,
    payload: null,
    headers: {}
  })

const invokeValue = (
  namespace: { getByName: (name: string) => any },
  entityType: string,
  entityId: string,
  tag: string
): Promise<string> =>
  namespace
    .getByName(encodeName(entityType, entityId))
    .invoke(requestEnvelope(entityType, entityId, tag), false)
    .then((result: { readonly replies: ReadonlyArray<string> }) => String(JSON.parse(result.replies[0]).exit.value))

const askEntity = (entityType: string, entityId: string, tag: string) =>
  Effect.promise(() => invokeValue(entityEnv!.CLUSTER_ENTITY, entityType, entityId, tag))

const gates = new Map<string, Deferred.Deferred<void>>()
const gateKey = (address: { readonly entityType: string; readonly entityId: string }) =>
  `${address.entityType}/${address.entityId}`
const registerGateEntity = (
  type: string,
  options: { readonly concurrency?: number | "unbounded" } | undefined
) => {
  const entity = Entity.make(type, [
    Rpc.make("WaitTurn", { success: Schema.String }),
    Rpc.make("Open", { success: Schema.String })
  ])
  registerEntity(type, {
    entity,
    build: Effect.succeed(entity.of({
      WaitTurn: (request) =>
        Effect.gen(function*() {
          const gate = Deferred.makeUnsafe<void>()
          gates.set(gateKey(request.address), gate)
          return yield* Effect.race(
            Effect.as(Deferred.await(gate), "opened"),
            Effect.as(Effect.sleep(1000), "timeout")
          ).pipe(Effect.ensuring(Effect.sync(() => gates.delete(gateKey(request.address)))))
        }),
      Open: (request) =>
        Effect.sync(() => {
          const gate = gates.get(gateKey(request.address))
          if (gate === undefined) return "no-waiter"
          Deferred.doneUnsafe(gate, Effect.void)
          return "opened"
        })
    })),
    options,
    context: Context.empty()
  })
}
registerGateEntity("GateSerial", undefined)
registerGateEntity("GateConcurrent", { concurrency: 2 })
registerGateEntity("GateUnbounded", { concurrency: "unbounded" })

const CycleA = Entity.make("CycleA", [
  Rpc.make("Start", { success: Schema.String }),
  Rpc.make("Answer", { success: Schema.String })
])
const CycleB = Entity.make("CycleB", [
  Rpc.make("Forward", { success: Schema.String })
])
registerEntity("CycleA", {
  entity: CycleA,
  build: Effect.succeed(CycleA.of({
    Start: (request) =>
      Effect.map(
        askEntity("CycleB", request.address.entityId, "Forward"),
        (value) => `cycle:${value}`
      ),
    Answer: () => Effect.succeed("pong")
  })),
  options: { concurrency: 2 },
  context: Context.empty()
})
registerEntity("CycleB", {
  entity: CycleB,
  build: Effect.succeed(CycleB.of({
    Forward: (request) => askEntity("CycleA", request.address.entityId, "Answer")
  })),
  options: undefined,
  context: Context.empty()
})

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
    if (url.pathname === "/workflow-run") {
      const id = url.searchParams.get("id") ?? "fixture"
      const payload = await Effect.runPromise(encodePayload(FixtureWorkflow, {}, Context.empty()))
      const stub = env.CLUSTER_WORKFLOW.getByName(encodeName("User", id))
      const text = await stub.run(payload, { discard: false })
      const result = await Effect.runPromise(decodeResult(FixtureWorkflow, text, Context.empty()))
      return result._tag === "Complete" && Exit.isSuccess(result.exit)
        ? Response.json({ status: "complete" })
        : Response.json({ status: "failed" })
    }
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
    if (url.pathname === "/gate") {
      const type = url.searchParams.get("type") ?? "GateSerial"
      const id = url.searchParams.get("id") ?? "gate"
      const wait = invokeValue(env.CLUSTER_ENTITY, type, id, "WaitTurn")
      await new Promise((resolve) => setTimeout(resolve, 100))
      const open = await invokeValue(env.CLUSTER_ENTITY, type, id, "Open")
      return Response.json({ wait: await wait, open })
    }
    if (url.pathname === "/cycle") {
      const id = url.searchParams.get("id") ?? "cycle"
      return Response.json({ value: await invokeValue(env.CLUSTER_ENTITY, "CycleA", id, "Start") })
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
