import { NodeHttpServer } from "@effect/platform-node"
import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import Undici from "@effect/platform-node/Undici"
import { assert, describe, expect, it } from "@effect/vitest"
import { Struct } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import {
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  Multipart
} from "effect/http"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { mkdtempSync, openAsBlob, rmSync, truncateSync, writeFileSync } from "node:fs"
import * as Http from "node:http"
import type { AddressInfo, Socket } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("FormData upload cancellation", () => {
  for (
    const [name, layer] of [
      ["node:http", NodeClient.layerNodeHttp],
      ["undici", NodeClient.layerUndici]
    ] as const
  ) {
    it.live.each(["early response", "mid-upload interruption"] as const)(
      `${name} cancels and unlocks the file after %s`,
      (scenario) =>
        Effect.gen(function*() {
          let reading!: () => void
          const readStarted = new Promise<void>((resolve) => {
            reading = resolve
          })
          let received!: () => void
          const requestStarted = new Promise<void>((resolve) => {
            received = resolve
          })
          let cancelled = false
          let fileStream!: ReadableStream<Uint8Array<ArrayBuffer>>
          class SlowFile extends File {
            override stream() {
              let remaining = this.size
              fileStream = new ReadableStream<Uint8Array<ArrayBuffer>>({
                async pull(controller) {
                  reading()
                  await new Promise((resolve) => setTimeout(resolve, 20))
                  if (remaining-- > 0) controller.enqueue(new Uint8Array([0]))
                  else controller.close()
                },
                cancel() {
                  cancelled = true
                }
              })
              return fileStream
            }
          }
          const data = new FormData()
          data.append("file", new SlowFile([new Uint8Array(1024)], "slow.txt"))
          const sockets = new Set<Socket>()
          const server = yield* Effect.acquireRelease(
            Effect.promise(() =>
              new Promise<Http.Server>((resolve) => {
                const server = Http.createServer((request, response) => {
                  received()
                  request.on("error", () => {})
                  request.resume()
                  if (scenario === "early response") {
                    response.writeHead(200)
                    response.flushHeaders()
                  }
                })
                server.on("connection", (socket) => {
                  sockets.add(socket)
                  socket.on("close", () => sockets.delete(socket))
                })
                server.listen(0, "127.0.0.1", () => resolve(server))
              })
            ),
            (server) =>
              Effect.promise(() =>
                new Promise<void>((resolve) => {
                  server.closeAllConnections()
                  server.close(() => resolve())
                })
              )
          )
          const client = yield* HttpClient.HttpClient
          const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
          if (scenario === "early response") {
            yield* Effect.scoped(Effect.gen(function*() {
              const response = yield* HttpClient.withScope(client).post(url, { body: HttpBody.formData(data) })
              assert.strictEqual(response.status, 200)
              yield* Effect.promise(() => readStarted)
              // Receiving headers alone must not cancel the still-active upload.
              assert.isFalse(cancelled)
              assert.isTrue(fileStream.locked)
            }))
          } else {
            const fiber = yield* client.post(url, { body: HttpBody.formData(data) }).pipe(Effect.forkChild)
            yield* Effect.promise(() => readStarted)
            yield* Effect.promise(() => requestStarted)
            assert.isTrue(fileStream.locked)
            assert.isFalse(cancelled)
            yield* Fiber.interrupt(fiber)
          }
          // Observe cleanup before the client layer/agent is finalized.
          yield* Effect.sleep(10).pipe(
            Effect.repeat({ while: () => !cancelled || fileStream.locked || sockets.size > 0 }),
            Effect.timeout("1 second")
          )
          assert.isTrue(cancelled)
          assert.isFalse(fileStream.locked)
          assert.strictEqual(sockets.size, 0)
        }).pipe(Effect.provide(layer), Effect.timeout("3 seconds"))
    )
  }
})

const Todo = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})
const TodoWithoutId = Schema.Struct({
  ...Struct.omit(Todo.fields, ["id"])
})
const largeResponseBody = "a".repeat(10 * 1024 * 1024)
const responseBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
const formDataResponses = [
  {
    name: "URL-encoded",
    path: "/form/url-encoded",
    contentType: "application/x-www-form-urlencoded",
    body: "tag=one&tag=two"
  },
  {
    name: "multipart",
    path: "/form/multipart",
    contentType: "multipart/form-data; boundary=effect-test",
    body: [
      "--effect-test",
      "Content-Disposition: form-data; name=\"tag\"",
      "",
      "one",
      "--effect-test",
      "Content-Disposition: form-data; name=\"tag\"",
      "",
      "two",
      "--effect-test--",
      ""
    ].join("\r\n")
  }
] as const

