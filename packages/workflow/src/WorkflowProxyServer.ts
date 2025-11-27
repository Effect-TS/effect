/**
 * @since 1.0.0
 */
import type * as HttpApi from "@effect/platform/HttpApi"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import type { ApiGroup, HttpApiGroup } from "@effect/platform/HttpApiGroup"
import type * as Rpc from "@effect/rpc/Rpc"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Workflow from "./Workflow.js"
import type { WorkflowEngine } from "./WorkflowEngine.js"

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpApi = <
  ApiId extends string,
  Groups extends HttpApiGroup.Any,
  ApiE,
  ApiR,
  Name extends HttpApiGroup.Name<Groups>,
  const Workflows extends NonEmptyReadonlyArray<Workflow.Any>
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiE, ApiR>,
  name: Name,
  workflows: Workflows
): Layer.Layer<
  ApiGroup<ApiId, Name>,
  never,
  WorkflowEngine | Workflow.Requirements<Workflows[number]>
> =>
  HttpApiBuilder.group(
    api,
    name,
    Effect.fnUntraced(function*(handlers_) {
      let handlers = handlers_ as any
      for (const workflow_ of workflows) {
        const workflow = workflow_ as Workflow.Workflow<string, any, any, any>
        handlers = handlers
          .handle(
            workflow.name as any,
            ({ payload }: { payload: any }) =>
              workflow.execute(payload).pipe(
                Effect.tapDefect(Effect.logError),
                Effect.annotateLogs({
                  module: "WorkflowProxyServer",
                  method: workflow.name
                })
              )
          )
          .handle(
            workflow.name + "Discard" as any,
            ({ payload }: { payload: any }) =>
              workflow.execute(payload, { discard: true } as any).pipe(
                Effect.tapDefect(Effect.logError),
                Effect.annotateLogs({
                  module: "WorkflowProxyServer",
                  method: workflow.name + "Discard"
                })
              )
          )
          .handle(
            workflow.name + "Resume" as any,
            ({ payload }: { payload: any }) =>
              workflow.resume(payload.executionId).pipe(
                Effect.tapDefect(Effect.logError),
                Effect.annotateLogs({
                  module: "WorkflowProxyServer",
                  method: workflow.name + "Resume"
                })
              )
          )
      }
      return handlers as HttpApiBuilder.Handlers<never, never, never>
    })
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerRpcHandlers = <
  const Workflows extends NonEmptyReadonlyArray<Workflow.Any>,
  const Prefix extends string = ""
>(workflows: Workflows, options?: {
  readonly prefix?: Prefix
}): Layer.Layer<
  RpcHandlers<Workflows[number], Prefix>,
  never,
  WorkflowEngine | Workflow.Requirements<Workflows[number]>
> =>
  Layer.effectContext(Effect.gen(function*() {
    const context = yield* Effect.context<never>()
    const prefix = options?.prefix ?? ""
    const handlers = new Map<string, Rpc.Handler<string>>()
    for (const workflow_ of workflows) {
      const workflow = workflow_ as Workflow.Workflow<string, any, any, any>
      const tag = `${prefix}${workflow.name}`
      const tagDiscard = `${tag}Discard`
      const tagResume = `${tag}Resume`
      const key = `@effect/rpc/Rpc/${tag}`
      const keyDiscard = `${key}Discard`
      const keyResume = `${key}Resume`
      handlers.set(key, {
        context,
        tag,
        handler: (payload: any) => workflow.execute(payload) as any
      } as any)
      handlers.set(keyDiscard, {
        context,
        tag: tagDiscard,
        handler: (payload: any) => workflow.execute(payload, { discard: true } as any) as any
      } as any)
      handlers.set(keyResume, {
        context,
        tag: tagResume,
        handler: (payload: any) => workflow.resume(payload.executionId) as any
      } as any)
    }
    return Context.unsafeMake(handlers)
  }))

/**
 * @since 1.0.0
 */
export type RpcHandlers<Workflows extends Workflow.Any, Prefix extends string> = Workflows extends Workflow.Workflow<
  infer _Name,
  infer _Payload,
  infer _Success,
  infer _Error
> ? Rpc.Handler<`${Prefix}${_Name}`> | Rpc.Handler<`${Prefix}${_Name}Discard`> | Rpc.Handler<`${Prefix}${_Name}Resume`>
  : never
