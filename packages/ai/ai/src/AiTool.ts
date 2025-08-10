import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import { constFalse, constTrue, identity } from "effect/Function"
import * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type { Covariant } from "effect/Types"

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/ai/AiTool")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const ProviderDefinedTypeId: unique symbol = Symbol.for("@effect/ai/AiTool/ProviderDefined")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type ProviderDefinedTypeId = typeof ProviderDefinedTypeId

/**
 * A `AiTool` represents a user-defined action that a large language model can
 * take within your application. The results of a tool call can be returned back
 * to the large language model to be incorporated into its next response.
 *
 * @since 1.0.0
 * @category Models
 */
export interface AiTool<
  Name extends string,
  Config extends {
    readonly parameters: any
    readonly success: any
    readonly failure: any
  } = {
    readonly parameters: void
    readonly success: void
    readonly failure: never
  },
  Requirements = never
> extends AiTool.Variance<Requirements> {
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
  readonly parametersSchema: Schema.Schema<Config["parameters"]>

  /**
   * A `Schema` representing the value that a tool must return when called if
   * the tool call is successful.
   */
  readonly successSchema: Schema.Schema<Config["success"]>

  /**
   * A `Schema` representing the value that a tool must return when called if
   * it fails.
   */
  readonly failureSchema: Schema.Schema<Config["failure"]>

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
  addDependency<Identifier, Service>(tag: Context.Tag<Identifier, Service>): AiTool<
    Name,
    Config,
    Identifier | Requirements
  >

  /**
   * Add an annotation to the tool.
   */
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): AiTool<
    Name,
    Config,
    Requirements
  >

  /**
   * Add many annotations to the tool.
   */
  annotateContext<I>(context: Context.Context<I>): AiTool<
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
  Args,
  Config extends {
    readonly parameters: any
    readonly success: any
    readonly failure: any
  } = {
    readonly parameters: void
    readonly success: void
    readonly failure: never
  }
> extends AiTool<Name, Config>, AiTool.ProviderDefinedProto {
  /**
   * A `Schema` representing the arguments provided by the end-user which will
   * be used to configure the behavior of the provider-defined tool.
   */
  readonly args: Args
}

/**
 * @since 1.0.0
 */
