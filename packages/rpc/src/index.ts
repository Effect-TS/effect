import { effect as T } from "@matechs/effect";
import { FunctionN } from "fp-ts/lib/function";
import * as H from "@matechs/http-client";
import * as E from "@matechs/express";
import { array } from "fp-ts/lib/Array";
import { right } from "fp-ts/lib/Either";
import { Exit } from "@matechs/effect/lib/original/exit";
import { Do } from "fp-ts-contrib/lib/Do";
import { isSome } from "fp-ts/lib/Option";

const clientConfigEnv: unique symbol = Symbol();

interface ClientConfig<M, K extends keyof M> {
  [clientConfigEnv]: {
    [k in K]: {
      baseUrl: string;
    };
  };
}

export function clientConfig<M, K extends keyof M>(
  _m: M,
  k: K
): (c: ClientConfig<M, K>[typeof clientConfigEnv][K]) => ClientConfig<M, K> {
  return x => ({
    [clientConfigEnv]: {
      [k]: x
    } as any
  });
}

const serverConfigEnv: unique symbol = Symbol();

interface ServerConfig<M, K extends keyof M> {
  [serverConfigEnv]: {
    [k in K]: {
      scope: string;
    };
  };
}

export function serverConfig<M, K extends keyof M>(
  _m: M,
  k: K
): (c: ServerConfig<M, K>[typeof serverConfigEnv][K]) => ServerConfig<M, K> {
  return x => ({
    [serverConfigEnv]: {
      [k]: x
    } as any
  });
}

type ClientEntry<M, X, Y extends keyof X> = M extends FunctionN<
  infer A,
  T.Effect<infer B, infer C, infer D>
>
  ? FunctionN<
      A,
      T.Effect<H.RequestEnv & ClientConfig<X, Y>, C | H.HttpError<unknown>, D>
    >
  : never;

type ClientModule<M, A, B extends keyof A> = {
  [k in keyof M]: ClientEntry<M[k], A, B>;
};

type Client<M, K extends keyof M> = ClientModule<M[K], M, K>;

export function client<M, K extends keyof M>(m: M, k: K): Client<M, K> {
  const x = m[k] as any;
  const r = {} as any;

  for (const z of Reflect.ownKeys(x)) {
    if (typeof z === "string") {
      r[z] = (...args: any[]) =>
        Do(T.effect)
          .bindL("req", () => T.pure<RPCRequest>({ args }))
          .bindL("con", () => T.access((c: ClientConfig<M, K>) => c))
          .bindL("res", ({ con, req }) =>
            H.post(`${con[clientConfigEnv][k].baseUrl}/${z}`, req)
          )
          .bindL("ret", ({ res }) =>
            isSome(res.body)
              ? T.completed((res.body.value as RPCResponse).value)
              : T.raiseError(new Error("empty response"))
          )
          .return(s => s.ret);
    }
  }

  return r;
}

export type Runtime<M> = M extends {
  [h: string]: (...args: any[]) => T.Effect<infer Q, any, any>;
}
  ? Q
  : never;

interface RPCRequest {
  args: unknown[];
}

interface RPCResponse {
  value: Exit<unknown, unknown>;
}

export function bind<M, K extends keyof M>(
  m: M,
  k: K
): T.Effect<
  E.ExpressEnv & Runtime<M[K]> & ServerConfig<M, K> & M,
  T.NoErr,
  void
> {
  return T.accessM((r: ServerConfig<M, K> & E.ExpressEnv & Runtime<M[K]>) => {
    const { scope } = r[serverConfigEnv][k];
    const { route } = r[E.expressEnv];
    const ops: T.Effect<E.HasExpress, never, void>[] = [];

    for (const key of Reflect.ownKeys(m[k] as any)) {
      if (typeof key === "string") {
        const path = `${scope}/${key}`;

        ops.push(
          route("post", path, req =>
            T.async<never, RPCResponse>(res => {
              const args: any[] = req.body.args;

              const cancel = T.run(
                T.provideAll(r as any)(m[k][key](...args)),
                x => res(right({ value: x }))
              );

              return () => {
                cancel();
              };
            })
          )
        );
      }
    }

    return T.asUnit(array.sequence(T.effect)(ops));
  });
}
