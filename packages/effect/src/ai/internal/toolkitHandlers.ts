/** @internal */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import type * as Tool from "../Tool.ts"

/** @internal */
export const make = <
  Tools extends Record<string, Tool.Any>,
  Handlers extends Record<string, (params: any, ...args: any) => any>,
  EX = never,
  RX = never,
  R = never
>(
  tools: Tools,
  build: Handlers | Effect.Effect<Handlers, EX, RX>
) =>
  Effect.gen(function*() {
    const services = yield* Effect.context<R>()
    const handlers = Effect.isEffect(build) ? yield* build : build
    const context = new Map<string, unknown>()

    for (const [name, handler] of Object.entries(handlers)) {
      const tool = Object.hasOwn(tools, name) ? tools[name] : undefined

      if (tool !== undefined) context.set(tool.id, { name, handler, context: services })
    }

    return Context.makeUnsafe<Tool.HandlersFor<Tools>>(context)
  })
