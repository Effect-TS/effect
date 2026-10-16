import { NodeHttpServer } from "@effect/platform-node"
import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import { assert, describe, expect, it } from "@effect/vitest"
import { Struct } from "effect"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { flow } from "effect/Function"
import {
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "effect/http"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Socket from "effect/socket/Socket"
import * as Stream from "effect/Stream"
import * as Http from "node:http"
import type * as Net from "node:net"

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

// Answers upgrade requests by hand, like a Docker Engine attach endpoint.
const makeUpgradeServer = (onClose: Effect.Effect<void>) =>
  Effect.acquireRelease(
    Effect.callback<Http.Server>((resume) => {
      const server = Http.createServer()
      server.on("upgrade", (request: Http.IncomingMessage, socket: Net.Socket) => {
        socket.on("close", () => Effect.runFork(onClose))
        if (request.url === "/base/refuse") {
          const body = JSON.stringify({ message: "no such container" })
          socket.end(
            `HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\n\r\n${body}`
          )
          return
        }
        socket.write(
          "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\n" +
            `Upgrade: ${request.headers.upgrade}\r\nX-Url: ${request.url}\r\n` +
            `X-Authorization: ${request.headers.authorization}\r\n\r\nhello|`
        )
        socket.on("data", (chunk) => socket.write(`echo:${chunk}|`))
        socket.on("end", () => socket.end("bye"))
      })
      server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
    }),
    (server) =>
      Effect.callback<void>((resume) => {
        server.closeAllConnections()
        server.close(() => resume(Effect.void))
      })
  ).pipe(
    Effect.map((server) =>
      HttpClient.mapRequest(flow(
        HttpClientRequest.prependUrl(`http://127.0.0.1:${(server.address() as Net.AddressInfo).port}/base`),
        HttpClientRequest.bearerToken("token")
      ))
    )
  )

const readUntilClose = (reader: Socket.Reader) =>
  Effect.gen(function*() {
    const decoder = new TextDecoder()
    let text = ""
    while (true) {
      const chunks = yield* reader.pull.pipe(
        Effect.catchReason("SocketError", "SocketCloseError", () => Effect.succeed(undefined))
      )
      if (chunks === undefined) return text
      for (const chunk of chunks) text += typeof chunk === "string" ? chunk : decoder.decode(chunk)
    }
  })

describe("NodeHttpClient upgrade", () => {
  ;[
    { name: "node:http", layer: NodeClient.layerNodeHttp },
    { name: "undici", layer: NodeClient.layerUndici }
  ].forEach(({ layer, name }) => {
    describe(name, () => {
      it.effect("hands over the connection of a 101 response", () =>
        Effect.gen(function*() {
          const client = (yield* HttpClient.HttpClient).pipe(yield* makeUpgradeServer(Effect.void))
          const response = yield* client.execute(
            HttpClientRequest.post("/attach").pipe(HttpClientRequest.upgrade("tcp"))
          )
          assert.strictEqual(response.status, 101)
          assert.strictEqual(response.headers["upgrade"], "tcp")
          assert.strictEqual(response.headers["x-url"], "/base/attach")
          assert.strictEqual(response.headers["x-authorization"], "Bearer token")

          const socket = yield* response.upgrade
          const reader = yield* socket.reader
          // releasing the writer half-closes, so the server answers "bye"
          yield* Effect.scoped(Effect.flatMap(socket.writer, (writer) => writer.write("ping")))
          assert.strictEqual(yield* readUntilClose(reader), "hello|echo:ping|bye")
        }).pipe(Effect.scoped, Effect.provide(layer)))

      it.effect("reads a refused upgrade as an ordinary response", () =>
        Effect.gen(function*() {
          const client = (yield* HttpClient.HttpClient).pipe(yield* makeUpgradeServer(Effect.void))
          const response = yield* client.execute(
            HttpClientRequest.post("/refuse").pipe(HttpClientRequest.upgrade("tcp"))
          )
          assert.strictEqual(response.status, 404)
          const error = yield* Effect.flip(response.upgrade)
          assert.strictEqual(error.reason._tag, "StatusCodeError")
          assert.deepStrictEqual(yield* response.json, { message: "no such container" })
        }).pipe(Effect.scoped, Effect.provide(layer)))

      it.effect("closes the connection with the reader's scope", () =>
        Effect.gen(function*() {
          const closed = yield* Deferred.make<void>()
          const client = (yield* HttpClient.HttpClient).pipe(yield* makeUpgradeServer(Deferred.succeed(closed, void 0)))
          const response = yield* client.execute(
            HttpClientRequest.post("/attach").pipe(HttpClientRequest.upgrade("tcp"))
          )
          const socket = yield* response.upgrade
          const reader = yield* Effect.scoped(socket.reader)
          yield* Deferred.await(closed)
          const error = yield* Effect.flip(reader.pull)
          assert.strictEqual(error.reason._tag, "SocketCloseError")
        }).pipe(Effect.scoped, Effect.provide(layer)))

      it.effect("closes the connection with the request's scope", () =>
        Effect.gen(function*() {
          const closed = yield* Deferred.make<void>()
          const client = (yield* HttpClient.HttpClient).pipe(
            yield* makeUpgradeServer(Deferred.succeed(closed, void 0)),
            HttpClient.withScope
          )
          yield* client.execute(HttpClientRequest.post("/attach").pipe(HttpClientRequest.upgrade("tcp"))).pipe(
            Effect.flatMap((response) => response.upgrade),
            Effect.scoped
          )
          yield* Deferred.await(closed)
        }).pipe(Effect.scoped, Effect.provide(layer)))
    })
  })

  it.effect("fetch fails an upgrade request before sending it", () =>
    Effect.gen(function*() {
      const error = yield* HttpClient.execute(
        HttpClientRequest.post("http://127.0.0.1:1/attach").pipe(HttpClientRequest.upgrade("tcp"))
      ).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "UpgradeNotSupportedError")
    }).pipe(Effect.provide(NodeClient.layerFetch)))
})
