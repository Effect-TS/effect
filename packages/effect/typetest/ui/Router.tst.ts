import { Effect, Schema } from "effect"
import { Command, Component, Route, Router } from "effect/ui"
import { describe, expect, it } from "tstyche"

const AppRoute = Route.union({
  Home: Route.make("/"),
  Search: Route.make("/search", {
    query: {
      q: Schema.optional(Schema.String),
      page: Schema.Number.pipe(Schema.withDecodingDefaultKey(Effect.succeed(1)))
    }
  }),
  NotFound: Route.make("/*")
})
const SearchRoute = AppRoute.subset(["Search"])
const search = SearchRoute.make({ _tag: "Search" })

describe("Router.patchQuery", () => {
  it("types the patch by the held route's query fields", () => {
    expect<Router.QueryPatch<typeof search>>().type.toBe<
      { readonly q?: string | undefined; readonly page?: number | undefined }
    >()
    expect(Router.patchQuery(AppRoute, search, { q: "a" })).type.toBe<
      Command.Issued<Router.PatchOutcome, Router.PatchQuery, Router.PatchOutcome, "Effect">
    >()
    expect(Router.patchQuery).type.toBeCallableWith(AppRoute, search, {})
    // undefined removes a param, or resets a defaulted one.
    expect(Router.patchQuery).type.toBeCallableWith(AppRoute, search, { q: undefined, page: undefined })
    expect(Router.patchQuery).type.toBeCallableWith(AppRoute, search, { page: 2 }, { history: "push", scroll: true })
    expect(Router.patchQuery).type.not.toBeCallableWith(AppRoute, search, { page: "2" })
    expect(Router.patchQuery).type.not.toBeCallableWith(AppRoute, search, { tab: "x" })
    expect(Router.patchQuery).type.not.toBeCallableWith(AppRoute, search, { q: "a" }, { history: "pop" })
  })

  it("takes a held route that is a member of the union", () => {
    const Other = Route.union({ Search: Route.make("/search", { query: { q: Schema.Number } }) })
    expect(Router.patchQuery).type.toBeCallableWith(SearchRoute, search, { q: "a" })
    expect(Router.patchQuery).type.not.toBeCallableWith(AppRoute.subset(["Home"]), search, { q: "a" })
    expect(Router.patchQuery).type.not.toBeCallableWith(AppRoute, { _tag: "Search" }, { q: "a" })
    expect(Router.patchQuery).type.not.toBeCallableWith(AppRoute, Other.make({ _tag: "Search", query: { q: 1 } }), {})
  })

  it("adds stale to the outcome, and PatchQuery to the requirements", () => {
    expect<Router.PatchOutcome>().type.toBe<"navigated" | "blocked" | "stale">()
    const Message = Schema.TaggedUnion({ Typed: { value: Schema.String }, Patched: {} })
    const Box = Component.define({
      name: "Box",
      props: Schema.Struct({ route: SearchRoute }),
      model: Schema.Struct({ typed: Schema.Number }),
      message: Message
    }).make({
      init: () => ({ typed: 0 }),
      update: (model, message, $) =>
        message._tag === "Typed"
          ? $.run(
            Router.patchQuery(AppRoute, $.props.route, { q: message.value || undefined }).pipe(
              Command.map(() => Message.make({ _tag: "Patched" }))
            )
          )
          : model,
      view: (_, h) => h.text("")
    })
    expect<Component.Requirements<typeof Box>>().type.toBe<Router.PatchQuery>()
  })
})
