/**
 * Toolkit registration shared by `McpServer` and `McpTasks`.
 */
import * as Cause from "../../Cause.ts"
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as ErrorReporter from "../../ErrorReporter.ts"
import * as HttpRouter from "../../http/HttpRouter.ts"
import * as HttpServerRequest from "../../http/HttpServerRequest.ts"
import type * as JsonSchema from "../../JsonSchema.ts"
import * as Option from "../../Option.ts"
import { CurrentLogLevel } from "../../References.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import * as Tracer from "../../Tracer.ts"
import * as AiError from "../AiError.ts"
import * as McpSchema from "../McpSchema.ts"
import {
  CallToolResult,
  InvalidParams,
  McpRequestContext,
  McpServerClient,
  Tool as McpTool,
  ToolJson
} from "../McpSchema.ts"
import * as Tool from "../Tool.ts"
import * as Toolkit from "../Toolkit.ts"
import type * as McpCore from "./mcpCore.ts"
import * as InternalStructuredOutput from "./structured-output.ts"

/**
 * The core behind each `McpServer` service, for extensions that register
 * operations outside the public service.
 *
 * @internal
 */
export const serverCores = new WeakMap<object, McpCore.McpCore>()

/**
 * @internal
 */
export const middlewareKeyPrefix = "effect/ai/McpServer/Middleware-"

// Do not capture request services or middleware stacks at registration.
const requestServiceKeys = new Set<string>([
  McpRequestContext.key,
  McpServerClient.key,
  HttpServerRequest.HttpServerRequest.key,
  HttpServerRequest.ParsedSearchParams.key,
  HttpRouter.RouteContext.key,
  CurrentLogLevel.key,
  Scope.Scope.key,
  Tracer.ParentSpan.key
])

/**
 * @internal
 */
export const omitRequestServices = <Services>(context: Context.Context<Services>): Context.Context<Services> => {
  const services = new Map<string, any>()
  for (const [key, value] of context.mapUnsafe) {
    if (!requestServiceKeys.has(key) && !key.startsWith(middlewareKeyPrefix)) {
      services.set(key, value)
    }
  }
  return Context.makeUnsafe(services)
}

/**
 * @internal
 */
export const INTERNAL_TOOL_ERROR_MESSAGE = "Tool execution failed due to an internal server error."

/**
 * @internal
 */
export const toolErrorResult = (message: string): CallToolResult =>
  new CallToolResult({
    isError: true,
    content: [{ type: "text", text: message }]
  })

/**
 * @internal
 */
export const toolResultContent = (encoded: unknown): CallToolResult["content"] =>
  encoded === undefined ? [] : [{ type: "text", text: JSON.stringify(encoded) }]

const isParameterValidationError = (
  error: unknown
): error is AiError.AiError & { readonly reason: AiError.ToolParameterValidationError } =>
  AiError.isAiError(error) && error.reason._tag === "ToolParameterValidationError"

// MCP requires an object root. A non-recursive root is compiled inline rather
// than as a definition; a recursive root keeps its definition and the top-level
// `$ref` is inlined.
/**
 * @internal
 */
export const toolJsonSchema = (schema: Schema.Constraint, strict: boolean): JsonSchema.JsonSchema => {
  const root = SchemaAST.getContextOwner(SchemaAST.getLastEncoding(Schema.toCodecJson(schema).ast))
  const document = InternalStructuredOutput.resolveTopLevelReference(
    Schema.toJsonSchemaDocument(schema, {
      onExcessProperty: strict ? "error" : "ignore",
      referencePolicy: ({ ast, identifier, occurrences }) => ast === root && occurrences === 1 ? undefined : identifier
    })
  )
  return Object.keys(document.definitions).length === 0
    ? document.schema
    : { ...document.schema, $defs: document.definitions }
}

/**
 * Provides a Toolkit with its handlers, without the request services their
 * layers captured.
 *
 * @internal
 */
