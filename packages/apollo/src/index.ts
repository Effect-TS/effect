import { effect as T, freeEnv as F } from "@matechs/effect";
import * as EX from "@matechs/express";
import { option as O } from "fp-ts";
import { ApolloServer } from "apollo-server-express";
import { pipe } from "fp-ts/lib/pipeable";
import { DocumentNode } from "graphql";

// Experimental
/* istanbul ignore file */

export interface ResolverInput<S> {
  source: O.Option<S>;
  args: Record<string, unknown>;
}

export type Resolver<K> = {
  [k in keyof K]: (_: ResolverInput<unknown>) => T.Effect<any, any, any>;
};

export const resolver = <K extends Resolver<K>>(res: K) => res;

export type ResolverEnv<R> = R extends Resolver<any>
  ? F.UnionToIntersection<
      {
        [k in keyof R]: R[k] extends (_: ResolverInput<infer _A>) => T.Effect<infer B, infer _C, infer _D>
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
          if (!ref[p]) {
            ref[p] = {};
          }
          ref = ref[p];
        }
      });
    }

    return T.trySync(() => {
      const server = new ApolloServer({
        typeDefs: node,
        resolvers: toBind
      });

      server.applyMiddleware({ app: _[EX.expressAppEnv].app });
    });
  });