export declare namespace AiTool {
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

/**
 * @since 1.0.0
 * @category Guards
 */
export const isUserDefined = (u: unknown): u is AiTool<any, any, any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category Guards
 */
export const isProviderDefined = (u: unknown): u is ProviderDefined<any, any, any> =>
  Predicate.hasProperty(u, ProviderDefinedTypeId)

/**
 * A type which represents any `AiTool`.
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
  readonly parametersSchema: Schema.Schema.Any
  readonly successSchema: Schema.Schema.Any
  readonly failureSchema: Schema.Schema.All
  readonly annotations: Context.Context<never>
}

/**
 * A type which represents any provider-defined `AiTool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export interface AnyProviderDefined extends Any {
  readonly args: any
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
 * A utility type to convert a `Schema.TaggedRequest` into an `AiTool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export interface FromTaggedRequest<S extends AnyTaggedRequestSchema> extends
  AiTool<
    S["_tag"],
    {
      readonly parameters: Schema.Schema.Type<S>
      readonly success: Schema.Schema.Type<S["success"]>
      readonly failure: Schema.Schema.Type<S["failure"]>
    },
    Schema.Schema.Context<S>
  > { }

/**
 * A utility type to extract the `Name` type from an `AiTool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Name<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? _Name :
  never

/**
 * A utility type to extract the type of the parameters which an `AiTool` must
 * be called with.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Parameters<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? _Config["parameters"] :
  never

/**
 * A utility type to extract the value that a tool must return when called if
 * the tool call is successful.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Success<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? _Config["success"] :
  never

/**
 * A utility type to extract the value that a tool must return when called if
 * the tool call fails.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Failure<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? _Config["failure"] :
  never

/**
 * A utility type to extract the requirements of an `AiTool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Requirements<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Config,
  infer _Requirements
> ? _Requirements :
  never

/**
 * Represents an `AiTool` that has been implemented within the application.
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
 * Represents the result of calling the handler for a particular `AiTool`.
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

const Proto = {
  [TypeId]: { _Requirements: identity },
  pipe() {
    return pipeArguments(this, arguments)
  },
  addRequirement(this: Any) {
    return userDefinedProto({ ...this })
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
  Parameters extends Schema.Schema.Any,
  Success extends Schema.Schema.Any,
  Failure extends Schema.Schema.All
>(options: {
  readonly name: Name
  readonly description?: string | undefined
  readonly parametersSchema: Parameters
  readonly successSchema: Success
  readonly failureSchema: Failure
  readonly annotations: Context.Context<never>
}): AiTool<
  Name,
  {
    readonly parameters: Schema.Schema.Type<Parameters>
    readonly success: Schema.Schema.Type<Success>
    readonly failure: Schema.Schema.Type<Failure>
  }
> => {
  const self = Object.assign(Object.create(Proto), options)
  self.key = `@effect/ai/AiTool/${options.name}`
  return self
}

const providerDefinedProto = <
  const Name extends string,
  Args,
  Parameters extends Schema.Schema.Any,
  Success extends Schema.Schema.Any,
  Failure extends Schema.Schema.All
>(options: {
  readonly id: string
  readonly name: Name
  readonly args: Args
  readonly parametersSchema: Parameters
  readonly successSchema: Success
  readonly failureSchema: Failure
}): ProviderDefined<
  Name,
  Args,
  {
    readonly parameters: Schema.Schema.Type<Parameters>
    readonly success: Schema.Schema.Type<Success>
    readonly failure: Schema.Schema.Type<Failure>
  }
> => {
  const self = Object.assign(Object.create(ProviderDefinedProto), options)
  self.key = options.id
  return self
}

const constEmptyStruct = Schema.Struct({})

/**
 * Constructs an `AiTool` from a name and, optionally, a specification for the
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
}): AiTool<
  Name,
  {
    readonly parameters: Schema.Schema.Type<Schema.Struct<Parameters>>
    readonly success: Schema.Schema.Type<Success>
    readonly failure: Schema.Schema.Type<Failure>
  },
  | Context.Tag.Identifier<Dependencies[number]>
  | Schema.Struct.Context<Parameters>
  | Schema.Schema.Context<Success>
  | Schema.Schema.Context<Failure>
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
    Schema.Struct.Encoded<Args>,
    {
      readonly parameters: Schema.Schema.Type<Schema.Struct<Parameters>>
      readonly success: Schema.Schema.Type<Success>
      readonly failure: Schema.Schema.Type<Failure>
    }
  > => {
    const successSchema = options?.success ?? Schema.Void
    const failureSchema = options?.failure ?? Schema.Never
    return providerDefinedProto({
      id: options.id,
      name: options.name,
      args,
      parametersSchema: options?.parameters
        ? Schema.Struct(options?.parameters as any)
        : constEmptyStruct,
      successSchema,
      failureSchema
    }) as any
  }

/**
 * Constructs a new `AiTool` from a `Schema.TaggedRequest`.
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

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Title extends Context.Tag("@effect/ai/AiTool/Title")<Title, string>() { }

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Readonly extends Context.Reference<Readonly>()("@effect/ai/AiTool/Readonly", {
  defaultValue: constFalse
}) { }

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Destructive extends Context.Reference<Destructive>()("@effect/ai/AiTool/Destructive", {
  defaultValue: constTrue
}) { }

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Idempotent extends Context.Reference<Idempotent>()("@effect/ai/AiTool/Idempotent", {
  defaultValue: constFalse
}) { }

/**
 * @since 1.0.0
 * @category Annotations
 */
export class OpenWorld extends Context.Reference<OpenWorld>()("@effect/ai/AiTool/OpenWorld", {
  defaultValue: constTrue
}) { }
