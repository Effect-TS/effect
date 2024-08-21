/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import { dual } from "effect/Function"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as ApiGroup from "./ApiGroup.js"
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
export interface Api<Name extends string, out Groups extends ApiGroup.ApiGroup.Any = never> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly name: Name
  readonly groups: Chunk.Chunk<Groups>
  // TODO: error schema
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
  export type Any = Api<any, any> | Api<any, never>
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Name extends string, Groups extends ApiGroup.ApiGroup.Any>(options: {
  readonly name: Name
  readonly groups: Chunk.Chunk<Groups>
}): Api<Name, Groups> => {
  const self = Object.create(Proto)
  self.name = options.name
  self.groups = options.groups
  return self
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Name extends string>(name: Name): Api<Name> => makeProto({ name, groups: Chunk.empty() })

/**
 * @since 1.0.0
 * @category constructors
 */
export const addGroup: {
  <Group extends ApiGroup.ApiGroup.Any>(
    group: Group
  ): <Name extends string, Groups extends ApiGroup.ApiGroup.Any>(self: Api<Name, Groups>) => Api<Name, Groups | Group>
  <Group extends ApiGroup.ApiGroup.Any>(
    path: HttpRouter.PathInput,
    group: Group
  ): <Name extends string, Groups extends ApiGroup.ApiGroup.Any>(self: Api<Name, Groups>) => Api<Name, Groups | Group>
  <Name extends string, Groups extends ApiGroup.ApiGroup.Any, Group extends ApiGroup.ApiGroup.Any>(
    self: Api<Name, Groups>,
    group: Group
  ): Api<Name, Groups | Group>
  <Name extends string, Groups extends ApiGroup.ApiGroup.Any, Group extends ApiGroup.ApiGroup.Any>(
    self: Api<Name, Groups>,
    path: HttpRouter.PathInput,
    group: Group
  ): Api<Name, Groups | Group>
} = dual(
  (args) => isApi(args[0]),
  (
    self: Api.Any,
    ...args: [group: ApiGroup.ApiGroup.Any] | [path: HttpRouter.PathInput, group: ApiGroup.ApiGroup.Any]
  ) => {
    const group = args.length === 1 ? args[0] : ApiGroup.prefix(args[1] as any, args[0])
    return makeProto({
      ...self,
      groups: Chunk.append(self.groups, group)
    })
  }
)
