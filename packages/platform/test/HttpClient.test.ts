import {
  Cookies,
  FetchHttpClient,
  Headers,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  UrlParams
} from "@effect/platform"
import { describe, it } from "@effect/vitest"
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import {
  Context,
  Effect,
  Either,
  FiberId,
  FiberRefs,
  Inspectable,
  Layer,
  Logger,
  pipe,
  Ref,
  Schema,
  Stream,
  Struct
} from "effect"

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

const makeJsonPlaceholder = Effect.gen(function*() {
  const defaultClient = yield* (HttpClient.HttpClient)
  const client = defaultClient.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl("https://jsonplaceholder.typicode.com"))
  )
  const createTodo = (todo: typeof TodoWithoutId.Type) =>
    HttpClientRequest.post("/todos").pipe(
      HttpClientRequest.schemaBodyJson(TodoWithoutId)(todo),
      Effect.flatMap(client.execute),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
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
  it.effect("google", () =>
    Effect.gen(function*() {
      const response = yield* pipe(
        HttpClient.get("https://www.google.com/"),
        Effect.flatMap((_) => _.text)
      )
      assertInclude(response, "Google")
    }).pipe(
      it.flakyTest,
      Effect.provide(FetchHttpClient.layer)
    ), 30000)

  it.effect("google withCookiesRef", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Cookies.empty))
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.withCookiesRef(ref)
      )
      yield* pipe(
        HttpClientRequest.get("https://www.google.com/"),
        client.execute
      )
      const cookieHeader = yield* pipe(Ref.get(ref), Effect.map(Cookies.toCookieHeader))
      yield* pipe(
        HttpClientRequest.get("https://www.google.com/"),
        client.pipe(
          HttpClient.tapRequest((req) =>
            Effect.sync(() => {
              strictEqual(req.headers.cookie, cookieHeader)
            })
          )
        ).execute
      )
    }).pipe(
      it.flakyTest,
      Effect.provide(FetchHttpClient.layer)
    ), 30000)

  it.effect("google stream", () =>
    Effect.gen(function*() {
      const response = yield* pipe(
        HttpClient.get(new URL("https://www.google.com/")),
        Effect.map((_) => _.stream),
        Stream.unwrapScoped,
        Stream.runFold("", (a, b) => a + new TextDecoder().decode(b))
      )
      assertInclude(response, "Google")
    }).pipe(
      it.flakyTest,
      Effect.provide(FetchHttpClient.layer)
    ), 30000)

  it.effect("jsonplaceholder", () =>
    Effect.gen(function*() {
      const jp = yield* JsonPlaceholder
      const response = yield* jp.client.get("/todos/1").pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
      )
      strictEqual(response.id, 1)
    }).pipe(
      it.flakyTest,
      Effect.provide(JsonPlaceholderLive)
    ), 30000)

  it.effect("jsonplaceholder schemaFunction", () =>
    Effect.gen(function*() {
      const jp = yield* JsonPlaceholder
      const response = yield* (jp.createTodo({
        userId: 1,
        title: "test",
        completed: false
      }))
      strictEqual(response.title, "test")
    }).pipe(
      it.flakyTest,
      Effect.provide(JsonPlaceholderLive)
    ), 30000)

  it.effect("jsonplaceholder schemaJson", () =>
    Effect.gen(function*() {
      const jp = yield* JsonPlaceholder
      const response = yield* jp.client.get("/todos/1").pipe(
        Effect.flatMap(HttpClientResponse.schemaJson(OkTodo))
      )
      strictEqual(response.body.id, 1)
    }).pipe(
      it.flakyTest,
      Effect.provide(JsonPlaceholderLive)
    ), 30000)

  it.effect("request processing order", () =>
    Effect.gen(function*() {
      const defaultClient = yield* HttpClient.HttpClient
      const client = defaultClient.pipe(
        HttpClient.mapRequest(HttpClientRequest.prependUrl("jsonplaceholder.typicode.com")),
        HttpClient.mapRequest(HttpClientRequest.prependUrl("https://"))
      )
      const response = yield* client.get("/todos/1").pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
      )
      strictEqual(response.id, 1)
    }).pipe(
      it.flakyTest,
      Effect.provide(FetchHttpClient.layer)
    ), 30000)

  it.effect("streamBody accesses the current runtime", () =>
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
        Effect.provide(Logger.replace(Logger.defaultLogger, logger))
      )

      deepStrictEqual(logs, [["hello"], ["world"]])
    }).pipe(
      it.flakyTest,
      Effect.provide(FetchHttpClient.layer)
    ), 30000)

  it("ClientRequest parses URL instances", () => {
    const request = HttpClientRequest.get(new URL("https://example.com/?foo=bar#hash")).pipe(
      HttpClientRequest.appendUrl("/foo"),
      HttpClientRequest.setUrlParam("baz", "qux")
    )
    deepStrictEqual(
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
        )
      )
      deepStrictEqual(response, { id: 1, userId: 1, title: "delectus aut autem", completed: false })
    }).pipe(
      it.flakyTest,
      Effect.provide(JsonPlaceholderLive)
    ), 30000)

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

    deepStrictEqual(redacted, {
      _id: "@effect/platform/HttpClientRequest",
      method: "GET",
      url: "https://example.com/",
      urlParams: [],
      hash: { _id: "Option", _tag: "None" },
      headers: { authorization: "<redacted>" },
      body: { _id: "@effect/platform/HttpBody", _tag: "Empty" }
    })
  })

  it.effect("followRedirects", () =>
    Effect.gen(function*() {
      const defaultClient = yield* HttpClient.HttpClient
      const client = defaultClient.pipe(HttpClient.followRedirects())

      const response = yield* client.get("https://google.com/")
      strictEqual(response.request.url, "https://www.google.com/")
    }).pipe(
      it.flakyTest,
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" })
    ), 30000)
})
