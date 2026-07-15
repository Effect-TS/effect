import { expect, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Context, Effect, Layer, Option, Ref, Schema, Stream, Struct, type Tracer } from "effect"
import { TestClock } from "effect/testing"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

const Todo = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})
const TodoWithoutId = Schema.Struct({
  ...Struct.omit(Todo.fields, ["id"])
})

const makeJsonPlaceholder = Effect.gen(function*() {
  const defaultClient = yield* HttpClient.HttpClient
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
interface JsonPlaceholder extends Effect.Success<typeof makeJsonPlaceholder> {}
const JsonPlaceholder = Context.Service<JsonPlaceholder>("test/JsonPlaceholder")
const JsonPlaceholderLive = Layer.effect(JsonPlaceholder)(makeJsonPlaceholder)
;[
  {
    name: "FetchHttpClient",
    layer: FetchHttpClient.layer
  }
].forEach(({ layer, name }) => {
  it.layer(layer)(name, (it) => {
    it.effect("google", () =>
      flakyTest(Effect.gen(function*() {
        const response = yield* HttpClient.get("https://www.google.com/").pipe(
          Effect.flatMap((_) => _.text)
        )
        expect(response).toContain("Google")
      })))

    it.effect("google followRedirects", () =>
      flakyTest(Effect.gen(function*() {
        const client = (yield* HttpClient.HttpClient).pipe(
          HttpClient.followRedirects()
        )
        const response = yield* client.get("http://google.com/").pipe(
          Effect.flatMap((_) => _.text)
        )
        expect(response).toContain("Google")
      })))

    it.effect("google stream", () =>
      flakyTest(Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.get("https://www.google.com/").pipe(
          Effect.map((_) => _.stream),
          Stream.unwrap,
          Stream.decodeText(),
          Stream.mkString
        )
        expect(response).toContain("Google")
      })))

    it.effect("jsonplaceholder", () =>
      Effect.gen(function*() {
        const jp = yield* JsonPlaceholder
        const response = yield* jp.client.get("/todos/1").pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
        )
        expect(response.id).toBe(1)
      }).pipe(flakyTest, Effect.provide(JsonPlaceholderLive)))

    it.effect("jsonplaceholder schemaBodyJson", () =>
      Effect.gen(function*() {
        const jp = yield* JsonPlaceholder
        const response = yield* jp.createTodo({
          userId: 1,
          title: "test",
          completed: false
        })
        expect(response.title).toBe("test")
      }).pipe(Effect.provide(JsonPlaceholderLive), flakyTest))

    it.effect("head request with schemaJson", () =>
      flakyTest(Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.head("https://jsonplaceholder.typicode.com/todos").pipe(
          Effect.flatMap(
            HttpClientResponse.schemaJson(Schema.Struct({ status: Schema.Literal(200) }))
          )
        )
        expect(response).toEqual({ status: 200 })
      })))

    it.effect("interrupt", () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.get("https://www.google.com/").pipe(
          Effect.flatMap((_) => _.text),
          Effect.timeout(1),
          Effect.asSome,
          Effect.catchTag("TimeoutError", () => Effect.succeedNone),
          TestClock.withLive
        )
        expect(response._tag).toEqual("None")
      }))

    it.effect("close early", () =>
      flakyTest(Effect.gen(function*() {
        const response = yield* HttpClient.get("https://www.google.com/")
        expect(response.status).toBe(200)
      })))
  })
})

it.effect("captures all request and response headers as span attributes by default", () =>
  Effect.gen(function*() {
    const spanRef = yield* Ref.make<Option.Option<Tracer.Span>>(Option.none())

    const client = HttpClient.make((request) =>
      Effect.gen(function*() {
        const span = yield* Effect.orDie(Effect.currentSpan)
        yield* Ref.set(spanRef, Option.some(span))
        return HttpClientResponse.fromWeb(
          request,
          new Response(null, { status: 200, headers: { "X-Request-Id": "resp-abc" } })
        )
      })
    )

    yield* client.execute(
      HttpClientRequest.get("http://test/").pipe(
        HttpClientRequest.setHeaders({ "X-Request-Id": "req-abc" })
      )
    ).pipe(Effect.ignore)

    const span = Option.getOrThrow(yield* Ref.get(spanRef))
    deepStrictEqual(span.attributes.get("http.request.header.x-request-id"), "req-abc")
    deepStrictEqual(span.attributes.get("http.response.header.x-request-id"), "resp-abc")
  }))

