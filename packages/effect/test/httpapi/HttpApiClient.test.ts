import { assert, describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Cause, Effect, type Exit, Schema, Stream } from "effect"
import { Sse } from "effect/encoding"
import { HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/http"
import { HttpApi, HttpApiClient, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"

describe("HttpApiClient", () => {
  describe("ParseOptions", () => {
    const Fields = { firstName: Schema.String, lastName: Schema.String }
    const Person = Schema.Struct(Fields)

    const SseApi = HttpApi.make("SseApi").add(
      HttpApiGroup.make("test").add(HttpApiEndpoint.get("events", "/events", {
        success: HttpApiSchema.StreamSse({ data: Person, error: Schema.Struct({ reason: Schema.String }) })
      }))
    )

    it.effect("strict events-mode decoding omits an absent event ID", () =>
      Effect.gen(function*() {
        const decode = (wire: string) =>
          HttpApiClient.makeWith(
            StreamingApi.annotate(HttpApi.ParseOptions, { onExcessProperty: "error" }),
            { baseUrl: "http://test", httpClient: clientFromResponse(() => new Response(textStream([wire]))) }
          ).pipe(Effect.flatMap((client) => client.test.events({})), Effect.flatMap(Stream.runCollect))

        const error = yield* Effect.flip(decode("id: 1\nevent: person\ndata: hello\n\n"))
        assert.ok(Schema.isSchemaError(error))
        assert.include(error.message, "[\"id\"]")
        assert.deepStrictEqual(yield* decode("event: person\ndata: hello\n\n"), [{ event: "person", data: "hello" }])
      }))

    it.effect("strict SSE decoding accepts valid user data and framework event metadata", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(
          SseApi.annotate(HttpApi.ParseOptions, { onExcessProperty: "error" }),
          {
            baseUrl: "http://test",
            httpClient: clientFromResponse(() =>
              new Response(
                textStream([
                  "id: 1\nevent: person\ndata: {\"firstName\":\"Ada\",\"lastName\":\"Lovelace\"}\n\n"
                ]),
                { headers: { "content-type": "text/event-stream" } }
              )
            )
          }
        )
        const events = yield* client.test.events({}).pipe(Effect.flatMap(Stream.runCollect))
        assert.deepStrictEqual(events, [{ firstName: "Ada", lastName: "Lovelace" }])
      }))

    it.effect("strict SSE decoding preserves reserved failure causes", () =>
      Effect.gen(function*() {
        const expected = Cause.fail({ reason: "boom" })
        const FailureSchema = Schema.fromJsonString(Schema.toCodecJson(Schema.Cause(StreamError, Schema.Defect())))
        const data = yield* Schema.encodeEffect(FailureSchema)(expected)
        const client = yield* HttpApiClient.makeWith(
          SseApi.annotate(HttpApi.ParseOptions, { onExcessProperty: "error" }),
          {
            baseUrl: "http://test",
            httpClient: clientFromResponse(() =>
              new Response(
                textStream([
                  Sse.encoder.write({ _tag: "Event", event: "effect/http-api/stream/failure", id: undefined, data })
                ]),
                { headers: { "content-type": "text/event-stream" } }
              )
            )
          }
        )
        const exit = yield* client.test.events({}).pipe(Effect.flatMap(Stream.runCollect), Effect.exit)
        assert.strictEqual(exit._tag, "Failure")
        if (exit._tag === "Failure") {
          const error = Cause.squash(exit.cause)
          assert.isFalse(Schema.isSchemaError(error), error instanceof Error ? error.message : undefined)
          assert.deepStrictEqual(exit.cause, expected)
        }
      }))

    it.effect("strict SSE decoding rejects excess properties in user event data", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(
          SseApi.annotate(HttpApi.ParseOptions, { onExcessProperty: "error" }),
          {
            baseUrl: "http://test",
            httpClient: clientFromResponse(() =>
              new Response(
                textStream([
                  "data: {\"firstName\":\"Ada\",\"lastName\":\"Lovelace\",\"extra\":true}\n\n"
                ]),
                { headers: { "content-type": "text/event-stream" } }
              )
            )
          }
        )
        const exit = yield* client.test.events({}).pipe(Effect.flatMap(Stream.runCollect), Effect.exit)
        assert.strictEqual(exit._tag, "Failure")
        if (exit._tag === "Failure") {
          const error = Cause.squash(exit.cause)
          assert.ok(Schema.isSchemaError(error))
          assert.include(error.message, "Expected no excess property")
          assert.include(error.message, "[\"data\"][\"extra\"]")
          assert.notInclude(error.message, "[\"_tag\"]")
        }
      }))

    it.effect("client payload encoding collects all issues", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("users").add(HttpApiEndpoint.post("create", "/users", { payload: Person }))
        ).annotate(HttpApi.ParseOptions, { errors: "all" })
        let requests = 0
        const client = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() => {
            requests++
            return new Response(null, { status: 204 })
          })
        })
        const exit = yield* Effect.exit(client.users.create({ payload: {} as typeof Person.Type }))
        assert.strictEqual(requests, 0)
        assert.strictEqual(exit._tag, "Failure")
        if (exit._tag === "Failure") {
          const error = Cause.squash(exit.cause)
          assert.ok(Schema.isSchemaError(error))
          assert.include(error.message, "firstName")
          assert.include(error.message, "lastName")
        }
      }))

    it.effect("client response decoding collects all issues", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("users").add(HttpApiEndpoint.get("get", "/users", { success: Person }))
        ).annotate(HttpApi.ParseOptions, { errors: "all" })
        const client = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() => new Response("{}", { headers: { "content-type": "application/json" } }))
        })
        const exit = yield* Effect.exit(client.users.get({}))
        assert.strictEqual(exit._tag, "Failure")
        if (exit._tag === "Failure") {
          const error = Cause.squash(exit.cause)
          assert.ok(Schema.isSchemaError(error))
          assert.include(error.message, "firstName")
          assert.include(error.message, "lastName")
        }
      }))

    it("urlBuilder uses group options over API options", () => {
      const Api = HttpApi.make("Api").add(
        HttpApiGroup.make("users").add(HttpApiEndpoint.get("get", "/users", { query: Person }))
          .annotate(HttpApi.ParseOptions, { errors: "all" })
      ).annotate(HttpApi.ParseOptions, { errors: "first" })
      const urls = HttpApiClient.urlBuilder(Api)
      assert.throws(() => urls.users.get({ query: {} as typeof Person.Type }), /firstName[\s\S]*lastName/)
    })
  })

  describe("slot ParseOptions", () => {
    const Strict = { onExcessProperty: "error" } as const
    const Person = Schema.Struct({ firstName: Schema.String, lastName: Schema.String })
    const ada = { firstName: "Ada", lastName: "Lovelace" }
    const adaWithExtra = { ...ada, extra: true }

    const recordingClient = (response: () => Response) => {
      const requests: Array<{ readonly url: string; readonly headers: Record<string, string> }> = []
      const httpClient = HttpClient.make((request, url) =>
        Effect.sync(() => {
          requests.push({ url: url.toString(), headers: request.headers })
          return HttpClientResponse.fromWeb(request, response())
        })
      )
      return { requests, httpClient }
    }

    const jsonResponse = (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers }
      })

    const expectSchemaError = <A, E>(exit: Exit.Exit<A, E>) => {
      assert.strictEqual(exit._tag, "Failure")
      if (exit._tag === "Success") throw new Error("Expected a failure")
      const error = Cause.squash(exit.cause)
      assert.ok(Schema.isSchemaError(error))
      return error
    }

    it.effect("ParamsParseOptions overrides ParseOptions for path params", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("get", "/items/:id", { params: { id: Schema.String } })
          )
        ).annotate(HttpApi.ParseOptions, Strict)
        const params = { id: "1", extra: "x" } as { readonly id: string }

        const strict = recordingClient(() => new Response(null, { status: 204 }))
        const strictClient = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: strict.httpClient
        })
        const error = expectSchemaError(yield* Effect.exit(strictClient.test.get({ params })))
        assert.include(error.message, `["extra"]`)
        assert.strictEqual(strict.requests.length, 0)

        const relaxed = recordingClient(() => new Response(null, { status: 204 }))
        const relaxedClient = yield* HttpApiClient.makeWith(Api.annotate(HttpApi.ParamsParseOptions, {}), {
          baseUrl: "http://test",
          httpClient: relaxed.httpClient
        })
        yield* relaxedClient.test.get({ params })
        assert.deepStrictEqual(relaxed.requests.map((request) => request.url), ["http://test/items/1"])
      }))

    it.effect("QueryParseOptions overrides ParseOptions for the query string", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("get", "/items", { query: { a: Schema.String } })
          )
        ).annotate(HttpApi.ParseOptions, Strict)
        const query = { a: "x", extra: "y" } as { readonly a: string }

        const strict = recordingClient(() => new Response(null, { status: 204 }))
        const strictClient = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: strict.httpClient
        })
        const error = expectSchemaError(yield* Effect.exit(strictClient.test.get({ query })))
        assert.include(error.message, `["extra"]`)
        assert.strictEqual(strict.requests.length, 0)

        const relaxed = recordingClient(() => new Response(null, { status: 204 }))
        const relaxedClient = yield* HttpApiClient.makeWith(Api.annotate(HttpApi.QueryParseOptions, {}), {
          baseUrl: "http://test",
          httpClient: relaxed.httpClient
        })
        yield* relaxedClient.test.get({ query })
        assert.deepStrictEqual(relaxed.requests.map((request) => request.url), ["http://test/items?a=x"])
      }))

    it("urlBuilder uses ParamsParseOptions and QueryParseOptions over ParseOptions", () => {
      const Api = HttpApi.make("Api").add(
        HttpApiGroup.make("test").add(
          HttpApiEndpoint.get("get", "/items/:id", {
            params: { id: Schema.String },
            query: { a: Schema.String }
          })
        )
      ).annotate(HttpApi.ParseOptions, Strict)
      const request = {
        params: { id: "1", extra: "x" } as { readonly id: string },
        query: { a: "x", extra: "y" } as { readonly a: string }
      }

      assert.throws(() => HttpApiClient.urlBuilder(Api).test.get(request), /extra/)
      assert.throws(
        () => HttpApiClient.urlBuilder(Api.annotate(HttpApi.ParamsParseOptions, {})).test.get(request),
        /extra/
      )
      assert.throws(
        () => HttpApiClient.urlBuilder(Api.annotate(HttpApi.QueryParseOptions, {})).test.get(request),
        /extra/
      )
      const urls = HttpApiClient.urlBuilder(
        Api.annotate(HttpApi.ParamsParseOptions, {}).annotate(HttpApi.QueryParseOptions, {})
      )
      strictEqual(urls.test.get(request), "/items/1?a=x")
    })

    it.effect("HeadersParseOptions overrides ParseOptions for request headers", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("get", "/items", { headers: { "x-a": Schema.String } })
          )
        ).annotate(HttpApi.ParseOptions, Strict)
        const headers = { "x-a": "a", "x-b": "b" } as { readonly "x-a": string }

        const strict = recordingClient(() => new Response(null, { status: 204 }))
        const strictClient = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: strict.httpClient
        })
        const error = expectSchemaError(yield* Effect.exit(strictClient.test.get({ headers })))
        assert.include(error.message, `["x-b"]`)
        assert.strictEqual(strict.requests.length, 0)

        const relaxed = recordingClient(() => new Response(null, { status: 204 }))
        const relaxedClient = yield* HttpApiClient.makeWith(Api.annotate(HttpApi.HeadersParseOptions, {}), {
          baseUrl: "http://test",
          httpClient: relaxed.httpClient
        })
        yield* relaxedClient.test.get({ headers })
        assert.strictEqual(relaxed.requests.length, 1)
        assert.strictEqual(relaxed.requests[0]!.headers["x-a"], "a")
        assert.isUndefined(relaxed.requests[0]!.headers["x-b"])
      }))

    it.effect("PayloadParseOptions overrides ParseOptions for the request body", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(HttpApiEndpoint.post("create", "/users", { payload: Person }))
        ).annotate(HttpApi.ParseOptions, Strict)
        const payload = adaWithExtra

        const strict = recordingClient(() => new Response(null, { status: 204 }))
        const strictClient = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: strict.httpClient
        })
        const error = expectSchemaError(yield* Effect.exit(strictClient.test.create({ payload })))
        assert.include(error.message, `["extra"]`)
        assert.strictEqual(strict.requests.length, 0)

        const relaxed = recordingClient(() => new Response(null, { status: 204 }))
        const relaxedClient = yield* HttpApiClient.makeWith(Api.annotate(HttpApi.PayloadParseOptions, {}), {
          baseUrl: "http://test",
          httpClient: relaxed.httpClient
        })
        yield* relaxedClient.test.create({ payload })
        assert.strictEqual(relaxed.requests.length, 1)
      }))

    it.effect("SuccessParseOptions overrides ParseOptions for buffered success bodies", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(HttpApiEndpoint.get("get", "/users", { success: Person }))
        ).annotate(HttpApi.ParseOptions, Strict)
        const httpClient = clientFromResponse(() => jsonResponse({ ...ada, extra: true }))

        const strictClient = yield* HttpApiClient.makeWith(Api, { baseUrl: "http://test", httpClient })
        const error = expectSchemaError(yield* Effect.exit(strictClient.test.get({})))
        assert.include(error.message, `["extra"]`)

        const relaxedClient = yield* HttpApiClient.makeWith(Api.annotate(HttpApi.SuccessParseOptions, {}), {
          baseUrl: "http://test",
          httpClient
        })
        assert.deepStrictEqual(yield* relaxedClient.test.get({}), ada)
      }))

    it.effect("SuccessParseOptions overrides ParseOptions for SSE event data", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(HttpApiEndpoint.get("events", "/events", {
            success: HttpApiSchema.StreamSse({ data: Person, error: StreamError })
          }))
        ).annotate(HttpApi.ParseOptions, Strict)
        const httpClient = clientFromResponse(() =>
          new Response(textStream([`data: ${JSON.stringify({ ...ada, extra: true })}\n\n`]), {
            headers: { "content-type": "text/event-stream" }
          })
        )

        const strictClient = yield* HttpApiClient.makeWith(Api, { baseUrl: "http://test", httpClient })
        const error = expectSchemaError(
          yield* strictClient.test.events({}).pipe(Effect.flatMap(Stream.runCollect), Effect.exit)
        )
        assert.include(error.message, `["extra"]`)

        const relaxedClient = yield* HttpApiClient.makeWith(Api.annotate(HttpApi.SuccessParseOptions, {}), {
          baseUrl: "http://test",
          httpClient
        })
        const events = yield* relaxedClient.test.events({}).pipe(Effect.flatMap(Stream.runCollect))
        assert.deepStrictEqual(events, [ada])
      }))

    it.effect("ErrorParseOptions overrides ParseOptions for error bodies", () =>
      Effect.gen(function*() {
        const BadRequest = Schema.Struct({ message: Schema.String }).pipe(HttpApiSchema.status(400))
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(HttpApiEndpoint.get("get", "/items", { error: BadRequest }))
        ).annotate(HttpApi.ParseOptions, Strict)
        const httpClient = clientFromResponse(() => jsonResponse({ message: "bad", extra: true }, { status: 400 }))

        const strictClient = yield* HttpApiClient.makeWith(Api, { baseUrl: "http://test", httpClient })
        const strictError = yield* Effect.flip(strictClient.test.get({}))
        assert.ok(HttpClientError.isHttpClientError(strictError))

        const relaxedClient = yield* HttpApiClient.makeWith(Api.annotate(HttpApi.ErrorParseOptions, {}), {
          baseUrl: "http://test",
          httpClient
        })
        assert.deepStrictEqual(yield* Effect.flip(relaxedClient.test.get({})), { message: "bad" })
      }))

    it.effect("a slot annotation on the API beats ParseOptions on the endpoint", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("get", "/users", { success: Person }).annotate(HttpApi.ParseOptions, Strict)
          )
        ).annotate(HttpApi.SuccessParseOptions, {})
        const client = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() => jsonResponse({ ...ada, extra: true }))
        })
        assert.deepStrictEqual(yield* client.test.get({}), ada)
      }))

    it.effect("a slot annotation replaces ParseOptions instead of merging with it", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(HttpApiEndpoint.post("create", "/users", { payload: Person }))
        )
          .annotate(HttpApi.ParseOptions, { onExcessProperty: "error", errors: "all" })
          .annotate(HttpApi.PayloadParseOptions, { errors: "first" })
        const client = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() => new Response(null, { status: 204 }))
        })

        yield* client.test.create({ payload: adaWithExtra })

        const error = expectSchemaError(
          yield* Effect.exit(client.test.create({ payload: {} as typeof Person.Type }))
        )
        assert.include(error.message, "firstName")
        assert.notInclude(error.message, "lastName")
      }))

    describe("strict ParseOptions with HeadersParseOptions {}", () => {
      const transportHeaders = {
        "content-length": "42",
        "date": "Sun, 27 Sep 2026 00:00:00 GMT",
        "server": "test",
        "x-count": "1"
      }
      const Api = HttpApi.make("Api").add(
        HttpApiGroup.make("test").add(
          HttpApiEndpoint.get("buffered", "/buffered", {
            success: HttpApiSchema.WithHeaders(Person, { "x-count": Schema.Int })
          }),
          HttpApiEndpoint.get("download", "/download", {
            success: HttpApiSchema.WithHeaders(HttpApiSchema.StreamUint8Array(), { "x-count": Schema.Int })
          }),
          HttpApiEndpoint.get("events", "/events", {
            success: HttpApiSchema.WithHeaders(
              HttpApiSchema.StreamSse({ data: Person, error: StreamError }),
              { "x-count": Schema.Int }
            )
          }),
          HttpApiEndpoint.post("create", "/users", { payload: Person })
        )
      ).annotate(HttpApi.ParseOptions, Strict)
      const relaxed = () => Api.annotate(HttpApi.HeadersParseOptions, {})

      const buffered = (body: unknown) =>
        clientFromResponse(() =>
          new Response(JSON.stringify(body), {
            headers: { ...transportHeaders, "content-type": "application/json" }
          })
        )
      const download = clientFromResponse(() =>
        new Response(byteStream([new Uint8Array([1, 2])]), {
          headers: { ...transportHeaders, "content-type": "application/octet-stream" }
        })
      )
      const events = clientFromResponse(() =>
        new Response(textStream([`data: ${JSON.stringify(ada)}\n\n`]), {
          headers: { ...transportHeaders, "content-type": "text/event-stream" }
        })
      )

      it.effect("ParseOptions alone rejects WithHeaders responses carrying transport headers", () =>
        Effect.gen(function*() {
          const bufferedClient = yield* HttpApiClient.makeWith(Api, {
            baseUrl: "http://test",
            httpClient: buffered(ada)
          })
          expectSchemaError(yield* Effect.exit(bufferedClient.test.buffered({})))

          const downloadClient = yield* HttpApiClient.makeWith(Api, { baseUrl: "http://test", httpClient: download })
          expectSchemaError(yield* Effect.exit(downloadClient.test.download({})))

          const eventsClient = yield* HttpApiClient.makeWith(Api, { baseUrl: "http://test", httpClient: events })
          expectSchemaError(yield* Effect.exit(eventsClient.test.events({})))
        }))

      it.effect("accepts buffered WithHeaders responses", () =>
        Effect.gen(function*() {
          const client = yield* HttpApiClient.makeWith(relaxed(), { baseUrl: "http://test", httpClient: buffered(ada) })
          const value = yield* client.test.buffered({})
          assert.deepStrictEqual(value.headers, { "x-count": 1 })
          assert.deepStrictEqual(value.body, ada)
        }))

      it.effect("accepts streamed WithHeaders responses", () =>
        Effect.gen(function*() {
          const downloadClient = yield* HttpApiClient.makeWith(relaxed(), {
            baseUrl: "http://test",
            httpClient: download
          })
          const downloaded = yield* downloadClient.test.download({})
          assert.deepStrictEqual(downloaded.headers, { "x-count": 1 })
          const chunks = yield* Stream.runCollect(downloaded.body)
          assert.deepStrictEqual(chunks.map((chunk) => Array.from(chunk)), [[1, 2]])

          const eventsClient = yield* HttpApiClient.makeWith(relaxed(), { baseUrl: "http://test", httpClient: events })
          const streamed = yield* eventsClient.test.events({})
          assert.deepStrictEqual(streamed.headers, { "x-count": 1 })
          assert.deepStrictEqual(yield* Stream.runCollect(streamed.body), [ada])
        }))

      it.effect("still rejects an excess key in a buffered WithHeaders body", () =>
        Effect.gen(function*() {
          const client = yield* HttpApiClient.makeWith(relaxed(), {
            baseUrl: "http://test",
            httpClient: buffered({ ...ada, extra: true })
          })
          const error = expectSchemaError(yield* Effect.exit(client.test.buffered({})))
          assert.include(error.message, `["extra"]`)
        }))

      it.effect("still rejects an excess payload key", () =>
        Effect.gen(function*() {
          const recording = recordingClient(() => new Response(null, { status: 204 }))
          const client = yield* HttpApiClient.makeWith(relaxed(), {
            baseUrl: "http://test",
            httpClient: recording.httpClient
          })
          const error = expectSchemaError(yield* Effect.exit(client.test.create({ payload: adaWithExtra })))
          assert.include(error.message, `["extra"]`)
          assert.strictEqual(recording.requests.length, 0)
        }))
    })

    it.effect("buffered WithHeaders responses decode headers with HeadersParseOptions only", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("get", "/users", {
              success: HttpApiSchema.WithHeaders(Person, { "x-count": Schema.Int })
            })
          )
        ).annotate(HttpApi.HeadersParseOptions, Strict)
        const client = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(JSON.stringify({ ...ada, extra: true }), {
              headers: { "content-type": "application/json", "x-count": "1" }
            })
          )
        })
        const error = expectSchemaError(yield* Effect.exit(client.test.get({})))
        assert.include(error.message, `["content-type"]`)
        assert.notInclude(error.message, `["extra"]`)
      }))
  })

  describe("literal action suffixes", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("operations").add(
        HttpApiEndpoint.post("wait", "/operations/:id:wait", {
          params: Schema.Struct({ id: Schema.String })
        })
      )
    )
    const expectedUrl = "https://api.example.com/operations/op_1:wait"

    it("urlBuilder preserves the undeclared action suffix", () => {
      const urls = HttpApiClient.urlBuilder(Api, { baseUrl: "https://api.example.com" })

      strictEqual(urls.operations.wait({ params: { id: "op_1" } }), expectedUrl)
    })

    it.effect("make sends the request with the literal action suffix", () =>
      Effect.gen(function*() {
        let requestUrl: string | undefined
        const httpClient = HttpClient.make((request, url) =>
          Effect.sync(() => {
            requestUrl = url.toString()
            return HttpClientResponse.fromWeb(request, new Response(null, { status: 204 }))
          })
        )
        const client = yield* HttpApiClient.make(Api, { baseUrl: "https://api.example.com" }).pipe(
          Effect.provideService(HttpClient.HttpClient, httpClient)
        )

        yield* client.operations.wait({ params: { id: "op_1" } })

        strictEqual(requestUrl, expectedUrl)
      }))
  })

  describe("streaming responses", () => {
    it.effect("decodes StreamSse events incrementally", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(StreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(
              textStream([
                "event: first\ndata: one\n\n",
                "event: second\ndata: two\n\n"
              ]),
              { status: 200 }
            )
          )
        })

        const stream = yield* client.test.events({})
        const first = yield* stream.pipe(Stream.take(1), Stream.runCollect)
        assert.deepStrictEqual(first, [{ event: "first", data: "one" }])
      }))

    it.effect("keeps per-call SSE decode options isolated", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(StreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() => new Response(textStream(["data: ", "hello\n\n"]), { status: 200 }))
        })

        const limitedStream = yield* client.test.events({ sseOptions: { maxEventSize: 4 } })
        const defaultStream = yield* client.test.events({})
        const [error, events] = yield* Effect.all([
          limitedStream.pipe(Stream.runCollect, Effect.flip),
          Stream.runCollect(defaultStream)
        ], { concurrency: "unbounded" })

        assert.instanceOf(error, Sse.SseError)
        assert.instanceOf(error.reason, Sse.EventTooLarge)
        assert.strictEqual(error.reason.maxEventSize, 4)
        assert.deepStrictEqual(events, [{ event: "message", data: "hello" }])
      }))

    it.effect("keeps StreamSse parser state isolated between responses", () =>
      Effect.gen(function*() {
        const bodies = [
          "event: first\ndata: one\n\n",
          "event: second\ndata: two\n\n"
        ]
        let index = 0
        const client = yield* HttpApiClient.makeWith(StreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() => new Response(textStream([bodies[index++]!]), { status: 200 }))
        })

        const first = yield* client.test.events({}).pipe(Effect.flatMap(Stream.runCollect))
        const second = yield* client.test.events({}).pipe(Effect.flatMap(Stream.runCollect))

        assert.deepStrictEqual(first, [{ event: "first", data: "one" }])
        assert.deepStrictEqual(second, [{ event: "second", data: "two" }])
      }))

    it.effect("decodes StreamSse reserved failure events as full causes", () =>
      Effect.gen(function*() {
        const expectedCause = Cause.fail({ reason: "boom" })
        const FailureSchema = Schema.toCodecJson(Schema.Cause(StreamError, Schema.Defect()))
        const encodeCause = Schema.encodeUnknownEffect(Schema.fromJsonString(FailureSchema))
        const encodedCause = yield* encodeCause(expectedCause)
        const failureEvent = Sse.encoder.write({
          _tag: "Event",
          event: "effect/http-api/stream/failure",
          id: undefined,
          data: encodedCause
        })

        const client = yield* HttpApiClient.makeWith(StreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() => new Response(textStream([failureEvent]), { status: 200 }))
        })

        const stream = yield* client.test.events({})
        const exit = yield* Effect.exit(Stream.runCollect(stream))

        assert.strictEqual(exit._tag, "Failure")
        if (exit._tag === "Failure") {
          assert.deepStrictEqual(exit.cause, expectedCause)
        }
      }))

    it.effect("emits StreamSse reserved names with non-Cause data as user events", () =>
      Effect.gen(function*() {
        const failureEvent = Sse.encoder.write({
          _tag: "Event",
          event: "effect/http-api/stream/failure",
          id: undefined,
          data: "not-json"
        })

        const client = yield* HttpApiClient.makeWith(StreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() => new Response(textStream([failureEvent]), { status: 200 }))
        })

        const stream = yield* client.test.events({})
        const events = yield* Stream.runCollect(stream)

        assert.deepStrictEqual(events, [{
          event: "effect/http-api/stream/failure",
          data: "not-json"
        }])
      }))

    it.effect("returns StreamUint8Array response bytes incrementally", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(StreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(byteStream([new Uint8Array([1, 2]), new Uint8Array([3])]), { status: 200 })
          )
        })

        const stream = yield* client.test.download({})
        const first = yield* stream.pipe(Stream.take(1), Stream.runCollect)
        assert.deepStrictEqual(first.map((chunk) => Array.from(chunk)), [[1, 2]])
      }))

    it.effect("decodes WithHeaders StreamUint8Array bodies and headers", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("download", "/download", {
              success: HttpApiSchema.WithHeaders(
                HttpApiSchema.StreamUint8Array(),
                { "x-count": Schema.Int }
              )
            })
          )
        )
        const client = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(byteStream([new Uint8Array([1, 2]), new Uint8Array([3])]), {
              status: 200,
              headers: { "x-count": "2" }
            })
          )
        })

        const value = yield* client.test.download({})
        const first = yield* value.body.pipe(Stream.take(1), Stream.runCollect)

        assert.deepStrictEqual(value.headers, { "x-count": 2 })
        assert.deepStrictEqual(first.map((chunk) => Array.from(chunk)), [[1, 2]])
      }))

    it.effect("decodes WithHeaders StreamSse bodies and headers", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("events", "/events", {
              success: HttpApiSchema.WithHeaders(
                HttpApiSchema.StreamSse({
                  data: Schema.Struct({ text: Schema.String }),
                  error: StreamError
                }),
                { "x-count": Schema.Int }
              )
            })
          )
        )
        const client = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(textStream([`data: {"text":"hello"}\n\n`]), {
              status: 200,
              headers: {
                "content-type": "text/event-stream",
                "x-count": "1"
              }
            })
          )
        })

        const value = yield* client.test.events({})
        const events = yield* Stream.runCollect(value.body)

        assert.deepStrictEqual(value.headers, { "x-count": 1 })
        assert.deepStrictEqual(events, [{ text: "hello" }])
      }))

    it.effect("fails invalid WithHeaders stream headers before returning the body", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("download", "/download", {
              success: HttpApiSchema.WithHeaders(
                HttpApiSchema.StreamUint8Array(),
                { "x-count": Schema.Int }
              )
            })
          )
        )
        const client = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(byteStream([new Uint8Array([1])]), {
              status: 200,
              headers: { "x-count": "invalid" }
            })
          )
        })

        const exit = yield* Effect.exit(client.test.download({}))

        assert.strictEqual(exit._tag, "Failure")
        if (exit._tag === "Failure") {
          assert.strictEqual((Cause.squash(exit.cause) as { readonly _tag?: string })._tag, "SchemaError")
        }
      }))

    it.effect("forwards SSE options through mixed WithHeaders content-type selection", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("chat", "/chat", {
              success: [
                Schema.Struct({ message: Schema.String }),
                HttpApiSchema.WithHeaders(
                  HttpApiSchema.StreamSse({ data: Schema.Struct({ text: Schema.String }) }),
                  { "x-count": Schema.Int }
                )
              ]
            })
          )
        )
        const client = yield* HttpApiClient.makeWith(Api, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(textStream(["data: ", `{"text":"hello"}\n\n`]), {
              status: 200,
              headers: {
                "content-type": "text/event-stream; charset=utf-8",
                "x-count": "1"
              }
            })
          )
        })

        const value = yield* client.test.chat({ sseOptions: { maxEventSize: 4 } })
        if (!(HttpApiSchema.WithHeadersValueTypeId in value)) {
          throw new Error("Expected WithHeaders response")
        }
        const error = yield* value.body.pipe(Stream.runCollect, Effect.flip)

        assert.deepStrictEqual(value.headers, { "x-count": 1 })
        assert.instanceOf(error, Sse.SseError)
        assert.instanceOf(error.reason, Sse.EventTooLarge)
        assert.strictEqual(error.reason.maxEventSize, 4)

        const defaultValue = yield* client.test.chat({})
        if (!(HttpApiSchema.WithHeadersValueTypeId in defaultValue)) {
          throw new Error("Expected WithHeaders response")
        }
        const events = yield* Stream.runCollect(defaultValue.body)
        assert.deepStrictEqual(defaultValue.headers, { "x-count": 1 })
        assert.deepStrictEqual(events, [{ text: "hello" }])
      }))

    it.effect("decodes StreamSse successes at the annotated status", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(AnnotatedStreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(textStream(["event: annotated\ndata: ok\n\n"]), { status: 202 })
          )
        })

        const stream = yield* client.test.events({})
        const events = yield* Stream.runCollect(stream)
        assert.deepStrictEqual(events, [{ event: "annotated", data: "ok" }])
      }))

    it.effect("decodes StreamUint8Array successes at the annotated status", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(AnnotatedStreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() => new Response(byteStream([new Uint8Array([4, 5])]), { status: 206 }))
        })

        const stream = yield* client.test.download({})
        const chunks = yield* Stream.runCollect(stream)
        assert.deepStrictEqual(chunks.map((chunk) => Array.from(chunk)), [[4, 5]])
      }))

    it.effect("decodes non-success responses through endpoint error schemas before returning a stream", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(StreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(JSON.stringify({ _tag: "EndpointError", message: "bad request" }), {
              status: 400,
              headers: { "content-type": "application/json" }
            })
          )
        })

        const error = yield* Effect.flip(client.test.events({}))
        assert.deepStrictEqual(error, new EndpointError({ message: "bad request" }))
      }))

    it.effect("preserves response-only raw response stream access", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(StreamingApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(
              byteStream([
                new Uint8Array([1]),
                new Uint8Array([2, 3])
              ]),
              { status: 200 }
            )
          )
        })

        const response = yield* client.test.download({ responseMode: "response-only" })
        const chunks = yield* Stream.runCollect(response.stream)
        assert.deepStrictEqual(chunks.map((chunk) => Array.from(chunk)), [[1], [2, 3]])
      }))

    it.effect("selects a buffered response by content type when a stream uses the same status", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(MixedSuccessApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(JSON.stringify({ message: "done" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            })
          )
        })

        const response = yield* client.test.chat({})
        assert.deepStrictEqual(response, { message: "done" })
      }))

    it.effect("selects a stream response by content type when buffered success uses the same status", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.makeWith(MixedSuccessApi, {
          baseUrl: "http://test",
          httpClient: clientFromResponse(() =>
            new Response(textStream([`event: token\ndata: {"text":"hello"}\n\n`]), {
              status: 200,
              headers: { "content-type": "text/event-stream; charset=utf-8" }
            })
          )
        })

        const stream = yield* client.test.chat({})
        if (!Stream.isStream(stream)) {
          throw new Error("Expected stream response")
        }
        const events = yield* Stream.runCollect(stream)
        assert.deepStrictEqual(events, [{ text: "hello" }])
      }))
  })

  describe("error responses", () => {
    const makeClient = (response: () => Response) =>
      HttpApiClient.makeWith(ErrorContentTypeApi, {
        baseUrl: "http://test",
        httpClient: clientFromResponse(response)
      })

    it.effect("selects schemas by normalized content type regardless of declaration order", () =>
      Effect.gen(function*() {
        for (const endpoint of ["textFirst", "jsonFirst"] as const) {
          const jsonClient = yield* makeClient(() =>
            new Response(JSON.stringify({ _tag: "JsonError", message: "bad request" }), {
              status: 400,
              headers: { "content-type": "Application/JSON; charset=utf-8" }
            })
          )
          const jsonError = yield* Effect.flip(jsonClient.test[endpoint]({}))
          assert.deepStrictEqual(jsonError, { _tag: "JsonError", message: "bad request" })

          const textClient = yield* makeClient(() =>
            new Response("bad request", {
              status: 400,
              headers: { "content-type": "text/plain" }
            })
          )
          const textError = yield* Effect.flip(textClient.test[endpoint]({}))
          assert.strictEqual(textError, "bad request")
        }
      }))

    it.effect("reports unsupported error response content types", () =>
      Effect.gen(function*() {
        const client = yield* makeClient(() =>
          new Response("<error />", {
            status: 400,
            headers: { "content-type": "application/xml" }
          })
        )

        const exit = yield* Effect.exit(client.test.textFirst({}))
        assert.strictEqual(exit._tag, "Failure")
        if (exit._tag === "Failure") {
          const errors: Array<unknown> = []
          for (const reason of exit.cause.reasons) {
            if (Cause.isFailReason(reason)) {
              errors.push(reason.error)
            }
          }
          assert.ok(
            errors.some((error) => HttpClientError.isHttpClientError(error) && error.reason._tag === "StatusCodeError")
          )
          const decodeError = errors.find((error) =>
            HttpClientError.isHttpClientError(error) && error.reason._tag === "DecodeError"
          )
          assert.ok(HttpClientError.isHttpClientError(decodeError))
          assert.strictEqual(decodeError.reason._tag, "DecodeError")
          assert.ok(decodeError.reason.description?.includes("Unsupported response content-type"))
        }
      }))

    it.effect("decodes no-content errors without a content-type header", () =>
      Effect.gen(function*() {
        const client = yield* makeClient(() => new Response(null, { status: 400 }))

        const error = yield* Effect.flip(client.test.noContent({}))
        assert.strictEqual(error, "NoContentError")
      }))

    it.effect("groups schemas by normalized declared content type", () =>
      Effect.gen(function*() {
        const client = yield* makeClient(() =>
          new Response(JSON.stringify({ _tag: "SecondJsonError", message: "bad request" }), {
            status: 400,
            headers: { "content-type": "application/problem+json" }
          })
        )

        const error = yield* Effect.flip(client.test.equivalentJson({}))
        assert.deepStrictEqual(error, { _tag: "SecondJsonError", message: "bad request" })
      }))
  })

  it.effect("decodes form-urlencoded responses", () =>
    Effect.gen(function*() {
      const Api = HttpApi.make("Api").add(
        HttpApiGroup.make("test").add(
          HttpApiEndpoint.get("form", "/form", {
            success: Schema.Struct({ name: Schema.String }).pipe(HttpApiSchema.asFormUrlEncoded())
          })
        )
      )
      const client = yield* HttpApiClient.makeWith(Api, {
        baseUrl: "https://example.test",
        httpClient: clientFromResponse(() =>
          new Response("name=Ada", {
            status: 200,
            headers: { "content-type": "application/x-www-form-urlencoded" }
          })
        )
      })

      const value = yield* client.test.form({})

      assert.deepStrictEqual(value, { name: "Ada" })
    }))

  describe("response headers", () => {
    it.effect("fails response decoding when a declared header is invalid", () =>
      Effect.gen(function*() {
        const Api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.get("created", "/created", {
              success: HttpApiSchema.WithHeaders(
                Schema.Struct({ id: Schema.Int }),
                { "x-count": Schema.Int }
              )
            })
          )
        )
        const decodeFailure = Effect.fnUntraced(function*(body: unknown, count: string) {
          const client = yield* HttpApiClient.makeWith(Api, {
            baseUrl: "http://test",
            httpClient: clientFromResponse(() =>
              new Response(JSON.stringify(body), {
                status: 200,
                headers: {
                  "content-type": "application/json",
                  "x-count": count
                }
              })
            )
          })
          const exit = yield* Effect.exit(client.test.created({}))
          assert.strictEqual(exit._tag, "Failure")
          if (exit._tag === "Success") {
            throw new Error("Expected response decoding to fail")
          }
          return Cause.squash(exit.cause) as { readonly _tag?: string }
        })

        const bodyError = yield* decodeFailure({ id: "invalid" }, "1")
        const headerError = yield* decodeFailure({ id: 1 }, "invalid")

        assert.strictEqual(bodyError._tag, "SchemaError")
        assert.strictEqual(headerError._tag, bodyError._tag)
      }))
  })

  describe("urlBuilder", () => {
    const Api = HttpApi.make("Api")
      .add(
        HttpApiGroup.make("users")
          .add(
            HttpApiEndpoint.get("getUser", "/users/:id", {
              params: {
                id: Schema.Finite
              },
              query: {
                page: Schema.Finite,
                tags: Schema.Array(Schema.Finite)
              }
            }),
            HttpApiEndpoint.get("health", "/health")
          )
      )

    it("builds urls using endpoint schemas", () => {
      const builder = HttpApiClient.urlBuilder(Api, {
        baseUrl: "https://api.example.com"
      })

      strictEqual(
        builder.users.getUser({
          params: {
            id: 123
          },
          query: {
            page: 1,
            tags: [1, 2]
          }
        }),
        "https://api.example.com/users/123?page=1&tags=1&tags=2"
      )
    })

    it("preserves a base URL pathname", () => {
      const builder = HttpApiClient.urlBuilder(Api, {
        baseUrl: "https://api.example.com/v1"
      })

      strictEqual(builder.users.health(), "https://api.example.com/v1/health")
    })

    it("encodes path parameters", () => {
      const Api = HttpApi.make("Api")
        .add(
          HttpApiGroup.make("stacks")
            .add(
              HttpApiEndpoint.get("listResources", "/state/stacks/:stack/stages/:stage/resources", {
                params: {
                  stack: Schema.String,
                  stage: Schema.String
                }
              })
            )
        )
      const builder = HttpApiClient.urlBuilder(Api, {
        baseUrl: "https://api.example.com"
      })

      strictEqual(
        builder.stacks.listResources({
          params: {
            stack: "a/b",
            stage: "prod/blue"
          }
        }),
        "https://api.example.com/state/stacks/a%2Fb/stages/prod%2Fblue/resources"
      )
    })

    it("omits missing optional path parameters", () => {
      const Api = HttpApi.make("Api")
        .add(
          HttpApiGroup.make("files")
            .add(
              HttpApiEndpoint.get("download", "/files/:path?", {
                params: {
                  path: Schema.optional(Schema.String)
                }
              })
            )
        )
      const builder = HttpApiClient.urlBuilder(Api, {
        baseUrl: "https://api.example.com"
      })

      strictEqual(
        builder.files.download({ params: {} }),
        "https://api.example.com/files"
      )
      strictEqual(
        builder.files.download({ params: { path: "a/b" } }),
        "https://api.example.com/files/a%2Fb"
      )
    })

    it("returns relative urls when baseUrl is omitted", () => {
      const builder = HttpApiClient.urlBuilder(Api)

      strictEqual(builder.users.health(), "/health")
    })

    it("supports top-level endpoints", () => {
      const TopLevelApi = HttpApi.make("Api")
        .add(
          HttpApiGroup.make("top", { topLevel: true })
            .add(
              HttpApiEndpoint.get("health", "/health")
            )
        )
        .prefix("/v1")

      const builder = HttpApiClient.urlBuilder(TopLevelApi, {
        baseUrl: "https://api.example.com"
      })

      strictEqual(builder.health(), "https://api.example.com/v1/health")
    })

    it("stores __proto__ identifiers as own properties", () => {
      const Api = HttpApi.make("Api").add(
        HttpApiGroup.make("__proto__").add(
          HttpApiEndpoint.get("__proto__", "/proto")
        )
      )
      const builder = HttpApiClient.urlBuilder(Api)

      assert.isTrue(Object.hasOwn(builder, "__proto__"))
      assert.isTrue(Object.hasOwn(builder["__proto__"], "__proto__"))
      strictEqual(builder["__proto__"]["__proto__"](), "/proto")
    })
  })

  it.effect("stores __proto__ client identifiers as own properties", () =>
    Effect.gen(function*() {
      const Api = HttpApi.make("Api").add(
        HttpApiGroup.make("__proto__").add(
          HttpApiEndpoint.get("__proto__", "/proto")
        )
      )
      const httpClient = clientFromResponse(() => new Response(null, { status: 204 }))
      const client = yield* HttpApiClient.makeWith(Api, { httpClient })
      const groupClient = yield* HttpApiClient.group(Api, {
        group: "__proto__",
        httpClient
      })

      assert.isTrue(Object.hasOwn(client, "__proto__"))
      assert.isTrue(Object.hasOwn(client["__proto__"], "__proto__"))
      assert.strictEqual(typeof client["__proto__"]["__proto__"], "function")
      assert.isTrue(Object.hasOwn(groupClient, "__proto__"))
      assert.strictEqual(typeof groupClient["__proto__"], "function")
    }))

  it.effect("applies transformClient to endpoint clients exactly once", () =>
    Effect.gen(function*() {
      const Api = HttpApi.make("Api").add(
        HttpApiGroup.make("test").add(HttpApiEndpoint.get("health", "/health"))
      )
      let transformations = 0
      const httpClient = HttpClient.make((request, url) =>
        Effect.sync(() => {
          strictEqual(url.toString(), "https://api.example.com/health")
          return HttpClientResponse.fromWeb(request, new Response(null, { status: 204 }))
        })
      )
      const health = yield* HttpApiClient.endpoint(Api, {
        group: "test",
        endpoint: "health",
        httpClient,
        transformClient: (client) => {
          transformations++
          return client.pipe(
            HttpClient.mapRequest(HttpClientRequest.prependUrl("https://api.example.com"))
          )
        }
      })

      yield* health({ responseMode: "response-only" })
      yield* health({ responseMode: "response-only" })

      strictEqual(transformations, 1)
    }))

  it.effect("encodes path parameters when executing requests", () =>
    Effect.gen(function*() {
      const Api = HttpApi.make("Api")
        .add(
          HttpApiGroup.make("stacks")
            .add(
              HttpApiEndpoint.get("listResources", "/state/stacks/:stack/stages/:stage/resources", {
                params: {
                  stack: Schema.String,
                  stage: Schema.String
                }
              })
            )
        )
      const httpClient = HttpClient.make((request, url) =>
        Effect.sync(() => {
          strictEqual(url.toString(), "https://api.example.com/state/stacks/a%2Fb/stages/prod%2Fblue/resources")
          return HttpClientResponse.fromWeb(request, new Response(null, { status: 204 }))
        })
      )
      const client = yield* HttpApiClient.makeWith(Api, {
        httpClient,
        baseUrl: "https://api.example.com"
      })

      yield* client.stacks.listResources({
        params: {
          stack: "a/b",
          stage: "prod/blue"
        },
        responseMode: "response-only"
      })
    }))

  it.effect("omits optional path parameters when executing requests", () =>
    Effect.gen(function*() {
      const Api = HttpApi.make("Api")
        .add(
          HttpApiGroup.make("files")
            .add(
              HttpApiEndpoint.get("download", "/files/:path?", {
                params: {
                  path: Schema.optional(Schema.String)
                }
              })
            )
        )
      const urls: Array<string> = []
      const httpClient = HttpClient.make((request, url) =>
        Effect.sync(() => {
          urls.push(url.toString())
          return HttpClientResponse.fromWeb(request, new Response(null, { status: 204 }))
        })
      )
      const client = yield* HttpApiClient.makeWith(Api, {
        httpClient,
        baseUrl: "https://api.example.com"
      })

      yield* client.files.download({
        params: {},
        responseMode: "response-only"
      })
      yield* client.files.download({
        params: { path: "a/b" },
        responseMode: "response-only"
      })

      strictEqual(urls[0], "https://api.example.com/files")
      strictEqual(urls[1], "https://api.example.com/files/a%2Fb")
    }))
})

