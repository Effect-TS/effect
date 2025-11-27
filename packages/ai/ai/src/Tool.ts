/**
 * The `Tool` module provides functionality for defining and managing tools
 * that language models can call to augment their capabilities.
 *
 * This module enables creation of both user-defined and provider-defined tools,
 * with full schema validation, type safety, and handler support. Tools allow
 * AI models to perform actions like searching databases, calling APIs, or
 * executing code within your application context.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * // Define a simple calculator tool
 * const Calculator = Tool.make("Calculator", {
 *   description: "Performs basic arithmetic operations",
 *   parameters: {
 *     operation: Schema.Literal("add", "subtract", "multiply", "divide"),
 *     a: Schema.Number,
 *     b: Schema.Number
 *   },
 *   success: Schema.Number
 * })
 * ```
 *
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import { constFalse, constTrue, identity } from "effect/Function"
import * as JsonSchema from "effect/JSONSchema"
import * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type { Covariant } from "effect/Types"
import type * as AiError from "./AiError.js"

// =============================================================================
// Type Ids
// =============================================================================

/**
 * Unique identifier for user-defined tools.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId = "~@effect/ai/Tool"

/**
 * Type-level representation of the user-defined tool identifier.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * Unique identifier for provider-defined tools.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export const ProviderDefinedTypeId = "~@effect/ai/Tool/ProviderDefined"

/**
 * Type-level representation of the provider-defined tool identifier.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export type ProviderDefinedTypeId = typeof ProviderDefinedTypeId

// =============================================================================
// Models
// =============================================================================

/**
 * A user-defined tool that language models can call to perform actions.
 *
 * Tools represent actionable capabilities that large language models can invoke
 * to extend their functionality beyond text generation. Each tool has a defined
 * schema for parameters, results, and failures.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * // Create a weather lookup tool
 * const GetWeather = Tool.make("GetWeather", {
 *   description: "Get current weather for a location",
 *   parameters: {
 *     location: Schema.String,
 *     units: Schema.Literal("celsius", "fahrenheit")
 *   },
 *   success: Schema.Struct({
 *     temperature: Schema.Number,
 *     condition: Schema.String,
 *     humidity: Schema.Number
 *   })
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface Tool<
  Name extends string,
  Config extends {
    readonly parameters: AnyStructSchema
    readonly success: Schema.Schema.Any
    readonly failure: Schema.Schema.All
    readonly failureMode: FailureMode
  },
  Requirements = never
> extends Tool.Variance<Requirements> {
  /**
   * The tool identifier which is used to uniquely identify the tool.
   */
  readonly id: string

  /**
   * The name of the tool.
   */
  readonly name: Name

  /**
   * The optional description of the tool.
   */
  readonly description?: string | undefined

  /**
   * The strategy used for handling errors returned from tool call handler
   * execution.
   *
   * If set to `"error"` (the default), errors that occur during tool call
   * handler execution will be returned in the error channel of the calling
   * effect.
   *
   * If set to `"return"`, errors that occur during tool call handler execution
   * will be captured and returned as part of the tool call result.
   */
  readonly failureMode: FailureMode

  /**
   * A `Schema` representing the parameters that a tool must be called with.
   */
  readonly parametersSchema: Config["parameters"]

  /**
   * A `Schema` representing the value that a tool must return when called if
   * the tool call is successful.
   */
  readonly successSchema: Config["success"]

  /**
   * A `Schema` representing the value that a tool must return when called if
   * it fails.
   */
  readonly failureSchema: Config["failure"]

  /**
   * A `Context` object containing tool annotations which can store metadata
   * about the tool.
   */
  readonly annotations: Context.Context<never>

  /**
   * Adds a _request-level_ dependency which must be provided before the tool
   * call handler can be executed.
   *
   * This can be useful when you want to enforce that a particular dependency
   * **MUST** be provided to each request to the large language model provider
   * instead of being provided when creating the tool call handler layer.
   */
  addDependency<Identifier, Service>(
    tag: Context.Tag<Identifier, Service>
  ): Tool<Name, Config, Identifier | Requirements>

  /**
   * Set the schema to use to validate the result of a tool call when successful.
   */
  setParameters<
    ParametersSchema extends Schema.Struct<any> | Schema.Struct.Fields
  >(
    schema: ParametersSchema
  ): Tool<
    Name,
    {
      readonly parameters: ParametersSchema extends Schema.Struct<infer _> ? ParametersSchema
        : ParametersSchema extends Schema.Struct.Fields ? Schema.Struct<ParametersSchema>
        : never
      readonly success: Config["success"]
      readonly failure: Config["failure"]
      readonly failureMode: Config["failureMode"]
    },
    Requirements
  >

  /**
   * Set the schema to use to validate the result of a tool call when successful.
   */
  setSuccess<SuccessSchema extends Schema.Schema.Any>(
    schema: SuccessSchema
  ): Tool<
    Name,
    {
      readonly parameters: Config["parameters"]
      readonly success: SuccessSchema
      readonly failure: Config["failure"]
      readonly failureMode: Config["failureMode"]
    },
    Requirements
  >

  /**
   * Set the schema to use to validate the result of a tool call when it fails.
   */
  setFailure<FailureSchema extends Schema.Schema.Any>(
    schema: FailureSchema
  ): Tool<
    Name,
    {
      readonly parameters: Config["parameters"]
      readonly success: Config["success"]
      readonly failure: FailureSchema
      readonly failureMode: Config["failureMode"]
    },
    Requirements
  >

  /**
   * Add an annotation to the tool.
   */
  annotate<I, S>(
    tag: Context.Tag<I, S>,
    value: S
  ): Tool<Name, Config, Requirements>

  /**
   * Add many annotations to the tool.
   */
  annotateContext<I>(
    context: Context.Context<I>
  ): Tool<Name, Config, Requirements>
}