export const buildToolkit = <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>
): Effect.Effect<Toolkit.WithHandler<Tools>, never, Exclude<Tool.HandlersFor<Tools>, McpRequestContext>> =>
  (toolkit as any as Effect.Effect<
    Toolkit.WithHandler<Tools>,
    never,
    Exclude<Tool.HandlersFor<Tools>, McpRequestContext>
  >).pipe(Effect.updateContext((context: Context.Context<Exclude<Tool.HandlersFor<Tools>, McpRequestContext>>) => {
    // Toolkit handlers also retain the context in which their layer was built.
    const services = new Map(context.mapUnsafe)
    for (const tool of Object.values(toolkit.tools)) {
      const handler = services.get(tool.id) as Tool.Handler<string> | undefined
      if (handler !== undefined) {
        services.set(tool.id, { ...handler, context: omitRequestServices(handler.context) })
      }
    }
    return Context.makeUnsafe(services)
  }))

/**
 * Converts a Toolkit tool into its MCP descriptor.
 *
 * @internal
 */
export const toolDescriptor = Effect.fnUntraced(function*(tool: Tool.Any) {
  const strict = Tool.getStrictMode(tool) === true
  const rawJsonSchema = Tool.isDynamic(tool) ? tool.jsonSchema : undefined
  if (strict && rawJsonSchema !== undefined) {
    return yield* Effect.die(
      `McpServer cannot strictly validate the raw JSON Schema for tool '${tool.name}'; use an Effect Schema instead`
    )
  }
  const annotations = tool.annotations
  const toolMeta = Context.getOrUndefined(annotations, Tool.Meta)
  const outputSchema = yield* Schema.decodeUnknownEffect(McpSchema.ToolOutputJson)(
    toolJsonSchema(tool.successSchema, false)
  ).pipe(Effect.orDie)
  const inputSchema = yield* Schema.decodeUnknownEffect(ToolJson)(
    rawJsonSchema ?? toolJsonSchema(tool.parametersSchema, strict)
  ).pipe(
    Effect.catchTag("SchemaError", (error) =>
      Effect.die(
        rawJsonSchema !== undefined
          ? `McpServer cannot register tool '${tool.name}': its raw JSON Schema must have an object root ` +
            `(type: "object").\n\n${error.message}`
          : `McpServer cannot register tool '${tool.name}': its parameters must encode to a JSON Schema with an ` +
            `object root (type: "object"), such as a Schema.Struct. Use Tool.EmptyParams for a tool without ` +
            `parameters.\n\n${error.message}`
      ))
  )
  const mcpTool = new McpTool({
    name: tool.name,
    description: Tool.getDescription(tool),
    inputSchema,
    outputSchema,
    annotations: {
      ...(Context.getOption(tool.annotations, Tool.Title).pipe(
        Option.map((title) => ({ title })),
        Option.getOrUndefined
      )),
      readOnlyHint: Context.get(tool.annotations, Tool.Readonly),
      destructiveHint: Context.get(tool.annotations, Tool.Destructive),
      idempotentHint: Context.get(tool.annotations, Tool.Idempotent),
      openWorldHint: Context.get(tool.annotations, Tool.OpenWorld)
    },
    _meta: toolMeta
  })
  return { tool: mcpTool, annotations }
})

/**
 * @internal
 */
export interface ToolkitRegistration {
  readonly tool: McpTool
  readonly annotations: Context.Context<never>
  readonly handle: (payload: unknown) => Effect.Effect<CallToolResult, InvalidParams>
}

/**
 * Converts a Toolkit with handlers into tool registrations. Handlers run with
 * the services of the context that invokes them.
 *
 * @internal
 */
