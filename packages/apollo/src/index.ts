import { effect as T, freeEnv as F, utils as UT } from "@matechs/effect";
import * as EX from "@matechs/express";
import exp from "express";
import { option as O } from "fp-ts";
import { ApolloServer, makeExecutableSchema } from "apollo-server-express";
import { pipe } from "fp-ts/lib/pipeable";
import { DocumentNode } from "graphql";
import { ExpressContext, ApolloServerExpressConfig } from "apollo-server-express/dist/ApolloServer";
import { ConnectionContext } from "subscriptions-transport-ws";
import WebSocket from "ws";

// EXPERIMENTAL
/* istanbul ignore file */

interface ResolverInput<S> {
  source: O.Option<S>;
  args: Record<string, unknown>;
}

interface Context {
  req: O.Option<exp.Request>;
}

const contextURI = "@matechs/apollo/context";

interface ContextEnv<U extends string, Ctx> {
  [contextURI]: {
    [k in U]: Ctx;
  };
}

type ResolverF<U extends string, Ctx, A, B, C, D> = (_: ResolverInput<A>) => T.Effect<B & ContextEnv<U, Ctx>, C, D>;

interface ResolverSubF<U extends string, Ctx, A, B, C, D, E, F, G> {
  subscribe: (_: ResolverInput<A>) => T.Effect<B & ContextEnv<U, Ctx>, C, AsyncIterable<D>>;
  resolve?: (_: D) => T.Effect<E & ContextEnv<U, Ctx>, F, G>;
}

type Resolver<K, U extends string, Ctx> = {
  [k in keyof K]:
    | ResolverF<U, Ctx, unknown, any, any, any>
    | ResolverSubF<U, Ctx, unknown, any, any, any, any, any, any>;
};

type ResolverEnv<R, U extends string, Ctx> = R extends Resolver<any, U, Ctx>
  ? F.UnionToIntersection<
      {
        [k in keyof R]: R[k] extends ResolverF<U, Ctx, any, infer B, any, any>
          ? unknown extends B
            ? never
            : B
          : R[k] extends ResolverSubF<U, Ctx, any, infer B, any, any, infer B2, any, any>
          ? unknown extends B
            ? unknown extends B2
              ? never
              : B2
            : unknown extends B2
            ? B
            : B & B2
          : never;
      }[keyof R]
    >
  : never;

export type ApolloConf = Omit<ApolloServerExpressConfig, "context" | "schema" | "subscriptions"> & {
  subscriptions?: Partial<{
    path: string;
    keepAlive?: number;
    onConnect?: (
      connectionParams: unknown,
      websocket: WebSocket,
      context: ConnectionContext
    ) => T.Effect<any, never, any>;
    onDisconnect?: (websocket: WebSocket, context: ConnectionContext) => T.Effect<any, never, any>;
  }>;
};

export type ApolloEnv<C extends ApolloConf> = C extends {
  subscriptions: {
    onConnect?: (
      connectionParams: unknown,
      websocket: WebSocket,
      context: ConnectionContext
    ) => T.Effect<infer R, never, any>;
    onDisconnect?: (websocket: WebSocket, context: ConnectionContext) => T.Effect<infer R2, never, any>;
  };
}
  ? (R extends never ? unknown : R) & (R2 extends never ? unknown : R2)
  : unknown;

export function apollo<RE, U extends string, Ctx, C extends ApolloConf>(
  uri: U,
  configP: C,
  contextF: (
    _: Omit<ExpressContext, "connection"> & {
      connection?: C["subscriptions"] extends {
        onConnect: (..._: any[]) => T.Effect<any, never, any>;
      }
        ? Omit<ExpressContext["connection"], "context"> & {
            context: UT.Ret<ReturnType<C["subscriptions"]["onConnect"]>>;
          }
        : ExpressContext["connection"];
    }
  ) => T.Effect<RE, never, Ctx>
) {
  const config = configP as Omit<ApolloServerExpressConfig, "context" | "schema">;

  const accessContext = T.access((_: ContextEnv<U, Ctx>) => _[contextURI][uri]);

  const subscription = <A, B, C, D, E, F, G>(
    subscribe: (_: ResolverInput<A>) => T.Effect<B & ContextEnv<U, Ctx>, C, AsyncIterable<D>>,
    resolve?: (_: D) => T.Effect<E & ContextEnv<U, Ctx>, F, G>
  ): ResolverSubF<U, Ctx, A, B, C, D, E, F, G> => ({
    subscribe,
    resolve
  });

  const resolver = <K extends Resolver<K, U, Ctx>>(res: K) => res;

  const bindToSchema = <R extends Resolver<R, U, Ctx>>(res: R, node: DocumentNode) =>
    T.accessM((_: ResolverEnv<R, U, Ctx> & EX.HasExpress & EX.HasServer & ApolloEnv<C> & RE) => {
      const toBind = {};

      for (const k of Object.keys(res)) {
        const paths = k.split("/");

        let ref = toBind;

        paths.forEach((p, i) => {
          if (i === paths.length - 1) {
            if (typeof res[k] === "function") {
              ref[p] = (source: any, args: any, ctx: Context) =>
                pipe(
                  res[k]({
                    source: O.fromNullable(source),
                    args: args || {}
                  }),
                  T.provideAll({
                    ...(_ as any),
                    [contextURI]: {
                      [uri]: ctx
                    }
                  }),
                  T.runToPromise
                );
            } else {
              ref[p] = {
                subscribe: (source: any, args: any, ctx: Context) =>
                  pipe(
                    res[k].subscribe({
                      source: O.fromNullable(source),
                      args: args || {}
                    }),
                    T.provideAll({
                      ...(_ as any),
                      [contextURI]: {
                        [uri]: ctx
                      }
                    }),
                    T.runToPromise
                  )
              };

              if (res[k].resolve) {
                ref[p].resolve = (x: any, _: any, ctx: Context) =>
                  pipe(
                    res[k].resolve(x),
                    T.provideAll({
                      ...(_ as any),
                      [contextURI]: {
                        [uri]: ctx
                      }
                    }),
                    T.runToPromise
                  );
              }
            }
          } else {
            if (!ref[p]) {
              ref[p] = {};
            }
            ref = ref[p];
          }
        });
      }

      return T.trySync(() => {
        const schema = makeExecutableSchema({ typeDefs: node, resolvers: toBind });

        if (configP.subscriptions && configP.subscriptions.onConnect) {
          const onC = configP.subscriptions.onConnect;
          const onD = configP.subscriptions.onDisconnect;

          config.subscriptions = {
            onConnect: (a, b, c) => T.runToPromise(T.provideAll(_)(onC(a, b, c))),
            keepAlive: configP.subscriptions.keepAlive,
            onDisconnect: onD ? (a, b) => T.runToPromise(T.provideAll(_)(onD(a, b))) : undefined,
            path: configP.subscriptions.path
          };
        }

        const server = new ApolloServer({
          schema,
          context: ci => T.runToPromise(T.provideAll(_)(contextF(ci as any))),
          ...config
        });

        server.applyMiddleware({ app: _[EX.expressAppEnv].app });

        if (config.subscriptions) {
          server.installSubscriptionHandlers(_[EX.serverEnv].server);
        }

        _[EX.serverEnv].onClose.push(
          T.asyncTotal(r => {
            server
              .stop()
              .then(() => {
                r();
              })
              .catch(() => {
                r();
              });
            return () => {
              //
            };
          })
        );
      });
    });

  return {
    bindToSchema,
    resolver,
    subscription,
    accessContext
  };
}
