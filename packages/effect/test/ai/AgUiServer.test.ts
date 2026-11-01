import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, Stream } from "effect"
import type { AgUiSchema } from "effect/ai"
import { AgUiServer } from "effect/ai"
import { Etag, HttpPlatform, HttpRouter } from "effect/http"
import { HttpApi, HttpApiGroup, OpenApi } from "effect/http-api"

const TestServices = Layer.mergeAll(
  Path.layer,
  Etag.layerWeak,
  HttpPlatform.layer
).pipe(Layer.provideMerge(FileSystem.layerNoop({})))

const withHandler = <A, E, R>(
  run: (input: AgUiSchema.RunAgentInput) => Stream.Stream<AgUiSchema.Event, unknown>,
  use: (handler: (request: Request) => Promise<Response>) => Effect.Effect<A, E, R>
) =>
  Effect.acquireUseRelease(
    Effect.sync(() =>
      HttpRouter.toWebHandler(
        AgUiServer.layerHttp({ path: "/agent", run }).pipe(Layer.provide(TestServices)),
        { disableLogger: true }
      )
    ),
    ({ handler }) => use(handler),
    ({ dispose }) => Effect.promise(dispose)
  )

const post = (handler: (request: Request) => Promise<Response>, body: unknown) =>
  Effect.promise(() =>
    handler(
      new Request("http://test/agent", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify(body)
      })
    )
  )

// Every frame must be a single `data:` line, because AG-UI clients such as
// TanStack AI read only `data:` lines.
const readEvents = (response: Response) =>
  Effect.promise(() => response.text()).pipe(
    Effect.map((text) => {
      assert.isTrue(text.endsWith("\n\n"))
      return text.slice(0, -2).split("\n\n").map((frame) => {
        assert.isTrue(frame.startsWith("data: "), frame)
        assert.notInclude(frame, "\n", frame)
        return JSON.parse(frame.slice("data: ".length))
      })
    })
  )

const input = {
  threadId: "thread-1",
  runId: "run-1",
  messages: [{ id: "1", role: "user", content: "Hi" }]
}