/**
 * A provider-defined tool is a tool which is built into a large language model
 * provider (e.g. web search, code execution).
 *
 * These tools are executed by the large language model provider rather than
 * by your application. However, they can optionally require custom handlers
 * implemented in your application to process provider generated results.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * // Define a web search tool provided by OpenAI
 * const WebSearch = Tool.providerDefined({
 *   id: "openai.web_search",
 *   toolkitName: "WebSearch",
 *   providerName: "web_search",
 *   args: {
 *     query: Schema.String
 *   },
 *   success: Schema.Struct({
 *     results: Schema.Array(Schema.Struct({
 *       title: Schema.String,
 *       url: Schema.String,
 *       snippet: Schema.String
 *     }))
 *   })
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ProviderDefined<
  Name extends string,
  Config extends {
    readonly args: AnyStructSchema
    readonly parameters: AnyStructSchema
    readonly success: Schema.Schema.Any
    readonly failure: Schema.Schema.All
    readonly failureMode: FailureMode
  } = {
    readonly args: Schema.Struct<{}>
    readonly parameters: Schema.Struct<{}>
    readonly success: typeof Schema.Void
    readonly failure: typeof Schema.Never
    readonly failureMode: "error"
  },
  RequiresHandler extends boolean = false
> extends
  Tool<
    Name,
    {
      readonly parameters: Config["parameters"]
      readonly success: Config["success"]
      readonly failure: Config["failure"]
      readonly failureMode: Config["failureMode"]
    }
  >,
  Tool.ProviderDefinedProto
{
  /**
   * The arguments passed to the provider-defined tool.
   */
  readonly args: Config["args"]["Encoded"]

  /**
   * A `Schema` representing the arguments provided by the end-user which will
   * be used to configure the behavior of the provider-defined tool.
   */
  readonly argsSchema: Config["args"]

  /**
   * Name of the tool as recognized by the large language model provider.
   */
  readonly providerName: string

  /**
   * If set to `true`, this provider-defined tool will require a user-defined
   * tool call handler to be provided when converting the `Toolkit` containing
   * this tool into a `Layer`.
   */
  readonly requiresHandler: RequiresHandler
}

/**
 * The strategy used for handling errors returned from tool call handler
 * execution.
 *
 * If set to `"error"` (the default), errors that occur during tool call handler
 * execution will be returned in the error channel of the calling effect.
 *
 * If set to `"return"`, errors that occur during tool call handler execution
 * will be captured and returned as part of the tool call result.
 *
 * @since 1.0.0
 * @category Models
 */
export type FailureMode = "error" | "return"

/**
 * @since 1.0.0
 */
export declare namespace Tool {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Variance<out Requirements> extends Pipeable {
    readonly [TypeId]: VarianceStruct<Requirements>
  }

  /**
   * @since 1.0.0
   * @category Models
   */
  export interface VarianceStruct<out Requirements> {
    readonly _Requirements: Covariant<Requirements>
  }

