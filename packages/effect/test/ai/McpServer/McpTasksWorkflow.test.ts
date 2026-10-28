import { NodeCrypto, NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpTasks from "effect/ai/McpTasks"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as ClusterWorkflowEngine from "effect/cluster/ClusterWorkflowEngine"
import * as Sharding from "effect/cluster/Sharding"
import * as SingleRunner from "effect/cluster/SingleRunner"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as Scope from "effect/Scope"
import * as SqlClient from "effect/sql/SqlClient"
import { TestClock } from "effect/testing"
import * as Activity from "effect/workflow/Activity"
import * as DurableClock from "effect/workflow/DurableClock"
import * as DurableDeferred from "effect/workflow/DurableDeferred"
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

const resume = DurableDeferred.make("report/resume", { success: Schema.Void })

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
  run: Handler,
  wrapEngine: (engine: WorkflowEngine.WorkflowEngine["Service"]) => WorkflowEngine.WorkflowEngine["Service"] = (
    engine
  ) => engine
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
  const engine = wrapEngine(Context.get(context, WorkflowEngine.WorkflowEngine))
  const sharding = Context.get(context, Sharding.Sharding)
  const resumeToken = yield* Deferred.make<DurableDeferred.Token>()
  const registration = McpTasks.toolkit(tools, {
    owner: McpSchema.McpRequestContext.use((request) => Effect.succeed(request.clientInfo?.name ?? "anonymous"))
  }).pipe(Layer.provide(McpTasks.layerWorkflow(tools, {
    report: Effect.fnUntraced(function*() {
      yield* Deferred.succeed(resumeToken, yield* DurableDeferred.token(resume))
      return yield* run
    })
  }, { name: "sql-reports" }))).pipe(
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
  const request = (method: string, params: Record<string, unknown>, owner = "alice") =>
    drive(Effect.gen(function*() {
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: {
          ...params,
          _meta: {
            tenant: method === "tools/call" ? "acme" : "polling-client",
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {
              extensions: { "io.modelcontextprotocol/tasks": {} },
              roots: {},
              elicitation: { form: {} }
            },
            "io.modelcontextprotocol/clientInfo": { name: owner, version: "1" }
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
  const waitFor = Effect.fnUntraced(
    function*(
      taskId: string,
      status: string | ReadonlyArray<string>,
      accept?: (task: typeof McpTaskSnapshot.Type) => boolean
    ) {
      let last
      for (let attempt = 0; attempt < 100; attempt++) {
        const task = yield* get(taskId)
        last = task
        if (
          (typeof status === "string" ? task.status === status : status.includes(task.status)) &&
          (!accept || accept(task))
        ) return task
      }
      return assert.fail(`Task did not reach ${status}: ${JSON.stringify(last)}`)
    }
  )
  const start = Effect.gen(function*() {
    const response = yield* request("tools/call", { name: "report", arguments: {} })
    assert.isTrue(typeof response === "object" && response !== null && "result" in response, JSON.stringify(response))
    return (yield* Schema.decodeUnknownEffect(Schema.Struct({ result: McpCreatedTask }))(response)).result
  })
  const release = (token: DurableDeferred.Token) =>
    drive(
      DurableDeferred.succeed(resume, { token, value: undefined }).pipe(
        Effect.provideService(WorkflowEngine.WorkflowEngine, engine)
      )
    )
  return {
    start,
    engine,
    drive,
    get,
    request,
    waitFor,
    release,
    resumeToken: Deferred.await(resumeToken),
    close: Scope.close(scope, Exit.void)
  }
})

const rootsInput = {
  key: "roots",
  request: { method: "roots/list" as const },
  response: Schema.Struct({ roots: Schema.Array(Schema.Struct({ uri: Schema.String })).check(Schema.isMinLength(1)) })
}

const checkError = Effect.fnUntraced(function*(body: unknown, code = -32602) {
  const decoded = yield* Schema.decodeUnknownEffect(Schema.Struct({ error: McpSchema.McpErrorBase }))(body)
  assert.strictEqual(decoded.error.code, code)
})

// Public Workflow execution contracts; SQL reconstruction owns persistence separately.
const runWorkflow = Effect.fnUntraced(function*<A, E, R>(effect: Effect.Effect<A, E, R>) {
  const fiber = yield* effect.pipe(Effect.forkChild)
  for (let attempt = 0; attempt < 300; attempt++) {
    yield* TestClock.adjust("10 millis")
    if (fiber.pollUnsafe()) return yield* Fiber.join(fiber)
  }
  return assert.fail("Workflow execution did not finish with virtual time")
})

const waitForExecution = Effect.fnUntraced(
  function*(
    execution: McpTasks.Execution["Service"],
    request: McpTasks.TaskRequest,
    accept: (task: McpTasks.Task) => boolean
  ) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const task = yield* execution.get(request)
      if (accept(task)) return task
      yield* TestClock.adjust("10 millis")
    }
    return assert.fail("Workflow task did not reach the expected state")
  }
)

describe("SQL reconstruction", () => {
  // Owner: public Workflow persistence across runner reconstruction; general protocol cases live in McpTasks.test.ts.
  // Related protocol: readable creation: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-creation
  // Related protocol: durable input receipt: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-update-requests
  it.effect("should retain the result and timestamps when a completed SQL task is read by a reconstructed runner", () =>
    Effect.gen(function*() {
      const db = yield* database
      let runs = 0
      const handler = Effect.sync(() => {
        runs++
        return "report ready"
      })
      const first = yield* open(db.first, handler)
      const created = yield* first.start
      const completed = yield* first.waitFor(created.taskId, "completed")
      yield* first.close
      const second = yield* open(db.second, handler)
      const recovered = yield* second.get(created.taskId)
      assert.deepStrictEqual(recovered, completed)
      assert.strictEqual(recovered.ttlMs, null)
      assert.isAtLeast(Date.parse(recovered.lastUpdatedAt), Date.parse(recovered.createdAt))
      assert.strictEqual(runs, 1)
    }))

  it.effect("should preserve original request metadata and completed Activities when a SQL task replays on a reconstructed runner", () =>
    Effect.gen(function*() {
      const db = yield* database
      let checkpoints = 0
      const handler = Effect.gen(function*() {
        const before = yield* McpSchema.McpRequestContext.useSync((context) => context.requestMetadata?.tenant)
        yield* Activity.make({
          name: "build-report",
          execute: Effect.sync(() => {
            checkpoints++
          })
        })
        yield* DurableDeferred.await(resume)
        const after = yield* McpSchema.McpRequestContext.useSync((context) => context.requestMetadata?.tenant)
        return `${before}:${after}`
      })
      const first = yield* open(db.first, handler)
      const created = yield* first.start
      yield* first.get(created.taskId)
      assert.strictEqual(checkpoints, 1)
      yield* first.close
      const second = yield* open(db.second, handler)
      assert.strictEqual((yield* second.get(created.taskId)).status, "working")
      yield* second.release(yield* first.resumeToken)
      const completed = yield* second.waitFor(created.taskId, "completed")
      if (completed.status === "completed") {
        assert.strictEqual(completed.result.structuredContent, "acme:acme")
      }
      assert.strictEqual(checkpoints, 1)
      assert.strictEqual(completed.createdAt, created.createdAt)
    }))

  it.effect("should retain the engine outcome when an acknowledged cancellation is followed by runner reconstruction", () =>
    Effect.gen(function*() {
      const db = yield* database
      const handler = DurableDeferred.await(resume).pipe(Effect.as("unused"))
      const first = yield* open(db.first, handler)
      const created = yield* first.start
      yield* first.get(created.taskId)
      const response = yield* first.request("tasks/cancel", { taskId: created.taskId })
      assertMcpTaskAcknowledgement(response)
      yield* first.release(yield* first.resumeToken)
      const terminal = yield* first.waitFor(created.taskId, ["completed", "cancelled"])
      yield* first.close
      const second = yield* open(db.second, handler)
      assert.deepStrictEqual(yield* second.get(created.taskId), terminal)
    }))

  it.effect("should retain input rounds, accepted answers, and status when the runner is reconstructed", () =>
    Effect.gen(function*() {
      const db = yield* database
      let checkpoints = 0
      const handler = Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        yield* Activity.make({ name: "prepare", execute: Effect.sync(() => checkpoints++) })
        yield* task.setStatusMessage("choose-roots", "Choose workspace roots")
        const roots = yield* task.requestInput(rootsInput).pipe(Effect.orDie)
        yield* Activity.make({ name: "build", execute: Effect.sync(() => checkpoints++) })
        yield* task.setStatusMessage("name-report", "Name the report")
        const name = yield* task.requestInput({
          key: "report-name",
          request: {
            method: "elicitation/create",
            params: {
              mode: "form",
              message: "Report name",
              requestedSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] }
            }
          },
          response: Schema.Struct({ action: Schema.Literal("accept"), content: Schema.Struct({ name: Schema.String }) })
        }).pipe(Effect.orDie)
        yield* task.setStatusMessage("ready", "Report ready")
        return `${roots.roots[0]?.uri}:${name.content.name}`
      })
      const first = yield* open(db.first, handler)
      const created = yield* first.start
      const waiting = yield* first.waitFor(created.taskId, "input_required")
      assert.strictEqual(waiting.statusMessage, "Choose workspace roots")
      if (waiting.status === "input_required") {
        assert.deepStrictEqual(waiting.inputRequests, { roots: { method: "roots/list" } })
      }
      yield* first.close

      const second = yield* open(db.second, handler)
      assert.deepStrictEqual(yield* second.get(created.taskId), waiting)
      for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
        yield* checkError(
          yield* second.request(method, {
            taskId: created.taskId,
            ...(method === "tasks/update" ? { inputResponses: {} } : {})
          }, "bob")
        )
      }
      const reply = yield* second.request("tasks/update", {
        taskId: created.taskId,
        inputResponses: { roots: { roots: [{ uri: "file:///workspace" }] } }
      })
      assertMcpTaskAcknowledgement(reply)
      const named = yield* second.waitFor(created.taskId, "input_required")
      assert.strictEqual(named.statusMessage, "Name the report")
      if (named.status === "input_required") assert.deepStrictEqual(Object.keys(named.inputRequests), ["report-name"])
      yield* second.request("tasks/update", {
        taskId: created.taskId,
        inputResponses: { roots: { roots: [{ uri: "file:///ignored" }] } }
      })
      assert.strictEqual(checkpoints, 2)
      yield* second.close

      const third = yield* open(db.first, handler)
      assert.deepStrictEqual(yield* third.get(created.taskId), named)
      yield* third.request("tasks/update", {
        taskId: created.taskId,
        inputResponses: { "report-name": { action: "accept", content: { name: "annual" } } }
      })
      const completed = yield* third.waitFor(created.taskId, "completed")
      assert.strictEqual(completed.statusMessage, "Report ready")
      if (completed.status === "completed") {
        assert.strictEqual(completed.result.structuredContent, "file:///workspace:annual")
      }
      assert.strictEqual(checkpoints, 2)
      yield* third.close
      const fourth = yield* open(db.second, handler)
      assert.deepStrictEqual(yield* fourth.get(created.taskId), completed)
    }))

  it.effect("should retain working status without client input when the handler waits internally across restart", () =>
    Effect.gen(function*() {
      const db = yield* database
      const handler = Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        yield* task.setStatusMessage("building", "Building report")
        yield* DurableDeferred.await(resume)
        yield* task.setStatusMessage("ready", undefined)
        return "ready"
      })
      const first = yield* open(db.first, handler)
      const created = yield* first.start
      const working = yield* first.waitFor(
        created.taskId,
        "working",
        (task) => task.statusMessage === "Building report"
      )
      assert.isFalse("inputRequests" in working)
      yield* first.close
      const second = yield* open(db.second, handler)
      assert.deepStrictEqual(yield* second.get(created.taskId), working)
      yield* second.release(yield* first.resumeToken)
      const completed = yield* second.waitFor(created.taskId, "completed")
      assert.isUndefined(completed.statusMessage)
      yield* second.close
      const third = yield* open(db.first, handler)
      assert.deepStrictEqual(yield* third.get(created.taskId), completed)
    }))

  it.effect("should publish a distinct status when replay skips a cached Activity", () =>
    Effect.gen(function*() {
      const db = yield* database
      let checkpoints = 0
      const handler = Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        yield* Activity.make({
          name: "prepare-with-status",
          execute: task.setStatusMessage("preparing", "Preparing report").pipe(
            Effect.andThen(Effect.sync(() => checkpoints++))
          )
        })
        yield* DurableDeferred.await(resume)
        yield* task.setStatusMessage("ready", "Report ready")
        return "ready"
      })
      const first = yield* open(db.first, handler)
      const created = yield* first.start
      yield* first.waitFor(created.taskId, "working", (task) => task.statusMessage === "Preparing report")
      yield* first.close
      const second = yield* open(db.second, handler)
      yield* second.release(yield* first.resumeToken)
      const completed = yield* second.waitFor(created.taskId, "completed")
      assert.strictEqual(completed.statusMessage, "Report ready")
      assert.strictEqual(checkpoints, 1)
    }))

  it.effect("should retain an acknowledged answer when the runner restarts during blocked decoding", () =>
    Effect.gen(function*() {
      const db = yield* database
      const decoding = yield* Deferred.make<void>()
      let block = true
      let decodes = 0
      const response = rootsInput.response.pipe(Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.transformEffect(({ roots }) =>
          Effect.gen(function*() {
            decodes++
            if (block) {
              yield* Deferred.succeed(decoding, undefined)
              return yield* Effect.never
            }
            const context = yield* McpSchema.McpRequestContext
            return `${context.requestMetadata?.tenant}:${roots[0]?.uri}`
          })
        ),
        encode: SchemaGetter.transform(() => ({ roots: [{ uri: "file:///unused" }] }))
      }))
      const handler = McpTasks.TaskContext.use((task) =>
        Effect.all([
          task.requestInput({ ...rootsInput, response }),
          task.requestInput({ ...rootsInput, key: "other" })
        ], { concurrency: "unbounded" }).pipe(
          Effect.map(([original, other]) => `${original}:${other.roots[0]?.uri}`),
          Effect.orDie
        )
      )
      const first = yield* open(db.first, handler)
      const created = yield* first.start
      yield* first.waitFor(created.taskId, "input_required")
      const received = yield* first.request("tasks/update", {
        taskId: created.taskId,
        inputResponses: { roots: { roots: [{ uri: "file:///original" }] } }
      })
      assertMcpTaskAcknowledgement(received)
      yield* first.drive(Deferred.await(decoding))
      for (let poll = 0; poll < 3; poll++) {
        const waiting = yield* first.get(created.taskId)
        assert.strictEqual(waiting.status, "input_required")
        if (waiting.status === "input_required") assert.deepStrictEqual(Object.keys(waiting.inputRequests), ["other"])
      }
      assert.strictEqual(decodes, 1)
      yield* first.close
      block = false
      const second = yield* open(db.second, handler)
      const acknowledgement = yield* second.request("tasks/update", {
        taskId: created.taskId,
        inputResponses: { roots: { roots: [{ uri: "file:///retry" }] } }
      })
      assertMcpTaskAcknowledgement(acknowledgement)
      yield* second.request("tasks/update", {
        taskId: created.taskId,
        inputResponses: { other: { roots: [{ uri: "file:///other" }] } }
      })
      const completed = yield* second.waitFor(created.taskId, "completed")
      if (completed.status === "completed") {
        assert.strictEqual(completed.result.structuredContent, "acme:file:///original:file:///other")
      }
    }))

  it.effect("should withdraw a skipped input when replay returns a cached durable race winner", () =>
    Effect.gen(function*() {
      const db = yield* database
      const raceFinished = yield* Deferred.make<void>()
      let pauseAfterRace = true
      const afterRace = DurableDeferred.make("report/after-race", { success: Schema.Void })
      const afterRaceToken = yield* Deferred.make<DurableDeferred.Token>()
      const handler = Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        const result = yield* McpTasks.workflowRace({
          name: "roots-or-skip",
          success: Schema.String,
          error: Schema.Never,
          effects: [
            task.setStatusMessage("waiting", "Waiting inside race").pipe(
              Effect.andThen(task.requestInput(rootsInput).pipe(Effect.orDie)),
              Effect.as("roots")
            ),
            DurableDeferred.await(resume).pipe(Effect.as("skipped"))
          ]
        })
        if (pauseAfterRace) {
          yield* Deferred.succeed(raceFinished, undefined)
          return yield* Effect.never
        }
        yield* task.setStatusMessage("continuing", "Continuing after the race")
        yield* Deferred.succeed(afterRaceToken, yield* DurableDeferred.token(afterRace))
        yield* DurableDeferred.await(afterRace)
        return result
      })
      const first = yield* open(db.first, handler)
      const created = yield* first.start
      yield* first.waitFor(created.taskId, "input_required")
      yield* first.release(yield* first.resumeToken)
      yield* first.drive(Deferred.await(raceFinished))
      yield* first.close
      pauseAfterRace = false
      const second = yield* open(db.second, handler)
      const working = yield* second.waitFor(
        created.taskId,
        "working",
        (task) => task.statusMessage === "Continuing after the race"
      )
      assert.isFalse("inputRequests" in working)
      const ignored = yield* second.request("tasks/update", {
        taskId: created.taskId,
        inputResponses: { roots: { roots: [{ uri: "file:///late" }] } }
      })
      assertMcpTaskAcknowledgement(ignored)
      yield* second.close
      const third = yield* open(db.first, handler)
      assert.deepStrictEqual(yield* third.get(created.taskId), working)
      const token = yield* third.drive(Deferred.await(afterRaceToken))
      yield* third.drive(
        DurableDeferred.succeed(afterRace, { token, value: undefined }).pipe(
          Effect.provideService(WorkflowEngine.WorkflowEngine, third.engine)
        )
      )
      const completed = yield* third.waitFor(created.taskId, "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "skipped")
    }))

  for (const winner of ["inner", "outer"] as const) {
    it.effect(`should retain only outstanding input when the ${winner} nested race wins and the runner restarts`, () =>
      Effect.gen(function*() {
        const db = yield* database
        const finished = yield* Deferred.make<WorkflowEngine.WorkflowInstance["Service"]>()
        const handler = Effect.gen(function*() {
          const task = yield* McpTasks.TaskContext
          const [result, kept] = yield* Effect.all([
            McpTasks.workflowRace({
              name: "outer",
              success: Schema.String,
              error: Schema.Never,
              effects: [
                McpTasks.workflowRace({
                  name: "inner",
                  success: Schema.String,
                  error: Schema.Never,
                  effects: [
                    task.requestInput(rootsInput).pipe(Effect.orDie, Effect.as("roots")),
                    winner === "inner" ? DurableDeferred.await(resume).pipe(Effect.as("skipped")) : Effect.never
                  ]
                }),
                winner === "outer" ? DurableDeferred.await(resume).pipe(Effect.as("skipped")) : Effect.never
              ]
            }).pipe(
              Effect.tap(() =>
                Effect.flatMap(WorkflowEngine.WorkflowInstance, (instance) => Deferred.succeed(finished, instance))
              )
            ),
            task.requestInput({ ...rootsInput, key: "kept" }).pipe(Effect.orDie)
          ], { concurrency: "unbounded" })
          return `${result}:${kept.roots.length}`
        })
        const first = yield* open(db.first, handler)
        const created = yield* first.start
        yield* first.waitFor(
          created.taskId,
          "input_required",
          (task) => task.status === "input_required" && Object.keys(task.inputRequests).length === 2
        )
        yield* first.release(yield* first.resumeToken)
        yield* first.drive(Deferred.await(finished))
        yield* first.waitFor(
          created.taskId,
          "input_required",
          (task) => task.status === "input_required" && Object.keys(task.inputRequests).length === 1
        )
        yield* first.close
        const second = yield* open(db.second, handler)
        const reconstructed = yield* second.get(created.taskId)
        assert.strictEqual(reconstructed.status, "input_required")
        if (reconstructed.status === "input_required") {
          assert.deepStrictEqual(Object.keys(reconstructed.inputRequests), ["kept"])
        }
        const ignored = yield* second.request("tasks/update", {
          taskId: created.taskId,
          inputResponses: { roots: { roots: [{ uri: "file:///late" }] } }
        })
        assertMcpTaskAcknowledgement(ignored)
        yield* second.request("tasks/update", {
          taskId: created.taskId,
          inputResponses: { kept: { roots: [{ uri: "file:///kept" }] } }
        })
        const completed = yield* second.waitFor(created.taskId, "completed")
        if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "skipped:1")
      }))
  }
})

