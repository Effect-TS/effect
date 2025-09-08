import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { constFalse, constTrue, identity } from "effect/Function"
import * as JsonSchema from "effect/JsonSchema"
import * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type { Covariant } from "effect/Types"
import { AiError } from "./AiError.js"

// =============================================================================
// Type Ids
// =============================================================================

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId = "~@effect/ai/Tool"

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const ProviderDefinedTypeId = "~@effect/ai/Tool/ProviderDefined"

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type ProviderDefinedTypeId = typeof ProviderDefinedTypeId

// =============================================================================
// Models
// =============================================================================

/**
 * A `Tool` represents a user-defined action that a large language model can
 * take within your application. The results of a tool call can be returned back
 * to the large language model to be incorporated into its next response.
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
  } = {
    readonly parameters: Schema.Struct<{}>
    readonly success: typeof Schema.Void
    readonly failure: typeof Schema.Never
  },
  Requirements = never
> extends Tool.Variance<Requirements> {
  /**
   * The tool identifier which is used to uniquely identify the tool. */
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
  addDependency<Identifier, Service>(tag: Context.Tag<Identifier, Service>): Tool<
    Name,
    Config,
    Identifier | Requirements
  >

  /**
   * Set the schema to use to validate the result of a tool call when successful.
   */
  setParameters<ParametersSchema extends Schema.Struct<any> | Schema.Struct.Fields>(
    schema: ParametersSchema
  ): Tool<Name, {
    readonly parameters: ParametersSchema extends Schema.Struct<infer _> ? ParametersSchema
      : ParametersSchema extends Schema.Struct.Fields ? Schema.Struct<ParametersSchema>
      : never
    readonly success: Config["success"]
    readonly failure: Config["failure"]
  }, Requirements>

  /**
   * Set the schema to use to validate the result of a tool call when successful.
   */
  setSuccess<SuccessSchema extends Schema.Schema.Any>(schema: SuccessSchema): Tool<Name, {
    readonly parameters: Config["parameters"]
    readonly success: SuccessSchema
    readonly failure: Config["failure"]
  }, Requirements>

  /**
   * Set the schema to use to validate the result of a tool call when it fails.
   */
  setFailure<FailureSchema extends Schema.Schema.Any>(schema: FailureSchema): Tool<Name, {
    readonly parameters: Config["parameters"]
    readonly success: Config["success"]
    readonly failure: FailureSchema
  }, Requirements>

  /**
   * Add an annotation to the tool.
   */
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): Tool<
    Name,
    Config,
    Requirements
  >

  /**
   * Add many annotations to the tool.
   */
  annotateContext<I>(context: Context.Context<I>): Tool<
    Name,
    Config,
    Requirements
  >
}

/**
 * A `ProviderDefined` tool represents an action that a large language model can
 * take that is built in to the corresponding provider. These tools are executed
 * by the model provider, and thus do not require a handler to be specified.
 *
 * For example, many providers of large language models provide built-in tools
 * for searching the web or executing code, without your application needing
 * to provide a corresponding handler for such functionality.
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
  } = {
    readonly args: Schema.Struct<{}>
    readonly parameters: Schema.Struct<{}>
    readonly success: typeof Schema.Void
    readonly failure: typeof Schema.Never
  }
> extends
  Tool<Name, {
    readonly parameters: Config["parameters"]
    success: Schema.Either<Config["success"], Config["failure"]>
    failure: typeof Schema.Never
  }>,
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
   * Decodes the result received after the provider-defined tool is called.
   */
  decodeResult(args: unknown): Effect.Effect<Config["success"]["Type"], AiError>
}

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
 * @since 1.0.0
 * @category Guards
 */
export const isUserDefined = (u: unknown): u is Tool<any, any, any> =>
  Predicate.hasProperty(u, TypeId) && !isProviderDefined(u)

/**
 * @since 1.0.0
 * @category Guards
 */