  /**
   * @since 1.0.0
   * @category Models
   */
  export interface ProviderDefinedProto {
    readonly [ProviderDefinedTypeId]: ProviderDefinedTypeId
  }
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a user-defined tool.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * const UserDefinedTool = Tool.make("Calculator", {
 *   description: "Performs basic arithmetic operations",
 *   parameters: {
 *     operation: Schema.Literal("add", "subtract", "multiply", "divide"),
 *     a: Schema.Number,
 *     b: Schema.Number
 *   },
 *   success: Schema.Number
 * })
 *
 * const ProviderDefinedTool = Tool.providerDefined({
 *   id: "openai.web_search",
 *   toolkitName: "WebSearch",
 *   providerName: "web_search",
 *   args: {
 *     query: Schema.String
 *   },
 *   success: Schema.Struct({
 *     results: Schema.Array(Schema.Struct({
 *       title: Schema.String,
 *       url: Schema.String,
 *       snippet: Schema.String
 *     }))
 *   })
 * })
 *
 * console.log(Tool.isUserDefined(UserDefinedTool))      // true
 * console.log(Tool.isUserDefined(ProviderDefinedTool))  // false
 * ```
 *
 * @since 1.0.0
 * @category Guards
 */
export const isUserDefined = (u: unknown): u is Tool<string, any, any> =>
  Predicate.hasProperty(u, TypeId) && !isProviderDefined(u)

/**
 * Type guard to check if a value is a provider-defined tool.
 *
 * @param u - The value to check
 * @returns `true` if the value is a provider-defined `Tool`, `false` otherwise
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * const UserDefinedTool = Tool.make("Calculator", {
 *   description: "Performs basic arithmetic operations",
 *   parameters: {
 *     operation: Schema.Literal("add", "subtract", "multiply", "divide"),
 *     a: Schema.Number,
 *     b: Schema.Number
 *   },
 *   success: Schema.Number
 * })
 *
 * const ProviderDefinedTool = Tool.providerDefined({
 *   id: "openai.web_search",
 *   toolkitName: "WebSearch",
 *   providerName: "web_search",
 *   args: {
 *     query: Schema.String
 *   },
 *   success: Schema.Struct({
 *     results: Schema.Array(Schema.Struct({
 *       title: Schema.String,
 *       url: Schema.String,
 *       snippet: Schema.String
 *     }))
 *   })
 * })
 *
 * console.log(Tool.isUserDefined(UserDefinedTool))      // false
 * console.log(Tool.isUserDefined(ProviderDefinedTool))  // true
 * ```
 *
 * @since 1.0.0
 * @category Guards
 */
export const isProviderDefined = (
  u: unknown
): u is ProviderDefined<string, any> => Predicate.hasProperty(u, ProviderDefinedTypeId)

// =============================================================================
// Utility Types
// =============================================================================

/**
 * A type which represents any `Tool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export interface Any extends Pipeable {
  readonly [TypeId]: {
    readonly _Requirements: Covariant<any>
  }
  readonly id: string
  readonly name: string
  readonly description?: string | undefined
  readonly parametersSchema: AnyStructSchema
  readonly successSchema: Schema.Schema.Any
  readonly failureSchema: Schema.Schema.All
  readonly failureMode: FailureMode
  readonly annotations: Context.Context<never>
}

/**
 * A type which represents any provider-defined `Tool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export interface AnyProviderDefined extends Any {
  readonly args: any
  readonly argsSchema: AnyStructSchema
  readonly requiresHandler: boolean
  readonly providerName: string
  readonly decodeResult: (
    result: unknown
  ) => Effect.Effect<any, AiError.AiError>
}

/**
 * @since 1.0.0
 * @category Utility Types
 */
export interface AnyStructSchema extends Pipeable {
  readonly [Schema.TypeId]: any
  readonly make: any
  readonly Type: any
  readonly Encoded: any
  readonly Context: any
  readonly ast: AST.AST
  readonly fields: Schema.Struct.Fields
  readonly annotations: any
}

/**
 * @since 1.0.0
 * @category Utility Types
 */
export interface AnyTaggedRequestSchema extends AnyStructSchema {
  readonly _tag: string
  readonly success: Schema.Schema.Any
  readonly failure: Schema.Schema.All
}

/**
 * A utility type to convert a `Schema.TaggedRequest` into an `Tool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export interface FromTaggedRequest<S extends AnyTaggedRequestSchema> extends
  Tool<
    S["_tag"],
    {
      readonly parameters: S
      readonly success: S["success"]
      readonly failure: S["failure"]
      readonly failureMode: "error"
    }
  >
{}

/**
 * A utility type to extract the `Name` type from an `Tool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Name<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? _Name
  : never

/**
 * A utility type to extract the type of the tool call parameters.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Parameters<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? Schema.Struct.Type<_Config["parameters"]["fields"]>
  : never

/**
 * A utility type to extract the encoded type of the tool call parameters.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ParametersEncoded<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? Schema.Schema.Encoded<_Config["parameters"]>
  : never

/**
 * A utility type to extract the schema for the parameters which an `Tool`
 * must be called with.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ParametersSchema<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? _Config["parameters"]
  : never

/**
 * A utility type to extract the type of the tool call result when it succeeds.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Success<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? Schema.Schema.Type<_Config["success"]>
  : never

/**
 * A utility type to extract the encoded type of the tool call result when
 * it succeeds.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type SuccessEncoded<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? Schema.Schema.Encoded<_Config["success"]>
  : never

/**
 * A utility type to extract the schema for the return type of a tool call when
 * the tool call succeeds.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type SuccessSchema<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? _Config["success"]
  : never

/**
 * A utility type to extract the type of the tool call result when it fails.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Failure<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? Schema.Schema.Type<_Config["failure"]>
  : never

/**
 * A utility type to extract the encoded type of the tool call result when
 * it fails.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type FailureEncoded<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? Schema.Schema.Encoded<_Config["failure"]>
  : never

/**
 * A utility type to extract the type of the tool call result whether it
 * succeeds or fails.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Result<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? Success<T> | Failure<T>
  : never

/**
 * A utility type to extract the encoded type of the tool call result whether
 * it succeeds or fails.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ResultEncoded<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? SuccessEncoded<T> | FailureEncoded<T>
  : never

/**
 * A utility type to extract the requirements of an `Tool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Requirements<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ?
    | _Config["parameters"]["Context"]
    | _Config["success"]["Context"]
    | _Config["failure"]["Context"]
    | _Requirements
  : never

/**
 * Represents an `Tool` that has been implemented within the application.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Handler<Name extends string> {
  readonly _: unique symbol
  readonly name: Name
  readonly context: Context.Context<never>
  readonly handler: (params: any) => Effect.Effect<any, any>
}

/**
 * Represents the result of calling the handler for a particular `Tool`.
 *
 * @since 1.0.0
 * @category Models
 */
export interface HandlerResult<Tool extends Any> {
  /**
   * Whether the result of executing the tool call handler was an error or not.
   */
  readonly isFailure: boolean
  /**
   * The result of executing the handler for a particular tool.
   */
  readonly result: Result<Tool>
  /**
   * The pre-encoded tool call result of executing the handler for a particular
   * tool as a JSON-serializable value. The encoded result can be incorporated
   * into subsequent requests to the large language model.
   */
  readonly encodedResult: unknown
}

/**
 * A utility type which represents the possible errors that can be raised by
 * a tool call's handler.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type HandlerError<T> = T extends Tool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? _Config["failureMode"] extends "error" ? _Config["failure"]["Type"]
  : never
  : never

/**
 * A utility type to create a union of `Handler` types for all tools in a
 * record.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type HandlersFor<Tools extends Record<string, Any>> = {
  [Name in keyof Tools]: RequiresHandler<Tools[Name]> extends true ? Handler<Tools[Name]["name"]>
    : never
}[keyof Tools]

/**
 * A utility type to determine if the specified tool requires a user-defined
 * handler to be implemented.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type RequiresHandler<Tool extends Any> = Tool extends ProviderDefined<
  infer _Name,
  infer _Config,
  infer _RequiresHandler
> ? _RequiresHandler
  : true

// =============================================================================
// Constructors
// =============================================================================

const Proto = {
  [TypeId]: { _Requirements: identity },
  pipe() {
    return pipeArguments(this, arguments)
  },
  addDependency(this: Any) {
    return userDefinedProto({ ...this })
  },
  setParameters(
    this: Any,
    parametersSchema: Schema.Struct<any> | Schema.Struct.Fields
  ) {
    return userDefinedProto({
      ...this,
      parametersSchema: Schema.isSchema(parametersSchema)
        ? (parametersSchema as any)
        : Schema.Struct(parametersSchema as any)
    })
  },
  setSuccess(this: Any, successSchema: Schema.Schema.Any) {
    return userDefinedProto({
      ...this,
      successSchema
    })
  },
  setFailure(this: Any, failureSchema: Schema.Schema.All) {
    return userDefinedProto({
      ...this,
      failureSchema
    })
  },
  annotate<I, S>(this: Any, tag: Context.Tag<I, S>, value: S) {
    return userDefinedProto({
      ...this,
      annotations: Context.add(this.annotations, tag, value)
    })
  },
  annotateContext<I>(this: Any, context: Context.Context<I>) {
    return userDefinedProto({
      ...this,
      annotations: Context.merge(this.annotations, context)
    })
  }
}

const ProviderDefinedProto = {
  ...Proto,
  [ProviderDefinedTypeId]: ProviderDefinedTypeId
}

const userDefinedProto = <
  const Name extends string,
  Parameters extends AnyStructSchema,
  Success extends Schema.Schema.Any,
  Failure extends Schema.Schema.All,
  Mode extends FailureMode
>(options: {
  readonly name: Name
  readonly description?: string | undefined
  readonly parametersSchema: Parameters
  readonly successSchema: Success
  readonly failureSchema: Failure
  readonly annotations: Context.Context<never>
  readonly failureMode: Mode
}): Tool<
  Name,
  {
    readonly parameters: Parameters
    readonly success: Success
    readonly failure: Failure
    readonly failureMode: Mode
  }
> => {
  const self = Object.assign(Object.create(Proto), options)
  self.id = `@effect/ai/Tool/${options.name}`
  return self
}

const providerDefinedProto = <
  const Name extends string,
  Args extends AnyStructSchema,
  Parameters extends AnyStructSchema,
  Success extends Schema.Schema.Any,
  Failure extends Schema.Schema.All,
  RequiresHandler extends boolean,
  Mode extends FailureMode
>(options: {
  readonly id: string
  readonly name: Name
  readonly providerName: string
  readonly args: Args["Encoded"]
  readonly argsSchema: Args
  readonly requiresHandler: RequiresHandler
  readonly parametersSchema: Parameters
  readonly successSchema: Success
  readonly failureSchema: Failure
  readonly failureMode: FailureMode
}): ProviderDefined<
  Name,
  {
    readonly args: Args
    readonly parameters: Parameters
    readonly success: Success
    readonly failure: Failure
    readonly failureMode: Mode
  },
  RequiresHandler
> => Object.assign(Object.create(ProviderDefinedProto), options)

const constEmptyStruct = Schema.Struct({})

/**
 * Creates a user-defined tool with the specified name and configuration.
 *
 * This is the primary constructor for creating custom tools that AI models
 * can call. The tool definition includes parameter validation, success/failure
 * schemas, and optional service dependencies.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * // Simple tool with no parameters
 * const GetCurrentTime = Tool.make("GetCurrentTime", {
 *   description: "Returns the current timestamp",
 *   success: Schema.Number
 * })
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  const Name extends string,
  Parameters extends Schema.Struct.Fields = {},
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Failure extends Schema.Schema.All = typeof Schema.Never,
  Mode extends FailureMode | undefined = undefined,
  Dependencies extends Array<Context.Tag<any, any>> = []
>(
  /**
   * The unique name identifier for this tool.
   */
  name: Name,
  options?: {
    /**
     * An optional description explaining what the tool does.
     */
    readonly description?: string | undefined
    /**
     * Schema defining the parameters this tool accepts.
     */
    readonly parameters?: Parameters | undefined
    /**
     * Schema for successful tool execution results.
     */
    readonly success?: Success | undefined
    /**
     * Schema for tool execution failures.
     */
    readonly failure?: Failure | undefined
    /**
     * The strategy used for handling errors returned from tool call handler
     * execution.
     *
     * If set to `"error"` (the default), errors that occur during tool call handler
     * execution will be returned in the error channel of the calling effect.
     *
     * If set to `"return"`, errors that occur during tool call handler execution
     * will be captured and returned as part of the tool call result.
     */
    readonly failureMode?: Mode
    /**
     * Service dependencies required by the tool handler.
     */
    readonly dependencies?: Dependencies | undefined
  }
): Tool<
  Name,
  {
    readonly parameters: Schema.Struct<Parameters>
    readonly success: Success
    readonly failure: Failure
    readonly failureMode: Mode extends undefined ? "error" : Mode
  },
  Context.Tag.Identifier<Dependencies[number]>
