import { assert, describe, it } from "@effect/vitest"
import { Effect, Option, Schema } from "effect"
import { Route } from "effect/ui"

const makeRoutes = () =>
  Route.union(
    {
      Home: Route.make("/"),
      NewPerson: Route.make("/people/new"),
      Person: Route.make("/people/:id", {
        params: { id: Schema.Number },
        query: { tab: Schema.optional(Schema.String) }
      }),
      PersonBySlug: Route.make("/people/:slug", { params: { slug: Schema.String } }),
      Search: Route.make("/search", { query: { q: Schema.String, page: Schema.optional(Schema.Number) } }),
      Files: Route.make("/files/*"),
      NotFound: Route.make("/*")
    },
    Route.redirect("/old/:id", (params) => ({ _tag: "Person", params: { id: Number(params.id) }, query: {} }))
  )

const parse = (routes: Route.AnyUnion, url: string): any => Option.getOrUndefined(routes.parse(url))

describe("Route", () => {
  it("ranks a static segment above a param, whatever the order", () => {
    const routes = makeRoutes()
    assert.deepStrictEqual(parse(routes, "/people/new"), { _tag: "NewPerson", params: {}, query: {} })
    assert.deepStrictEqual(parse(routes, "/people/1"), { _tag: "Person", params: { id: 1 }, query: {} })
    const reordered = Route.union({
      Person: Route.make("/people/:id", { params: { id: Schema.String } }),
      NewPerson: Route.make("/people/new")
    })
    assert.strictEqual(parse(reordered, "/people/new")?._tag, "NewPerson")
  })

  it("falls through when a path param fails to decode", () => {
    assert.deepStrictEqual(parse(makeRoutes(), "/people/ada"), {
      _tag: "PersonBySlug",
      params: { slug: "ada" },
      query: {}
    })
  })

  it("makes a required query field that fails to decode a 404, without falling through", () => {
    const routes = makeRoutes()
    assert.deepStrictEqual(parse(routes, "/search?q=a+b&page=2"), {
      _tag: "Search",
      params: {},
      query: { q: "a b", page: 2 }
    })
    assert.strictEqual(parse(routes, "/search")?._tag, "NotFound")
    assert.strictEqual(parse(routes, "/search?q=a&q=b")?._tag, "NotFound")
  })

  it("treats an optional field that fails to decode as absent, and names it", () => {
    const routes = makeRoutes()
    assert.deepStrictEqual(Option.getOrThrow(routes.resolve("/search?q=a&page=x")), {
      route: { _tag: "Search", params: {}, query: { q: "a" } },
      redirected: false,
      notFound: false,
      invalid: ["page"]
    })
    assert.deepStrictEqual(Option.getOrThrow(routes.resolve("/people/1?tab=a&tab=b")), {
      route: { _tag: "Person", params: { id: 1 }, query: {} },
      redirected: false,
      notFound: false,
      invalid: ["tab"]
    })
  })

  it("decodes a lone value into an array field", () => {
    const routes = Route.union({
      Tags: Route.make("/", { query: { tag: Schema.optional(Schema.Array(Schema.String)) } })
    })
    const route = routes.make({ _tag: "Tags", query: { tag: ["x"] } })
    assert.strictEqual(routes.print(route), "/?tag=x")
    assert.deepStrictEqual(parse(routes, "/?tag=x"), route)
  })

  it("decodes, makes and leaves out a query field's decoding default", () => {
    const routes = Route.union({
      Search: Route.make("/search", {
        query: {
          q: Schema.optional(Schema.String),
          page: Schema.Number.pipe(Schema.withDecodingDefaultKey(Effect.succeed(1))),
          sort: Schema.Literals(["name", "date"]).pipe(Schema.withDecodingDefaultKey(Effect.succeed("name" as const)))
        }
      })
    })
    const defaults: typeof routes.Type = { _tag: "Search", params: {}, query: { page: 1, sort: "name" } }
    assert.deepStrictEqual(routes.make({ _tag: "Search" }), defaults)
    assert.deepStrictEqual(parse(routes, "/search"), defaults)
    assert.deepStrictEqual(Option.getOrThrow(routes.resolve("/search?page=abc")), {
      route: defaults,
      redirected: false,
      notFound: false,
      invalid: ["page"]
    })
    assert.strictEqual(routes.print(routes.make({ _tag: "Search", query: { q: "a" } })), "/search?q=a")
    assert.strictEqual(
      routes.print(routes.make({ _tag: "Search", query: { page: 2, sort: "date" } })),
      "/search?page=2&sort=date"
    )
  })

  it("evaluates a query field's decoding default for each URL", () => {
    let fallback = 1
    const routes = Route.union({
      Search: Route.make("/search", {
        query: { page: Schema.Number.pipe(Schema.withDecodingDefaultKey(Effect.sync(() => fallback))) }
      })
    })
    fallback = 2
    assert.strictEqual(Option.getOrThrow(routes.parse("/search")).query.page, 2)
    fallback = 3
    assert.strictEqual(Option.getOrThrow(routes.parse("/search?page=abc")).query.page, 3)
  })

  it("treats Object.prototype names as ordinary query keys", () => {
    const routes = makeRoutes()
    assert.strictEqual(parse(routes, "/?constructor=x")?._tag, "Home")
    assert.deepStrictEqual(parse(routes, "/search?q=a&constructor=x&__proto__=y&toString=z&toString=w"), {
      _tag: "Search",
      params: {},
      query: { q: "a" }
    })
    const keyed = Route.union({ Page: Route.make("/", { query: { constructor: Schema.optional(Schema.String) } }) })
    assert.deepStrictEqual(parse(keyed, "/?constructor=x"), { _tag: "Page", params: {}, query: { constructor: "x" } })
  })

  it("matches the catch-all last, with the path as its rest param", () => {
    assert.deepStrictEqual(parse(makeRoutes(), "/a/b"), { _tag: "NotFound", params: { "*": "a/b" }, query: {} })
    assert.deepStrictEqual(parse(makeRoutes(), "/files/a/b%20c"), {
      _tag: "Files",
      params: { "*": "a/b c" },
      query: {}
    })
  })

  it("strips a trailing slash, matches case-sensitively and ignores the hash", () => {
    const routes = makeRoutes()
    const resolved = Option.getOrThrow(routes.resolve("/people/1/"))
    assert.deepStrictEqual(resolved, {
      route: { _tag: "Person", params: { id: 1 }, query: {} },
      redirected: true,
      notFound: false,
      invalid: []
    })
    assert.strictEqual(parse(routes, "/People/1")?._tag, "NotFound")
    assert.strictEqual(parse(routes, "/people/1#bio")?._tag, "Person")
  })

  it("resolves redirects inside parse", () => {
    const routes = makeRoutes()
    assert.deepStrictEqual(Option.getOrThrow(routes.resolve("/old/3")), {
      route: { _tag: "Person", params: { id: 3 }, query: {} },
      redirected: true,
      notFound: false,
      invalid: []
    })
  })

  it("reports notFound when the URL resolves to the catch-all", () => {
    const routes = makeRoutes()
    assert.isFalse(Option.getOrThrow(routes.resolve("/people/1")).notFound)
    assert.isFalse(Option.getOrThrow(routes.resolve("/files/a")).notFound)
    assert.deepStrictEqual(Option.getOrThrow(routes.resolve("/a/b")), {
      route: { _tag: "NotFound", params: { "*": "a/b" }, query: {} },
      redirected: false,
      notFound: true,
      invalid: []
    })
    // A required query field that fails to decode falls back to the catch-all.
    assert.deepStrictEqual(Option.getOrThrow(routes.resolve("/search?page=x")), {
      route: { _tag: "NotFound", params: { "*": "search" }, query: {} },
      redirected: false,
      notFound: true,
      invalid: []
    })
    const noCatchAll = Route.union({ Home: Route.make("/") })
    assert.isFalse(Option.getOrThrow(noCatchAll.resolve("/")).notFound)
    assert.isTrue(Option.isNone(noCatchAll.resolve("/missing")))
  })

  it("prints through the same Schemas, with no trailing slash", () => {
    const routes = makeRoutes()
    assert.strictEqual(routes.print(routes.make({ _tag: "Home" })), "/")
    assert.strictEqual(
      routes.print(routes.make({ _tag: "Person", params: { id: 2 }, query: { tab: "x y" } })),
      "/people/2?tab=x%20y"
    )
    assert.strictEqual(
      routes.print(routes.make({ _tag: "Search", query: { q: "a&b", page: 3 } })),
      "/search?q=a%26b&page=3"
    )
    assert.strictEqual(routes.print(routes.make({ _tag: "Files", params: { "*": "a/b c" } })), "/files/a/b%20c")
    for (const url of ["/", "/people/2?tab=x%20y", "/search?q=a%26b&page=3", "/files/a/b%20c"]) {
      assert.strictEqual(routes.print(Option.getOrThrow(routes.parse(url))), url)
    }
  })

  it("parses and prints under the base path", () => {
    const routes = makeRoutes()
    routes.setBase("/en/")
    assert.strictEqual(routes.base(), "/en")
    assert.strictEqual(routes.print(routes.make({ _tag: "Home" })), "/en")
    assert.strictEqual(routes.print(routes.make({ _tag: "NewPerson" })), "/en/people/new")
    assert.strictEqual(routes.printPath(routes.make({ _tag: "Search", query: { q: "x" } })), "/en/search")
    assert.strictEqual(parse(routes, "/en/people/5")?._tag, "Person")
    assert.strictEqual(parse(routes, "/en")?._tag, "Home")
    assert.isUndefined(parse(routes, "/fr/people/5"))
  })

  it("parses and prints in the fragment with a # base", () => {
    const routes = makeRoutes()
    routes.setBase("#")
    assert.strictEqual(routes.print(routes.make({ _tag: "Person", params: { id: 1 } })), "#/people/1")
    assert.strictEqual(routes.printPath(routes.make({ _tag: "Search", query: { q: "x" } })), "#/search")
    assert.deepStrictEqual(parse(routes, "#/search?q=x"), { _tag: "Search", params: {}, query: { q: "x" } })
    assert.strictEqual(parse(routes, "#")?._tag, "Home")
    assert.isUndefined(parse(routes, "/people/1"))
  })

  it("subsets a union for a section", () => {
    const routes = makeRoutes()
    const people = routes.subset(["NewPerson", "Person"])
    assert.strictEqual(people.print(people.make({ _tag: "Person", params: { id: 1 } })), "/people/1")
    assert.isUndefined(parse(people, "/"))
    assert.isTrue(routes.isAnyOf(["NewPerson", "Person"])(routes.make({ _tag: "NewPerson" })))
  })

  it("is a Schema of its route values", () => {
    const routes = makeRoutes()
    const decoded = Schema.decodeUnknownSync(routes)({ _tag: "Person", params: { id: 1 }, query: {} })
    assert.deepStrictEqual(decoded, { _tag: "Person", params: { id: 1 }, query: {} })
  })

  it("requires a Schema for every param", () => {
    assert.throws(() => (Route.make as any)("/people/:id", { params: {} }), /no Schema for its :id param/)
  })
})