it.effect("withTracerRequestHeadersFilter only captures matching request headers as span attributes", () =>
  Effect.gen(function*() {
    const spanRef = yield* Ref.make<Option.Option<Tracer.Span>>(Option.none())

    const client = HttpClient.make((request) =>
      Effect.gen(function*() {
        const span = yield* Effect.orDie(Effect.currentSpan)
        yield* Ref.set(spanRef, Option.some(span))
        return HttpClientResponse.fromWeb(request, new Response(null, { status: 200 }))
      })
    ).pipe(
      HttpClient.withTracerRequestHeadersFilter((name) => name === "x-request-id")
    )

    yield* client.execute(
      HttpClientRequest.get("http://test/").pipe(
        HttpClientRequest.setHeaders({
          "x-request-id": "abc",
          "content-type": "application/json",
          "accept": "application/json"
        })
      )
    ).pipe(Effect.ignore)

    const span = Option.getOrThrow(yield* Ref.get(spanRef))
    deepStrictEqual(span.attributes.get("http.request.header.x-request-id"), "abc")
    strictEqual(span.attributes.get("http.request.header.content-type"), undefined)
    strictEqual(span.attributes.get("http.request.header.accept"), undefined)
  }))

it.effect("withTracerResponseHeadersFilter only captures matching response headers as span attributes", () =>
  Effect.gen(function*() {
    const spanRef = yield* Ref.make<Option.Option<Tracer.Span>>(Option.none())

    const client = HttpClient.make((request) =>
      Effect.gen(function*() {
        const span = yield* Effect.orDie(Effect.currentSpan)
        yield* Ref.set(spanRef, Option.some(span))
        return HttpClientResponse.fromWeb(
          request,
          new Response(null, {
            status: 200,
            headers: {
              "content-type": "application/json",
              "x-request-id": "resp-123",
              "cf-ray": "abc123"
            }
          })
        )
      })
    ).pipe(
      HttpClient.withTracerResponseHeadersFilter((name) => name === "x-request-id")
    )

    yield* client.get("http://test/").pipe(Effect.ignore)

    const span = Option.getOrThrow(yield* Ref.get(spanRef))
    deepStrictEqual(span.attributes.get("http.response.header.x-request-id"), "resp-123")
    strictEqual(span.attributes.get("http.response.header.content-type"), undefined)
    strictEqual(span.attributes.get("http.response.header.cf-ray"), undefined)
  }))

it.effect("withTracerHeadersFilter applies the same predicate to both request and response headers", () =>
  Effect.gen(function*() {
    const spanRef = yield* Ref.make<Option.Option<Tracer.Span>>(Option.none())

    const client = HttpClient.make((request) =>
      Effect.gen(function*() {
        const span = yield* Effect.orDie(Effect.currentSpan)
        yield* Ref.set(spanRef, Option.some(span))
        return HttpClientResponse.fromWeb(
          request,
          new Response(null, {
            status: 200,
            headers: {
              "x-request-id": "resp-abc",
              "cf-ray": "ignored"
            }
          })
        )
      })
    ).pipe(
      HttpClient.withTracerHeadersFilter((name) => name === "x-request-id")
    )

    yield* client.execute(
      HttpClientRequest.get("http://test/").pipe(
        HttpClientRequest.setHeaders({
          "x-request-id": "req-abc",
          "content-type": "application/json"
        })
      )
    ).pipe(Effect.ignore)

    const span = Option.getOrThrow(yield* Ref.get(spanRef))
    deepStrictEqual(span.attributes.get("http.request.header.x-request-id"), "req-abc")
    strictEqual(span.attributes.get("http.request.header.content-type"), undefined)
    deepStrictEqual(span.attributes.get("http.response.header.x-request-id"), "resp-abc")
    strictEqual(span.attributes.get("http.response.header.cf-ray"), undefined)
  }))

const flakyTest = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.timeoutOrElse({
      duration: "2 seconds",
      orElse: () => Effect.void
    })
  )
