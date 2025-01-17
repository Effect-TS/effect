import {
  Cookies,
  FetchHttpClient,
  Headers,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  UrlParams
} from "@effect/platform"
import { assert, describe, expect, it } from "@effect/vitest"
import { Either, FiberId, FiberRefs, Inspectable, Ref, Struct } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

const Todo = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})
const TodoWithoutId = Schema.Struct({
  ...Struct.omit(Todo.fields, "id")
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
  const createTodo = (todo: typeof TodoWithoutId.Type) =>
    HttpClientRequest.post("/todos").pipe(
      HttpClientRequest.schemaBodyJson(TodoWithoutId)(todo),
      Effect.flatMap(client.execute),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo)),
      Effect.scoped
    )
  return {
    client,
    createTodo
  } as const
})
interface JsonPlaceholder extends Effect.Effect.Success<typeof makeJsonPlaceholder> {}
const JsonPlaceholder = Context.GenericTag<JsonPlaceholder>("test/JsonPlaceholder")
const JsonPlaceholderLive = Layer.effect(JsonPlaceholder, makeJsonPlaceholder)
  .pipe(Layer.provide(FetchHttpClient.layer))

describe("HttpClient", () => {
  it("google", () =>
    Effect.gen(function*(_) {
      const response = yield* _(
        HttpClient.get("https://www.google.com/"),
        Effect.flatMap((_) => _.text),
        Effect.scoped
      )
      expect(response).toContain("Google")
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise))

  it("google withCookiesRef", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(Cookies.empty))
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.withCookiesRef(ref)
      )
      yield* _(
        HttpClientRequest.get("https://www.google.com/"),
        client.execute,
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
        ).execute,
        Effect.scoped
      )
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise))

  it("google stream", () =>
    Effect.gen(function*(_) {
      const response = yield* _(
        HttpClient.get(new URL("https://www.google.com/")),
        Effect.map((_) => _.stream),
        Stream.unwrapScoped,
        Stream.runFold("", (a, b) => a + new TextDecoder().decode(b))
      )
      expect(response).toContain("Google")
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise))

  it("jsonplaceholder", () =>
    Effect.gen(function*() {
      const jp = yield* JsonPlaceholder
      const response = yield* jp.client.get("/todos/1").pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo)),
        Effect.scoped
      )
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
    Effect.gen(function*() {
      const jp = yield* JsonPlaceholder
      const response = yield* jp.client.get("/todos/1").pipe(
        Effect.flatMap(HttpClientResponse.schemaJson(OkTodo)),
        Effect.scoped
      )
      expect(response.body.id).toBe(1)
    }).pipe(Effect.provide(JsonPlaceholderLive), Effect.runPromise))

  it("request processing order", () =>
    Effect.gen(function*() {
      const defaultClient = yield* HttpClient.HttpClient
      const client = defaultClient.pipe(
        HttpClient.mapRequest(HttpClientRequest.prependUrl("jsonplaceholder.typicode.com")),
        HttpClient.mapRequest(HttpClientRequest.prependUrl("https://"))
      )
      const response = yield* client.get("/todos/1").pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo)),
        Effect.scoped
      )
      expect(response.id).toBe(1)
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise))

  it("streamBody accesses the current runtime", () =>
    Effect.gen(function*() {
      const defaultClient = yield* HttpClient.HttpClient

      const requestStream = Stream.fromIterable(["hello", "world"]).pipe(
        Stream.tap((_) => Effect.log(_)),
        Stream.encodeText
      )

      const logs: Array<unknown> = []
      const logger = Logger.make(({ message }) => logs.push(message))

      yield* HttpClientRequest.post("https://jsonplaceholder.typicode.com").pipe(
        HttpClientRequest.bodyStream(requestStream),
        defaultClient.execute,
        Effect.provide(Logger.replace(Logger.defaultLogger, logger)),
        Effect.scoped
      )

      expect(logs).toEqual([["hello"], ["world"]])
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise))

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

  it.effect("matchStatus", () =>
    Effect.gen(function*() {
      const jp = yield* JsonPlaceholder
      const response = yield* jp.client.get("/todos/1").pipe(
        Effect.flatMap(
          HttpClientResponse.matchStatus({
            "2xx": HttpClientResponse.schemaBodyJson(Todo),
            404: () => Effect.fail("not found"),
            orElse: () => Effect.fail("boom")
          })
        ),
        Effect.scoped
      )
      assert.deepStrictEqual(response, { id: 1, userId: 1, title: "delectus aut autem", completed: false })
    }).pipe(Effect.provide(JsonPlaceholderLive)))

  it("ClientRequest redacts headers", () => {
    const request = HttpClientRequest.get(new URL("https://example.com")).pipe(
      HttpClientRequest.setHeaders({
        "authorization": "foobar"
      })
    )

    const fiberRefs = FiberRefs.unsafeMake(
      new Map([
        [
          Headers.currentRedactedNames,
          [[FiberId.none, ["Authorization"]] as const]
        ] as const
      ])
    )
    const r = Inspectable.withRedactableContext(fiberRefs, () => Inspectable.toStringUnknown(request))
    const redacted = JSON.parse(r)

    assert.deepStrictEqual(redacted, {
      _id: "@effect/platform/HttpClientRequest",
      method: "GET",
      url: "https://example.com/",
      urlParams: [],
      hash: { _id: "Option", _tag: "None" },
      headers: { authorization: "<redacted>" },
      body: { _id: "@effect/platform/HttpBody", _tag: "Empty" }
    })
  })

  it("followRedirects", () =>
    Effect.gen(function*(_) {
      const defaultClient = yield* HttpClient.HttpClient
      const client = defaultClient.pipe(HttpClient.followRedirects())

      const response = yield* _(
        client.get("https://google.com/"),
        Effect.scoped
      )
      expect(response.request.url).toBe("https://www.google.com/")
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" }),
      Effect.runPromise
    ))
})
