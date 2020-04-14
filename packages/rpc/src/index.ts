import { freeEnv as F, effect as T } from "@matechs/effect";
import * as E from "@matechs/express";
import { array } from "fp-ts/lib/Array";
import { right } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { RPCResponse } from "@matechs/rpc-client";

export const serverConfigEnv = "@matechs/rpc/serverConfigURI";

export interface ServerConfig<M> {
  [serverConfigEnv]: {
    [k in keyof M]: {
      scope: string;
    };
  };
}

export type InferR<F> = F extends (...args: any[]) => T.Effect<infer Q & E.RequestContext, any, any>
  ? Q
  : F extends T.Effect<infer Q & E.RequestContext, any, any>
  ? Q
  : never;

export type Runtime<M> = F.UnionToIntersection<
  M extends {
    [k in keyof M]: {
      [h: string]: infer X;
    };
  }
    ? InferR<X>
    : never
>;

export function server<M extends F.ModuleShape<M>, R>(
  s: F.ModuleSpec<M>,
  i: T.Provider<E.ChildEnv & R, M>
): T.AsyncRE<E.ExpressEnv & Runtime<M> & ServerConfig<M> & R, T.NoErr, void> {
  return T.accessM((r: ServerConfig<M> & E.ExpressEnv & R) => {
    const ops: T.AsyncRE<E.HasExpress & E.Express, never, void>[] = [];

    for (const k of Reflect.ownKeys(s[F.specURI])) {
      const { scope } = r[serverConfigEnv][k];

      for (const key of Reflect.ownKeys(s[F.specURI][k])) {
        if (typeof key === "string") {
          const path = `${scope}/${key}`;

          ops.push(
            E.route(
              "post",
              path,
              E.accessReqM((req) =>
                T.async<never, E.RouteResponse<RPCResponse>>((res) => {
                  const args: any[] = req.body.args;

                  const cancel = T.run(
                    T.provideS<E.HasExpress & E.Express & E.RequestContext & R>({
                      ...r,
                      [E.requestContextEnv]: { request: req }
                    })(
                      pipe(
                        T.accessM((z: M) =>
                          typeof z[k][key] === "function" ? z[k][key](...args) : z[k][key]
                        ),
                        i
                      )
                    ),
                    (x) => res(right(E.routeResponse(200, { value: x })))
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
