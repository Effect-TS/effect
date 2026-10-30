import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema, Stream } from "effect"
import { HttpRouter } from "effect/http"
import { OpenRpc, Rpc, RpcGroup, RpcMiddleware, RpcSchema, RpcSerialization, RpcServer } from "effect/rpc"

// oxlint-disable-next-line @typescript-eslint/no-require-imports
const Ajv = require("ajv")

const NotFound = Schema.Struct({
  code: Schema.Literal("404"),
  message: Schema.Literal("User not found"),
  id: Schema.String
})
const Unauthorized = Schema.Struct({
  code: Schema.Literal(401),
  message: Schema.Literal("Unauthorized")
})
class Authorization extends RpcMiddleware.Service<Authorization>()("OpenRpcWire/Authorization", {
  error: Unauthorized
}) {}

const Rpcs = RpcGroup.make(
  Rpc.make("Convert", {
    payload: { at: Schema.Date, count: Schema.NumberFromString },
    success: Schema.Struct({ at: Schema.Date, count: Schema.BigInt }).annotate({ identifier: "Converted" })
  }),
  Rpc.make("ConvertTuple", {
    payload: Schema.Tuple([Schema.Date, Schema.NumberFromString, Schema.optionalKey(Schema.NumberFromString)]),
    success: Schema.Struct({ at: Schema.Date, count: Schema.BigInt })
  }),
  Rpc.make("IncrementRecord", {
    payload: Schema.Record(Schema.String, Schema.NumberFromString),
    success: Schema.Record(Schema.String, Schema.Number)
  }),
  Rpc.make("Missing", { payload: { id: Schema.String }, error: NotFound }),
  Rpc.make("Complete"),
  Rpc.make("Protected").middleware(Authorization)
)
const Server = RpcServer.layerHttp({ group: Rpcs, path: "/rpc", protocol: "http" }).pipe(
  Layer.provide(Rpcs.toLayer({
    Convert: ({ at, count }) => Effect.succeed({ at, count: BigInt(count) }),
    ConvertTuple: ([at, count, increment = 0]) => Effect.succeed({ at, count: BigInt(count + increment) }),
    IncrementRecord: (values) =>
      Effect.succeed(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value + 1]))),
    Missing: ({ id }) => Effect.fail({ code: "404" as const, message: "User not found" as const, id }),
    Complete: () => Effect.void,
    Protected: () => Effect.void
  })),
  Layer.provide(Layer.succeed(Authorization)(() => Effect.fail({ code: 401, message: "Unauthorized" }))),
  Layer.provide(RpcSerialization.layerJsonRpc())
)
const document = () => OpenRpc.fromRpcGroup(Rpcs, { info: { title: "Wire contracts", version: "1.0.0" } })

const StreamValue = Schema.BigInt.annotate({ identifier: "StreamValue" })
const StreamRpcs = RpcGroup.make(
  Rpc.make("Values", { success: StreamValue, stream: true }),
  Rpc.make("FailingValues", { success: RpcSchema.Stream(StreamValue, NotFound) })
)
const StreamServer = RpcServer.layerHttp({ group: StreamRpcs, path: "/rpc", protocol: "http" }).pipe(
  Layer.provide(StreamRpcs.toLayer({
    Values: () => Stream.make(1n, 2n, 3n),
    FailingValues: () =>
      Stream.make(1n, 2n).pipe(
        Stream.concat(Stream.fail({ code: "404" as const, message: "User not found" as const, id: "user-1" }))
      )
  })),
  Layer.provide(RpcSerialization.layerNdJsonRpc())
)
const streamDocument = () =>
  OpenRpc.fromRpcGroup(StreamRpcs, { info: { title: "Streaming wire contracts", version: "1.0.0" } })

interface StreamFrame {
  readonly jsonrpc: string
  readonly id: number
  readonly chunk?: boolean
  readonly result?: unknown
  readonly error?: { readonly code: number; readonly message: string; readonly data: unknown }
}