> => {
  const successSchema = options?.success ?? Schema.Void
  const failureSchema = options?.failure ?? Schema.Never
  return userDefinedProto({
    name,
    description: options?.description,
    parametersSchema: options?.parameters
      ? Schema.Struct(options?.parameters as any)
      : constEmptyStruct,
    successSchema,
    failureSchema,
    failureMode: options?.failureMode ?? "error",
    annotations: Context.empty()
  }) as any
}

/**
 * Creates a provider-defined tool which leverages functionality built into a
 * large language model provider (e.g. web search, code execution).
 *
 * These tools are executed by the large language model provider rather than
 * by your application. However, they can optionally require custom handlers
 * implemented in your application to process provider generated results.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * // Web search tool provided by OpenAI
 * const WebSearch = Tool.providerDefined({
 *   id: "openai.web_search",
 *   toolkitName: "WebSearch",
 *   providerName: "web_search",
 *   args: {
 *     query: Schema.String
 *   },
 *   success: Schema.Struct({
 *     results: Schema.Array(Schema.Struct({
 *       title: Schema.String,
 *       url: Schema.String,
 *       content: Schema.String
 *     }))
 *   })
 * })
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const providerDefined = <
  const Name extends string,
  Args extends Schema.Struct.Fields = {},
  Parameters extends Schema.Struct.Fields = {},
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Failure extends Schema.Schema.All = typeof Schema.Never,
  RequiresHandler extends boolean = false
>(options: {
  /**
   * Unique identifier following format `<provider>.<tool-name>`.
   */
  readonly id: `${string}.${string}`
  /**
   * Name used by the Toolkit to identify this tool.
   */
  readonly toolkitName: Name
  /**
   * Name of the tool as recognized by the AI provider.
   */
  readonly providerName: string
  /**
   * Schema for user-provided configuration arguments.
   */
  readonly args: Args
  /**
   * Whether this tool requires a custom handler implementation.
   */
  readonly requiresHandler?: RequiresHandler | undefined
  /**
   * Schema for parameters the provider sends when calling the tool.
   */
  readonly parameters?: Parameters | undefined
  /**
   * Schema for successful tool execution results.
   */
  readonly success?: Success | undefined
  /**
   * Schema for failed tool execution results.
   */
  readonly failure?: Failure | undefined
}) =>
<Mode extends FailureMode | undefined = undefined>(
  args: RequiresHandler extends true ? Schema.Simplify<
      Schema.Struct.Encoded<Args> & {
        /**
         * The strategy used for handling errors returned from tool call handler
         * execution.
         *
         * If set to `"error"` (the default), errors that occur during tool call handler
         * execution will be returned in the error channel of the calling effect.
         *
         * If set to `"return"`, errors that occur during tool call handler execution
         * will be captured and returned as part of the tool call result.
         */
        readonly failureMode?: Mode
      }
    >
    : Schema.Simplify<Schema.Struct.Encoded<Args>>
): ProviderDefined<
  Name,
  {
    readonly args: Schema.Struct<Args>
    readonly parameters: Schema.Struct<Parameters>
    readonly success: Success
    readonly failure: Failure
    readonly failureMode: Mode extends undefined ? "error" : Mode
  },
  RequiresHandler
