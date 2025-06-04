/**
 * @since 1.0.0
 */
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import type { NonEmptyReadonlyArray } from "effect/Array"
import type * as Schema from "effect/Schema"
import type * as Workflow from "./Workflow.js"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const toRpcGroup = <
  const Workflows extends NonEmptyReadonlyArray<Workflow.Any>,
  const Prefix extends string = ""
>(
  workflows: Workflows,
  options?: {
    readonly prefix?: Prefix | undefined
  }
): RpcGroup.RpcGroup<ConvertRpcs<Workflows[number], Prefix>> => {
  const prefix = options?.prefix ?? ""
  const rpcs: Array<Rpc.Any> = []
  for (const workflow of workflows) {
    rpcs.push(
      Rpc.make(`${prefix}${workflow.name}`, {
        payload: workflow.payloadSchema,
        error: workflow.errorSchema,
        success: workflow.successSchema
      }).annotateContext(workflow.annotations),
      Rpc.make(`${prefix}${workflow.name}Discard`, {
        payload: workflow.payloadSchema,
        error: workflow.errorSchema
      }).annotateContext(workflow.annotations)
    )
  }
  return RpcGroup.make(...rpcs) as any
}

/**
 * @since 1.0.0
 */
export type ConvertRpcs<Workflows extends Workflow.Any, Prefix extends string> = Workflows extends Workflow.Workflow<
  infer _Name,
  infer _Payload,
  infer _Success,
  infer _Error
> ?
    | Rpc.Rpc<
      `${Prefix}${_Name}`,
      _Payload,
      _Success,
      _Error
    >
    | Rpc.Rpc<
      `${Prefix}${_Name}Discard`,
      _Payload,
      typeof Schema.Void
    >
  : never

/**
 * @since 1.0.0
 * @category Constructors
 */
export const toHttpApiGroup = <const Name extends string, const Workflows extends NonEmptyReadonlyArray<Workflow.Any>>(
  name: Name,
  workflows: Workflows
): HttpApiGroup.HttpApiGroup<Name, ConvertHttpApi<Workflows[number]>> => {
  let group = HttpApiGroup.make(name)
  for (const workflow of workflows) {
    group = group.add(
      HttpApiEndpoint.post(workflow.name, `/${workflow.name}`)
        .setPayload(workflow.payloadSchema)
        .addSuccess(workflow.successSchema)
        .addError(workflow.errorSchema as any)
        .annotateContext(workflow.annotations)
    ).add(
      HttpApiEndpoint.post(workflow.name + "Discard", `/${workflow.name}/discard`)
        .setPayload(workflow.payloadSchema)
        .addError(workflow.errorSchema as any)
        .annotateContext(workflow.annotations)
    ) as any
  }
  return group as any
}

/**
 * @since 1.0.0
 */
export type ConvertHttpApi<Workflows extends Workflow.Any> = Workflows extends Workflow.Workflow<
  infer _Name,
  infer _Payload,
  infer _Success,
  infer _Error
> ?
    | HttpApiEndpoint.HttpApiEndpoint<
      _Name,
      "POST",
      never,
      never,
      _Payload["Type"],
      never,
      _Success["Type"],
      _Error["Type"],
      _Payload["Context"] | _Success["Context"],
      _Error["Context"]
    >
    | HttpApiEndpoint.HttpApiEndpoint<
      `${_Name}Discard`,
      "POST",
      never,
      never,
      _Payload["Type"],
      never,
      void,
      _Error["Type"],
      _Payload["Context"]
    > :
  never
