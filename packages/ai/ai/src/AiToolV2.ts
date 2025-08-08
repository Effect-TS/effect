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

// HELP(Tim): Maybe represent these type params as an object like you suggested?
/**
 * A `AiTool` represents a user-defined action that a large language model can
 * take within your application. The results of a tool call can be returned back
 * to the large language model to be incorporated into its next response.
 *
 * @since 1.0.0
 * @category Models
 */
export interface AiTool<
  out Name extends string,
  in out Parameters,
  in out Success = void,
  in out Failure = never,
  out Requirements = never
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
  readonly parametersSchema: Schema.Schema<Parameters>

  /**
   * A `Schema` representing the value that a tool must return when called if
   * the tool call is successful.
   */
  readonly successSchema: Schema.Schema<Success>

  /**
   * A `Schema` representing the value that a tool must return when called if
   * it fails.
   */
  readonly failureSchema: Schema.Schema<Failure>

  /**
   * A `Context` object containing tool annotations which can store metadata
   * about the tool.
   */
  readonly annotations: Context.Context<never>

  /**
   * Adds a requirement on a particular service for the tool call to be able to
   * be executed.
   */
  addRequirement<Identifier, Service>(tag: Context.Tag<Identifier, Service>): AiTool<
    Name,
    Parameters,
    Success,
    Failure,
    Identifier | Requirements
  >

  /**
   * Add an annotation to the tool.
   */
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): AiTool<
    Name,
    Parameters,
    Success,
    Failure,
    Requirements
  >

  /**
   * Add many annotations to the tool.
   */
  annotateContext<I>(context: Context.Context<I>): AiTool<
    Name,
    Parameters,
    Success,
    Failure,
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
  out Name extends string,
  in out Args,
  in out Parameters,
  in out Success = void,
  in out Failure = never
> extends AiTool<Name, Parameters, Success, Failure>, AiTool.ProviderDefinedProto {
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
export const isUserDefined = (u: unknown): u is AiTool<any, any, any, any, any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category Guards
 */
export const isProviderDefined = (u: unknown): u is ProviderDefined<any, any, any, any, any> =>
  Predicate.hasProperty(u, ProviderDefinedTypeId)

/**
 * A type which represents any `AiTool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
/**
 * @since 1.0.0
 * @category Models
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
    Schema.Schema.Type<S>,
    Schema.Schema.Type<S["success"]>,
    Schema.Schema.Type<S["failure"]>,
    Schema.Schema.Context<S>
  >
{}

/**
 * A utility type to extract the `Name` type from an `AiTool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Name<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Parameters,
  infer _Success,
  infer _Failure,
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
  infer _Parameters,
  infer _Success,
  infer _Failure,
  infer _Requirements
> ? _Parameters :
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
  infer _Parameters,
  infer _Success,
  infer _Failure,
  infer _Requirements
> ? _Success :
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
  infer _Parameters,
  infer _Success,
  infer _Failure,
  infer _Requirements
> ? _Failure :
  never

/**
 * A utility type to extract the requirements from an `AiTool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Requirements<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Parameters,
  infer _Success,
  infer _Failure,
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
}): AiTool<Name, Schema.Schema.Type<Parameters>, Schema.Schema.Type<Success>> => {
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
}): AiTool<Name, Schema.Schema.Type<Parameters>, Schema.Schema.Type<Success>> => {
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
  Schema.Schema.Type<Schema.Struct<Parameters>>,
  Schema.Schema.Type<Success>,
  Schema.Schema.Type<Failure>,
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
  Schema.Schema.Type<Schema.Struct<Parameters>>,
  Schema.Schema.Type<Success>,
  Schema.Schema.Type<Failure>
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
export class Title extends Context.Tag("@effect/ai/AiTool/Title")<Title, string>() {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Readonly extends Context.Reference<Readonly>()("@effect/ai/AiTool/Readonly", {
  defaultValue: constFalse
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Destructive extends Context.Reference<Destructive>()("@effect/ai/AiTool/Destructive", {
  defaultValue: constTrue
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Idempotent extends Context.Reference<Idempotent>()("@effect/ai/AiTool/Idempotent", {
  defaultValue: constFalse
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class OpenWorld extends Context.Reference<OpenWorld>()("@effect/ai/AiTool/OpenWorld", {
  defaultValue: constTrue
}) {}

// Testing Code

class ServiceA extends Context.Tag("ServiceA")<ServiceA, {}>() {}
class ServiceB extends Context.Tag("ServiceB")<ServiceB, {}>() {}

const foo = make("GetDadJoke", {
  description: "Get a hilarious dad joke from the ICanHazDadJoke API",
  success: Schema.NumberFromString,
  failure: Schema.Never,
  parameters: {
    searchTerm: Schema.String.annotations({
      description: "The search term to use to find dad jokes"
    })
  },
  dependencies: [ServiceA, ServiceB]
})

const bar = make("OtherDadJoke", {
  description: "Get a hilarious dad joke from the ICanHazDadJoke API",
  success: Schema.NumberFromString,
  failure: Schema.Boolean,
  parameters: {
    searchTerm: Schema.String.annotations({
      description: "The search term to use to find dad jokes"
    })
  },
  dependencies: [ServiceA, ServiceB]
})

export interface AiToolkit<Tools extends ReadonlyArray<Any>> {
  readonly tools: { readonly [Tool in Tools[number] as Tool["name"]]: Tool }
}

// HELP(Tim): I have no idea what this type should be tbh
export type AnyToolkit = AiToolkit<>

export type ToolkitTools<Toolkit> = [Toolkit] extends [AiToolkit<infer Tools>] ? Tools : never

const makeToolkit = <Tools extends ReadonlyArray<Any>>(
  ...tools: Tools
): AiToolkit<Tools> => ({}) as any

export const merge = <const Toolkits extends ReadonlyArray<AnyToolkit>>(
  ...toolkits: Toolkits
): AiToolkit<Toolkits[number]> => ({}) as any

const toolkitA = makeToolkit(foo)
const toolkitB = makeToolkit(bar)

type A = ToolkitTools<typeof toolkitA>
type B = ToolkitTools<typeof toolkitB>

const merged = merge(toolkitA, toolkitB)

declare const anyToolkit1: AiToolkit<any>
declare const anyToolkit2: AiToolkit<any>

const merged2 = merge(anyToolkit1, anyToolkit2)