> => {
  const failureMode = "failureMode" in args ? args.failureMode : undefined
  const successSchema = options?.success ?? Schema.Void
  const failureSchema = options?.failure ?? Schema.Never
  return providerDefinedProto({
    id: options.id,
    name: options.toolkitName,
    providerName: options.providerName,
    args,
    argsSchema: Schema.Struct(options.args as any),
    requiresHandler: options.requiresHandler ?? false,
    parametersSchema: options?.parameters
      ? Schema.Struct(options?.parameters as any)
      : constEmptyStruct,
    successSchema,
    failureSchema,
    failureMode: failureMode ?? "error"
  }) as any
}

/**
 * Creates a Tool from a Schema.TaggedRequest.
 *
 * This utility function converts Effect's TaggedRequest schemas into Tool
 * definitions, automatically mapping the request parameters, success, and
 * failure schemas.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * // Define a tagged request for user operations
 * class GetUser extends Schema.TaggedRequest<GetUser>()("GetUser", {
 *   success: Schema.Struct({
 *     id: Schema.Number,
 *     name: Schema.String,
 *     email: Schema.String
 *   }),
 *   failure: Schema.Struct({
 *     error: Schema.Literal("UserNotFound", "DatabaseError"),
 *     message: Schema.String
 *   }),
 *   payload: {
 *     userId: Schema.Number
 *   }
 * }) {}
 *
 * // Convert to a Tool
 * const getUserTool = Tool.fromTaggedRequest(GetUser)
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromTaggedRequest = <S extends AnyTaggedRequestSchema>(
  schema: S
): FromTaggedRequest<S> =>
  userDefinedProto({
    name: schema._tag,
    description: Option.getOrUndefined(
      AST.getDescriptionAnnotation((schema.ast as any).to)
    ),
    parametersSchema: schema,
    successSchema: schema.success,
    failureSchema: schema.failure,
    failureMode: "error",
    annotations: Context.empty()
  }) as any

// =============================================================================
// Utilities
// =============================================================================

/**
 * Extracts the description from a tool's metadata.
 *
 * Returns the tool's description if explicitly set, otherwise attempts to
 * extract it from the parameter schema's AST annotations.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 *
 * const myTool = Tool.make("example", {
 *   description: "This is an example tool"
 * })
 *
 * const description = Tool.getDescription(myTool)
 * console.log(description) // "This is an example tool"
 * ```
 *
 * @since 1.0.0
 * @category Utilities
 */
