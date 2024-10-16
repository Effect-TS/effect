import { RpcResolver, RpcResolverNoStream, RpcRouter } from "@effect/rpc"
import * as Rpc from "@effect/rpc/Rpc"
import * as Array from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { flow, pipe } from "effect/Function"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { assert, describe, expect, it, test } from "vitest"

interface Name {
  readonly _: unique symbol
}
const Name = Context.GenericTag<Name, string>("Name")

class SomeError extends Schema.TaggedError<SomeError>()("SomeError", {
  message: Schema.String
}) {}

class Post extends Schema.Class<Post>("Post")({
  id: Schema.Number,
  body: Schema.String
}) {}

class CreatePost extends Schema.TaggedRequest<CreatePost>()("CreatePost", {
  failure: Schema.Never,
  success: Post,
  payload: {
    body: Schema.String
  }
}) {}

const posts = RpcRouter.make(
  Rpc.effect(CreatePost, ({ body }) => Effect.succeed(new Post({ id: 1, body })))
)

class Greet extends Schema.TaggedRequest<Greet>()("Greet", {
  failure: Schema.Never,
  success: Schema.String,
  payload: {
    name: Schema.String
  }
}) {}

class Fail extends Schema.TaggedRequest<Fail>()("Fail", {
  failure: SomeError,
  success: Schema.Void,
  payload: {
    name: Schema.String
  }
}) {}

class FailNoInput
  extends Schema.TaggedRequest<FailNoInput>()("FailNoInput", { failure: SomeError, success: Schema.Void, payload: {} })
{}

class EncodeInput extends Schema.TaggedRequest<EncodeInput>()("EncodeInput", {
  failure: Schema.Never,
  success: Schema.Date,
  payload: {
    date: Schema.Date
  }
}) {}

class EncodeDate extends Schema.TaggedRequest<EncodeDate>()("EncodeDate", {
  failure: SomeError,
  success: Schema.Date,
  payload: {
    date: Schema.String
  }
}) {}

class Refined extends Schema.TaggedRequest<Refined>()("Refined", {
  failure: Schema.Never,
  success: Schema.Number,
  payload: {
    number: pipe(Schema.Number, Schema.int(), Schema.greaterThan(10))
  }
}) {}

class SpanName
  extends Schema.TaggedRequest<SpanName>()("SpanName", { failure: Schema.Never, success: Schema.String, payload: {} })
{}

class GetName
  extends Schema.TaggedRequest<GetName>()("GetName", { failure: Schema.Never, success: Schema.String, payload: {} })
{}

class EchoHeaders extends Schema.TaggedRequest<EchoHeaders>()("EchoHeaders", {
  failure: Schema.Never,
  success: Schema.Record({ key: Schema.String, value: Schema.Union(Schema.String, Schema.Undefined) }),
  payload: {}
}) {}

class Counts extends Rpc.StreamRequest<Counts>()(
  "Counts",
  { failure: Schema.Never, success: Schema.Number, payload: {} }
) {}

class FailStream extends Rpc.StreamRequest<FailStream>()(
  "FailStream",
  { failure: SomeError, success: Schema.Number, payload: {} }
) {}

const router = RpcRouter.make(
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
  Rpc.effect(GetName, () => Name),
  Rpc.stream(Counts, () =>
    Stream.make(1, 2, 3, 4, 5).pipe(
      Stream.tap((_) => Effect.sleep(10))
    )),
  Rpc.effect(EchoHeaders, () =>
    Rpc.schemaHeaders(Schema.Struct({
      foo: Schema.String,
      baz: Schema.optional(Schema.String)
    })).pipe(Effect.orDie)),
  Rpc.stream(FailStream, () =>
    Stream.range(0, 10).pipe(
      Stream.mapEffect((i) => i === 3 ? Effect.fail(new SomeError({ message: "fail" })) : Effect.succeed(i))
    ))
).pipe(
  RpcRouter.provideService(Name, "John")
)

const handler = RpcRouter.toHandler(router)
const handlerEffect = RpcRouter.toHandlerNoStream(router)
const handlerUndecoded = RpcRouter.toHandlerUndecoded(router)
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
      Array.fromIterable,
      Array.map(([, response]) => response),
      Array.filter((_): _ is Schema.ExitEncoded<any, any, unknown> => Array.isArray(_) === false)
    ))
  )
