import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as HttpApi from "effect/http-api/HttpApi"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"
import * as HttpApiGroup from "effect/http-api/HttpApiGroup"
import * as HttpApiSchema from "effect/http-api/HttpApiSchema"
import * as OpenApi from "effect/http-api/OpenApi"
import * as HttpEffect from "effect/http/HttpEffect"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import { entityInput, makeCore, makeEntity } from "./domain.ts"

// Groups of six endpoints each.
const sizes: Record<string, number> = { small: 1, medium: 8, large: 40 }

const makeApi = (groups: number) => {
  const core = makeCore()
  class NotFound extends Schema.TaggedError<NotFound>()("NotFound", { id: Schema.String }, { httpApiStatus: 404 }) {}
  class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {}, { httpApiStatus: 401 }) {}
  class Invalid extends Schema.TaggedError<Invalid>()("Invalid", { message: Schema.String }, { httpApiStatus: 400 }) {}
  const Page = Schema.Struct({
    page: Schema.optionalKey(Schema.NumberFromString.check(Schema.isInt())),
    sort: Schema.optionalKey(Schema.Literals(["name", "createdAt"]))
  })
  let api: any = HttpApi.make("Api")
  for (let index = 0; index < groups; index++) {
    const { Entity } = makeEntity(core, index)
    const Create = Entity.mapFields(({ id: _, ...fields }) => fields)
    const name = `group${index}`
    const path = `/${name}/items` as const
    const errors = [NotFound, Unauthorized, Invalid]
    const group = HttpApiGroup.make(name).add(
      HttpApiEndpoint.get("list", path, { query: Page, success: Schema.Array(Entity), error: errors }),
      HttpApiEndpoint.get("get", `${path}/:id`, { params: { id: Schema.String }, success: Entity, error: errors }),
      HttpApiEndpoint.post("create", path, {
        payload: Create,
        success: Entity.pipe(HttpApiSchema.status(201)),
        error: errors
      }),
      HttpApiEndpoint.put("replace", `${path}/:id`, {
        params: { id: Schema.String },
        payload: Create,
        success: Entity,
        error: errors
      }),
      HttpApiEndpoint.patch("rename", `${path}/:id/name`, {
        params: { id: Schema.String },
        payload: Schema.Struct({ name: Schema.String }),
        success: Entity,
        error: errors
      }),
      HttpApiEndpoint.delete("remove", `${path}/:id`, { params: { id: Schema.String }, error: errors })
    )
    api = api.add(group)
  }
  return api
}

export const createWorkload = (size: string) => {
  const groups = sizes[size]
  if (groups === undefined) throw new Error(`Unknown size: ${size}`)
  let api: any
  let handler: (request: Request) => Promise<Response>
  let scope: Scope.Closeable
  const request = () => handler(new Request("http://localhost/group0/items/id-0"))
  const respond = async () => {
    const response = await request()
    if (response.status !== 200) throw new Error(`Unexpected status ${response.status}: ${await response.text()}`)
    return response.json()
  }
  return {
    define: () => {
      api = makeApi(groups)
    },
    phases: {
      build: async () => {
        const value = entityInput(0)
        const decoded: Record<string, unknown> = {
          ...value,
          createdAt: new Date(value.createdAt),
          price: { amount: 12.5, currency: "EUR" }
        }
        const groupLayers = Array.from(
          { length: groups },
          (_, index) =>
            HttpApiBuilder.group(api, `group${index}`, (handlers: any) =>
              handlers
                .handle("list", () => Effect.succeed([decoded]))
                .handle(
                  "get",
                  ({ params }: any) => Effect.succeed({ ...decoded, id: params.id, kind: `entity${index}` })
                )
                .handle("create", ({ payload }: any) => Effect.succeed({ ...payload, id: "new" }))
                .handle("replace", ({ params, payload }: any) => Effect.succeed({ ...payload, id: params.id }))
                .handle(
                  "rename",
                  ({ params, payload }: any) =>
                    Effect.succeed({ ...decoded, id: params.id, name: payload.name, kind: `entity${index}` })
                )
                .handle("remove", () => Effect.void))
        )
        const app = HttpApiBuilder.layer(api).pipe(
          Layer.provide(groupLayers as any),
          Layer.provideMerge(HttpRouter.layer),
          Layer.provide(HttpServer.layerServices)
        ) as Layer.Layer<HttpRouter.HttpRouter>
        scope = Scope.makeUnsafe()
        const context = await Effect.runPromise(Layer.buildWithScope(app, scope))
        handler = HttpEffect.toWebHandlerWith(context)(
          Context.get(context, HttpRouter.HttpRouter).asHttpEffect()
        ) as any
      },
      request: respond,
      openapi: () => OpenApi.fromApi(api)
    },
    warm: respond,
    retained: () => api,
    dispose: () => Effect.runPromise(Scope.close(scope, Exit.void))
  }
}