export const toolkitRegistrations = Effect.fnUntraced(function*<Tools extends Record<string, Tool.Any>>(
  built: Toolkit.WithHandler<Tools>
) {
  // Interruption propagates; anything else is logged, reported and scrubbed.
  const internalToolError = (cause: Cause.Cause<unknown>) => {
    const failure = Cause.findFail(cause)
    return Result.isFailure(failure) && !Cause.hasDies(cause)
      ? Effect.failCause(failure.failure)
      : Effect.logError(cause).pipe(
        Effect.andThen(ErrorReporter.report(cause)),
        Effect.as(toolErrorResult(INTERNAL_TOOL_ERROR_MESSAGE))
      )
  }
  const registrations: Array<ToolkitRegistration> = []
  for (const tool of Object.values(built.tools)) {
    const strict = Tool.getStrictMode(tool) === true
    const decodeOptions: SchemaAST.ParseOptions = {
      onExcessProperty: strict ? "error" : "ignore",
      errors: "all"
    }
    const isDeclaredFailure = Schema.is(tool.failureSchema)
    // MCP content is JSON. Failures raised in "error" mode skip the Toolkit's encoding, so they use the JSON codec here.
    const encodeFailureJson = Schema.encodeUnknownEffect(Schema.toCodecJson(tool.failureSchema)) as (
      value: unknown
    ) => Effect.Effect<unknown, Schema.SchemaError, Tool.HandlerServices<Tools[keyof Tools]>>
    const encodeFailure = (toolResult: unknown) =>
      Effect.mapError(encodeFailureJson(toolResult), (cause) =>
        AiError.make({
          module: "McpServer",
          method: "registerToolkit",
          reason: new AiError.ToolResultEncodingError({
            toolName: tool.name,
            toolResult,
            description: cause.message
          })
        }))
    const failureResult = (encoded: unknown) =>
      new CallToolResult({ isError: true, content: toolResultContent(encoded) })
    const declaredFailureResult = (error: unknown) =>
      error instanceof Error && error.message !== ""
        ? Effect.succeed(toolErrorResult(error.message))
        : Effect.map(encodeFailure(error), failureResult)
    const successResult = (structuredContent: unknown) =>
      new CallToolResult({
        isError: false,
        structuredContent,
        content: toolResultContent(structuredContent)
      })
    const handleCause = (cause: Cause.Cause<unknown>) => {
      const failure = Cause.findFail(cause)
      if (Result.isSuccess(failure)) {
        const error = failure.success.error
        const origin = Context.get(Cause.reasonAnnotations(failure.success), Toolkit.FailureOrigin)
        if (origin === "parameters" && isParameterValidationError(error)) {
          return Effect.fail(new InvalidParams({ message: error.reason.message }))
        }
        if (origin === "handler" && isDeclaredFailure(error)) {
          return Effect.catchCause(declaredFailureResult(error), internalToolError)
        }
      }
      return internalToolError(cause)
    }
    const { tool: mcpTool, annotations } = yield* toolDescriptor(tool)
    registrations.push({
      tool: mcpTool,
      annotations,
      handle(payload) {
        return built.handle(tool.name as keyof Tools, (payload ?? {}) as Schema.Json, undefined, decodeOptions).pipe(
          Stream.unwrap,
          Stream.runLast,
          Effect.flatMap(Effect.fromOption),
          Effect.flatMap((result): Effect.Effect<
            CallToolResult,
            unknown,
            Tool.HandlerServices<Tools[keyof Tools]>
          > => {
            // The Toolkit encodes successes and "return"-mode failures with their JSON codec.
            if (!result.isFailure) {
              // An absent result, such as `Schema.Void`, has no structured form.
              return Effect.succeed(
                result.result === undefined
                  ? new CallToolResult({ isError: false, content: [] })
                  : successResult(result.encodedResult)
              )
            }
            // Declared failures return their encoded payload; anything else is classified by origin.
            return result.failureOrigin === "handler"
              ? Effect.succeed(failureResult(result.encodedResult))
              : Effect.failCause(Cause.annotate(
                Cause.fail(result.result),
                Context.make(Toolkit.FailureOrigin, result.failureOrigin ?? "result")
              ))
          }),
          Effect.catchCause(handleCause)
        ) as Effect.Effect<CallToolResult, InvalidParams, never>
      }
    })
  }
  return registrations
})
