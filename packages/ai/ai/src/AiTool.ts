/**
 * @since 1.0.0
 */
import * as Context_ from "effect/Context"
import type * as Effect from "effect/Effect"
import { constFalse, constTrue } from "effect/Function"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type * as Types from "effect/Types"
import type { AiError } from "./AiError.js"

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
 * A `AiTool` represents an action that a large language model can take within
 * your application. The results of a tool call can be returned back to the
 * large language model to be incorporated into its next response.
 *
 * @since 1.0.0
 * @category Models
 */
export interface AiTool<
  out Name extends string,
  out Parameters extends AnyStructSchema = Schema.Struct<{}>,
  out Success extends Schema.Schema.Any = typeof Schema.Void,
  out Failure extends Schema.Schema.All = typeof Schema.Never,
  out Requirements = never
> extends Pipeable {
  readonly [TypeId]: {
    readonly _Requirements: Types.Covariant<Requirements>
  }

  /**
   * The name of the tool.
   */
  readonly name: Name

  /**
   * The optional description of the tool.
   */
  readonly description?: string | undefined

  /**
   * A key for the tool, used to identify the tool within a `Context`.
   */
  readonly key: string

  /**
   * A `Schema` representing the type of the parameters that a tool handler
   * must be called with.
   */
  readonly parametersSchema: Parameters

  /**
   * A `Schema` representing the type that a tool returns from its handler
   * if successful.
   */
  readonly successSchema: Success

  /**
   * A `Schema` representing the type that a tool returns from its handler
   * if it fails.
   */
  readonly failureSchema: Failure

  readonly annotations: Context_.Context<never>

  /**
   * Adds a requirement on a particular service for the tool call to be able to
   * be executed.
   */
  addRequirement<Requirement>(): AiTool<Name, Parameters, Success, Failure, Requirements | Requirement>

  /**
   * Set the schema to use for tool handler success.
   */
  setSuccess<SuccessSchema extends Schema.Schema.Any>(schema: SuccessSchema): AiTool<
    Name,
    Parameters,
    SuccessSchema,
    Failure,
    Requirements
  >

  /**
   * Set the schema to use for tool handler failure.
   */
  setFailure<FailureSchema extends Schema.Schema.Any>(schema: FailureSchema): AiTool<
    Name,
    Parameters,
    Success,
    FailureSchema,
    Requirements
  >

  /**
   * Set the schema for the tool parameters.
   */
  setParameters<ParametersSchema extends Schema.Struct<any> | Schema.Struct.Fields>(
    schema: ParametersSchema
  ): AiTool<
    Name,
    ParametersSchema extends Schema.Struct<infer _> ? ParametersSchema
      : ParametersSchema extends Schema.Struct.Fields ? Schema.Struct<ParametersSchema>
      : never,
    Success,
    Failure,
    Requirements
  >

  /**
   * Add an annotation to the tool.
   */
  annotate<I, S>(tag: Context_.Tag<I, S>, value: S): AiTool<
    Name,
    Parameters,
    Success,
    Failure,
    Requirements
  >

  /**
   * Add many annotations to the tool.
   */
  annotateContext<I>(context: Context_.Context<I>): AiTool<
    Name,
    Parameters,
    Success,
    Failure,
    Requirements
  >
}

/**
 * @since 1.0.0
 * @category Guards
 */
export const isAiTool = (u: unknown): u is AiTool<any, any, any, any, any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category Models
 */
export interface Any extends Pipeable {
  readonly [TypeId]: {
    readonly _Requirements: Types.Covariant<any>
  }
  readonly name: string
  readonly description?: string | undefined
  readonly key: string
  readonly parametersSchema: AnyStructSchema
  readonly annotations: Context_.Context<never>
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface AnyWithProtocol extends Any {
  readonly successSchema: Schema.Schema.Any
  readonly failureSchema: Schema.Schema.All
}

/**
 * Represents an `AiTool` that has been implemented within the application.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Handler<Name extends string> {
  readonly _: unique symbol
  readonly name: Name
  readonly handler: (params: any) => Effect.Effect<any, any>
  readonly context: Context_.Context<never>
}

/**
 * A utility type which returns the type of the `Effect` that will be used to
 * resolve a tool call.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type HandlerEffect<Tool extends Any> = [Tool] extends [
  AiTool<
    infer _Name,
    infer _Parameters,
    infer _Success,
    infer _Failure,
    infer _Requirements
  >
] ? Effect.Effect<
    _Success["Type"],
    AiError | _Failure["Type"],
    _Parameters["Context"] | _Success["Context"] | _Failure["Context"] | _Requirements
  >
  : never

/**
 * Represents the result of calling the handler for a particular tool.
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
   * The encoded result of executing the handler for a particular tool, which
   * is suitable for returning back to the large language model for
   * incorporation into further responses.
   */
  readonly encodedResult: unknown
}

