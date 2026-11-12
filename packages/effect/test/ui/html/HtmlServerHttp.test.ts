import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { HttpRouter } from "effect/http"
import { Component, Route } from "effect/ui"
import { Html, type HtmlServer } from "effect/ui/html"
import { layerHttp } from "effect/ui/html/HtmlServerHttp"
import { App, AppRoute, People } from "./fixtures/routed.ts"

describe("HtmlServerHttp.layerHttp", () => {
  const request = async (pages: Layer.Layer<never, never, HttpRouter.HttpRouter>, path: string) => {
    const { dispose, handler } = HttpRouter.toWebHandler(pages, { disableLogger: true })
    try {
      const response = await handler(new Request(`http://localhost${path}`, { redirect: "manual" }))
      return { status: response.status, headers: response.headers, body: await response.text() }
    } finally {
      await dispose()
    }
  }

  const document = (page: HtmlServer.Rendered<unknown>) =>
    `<html ${page.htmlAttributes}><head>${page.head}</head><body>${page.html}</body></html>`

  const pages = layerHttp(App, { routes: AppRoute, document }).pipe(Layer.provide(People.layer))

  it("renders the route at the URL into the document, with the props the client mounts with", async () => {
    const response = await request(pages, "/people/1")
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.headers.get("content-type"), "text/html")
    assert.include(response.body, "<html lang=\"en\" class=\"routed\"")
    assert.include(response.body, "<title data-eui>Person 1 · App</title>")
    assert.include(response.body, "<p id=\"bio\">Bio of person 1</p>")
  })

  it("renders the catch-all route with a 404", async () => {
    const response = await request(pages, "/nowhere")
    assert.strictEqual(response.status, 404)
    assert.include(response.body, "<h1>Not found</h1>")
  })

  it("answers a URL the routes don't resolve with a 404, without rendering", async () => {
    let rendered = 0
    const HomeRoute = Route.union({ Home: Route.make("/") })
    const Root = Component.make({
      name: "Root",
      props: Schema.Struct({ route: HomeRoute }),
      model: Schema.Struct({}),
      message: Schema.Never,
      elements: Html,
      init: () => {
        rendered++
        return {}
      },
      update: (model) => model,
      view: (_, h) => h.h1("Home")
    })
    const response = await request(layerHttp(Root, { routes: HomeRoute, document }), "/missing")
    assert.strictEqual(response.status, 404)
    assert.strictEqual(rendered, 0)
    assert.strictEqual((await request(layerHttp(Root, { routes: HomeRoute, document }), "/")).status, 200)
  })

  it("redirects a normalised URL to the printed route", async () => {
    const response = await request(pages, "/people/1/")
    assert.strictEqual(response.status, 301)
    assert.strictEqual(response.headers.get("location"), "/people/1")
  })

  it("redirects a URL with query params dropped as invalid temporarily, keeping the others", async () => {
    const ListRoute = Route.union({
      List: Route.make("/list", { query: { page: Schema.Int.pipe(Schema.withDecodingDefaultKey(Effect.succeed(1))) } })
    })
    const List = Component.make({
      name: "List",
      props: Schema.Struct({ route: ListRoute }),
      model: Schema.Struct({}),
      message: Schema.Never,
      elements: Html,
      init: () => ({}),
      update: (model) => model,
      view: (_, h) => h.p(`Page ${h.props.route.query.page}`)
    })
    const lists = layerHttp(List, { routes: ListRoute, document })
    const response = await request(lists, "/list?page=x&utm_source=mail")
    assert.strictEqual(response.status, 302)
    assert.strictEqual(response.headers.get("location"), "/list?utm_source=mail")
    const valid = await request(lists, "/list?page=2&utm_source=mail")
    assert.strictEqual(valid.status, 200)
    assert.include(valid.body, "Page 2")
  })

  it("lets status replace the default, from the route and the root's Model", async () => {
    const seen: Array<unknown> = []
    const withStatus = layerHttp(App, {
      routes: AppRoute,
      document,
      status: (route, model) => {
        seen.push(model?.route)
        return route._tag === "Person" && route.params.id === 9 ? 410 : 200
      }
    }).pipe(Layer.provide(People.layer))
    assert.strictEqual((await request(withStatus, "/people/9")).status, 410)
    assert.strictEqual((await request(withStatus, "/nowhere")).status, 200)
    assert.deepStrictEqual(seen, [
      AppRoute.make({ _tag: "Person", params: { id: 9 } }),
      AppRoute.make({ _tag: "NotFound", params: { "*": "nowhere" } })
    ])
  })
})