const makeStreamRequest = Effect.fnUntraced(function*() {
  const { dispose, handler } = HttpRouter.toWebHandler(StreamServer)
  yield* Effect.addFinalizer(() => Effect.promise(dispose))
  return (method: string) =>
    Effect.promise(async () => {
      const response = await handler(
        new Request("http://test/rpc", {
          method: "POST",
          headers: { "content-type": "application/json-rpc" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method }) + "\n"
        })
      )
      assert.strictEqual(response.status, 200)
      return (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as StreamFrame)
    })
})

const makeRequest = Effect.fnUntraced(function*() {
  const { dispose, handler } = HttpRouter.toWebHandler(Server)
  yield* Effect.addFinalizer(() => Effect.promise(dispose))
  return (method: string, params?: unknown) =>
    Effect.promise(async () => {
      const response = await handler(
        new Request("http://test/rpc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, ...(params === undefined ? {} : { params }) })
        })
      )
      assert.strictEqual(response.status, 200)
      return await response.json() as {
        jsonrpc: string
        id: number
        result?: unknown
        error?: { code: number; message: string; data: unknown }
      }
    })
})

describe("OpenRpc JSON-RPC wire fidelity", () => {
  it.effect("describes encoded request and success values rather than decoded values", () =>
    Effect.gen(function*() {
      const spec = document()
      const method = spec.methods.find((method) => method.name === "Convert")!
      const ajv = new Ajv({ strict: false, validateFormats: false })
      const params = { at: "1970-01-01T00:00:00.000Z", count: "42" }
      for (const parameter of method.params) {
        const validate = ajv.compile({ ...parameter.schema, components: spec.components })
        assert.isTrue(validate(params[parameter.name as keyof typeof params]))
        assert.isFalse(validate(42))
      }
      const request = yield* makeRequest()
      const response = yield* request("Convert", params)
      assert.deepStrictEqual(response, {
        jsonrpc: "2.0",
        id: 1,
        result: { at: "1970-01-01T00:00:00.000Z", count: "42" }
      })
      const validate = ajv.compile({ ...method.result.schema, components: spec.components })
      assert.isTrue(validate(response.result), JSON.stringify(validate.errors))
      assert.isFalse(validate({ at: 0, count: 42 }))
    }))

  it.effect("accepts encoded positional values directly, including an omitted trailing element", () =>
    Effect.gen(function*() {
      const spec = document()
      const method = spec.methods.find((method) => method.name === "ConvertTuple")!
      const ajv = new Ajv({ strict: false, validateFormats: false })
      const validateParams = ajv.compile({ ...method["x-effect-params-schema"]!, components: spec.components })
      const validateResult = ajv.compile({ ...method.result.schema, components: spec.components })
      assert.strictEqual(method.paramStructure, "by-position")
      assert.deepStrictEqual(method.params.map(({ name, required }) => [name, required]), [
        ["0", true],
        ["1", true],
        ["2", false]
      ])
      const request = yield* makeRequest()
      for (
        const [params, count] of [
          [["1970-01-01T00:00:00.000Z", "42"], "42"],
          [["1970-01-01T00:00:00.000Z", "42", "3"], "45"]
        ] as const
      ) {
        assert.isTrue(validateParams(params), JSON.stringify(validateParams.errors))
        for (let index = 0; index < params.length; index++) {
          const validate = ajv.compile({ ...method.params[index].schema, components: spec.components })
          assert.isTrue(validate(params[index]), JSON.stringify(validate.errors))
        }
        const response = yield* request("ConvertTuple", params)
        assert.deepStrictEqual(response, {
          jsonrpc: "2.0",
          id: 1,
          result: { at: params[0], count }
        })
        assert.isTrue(validateResult(response.result), JSON.stringify(validateResult.errors))
      }
      assert.isFalse(validateParams({ "0": "1970-01-01T00:00:00.000Z", "1": "42" }))
      assert.isFalse(validateParams(["1970-01-01T00:00:00.000Z", 42]))
      assert.isFalse(validateParams(["1970-01-01T00:00:00.000Z", "42", "3", "4"]))
    }))

  it.effect("describes arbitrary named record entries without inventing a parameter wrapper", () =>
    Effect.gen(function*() {
      const spec = document()
      const method = spec.methods.find((method) => method.name === "IncrementRecord")!
      const ajv = new Ajv({ strict: false })
      const validateParams = ajv.compile({ ...method["x-effect-params-schema"]!, components: spec.components })
      const params = { first: "1", "unlisted-key": "41" }
      assert.strictEqual(method.paramStructure, "by-name")
      assert.deepStrictEqual(method.params, [])
      assert.isTrue(validateParams(params), JSON.stringify(validateParams.errors))
      assert.isFalse(validateParams({ first: 1 }))
      assert.isFalse(validateParams(["1", "41"]))
      const request = yield* makeRequest()
      const response = yield* request("IncrementRecord", params)
      assert.deepStrictEqual(response, { jsonrpc: "2.0", id: 1, result: { first: 2, "unlisted-key": 42 } })
      const validateResult = ajv.compile({ ...method.result.schema, components: spec.components })
      assert.isTrue(validateResult(response.result), JSON.stringify(validateResult.errors))
    }))

  it.effect("keeps a null result for void calls rather than describing notifications", () =>
    Effect.gen(function*() {
      const spec = document()
      const method = spec.methods.find((method) => method.name === "Complete")!
      const request = yield* makeRequest()
      const response = yield* request("Complete")
      assert.deepStrictEqual(response, { jsonrpc: "2.0", id: 1, result: null })
      assert.deepStrictEqual(method.params, [])
      const ajv = new Ajv({ strict: false })
      const validate = ajv.compile({ ...method.result.schema, components: spec.components })
      assert.isTrue(validate(response.result))
      assert.isFalse(validate("not void"))
    }))

  it.effect("matches application and middleware error codes and preserves cause data", () =>
    Effect.gen(function*() {
      const spec = document()
      const request = yield* makeRequest()
      const missing = yield* request("Missing", { id: "user-1" })
      const protectedResponse = yield* request("Protected")
      for (
        const [name, response, error] of [
          ["Missing", missing, { code: "404", message: "User not found", id: "user-1" }],
          ["Protected", protectedResponse, { code: 401, message: "Unauthorized" }]
        ] as const
      ) {
        assert.strictEqual(response.jsonrpc, "2.0")
        assert.strictEqual(response.id, 1)
        assert.isFalse(Object.hasOwn(response, "result"))
        assert.isDefined(response.error)
        const descriptor = spec.methods.find((method) => method.name === name)!.errors!.find((candidate) =>
          candidate.code === response.error!.code
        )
        assert.isDefined(descriptor)
        assert.strictEqual(descriptor!.code, Number(error.code))
        assert.strictEqual(descriptor!.message, response.error!.message)
        assert.isFalse(Object.hasOwn(descriptor!, "data"))
        assert.deepStrictEqual(response.error!.data, [{ _tag: "Fail", error }])
      }
    }))
})

