import { NodeCrypto, NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import type * as McpSchema from "effect/ai/McpSchema"
import * as McpTasks from "effect/ai/McpTasks"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as ClusterWorkflowEngine from "effect/cluster/ClusterWorkflowEngine"
import * as Sharding from "effect/cluster/Sharding"
import * as SingleRunner from "effect/cluster/SingleRunner"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as SqlClient from "effect/sql/SqlClient"
import { TestClock } from "effect/testing"
import * as Activity from "effect/workflow/Activity"
import * as WorkflowEngine from "effect/workflow/WorkflowEngine"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import {
  assertMcpTaskAcknowledgement,
  McpCreatedTask,
  McpTaskSnapshot,
  readMcpHttpResponse
} from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

const Report = Tool.make("report", { parameters: Tool.EmptyParams, success: Schema.String })

const tools = Toolkit.make(Report)

type Handler = Effect.Effect<
  string,
  never,
  WorkflowEngine.WorkflowEngine | WorkflowEngine.WorkflowInstance | McpSchema.McpRequestContext | McpTasks.TaskContext
>

const database = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const directory = yield* fs.makeTempDirectoryScoped()
  const filename = `${directory}/tasks.sqlite`
  return { first: yield* SqliteClient.make({ filename }), second: yield* SqliteClient.make({ filename }) }
}).pipe(Effect.provide([NodeFileSystem.layer, Reactivity.layer]))

const open = Effect.fnUntraced(function*(
  client: SqlClient.SqlClient,
  run: Handler
) {
  const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
  const context = yield* Layer.build(ClusterWorkflowEngine.layer.pipe(
    Layer.provideMerge(SingleRunner.layer({
      runnerStorage: "memory",
      shardingConfig: {
        shardsPerGroup: 4,
        availableShardGroups: ["default", "workflow"],
        assignedShardGroups: ["default", "workflow"],
        entityTerminationTimeout: 0,
        refreshAssignmentsInterval: 10,
        shardLockRefreshInterval: 10,
        shardLockExpiration: 1000,
        entityMessagePollInterval: 10,
        sendRetryInterval: 10
      }
    })),
    Layer.provide(NodeCrypto.layer),
    Layer.provide(Layer.succeed(SqlClient.SqlClient, client))
  )).pipe(Scope.provide(scope))
  const engine = Context.get(context, WorkflowEngine.WorkflowEngine)
  const sharding = Context.get(context, Sharding.Sharding)
  const registration = McpTasks.toolkit(tools, { owner: "shared" }).pipe(
    Layer.provide(McpTasks.layerWorkflow(tools, { report: () => run }, { name: "sql-reports" })),
    Layer.provide(Layer.succeed(WorkflowEngine.WorkflowEngine, engine)),
    Layer.provideMerge(makeServerLayer({ name: "SqlTasks", protocols: [McpProtocol.v2026_07_28] }))
  )
  const harness = yield* makeHttpHarness(registration).pipe(Scope.provide(scope))
  const drive = Effect.fnUntraced(function*<A, E, R>(effect: Effect.Effect<A, E, R>) {
    const fiber = yield* Effect.forkChild(effect, { startImmediately: true })
    for (let attempt = 0; attempt < 300; attempt++) {
      yield* TestClock.adjust(10)
      yield* sharding.pollStorage
      const exit = fiber.pollUnsafe()
      if (exit) return yield* exit
    }
    return yield* Effect.die("MCP task operation did not finish")
  })
  const request = (method: string, params: Record<string, unknown>) =>
    drive(Effect.gen(function*() {
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: {
          ...params,
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {
              extensions: { "io.modelcontextprotocol/tasks": {} },
              roots: {}
            },
            "io.modelcontextprotocol/clientInfo": { name: "alice", version: "1" }
          }
        }
      }, {
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": method,
        "Mcp-Name": String(params.name ?? params.taskId ?? "")
      })
      return yield* readMcpHttpResponse(response)
    }))
  const get = (taskId: string) =>
    Effect.flatMap(
      request("tasks/get", { taskId }),
      Schema.decodeUnknownEffect(Schema.Struct({
        result: McpTaskSnapshot
      }))
    ).pipe(Effect.map((response) => response.result))
  const waitFor = Effect.fnUntraced(function*(taskId: string, status: string) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const task = yield* get(taskId)
      if (task.status === status) return task
    }
    return assert.fail(`Task did not reach ${status}`)
  })
  const start = Effect.gen(function*() {
    const response = yield* request("tools/call", { name: "report", arguments: {} })
    assert.isTrue(typeof response === "object" && response !== null && "result" in response, JSON.stringify(response))
    return (yield* Schema.decodeUnknownEffect(Schema.Struct({ result: McpCreatedTask }))(response)).result
  })
  return { start, get, request, waitFor, close: Scope.close(scope, Exit.void) }
})