describe("Workflow input and cancellation", () => {
  // Owner: public Workflow-backed Execution; no SQL persistence assertion is repeated.
  // Related protocol: all outstanding inputs and partial responses: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-update-requests
  // Related protocol: cancellation intent; settlement is an Effect backend guarantee: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-cancellation
  it.effect("should request a fresh key when a Workflow handler recovers from invalid input", () =>
    Effect.gen(function*() {
      const context = yield* Layer.build(McpTasks.layerWorkflow(tools, {
        report: () =>
          McpTasks.TaskContext.use((task) =>
            task.requestInput(rootsInput).pipe(
              Effect.catchTag("SchemaError", () => task.requestInput({ ...rootsInput, key: "replacement" })),
              Effect.map(({ roots }) => roots[0]?.uri ?? "missing"),
              Effect.orDie
            )
          )
      }, { name: "replacement-input" }))
      const execution = Context.get(context, McpTasks.Execution)
      const created = yield* execution.create({
        toolName: "report",
        arguments: {},
        ownerId: "alice",
        requestContext: { clientId: 1, protocolVersion: "2026-07-28", clientCapabilities: {} }
      })
      const request = { taskId: created.taskId, ownerId: "alice" }
      yield* waitForExecution(execution, request, (task) => task.status === "input_required")
      yield* execution.update({ ...request, inputResponses: { roots: { roots: [] } } })
      const waiting = yield* waitForExecution(
        execution,
        request,
        (task) => task.status === "input_required" && "replacement" in task.inputRequests
      )
      if (waiting.status !== "input_required") return assert.fail("Expected replacement input")
      assert.deepStrictEqual(Object.keys(waiting.inputRequests), ["replacement"])
      yield* execution.update({
        ...request,
        inputResponses: {
          roots: { roots: [{ uri: "file:///ignored" }] },
          replacement: { roots: [{ uri: "file:///replacement" }] }
        }
      })
      const completed = yield* waitForExecution(execution, request, (task) => task.status === "completed")
      if (completed.status !== "completed") return assert.fail("Expected completion")
      assert.strictEqual(completed.result.structuredContent, "file:///replacement")
    }).pipe(Effect.provide(WorkflowEngine.layerMemory), runWorkflow))

  it.effect("should settle cancellation when a Workflow task waits on a durable timer", () =>
    Effect.gen(function*() {
      const tools = Toolkit.make(Tool.make("wait", { success: Schema.String }))
      const context = yield* Layer.build(McpTasks.layerWorkflow(tools, {
        wait: () =>
          DurableClock.sleep({ name: "wait", duration: "1 hour", inMemoryThreshold: 0 }).pipe(Effect.as("done"))
      }, { name: "cancel-timer" }))
      const execution = Context.get(context, McpTasks.Execution)
      const task = yield* execution.create({
        toolName: "wait",
        arguments: {},
        ownerId: "owner",
        requestContext: { clientId: 1, protocolVersion: "2026-07-28", clientCapabilities: {} }
      })
      yield* execution.cancel({ taskId: task.taskId, ownerId: "owner" })
      const cancelled = yield* waitForExecution(execution, { taskId: task.taskId, ownerId: "owner" }, (task) =>
        task.status === "cancelled")
      assert.strictEqual(cancelled.status, "cancelled")
    }).pipe(Effect.provide(WorkflowEngine.layerMemory), runWorkflow))

  it.effect("should expose every outstanding input when a Workflow handler requests concurrent answers", () =>
    Effect.gen(function*() {
      const tools = Toolkit.make(Tool.make("confirm", { success: Schema.String }))
      const context = yield* Layer.build(McpTasks.layerWorkflow(tools, {
        confirm: Effect.fnUntraced(function*() {
          const task = yield* McpTasks.TaskContext
          yield* Effect.forEach(["left", "right"], (key) =>
            task.requestInput({
              key,
              request: { method: "roots/list" },
              response: Schema.Struct({ roots: Schema.Array(Schema.String) })
            }), { concurrency: "unbounded" })
          return "done"
        }, Effect.orDie)
      }, { name: "parallel-input" }))
      const execution = Context.get(context, McpTasks.Execution)
      const created = yield* execution.create({
        toolName: "confirm",
        arguments: {},
        ownerId: "owner",
        requestContext: { clientId: 1, protocolVersion: "2026-07-28", clientCapabilities: {} }
      })
      const request = { taskId: created.taskId, ownerId: "owner" }
      const waiting = yield* waitForExecution(
        execution,
        request,
        (task) => task.status === "input_required" && Object.keys(task.inputRequests).length === 2
      )
      if (waiting.status !== "input_required") return assert.fail("Expected both inputs")
      assert.deepStrictEqual(Object.keys(waiting.inputRequests).sort(), ["left", "right"])
      yield* execution.update({ ...request, inputResponses: { left: { roots: [] } } })
      const partial = yield* execution.get(request)
      if (partial.status !== "input_required") return assert.fail("Expected the unanswered input")
      assert.deepStrictEqual(Object.keys(partial.inputRequests), ["right"])
      yield* execution.update({ ...request, inputResponses: { right: { roots: [] } } })
      const completed = yield* waitForExecution(execution, request, (task) => task.status === "completed")
      assert.strictEqual(completed.status, "completed")
    }).pipe(Effect.provide(WorkflowEngine.layerMemory), runWorkflow))
})

