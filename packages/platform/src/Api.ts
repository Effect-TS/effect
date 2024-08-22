/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import { dual } from "effect/Function"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as ApiGroup from "./ApiGroup.js"
import * as ApiSchema from "./ApiSchema.js"
import type * as HttpRouter from "./HttpRouter.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/Api")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isApi = (u: unknown): u is Api<any, any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface Api<
  out Groups extends ApiGroup.ApiGroup.Any = never,
  in out Error = never,
  out ErrorR = never
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly groups: Chunk.Chunk<Groups>
  readonly errorSchema: Schema.Schema<Error, unknown, ErrorR>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Api {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = Api<any, any, any> | Api<any, any, never> | Api<any, never, never>
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(options: {
  readonly groups: Chunk.Chunk<Groups>
  readonly errorSchema: Schema.Schema<Error, unknown, ErrorR>
}): Api<Groups, Error, ErrorR> => Object.assign(Object.create(Proto), options)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (_annotations?: {} | undefined): Api =>
  makeProto({ groups: Chunk.empty(), errorSchema: Schema.Never as any })

/**
 * @since 1.0.0
 * @category constructors
 */
export const addGroup: {
  <Group extends ApiGroup.ApiGroup.Any>(
    group: Group
  ): <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(
    self: Api<Groups, Error, ErrorR>
  ) => Api<Groups | Group, Error, ErrorR>
  <Group extends ApiGroup.ApiGroup.Any>(
    path: HttpRouter.PathInput,
    group: Group
  ): <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(
    self: Api<Groups, Error, ErrorR>
  ) => Api<Groups | Group, Error, ErrorR>
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, Group extends ApiGroup.ApiGroup.Any>(
    self: Api<Groups, Error, ErrorR>,
    group: Group
  ): Api<Groups | Group, Error, ErrorR>
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, Group extends ApiGroup.ApiGroup.Any>(
    self: Api<Groups, Error, ErrorR>,
    path: HttpRouter.PathInput,
    group: Group
  ): Api<Groups | Group, Error, ErrorR>
} = dual(
  (args) => isApi(args[0]),
  (
    self: Api.Any,
    ...args: [group: ApiGroup.ApiGroup.Any] | [path: HttpRouter.PathInput, group: ApiGroup.ApiGroup.Any]
  ): Api.Any => {
    const group = args.length === 1 ? args[0] : ApiGroup.prefix(args[1] as any, args[0])
    return makeProto({
      ...self as any,
      groups: Chunk.append(self.groups, group)
    })
  }
)
/**
 * @since 1.0.0
 * @category errors
 */
export const addError: {
  <A, I, R>(
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(
    self: Api<Groups, Error, ErrorR>
  ) => Api<Groups, Error | A, ErrorR | R>
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, A, I, R>(
    self: Api<Groups, Error, ErrorR>,
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): Api<Groups, Error | A, ErrorR | R>
} = dual(
  (args) => isApi(args[0]),
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, A, I, R>(
    self: Api<Groups, Error, ErrorR>,
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): Api<Groups, Error | A, ErrorR | R> =>
    makeProto({
      ...self,
      errorSchema: Schema.Union(
        self.errorSchema,
        schema.annotations(ApiSchema.annotations({
          status: annotations?.status ?? ApiSchema.getStatusError(schema)
        }))
      )
    })
)
