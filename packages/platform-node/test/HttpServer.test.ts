import * as Etag from "@effect/platform-node/Http/Etag"
import * as Platform from "@effect/platform-node/Http/Platform"
import * as HttpC from "@effect/platform-node/HttpClient"
import * as Http from "@effect/platform-node/HttpServer"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { createServer } from "http"
import * as Buffer from "node:buffer"
import { assert, describe, expect, it } from "vitest"

const ServerLive = Http.server.layer(createServer, { port: 0 })
const EnvLive = Layer.mergeAll(
  NodeContext.layer,
  Etag.layer,
  ServerLive,
  HttpC.nodeClient.layerWithoutAgent
).pipe(
  Layer.provide(HttpC.nodeClient.makeAgentLayer({ keepAlive: false }))
)
const runPromise = <E, A>(
  effect: Effect.Effect<
    NodeContext.NodeContext | Etag.Generator | Http.server.Server | Platform.Platform | HttpC.client.Client.Default,
    E,
    A
  >
) => Effect.runPromise(Effect.provide(effect, EnvLive))

const Todo = Schema.struct({
  id: Schema.number,
  title: Schema.string
})
const IdParams = Schema.struct({
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
  HttpC.client.mapEffect(
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
            const formData = yield* _(request.formData)
            const part = formData.file
            assert(typeof part !== "string")
            const file = part[0]
            expect(file.path.endsWith("/test.txt")).toEqual(true)
            expect(file.contentType).toEqual("text/plain")
            return yield* _(Http.response.json({ ok: "file" in formData }))
          }).pipe(Effect.scoped)
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      formData.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt")
      const result = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) })),
        Effect.flatMap((_) => _.json)
      )
      expect(result).toEqual({ ok: true })
    }).pipe(Effect.scoped, runPromise))

  it("schemaFormData", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.post(
          "/upload",
          Effect.gen(function*(_) {
            const files = yield* _(Http.request.schemaFormData(Schema.struct({
              file: Http.formData.filesSchema,
              test: Schema.string
            })))
            expect(files).toHaveProperty("file")
            expect(files).toHaveProperty("test")
            return Http.response.empty()
          }).pipe(Effect.scoped)
        ),
        Effect.tapErrorCause(Effect.logError),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      formData.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt")
      formData.append("test", "test")
      const response = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) }))
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
            yield* _(request.formData)
            return Http.response.empty()
          }).pipe(Effect.scoped)
        ),
        Effect.catchTag("FormDataError", (error) =>
          error.reason === "FileTooLarge" ?
            Http.response.empty({ status: 413 }) :
            Effect.fail(error)),
        Http.server.serveEffect(),
        Http.formData.withMaxFileSize(Option.some(100))
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      const data = new Uint8Array(1000)
      formData.append("file", new Blob([data], { type: "text/plain" }), "test.txt")
      const response = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) }))
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
            yield* _(request.formData)
            return Http.response.empty()
          }).pipe(Effect.scoped)
        ),
        Effect.catchTag("FormDataError", (error) =>
          error.reason === "FieldTooLarge" ?
            Http.response.empty({ status: 413 }) :
            Effect.fail(error)),
        Http.server.serveEffect(),
        Http.formData.withMaxFieldSize(100)
      )
      const client = yield* _(makeClient)
      const formData = new FormData()
      const data = new Uint8Array(1000).fill(1)
      formData.append("file", new TextDecoder().decode(data))
      const response = yield* _(
        client(HttpC.request.post("/upload", { body: HttpC.body.formData(formData) }))
      )
      expect(response.status).toEqual(413)
    }).pipe(Effect.scoped, runPromise))

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
      const todo = yield* _(client(HttpC.request.get("/child/1")), Effect.flatMap((_) => _.text))
      expect(todo).toEqual("/1")
      const root = yield* _(client(HttpC.request.get("/child")), Effect.flatMap((_) => _.text))
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
      const todo = yield* _(client(HttpC.request.get("/child/1")), Effect.flatMap((_) => _.text))
      expect(todo).toEqual("/1")
      const root = yield* _(client(HttpC.request.get("/child")), Effect.flatMap((_) => _.text))
      expect(root).toEqual("/")
    }).pipe(Effect.scoped, runPromise))

  it("file", () =>
    Effect.gen(function*(_) {
      yield* _(
        yield* _(
          Http.response.file(`${__dirname}/fixtures/text.txt`),
          Effect.updateService(
            Platform.Platform,
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
      const res = yield* _(client(HttpC.request.get("/")))
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
          Platform.Platform,
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
      const res = yield* _(client(HttpC.request.get("/")))
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
            Http.request.schemaBodyUrlParams(Schema.struct({
              id: Schema.NumberFromString,
              title: Schema.string
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
        client
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
            Http.request.schemaBodyUrlParams(Schema.struct({
              id: Schema.NumberFromString,
              title: Schema.string
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
        client
      )
      expect(response.status).toEqual(400)
    }).pipe(Effect.scoped, runPromise))

  it("tracing", () =>
    Effect.gen(function*(_) {
      yield* _(
        Http.router.empty,
        Http.router.get(
          "/",
          Effect.flatMap(
            Effect.flatten(Effect.currentSpan),
            (_) => Http.response.json({ spanId: _.spanId, parent: _.parent })
          )
        ),
        Http.server.serveEffect()
      )
      const client = yield* _(makeClient)
      const requestSpan = yield* _(Effect.makeSpan("client request"))
      const body = yield* _(
        client(HttpC.request.get("/")),
        Effect.flatMap((_) => _.json),
        Effect.withParentSpan(requestSpan),
        Effect.scoped,
        Effect.repeatN(2)
      )
      expect((body as any).parent.value.spanId).toEqual(requestSpan.spanId)
    }).pipe(Effect.scoped, runPromise))
})