const textEncoder = new TextEncoder()

const StreamError = Schema.Struct({ reason: Schema.String })

const Events = Schema.Struct({
  event: Schema.String,
  data: Schema.String
})

class EndpointError extends Schema.TaggedError<EndpointError>()("EndpointError", {
  message: Schema.String
}, { httpApiStatus: 400 }) {}

const MixedSuccess = Schema.Struct({
  message: Schema.String
})

const MixedEventData = Schema.Struct({
  text: Schema.String
})

const StreamingApi = HttpApi.make("StreamingApi").add(
  HttpApiGroup.make("test")
    .add(
      HttpApiEndpoint.get("events", "/events", {
        success: HttpApiSchema.StreamSse({ events: Events, error: StreamError }),
        error: EndpointError
      }),
      HttpApiEndpoint.get("download", "/download", {
        success: HttpApiSchema.StreamUint8Array(),
        error: EndpointError
      })
    )
)

const AnnotatedStreamingApi = HttpApi.make("AnnotatedStreamingApi").add(
  HttpApiGroup.make("test")
    .add(
      HttpApiEndpoint.get("events", "/events", {
        success: HttpApiSchema.status(202)(HttpApiSchema.StreamSse({ events: Events, error: StreamError }))
      }),
      HttpApiEndpoint.get("download", "/download", {
        success: HttpApiSchema.status(206)(HttpApiSchema.StreamUint8Array())
      })
    )
)