const makeLocalServerClient = Effect.gen(function*() {
  const client = yield* HttpClient.HttpClient
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
interface LocalServerClient extends Effect.Success<typeof makeLocalServerClient> {}
const LocalServerClient = Context.Service<LocalServerClient>("test/LocalServerClient")
const LocalServerClientLayer = Layer.effect(LocalServerClient)(makeLocalServerClient)
const LocalServerRoutes = HttpRouter.serve(HttpRouter.addAll([
  HttpRouter.route(
    "GET",
    "/todos/1",
    Effect.succeed(HttpServerResponse.jsonUnsafe({
      userId: 1,
      id: 1,
      title: "test",
      completed: false
    }))
  ),
  HttpRouter.route(
    "POST",
    "/todos",
    Effect.gen(function*() {
      const todo = yield* HttpServerRequest.schemaBodyJson(TodoWithoutId)
      return HttpServerResponse.jsonUnsafe({ ...todo, id: 201 })
    })
  ),
  HttpRouter.route("GET", "/text", Effect.succeed(HttpServerResponse.text("test"))),
  HttpRouter.route(
    "QUERY",
    "/search",
    Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      return HttpServerResponse.jsonUnsafe({
        method: request.method,
        contentType: request.headers["content-type"],
        body: yield* request.text
      })
    })
  ),
  HttpRouter.route("GET", "/bytes", Effect.succeed(HttpServerResponse.uint8Array(responseBytes))),
  HttpRouter.route(
    "POST",
    "/multipart",
    Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      const parts = yield* request.multipartStream.pipe(
        Stream.mapEffect((part) =>
          Effect.gen(function*() {
            if (Multipart.isField(part)) {
              return { key: part.key, value: part.value }
            }
            const content = yield* part.contentEffect
            return {
              key: part.key,
              name: part.name,
              contentType: part.contentType,
              content: new TextDecoder().decode(content)
            }
          })
        ),
        Stream.runCollect
      )
      return HttpServerResponse.jsonUnsafe(parts)
    })
  ),
  HttpRouter.route(
    "POST",
    "/bom-json",
    Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      return HttpServerResponse.text(`\uFEFF${JSON.stringify(yield* request.json)}`, {
        contentType: "application/json"
      })
    })
  ),
  ...formDataResponses.map(({ body, contentType, path }) =>
    HttpRouter.route("GET", path, Effect.succeed(HttpServerResponse.text(body, { contentType })))
  ),
  HttpRouter.route("GET", "/large", Effect.succeed(HttpServerResponse.text(largeResponseBody))),
  HttpRouter.route("GET", "/hang", Effect.never),
  HttpRouter.route("GET", "/redirect", Effect.succeed(HttpServerResponse.redirect("/redirected"))),
  HttpRouter.route("GET", "/redirected", Effect.succeed(HttpServerResponse.text("redirected"))),
  HttpRouter.route("HEAD", "/todos", Effect.succeed(HttpServerResponse.empty({ status: 200 })))
]))
;[
  {
    name: "fetch",
    layer: NodeClient.layerFetch
  },
  {
    name: "node:http",
    layer: NodeClient.layerNodeHttp
  },
  {
    name: "undici",
    layer: NodeClient.layerUndici
  }
].forEach(({ layer, name }) => {
  const layerTest = HttpServer.layerTestClient.pipe(
    Layer.provide(layer),
    Layer.provideMerge(NodeHttpServer.layer(Http.createServer, { port: 0 }))
  )
  const localServerTestLayer = Layer.merge(LocalServerClientLayer, LocalServerRoutes).pipe(
    Layer.provideMerge(layerTest)
  )

  describe(`NodeHttpClient - ${name}`, () => {
    it.effect("text", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.get("/text?existing=1", {
          urlParams: { value: "a#b" },
          hash: "fragment"
        })
        const url = new URL(response.url)
        assert.strictEqual(url.pathname, "/text")
        assert.strictEqual(url.search, "?existing=1&value=a%23b")
        assert.strictEqual(url.hash, "")
        expect(yield* response.text).toBe("test")
      }).pipe(Effect.provide(localServerTestLayer)))

    it.effect("accessing text preserves response bytes", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.get("/bytes")
        void response.text
        assert.deepStrictEqual(new Uint8Array(yield* response.arrayBuffer), responseBytes)
      }).pipe(Effect.provide(localServerTestLayer)))

    it.effect("request and response json ignore a leading UTF-8 BOM", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.post("/bom-json", {
          body: HttpBody.text("\uFEFF{\"a\":1}", "application/json")
        })
        assert.deepStrictEqual(yield* response.json, { a: 1 })
      }).pipe(Effect.provide(localServerTestLayer)))

    if (name !== "fetch") {
      it.live.each([
        { source: "global", FormData: globalThis.FormData },
        { source: "undici", FormData: Undici.FormData }
      ])("sends $source form data request bodies as multipart", ({ FormData }) =>
        Effect.gen(function*() {
          const formData = new FormData()
          formData.append("title\"\nline", "héllo\n世界\rlast\r\nend")
          formData.append("file\"\rname", new Blob(["file contents"], { type: "text/plain" }), "notes\"\r\nfile.txt")
          const response = yield* HttpClient.post("/multipart", {
            body: HttpBody.formData(formData as globalThis.FormData),
            headers: { "content-type": "multipart/form-data; boundary=caller-boundary" }
          }).pipe(
            Effect.timeout("2 seconds")
          )
          assert.deepStrictEqual(yield* response.json, [
            { key: "title%22%0D%0Aline", value: "héllo\r\n世界\r\nlast\r\nend" },
            {
              key: "file%22%0D%0Aname",
              name: "notes%22%0D%0Afile.txt",
              contentType: "text/plain",
              content: "file contents"
            }
          ])
        }).pipe(Effect.provide(localServerTestLayer)))

      it.live("returns TransportError when a form data file cannot be read", () =>
        Effect.gen(function*() {
          const directory = yield* Effect.acquireRelease(
            Effect.sync(() => mkdtempSync(join(tmpdir(), "effect-form-data-"))),
            (directory) => Effect.sync(() => rmSync(directory, { recursive: true, force: true }))
          )
          const path = join(directory, "notes.txt")
          writeFileSync(path, "file contents")
          const blob = yield* Effect.promise(() => openAsBlob(path, { type: "text/plain" }))
          const formData = new FormData()
          formData.append("file", blob, "notes.txt")
          truncateSync(path, 0)

          const error = yield* HttpClient.post("/multipart", { body: HttpBody.formData(formData) }).pipe(
            Effect.timeout("2 seconds"),
            Effect.flip
          )
          assert(error._tag === "HttpClientError", `Expected HttpClientError, got ${error._tag}`)
          assert.strictEqual(error.reason._tag, "TransportError")
        }).pipe(Effect.provide(localServerTestLayer)))
    }

    if (name === "undici") {
      it.effect.each(formDataResponses)("parses $name response form data", ({ path }) =>
        Effect.gen(function*() {
          const response = yield* HttpClient.get(path)
          const form = yield* response.formData
          assert.deepStrictEqual(form.getAll("tag"), ["one", "two"])
        }).pipe(Effect.provide(localServerTestLayer)))
    }

    it.effect("local server followRedirects", () =>
      Effect.gen(function*() {
        const client = (yield* HttpClient.HttpClient).pipe(
          HttpClient.followRedirects()
        )
        const response = yield* client.get("/redirect")
        expect(new URL(response.url).pathname).toBe("/redirected")
        expect(yield* response.text).toBe("redirected")
      }).pipe(Effect.provide(localServerTestLayer)))

    it.effect("text stream", () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.get("/text").pipe(
          Effect.map((_) => _.stream),
          Stream.unwrap,
          Stream.decodeText(),
          Stream.mkString
        )
        expect(response).toBe("test")
      }).pipe(Effect.provide(localServerTestLayer)))

    it.effect("local server", () =>
      Effect.gen(function*() {
        const local = yield* LocalServerClient
        const response = yield* local.client.get("/todos/1").pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo, {
            reviver: (key, value) => key === "title" ? "revived" : value
          }))
        )
        expect(response.id).toBe(1)
        expect(response.title).toBe("revived")
      }).pipe(
        Effect.provide(localServerTestLayer)
      ))

    it.effect("local server schemaBodyJson", () =>
      Effect.gen(function*() {
        const local = yield* LocalServerClient
        const response = yield* local.createTodo({
          userId: 1,
          title: "test",
          completed: false
        })
        expect(response.title).toBe("test")
      }).pipe(
        Effect.provide(localServerTestLayer)
      ))

    it.effect("round trips QUERY method, body, and content type through the local server", () =>
      Effect.gen(function*() {
        const body = JSON.stringify({ query: "effect" })
        const response = yield* HttpClient.query("/search", {
          body: HttpBody.text(body, "application/json")
        })

        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(yield* response.json, {
          method: "QUERY",
          contentType: "application/json",
          body
        })
      }).pipe(Effect.provide(localServerTestLayer)))

    it.effect("head request with schemaJson", () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.head("/todos").pipe(
          Effect.flatMap(
            HttpClientResponse.schemaJson(Schema.Struct({ status: Schema.Literal(200) }))
          )
        )
        expect(response).toEqual({ status: 200 })
      }).pipe(Effect.provide(localServerTestLayer)))

    it.live("interrupt", () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.get("/hang").pipe(
          Effect.flatMap((_) => _.text),
          Effect.timeout(1),
          Effect.asSome,
          Effect.catchTag("TimeoutError", () => Effect.succeedNone)
        )
        expect(response._tag).toEqual("None")
      }).pipe(Effect.provide(localServerTestLayer)))

    it.effect("close early", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.get("/large")
        expect(response.status).toBe(200)
      }).pipe(Effect.provide(localServerTestLayer)))
  })
})

