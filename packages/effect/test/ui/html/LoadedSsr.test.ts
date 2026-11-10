// @vitest-environment happy-dom
import { expect, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Component } from "effect/ui"
import { Html } from "effect/ui/html"
import { ssr } from "effect/ui/html/testing"
import { describe } from "vitest"

const sleep = (ms: number) => Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))

const make = (options: { readonly staleTime: string; readonly delay?: number }) => {
  const db = { users: 0, posts: 0 }
  /** Updates and views in order, server then client. */
  const order: Array<string> = []
  class GetUser extends Loader.Service<GetUser>()(
    "users/GetUser",
    {
      args: Schema.Struct({ id: Schema.String }),
      success: Schema.String,
      error: Schema.String,
      staleTime: options.staleTime as any
    },
    Effect.succeed(({ id }) =>
      Effect.gen(function*() {
        db.users++
        yield* sleep(options.delay ?? 5)
        return id === "404" ? yield* Effect.fail("no such user") : `user-${id}`
      })
    )
  ) {}
  class GetPosts extends Loader.Service<GetPosts>()(
    "users/GetPosts",
    {
      args: Schema.Struct({ author: Schema.String }),
      success: Schema.Array(Schema.String),
      error: Schema.Never,
      staleTime: options.staleTime as any
    },
    Effect.succeed(({ author }) =>
      Effect.gen(function*() {
        db.posts++
        yield* sleep(5)
        return [`post by ${author}`]
      })
    )
  ) {}

  const Message = Schema.TaggedUnion({
    User: { snapshot: Loader.Snapshot(GetUser, "user") },
    Posts: { snapshot: Loader.Snapshot(GetPosts, "posts") }
  })
  const Profile = Component.make({
    name: "Profile",
    props: Schema.Struct({ id: Schema.String, posts: Schema.Boolean }),
    model: Schema.Struct({
      user: Loader.Snapshot(GetUser, "user"),
      posts: Loader.Snapshot(GetPosts, "posts")
    }),
    message: Message,
    elements: Html,
    loaders: {
      user: (_model, props) => ({ id: props.id }),
      // A dependent read: its args come from the first read's result, so it starts a round later.
      posts: (_model, props, loaded) =>
        props.posts && AsyncResult.isSuccess(loaded.user) ? { author: loaded.user.value } : undefined
    },
    init: ($) => $.set($.empty),
    update: (model, message) =>
      Message.match(message, {
        User: ({ snapshot }) => {
          order.push("update User")
          return { ...model, user: snapshot }
        },
        Posts: ({ snapshot }) => ({ ...model, posts: snapshot })
      }),
    subscriptions: (_model, _props, watch) => [
      watch({
        user: (snapshot) => Message.make({ _tag: "User", snapshot }),
        posts: (snapshot) => Message.make({ _tag: "Posts", snapshot })
      })
    ],
    view: (_model, h) => {
      order.push(`view ${AsyncResult.isSuccess(h.loaded.user) ? h.loaded.user.value : h.loaded.user._tag}`)
      return h.div(
        h.p(
          AsyncResult.match(h.loaded.user, {
            onInitial: () => "loading",
            onSuccess: (success) => success.value + (success.waiting ? " (refreshing)" : ""),
            onFailure: () => "failed"
          })
        ).attr("class", "user"),
        h.p(
          AsyncResult.match(h.loaded.posts, {
            onInitial: (initial) => (initial.waiting ? "loading posts" : "no posts"),
            onSuccess: (success) => success.value.join(","),
            onFailure: () => "failed"
          })
        ).attr("class", "posts")
      )
    }
  })
  const Pair = Component.make({
    name: "Pair",
    model: Schema.Null,
    message: Schema.Never,
    elements: Html,
    init: ($) => $.set(null),
    update: (model) => model,
    view: (_, h) =>
      h.div(
        h.child(Profile, { key: "a", props: { id: "1", posts: false } }),
        h.child(Profile, { key: "b", props: { id: "1", posts: false } })
      )
  })
  return { db, order, GetUser, GetPosts, Profile, Pair, layer: Layer.mergeAll(GetUser.layer, GetPosts.layer) }
}

const text = (result: { readonly container: Element }, selector: string) =>
  Array.from(result.container.querySelectorAll(selector)).map((node) => node.textContent)

