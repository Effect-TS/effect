import { Cookies, HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "@effect/platform"
import * as Schema from "@effect/schema/Schema"
import { Either, Ref } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Stream from "effect/Stream"
import { assert, describe, expect, it } from "vitest"

const Todo = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})
const OkTodo = Schema.Struct({
  status: Schema.Literal(200),
  body: Todo
})

const makeJsonPlaceholder = Effect.gen(function*(_) {
  const defaultClient = yield* _(HttpClient.HttpClient)
  const client = defaultClient.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl("https://jsonplaceholder.typicode.com"))
  )
  const todoClient = client.pipe(
    HttpClient.mapEffectScoped(HttpClientResponse.schemaBodyJson(Todo))
  )
  const createTodo = HttpClient.schemaFunction(
    todoClient,
    Todo.pipe(Schema.omit("id"))
  )(HttpClientRequest.post("/todos"))
  return {
    client,
    todoClient,
    createTodo
  } as const
})
interface JsonPlaceholder extends Effect.Effect.Success<typeof makeJsonPlaceholder> {}
const JsonPlaceholder = Context.GenericTag<JsonPlaceholder>("test/JsonPlaceholder")
const JsonPlaceholderLive = Layer.effect(JsonPlaceholder, makeJsonPlaceholder)
  .pipe(Layer.provide(HttpClient.layer))

describe("HttpClient", () => {
  it("google", () =>
    Effect.gen(function*(_) {
      const response = yield* _(
        HttpClientRequest.get("https://www.google.com/"),
        HttpClient.fetchOk,
        Effect.flatMap((_) => _.text),
        Effect.scoped
      )
      expect(response).toContain("Google")
    }).pipe(Effect.runPromise))

  it("google withCookiesRef", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(Cookies.empty))
      const client = HttpClient.withCookiesRef(HttpClient.fetchOk, ref)
      yield* _(
        HttpClientRequest.get("https://www.google.com/"),
        client,
        Effect.scoped
      )
      const cookieHeader = yield* _(Ref.get(ref), Effect.map(Cookies.toCookieHeader))
      yield* _(
        HttpClientRequest.get("https://www.google.com/"),
        client.pipe(
          HttpClient.tapRequest((req) =>
            Effect.sync(() => {
              assert.strictEqual(req.headers.cookie, cookieHeader)
            })
          )
        ),
        Effect.scoped
      )
    }).pipe(Effect.runPromise))

  it("google stream", () =>
    Effect.gen(function*(_) {
      const response = yield* _(
        HttpClientRequest.get(new URL("https://www.google.com/")),
        HttpClient.fetchOk,
        Effect.map((_) => _.stream),
        Stream.unwrapScoped,
        Stream.runFold("", (a, b) => a + new TextDecoder().decode(b))
      )
      expect(response).toContain("Google")
    }).pipe(Effect.runPromise))

  it("jsonplaceholder", () =>
    Effect.gen(function*(_) {
      const jp = yield* _(JsonPlaceholder)
      const response = yield* _(HttpClientRequest.get("/todos/1"), jp.todoClient)
      expect(response.id).toBe(1)
    }).pipe(Effect.provide(JsonPlaceholderLive), Effect.runPromise))

  it("jsonplaceholder schemaFunction", () =>
    Effect.gen(function*(_) {
      const jp = yield* _(JsonPlaceholder)
      const response = yield* _(jp.createTodo({
        userId: 1,
        title: "test",
        completed: false
      }))
      expect(response.title).toBe("test")
    }).pipe(Effect.provide(JsonPlaceholderLive), Effect.runPromise))

  it("jsonplaceholder schemaJson", () =>
    Effect.gen(function*(_) {
      const jp = yield* _(JsonPlaceholder)
      const client = HttpClient.mapEffectScoped(jp.client, HttpClientResponse.schemaJson(OkTodo)).pipe(
        HttpClient.map((_) => _.body)
      )
      const response = yield* _(HttpClientRequest.get("/todos/1"), client)
      expect(response.id).toBe(1)
    }).pipe(Effect.provide(JsonPlaceholderLive), Effect.runPromise))

  it("request processing order", () =>
    Effect.gen(function*(_) {
      const defaultClient = yield* _(HttpClient.HttpClient)
      const client = defaultClient.pipe(
        HttpClient.mapRequest(HttpClientRequest.prependUrl("jsonplaceholder.typicode.com")),
        HttpClient.mapRequest(HttpClientRequest.prependUrl("https://"))
      )
      const todoClient = client.pipe(
        HttpClient.mapEffectScoped(HttpClientResponse.schemaBodyJson(Todo))
      )
      const response = yield* _(HttpClientRequest.get("/todos/1"), todoClient)
      expect(response.id).toBe(1)
    }).pipe(Effect.provide(HttpClient.layer), Effect.runPromise))

  it("streamBody accesses the current runtime", () =>
    Effect.gen(function*(_) {
      const defaultClient = yield* _(HttpClient.HttpClient)

      const requestStream = Stream.fromIterable(["hello", "world"]).pipe(
        Stream.tap((_) => Effect.log(_)),
        Stream.encodeText
      )

      const logs: Array<unknown> = []
      const logger = Logger.make(({ message }) => logs.push(message))

      yield* HttpClientRequest.post("https://jsonplaceholder.typicode.com").pipe(
        HttpClientRequest.streamBody(requestStream),
        defaultClient,
        Effect.provide(Logger.replace(Logger.defaultLogger, logger)),
        Effect.scoped
      )

      expect(logs).toEqual(["hello", "world"])
    }).pipe(Effect.provide(HttpClient.layer), Effect.runPromise))

  it("ClientRequest parses URL instances", () => {
    const request = HttpClientRequest.get(new URL("https://example.com/?foo=bar#hash")).pipe(
      HttpClientRequest.appendUrl("/foo"),
      HttpClientRequest.setUrlParam("baz", "qux")
    )
    assert.deepStrictEqual(
      UrlParams.makeUrl(request.url, request.urlParams, request.hash),
      Either.right(new URL("https://example.com/foo?foo=bar&baz=qux#hash"))
    )
  })
})
