import { NodeHttpClient, NodeHttpServer } from "@effect/platform-node"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as ServerError from "@effect/platform/Http/ServerError"
import type { ServerResponse } from "@effect/platform/Http/ServerResponse"
import * as HttpC from "@effect/platform/HttpClient"
import * as Http from "@effect/platform/HttpServer"
import * as Schema from "@effect/schema/Schema"
import { Deferred, Duration, Fiber, Stream } from "effect"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Tracer from "effect/Tracer"
import { createServer } from "http"
import * as Buffer from "node:buffer"
import { assert, describe, expect, it } from "vitest"

const ServerLive = NodeHttpServer.server.layer(createServer, { port: 0 })
const EnvLive = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpServer.etag.layer,
  ServerLive,
  NodeHttpClient.layerWithoutAgent
).pipe(
  Layer.provide(NodeHttpClient.makeAgentLayer({ keepAlive: false }))
)
const runPromise = <E, A>(
  effect: Effect.Effect<
    A,
    E,
    | NodeContext.NodeContext
    | Http.etag.Generator
    | Http.server.Server
    | Http.platform.Platform
    | HttpC.client.Client.Default
  >
) => Effect.runPromise(Effect.provide(effect, EnvLive))

const Todo = Schema.Struct({
  id: Schema.Number,
  title: Schema.String
})
const IdParams = Schema.Struct({
  id: Schema.NumberFromString
})
const todoResponse = Http.response.schemaJson(Todo)

const makeClient = Effect.map(
  Effect.all([Http.server.Server, HttpC.client.Client]),
  ([server, client]) =>
    HttpC.client.mapRequest(
      client,
      HttpC.request.prependUrl(`http://127.0.0.1:${(server.address as Http.server.TcpAddress).port}`)
    )
)
const makeTodoClient = Effect.map(
  makeClient,
  HttpC.client.mapEffectScoped(
    HttpC.response.schemaBodyJson(Todo)
  )
)

