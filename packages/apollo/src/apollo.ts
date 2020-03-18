import exp from "express";
import { option as O } from "fp-ts";
import { effect as T, freeEnv as F } from "@matechs/effect";
import { ApolloServerExpressConfig } from "apollo-server-express/dist/ApolloServer";
import { ConnectionContext } from "subscriptions-transport-ws";
import WebSocket from "ws";

// EXPERIMENTAL
/* istanbul ignore file */

export interface ResolverInput<S, ARGS> {
  source: O.Option<S>;
  args: ARGS;
}

export interface Context {
  req: O.Option<exp.Request>;
}

export const contextURI = "@matechs/apollo/context";

export interface ContextEnv<U extends string, Ctx> {
  [contextURI]: {
    [k in U]: Ctx;
  };
}

export type ResolverF<ARGS, U extends string, Ctx, A, B, C, D> = (
  _: ResolverInput<A, ARGS>
) => T.Effect<B & ContextEnv<U, Ctx>, C, D>;

export interface ResolverSubF<ARGS, U extends string, Ctx, A, B, C, D, E, F, G> {
  subscribe: (_: ResolverInput<A, ARGS>) => T.Effect<B & ContextEnv<U, Ctx>, C, AsyncIterable<D>>;
  resolve?: (_: D) => T.Effect<E & ContextEnv<U, Ctx>, F, G>;
}

export type Resolver<ARGS, K, U extends string, Ctx> = {
  [k in keyof K]:
    | ResolverF<ARGS, U, Ctx, unknown, any, any, any>
    | ResolverSubF<ARGS, U, Ctx, unknown, any, any, any, any, any, any>;
};

export const resolverF = <ARGS>() => <
  R extends
    | ResolverF<ARGS, any, any, unknown, any, any, any>
    | ResolverSubF<ARGS, any, any, unknown, any, any, any, any, any, any>
>(
  _: R
) => _;

export type ResolverEnv<R, U extends string, Ctx> = R extends Resolver<any, any, U, Ctx>
  ? F.UnionToIntersection<
      {
        [k in keyof R]: R[k] extends ResolverF<any, U, Ctx, any, infer B, any, any>
          ? unknown extends B
            ? never
            : B
          : R[k] extends ResolverSubF<any, U, Ctx, any, infer B, any, any, infer B2, any, any>
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