export const isProviderDefined = (u: unknown): u is ProviderDefined<any, any> =>
  Predicate.hasProperty(u, ProviderDefinedTypeId)

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
  readonly decodeResult: (result: unknown) => Effect.Effect<any, AiError>
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
> ? _Name :
  never

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
> ? Schema.Struct.Type<_Config["parameters"]["fields"]> :
  never

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
> ? Schema.Schema.Encoded<_Config["parameters"]> :
  never

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
> ? _Config["parameters"] :
  never

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
> ? Schema.Schema.Type<_Config["success"]> :
  never

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
> ? Schema.Schema.Encoded<_Config["success"]> :
  never

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
> ? _Config["success"] :
  never

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
> ? Schema.Schema.Type<_Config["failure"]> :
  never

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
> ? Schema.Schema.Encoded<_Config["failure"]> :
  never

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
> ? _Config["parameters"]["Context"] | _Config["success"]["Context"] | _Config["failure"]["Context"] | _Requirements :
  never

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
   * The result of executing the handler for a particular tool.
   */
  readonly result: Success<Tool>
  /**
   * The pre-encoded tool call result of executing the handler for a particular
   * tool as a JSON-serializable value. The encoded result can be incorporated
   * into subsequent requests to the large language model.
   */
  readonly encodedResult: unknown
}

/**
 * A utility type to create a union of `Handler` types for all tools in a
 * record.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type HandlersFor<Tools extends Record<string, Any>> = {
  [K in keyof Tools]: Handler<Tools[K]["name"]>
}[keyof Tools]

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
  setParameters(this: Any, parametersSchema: Schema.Struct<any> | Schema.Struct.Fields) {
    return userDefinedProto({
      ...this,
      parametersSchema: Schema.isSchema(parametersSchema)
        ? parametersSchema as any
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
  [ProviderDefinedTypeId]: ProviderDefinedTypeId,
  decodeResult(this: AnyProviderDefined, result: unknown) {
    return Schema.decodeUnknown(this.successSchema)(result).pipe(
      Effect.orElse(() => Schema.decodeUnknown(this.failureSchema as any)(result)),
      Effect.mapError((cause) =>
        new AiError({
          module: "Tool",
          method: "ProviderDefined.decodeResult",
          description: `Failed to decode the result of provider-defined tool '${this.name}'`,
          cause
        })
      )
    )
  }
}

const userDefinedProto = <
  const Name extends string,
  Parameters extends AnyStructSchema,
  Success extends Schema.Schema.Any,
  Failure extends Schema.Schema.All
>(options: {
  readonly name: Name
  readonly description?: string | undefined
  readonly parametersSchema: Parameters
  readonly successSchema: Success
  readonly failureSchema: Failure
  readonly annotations: Context.Context<never>
}): Tool<
  Name,
  {
    readonly parameters: Parameters
    readonly success: Success
    readonly failure: Failure
  }
> => {
  const self = Object.assign(Object.create(Proto), options)
  self.key = `@effect/ai/Tool/${options.name}`
  return self
}

const providerDefinedProto = <
  const Name extends string,
  Args extends AnyStructSchema,
  Parameters extends AnyStructSchema,
  Success extends Schema.Schema.Any,
  Failure extends Schema.Schema.All
>(options: {
  readonly id: string
  readonly name: Name
  readonly args: Args["Encoded"]
  readonly argsSchema: Args
  readonly parametersSchema: Parameters
  readonly successSchema: Success
  readonly failureSchema: Failure
}): ProviderDefined<
  Name,
  {
    readonly args: Args
    readonly parameters: Parameters
    readonly success: Success
    readonly failure: Failure
  }
> => {
  const self = Object.assign(Object.create(ProviderDefinedProto), options)
  self.key = options.id
  return self
}

const constEmptyStruct = Schema.Struct({})

/**
 * Constructs an `Tool` from a name and, optionally, a specification for the
 * tool call protocol.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  const Name extends string,
  Parameters extends Schema.Struct.Fields = {},
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Failure extends Schema.Schema.All = typeof Schema.Never,
  Dependencies extends Array<Context.Tag<any, any>> = []
>(name: Name, options?: {
  /**
   * An optional description of the tool.
   */
  readonly description?: string | undefined
  /**
   * A `Schema` representing the type of the parameters that a tool call
   * handler must be provided with.
   */
  readonly parameters?: Parameters
  /**
   * A `Schema` representing the type that a tool returns from its handler if
   * successful.
   */
  readonly success?: Success
  /**
   * A `Schema` representing the type that a tool returns from its handler if
   * it fails.
   */
  readonly failure?: Failure
  /**
   * A set of `Tag`s representing the services that the implementation of the
   * tool will require when called.
   */
  readonly dependencies?: Dependencies
}): Tool<
  Name,
  {
    readonly parameters: Schema.Struct<Parameters>
    readonly success: Success
    readonly failure: Failure
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
    annotations: Context.empty()
  }) as any
}

/**
 * Constructs an `ProviderDefined` tool from a specification for the tool
 * call protocol.
 *
 * @since 1.0.0
 * @category constructors
 */
