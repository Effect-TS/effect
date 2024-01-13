import * as Resolver from "@effect/rpc/Resolver"
import * as Router from "@effect/rpc/Router"
import * as Rpc from "@effect/rpc/Rpc"
import * as S from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { flow, pipe } from "effect/Function"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Stream from "effect/Stream"
import { assert, describe, expect, it, test } from "vitest"

interface Name {
  readonly _: unique symbol
}
const Name = Context.GenericTag<Name, string>("Name")

class SomeError extends S.TaggedError<SomeError>()("SomeError", {
  message: S.string
}) {}

class Post extends S.Class<Post>()({
  id: S.number,
  body: S.string
}) {}

class CreatePost extends S.TaggedRequest<CreatePost>()("CreatePost", S.never, Post, {
  body: S.string
}) {}

const posts = Router.make(
  Rpc.effect(CreatePost, ({ body }) => Effect.succeed(new Post({ id: 1, body })))
)

class Greet extends S.TaggedRequest<Greet>()("Greet", S.never, S.string, {
  name: S.string
}) {}

class Fail extends S.TaggedRequest<Fail>()("Fail", SomeError, S.void, {
  name: S.string
}) {}

class FailNoInput extends S.TaggedRequest<FailNoInput>()("FailNoInput", SomeError, S.void, {}) {}

class EncodeInput extends S.TaggedRequest<EncodeInput>()("EncodeInput", S.never, S.Date, {
  date: S.Date
}) {}

class EncodeDate extends S.TaggedRequest<EncodeDate>()("EncodeDate", SomeError, S.Date, {
  date: S.string
}) {}

class Refined extends S.TaggedRequest<Refined>()("Refined", S.never, S.number, {
  number: pipe(S.number, S.int(), S.greaterThan(10))
}) {}

class SpanName extends S.TaggedRequest<SpanName>()("SpanName", S.never, S.string, {}) {}

class Counts extends Rpc.StreamRequest<Counts>()(
  "Counts",
  S.never,
  S.number,
  {}
) {}

const router = Router.make(
  posts,
  Rpc.effect(Greet, ({ name }) => Effect.succeed(`Hello, ${name}!`)),
  Rpc.effect(Fail, () =>
    new SomeError({
      message: "fail"
    })),
  Rpc.effect(FailNoInput, () => new SomeError({ message: "fail" })),
  Rpc.effect(EncodeInput, ({ date }) => Effect.succeed(date)),
  Rpc.effect(EncodeDate, ({ date }) =>
    Effect.try({
      try: () => new Date(date),
      catch: () => new SomeError({ message: "fail" })
    })),
  Rpc.effect(Refined, ({ number }) => Effect.succeed(number)),
  Rpc.effect(SpanName, () =>
    Effect.currentSpan.pipe(
      Effect.map((span) => span.name),
      Effect.orDie
    )),
  Rpc.stream(Counts, () =>
    Stream.make(1, 2, 3, 4, 5).pipe(
      Stream.tap((_) => Effect.sleep(10))
    ))
)

const handler = Router.toHandler(router)
const handlerArray = (u: ReadonlyArray<unknown>) =>
  handler(u.map((request, i) => ({
    request,
    traceId: "traceId",
    spanId: `spanId${i}`,
    sampled: true,
    headers: {}
  }))).pipe(
    Stream.runCollect,
    Effect.map(flow(
      ReadonlyArray.fromIterable,
      ReadonlyArray.map(([, response]) => response),
      ReadonlyArray.filter((_): _ is S.ExitFrom<any, any> => Array.isArray(_) === false)
    ))
  )
const resolver = Resolver.make(handler)<typeof router>()
const client = Resolver.toClient(resolver)

describe("Router", () => {
  it("handler/", async () => {
    const date = new Date()
    const result = await Effect.runPromise(
      handlerArray([
        { _tag: "Greet", name: "John" },
        { _tag: "Fail", name: "" },
        { _tag: "FailNoInput" },
        { _tag: "EncodeInput", date: date.toISOString() },
        { _tag: "EncodeDate", date: date.toISOString() },
        { _tag: "Refined", number: 11 },
        { _tag: "CreatePost", body: "hello" },
        { _tag: "SpanName" }
      ])
    )
    expect(result.length).toEqual(8)

    assert.deepStrictEqual(result, [{
      _tag: "Success",
      value: "Hello, John!"
    }, {
      _tag: "Failure",
      cause: { _tag: "Fail", error: { _tag: "SomeError", message: "fail" } }
    }, {
      _tag: "Failure",
      cause: { _tag: "Fail", error: { _tag: "SomeError", message: "fail" } }
    }, {
      _tag: "Success",
      value: date.toISOString()
    }, {
      _tag: "Success",
      value: date.toISOString()
    }, {
      _tag: "Success",
      value: 11
    }, {
      _tag: "Success",
      value: {
        id: 1,
        body: "hello"
      }
    }, {
      _tag: "Success",
      value: "Rpc.router SpanName"
    }])
  })

  it("stream", async () => {
    const result = await Effect.runPromise(
      handler([{
        request: { _tag: "Counts" },
        traceId: "traceId",
        spanId: "spanId",
        sampled: true,
        headers: {}
      }]).pipe(
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray)
      )
    )
    expect(result.length).toEqual(6)
    assert.deepStrictEqual(result, [
      [0, [{ _tag: "Success", value: 1 }]],
      [0, [{ _tag: "Success", value: 2 }]],
      [0, [{ _tag: "Success", value: 3 }]],
      [0, [{ _tag: "Success", value: 4 }]],
      [0, [{ _tag: "Success", value: 5 }]],
      [0, [{ _tag: "Failure", cause: { _tag: "Empty" } }]]
    ])
  })
})

describe("Resolver", () => {
  test("effect", () =>
    Effect.gen(function*(_) {
      const name = yield* _(Rpc.call(new SpanName(), resolver))
      assert.strictEqual(name, "Rpc.router SpanName")

      const clientName = yield* _(client(new SpanName()))
      assert.strictEqual(clientName, "Rpc.router SpanName")
    }).pipe(Effect.runPromise))

  test("stream", () =>
    Effect.gen(function*(_) {
      const counts = yield* _(
        Rpc.call(new Counts(), resolver),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray)
      )
      assert.deepStrictEqual(counts, [
        1,
        2,
        3,
        4,
        5
      ])
    }).pipe(Effect.runPromise))
})
