import { effect as T, freeEnv as F } from "@matechs/effect";
import * as EX from "@matechs/express";
import { option as O } from "fp-ts";
import { ApolloServer, makeExecutableSchema } from "apollo-server-express";
import { pipe } from "fp-ts/lib/pipeable";
import { DocumentNode, execute, subscribe } from "graphql";
import { SubscriptionServer } from "subscriptions-transport-ws";

// Experimental
/* istanbul ignore file */

export interface ResolverInput<S> {
  source: O.Option<S>;
  args: Record<string, unknown>;
}

type ResolverF<A, B, C, D> = (_: ResolverInput<A>) => T.Effect<B, C, D>;

interface ResolverSubF<A, B, C, D> {
  subscribe: (_: ResolverInput<A>) => T.Effect<B, C, AsyncIterable<D>>;
}

export type Resolver<K> = {
  [k in keyof K]: ResolverF<unknown, any, any, any> | ResolverSubF<unknown, any, any, any>;
};

export const resolver = <K extends Resolver<K>>(res: K) => res;

export type ResolverEnv<R> = R extends Resolver<any>
  ? F.UnionToIntersection<
      {
        [k in keyof R]: R[k] extends ResolverF<any, infer B, any, any>
          ? unknown extends B
            ? never
            : B
          : R[k] extends ResolverSubF<any, infer B, any, any>
          ? unknown extends B
            ? never
            : B
          : never;
      }[keyof R]
    >
  : never;

export const bindToSchema = <R extends Resolver<R>>(res: R, node: DocumentNode) =>
  T.accessM((_: ResolverEnv<R> & EX.HasExpress & EX.HasServer) => {
    const toBind = {};

    for (const k of Object.keys(res)) {
      const paths = k.split("/");

      let ref = toBind;

      paths.forEach((p, i) => {
        if (i === paths.length - 1) {
          if (typeof res[k] === "function") {
            ref[p] = (source: any, args: any) =>
              pipe(
                res[k]({
                  source: O.fromNullable(source),
                  args: args || {}
                }),
                T.provideAll(_),
                T.runToPromise
              );
          } else {
            ref[p] = {
              subscribe: (source: any, args: any) =>
                pipe(
                  res[k].subscribe({
                    source: O.fromNullable(source),
                    args: args || {}
                  }),
                  T.provideAll(_),
                  T.runToPromise
                )
            };
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

      const server = new ApolloServer({
        schema,
        subscriptions: "/subscriptions"
      });

      server.applyMiddleware({ app: _[EX.expressAppEnv].app });

      const subS = new SubscriptionServer(
        {
          execute,
          subscribe,
          schema
        },
        {
          server: _[EX.serverEnv].server,
          path: "/subscriptions"
        }
      );

      _[EX.serverEnv].onClose.push(
        T.asyncTotal(r => {
          subS.close();
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