export const providerDefined = <
  const Name extends string,
  Args extends Schema.Struct.Fields = {},
  Parameters extends Schema.Struct.Fields = {},
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Failure extends Schema.Schema.All = typeof Schema.Never
>(options: {
  /**
   * A unique identifier which can be used internally to discriminate between
   * different provider-defined tools.
   *
   * Should follow the format `<provider>.<unique-tool-name>`.
   */
  readonly id: `${string}.${string}`
  /**
   * The name of the provider-defined tool.
   */
  readonly name: Name
  /**
   * A `Schema` representing the arguments provided by the end-user used to
   * configure the behavior of the provider-defined tool.
   */
  readonly args: Args
  /**
   * A `Schema` representing the tool call parameters generated by the model
   * provider which tool call was invoked with.
   */
  readonly parameters?: Parameters
  /**
   * A `Schema` representing the result of a successful invocation of the
   * provider-defined tool.
   */
  readonly success?: Success
  /**
   * A `Schema` representing the result of a failed invocation of the
   * provider-defined tool.
   */
  readonly failure?: Failure
}) =>
(args: Schema.Simplify<Schema.Struct.Encoded<Args>>): ProviderDefined<
  Name,
  {
    readonly args: Schema.Struct<Args>
    readonly parameters: Schema.Struct<Parameters>
    readonly success: Success
    readonly failure: Failure
  }
> => {
  const successSchema = options?.success ?? Schema.Void
  const failureSchema = options?.failure ?? Schema.Never
  const resultSchema = Schema.EitherFromUnion({ right: successSchema, left: failureSchema })
  return providerDefinedProto({
    id: options.id,
    name: options.name,
    args,
    argsSchema: Schema.Struct(options.args as any),
    parametersSchema: options?.parameters
      ? Schema.Struct(options?.parameters as any)
      : constEmptyStruct,
    successSchema: resultSchema,
    failureSchema: Schema.Never
  }) as any
}

/**
 * Constructs a new `Tool` from a `Schema.TaggedRequest`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromTaggedRequest = <S extends AnyTaggedRequestSchema>(
  schema: S
): FromTaggedRequest<S> =>
  userDefinedProto({
    name: schema._tag,
    description: Option.getOrUndefined(AST.getDescriptionAnnotation((schema.ast as any).to)),
    parametersSchema: schema,
    successSchema: schema.success,
    failureSchema: schema.failure,
    annotations: Context.empty()
  }) as any

// =============================================================================
// Utilities
// =============================================================================

export const getDescription = <
  Name extends string,
  Config extends {
    readonly parameters: AnyStructSchema
    readonly success: Schema.Schema.Any
    readonly failure: Schema.Schema.All
  }
>(tool: Tool<Name, Config>): string | undefined => {
  if (Predicate.isNotUndefined(tool.description)) {
    return tool.description
  }
  return getDescriptionFromSchemaAst(tool.parametersSchema.ast)
}

export const getDescriptionFromSchemaAst = (ast: AST.AST): string | undefined => {
  const annotations = ast._tag === "Transformation" ?
    {
      ...ast.to.annotations,
      ...ast.annotations
    } :
    ast.annotations
  return AST.DescriptionAnnotationId in annotations
    ? annotations[AST.DescriptionAnnotationId] as string :
    undefined
}

export const getJsonSchema = <
  Name extends string,
  Config extends {
    readonly parameters: AnyStructSchema
    readonly success: Schema.Schema.Any
    readonly failure: Schema.Schema.All
  }
>(tool: Tool<Name, Config>): JsonSchema.JsonSchema7 => getJsonSchemaFromSchemaAst(tool.parametersSchema.ast)

export const getJsonSchemaFromSchemaAst = (ast: AST.AST): JsonSchema.JsonSchema7 => {
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
 * @since 1.0.0
 * @category Annotations
 */
export class Title extends Context.Tag("@effect/ai/Tool/Title")<Title, string>() {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Readonly extends Context.Reference<Readonly>()("@effect/ai/Tool/Readonly", {
  defaultValue: constFalse
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Destructive extends Context.Reference<Destructive>()("@effect/ai/Tool/Destructive", {
  defaultValue: constTrue
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Idempotent extends Context.Reference<Idempotent>()("@effect/ai/Tool/Idempotent", {
  defaultValue: constFalse
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class OpenWorld extends Context.Reference<OpenWorld>()("@effect/ai/Tool/OpenWorld", {
  defaultValue: constTrue
}) {}
