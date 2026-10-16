import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as JsonSchema from "../../JsonSchema.ts"
import * as Scheduler from "../../Scheduler.ts"
import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import * as SchemaParser from "../../SchemaParser.ts"
import type { StandardJSONSchemaV1, StandardSchemaV1 } from "../../StandardSchema.ts"
import * as InternalToCodec from "./toCodec.ts"
import * as InternalToJsonSchemaDocument from "./toJsonSchemaDocument.ts"
import * as InternalToRepresentation from "./toRepresentation.ts"

function makeStandardResult<A>(exit: Exit.Exit<StandardSchemaV1.Result<A>>): StandardSchemaV1.Result<A> {
  return Exit.isSuccess(exit) ? exit.value : {
    issues: [{ message: Cause.pretty(exit.cause) }]
  }
}

/** @internal */
export function toStandardSchemaV1<S extends Schema.ConstraintDecoder<unknown>>(
  self: S,
  options?: {
    readonly leafHook?: SchemaIssue.LeafHook | undefined
    readonly checkHook?: SchemaIssue.CheckHook | undefined
    readonly parseOptions?: SchemaAST.ParseOptions | undefined
  }
): StandardSchemaV1<S["Encoded"], S["Type"]> & S {
  const decodeUnknownEffect = SchemaParser.decodeUnknownEffect(self) as (
    input: unknown,
    options?: SchemaAST.ParseOptions
  ) => Effect.Effect<S["Type"], SchemaIssue.Issue>
  const parseOptions: SchemaAST.ParseOptions = { errors: "all", ...options?.parseOptions }
  const formatter = SchemaIssue.makeFormatterStandardSchemaV1(options)
  const validate: StandardSchemaV1<S["Encoded"], S["Type"]>["~standard"]["validate"] = (value: unknown) => {
    const scheduler = new Scheduler.MixedScheduler("sync")
    const fiber = Effect.runFork(
      Effect.match(decodeUnknownEffect(value, parseOptions), {
        onFailure: formatter,
        onSuccess: (value): StandardSchemaV1.Result<S["Type"]> => ({ value })
      }),
      { scheduler }
    )
    fiber.currentDispatcher?.flush()
    const exit = fiber.pollUnsafe()
    if (exit) {
      return makeStandardResult(exit)
    }
    return new Promise((resolve) => {
      fiber.addObserver((exit) => {
        resolve(makeStandardResult(exit))
      })
    })
  }
  // Preserve class construction and statics as well as ordinary schema members,
  // without attaching per-call validation options to the original schema.
  const out = typeof self === "function" ? preserveClassReceiver(self) : Object.create(self)
  return Object.defineProperty(out, "~standard", {
    value: {
      version: 1,
      vendor: "effect",
      // Inherited adapters may describe a parent class rather than this schema.
      ...(Object.hasOwn(self, "~standard") ? (self as any)["~standard"] : undefined),
      validate
    },
    writable: true,
    enumerable: true,
    configurable: true
  })
}

function preserveClassReceiver(self: any): any {
  const methods = new WeakMap<object, unknown>()
  return new Proxy(class extends self {}, {
    get(target, key, receiver) {
      // Adapter metadata belongs to the wrapper; existing statics belong to self.
      if (Object.hasOwn(target, key)) return Reflect.get(target, key, receiver)
      const value = Reflect.get(self, key, self)
      if (typeof value !== "function") return value
      if (!methods.has(value)) methods.set(value, value.bind(self))
      return methods.get(value)
    }
  })
}

function toJsonSchemaDocument(ast: SchemaAST.AST): JsonSchema.Document<"draft-2020-12"> {
  const document = InternalToRepresentation.toRepresentation(
    InternalToCodec.toCodecJsonAST(ast)
  )
  return InternalToJsonSchemaDocument.toJsonSchemaDocument(document)
}

function toBaseStandardJSONSchemaV1(
  ast: SchemaAST.AST,
  target: StandardJSONSchemaV1.Target
): JsonSchema.JsonSchema {
  const doc2020_12 = toJsonSchemaDocument(ast)
  if (target === "draft-2020-12") {
    const schema = doc2020_12.schema
    if (Object.keys(doc2020_12.definitions).length > 0) {
      schema.$defs = doc2020_12.definitions
    }
    return schema
  } else if (target === "draft-07") {
    const doc07 = JsonSchema.toDocumentDraft07(doc2020_12)
    const schema = doc07.schema
    if (Object.keys(doc07.definitions).length > 0) {
      schema.definitions = doc07.definitions
    }
    return schema
  }
  throw new globalThis.Error(`Unsupported target: ${target}`)
}

/** @internal */
export function toStandardJSONSchemaV1<S extends Schema.Constraint>(
  self: S
): StandardJSONSchemaV1<S["Encoded"], S["Type"]> & S {
  const jsonSchema: StandardJSONSchemaV1.Props<S["Encoded"], S["Type"]>["jsonSchema"] = {
    input(options) {
      return toBaseStandardJSONSchemaV1(self.ast, options.target)
    },
    output(options) {
      return toBaseStandardJSONSchemaV1(SchemaAST.toType(self.ast), options.target)
    }
  }
  if (Object.hasOwn(self, "~standard")) {
    const out = self as any
    if ("jsonSchema" in out["~standard"]) return out
    Object.assign(out["~standard"], { jsonSchema })
    return out
  }
  return Object.assign(self, {
    "~standard": {
      version: 1,
      vendor: "effect",
      jsonSchema
    } as const
  })
}