describe("Loaded: SSR and hydration", { concurrent: false }, () => {
  it.live("the server renders loaded data for a read, and the client fetches nothing", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const result = yield* ssr(t.Profile, { id: "1", posts: false })
      expect(result.html).toContain("user-1")
      expect(result.fetches.server.map((fetch) => fetch.trigger)).toEqual(["watch"])
      expect((result.state as any)["~loader"]).toEqual({
        "users/GetUser": [[expect.any(String), 0, "user-1", expect.any(Number)]]
      })
      expect(JSON.parse(result.payload)).toEqual(result.state)
      // FINDING: the value ships twice, once in the Model's snapshot and once under "~loader".
      expect(result.payload.split("user-1").length - 1).toBe(2)
      expect(result.payload.length).toBeLessThan(250)
      yield* sleep(20)
      expect(result.fetches.client).toEqual([])
      expect(t.db.users).toBe(1)
      expect(text(result, ".user")).toEqual(["user-1"])
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })

  it.live("resolution #2: an adopting instance renders the server's Model first and gets the cache's emission right after", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const result = yield* ssr(t.Profile, { id: "1", posts: false })
      yield* sleep(20)
      expect(t.order).toEqual([
        // The server: cold, so Initial renders, then the fetch's result.
        "view Initial",
        "update User",
        "view user-1",
        // The client: the server's Model first, then the hydrated entry's value through update.
        "view user-1",
        "update User",
        "view user-1"
      ])
      expect(result.fetches.client).toEqual([])
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })

  it.live("two instances reading one key make one server fetch", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const result = yield* ssr(t.Pair, {})
      expect(text(result, ".user")).toEqual(["user-1", "user-1"])
      expect(result.fetches.server.length).toBe(1)
      expect(t.db.users).toBe(1)
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })

  it.live("dependent reads load in rounds under one budget", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const result = yield* ssr(t.Profile, { id: "1", posts: true })
      expect(result.html).toContain("post by user-1")
      expect(result.fetches.server.map((fetch) => fetch.read)).toEqual(["users/GetUser", "users/GetPosts"])
      yield* sleep(20)
      expect(result.fetches.client).toEqual([])
      expect([t.db.users, t.db.posts]).toEqual([1, 1])
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })

  it.live("a budget miss ships nothing, and the client fetches", () => {
    const t = make({ staleTime: "1 minute", delay: 60 })
    return Effect.gen(function*() {
      const result = yield* ssr(t.Profile, { id: "1", posts: false }, { budget: "10 millis" })
      expect(result.html).toContain("loading")
      expect("~loader" in result.state).toBe(false)
      expect(result.fetches.client.map((fetch) => fetch.trigger)).toEqual(["watch"])
      yield* sleep(100)
      expect(text(result, ".user")).toEqual(["user-1"])
      // The server's fetch was interrupted at the budget; it and the client's each started once.
      expect(t.db.users).toBe(2)
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })

  it.live("budget 0 starts no fetch on the server", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const result = yield* ssr(t.Profile, { id: "1", posts: false }, { budget: 0 })
      expect(result.html).toContain("loading")
      expect(result.fetches.server).toEqual([])
      yield* sleep(30)
      expect(text(result, ".user")).toEqual(["user-1"])
      expect(t.db.users).toBe(1)
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })

  it.live("a typed Failure ships, and isn't refetched on load", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const result = yield* ssr(t.Profile, { id: "404", posts: false })
      expect(result.html).toContain("failed")
      expect((result.state as any)["~loader"]["users/GetUser"][0].slice(1, 3)).toEqual([1, ["no such user"]])
      yield* sleep(20)
      expect(result.fetches.client).toEqual([])
      expect(text(result, ".user")).toEqual(["failed"])
      expect(t.db.users).toBe(1)
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })

  it.live("no fetch starts inside the window at staleTime 0", () => {
    const t = make({ staleTime: "0 millis" })
    return Effect.gen(function*() {
      const result = yield* ssr(t.Profile, { id: "1", posts: true })
      yield* sleep(20)
      expect(result.fetches.client.filter((fetch) => fetch.inWindow)).toEqual([])
      expect(result.fetches.client).toEqual([])
      expect([t.db.users, t.db.posts]).toEqual([1, 1])
      expect(result.cache.isWindowOpen()).toBe(false)
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })

  it.live("signal fakes provided around ssr() reach the client's cache: a Visibility edge refetches after the window", () => {
    const t = make({ staleTime: "0 millis" })
    const visibility = Loader.makeSignal(true)
    return Effect.gen(function*() {
      const result = yield* ssr(t.Profile, { id: "1", posts: false }).pipe(
        Effect.provideService(Loader.Visibility, visibility)
      )
      expect(result.fetches.client).toEqual([])
      visibility.set(false)
      visibility.set(true)
      yield* sleep(20)
      expect(result.fetches.client.map((fetch) => [fetch.trigger, fetch.inWindow])).toEqual([["visibility", false]])
      expect(result.fetches.server.map((fetch) => fetch.trigger)).toEqual(["watch"])
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })

  it.live("static hydration refetches a finite staleTime once", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const result = yield* ssr(t.Pair, {}, { static: true })
      expect((result.state as any)["~static"]).toBe(true)
      // The shipped value shows at once, and one refetch runs for the two instances.
      expect(result.fetches.client.map((fetch) => [fetch.trigger, fetch.inWindow])).toEqual([["watch", false]])
      yield* sleep(30)
      expect(text(result, ".user")).toEqual(["user-1", "user-1"])
      expect(result.fetches.client.length).toBe(1)
      expect(t.db.users).toBe(2)
    }).pipe(Effect.provide(t.layer), Effect.scoped)
  })
})