const MixedSuccessApi = HttpApi.make("MixedSuccessApi").add(
  HttpApiGroup.make("test")
    .add(
      HttpApiEndpoint.get("chat", "/chat", {
        success: [
          MixedSuccess,
          HttpApiSchema.StreamSse({ data: MixedEventData, error: StreamError })
        ]
      })
    )
)

const JsonResponseError = Schema.Struct({
  _tag: Schema.Literal("JsonError"),
  message: Schema.String
}).pipe(HttpApiSchema.status(400))

const TextResponseError = Schema.String.pipe(
  HttpApiSchema.asText(),
  HttpApiSchema.status(400)
)

const NoContentResponseError = Schema.Literal("NoContentError").pipe(
  HttpApiSchema.asNoContent({ decode: () => "NoContentError" as const }),
  HttpApiSchema.status(400)
)

const FirstJsonResponseError = Schema.Struct({
  _tag: Schema.Literal("FirstJsonError"),
  code: Schema.Number
}).pipe(
  HttpApiSchema.asJson({ contentType: "Application/Problem+JSON" }),
  HttpApiSchema.status(400)
)

const SecondJsonResponseError = Schema.Struct({
  _tag: Schema.Literal("SecondJsonError"),
  message: Schema.String
}).pipe(
  HttpApiSchema.asJson({ contentType: "application/problem+json; charset=utf-8" }),
  HttpApiSchema.status(400)
)