/**
 * A utility mapped type which associates tool names with tools.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ByName<Tools extends Any> = {
  readonly [Tool in Tools as Tool["name"]]: Tool
}

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
> ? _Parameters["Type"] :
  never

/**
 * A utility type to extract the schema type of the parameters which an `AiTool`
 * must be called with.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ParametersSchema<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Parameters,
  infer _Success,
  infer _Failure,
  infer _Requirements
> ? _Parameters :
  never

/**
 * A utility type to extract the type of the response that an `AiTool` returns
 * from its handler if successful.
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
> ? _Success["Type"] :
  never

/**
 * A utility type to extract the schema type of the response that an `AiTool`
 * returns from its handler if successful.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type SuccessSchema<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Parameters,
  infer _Success,
  infer _Failure,
  infer _Requirements
> ? _Success :
  never

/**
 * A utility type to extract the type of the response that an `AiTool` returns
 * from its handler if it fails.
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
> ? _Failure["Type"] :
  never

/**
 * A utility type to extract the schema type of the response that an `AiTool`
 * returns from its handler if it fails.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type FailureSchema<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Parameters,
  infer _Success,
  infer _Failure,
  infer _Requirements
> ? _Failure :
  never

/**
 * A utility type to the `Context` type from an `AiTool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type Context<Tool> = Tool extends AiTool<
  infer _Name,
  infer _Parameters,
  infer _Success,
  infer _Failure,
  infer _Requirements
> ? _Parameters["Context"] | _Success["Context"] | _Failure["Context"] | _Requirements :
  never

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
export interface FromTaggedRequest<S extends AnyTaggedRequestSchema>
  extends AiTool<S["_tag"], S, S["success"], S["failure"]>
{}

/**
 * A utility type which returns the handler type for an `AiTool`.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ToHandler<Tool extends Any> = Tool extends AiTool<
  infer _Name,
  infer _Parameters,
  infer _Success,
  infer _Failure,
  infer _Requirements
> ? Handler<_Name> :
  never

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  addRequirement(this: AnyWithProtocol) {
    return makeProto({ ...this })
  },
  setSuccess(this: AnyWithProtocol, successSchema: Schema.Schema.Any) {
    return makeProto({
      ...this,
      successSchema
    })
  },
  setFailure(this: AnyWithProtocol, failureSchema: Schema.Schema.All) {
    return makeProto({
      ...this,
      failureSchema
    })
  },
  setParameters(this: AnyWithProtocol, parametersSchema: Schema.Struct<any> | Schema.Struct.Fields) {
    return makeProto({
      ...this,
      parametersSchema: Schema.isSchema(parametersSchema)
        ? parametersSchema as any
        : Schema.Struct(parametersSchema as any)
    })
  },
  annotate<I, S>(this: AnyWithProtocol, tag: Context_.Tag<I, S>, value: S) {
    return makeProto({
      ...this,
      annotations: Context_.add(this.annotations, tag, value)
    })
  },
  annotateContext<I>(this: AnyWithProtocol, context: Context_.Context<I>) {
    return makeProto({
      ...this,
      annotations: Context_.merge(this.annotations, context)
    })
  }
}

const makeProto = <
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
  readonly annotations: Context_.Context<never>
}): AiTool<Name, Parameters, Success> => {
  const self = Object.assign(Object.create(Proto), options)
  self.key = `@effect/ai/AiTool/${options.name}`
  return self
}

const constEmptyStruct = Schema.Struct({})

/**
 * Constructs an `AiTool` from a name and, optionally, a specification for the
 * tool call's protocol.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  const Name extends string,
  Parameters extends Schema.Struct.Fields = {},
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Failure extends Schema.Schema.All = typeof Schema.Never
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
}): AiTool<Name, Schema.Struct<Parameters>, Success, Failure> => {
  const successSchema = options?.success ?? Schema.Void
  const failureSchema = options?.failure ?? Schema.Never
  return makeProto({
    name,
    description: options?.description,
    parametersSchema: options?.parameters
      ? Schema.Struct(options?.parameters as any)
      : constEmptyStruct,
    successSchema,
    failureSchema,
    annotations: Context_.empty()
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
  makeProto({
    name: schema._tag,
    description: Option.getOrUndefined(AST.getDescriptionAnnotation((schema.ast as any).to)),
    parametersSchema: schema as any,
    successSchema: schema.success as any,
    failureSchema: schema.failure as any,
    annotations: Context_.empty()
  })

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Title extends Context_.Tag("@effect/ai/AiTool/Title")<Title, string>() {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Readonly extends Context_.Reference<Readonly>()("@effect/ai/AiTool/Readonly", {
  defaultValue: constFalse
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Destructive extends Context_.Reference<Destructive>()("@effect/ai/AiTool/Destructive", {
  defaultValue: constTrue
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Idempotent extends Context_.Reference<Idempotent>()("@effect/ai/AiTool/Idempotent", {
  defaultValue: constFalse
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class OpenWorld extends Context_.Reference<OpenWorld>()("@effect/ai/AiTool/OpenWorld", {
  defaultValue: constTrue
}) {}