describe("HttpServer", () => {
  it("schema", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.get(
          "/todos/:id",
          Effect.flatMap(
            Http.router.schemaParams(IdParams),
            ({ id }) => todoResponse({ id, title: "test" })
          )
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeTodoClient)
      const todo = yield* _(client(HttpC.request.get("/todos/1")))
      expect(todo).toEqual({ id: 1, title: "test" })
    }).pipe(Effect.scoped, runPromise))

  it("formData", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.post(
          "/upload",
          Effect.gen(function*(_) {
            const request = yield* _(Http.request.ServerRequest)
            const formData = yield* _(request.multipart)
            const part = formData.file
            assert(typeof part !== "string")
            const file = part[0]
            expect(file.path.endsWith("/test.txt")).toEqual(true)
            expect(file.contentType).toEqual("text/plain")
            return yield* _(Http.response.json({ ok: "file" in formData }))
          })
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      formData.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt")
      const result = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) })),
        HttpC.response.json
      )
      expect(result).toEqual({ ok: true })
    }).pipe(Effect.scoped, runPromise))

  it("schemaBodyForm", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.post(
          "/upload",
          Effect.gen(function*(_) {
            const files = yield* _(Http.request.schemaBodyForm(Schema.Struct({
              file: Http.multipart.filesSchema,
              test: Schema.String
            })))
            expect(files).toHaveProperty("file")
            expect(files).toHaveProperty("test")
            return Http.response.empty()
          })
        ),
        Effect.tapErrorCause(Effect.logError),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      formData.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt")
      formData.append("test", "test")
      const response = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) })),
        Effect.scoped
      )
      expect(response.status).toEqual(204)
    }).pipe(Effect.scoped, runPromise))

  it("formData withMaxFileSize", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.post(
          "/upload",
          Effect.gen(function*(_) {
            const request = yield* _(Http.request.ServerRequest)
            yield* _(request.multipart)
            return Http.response.empty()
          })
        ),
        Effect.catchTag("MultipartError", (error) =>
          error.reason === "FileTooLarge" ?
            Http.response.empty({ status: 413 }) :
            Effect.fail(error)),
        Http.server.serveEffect(),
        Http.multipart.withMaxFileSize(Option.some(100))
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      const data = new Uint8Array(1000)
      formData.append("file", new Blob([data], { type: "text/plain" }), "test.txt")
      const response = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) })),
        Effect.scoped
      )
      expect(response.status).toEqual(413)
    }).pipe(Effect.scoped, runPromise))

  it("formData withMaxFieldSize", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.post(
          "/upload",
          Effect.gen(function*(_) {
            const request = yield* _(Http.request.ServerRequest)
            yield* _(request.multipart)
            return Http.response.empty()
          })
        ),
        Effect.catchTag("MultipartError", (error) =>
          error.reason === "FieldTooLarge" ?
            Http.response.empty({ status: 413 }) :
            Effect.fail(error)),
        Http.server.serveEffect(),
        Http.multipart.withMaxFieldSize(100)
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      const data = new Uint8Array(1000).fill(1)
      formData.append("file", new TextDecoder().decode(data))
      const response = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) })),
        Effect.scoped
      )
      expect(response.status).toEqual(413)
    }).pipe(Effect.scoped, Effect.tapErrorCause(Effect.log), runPromise))

  it("mount", () =>
    Effect.gen(function*(_) {
      const child = Http.router.empty.pipe(
        Http.router.get("/", Effect.map(Http.request.ServerRequest, (_) => Http.response.text(_.url))),
        Http.router.get("/:id", Effect.map(Http.request.ServerRequest, (_) => Http.response.text(_.url)))
      )
      yield* _(
        Http.router.empty,
        Http.router.mount("/child", child),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const todo = yield* _(client(HttpC.request.get("/child/1")), Effect.flatMap((_) => _.text), Effect.scoped)
      expect(todo).toEqual("/1")
      const root = yield* _(client(HttpC.request.get("/child")), Effect.flatMap((_) => _.text), Effect.scoped)
      expect(root).toEqual("/")
    }).pipe(Effect.scoped, runPromise))

  it("mountApp", () =>
    Effect.gen(function*(_) {
      const child = Http.router.empty.pipe(
        Http.router.get("/", Effect.map(Http.request.ServerRequest, (_) => Http.response.text(_.url))),
        Http.router.get("/:id", Effect.map(Http.request.ServerRequest, (_) => Http.response.text(_.url)))
      )
      yield* _(
        Http.router.empty,
        Http.router.mountApp("/child", child),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const todo = yield* _(client(HttpC.request.get("/child/1")), HttpC.response.text)
      expect(todo).toEqual("/1")
      const root = yield* _(client(HttpC.request.get("/child")), HttpC.response.text)
      expect(root).toEqual("/")
    }).pipe(Effect.scoped, runPromise))

  it("mountApp/includePrefix", () =>
    Effect.gen(function*(_) {
      const child = Http.router.empty.pipe(
        Http.router.get("/child/", Effect.map(Http.request.ServerRequest, (_) => Http.response.text(_.url))),
        Http.router.get("/child/:id", Effect.map(Http.request.ServerRequest, (_) => Http.response.text(_.url)))
      )
      yield* _(
        Http.router.empty,
        Http.router.mountApp("/child", child, { includePrefix: true }),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const todo = yield* _(client(HttpC.request.get("/child/1")), HttpC.response.text)
      expect(todo).toEqual("/child/1")
      const root = yield* _(client(HttpC.request.get("/child")), HttpC.response.text)
      expect(root).toEqual("/child")
    }).pipe(Effect.scoped, runPromise))

  it("file", () =>
    Effect.gen(function*(_) {
      yield* _(
        yield* _(
          Http.response.file(`${__dirname}/fixtures/text.txt`),
          Effect.updateService(
            Http.platform.Platform,
            (_) => ({
              ..._,
              fileResponse: (path, options) =>
                Effect.map(
                  _.fileResponse(path, options),
                  (res) => {
                    ;(res as any).headers.etag = "\"etag\""
                    return res
                  }
                )
            })
          )
        ),
        Effect.tapErrorCause(Effect.logError),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const res = yield* _(client(HttpC.request.get("/")), Effect.scoped)
      expect(res.status).toEqual(200)
      expect(res.headers["content-type"]).toEqual("text/plain")
      expect(res.headers["content-length"]).toEqual("27")
      expect(res.headers.etag).toEqual("\"etag\"")
      const text = yield* _(res.text)
      expect(text.trim()).toEqual("lorem ipsum dolar sit amet")
    }).pipe(Effect.scoped, runPromise))

  it("fileWeb", () =>
    Effect.gen(function*(_) {
      const now = new Date()
      const file = new Buffer.File([new TextEncoder().encode("test")], "test.txt", {
        type: "text/plain",
        lastModified: now.getTime()
      })
      yield* _(
        Http.response.fileWeb(file),
        Effect.updateService(
          Http.platform.Platform,
          (_) => ({
            ..._,
            fileWebResponse: (path, options) =>
              Effect.map(
                _.fileWebResponse(path, options),
                (res) => ({ ...res, headers: { ...res.headers, etag: "W/\"etag\"" } })
              )
          })
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const res = yield* _(client(HttpC.request.get("/")), Effect.scoped)
      expect(res.status).toEqual(200)
      expect(res.headers["content-type"]).toEqual("text/plain")
      expect(res.headers["content-length"]).toEqual("4")
      expect(res.headers["last-modified"]).toEqual(now.toUTCString())
      expect(res.headers.etag).toEqual("W/\"etag\"")
      const text = yield* _(res.text)
      expect(text.trim()).toEqual("test")
    }).pipe(Effect.scoped, runPromise))

  it("schemaBodyUrlParams", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.post(
          "/todos",
          Effect.flatMap(
            Http.request.schemaBodyUrlParams(Schema.Struct({
              id: Schema.NumberFromString,
              title: Schema.String
            })),
            ({ id, title }) => todoResponse({ id, title })
          )
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeTodoClient)
      const todo = yield* _(
        HttpC.request.post("/todos"),
        HttpC.request.urlParamsBody({ id: "1", title: "test" }),
        client,
        Effect.scoped
      )
      expect(todo).toEqual({ id: 1, title: "test" })
    }).pipe(Effect.scoped, runPromise))

  it("schemaBodyUrlParams error", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.get(
          "/todos",
          Effect.flatMap(
            Http.request.schemaBodyUrlParams(Schema.Struct({
              id: Schema.NumberFromString,
              title: Schema.String
            })),
            ({ id, title }) => todoResponse({ id, title })
          )
        ),
        Http.router.catchTag("ParseError", (error) => Http.response.unsafeJson({ error }, { status: 400 })),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const response = yield* _(
        HttpC.request.get("/todos"),
        client,
        Effect.scoped
      )
      expect(response.status).toEqual(400)
    }).pipe(Effect.scoped, runPromise))

  it("schemaBodyFormJson", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.post(
          "/upload",
          Effect.gen(function*(_) {
            const result = yield* _(
              Http.request.schemaBodyFormJson(Schema.Struct({
                test: Schema.String
              }))("json")
            )
            expect(result.test).toEqual("content")
            return Http.response.empty()
          })
        ),
        Effect.tapErrorCause(Effect.logError),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      formData.append("json", JSON.stringify({ test: "content" }))
      const response = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) })),
        Effect.scoped
      )
      expect(response.status).toEqual(204)
    }).pipe(Effect.scoped, runPromise))

  it("schemaBodyFormJson file", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.post(
          "/upload",
          Effect.gen(function*(_) {
            const result = yield* _(
              Http.request.schemaBodyFormJson(Schema.Struct({
                test: Schema.String
              }))("json")
            )
            expect(result.test).toEqual("content")
            return Http.response.empty()
          })
        ),
        Effect.tapErrorCause(Effect.logError),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      formData.append(
        "json",
        new Blob([JSON.stringify({ test: "content" })], { type: "application/json" }),
        "test.json"
      )
      const response = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) })),
        Effect.scoped
      )
      expect(response.status).toEqual(204)
    }).pipe(Effect.scoped, runPromise))

  it("schemaBodyFormJson url encoded", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.post(
          "/upload",
          Effect.gen(function*(_) {
            const result = yield* _(
              Http.request.schemaBodyFormJson(Schema.Struct({
                test: Schema.String
              }))("json")
            )
            expect(result.test).toEqual("content")
            return Http.response.empty()
          })
        ),
        Effect.tapErrorCause(Effect.logError),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const response = yield* _(
        client(
          HttpC.request.post("/upload", {
            body: HttpC.body.urlParams(HttpC.urlParams.fromInput({
              json: JSON.stringify({ test: "content" })
            }))
          })
        ),
        Effect.scoped
      )
      expect(response.status).toEqual(204)
    }).pipe(Effect.scoped, runPromise))

  it("tracing", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.get(
          "/",
          Effect.flatMap(
            Effect.currentSpan,
            (_) => Http.response.json({ spanId: _.spanId, parent: _.parent })
          )
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const requestSpan = yield* _(Effect.makeSpan("client request"))
      const body = yield* _(
        client(HttpC.request.get("/")),
        HttpC.response.json,
        Effect.withTracer(Tracer.make({
          span(name, parent, _, __, ___, kind) {
            assert.strictEqual(name, "http.client GET")
            assert.strictEqual(kind, "client")
            assert(parent._tag === "Some" && parent.value._tag === "Span")
            assert.strictEqual(parent.value.name, "request parent")
            return requestSpan
          },
          context(f, _fiber) {
            return f()
          }
        })),
        Effect.withSpan("request parent"),
        Effect.repeatN(2)
      )
      expect((body as any).parent.value.spanId).toEqual(requestSpan.spanId)
    }).pipe(Effect.scoped, runPromise))

  it("client abort", () =>
    Effect.gen(function*(_) {
      const latch = yield* _(Deferred.make<ServerResponse>())
      yield* _(
        Http.response.empty(),
        Effect.delay(1000),
        Effect.interruptible,
        Http.server.serveEffect((app) => Effect.onExit(app, (exit) => Deferred.complete(latch, exit)))
      )
      const client = yield* _(makeClient)
      const fiber = yield* _(client(HttpC.request.get("/")), Effect.scoped, Effect.fork)
      yield* _(Effect.sleep(100))
      yield* _(Fiber.interrupt(fiber))
      const cause = yield* _(Deferred.await(latch), Effect.sandbox, Effect.flip)
      expect(ServerError.isClientAbortCause(cause)).toEqual(true)
    }).pipe(Effect.scoped, runPromise))

  it("multiplex", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.multiplex.empty,
        Http.multiplex.hostExact("a.example.com", Http.response.text("A")),
        Http.multiplex.hostStartsWith("b.", Http.response.text("B")),
        Http.multiplex.hostRegex(/^c\.example/, Http.response.text("C")),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      expect(
        yield* _(
          client(
            HttpC.request.get("/").pipe(
              HttpC.request.setHeader("host", "a.example.com")
            )
          ),
          HttpC.response.text
        )
      ).toEqual("A")
      expect(
        yield* _(
          client(
            HttpC.request.get("/").pipe(
              HttpC.request.setHeader("host", "b.example.com")
            )
          ),
          HttpC.response.text
        )
      ).toEqual("B")
      expect(
        yield* _(
          client(
            HttpC.request.get("/").pipe(
              HttpC.request.setHeader("host", "b.org")
            )
          ),
          HttpC.response.text
        )
      ).toEqual("B")
      expect(
        yield* _(
          client(
            HttpC.request.get("/").pipe(
              HttpC.request.setHeader("host", "c.example.com")
            )
          ),
          HttpC.response.text
        )
      ).toEqual("C")
    }).pipe(Effect.scoped, runPromise))

  it("html", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.get("/home", Http.response.html("<html />")),
        Http.router.get(
          "/about",
          Http.response.html`<html>${Effect.succeed("<body />")}</html>`
        ),
        Http.router.get(
          "/stream",
          Http.response.htmlStream`<html>${Stream.make("<body />", 123, "hello")}</html>`
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const home = yield* _(HttpC.request.get("/home"), client, HttpC.response.text)
      expect(home).toEqual("<html />")
      const about = yield* _(HttpC.request.get("/about"), client, HttpC.response.text)
      expect(about).toEqual("<html><body /></html>")
      const stream = yield* _(HttpC.request.get("/stream"), client, HttpC.response.text)
      expect(stream).toEqual("<html><body />123hello</html>")
    }).pipe(Effect.scoped, runPromise))

  it("setCookie", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.get(
          "/home",
          Http.response.empty().pipe(
            Http.response.unsafeSetCookie("test", "value"),
            Http.response.unsafeSetCookie("test2", "value2", {
              httpOnly: true,
              secure: true,
              sameSite: "lax",
              partitioned: true,
              path: "/",
              domain: "example.com",
              expires: new Date(2022, 1, 1, 0, 0, 0, 0),
              maxAge: "5 minutes"
            })
          )
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const res = yield* _(HttpC.request.get("/home"), client, Effect.scoped)
      assert.deepStrictEqual(
        res.cookies.toJSON(),
        Http.cookies.fromReadonlyRecord({
          test: Http.cookies.unsafeMakeCookie("test", "value"),
          test2: Http.cookies.unsafeMakeCookie("test2", "value2", {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            partitioned: true,
            path: "/",
            domain: "example.com",
            expires: new Date(2022, 1, 1, 0, 0, 0, 0),
            maxAge: Duration.minutes(5)
          })
        }).toJSON()
      )
    }).pipe(Effect.scoped, runPromise))

  it("uninterruptible routes", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.get(
          "/home",
          Effect.gen(function*(_) {
            const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
            setTimeout(() => fiber.unsafeInterruptAsFork(fiber.id()), 10)
            return yield* _(Http.response.empty(), Effect.delay(50))
          }),
          { uninterruptible: true }
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const res = yield* _(HttpC.request.get("/home"), client, Effect.scoped)
      assert.strictEqual(res.status, 204)
    }).pipe(Effect.scoped, runPromise))
})
