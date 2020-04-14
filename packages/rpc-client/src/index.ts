import { freeEnv as F, effect as T, exit as EX } from "@matechs/effect";
import * as H from "@matechs/http-client";
import { Do } from "fp-ts-contrib/lib/Do";
import { FunctionN } from "fp-ts/lib/function";
import { isSome } from "fp-ts/lib/Option";

// tested in @matechs/rpc
/* istanbul ignore file */

export const clientConfigEnv = "@matechs/rpc-client/clientConfigURI";

export interface ClientConfig<M> {
  [clientConfigEnv]: {
    [k in keyof M]: {
      baseUrl: string;
    };
  };
}

type ClientEntry<M, X> = M extends FunctionN<infer A, T.Effect<infer _B, infer C, infer D>>
  ? FunctionN<A, T.AsyncRE<H.RequestEnv & ClientConfig<X>, C | H.HttpError<unknown>, D>>
  : M extends T.Effect<infer _B, infer C, infer D>
  ? T.AsyncRE<H.RequestEnv & ClientConfig<X>, C | H.HttpError<unknown>, D>
  : never;

export type Client<M extends F.ModuleShape<M>> = {
  [k in keyof M[keyof M]]: ClientEntry<M[keyof M][k], M>;
};

export function client<M extends F.ModuleShape<M>>(s: F.ModuleSpec<M>): Client<M> {
  const r = {} as any;

  for (const entry of Reflect.ownKeys(s[F.specURI])) {
    const x = s[F.specURI][entry];

    for (const z of Object.keys(x)) {
      if (typeof x[z] === "function") {
        r[z] = (...args: any[]) =>
          Do(T.effect)
            .bindL("req", () => T.pure<RPCRequest>({ args }))
            .bindL("con", () => T.access((c: ClientConfig<M>) => c))
            .bindL("res", ({ con, req }) =>
              H.post(`${con[clientConfigEnv][entry].baseUrl}/${z}`, req)
            )
            .bindL("ret", ({ res }) =>
              isSome(res.body)
                ? T.completed((res.body.value as RPCResponse).value)
                : T.raiseError(new Error("empty response"))
            )
            .return((s) => s.ret);
      } else if (typeof x[z] === "object") {
        r[z] = Do(T.effect)
          .bindL("req", () => T.pure<RPCRequest>({ args: [] }))
          .bindL("con", () => T.access((c: ClientConfig<M>) => c))
          .bindL("res", ({ con, req }) =>
            H.post(`${con[clientConfigEnv][entry].baseUrl}/${z}`, req)
          )
          .bindL("ret", ({ res }) =>
            isSome(res.body)
              ? T.completed((res.body.value as RPCResponse).value)
              : T.raiseError(new Error("empty response"))
          )
          .return((s) => s.ret);
      }
    }
  }

  return r;
}

export interface RPCRequest {
  args: unknown[];
}

export interface RPCResponse {
  value: EX.Exit<unknown, unknown>;
}
