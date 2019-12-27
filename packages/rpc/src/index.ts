import { freeEnv as F, effect as T } from "@matechs/effect";
import { Exit } from "@matechs/effect/lib/original/exit";
import * as E from "@matechs/express";
import * as H from "@matechs/http-client";
import { Do } from "fp-ts-contrib/lib/Do";
import { array } from "fp-ts/lib/Array";
import { right } from "fp-ts/lib/Either";
import { FunctionN } from "fp-ts/lib/function";
import { isSome } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";

export const clientConfigEnv: unique symbol = Symbol();

export interface ClientConfig<M> {
  [clientConfigEnv]: {
    [k in keyof M]: {
      baseUrl: string;
    };
  };
}

export const serverConfigEnv: unique symbol = Symbol();

export interface ServerConfig<M> {
  [serverConfigEnv]: {
    [k in keyof M]: {
      scope: string;
    };
  };
}

type ClientEntry<M, X> = M extends FunctionN<
  infer A,
  T.Effect<infer _B, infer C, infer D>
>
  ? FunctionN<
      A,
      T.Effect<H.RequestEnv & ClientConfig<X>, C | H.HttpError<unknown>, D>
    >
  : M extends T.Effect<infer _B, infer C, infer D>
  ? T.Effect<H.RequestEnv & ClientConfig<X>, C | H.HttpError<unknown>, D>
  : never;

export type Client<M extends F.ModuleShape<M>> = {
  [k in keyof M[keyof M]]: ClientEntry<M[keyof M][k], M>;
};

export function client<M extends F.ModuleShape<M>>(
  s: F.ModuleSpec<M>
): Client<M> {
  const r = {} as any;

  for (const entry of Reflect.ownKeys(s.spec)) {
    const x = s.spec[entry];

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
            .return(s => s.ret);
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
          .return(s => s.ret);
      }
    }
  }

  return r;
}

export type InferR<F> = F extends (
  ...args: any[]
) => T.Effect<infer Q & E.RequestContext, any, any>
  ? Q
  : F extends T.Effect<infer Q & E.RequestContext, any, any>
  ? Q
  : never;

export type Runtime<M> = M extends {
  [k in keyof M]: {
    [h: string]: infer X;
  };
}
  ? InferR<X>
  : never;

export interface RPCRequest {
  args: unknown[];
}

export interface RPCResponse {
  value: Exit<unknown, unknown>;
}

export function server<M extends F.ModuleShape<M>, R>(
  s: F.ModuleSpec<M>,
  i: F.Provider<E.ChildEnv & R, M>
): T.Effect<E.ExpressEnv & Runtime<M> & ServerConfig<M> & R, T.NoErr, void> {
  return T.accessM((r: ServerConfig<M> & E.ExpressEnv & R) => {
    const ops: T.Effect<E.HasExpress & E.Express, never, void>[] = [];

    for (const k of Reflect.ownKeys(s.spec)) {
      const { scope } = r[serverConfigEnv][k];

      for (const key of Reflect.ownKeys(s.spec[k])) {
        if (typeof key === "string") {
          const path = `${scope}/${key}`;

          ops.push(
            E.route(
              "post",
              path,
              E.accessReqM(req =>
                T.async<never, E.RouteResponse<RPCResponse>>(res => {
                  const args: any[] = req.body.args;

                  const cancel = T.run(
                    T.provideAll({
                      ...r,
                      [E.requestContextEnv]: { request: req }
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
                    x => res(right(E.routeResponse(200, { value: x })))
                  );

                  return () => {
                    cancel();
                  };
                })
              )
            )
          );
        }
      }
    }

    return T.asUnit(array.sequence(T.effect)(ops));
  });
}
