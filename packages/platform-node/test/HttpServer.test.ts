import {
  Cookies,
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpLayerRouter,
  HttpMultiplex,
  HttpPlatform,
  HttpRouter,
  HttpServer,
  HttpServerError,
  HttpServerRequest,
  HttpServerRespondable,
  HttpServerResponse,
  Multipart,
  Socket,
  UrlParams
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, expect, it } from "@effect/vitest"
import { Deferred, Duration, Fiber, Stream } from "effect"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { constVoid } from "effect/Function"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Tracer from "effect/Tracer"
import * as Buffer from "node:buffer"
import { randomBytes } from "node:crypto"
import { createConnection } from "node:net"

const Todo = Schema.Struct({
  id: Schema.Number,
  title: Schema.String
})
const IdParams = Schema.Struct({
  id: Schema.NumberFromString
})
const todoResponse = HttpServerResponse.schemaJson(Todo)

describe("HttpServer", () => {
  it.scoped("schema", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.get(
          "/todos/:id",
          Effect.flatMap(
            HttpRouter.schemaParams(IdParams),
            ({ id }) => todoResponse({ id, title: "test" })
          )
        ),
        HttpServer.serveEffect()
      )
      const todo = yield* HttpClient.get("/todos/1").pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
      )
      expect(todo).toEqual({ id: 1, title: "test" })
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("schema HttpLayerRouter", () =>
    Effect.gen(function*() {
      const handler = yield* HttpLayerRouter.toHttpEffect(HttpLayerRouter.use(Effect.fnUntraced(function*(router) {
        yield* router.add(
          "GET",
          "/todos/:id",
          Effect.flatMap(
            HttpLayerRouter.schemaParams(IdParams),
            ({ id }) => todoResponse({ id, title: "test" })
          )
        )
      })))

      yield* HttpServer.serveEffect(handler)

      const todo = yield* HttpClient.get("/todos/1").pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
      )
      expect(todo).toEqual({ id: 1, title: "test" })
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("formData", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.post(
          "/upload",
          Effect.gen(function*() {
            const request = yield* HttpServerRequest.HttpServerRequest
            const formData = yield* request.multipart
            const part = formData.file
            assert(typeof part !== "string")
            const file = part[0]
            assert(typeof file !== "string")
            expect(file.path.endsWith("/test.txt")).toEqual(true)
            expect(file.contentType).toEqual("text/plain")
            return yield* HttpServerResponse.json({ ok: "file" in formData })
          })
        ),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const formData = new FormData()
      formData.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt")
      const result = yield* client.post("/upload", { body: HttpBody.formData(formData) }).pipe(
        Effect.flatMap((r) => r.json)
      )
      expect(result).toEqual({ ok: true })
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("schemaBodyForm", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.post(
          "/upload",
          Effect.gen(function*() {
            const files = yield* HttpServerRequest.schemaBodyForm(Schema.Struct({
              file: Multipart.FilesSchema,
              test: Schema.String
            }))
            expect(files).toHaveProperty("file")
            expect(files).toHaveProperty("test")
            return HttpServerResponse.empty()
          })
        ),
        Effect.tapErrorCause(Effect.logError),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const formData = new FormData()
      formData.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt")
      formData.append("test", "test")
      const response = yield* client.post("/upload", { body: HttpBody.formData(formData) })
      expect(response.status).toEqual(204)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("formData withMaxFileSize", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.post(
          "/upload",
          Effect.gen(function*() {
            const request = yield* HttpServerRequest.HttpServerRequest
            yield* request.multipart
            return HttpServerResponse.empty()
          })
        ),
        Effect.catchTag("MultipartError", (error) =>
          error.reason === "FileTooLarge" ?
            HttpServerResponse.empty({ status: 413 }) :
            Effect.fail(error)),
        HttpServer.serveEffect(),
        Multipart.withMaxFileSize(Option.some(100))
      )
      const client = yield* HttpClient.HttpClient
      const formData = new FormData()
      const data = new Uint8Array(1000)
      formData.append("file", new Blob([data], { type: "text/plain" }), "test.txt")
      const response = yield* client.post("/upload", { body: HttpBody.formData(formData) })
      expect(response.status).toEqual(413)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("formData withMaxFieldSize", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.post(
          "/upload",
          Effect.gen(function*() {
            const request = yield* HttpServerRequest.HttpServerRequest
            yield* request.multipart
            return HttpServerResponse.empty()
          })
        ),
        Effect.catchTag("MultipartError", (error) =>
          error.reason === "FieldTooLarge" ?
            HttpServerResponse.empty({ status: 413 }) :
            Effect.fail(error)),
        HttpServer.serveEffect(),
        Multipart.withMaxFieldSize(100)
      )
      const client = yield* HttpClient.HttpClient
      const formData = new FormData()
      const data = new Uint8Array(1000).fill(1)
      formData.append("file", new TextDecoder().decode(data))
      const response = yield* client.post("/upload", { body: HttpBody.formData(formData) })
      expect(response.status).toEqual(413)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("mount", () =>
    Effect.gen(function*() {
      const child = HttpRouter.empty.pipe(
        HttpRouter.get("/", Effect.map(HttpServerRequest.HttpServerRequest, (_) => HttpServerResponse.text(_.url))),
        HttpRouter.get("/:id", Effect.map(HttpServerRequest.HttpServerRequest, (_) => HttpServerResponse.text(_.url)))
      )
      yield* HttpRouter.empty.pipe(
        HttpRouter.mount("/child", child),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const todo = yield* client.get("/child/1").pipe(Effect.flatMap((_) => _.text))
      expect(todo).toEqual("/1")
      const root = yield* client.get("/child").pipe(Effect.flatMap((_) => _.text))
      expect(root).toEqual("/")
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("mountApp", () =>
    Effect.gen(function*() {
      const child = HttpRouter.empty.pipe(
        HttpRouter.get("/", Effect.map(HttpServerRequest.HttpServerRequest, (_) => HttpServerResponse.text(_.url))),
        HttpRouter.get("/:id", Effect.map(HttpServerRequest.HttpServerRequest, (_) => HttpServerResponse.text(_.url)))
      )
      yield* HttpRouter.empty.pipe(
        HttpRouter.mountApp("/child", child),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const todo = yield* client.get("/child/1").pipe(Effect.flatMap((_) => _.text))
      expect(todo).toEqual("/1")
      const root = yield* client.get("/child").pipe(Effect.flatMap((_) => _.text))
      expect(root).toEqual("/")
      const rootSearch = yield* client.get("/child?foo=bar").pipe(Effect.flatMap((_) => _.text))
      expect(rootSearch).toEqual("?foo=bar")
      const rootSlash = yield* client.get("/child/").pipe(Effect.flatMap((_) => _.text))
      expect(rootSlash).toEqual("/")
      const invalid = yield* client.get("/child1/", {
        urlParams: { foo: "bar" }
      }).pipe(Effect.map((_) => _.status))
      expect(invalid).toEqual(404)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("mountApp/includePrefix", () =>
    Effect.gen(function*() {
      const child = HttpRouter.empty.pipe(
        HttpRouter.get(
          "/child/",
          Effect.map(HttpServerRequest.HttpServerRequest, (_) => HttpServerResponse.text(_.url))
        ),
        HttpRouter.get(
          "/child/:id",
          Effect.map(HttpServerRequest.HttpServerRequest, (_) => HttpServerResponse.text(_.url))
        )
      )
      yield* HttpRouter.empty.pipe(
        HttpRouter.mountApp("/child", child, { includePrefix: true }),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const todo = yield* client.get("/child/1").pipe(Effect.flatMap((_) => _.text))
      expect(todo).toEqual("/child/1")
      const root = yield* client.get("/child").pipe(Effect.flatMap((_) => _.text))
      expect(root).toEqual("/child")
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("file", () =>
    Effect.gen(function*() {
      yield* (yield* HttpServerResponse.file(`${__dirname}/fixtures/text.txt`).pipe(
        Effect.updateService(
          HttpPlatform.HttpPlatform,
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
      )).pipe(
        Effect.tapErrorCause(Effect.logError),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const res = yield* client.get("/")
      expect(res.status).toEqual(200)
      expect(res.headers["content-type"]).toEqual("text/plain")
      expect(res.headers["content-length"]).toEqual("27")
      expect(res.headers.etag).toEqual("\"etag\"")
      const text = yield* res.text
      expect(text.trim()).toEqual("lorem ipsum dolar sit amet")
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("fileWeb", () =>
    Effect.gen(function*() {
      const now = new Date()
      const file = new Buffer.File([new TextEncoder().encode("test")], "test.txt", {
        type: "text/plain",
        lastModified: now.getTime()
      })
      yield* HttpServerResponse.fileWeb(file).pipe(
        Effect.updateService(
          HttpPlatform.HttpPlatform,
          (_) => ({
            ..._,
            fileWebResponse: (path, options) =>
              Effect.map(
                _.fileWebResponse(path, options),
                (res) => ({ ...res, headers: { ...res.headers, etag: "W/\"etag\"" } })
              )
          })
        ),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const res = yield* client.get("/")
      expect(res.status).toEqual(200)
      expect(res.headers["content-type"]).toEqual("text/plain")
      expect(res.headers["content-length"]).toEqual("4")
      expect(res.headers["last-modified"]).toEqual(now.toUTCString())
      expect(res.headers.etag).toEqual("W/\"etag\"")
      const text = yield* res.text
      expect(text.trim()).toEqual("test")
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("schemaBodyUrlParams", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.post(
          "/todos",
          Effect.flatMap(
            HttpServerRequest.schemaBodyUrlParams(Schema.Struct({
              id: Schema.NumberFromString,
              title: Schema.String
            })),
            ({ id, title }) => todoResponse({ id, title })
          )
        ),
        HttpServer.serveEffect()
      )
      const todo = yield* HttpClientRequest.post("/todos").pipe(
        HttpClientRequest.bodyUrlParams({ id: "1", title: "test" }),
        HttpClient.execute,
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
      )
      expect(todo).toEqual({ id: 1, title: "test" })
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("schemaBodyUrlParams error", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.get(
          "/todos",
          Effect.flatMap(
            HttpServerRequest.schemaBodyUrlParams(Schema.Struct({
              id: Schema.NumberFromString,
              title: Schema.String
            })),
            ({ id, title }) => todoResponse({ id, title })
          )
        ),
        HttpRouter.catchTag("ParseError", (error) => HttpServerResponse.unsafeJson({ error }, { status: 400 })),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const response = yield* client.get("/todos")
      expect(response.status).toEqual(400)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("schemaBodyFormJson", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.post(
          "/upload",
          Effect.gen(function*() {
            const result = yield* HttpServerRequest.schemaBodyFormJson(Schema.Struct({
              test: Schema.String
            }))("json")
            expect(result.test).toEqual("content")
            return HttpServerResponse.empty()
          })
        ),
        Effect.tapErrorCause(Effect.logError),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const formData = new FormData()
      formData.append("json", JSON.stringify({ test: "content" }))
      const response = yield* client.post("/upload", { body: HttpBody.formData(formData) })
      expect(response.status).toEqual(204)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("schemaBodyFormJson file", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.post(
          "/upload",
          Effect.gen(function*() {
            const result = yield* HttpServerRequest.schemaBodyFormJson(Schema.Struct({
              test: Schema.String
            }))("json")

            expect(result.test).toEqual("content")
            return HttpServerResponse.empty()
          })
        ),
        Effect.tapErrorCause(Effect.logError),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const formData = new FormData()
      formData.append(
        "json",
        new Blob([JSON.stringify({ test: "content" })], { type: "application/json" }),
        "test.json"
      )
      const response = yield* client.post("/upload", { body: HttpBody.formData(formData) })
      expect(response.status).toEqual(204)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("schemaBodyFormJson url encoded", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.post(
          "/upload",
          Effect.gen(function*() {
            const result = yield* HttpServerRequest.schemaBodyFormJson(Schema.Struct({
              test: Schema.String
            }))("json")
            expect(result.test).toEqual("content")
            return HttpServerResponse.empty()
          })
        ),
        Effect.tapErrorCause(Effect.logError),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const response = yield* client.post("/upload", {
        body: HttpBody.urlParams(UrlParams.fromInput({
          json: JSON.stringify({ test: "content" })
        }))
      })
      expect(response.status).toEqual(204)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("tracing", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.get(
          "/",
          Effect.flatMap(
            Effect.currentSpan,
            (_) => HttpServerResponse.json({ spanId: _.spanId, parent: _.parent })
          )
        ),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const requestSpan = yield* Effect.makeSpan("client request")
      const body = yield* client.get("/").pipe(
        Effect.flatMap((r) => r.json),
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
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scopedLive("client abort", () =>
    Effect.gen(function*() {
      const latch = yield* Deferred.make<HttpServerResponse.HttpServerResponse>()
      yield* HttpServerResponse.empty().pipe(
        Effect.delay(1000),
        Effect.interruptible,
        HttpServer.serveEffect((app) => Effect.onExit(app, (exit) => Deferred.complete(latch, exit)))
      )
      const client = yield* HttpClient.HttpClient
      const fiber = yield* client.get("/").pipe(Effect.fork)
      yield* Effect.sleep(100)
      yield* Fiber.interrupt(fiber)
      const cause = yield* Deferred.await(latch).pipe(Effect.sandbox, Effect.flip)
      const [response] = HttpServerError.causeResponseStripped(cause)
      expect(response.status).toEqual(499)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.effect("causeResponse uses client abort when present", () =>
    Effect.gen(function*() {
      const parentFiberId = yield* Effect.fiberId
      const cause = Cause.sequential(
        Cause.interrupt(parentFiberId),
        Cause.interrupt(HttpServerError.clientAbortFiberId)
      )
      const [response] = yield* HttpServerError.causeResponse(cause)
      expect(response.status).toEqual(499)
    }))

  it.scoped("multiplex", () =>
    Effect.gen(function*() {
      yield* HttpMultiplex.empty.pipe(
        HttpMultiplex.hostExact("a.example.com", HttpServerResponse.text("A")),
        HttpMultiplex.hostStartsWith("b.", HttpServerResponse.text("B")),
        HttpMultiplex.hostRegex(/^c\.example/, HttpServerResponse.text("C")),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      expect(
        yield* client.execute(
          HttpClientRequest.get("/").pipe(
            HttpClientRequest.setHeader("host", "a.example.com")
          )
        ).pipe(
          Effect.flatMap((r) => r.text)
        )
      ).toEqual("A")
      expect(
        yield* client.execute(
          HttpClientRequest.get("/").pipe(
            HttpClientRequest.setHeader("host", "b.example.com")
          )
        ).pipe(
          Effect.flatMap((r) => r.text)
        )
      ).toEqual("B")
      expect(
        yield* client.execute(
          HttpClientRequest.get("/").pipe(
            HttpClientRequest.setHeader("host", "b.org")
          )
        ).pipe(
          Effect.flatMap((r) => r.text)
        )
      ).toEqual("B")
      expect(
        yield* client.execute(
          HttpClientRequest.get("/").pipe(
            HttpClientRequest.setHeader("host", "c.example.com")
          )
        ).pipe(
          Effect.flatMap((r) => r.text)
        )
      ).toEqual("C")
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("html", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.get("/home", HttpServerResponse.html("<html />")),
        HttpRouter.get(
          "/about",
          HttpServerResponse.html`<html>${Effect.succeed("<body />")}</html>`
        ),
        HttpRouter.get(
          "/stream",
          HttpServerResponse.htmlStream`<html>${Stream.make("<body />", 123, "hello")}</html>`
        ),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const home = yield* client.get("/home").pipe(Effect.flatMap((r) => r.text))
      expect(home).toEqual("<html />")
      const about = yield* client.get("/about").pipe(Effect.flatMap((r) => r.text))
      expect(about).toEqual("<html><body /></html>")
      const stream = yield* client.get("/stream").pipe(Effect.flatMap((r) => r.text))
      expect(stream).toEqual("<html><body />123hello</html>")
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("setCookie", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.get(
          "/home",
          HttpServerResponse.empty().pipe(
            HttpServerResponse.unsafeSetCookie("test", "value"),
            HttpServerResponse.unsafeSetCookie("test2", "value2", {
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
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const res = yield* client.get("/home")
      assert.deepStrictEqual(
        res.cookies.toJSON(),
        Cookies.fromReadonlyRecord({
          test: Cookies.unsafeMakeCookie("test", "value"),
          test2: Cookies.unsafeMakeCookie("test2", "value2", {
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
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scopedLive("uninterruptible routes", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.get(
          "/home",
          Effect.gen(function*() {
            const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
            setTimeout(() => fiber.unsafeInterruptAsFork(fiber.id()), 10)
            return yield* HttpServerResponse.empty().pipe(Effect.delay(50))
          }),
          { uninterruptible: true }
        ),
        HttpServer.serveEffect()
      )
      const client = yield* HttpClient.HttpClient
      const res = yield* client.get("/home")
      assert.strictEqual(res.status, 204)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  describe("HttpServerRespondable", () => {
    it.scoped("error/RouteNotFound", () =>
      Effect.gen(function*() {
        yield* HttpRouter.empty.pipe(HttpServer.serveEffect())
        const client = yield* HttpClient.HttpClient
        const res = yield* client.get("/")
        assert.strictEqual(res.status, 404)
      }).pipe(Effect.provide(NodeHttpServer.layerTest)))

    it.scoped("error/schema", () =>
      Effect.gen(function*() {
        class CustomError extends Schema.TaggedError<CustomError>()("CustomError", {
          name: Schema.String
        }) {
          [HttpServerRespondable.symbol]() {
            return HttpServerResponse.schemaJson(CustomError)(this, { status: 599 })
          }
        }
        yield* HttpRouter.empty.pipe(
          HttpRouter.get("/home", new CustomError({ name: "test" })),
          HttpServer.serveEffect()
        )
        const client = yield* HttpClient.HttpClient
        const res = yield* client.get("/home")
        assert.strictEqual(res.status, 599)
        const err = yield* HttpClientResponse.schemaBodyJson(CustomError)(res)
        assert.deepStrictEqual(err, new CustomError({ name: "test" }))
      }).pipe(Effect.provide(NodeHttpServer.layerTest)))

    it.scoped("respondable schema", () =>
      Effect.gen(function*() {
        class User extends Schema.Class<User>("User")({
          name: Schema.String
        }) {
          [HttpServerRespondable.symbol]() {
            return HttpServerResponse.schemaJson(User)(this)
          }
        }
        yield* HttpRouter.empty.pipe(
          HttpRouter.get("/user", Effect.succeed(new User({ name: "test" }))),
          HttpServer.serveEffect()
        )
        const client = yield* HttpClient.HttpClient
        const res = yield* client.get("/user").pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(User))
        )
        assert.deepStrictEqual(res, new User({ name: "test" }))
      }).pipe(Effect.provide(NodeHttpServer.layerTest)))
  })

  it.scoped("bad middleware responds with 500", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.get("/", HttpServerResponse.empty()),
        HttpServer.serveEffect(() => Effect.fail("boom"))
      )
      const client = yield* HttpClient.HttpClient
      const res = yield* client.get("/")
      assert.deepStrictEqual(res.status, 500)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  const routerA = HttpRouter.empty.pipe(
    HttpRouter.get("/a", HttpServerResponse.text("a")),
    HttpRouter.mountApp("/ma", HttpServerResponse.text("ma"))
  )

  const routerB = HttpRouter.empty.pipe(
    HttpRouter.get("/b", HttpServerResponse.text("b")),
    HttpRouter.mountApp("/mb", HttpServerResponse.text("mb"))
  )

  it.scoped("concat", () =>
    Effect.gen(function*() {
      yield* HttpRouter.concat(routerA, routerB).pipe(HttpServer.serveEffect())
      const [responseA, responseMountA, responseB, responseMountB] = yield* Effect.all([
        HttpClient.get("/a"),
        HttpClient.get("/ma"),
        HttpClient.get("/b"),
        HttpClient.get("/mb")
      ])
      expect(yield* responseA.text).toEqual("a")
      expect(yield* responseMountA.text).toEqual("ma")
      expect(yield* responseB.text).toEqual("b")
      expect(yield* responseMountB.text).toEqual("mb")
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("concatAll", () =>
    Effect.gen(function*() {
      yield* HttpRouter.concatAll(routerA, routerB).pipe(HttpServer.serveEffect())
      const [responseA, responseMountA, responseB, responseMountB] = yield* Effect.all([
        HttpClient.get("/a"),
        HttpClient.get("/ma"),
        HttpClient.get("/b"),
        HttpClient.get("/mb")
      ])
      expect(yield* responseA.text).toEqual("a")
      expect(yield* responseMountA.text).toEqual("ma")
      expect(yield* responseB.text).toEqual("b")
      expect(yield* responseMountB.text).toEqual("mb")
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  it.scoped("setRouterConfig", () =>
    Effect.gen(function*() {
      yield* HttpRouter.empty.pipe(
        HttpRouter.get("/:param", HttpServerResponse.empty()),
        HttpServer.serveEffect()
      )
      let res = yield* HttpClient.get("/123456")
      assert.strictEqual(res.status, 404)
      res = yield* HttpClient.get("/12345")
      assert.strictEqual(res.status, 204)
    }).pipe(
      Effect.provide(NodeHttpServer.layerTest),
      HttpRouter.withRouterConfig({
        maxParamLength: 5
      })
    ))

  it.scoped("HttpLayerRouter prefixed", () =>
    Effect.gen(function*() {
      const handler = yield* HttpLayerRouter.toHttpEffect(HttpLayerRouter.use(Effect.fnUntraced(function*(router_) {
        const router = router_.prefixed("/todos")
        yield* router.add(
          "GET",
          "/:id",
          Effect.flatMap(
            HttpLayerRouter.schemaParams(IdParams),
            ({ id }) => todoResponse({ id, title: "test" })
          )
        )
        yield* router.addAll([
          HttpLayerRouter.route("GET", "/", Effect.succeed(HttpServerResponse.text("root")))
        ])
      })))

      yield* HttpServer.serveEffect(handler)

      const todo = yield* HttpClient.get("/todos/1").pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
      )
      expect(todo).toEqual({ id: 1, title: "test" })
      const root = yield* HttpClient.get("/todos").pipe(
        Effect.flatMap((r) => r.text)
      )
      expect(root).toEqual("root")
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))

  describe("HttpServerRequest.toWeb", () => {
    it.scoped("converts POST request with body", () =>
      Effect.gen(function*() {
        yield* HttpRouter.empty.pipe(
          HttpRouter.post(
            "/echo",
            Effect.gen(function*() {
              const request = yield* HttpServerRequest.HttpServerRequest
              const webRequest = yield* HttpServerRequest.toWeb(request)
              assert(webRequest !== undefined, "toWeb returned undefined")
              const body = yield* Effect.promise(() => webRequest.json())
              return HttpServerResponse.unsafeJson({ received: body })
            })
          ),
          HttpServer.serveEffect()
        )
        const client = yield* HttpClient.HttpClient
        const res = yield* client.post("/echo", {
          body: HttpBody.unsafeJson({ message: "hello" })
        })
        assert.strictEqual(res.status, 200)
        const json = yield* res.json
        assert.deepStrictEqual(json, { received: { message: "hello" } })
      }).pipe(Effect.provide(NodeHttpServer.layerTest)))
  })

  describe("HttpServerRequest.upgrade", () => {
    it.scoped("does not write the HTTP response to an upgraded connection", () =>
      Effect.gen(function*() {
        yield* HttpRouter.empty.pipe(
          HttpRouter.get(
            "/ws",
            Effect.gen(function*() {
              const socket = yield* HttpServerRequest.upgrade
              yield* Effect.forkScoped(socket.runRaw(constVoid))
              const write = yield* socket.writer
              yield* write("refused")
              yield* write(new Socket.CloseEvent(4400, "refused"))
              return HttpServerResponse.empty()
            }).pipe(Effect.scoped)
          ),
          HttpServer.serveEffect()
        )
        const address = (yield* HttpServer.HttpServer).address
        assert(address._tag === "TcpAddress")
        const { frames, trailing } = yield* Effect.promise(() => rawWebSocket(address.port, "/ws"))
        assert.strictEqual(frames.length, 2)
        assert.strictEqual(frames[0].opcode, 1)
        assert.strictEqual(frames[0].payload.toString(), "refused")
        assert.strictEqual(frames[1].opcode, 8)
        assert.strictEqual(frames[1].payload.readUInt16BE(0), 4400)
        assert.strictEqual(trailing.toString(), "")
      }).pipe(Effect.provide(NodeHttpServer.layerTest)))

    it.scoped("writes the HTTP response when the upgrade is not consumed", () =>
      Effect.gen(function*() {
        yield* HttpRouter.empty.pipe(
          HttpRouter.get("/no-ws", HttpServerResponse.text("upgrade refused", { status: 426 })),
          HttpServer.serveEffect()
        )
        const address = (yield* HttpServer.HttpServer).address
        assert(address._tag === "TcpAddress")
        const response = yield* Effect.promise(() => rawUpgradeRequest(address.port, "/no-ws"))
        assert.match(response, /^HTTP\/1\.1 426/)
        assert.match(response, /upgrade refused/)
      }).pipe(Effect.provide(NodeHttpServer.layerTest)))
  })
})

interface WebSocketFrame {
  readonly opcode: number
  readonly payload: Buffer.Buffer
}

const parseWebSocketFrames = (
  stream: Buffer.Buffer
): { readonly frames: ReadonlyArray<WebSocketFrame>; readonly trailing: Buffer.Buffer } => {
  const frames: Array<WebSocketFrame> = []
  let offset = 0
  while (stream.length - offset >= 2) {
    const first = stream[offset]
    const second = stream[offset + 1]
    const opcode = first & 0x0f
    let length = second & 0x7f
    let headerSize = 2
    if (length === 126) {
      if (stream.length - offset < 4) break
      length = stream.readUInt16BE(offset + 2)
      headerSize = 4
    } else if (length === 127) {
      break
    }
    const controlFrame = (opcode & 0x8) !== 0
    if (
      (first & 0x70) !== 0 || (second & 0x80) !== 0 ||
      ![0x0, 0x1, 0x2, 0x8, 0x9, 0xa].includes(opcode) ||
      (controlFrame && length > 125)
    ) {
      break
    }
    if (stream.length - offset < headerSize + length) break
    frames.push({ opcode, payload: stream.subarray(offset + headerSize, offset + headerSize + length) })
    offset += headerSize + length
  }
  return { frames, trailing: stream.subarray(offset) }
}

const upgradeRequest = (path: string): string =>
  [
    `GET ${path} HTTP/1.1`,
    "Host: 127.0.0.1",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Key: ${randomBytes(16).toString("base64")}`,
    "Sec-WebSocket-Version: 13",
    "",
    ""
  ].join("\r\n")

const closeFrame = (code: number): Buffer.Buffer => {
  const payload = Buffer.Buffer.alloc(2)
  payload.writeUInt16BE(code, 0)
  const mask = randomBytes(4)
  const masked = Buffer.Buffer.from(payload)
  for (let index = 0; index < masked.length; index++) {
    masked[index] = masked[index] ^ mask[index % 4]
  }
  return Buffer.Buffer.concat([Buffer.Buffer.from([0x88, 0x80 | payload.length]), mask, masked])
}

const rawWebSocket = (
  port: number,
  path: string
): Promise<{ readonly frames: ReadonlyArray<WebSocketFrame>; readonly trailing: Buffer.Buffer }> =>
  new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error("the websocket conversation did not finish in time"))
    }, 5000)
    let upgraded = false
    let stream = Buffer.Buffer.alloc(0)
    let closeEchoed = false
    socket.on("connect", () => socket.write(upgradeRequest(path)))
    socket.on("data", (data) => {
      stream = Buffer.Buffer.concat([stream, data])
      if (!upgraded) {
        const headerEnd = stream.indexOf("\r\n\r\n")
        if (headerEnd === -1) return
        if (!stream.subarray(0, headerEnd).toString().includes("101")) {
          clearTimeout(timer)
          socket.destroy()
          reject(new Error("the upgrade was refused"))
          return
        }
        upgraded = true
        stream = Buffer.Buffer.from(stream.subarray(headerEnd + 4))
      }
      if (!closeEchoed) {
        const close = parseWebSocketFrames(stream).frames.find((frame) => frame.opcode === 8)
        if (close !== undefined) {
          closeEchoed = true
          socket.write(closeFrame(close.payload.length >= 2 ? close.payload.readUInt16BE(0) : 1000))
        }
      }
    })
    socket.on("error", constVoid)
    socket.on("close", () => {
      clearTimeout(timer)
      resolve(parseWebSocketFrames(stream))
    })
  })

const rawUpgradeRequest = (port: number, path: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error("the upgrade request was not answered in time"))
    }, 5000)
    let stream = Buffer.Buffer.alloc(0)
    socket.on("connect", () => socket.write(upgradeRequest(path)))
    socket.on("data", (data) => {
      stream = Buffer.Buffer.concat([stream, data])
    })
    socket.on("error", constVoid)
    socket.on("close", () => {
      clearTimeout(timer)
      resolve(stream.toString())
    })
  })