export const getDescription = <
  Name extends string,
  Config extends {
    readonly parameters: AnyStructSchema
    readonly success: Schema.Schema.Any
    readonly failure: Schema.Schema.All
    readonly failureMode: FailureMode
  }
>(
  /**
   * The tool to get the description from.
   */
  tool: Tool<Name, Config>
): string | undefined => {
  if (Predicate.isNotUndefined(tool.description)) {
    return tool.description
  }
  return getDescriptionFromSchemaAst(tool.parametersSchema.ast)
}

/**
 * @since 1.0.0
 * @category Utilities
 */
export const getDescriptionFromSchemaAst = (
  ast: AST.AST
): string | undefined => {
  const annotations = ast._tag === "Transformation"
    ? {
      ...ast.to.annotations,
      ...ast.annotations
    }
    : ast.annotations
  return AST.DescriptionAnnotationId in annotations
    ? (annotations[AST.DescriptionAnnotationId] as string)
    : undefined
}

/**
 * Generates a JSON Schema for a tool.
 *
 * This function creates a JSON Schema representation that can be used by
 * large language models to indicate the structure and type of the parameters
 * that a given tool call should receive.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * const weatherTool = Tool.make("get_weather", {
 *   parameters: {
 *     location: Schema.String,
 *     units: Schema.optional(Schema.Literal("celsius", "fahrenheit"))
 *   }
 * })
 *
 * const jsonSchema = Tool.getJsonSchema(weatherTool)
 * console.log(jsonSchema)
 * // {
 * //   type: "object",
 * //   properties: {
 * //     location: { type: "string" },
 * //     units: { type: "string", enum: ["celsius", "fahrenheit"] }
 * //   },
 * //   required: ["location"]
 * // }
 * ```
 *
 * @since 1.0.0
 * @category Utilities
 */