const ErrorContentTypeApi = HttpApi.make("ErrorContentTypeApi").add(
  HttpApiGroup.make("test")
    .add(
      HttpApiEndpoint.get("textFirst", "/text-first", {
        error: [TextResponseError, JsonResponseError]
      }),
      HttpApiEndpoint.get("jsonFirst", "/json-first", {
        error: [JsonResponseError, TextResponseError]
      }),
      HttpApiEndpoint.get("noContent", "/no-content", {
        error: [NoContentResponseError, TextResponseError]
      }),
      HttpApiEndpoint.get("equivalentJson", "/equivalent-json", {
        error: [FirstJsonResponseError, SecondJsonResponseError]
      })
    )
)

const clientFromResponse = (response: () => Response): HttpClient.HttpClient =>
  HttpClient.make((request): Effect.Effect<HttpClientResponse.HttpClientResponse, never, never> =>
    Effect.succeed(HttpClientResponse.fromWeb(request, response()))
  )

const textStream = (chunks: ReadonlyArray<string>): ReadableStream<Uint8Array> => {
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index === chunks.length) {
        controller.close()
      } else {
        controller.enqueue(textEncoder.encode(chunks[index++]!))
      }
    }
  })
}

const byteStream = (chunks: ReadonlyArray<Uint8Array>): ReadableStream<Uint8Array> => {
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index === chunks.length) {
        controller.close()
      } else {
        controller.enqueue(chunks[index++]!)
      }
    }
  })
}