describe("Deferred audit decisions", () => {
  // Owner: private-record regressions retained pending the requested human decisions.

  // Deferred audit decision: identity-record fault injection remains unchanged pending a public-API replacement.
  it.effect("should keep an accepted submission pending until its identity is readable", () =>
    Effect.gen(function*() {
      const engine = yield* WorkflowEngine.WorkflowEngine
      const readingIdentity = yield* Deferred.make<void>()
      const ran = yield* Deferred.make<void>()
      let visible = false
      let runs = 0
      const delayedEngine = WorkflowEngine.WorkflowEngine.of({
        ...engine,
        deferredResult: (deferred) =>
          Effect.suspend(() =>
            deferred.name === "mcp/task/identity" && !visible
              ? Deferred.succeed(readingIdentity, undefined).pipe(Effect.as(Option.none()))
              : engine.deferredResult(deferred)
          )
      })
      const executionContext = yield* Layer.build(
        McpTasks.layerWorkflow(tools, {
          report: Effect.fnUntraced(function*() {
            runs++
            yield* Deferred.succeed(ran, undefined)
            return "finished"
          })
        }, { name: "delayed-identity" }).pipe(
          Layer.provide(Layer.succeed(WorkflowEngine.WorkflowEngine, delayedEngine))
        )
      )
      const execution = Context.get(executionContext, McpTasks.Execution)
      const submission = yield* Effect.forkChild(execution.create({
        toolName: "report",
        arguments: {},
        ownerId: "owner",
        requestContext: { clientId: 1, protocolVersion: "2026-07-28", clientCapabilities: {} }
      }))
      yield* Deferred.await(readingIdentity)
      yield* Deferred.await(ran)
      yield* TestClock.adjust("1 second")
      assert.isUndefined(submission.pollUnsafe())
      visible = true
      yield* TestClock.adjust("10 millis")
      const task = yield* Fiber.join(submission)
      const read = yield* execution.get({ taskId: task.taskId, ownerId: "owner" })
      assert.strictEqual(read.status, "completed")
      assert.deepStrictEqual(read.createdAt, task.createdAt)
      assert.strictEqual(runs, 1)
    }).pipe(Effect.provide(WorkflowEngine.layerMemory)))

  // Deferred audit decision: publication-record fault injection remains unchanged pending a public-API replacement.
  it.effect("should withdraw input when its caller is interrupted during publication", () =>
    Effect.gen(function*() {
      const db = yield* database
      const publishing = yield* Deferred.make<void>()
      let delayed = false
      const handler = Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        const input = yield* task.requestInput(rootsInput).pipe(Effect.orDie, Effect.forkChild)
        yield* Deferred.await(publishing)
        yield* Fiber.interrupt(input)
        yield* task.setStatusMessage("continuing", "Continuing without input")
        yield* DurableDeferred.await(resume)
        return "withdrawn"
      })
      const runner = yield* open(db.first, handler, (engine) => ({
        ...engine,
        deferredDone: (deferred, options) =>
          engine.deferredDone(deferred, options).pipe(Effect.andThen(Effect.suspend(() => {
            if (delayed || options.deferredName !== "mcp/task/events/0") return Effect.void
            delayed = true
            return Deferred.succeed(publishing, undefined).pipe(Effect.andThen(Effect.never))
          })))
      }))
      const created = yield* runner.start
      const working = yield* runner.waitFor(
        created.taskId,
        "working",
        (task) => task.statusMessage === "Continuing without input"
      )
      assert.isFalse("inputRequests" in working)
      yield* runner.release(yield* runner.resumeToken)
      const completed = yield* runner.waitFor(created.taskId, "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "withdrawn")
    }))
})