// Each stage has a wall-clock budget, so a stall fails with the stage's name and
// the timings of the stages before it. Slow runs log their timings.
const STAGE_BUDGET_MS = 8_000
const SLOW_TEST_MS = 4_000
const TEST_TIMEOUT_MS = 30_000

const makeStages = () => {
  const timings: Array<string> = []
  const testStarted = performance.now()
  const stage = <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) =>
    Effect.suspend(() => {
      const started = performance.now()
      return Effect.raceFirst(
        effect,
        TestClock.withLive(Effect.sleep(STAGE_BUDGET_MS)).pipe(
          Effect.andThen(Effect.die(
            new Error(
              `SQL stage "${name}" did not finish within ${STAGE_BUDGET_MS}ms; earlier stages: ${
                timings.join(", ") || "none"
              }`
            )
          ))
        )
      ).pipe(Effect.tap(() => Effect.sync(() => timings.push(`${name} ${Math.round(performance.now() - started)}ms`))))
    })
  const report = Effect.suspend(() => {
    const total = Math.round(performance.now() - testStarted)
    if (total > SLOW_TEST_MS) process.stderr.write(`SQL stages took ${total}ms: ${timings.join(", ")}\n`)
    return Effect.void
  })
  return { stage, report }
}

describe("SQL reconstruction", () => {
  it.effect(
    "should retain the result when a completed task is read by a reconstructed runner",
    () =>
      Effect.gen(function*() {
        const { stage, report } = makeStages()
        const db = yield* stage("open database", database)
        let runs = 0
        const handler = Effect.sync(() => {
          runs++
          return "report ready"
        })
        const first = yield* stage("build first runner", open(db.first, handler))
        const created = yield* stage("create task", first.start)
        const completed = yield* stage("poll until completed", first.waitFor(created.taskId, "completed"))
        yield* stage("close first runner", first.close)
        const second = yield* stage("build second runner", open(db.second, handler))
        assert.deepStrictEqual(yield* stage("read on second runner", second.get(created.taskId)), completed)
        assert.strictEqual(runs, 1)
        yield* stage("close second runner", second.close)
        yield* report
      }),
    TEST_TIMEOUT_MS
  )

  it.effect(
    "should resume pending input and status when a reconstructed runner receives the answer",
    () =>
      Effect.gen(function*() {
        const { stage, report } = makeStages()
        const db = yield* stage("open database", database)
        let checkpoints = 0
        const handler = Effect.gen(function*() {
          const task = yield* McpTasks.TaskContext
          yield* Activity.make({ name: "prepare", execute: Effect.sync(() => checkpoints++) })
          yield* task.setStatusMessage("Choose workspace roots")
          const roots = yield* task.requestInput({
            key: "roots",
            request: { method: "roots/list" },
            response: Schema.Struct({ roots: Schema.Array(Schema.Struct({ uri: Schema.String })) })
          }).pipe(Effect.orDie)
          return roots.roots[0]?.uri ?? "none"
        })
        const first = yield* stage("build first runner", open(db.first, handler))
        const created = yield* stage("create task", first.start)
        const waiting = yield* stage("poll until input_required", first.waitFor(created.taskId, "input_required"))
        assert.strictEqual(waiting.statusMessage, "Choose workspace roots")
        if (waiting.status === "input_required") {
          assert.deepStrictEqual(waiting.inputRequests, { roots: { method: "roots/list" } })
        }
        yield* stage("close first runner", first.close)

        const second = yield* stage("build second runner", open(db.second, handler))
        assert.deepStrictEqual(yield* stage("read on second runner", second.get(created.taskId)), waiting)
        assertMcpTaskAcknowledgement(
          yield* stage(
            "answer input",
            second.request("tasks/update", {
              taskId: created.taskId,
              inputResponses: { roots: { roots: [{ uri: "file:///workspace" }] } }
            })
          )
        )
        const completed = yield* stage("poll until completed", second.waitFor(created.taskId, "completed"))
        if (completed.status === "completed") {
          assert.strictEqual(completed.result.structuredContent, "file:///workspace")
        }
        assert.strictEqual(checkpoints, 1)
        yield* stage("close second runner", second.close)
        yield* report
      }),
    TEST_TIMEOUT_MS
  )
})
