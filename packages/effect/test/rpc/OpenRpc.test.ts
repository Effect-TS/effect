import { assert, describe, it } from "@effect/vitest"
import { Effect, JsonSchema, Schema, SchemaGetter, SchemaTransformation } from "effect"
import { Rpc, RpcGroup, RpcMiddleware, RpcSchema } from "effect/rpc"
import * as OpenRpc from "effect/rpc/OpenRpc"

// oxlint-disable-next-line @typescript-eslint/no-require-imports
const AjvDraft07 = require("ajv")
const ajv = new AjvDraft07.default({ allErrors: true, strict: false, validateFormats: false })
const options = { info: { title: "Contract tests", version: "1.0.0" } }

const method = (document: OpenRpc.OpenRPCSpec, name: string) => {
  const result = document.methods.find((method) => method.name === name)
  assert.isDefined(result, `Missing method ${name}`)
  return result!
}

const resolve = (document: OpenRpc.OpenRPCSpec, schema: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  if (typeof schema.$ref !== "string") return schema
  assert.match(schema.$ref, /^#\/components\/schemas\//)
  const key = decodeURIComponent(schema.$ref.slice("#/components/schemas/".length))
    .replace(/~1/g, "/").replace(/~0/g, "~")
  const definition = document.components.schemas[key]
  assert.isDefined(definition, `Unresolved reference ${schema.$ref}`)
  return definition!
}

const accepts = (document: OpenRpc.OpenRPCSpec, schema: JsonSchema.JsonSchema, value: unknown) =>
  ajv.compile({ ...schema, components: document.components })(value)

const rejects = (rpc: Rpc.Any, reason: RegExp) => {
  try {
    OpenRpc.fromRpcGroup(RpcGroup.make(rpc), options)
    assert.fail("Expected an unsupported-contract diagnostic")
  } catch (error) {
    assert.instanceOf(error, Error)
    assert.include(error.message, rpc._tag)
    assert.match(error.message, reason)
  }
}

describe("OpenRpc", () => {
  it("describes encoded names, values and optionality rather than decoded payload fields", () => {
    const Payload = Schema.Struct({
      optionalFirst: Schema.optionalKey(Schema.String),
      amount: Schema.NumberFromString,
      encodedRequired: Schema.optionalKey(Schema.String).pipe(Schema.encodeTo(Schema.String, {
        decode: SchemaGetter.passthrough(),
        encode: SchemaGetter.withDefault(Effect.succeed(""))
      }))
    }).pipe(Schema.decodeTo(
      Schema.Struct({ value: Schema.Number }),
      SchemaTransformation.transform({
        decode: ({ amount }) => ({ value: amount }),
        encode: ({ value }) => ({ amount: value })
      })
    ))
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(Rpc.make("convert", {
        payload: Payload,
        success: Schema.NumberFromString
      })),
      options
    )
    const convert = method(document, "convert")
    assert.strictEqual(convert.paramStructure, "by-name")
    assert.deepStrictEqual(convert.params, [
      { name: "amount", required: true, schema: { type: "string" } },
      { name: "encodedRequired", required: true, schema: { type: "string" } },
      { name: "optionalFirst", required: false, schema: { type: "string" } }
    ])
    assert.strictEqual(accepts(document, convert.params[0].schema, "42"), true)
    assert.strictEqual(accepts(document, convert.params[0].schema, 42), false)
    assert.strictEqual(accepts(document, convert.result.schema, "42"), true)
    assert.strictEqual(accepts(document, convert.result.schema, 42), false)
  })

  it("resolves identified payload roots before extracting named parameters", () => {
    const Payload = Schema.Struct({ id: Schema.String, limit: Schema.optionalKey(Schema.Int) })
      .annotate({ identifier: "LookupParams" })
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(Rpc.make("lookup", {
        payload: Payload,
        success: Schema.String
      })),
      options
    )
    assert.deepStrictEqual(method(document, "lookup").params.map(({ name, required }) => [name, required]), [
      ["id", true],
      ["limit", false]
    ])
    const schema = method(document, "lookup")["x-effect-params-schema"]!
    assert.isString(schema.$ref)
    assert.isTrue(accepts(document, schema, { id: "user", limit: 2 }))
    assert.isFalse(accepts(document, schema, { limit: 2 }))
  })

  it("shares reusable definitions without conflating identifier collisions", () => {
    const Shared = Schema.Struct({ text: Schema.String }).annotate({ identifier: "Value" })
    const Collision = Schema.Struct({ count: Schema.Int }).annotate({ identifier: "Value" })
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("text", { payload: { input: Shared }, success: Shared }),
        Rpc.make("count", { success: Collision }),
        Rpc.make("textAgain", { payload: Shared, success: Shared })
      ),
      options
    )
    const text = method(document, "text")
    const count = method(document, "count")
    assert.isString(text.result.schema.$ref)
    assert.strictEqual(text.params[0].schema.$ref, text.result.schema.$ref)
    assert.strictEqual(method(document, "textAgain").result.schema.$ref, text.result.schema.$ref)
    assert.strictEqual(method(document, "textAgain")["x-effect-params-schema"]!.$ref, text.result.schema.$ref)
    assert.notStrictEqual(count.result.schema.$ref, text.result.schema.$ref)
    assert.strictEqual(accepts(document, text.result.schema, { text: "ok" }), true)
    assert.strictEqual(accepts(document, text.result.schema, { count: 1 }), false)
    assert.strictEqual(accepts(document, count.result.schema, { count: 1 }), true)
    assert.strictEqual(accepts(document, count.result.schema, { text: "ok" }), false)
  })

  it("keeps recursive references local when recursive identifiers collide", () => {
    interface TextNode {
      readonly value: string
      readonly children: ReadonlyArray<TextNode>
    }
    interface CountNode {
      readonly value: number
      readonly children: ReadonlyArray<CountNode>
    }
    const TextNode: Schema.Codec<TextNode> = Schema.Struct({
      value: Schema.String,
      children: Schema.Array(Schema.suspend(() => TextNode))
    }).annotate({ identifier: "Node" })
    const CountNode: Schema.Codec<CountNode> = Schema.Struct({
      value: Schema.Int,
      children: Schema.Array(Schema.suspend(() => CountNode))
    }).annotate({ identifier: "Node" })
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("textTree", { success: TextNode }),
        Rpc.make("countTree", { success: CountNode })
      ),
      options
    )
    const text = method(document, "textTree").result.schema
    const count = method(document, "countTree").result.schema
    assert.notStrictEqual(text.$ref, count.$ref)
    assert.strictEqual(accepts(document, text, { value: "root", children: [{ value: "leaf", children: [] }] }), true)
    assert.strictEqual(accepts(document, text, { value: "root", children: [{ value: 1, children: [] }] }), false)
    assert.strictEqual(accepts(document, count, { value: 1, children: [{ value: 2, children: [] }] }), true)
    assert.strictEqual(accepts(document, count, { value: 1, children: [{ value: "leaf", children: [] }] }), false)
  })

  it("escapes component pointers without rewriting data-valued $ref properties", () => {
    const example = { $ref: "#/$defs/part~/value", nested: { $ref: "#/definitions/untouched" } }
    const Value = Schema.Struct({ $ref: Schema.String, nested: Schema.Struct({ $ref: Schema.String }) })
      .annotate({ identifier: "part~/value", examples: [example], default: example })
    const pairing = {
      name: "literal refs",
      params: [{ name: "input", value: example }],
      result: { name: "result", value: example }
    }
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("refs", { payload: { input: Value }, success: Value }).annotate(OpenRpc.Examples, [pairing])
      ),
      options
    )
    const refs = method(document, "refs")
    const definition = resolve(document, refs.result.schema)
    assert.deepStrictEqual(definition.examples, [example])
    assert.deepStrictEqual(definition.default, example)
    assert.deepStrictEqual(refs.examples, [pairing])
    assert.strictEqual(accepts(document, refs.result.schema, example), true)
    assert.strictEqual(accepts(document, refs.result.schema, { $ref: 1, nested: { $ref: "ok" } }), false)
  })

  it("retains schema descriptions, examples and representable field constraints", () => {
    const Id = Schema.String.check(Schema.isMinCodePoints(2)).annotate({
      title: "User identifier",
      description: "Stable user ID",
      examples: ["ab"]
    })
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(Rpc.make("annotated", {
        payload: { id: Id },
        success: Id
      })),
      options
    )
    const annotated = method(document, "annotated")
    for (const schema of [annotated.params[0].schema, annotated.result.schema]) {
      assert.strictEqual(resolve(document, schema).description, "Stable user ID")
      assert.deepStrictEqual(resolve(document, schema).examples, ["ab"])
      assert.strictEqual(accepts(document, schema, "ab"), true)
      assert.strictEqual(accepts(document, schema, "a"), false)
    }
  })

  it("keeps JSON Schema extensions opaque instead of applying OpenAPI keyword rules", () => {
    const Value = Schema.String.check(Schema.makeFilter(
      (value) => value.length >= 2,
      {
        toJsonSchema: () => ({
          minLength: 2,
          example: "ab",
          discriminator: { propertyName: "kind" },
          xml: { name: "value" },
          externalDocs: { url: "https://example.com/value" }
        })
      }
    ))
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(Rpc.make("extensions", {
        payload: { value: Value },
        success: Value
      })),
      options
    )
    const schema = method(document, "extensions").result.schema
    assert.isTrue(accepts(document, schema, "ab"))
    assert.isFalse(accepts(document, schema, "a"))
  })

  it("applies group defaults and replaces method-level lists, including empty lists", () => {
    const examples = [{ name: "default", params: [], result: { name: "result", value: null } }]
    const group = RpcGroup.make(
      Rpc.make("inherited").annotateMerge(OpenRpc.annotations({
        summary: undefined,
        deprecated: undefined,
        tags: undefined
      })),
      Rpc.make("overridden").annotateMerge(OpenRpc.annotations({
        summary: "Local summary",
        description: "Local description",
        tags: [{ name: "local" }],
        examples: [],
        errors: [],
        deprecated: false,
        externalDocs: { url: "https://example.com/local" }
      }))
    )
      .annotate(OpenRpc.Summary, "Default summary")
      .annotate(OpenRpc.Description, "Default description")
      .annotate(OpenRpc.Tags, [{ name: "default" }])
      .annotate(OpenRpc.Examples, examples)
      .annotate(OpenRpc.Errors, [{ code: 7, message: "Unavailable" }])
      .annotate(OpenRpc.Deprecated, true)
      .annotate(OpenRpc.ExternalDocs, { url: "https://example.com/default" })
    const document = OpenRpc.fromRpcGroup(group, options)
    const inherited = method(document, "inherited")
    const overridden = method(document, "overridden")
    assert.strictEqual(inherited.summary, "Default summary")
    assert.strictEqual(inherited.description, "Default description")
    assert.deepStrictEqual(inherited.tags, [{ name: "default" }])
    assert.deepStrictEqual(inherited.examples, examples)
    assert.deepStrictEqual(inherited.errors, [{ code: 7, message: "Unavailable" }])
    assert.strictEqual(inherited.deprecated, true)
    assert.deepStrictEqual(inherited.externalDocs, { url: "https://example.com/default" })
    assert.strictEqual(overridden.summary, "Local summary")
    assert.strictEqual(overridden.description, "Local description")
    assert.deepStrictEqual(overridden.tags, [{ name: "local" }])
    assert.deepStrictEqual(overridden.examples, [])
    assert.deepStrictEqual(overridden.errors, [])
    assert.strictEqual(overridden.deprecated, false)
    assert.deepStrictEqual(overridden.externalDocs, { url: "https://example.com/local" })
  })

  it("uses final composed group names and excludes omitted procedures", () => {
    const group = RpcGroup.make(Rpc.make("get"), Rpc.make("removed"))
      .omit("removed")
      .prefix("users.")
      .merge(RpcGroup.make(Rpc.make("ping")).prefix("health."))
      .add(Rpc.make("version"))
    const document = OpenRpc.fromRpcGroup(group, options)
    assert.deepStrictEqual(document.methods.map(({ name }) => name), ["users.get", "health.ping", "version"])
  })

  it("derives encoded error codes and messages, including middleware failures", () => {
    const Failure = Schema.Struct({ code: Schema.Literal("41"), message: Schema.Literal("Wire failure") })
      .pipe(Schema.decodeTo(
        Schema.Struct({ code: Schema.Literal(99), message: Schema.Literal("Decoded failure") }),
        SchemaTransformation.transform({
          decode: () => ({ code: 99 as const, message: "Decoded failure" as const }),
          encode: () => ({ code: "41" as const, message: "Wire failure" as const })
        })
      ))
    class Auth extends RpcMiddleware.Service<Auth>()("OpenRpcTest/Auth", {
      error: Schema.Struct({ code: Schema.Literal(42), message: Schema.Literal("Unauthorized") })
    }) {}
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("protected", { error: Failure }).middleware(Auth),
        Rpc.make("defaultCode", { error: Schema.Struct({ message: Schema.Literal("No code") }) })
      ),
      options
    )
    assert.deepStrictEqual(method(document, "protected").errors?.slice().sort((a, b) => a.code - b.code), [
      { code: 41, message: "Wire failure" },
      { code: 42, message: "Unauthorized" }
    ])
    assert.deepStrictEqual(method(document, "defaultCode").errors, [{ code: 0, message: "No code" }])
  })

  it("requires explicit dynamic error metadata and retains error.data as a value", () => {
    const failure = Rpc.make("dynamicFailure", {
      error: Schema.Struct({ code: Schema.Int, message: Schema.String })
    })
    rejects(failure, /error|metadata/i)
    const errors = [{ code: 17, message: "Unavailable", data: { retry: true, $ref: "#/$defs/not-a-schema" } }]
    const document = OpenRpc.fromRpcGroup(RpcGroup.make(failure.annotate(OpenRpc.Errors, errors)), options)
    assert.deepStrictEqual(method(document, "dynamicFailure").errors, errors)
  })

  it("requires explicit errors to include known codes without contradicting known messages", () => {
    const failure = Rpc.make("knownFailure", {
      error: Schema.Union([
        Schema.Struct({ code: Schema.Literal(10), message: Schema.Literal("Known") }),
        Schema.Struct({ code: Schema.Int, message: Schema.String })
      ])
    })
    rejects(failure.annotate(OpenRpc.Errors, [{ code: 11, message: "Other" }]), /code|error/i)
    rejects(failure.annotate(OpenRpc.Errors, [{ code: 10, message: "Contradiction" }]), /message|conflict|error/i)
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(failure.annotate(OpenRpc.Errors, [
        { code: 10, message: "Known" },
        { code: 11, message: "Other" }
      ])),
      options
    )
    assert.deepStrictEqual(method(document, "knownFailure").errors, [
      { code: 10, message: "Known" },
      { code: 11, message: "Other" }
    ])
  })

  it("deduplicates identical derived errors but rejects conflicting and explicit duplicate codes", () => {
    const Failure = Schema.Struct({ code: Schema.Literal(5), message: Schema.Literal("Same") })
    class SameFailure extends RpcMiddleware.Service<SameFailure>()("OpenRpcTest/SameFailure", { error: Failure }) {}
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("same", { error: Failure }).middleware(SameFailure)
      ),
      options
    )
    assert.deepStrictEqual(method(document, "same").errors, [{ code: 5, message: "Same" }])
    rejects(
      Rpc.make("conflict", {
        error: Schema.Union([
          Failure,
          Schema.Struct({ code: Schema.Literal(5), message: Schema.Literal("Different") })
        ])
      }),
      /code|conflict|error/i
    )
    rejects(
      Rpc.make("duplicate").annotate(OpenRpc.Errors, [
        { code: 5, message: "Same" },
        { code: 5, message: "Same" }
      ]),
      /code|duplicate|error/i
    )
  })

  it("keeps a null result descriptor for void calls rather than describing notifications", () => {
    const document = OpenRpc.fromRpcGroup(RpcGroup.make(Rpc.make("void")), {
      info: { title: "Void API", version: "2.0.0", description: "Unary calls" },
      servers: [{ name: "production", url: "https://example.com/rpc" }]
    })
    assert.deepStrictEqual(document, {
      openrpc: "1.3.2",
      info: { title: "Void API", version: "2.0.0", description: "Unary calls" },
      servers: [{ name: "production", url: "https://example.com/rpc" }],
      methods: [{
        name: "void",
        paramStructure: "by-name",
        params: [],
        result: { name: "result", schema: { type: "null" } }
      }],
      components: { schemas: {} }
    })
  })

  it("describes encoded stream items, nonempty chunks and terminal completion for both constructors", () => {
    const Item = Schema.Struct({ value: Schema.NumberFromString }).annotate({ identifier: "StreamItem" })
    const StreamFailure = Schema.Struct({ code: Schema.Literal(21), message: Schema.Literal("Stream failed") })
      .annotate({ identifier: "StreamFailure" })
    const RpcFailure = Schema.Struct({ code: Schema.Literal(22), message: Schema.Literal("RPC failed") })
    const Defect = Schema.Unknown.pipe(Schema.encodeTo(Schema.String, {
      decode: SchemaGetter.passthrough(),
      encode: SchemaGetter.transform(String)
    }))
    class Auth extends RpcMiddleware.Service<Auth>()("OpenRpcTest/StreamAuth", {
      error: Schema.Struct({ code: Schema.Literal(23), message: Schema.Literal("Unauthorized") })
    }) {}
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("streamFlag", {
          payload: { item: Item },
          success: Item,
          error: StreamFailure,
          defect: Defect,
          stream: true
        }).middleware(Auth),
        Rpc.make("streamSchema", {
          success: RpcSchema.Stream(Item, StreamFailure),
          error: RpcFailure,
          defect: Defect
        }).middleware(Auth),
        Rpc.make("unaryItem", { success: Item })
      ),
      options
    )
    const itemRef = method(document, "unaryItem").result.schema.$ref
    assert.isString(itemRef)
    assert.strictEqual(method(document, "streamFlag").params[0].schema.$ref, itemRef)
    for (const name of ["streamFlag", "streamSchema"]) {
      const streaming = method(document, name)
      const stream = streaming["x-effect-stream"]!
      assert.strictEqual(stream.encoding, "effect-jsonrpc")
      assert.strictEqual(stream.ackMethod, "@effect/rpc/Ack")
      assert.strictEqual(stream.interruptMethod, "@effect/rpc/Interrupt")
      assert.strictEqual(stream.itemSchema.$ref, itemRef)
      assert.isTrue(accepts(document, stream.itemSchema, { value: "1" }))
      assert.isFalse(accepts(document, stream.itemSchema, { value: 1 }))
      assert.isTrue(accepts(document, stream.chunkSchema, [{ value: "1" }, { value: "2" }]))
      assert.isFalse(accepts(document, stream.chunkSchema, []))
      assert.isFalse(accepts(document, stream.chunkSchema, [{ value: 1 }]))
      assert.isFalse(accepts(document, stream.chunkSchema, { value: "1" }))
      assert.deepStrictEqual(streaming.result.schema, { type: "null" })
      assert.isFalse(accepts(document, streaming.result.schema, { value: "1" }))
      for (
        const error of [
          { code: 21, message: "Stream failed" },
          { code: 23, message: "Unauthorized" }
        ]
      ) {
        assert.isTrue(accepts(document, stream.errorSchema, error))
        assert.isTrue(accepts(document, stream.causeSchema, [{ _tag: "Fail", error }]))
      }
      assert.isFalse(accepts(document, stream.errorSchema, { code: 99, message: "Unknown" }))
      assert.isTrue(accepts(document, stream.causeSchema, [{ _tag: "Die", defect: "boom" }]))
      assert.isFalse(accepts(document, stream.causeSchema, [{ _tag: "Die", defect: 1 }]))
      assert.isTrue(accepts(document, stream.causeSchema, [{ _tag: "Interrupt", fiberId: 1 }]))
    }
    const streamSchema = method(document, "streamSchema")
    assert.isTrue(accepts(document, streamSchema["x-effect-stream"]!.errorSchema, {
      code: 22,
      message: "RPC failed"
    }))
    assert.deepStrictEqual(streamSchema.errors?.slice().sort((a, b) => a.code - b.code), [
      { code: 21, message: "Stream failed" },
      { code: 22, message: "RPC failed" },
      { code: 23, message: "Unauthorized" }
    ])
    assert.isUndefined(method(document, "unaryItem")["x-effect-stream"])
  })

  it("requires explicit metadata for dynamic stream errors", () => {
    const rpc = Rpc.make("dynamicStream", {
      success: RpcSchema.Stream(Schema.String, Schema.Struct({ code: Schema.Int, message: Schema.String }))
    })
    rejects(rpc, /error|metadata/i)
    const errors = [{ code: 17, message: "Unavailable" }]
    const document = OpenRpc.fromRpcGroup(RpcGroup.make(rpc.annotate(OpenRpc.Errors, errors)), options)
    const streaming = method(document, "dynamicStream")
    assert.deepStrictEqual(streaming.errors, errors)
    assert.isTrue(accepts(document, streaming["x-effect-stream"]!.errorSchema, { code: 17, message: "Unavailable" }))
  })

  it("rejects nonstructured payloads instead of inventing a parameter wrapper", () => {
    rejects(Rpc.make("scalar", { payload: Schema.String }), /payload|object|parameter/i)
    rejects(Rpc.make("unknown", { payload: Schema.Unknown }), /payload|object|parameter/i)
  })

  it("treats suspended void and undefined payloads as absent without admitting null scalars", () => {
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("void", { payload: Schema.suspend(() => Schema.suspend(() => Schema.Void)) }),
        Rpc.make("undefined", { payload: Schema.suspend(() => Schema.Undefined) })
      ),
      options
    )
    for (const entry of document.methods) {
      assert.deepStrictEqual(entry.params, [])
      assert.isUndefined(entry["x-effect-params-schema"])
    }
    rejects(Rpc.make("null", { payload: Schema.suspend(() => Schema.Null) }), /payload|object|parameter/i)
  })

  it("describes positional encoded values in wire order with trailing optionality", () => {
    const Payload = Schema.Tuple([Schema.NumberFromString, Schema.optionalKey(Schema.Boolean)])
      .annotate({ identifier: "PositionalParams" })
    const document = OpenRpc.fromRpcGroup(RpcGroup.make(Rpc.make("positional", { payload: Payload })), options)
    const positional = method(document, "positional")
    assert.strictEqual(positional.paramStructure, "by-position")
    assert.deepStrictEqual(positional.params, [
      { name: "0", required: true, schema: { type: "string" } },
      { name: "1", required: false, schema: { type: "boolean" } }
    ])
    const schema = positional["x-effect-params-schema"]!
    assert.isString(schema.$ref)
    assert.isTrue(accepts(document, schema, ["1"]))
    assert.isTrue(accepts(document, schema, ["1", false]))
    assert.isFalse(accepts(document, schema, []))
    assert.isFalse(accepts(document, schema, [1, false]))
    assert.isFalse(accepts(document, schema, ["1", false, true]))
  })

  it("describes only fixed positional parameters while preserving array and rest constraints", () => {
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("array", { payload: Schema.Array(Schema.NumberFromString).check(Schema.isMinLength(1)) }),
        Rpc.make("rest", {
          payload: Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Boolean])
        })
      ),
      options
    )
    const array = method(document, "array")
    assert.strictEqual(array.paramStructure, "by-position")
    assert.deepStrictEqual(array.params, [])
    assert.isTrue(accepts(document, array["x-effect-params-schema"]!, ["1", "2"]))
    assert.isFalse(accepts(document, array["x-effect-params-schema"]!, []))
    assert.isFalse(accepts(document, array["x-effect-params-schema"]!, ["1", 2]))
    const rest = method(document, "rest")
    assert.strictEqual(rest.paramStructure, "by-position")
    assert.deepStrictEqual(rest.params, [{ name: "0", required: true, schema: { type: "string" } }])
    assert.isTrue(accepts(document, rest["x-effect-params-schema"]!, ["prefix"]))
    assert.isTrue(accepts(document, rest["x-effect-params-schema"]!, ["prefix", true, false]))
    assert.isFalse(accepts(document, rest["x-effect-params-schema"]!, []))
    assert.isFalse(accepts(document, rest["x-effect-params-schema"]!, ["prefix", 1]))
  })

  it("retains structured unions without inventing independent parameters", () => {
    const Named = Schema.Struct({ name: Schema.String })
    const AlternateNamed = Schema.Struct({ count: Schema.Int })
    const Positional = Schema.Tuple([Schema.String])
    const AlternatePositional = Schema.Tuple([Schema.Boolean])
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("namedUnion", { payload: Schema.Union([Named, AlternateNamed]) }),
        Rpc.make("positionalUnion", { payload: Schema.Union([Positional, AlternatePositional]) }),
        Rpc.make("mixedUnion", { payload: Schema.Union([Named, Positional]) })
      ),
      options
    )
    const named = method(document, "namedUnion")
    const positional = method(document, "positionalUnion")
    const mixed = method(document, "mixedUnion")
    assert.strictEqual(named.paramStructure, "by-name")
    assert.strictEqual(positional.paramStructure, "by-position")
    assert.strictEqual(mixed.paramStructure, "either")
    for (const entry of [named, positional, mixed]) {
      assert.deepStrictEqual(entry.params, [])
      assert.isFalse(accepts(document, entry["x-effect-params-schema"]!, "not structured"))
    }
    assert.isTrue(accepts(document, named["x-effect-params-schema"]!, { name: "Ada" }))
    assert.isTrue(accepts(document, named["x-effect-params-schema"]!, { count: 2 }))
    assert.isFalse(accepts(document, named["x-effect-params-schema"]!, { count: "2" }))
    assert.isTrue(accepts(document, positional["x-effect-params-schema"]!, ["Ada"]))
    assert.isTrue(accepts(document, positional["x-effect-params-schema"]!, [true]))
    assert.isFalse(accepts(document, positional["x-effect-params-schema"]!, [1]))
    assert.isTrue(accepts(document, mixed["x-effect-params-schema"]!, { name: "Ada" }))
    assert.isTrue(accepts(document, mixed["x-effect-params-schema"]!, ["Ada"]))
    assert.isFalse(accepts(document, mixed["x-effect-params-schema"]!, { count: 2 }))
  })

  it("retains named fields alongside record index constraints in the whole payload schema", () => {
    const Payload = Schema.StructWithRest(
      Schema.Struct({ optional: Schema.optionalKey(Schema.String), name: Schema.String }),
      [Schema.Record(Schema.String.check(Schema.isStartingWith("x-")), Schema.Int)]
    )
    const document = OpenRpc.fromRpcGroup(
      RpcGroup.make(
        Rpc.make("namedRecord", { payload: Payload }),
        Rpc.make("dictionary", { payload: Schema.Record(Schema.String, Schema.String) })
      ),
      options
    )
    const named = method(document, "namedRecord")
    assert.strictEqual(named.paramStructure, "by-name")
    assert.deepStrictEqual(named.params.map(({ name, required }) => [name, required]), [
      ["name", true],
      ["optional", false]
    ])
    assert.isTrue(accepts(document, named["x-effect-params-schema"]!, { name: "Ada", "x-count": 2 }))
    assert.isFalse(accepts(document, named["x-effect-params-schema"]!, { name: "Ada", "x-count": "2" }))
    assert.isFalse(accepts(document, named["x-effect-params-schema"]!, { "x-count": 2 }))
    const dictionary = method(document, "dictionary")
    assert.deepStrictEqual(dictionary.params, [])
    assert.isTrue(accepts(document, dictionary["x-effect-params-schema"]!, { arbitrary: "value" }))
    assert.isFalse(accepts(document, dictionary["x-effect-params-schema"]!, { arbitrary: 1 }))
  })

  it("identifies the offending method when Draft 7 cannot represent a constraint", () => {
    const Unsupported = Schema.String.check(Schema.makeFilter(
      () => true,
      { toJsonSchema: () => ({ unevaluatedProperties: false }) }
    ))
    assert.throws(() =>
      OpenRpc.fromRpcGroup(
        RpcGroup.make(
          Rpc.make("supported", { success: Schema.String }),
          Rpc.make("unsupported", { success: Unsupported })
        ),
        options
      ), /method "unsupported":.*unevaluatedProperties/)
  })

  it("identifies the offending method when a suspended result cannot be represented", () => {
    const Unsupported = Schema.suspend(() => {
      throw new Error("cannot resolve result")
    })
    assert.throws(() =>
      OpenRpc.fromRpcGroup(
        RpcGroup.make(
          Rpc.make("supported", { success: Schema.String }),
          Rpc.make("unsupported", { success: Unsupported })
        ),
        options
      ), /OpenRpc: method "unsupported": cannot resolve result/)
  })

  it("uses the canonical best-effort schema for opaque declarations and custom checks", () => {
    const cases = [
      {
        name: "opaque",
        schema: Schema.declare((input): input is string => typeof input === "string"),
        value: "text"
      },
      {
        name: "checkedDate",
        schema: Schema.Date.check(Schema.makeFilter((date) => date.getTime() > 0)),
        value: "1970-01-01T00:00:00.000Z"
      },
      {
        name: "checkedString",
        schema: Schema.String.check(Schema.makeFilter((value) => value === "secret")),
        value: "public"
      }
    ]
    for (const { name, schema, value } of cases) {
      const document = OpenRpc.fromRpcGroup(
        RpcGroup.make(Rpc.make(name, { payload: { value: schema }, success: schema })),
        options
      )
      const generated = method(document, name)
      const expected = JsonSchema.toDocumentDraft07(Schema.toJsonSchemaDocument(schema))
      assert.deepStrictEqual(resolve(document, generated.result.schema), expected.schema)
      assert.deepStrictEqual(resolve(document, generated.params[0].schema), expected.schema)
      assert.isTrue(accepts(document, generated.result.schema, value))
    }
  })

  it("preserves representable cross-field constraints in the whole payload schema", () => {
    const Payload = Schema.Struct({
      start: Schema.optionalKey(Schema.Int),
      end: Schema.optionalKey(Schema.Int)
    }).check(Schema.makeFilter(
      ({ start, end }) => start === undefined || end !== undefined,
      { toJsonSchema: () => ({ dependentRequired: { start: ["end"] } }) }
    ))
    const document = OpenRpc.fromRpcGroup(RpcGroup.make(Rpc.make("range", { payload: Payload })), options)
    const range = method(document, "range")
    assert.strictEqual(range.paramStructure, "by-name")
    assert.deepStrictEqual(range.params.map(({ name, required }) => [name, required]), [
      ["start", false],
      ["end", false]
    ])
    const schema = range["x-effect-params-schema"]!
    assert.isTrue(accepts(document, schema, {}))
    assert.isTrue(accepts(document, schema, { start: 1, end: 2 }))
    assert.isFalse(accepts(document, schema, { start: 1 }))
  })

  it("keeps typed checks authoritative when whole-payload checks are opaque", () => {
    const Payload = Schema.Struct({ start: Schema.Int, end: Schema.Int })
      .check(Schema.makeFilter(({ start, end }) => start <= end))
    const document = OpenRpc.fromRpcGroup(RpcGroup.make(Rpc.make("range", { payload: Payload })), options)
    const schema = method(document, "range")["x-effect-params-schema"]!
    assert.deepStrictEqual(
      schema,
      JsonSchema.toDocumentDraft07(Schema.toJsonSchemaDocument(Payload, { onExcessProperty: "error" })).schema
    )
    assert.isTrue(accepts(document, schema, { start: 2, end: 1 }))
    assert.isFalse(Schema.is(Payload)({ start: 2, end: 1 }))
    assert.isFalse(accepts(document, schema, { start: "2", end: 1 }))
  })
})