describe("AgUiServer", () => {
  it.effect("streams a run hook's events as AG-UI server-sent events", () =>
    withHandler(
      (input) =>
        Stream.fromIterable<AgUiSchema.Event>([
          { type: "TEXT_MESSAGE_START", messageId: input.runId, role: "assistant" },
          { type: "TEXT_MESSAGE_CONTENT", messageId: input.runId, delta: `tools: ${input.tools.length}` }
        ]),
      (handler) =>
        Effect.gen(function*() {
          const response = yield* post(handler, input)

          assert.strictEqual(response.status, 200)
          assert.isTrue(response.headers.get("content-type")?.startsWith("text/event-stream"))
          assert.strictEqual(response.headers.get("cache-control"), "no-cache")
          assert.deepStrictEqual(yield* readEvents(response), [
            { type: "RUN_STARTED", threadId: "thread-1", runId: "run-1", protocolVersion: "1.0" },
            { type: "TEXT_MESSAGE_START", messageId: "run-1", role: "assistant" },
            { type: "TEXT_MESSAGE_CONTENT", messageId: "run-1", delta: "tools: 0" },
            { type: "TEXT_MESSAGE_END", messageId: "run-1" },
            { type: "RUN_FINISHED", threadId: "thread-1", runId: "run-1" }
          ])
        })
    ))

  it.effect("rejects an invalid RunAgentInput before opening the stream", () =>
    withHandler(
      () => Stream.empty,
      (handler) =>
        Effect.gen(function*() {
          const response = yield* post(handler, { threadId: "thread-1" })

          assert.strictEqual(response.status, 400)
          assert.isFalse(response.headers.get("content-type")?.startsWith("text/event-stream") ?? false)
        })
    ))

  it.effect("reports a failing run hook as RUN_ERROR", () =>
    withHandler(
      () => Stream.fail(new Error("boom")),
      (handler) =>
        Effect.gen(function*() {
          const response = yield* post(handler, input)
          const events = yield* readEvents(response)

          assert.strictEqual(response.status, 200)
          assert.deepStrictEqual(events[0], {
            type: "RUN_STARTED",
            threadId: "thread-1",
            runId: "run-1",
            protocolVersion: "1.0"
          })
          assert.strictEqual(events.length, 2)
          assert.strictEqual(events[1].type, "RUN_ERROR")
        })
    ))

  it.effect("reports an event that cannot be encoded as RUN_ERROR", () =>
    withHandler(
      () => Stream.fromIterable<AgUiSchema.Event>([{ type: "CUSTOM", name: "progress", value: 1n }]),
      (handler) =>
        Effect.gen(function*() {
          const events = yield* post(handler, input).pipe(Effect.flatMap(readEvents))

          assert.strictEqual(events.length, 2)
          assert.strictEqual(events[0].type, "RUN_STARTED")
          assert.strictEqual(events[1].type, "RUN_ERROR")
        })
    ))

  it.effect("never serializes an event outside the run's error handling", () => {
    // A value whose JSON form can only be computed once: delivering it is fine
    // if it is serialized once, and failing the run is fine, but a second
    // serialization must not leak an HttpApi failure frame
    let serialized = 0
    const value = {
      toJSON: () => {
        if (++serialized > 1) throw new Error("serialized twice")
        return { done: 1 }
      }
    }
    return withHandler(
      () => Stream.fromIterable<AgUiSchema.Event>([{ type: "CUSTOM", name: "progress", value }]),
      (handler) =>
        Effect.gen(function*() {
          const events = yield* post(handler, input).pipe(Effect.flatMap(readEvents))
          const last = events[events.length - 1]

          assert.strictEqual(events[0].type, "RUN_STARTED")
          assert.include(["RUN_FINISHED", "RUN_ERROR"], last.type)
          for (const event of events.filter((event) => event.type === "CUSTOM")) {
            assert.deepStrictEqual(event, { type: "CUSTOM", name: "progress", value: { done: 1 } })
          }
        })
    )
  })

  it("documents the item schemas of the run input in OpenAPI", () => {
    const api = HttpApi.make("Api").add(HttpApiGroup.make("agent").add(AgUiServer.endpoint("run", "/agent")))
    const spec = JSON.parse(JSON.stringify(OpenApi.fromApi(api)))
    const payload = spec.paths["/agent"].post.requestBody.content["application/json"].schema

    // Every array in the payload, including messages and nested content
    // parts, must describe its items, and no union may have a branch that
    // accepts anything or be empty: generated clients would reduce the union
    // to `unknown`, and an empty `anyOf`/`oneOf` is invalid JSON Schema
    const annotationKeys = new Set(["title", "description", "examples", "default", "$comment", "deprecated"])
    const isUnconstrained = (schema: unknown) =>
      typeof schema !== "object" || schema === null ||
      Object.keys(schema).every((key) => annotationKeys.has(key))
    const findProblems = (root: unknown): Array<string> => {
      const problems: Array<string> = []
      const visit = (schema: unknown, path: string): void => {
        if (typeof schema !== "object" || schema === null) return
        const node = schema as Record<string, unknown>
        if (node.type === "array" && isUnconstrained(node.items)) {
          problems.push(`${path}/items is missing`)
        }
        for (const key of ["anyOf", "oneOf"]) {
          const branches = node[key]
          if (!Array.isArray(branches)) continue
          if (branches.length === 0) problems.push(`${path}/${key} is empty`)
          branches.forEach((branch, index) => {
            if (isUnconstrained(branch)) problems.push(`${path}/${key}/${index} is unconstrained`)
          })
        }
        for (const [key, child] of Object.entries(node)) visit(child, `${path}/${key}`)
      }
      visit(root, "")
      return problems
    }

    assert.isDefined(payload.properties.messages.items)
    assert.deepStrictEqual(findProblems(payload), [])

    // The check must catch the fallback branch surviving union flattening,
    // at the top of a union and nested inside one
    const injected = (inject: (payload: any) => void) => {
      const copy = structuredClone(payload)
      inject(copy)
      return findProblems(copy)
    }
    const userContentParts = (payload: any) =>
      payload.properties.messages.items.anyOf
        .find((message: any) => message.properties.role.enum?.includes("user"))
        .properties.content.anyOf.find((content: any) => content.type === "array").items
    assert.isNotEmpty(injected((payload) => payload.properties.messages.items.anyOf.push({ anyOf: [] })))
    assert.isNotEmpty(injected((payload) => userContentParts(payload).anyOf.push({ oneOf: [] })))
    assert.isNotEmpty(injected((payload) => {
      payload.properties.resume.items = { anyOf: [] }
    }))
  })
})