it.live("releases an immediately failing form data stream and connection before layer teardown", () => {
  const server = Http.createServer((request) => {
    request.on("error", () => {})
    request.resume()
  })
  const layer = HttpServer.layerTestClient.pipe(
    Layer.provide(NodeClient.layerNodeHttp),
    Layer.provideMerge(NodeHttpServer.layer(() => server, { port: 0 }))
  )
  return Effect.gen(function*() {
    const streams: Array<ReadableStream<Uint8Array<ArrayBuffer>>> = []
    class BrokenFile extends File {
      override stream() {
        const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
          start(controller) {
            controller.error(new Error("file read failed"))
          }
        })
        streams.push(stream)
        return stream
      }
    }
    const formData = new FormData()
    formData.append("file", new BrokenFile(["file contents"], "notes.txt"))
    const error = yield* HttpClient.post("/", { body: HttpBody.formData(formData) }).pipe(
      Effect.timeout("2 seconds"),
      Effect.match({ onFailure: (error) => error, onSuccess: () => undefined })
    )
    assert.strictEqual(streams.length, 1)
    assert(error?._tag === "HttpClientError", `Expected HttpClientError, got ${error?._tag}`)
    assert.strictEqual(error.reason._tag, "TransportError")
    assert.strictEqual(streams[0].locked, false)
    const connections = yield* Effect.sleep("10 millis").pipe(
      Effect.andThen(Effect.callback<number, Error>((resume) => {
        server.getConnections((error, count) => resume(error ? Effect.fail(error) : Effect.succeed(count)))
      })),
      Effect.repeat({ while: (count) => count !== 0, schedule: Schedule.spaced("10 millis") }),
      Effect.timeout("1 second")
    )
    assert.strictEqual(connections, 0)
  }).pipe(
    Effect.ensuring(Effect.sync(() => server.closeAllConnections())),
    Effect.provide(layer)
  )
})

it.live("returns a stream body encoding failure", () =>
  Effect.gen(function*() {
    yield* Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      yield* request.text
      return HttpServerResponse.empty()
    }).pipe(HttpServer.serveEffect())
    const error = yield* HttpClient.post("/", {
      body: HttpBody.stream(Stream.fail("encode failure"))
    }).pipe(Effect.timeout("1 second"), Effect.flip)
    assert(error._tag === "HttpClientError")
    assert.strictEqual(error.reason._tag, "EncodeError")
    assert.strictEqual(error.reason.cause, "encode failure")
  }).pipe(Effect.provide(HttpServer.layerTestClient.pipe(
    Layer.provide(NodeClient.layerNodeHttp),
    Layer.provideMerge(NodeHttpServer.layer(Http.createServer, { port: 0 }))
  ))))
