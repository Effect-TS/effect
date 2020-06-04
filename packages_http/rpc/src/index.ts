import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import { pipe } from "@matechs/core/Function"
import * as F from "@matechs/core/Service"
import * as EXP from "@matechs/express"
import { RPCResponse } from "@matechs/rpc-client"

export const serverConfigEnv = "@matechs/rpc/serverConfigURI"

export interface ServerConfig<M> {
  [serverConfigEnv]: {
    [k in keyof M]: {
      scope: string
    }
  }
}

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

export function server<M extends F.ModuleShape<M>, R>(
  s: F.ModuleSpec<M>,
  i: T.Provider<EXP.ChildEnv & R, M, any, any>
): T.AsyncR<EXP.ExpressEnv & Runtime<M> & ServerConfig<M> & R, void> {
  return T.accessM((r: ServerConfig<M> & EXP.ExpressEnv & R) => {
    const ops: T.AsyncR<EXP.HasExpress & EXP.Express, void>[] = []

    for (const k of Reflect.ownKeys(s[F.specURI])) {
      const { scope } = r[serverConfigEnv][k]

      for (const key of Reflect.ownKeys(s[F.specURI][k])) {
        if (typeof key === "string") {
          const path = `${scope}/${key}`

          ops.push(
            EXP.route(
              "post",
              path,
              EXP.accessReqM((req) =>
                T.async<never, EXP.RouteResponse<RPCResponse>>((res) => {
                  const { args } = req.body

                  const cancel = T.run(
                    T.provide<EXP.HasExpress & EXP.Express & EXP.RequestContext & R>({
                      ...r,
                      [EXP.requestContextEnv]: { request: req }
                    })(
                      pipe(
                        T.accessM((z: M) =>
                          typeof z[k][key] === "function"
                            ? z[k][key](...args)
                            : z[k][key]
                        ),
                        i
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

    return T.asUnit(T.sequenceArray(ops))
  })
}