const handlerEffectArray = (u: ReadonlyArray<unknown>) =>
  handlerEffect(u.map((request, i) => ({
    request,
    traceId: "traceId",
    spanId: `spanId${i}`,
    sampled: true,
    headers: {}
  })))
const resolver = RpcResolver.make(handler)<typeof router>()
const resolverEffect = RpcResolverNoStream.make(handlerEffect)<typeof router>()
const resolverWithHeaders = RpcResolver.annotateHeadersEffect(
  resolver,
  Effect.succeed({
    BAZ: "qux"
  })
)
const client = RpcResolver.toClient(resolver)

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
        { _tag: "SpanName" },
        { _tag: "GetName" }
      ])
    )

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
    }, {
      _tag: "Success",
      value: "John"
    }])
  })

  it("handlerEffect", async () => {
    const date = new Date()
    const result = await Effect.runPromise(
      handlerEffectArray([
        { _tag: "Greet", name: "John" },
        { _tag: "Fail", name: "" },
        { _tag: "FailNoInput" },
        { _tag: "EncodeInput", date: date.toISOString() },
        { _tag: "EncodeDate", date: date.toISOString() },
        { _tag: "Refined", number: 11 },
        { _tag: "CreatePost", body: "hello" },
        { _tag: "SpanName" },
        { _tag: "GetName" }
      ])
    )

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
    }, {
      _tag: "Success",
      value: "John"
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

  it("handlerEffect/ stream", async () => {
    const result = await Effect.runPromise(
      handlerEffect([{
        request: { _tag: "Counts" },
        traceId: "traceId",
        spanId: "spanId",
        sampled: true,
        headers: {}
      }])
    )
    assert.deepStrictEqual(
      result,
      [[
        { _tag: "Success", value: 1 },
        { _tag: "Success", value: 2 },
        { _tag: "Success", value: 3 },
        { _tag: "Success", value: 4 },
        { _tag: "Success", value: 5 }
      ]] as any
    )
  })

  test("handlerUndecoded", () =>
    Effect.gen(function*(_) {
      const result = yield* _(
        handlerUndecoded(new CreatePost({ body: "hello" }))
      )
      assert.deepStrictEqual(result, {
        id: 1,
        body: "hello"
      })
    }).pipe(Effect.runPromise))
})

describe.each([{
  name: "Resolver.make",
  resolver
}, {
  name: "Resolver.makeEffect",
  resolver: resolverEffect
}])("$name", ({ resolver }) => {
  test("effect", () =>
    Effect.gen(function*(_) {
      const name = yield* _(Rpc.call(new SpanName(), resolver))
      assert.strictEqual(name, "Rpc.router SpanName")

      const clientName = yield* _(client(new SpanName()))
      assert.strictEqual(clientName, "Rpc.router SpanName")
    }).pipe(Effect.runPromise))

  test("headers", () =>
    Effect.gen(function*(_) {
      const headers = yield* _(
        Rpc.call(new EchoHeaders(), resolver),
        Rpc.annotateHeaders({ FOO: "bar" })
      )
      assert.deepStrictEqual(headers, { foo: "bar" })
    }).pipe(Effect.runPromise))

  test("annotateHeadersEffect", () =>
    Effect.gen(function*(_) {
      const headers = yield* _(
        Rpc.call(new EchoHeaders(), resolverWithHeaders),
        Rpc.annotateHeaders({ FOO: "bar" })
      )
      assert.deepStrictEqual(headers, { foo: "bar", baz: "qux" })
    }).pipe(Effect.tapErrorCause(Effect.logError), Effect.runPromise))

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

  test("stream fail", () =>
    Effect.gen(function*(_) {
      let n = 0
      const result = yield* _(
        Rpc.call(new FailStream(), resolver),
        Stream.tap((i) =>
          Effect.sync(() => {
            n = i
          })
        ),
        Stream.runCollect,
        Effect.flip
      )
      assert.strictEqual(n, 2)
      assert.deepStrictEqual(result, new SomeError({ message: "fail" }))
    }).pipe(Effect.runPromise))
})