describe("OpenRpc streaming JSON-RPC wire fidelity", () => {
  it.effect("describes encoded nonempty chunks separately from terminal completion", () =>
    Effect.gen(function*() {
      const spec = streamDocument()
      const method = spec.methods.find((method) => method.name === "Values")!
      const stream = method["x-effect-stream"]!
      const ajv = new Ajv({ strict: false })
      const validateItem = ajv.compile({ ...stream.itemSchema, components: spec.components })
      const validateChunk = ajv.compile({ ...stream.chunkSchema, components: spec.components })
      const validateResult = ajv.compile({ ...method.result.schema, components: spec.components })
      const request = yield* makeStreamRequest()
      const frames = yield* request("Values")
      const values: Array<unknown> = []
      for (const frame of frames.slice(0, -1)) {
        assert.strictEqual(frame.jsonrpc, "2.0")
        assert.strictEqual(frame.id, 1)
        assert.strictEqual(frame.chunk, true)
        assert.isFalse(Object.hasOwn(frame, "error"))
        assert.isTrue(validateChunk(frame.result), JSON.stringify(validateChunk.errors))
        for (const item of frame.result as Array<unknown>) {
          assert.isTrue(validateItem(item), JSON.stringify(validateItem.errors))
          values.push(item)
        }
      }
      assert.deepStrictEqual(values, ["1", "2", "3"])
      const terminal = frames[frames.length - 1]
      assert.deepStrictEqual(terminal, { jsonrpc: "2.0", id: 1, result: null })
      assert.isTrue(validateResult(terminal.result), JSON.stringify(validateResult.errors))
      assert.isFalse(validateResult(["1"]))
      assert.isFalse(validateChunk([]))
      assert.isFalse(validateChunk([1]))
      assert.isFalse(validateItem(1))
    }))

  it.effect("describes the emitted stream failure cause and its JSON-RPC error metadata", () =>
    Effect.gen(function*() {
      const spec = streamDocument()
      const method = spec.methods.find((method) => method.name === "FailingValues")!
      const stream = method["x-effect-stream"]!
      const ajv = new Ajv({ strict: false })
      const validateChunk = ajv.compile({ ...stream.chunkSchema, components: spec.components })
      const validateError = ajv.compile({ ...stream.errorSchema, components: spec.components })
      const validateCause = ajv.compile({ ...stream.causeSchema, components: spec.components })
      const request = yield* makeStreamRequest()
      const frames = yield* request("FailingValues")
      const values: Array<unknown> = []
      for (const frame of frames.slice(0, -1)) {
        assert.strictEqual(frame.jsonrpc, "2.0")
        assert.strictEqual(frame.id, 1)
        assert.strictEqual(frame.chunk, true)
        assert.isFalse(Object.hasOwn(frame, "error"))
        assert.isTrue(validateChunk(frame.result), JSON.stringify(validateChunk.errors))
        values.push(...frame.result as Array<unknown>)
      }
      assert.deepStrictEqual(values, ["1", "2"])
      const terminal = frames[frames.length - 1]
      assert.strictEqual(terminal.jsonrpc, "2.0")
      assert.strictEqual(terminal.id, 1)
      assert.isFalse(Object.hasOwn(terminal, "chunk"))
      assert.isFalse(Object.hasOwn(terminal, "result"))
      assert.isDefined(terminal.error)
      const error = { code: "404", message: "User not found", id: "user-1" }
      assert.deepStrictEqual(terminal.error!.data, [{ _tag: "Fail", error }])
      assert.isTrue(validateCause(terminal.error!.data), JSON.stringify(validateCause.errors))
      assert.isTrue(validateError(error), JSON.stringify(validateError.errors))
      assert.isFalse(validateCause(error))
      assert.isFalse(validateError({ ...error, id: 1 }))
      const descriptor = method.errors!.find(({ code }) => code === terminal.error!.code)
      assert.isDefined(descriptor)
      assert.strictEqual(descriptor!.code, 404)
      assert.strictEqual(descriptor!.message, terminal.error!.message)
    }))

  it("names the actual serializer control methods without requiring HTTP acknowledgements", () => {
    const stream = streamDocument().methods.find((method) => method.name === "Values")!["x-effect-stream"]!
    const parser = RpcSerialization.jsonRpc().makeUnsafe()
    for (const [_tag, method] of [["Ack", stream.ackMethod], ["Interrupt", stream.interruptMethod]] as const) {
      const encoded = parser.encode({ _tag, requestId: 1 })
      assert.deepStrictEqual(JSON.parse(encoded as string), {
        jsonrpc: "2.0",
        method,
        params: { requestId: 1 }
      })
      assert.deepStrictEqual(parser.decode(encoded!), [{ _tag, requestId: 1 }])
    }
  })
})
