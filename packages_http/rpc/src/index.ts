import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as L from "@matechs/core/Layer"
import * as F from "@matechs/core/Service"
import * as EXP from "@matechs/express"
import { RPCResponse } from "@matechs/rpc-client"

export const ServerConfigURI = "@matechs/rpc/ServerConfigURI"

export interface ServerConfig<M> {
  [ServerConfigURI]: {
    [k in keyof M]: {
      scope: string
    }
  }
}

export const ServerConfig = <M>(URI: keyof M, scope: string) =>
  L.fromEffect(
    T.access(
      (r: {}): ServerConfig<M> => ({
        [ServerConfigURI]: {
          ...r[ServerConfigURI],
          [URI]: {
            scope
          }
        }
      })
    )
  )

export type InferR<F> = F extends (
  ...args: any[]
) => T.Effect<any, infer Q & EXP.RequestContext, any, any>
  ? Q
  : F extends T.Effect<any, infer Q & EXP.RequestContext, any, any>
  ? Q
  : never

export type Runtime<M> = F.UnionToIntersection<
  M extends {
    [k in keyof M]: {
      [h: string]: infer X
    }
  }
    ? InferR<X>
    : never
>

export const Server = <M extends F.ModuleShape<M>, R>(
  s: F.ModuleSpec<M>,
  p: T.Provider<R, M, any, any>
): L.AsyncR<ServerConfig<M> & T.Erase<R, EXP.RequestContext> & EXP.Express, {}> =>
  L.fromEffect(
    T.accessM((r: ServerConfig<M> & R & EXP.Express) => {
      const ops: T.AsyncR<EXP.Express & EXP.Express, void>[] = []

      for (const k of Reflect.ownKeys(s[F.specURI])) {
        const { scope } = r[ServerConfigURI][k]

        for (const key of Reflect.ownKeys(s[F.specURI][k])) {
          if (typeof key === "string") {
            const path = `${scope}/${key}`

            ops.push(
              EXP.on(
                "post",
                path,
                EXP.accessReqM((req) =>
                  T.async<never, EXP.RouteResponse<RPCResponse>>((res) => {
                    const { args } = req.body

                    const cancel = T.run(
                      T.provide<EXP.Express & EXP.RequestContext & R>({
                        ...r,
                        [EXP.RequestContextURI]: { request: req }
                      })(
                        p(
                          T.accessM((z: M) =>
                            typeof z[k][key] === "function"
                              ? z[k][key](...args)
                              : z[k][key]
                          )
                        )
                      ),
                      (x) => res(E.right(EXP.routeResponse(200)({ value: x })))
                    )

                    return () => {
                      cancel()
                    }
                  })
                )
              )
            )
          }
        }
      }

      return T.map_(T.sequenceArray(ops), () => ({}))
    })
  )