export const getJsonSchema = <
  Name extends string,
  Config extends {
    readonly parameters: AnyStructSchema
    readonly success: Schema.Schema.Any
    readonly failure: Schema.Schema.All
    readonly failureMode: FailureMode
  }
>(
  tool: Tool<Name, Config>
): JsonSchema.JsonSchema7 => getJsonSchemaFromSchemaAst(tool.parametersSchema.ast)

/**
 * @since 1.0.0
 * @category Utilities
 */
export const getJsonSchemaFromSchemaAst = (
  ast: AST.AST
): JsonSchema.JsonSchema7 => {
  const props = AST.getPropertySignatures(ast)
  if (props.length === 0) {
    return {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  }
  const $defs = {}
  const schema = JsonSchema.fromAST(ast, {
    definitions: $defs,
    topLevelReferenceStrategy: "skip"
  })
  if (Object.keys($defs).length === 0) return schema
  ;(schema as any).$defs = $defs
  return schema
}

// =============================================================================
// Annotations
// =============================================================================

/**
 * Annotation for providing a human-readable title for tools.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 *
 * const myTool = Tool.make("calculate_tip")
 *   .annotate(Tool.Title, "Tip Calculator")
 * ```
 *
 * @since 1.0.0
 * @category Annotations
 */
export class Title extends Context.Tag("@effect/ai/Tool/Title")<
  Title,
  string
>() {}

/**
 * Annotation indicating whether a tool only reads data without making changes.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 *
 * const readOnlyTool = Tool.make("get_user_info")
 *   .annotate(Tool.Readonly, true)
 * ```
 *
 * @since 1.0.0
 * @category Annotations
 */
export class Readonly extends Context.Reference<Readonly>()(
  "@effect/ai/Tool/Readonly",
  {
    defaultValue: constFalse
  }
) {}

/**
 * Annotation indicating whether a tool performs destructive operations.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 *
 * const safeTool = Tool.make("search_database")
 *   .annotate(Tool.Destructive, false)
 * ```
 *
 * @since 1.0.0
 * @category Annotations
 */
export class Destructive extends Context.Reference<Destructive>()(
  "@effect/ai/Tool/Destructive",
  {
    defaultValue: constTrue
  }
) {}

/**
 * Annotation indicating whether a tool can be called multiple times safely.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 *
 * const idempotentTool = Tool.make("get_current_time")
 *   .annotate(Tool.Idempotent, true)
 * ```
 *
 * @since 1.0.0
 * @category Annotations
 */
export class Idempotent extends Context.Reference<Idempotent>()(
  "@effect/ai/Tool/Idempotent",
  {
    defaultValue: constFalse
  }
) {}

/**
 * Annotation indicating whether a tool can handle arbitrary external data.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 *
 * const restrictedTool = Tool.make("internal_operation")
 *   .annotate(Tool.OpenWorld, false)
 * ```
 *
 * @since 1.0.0
 * @category Annotations
 */
export class OpenWorld extends Context.Reference<OpenWorld>()(
  "@effect/ai/Tool/OpenWorld",
  {
    defaultValue: constTrue
  }
) {}

// Licensed under BSD-3-Clause (below code only)
// Code adapted from https://github.com/fastify/secure-json-parse/blob/783fcb1b5434709466759847cec974381939673a/index.js
//
// Copyright (c) Effectful Technologies, Inc (https://effectful.co)
// Copyright (c) 2019 The Fastify Team
// Copyright (c) 2019, Sideway Inc, and project contributors
// All rights reserved.
//
// The complete list of contributors can be found at:
// - https://github.com/hapijs/bourne/graphs/contributors
// - https://github.com/fastify/secure-json-parse/graphs/contributors
// - https://github.com/Effect-TS/effect/commits/main/packages/ai/ai/src/Tool.ts
//
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

const suspectProtoRx = /"__proto__"\s*:/
const suspectConstructorRx = /"constructor"\s*:/

function _parse(text: string) {
  // Parse normally
  const obj = JSON.parse(text)

  // Ignore null and non-objects
  if (obj === null || typeof obj !== "object") {
    return obj
  }

  if (
    suspectProtoRx.test(text) === false &&
    suspectConstructorRx.test(text) === false
  ) {
    return obj
  }

  // Scan result for proto keys
  return filter(obj)
}

function filter(obj: any) {
  let next = [obj]

  while (next.length) {
    const nodes = next
    next = []

    for (const node of nodes) {
      if (Object.prototype.hasOwnProperty.call(node, "__proto__")) {
        throw new SyntaxError("Object contains forbidden prototype property")
      }

      if (
        Object.prototype.hasOwnProperty.call(node, "constructor") &&
        Object.prototype.hasOwnProperty.call(node.constructor, "prototype")
      ) {
        throw new SyntaxError("Object contains forbidden prototype property")
      }

      for (const key in node) {
        const value = node[key]
        if (value && typeof value === "object") {
          next.push(value)
        }
      }
    }
  }
  return obj
}

/**
 * **Unsafe**: This function will throw an error if an insecure property is
 * found in the parsed JSON or if the provided JSON text is not parseable.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const unsafeSecureJsonParse = (text: string): unknown => {
  // Performance optimization, see https://github.com/fastify/secure-json-parse/pull/90
  const { stackTraceLimit } = Error
  Error.stackTraceLimit = 0
  try {
    return _parse(text)
  } finally {
    Error.stackTraceLimit = stackTraceLimit
  }
}
