import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import * as F from "@matechs/core/Function"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as Service from "@matechs/core/Service"
import * as H from "@matechs/http-client"

// tested in @matechs/rpc
/* istanbul ignore file */

export const clientConfigEnv = "@matechs/rpc-client/clientConfigURI"

export interface ClientConfig<M> {
  [clientConfigEnv]: {
    [k in keyof M]: {
      baseUrl: string
    }
  }
}

type ClientEntry<M, X> = M extends F.FunctionN<
  infer A,
  T.Effect<infer _S, infer _B, infer C, infer D>
>
  ? F.FunctionN<
      A,
      T.AsyncRE<H.RequestEnv & ClientConfig<X>, C | H.HttpError<unknown>, D>
    >
  : M extends T.Effect<infer _S, infer _B, infer C, infer D>
  ? T.AsyncRE<H.RequestEnv & ClientConfig<X>, C | H.HttpError<unknown>, D>
  : never

export type Client<M extends Service.ModuleShape<M>> = {
  [k in keyof M[keyof M]]: ClientEntry<M[keyof M][k], M>
}

export function client<M extends Service.ModuleShape<M>>(
  s: Service.ModuleSpec<M>
): Client<M> {
  const r = {} as any

  for (const entry of Reflect.ownKeys(s[Service.specURI])) {
    const x = s[Service.specURI][entry]

    for (const z of Object.keys(x)) {
      if (typeof x[z] === "function") {
        r[z] = (...args: any[]) =>
          T.Do()
            .bindL("req", () => T.pure<RPCRequest>({ args }))
            .bindL("con", () => T.access((c: ClientConfig<M>) => c))
            .bindL("res", ({ con, req }) =>
              H.post(`${con[clientConfigEnv][entry].baseUrl}/${z}`, req)
            )
            .bindL("ret", ({ res }) =>
              pipe(
                res.body,
                O.fold(
                  () => T.raiseError(new Error("empty response")),
                  (v) => T.completed((v as RPCResponse).value)
                )
              )
            )
            .return((s) => s.ret)
      } else if (typeof x[z] === "object") {
        r[z] = T.Do()
          .bindL("req", () => T.pure<RPCRequest>({ args: [] }))
          .bindL("con", () => T.access((c: ClientConfig<M>) => c))
          .bindL("res", ({ con, req }) =>
            H.post(`${con[clientConfigEnv][entry].baseUrl}/${z}`, req)
          )
          .bindL("ret", ({ res }) =>
            pipe(
              res.body,
              O.fold(
                () => T.raiseError(new Error("empty response")),
                (v) => T.completed((v as RPCResponse).value)
              )
            )
          )
          .return((s) => s.ret)
      }
    }
  }

  return r
}

export interface RPCRequest {
  args: unknown[]
}

export interface RPCResponse {
  value: Ex.Exit<unknown, unknown>
}
