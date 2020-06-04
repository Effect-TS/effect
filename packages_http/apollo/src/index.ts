import {
  ApolloServer,
  makeExecutableSchema,
  ITypeDefinitions,
  IResolvers
} from "apollo-server-express"
import {
  ExpressContext,
  ApolloServerExpressConfig
} from "apollo-server-express/dist/ApolloServer"
import * as express from "express"

import {
  ApolloConf,
  ApolloEnv,
  Context,
  ContextEnv,
  ResolverSubF,
  contextURI,
  ResolverInput,
  Resolver,
  ResolverEnv,
  ResolverF
} from "./Apollo"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as U from "@matechs/core/Utils"
import * as EX from "@matechs/express"

// EXPERIMENTAL
/* istanbul ignore file */

export interface ApolloHelper<RE, U extends string, Ctx, C extends ApolloConf> {
  _RE: RE
  _U: U
  _CTX: Ctx
  _C: C

  bindToSchema: <R extends Resolver<any, R, U, Ctx>>(
    res: R,
    typeDefs: ITypeDefinitions,
    additionalResolvers?: IResolvers
  ) => T.SyncR<
    ResolverEnv<R, U, Ctx> & EX.HasExpress & EX.HasServer & ApolloEnv<C> & RE,
    void
  >
  binder: <K extends Resolver<any, K, U, Ctx>>(res: K) => K
  accessContext: T.SyncR<ContextEnv<U, Ctx>, { [k in U]: Ctx }[U]>
  resolver: <ARGS, S = any>() => <
    R extends ResolverF<ARGS, U, Ctx, S, any, any, any, any>
  >(
    _: R
  ) => R
  subscription: <ARGS, S = any>() => <B, C, D, E, F, G, S, S2>(
    subscribe: (
      _: ResolverInput<S, ARGS>
    ) => T.Effect<S, B & ContextEnv<U, Ctx>, C, AsyncIterable<D>>,
    resolve?: (_: D) => T.Effect<S2, E & ContextEnv<U, Ctx>, F, G>
  ) => ResolverSubF<ARGS, U, Ctx, S, B, C, D, E, F, G, S, S2>
}

export function apollo<RE, U extends string, Ctx, C extends ApolloConf>(
  uri: U,
  configP: C,
  contextF: (_: {
    req: express.Request
    res: express.Response
    connection?: C["subscriptions"] extends {
      onConnect: (..._: any[]) => T.Effect<any, any, never, any>
    }
      ? Omit<ExpressContext["connection"], "context"> & {
          context: U.Ret<ReturnType<C["subscriptions"]["onConnect"]>>
        }
      : ExpressContext["connection"]
  }) => T.Effect<any, RE, never, Ctx>
): ApolloHelper<RE, U, Ctx, C> {
  const config = configP as Omit<ApolloServerExpressConfig, "context" | "schema">

  const accessContext = T.access((_: ContextEnv<U, Ctx>) => _[contextURI][uri])

  const subscription = <ARGS, A, B, C, D, E, F, G, S, S2>(
    subscribe: (
      _: ResolverInput<A, ARGS>
    ) => T.Effect<S, B & ContextEnv<U, Ctx>, C, AsyncIterable<D>>,
    resolve?: (_: D) => T.Effect<S2, E & ContextEnv<U, Ctx>, F, G>
  ): ResolverSubF<ARGS, U, Ctx, A, B, C, D, E, F, G, S, S2> => ({
    subscribe,
    resolve
  })

  const resolver = <K extends Resolver<any, K, U, Ctx>>(res: K) => res

  const bindToSchema = <R extends Resolver<any, R, U, Ctx>>(
    res: R,
    typeDefs: ITypeDefinitions,
    additionalResolvers: IResolvers = {}
  ) =>
    T.accessM(
      (
        _: ResolverEnv<R, U, Ctx> & EX.HasExpress & EX.HasServer & ApolloEnv<C> & RE
      ) => {
        const toBind = {}

        for (const k of Object.keys(res)) {
          const paths = k.split("/")

          let ref = toBind

          paths.forEach((p, i) => {
            if (i === paths.length - 1) {
              if (typeof res[k] === "function") {
                ref[p] = (source: any, args: any, ctx: Context) =>
                  pipe(
                    res[k]({
                      source: O.fromNullable(source),
                      args: args || {}
                    }),
                    T.provide({
                      ...(_ as any),
                      [contextURI]: {
                        [uri]: ctx
                      }
                    }),
                    T.runToPromise
                  )
              } else {
                ref[p] = {
                  subscribe: (source: any, args: any, ctx: Context) =>
                    pipe(
                      res[k].subscribe({
                        source: O.fromNullable(source),
                        args: args || {}
                      }),
                      T.provide({
                        ...(_ as any),
                        [contextURI]: {
                          [uri]: ctx
                        }
                      }),
                      T.runToPromise
                    )
                }

                if (res[k].resolve) {
                  ref[p].resolve = (x: any, _: any, ctx: Context) =>
                    pipe(
                      res[k].resolve(x),
                      T.provide({
                        ...(_ as any),
                        [contextURI]: {
                          [uri]: ctx
                        }
                      }),
                      T.runToPromise
                    )
                }
              }
            } else {
              if (!ref[p]) {
                ref[p] = {}
              }
              ref = ref[p]
            }
          })
        }

        return T.orAbort(
          T.trySync(() => {
            const schema = makeExecutableSchema({
              typeDefs,
              resolvers: { ...toBind, ...additionalResolvers }
            })

            if (configP.subscriptions && configP.subscriptions.onConnect) {
              const onC = configP.subscriptions.onConnect
              const onD = configP.subscriptions.onDisconnect

              config.subscriptions = {
                onConnect: (a, b, c) => T.runToPromise(T.provide(_)(onC(a, b, c))),
                keepAlive: configP.subscriptions.keepAlive,
                onDisconnect: onD
                  ? (a, b) => T.runToPromise(T.provide(_)(onD(a, b)))
                  : undefined,
                path: configP.subscriptions.path
              }
            }

            const server = new ApolloServer({
              schema,
              context: (ci) => T.runToPromise(T.provide(_)(contextF(ci as any))),
              ...config
            })

            server.applyMiddleware({ app: _[EX.expressAppEnv].app })

            if (config.subscriptions) {
              server.installSubscriptionHandlers(_[EX.serverEnv].server)
            }

            _[EX.serverEnv].onClose.push(
              T.asyncTotal((r) => {
                server
                  .stop()
                  .then(() => {
                    r()
                  })
                  .catch(() => {
                    r()
                  })
                return () => {
                  //
                }
              })
            )
          })
        )
      }
    )

  return {
    bindToSchema,
    binder: resolver,
    accessContext,
    resolver: () => (_) => _,
    subscription: () => subscription,
    _C: undefined as any,
    _CTX: undefined as any,
    _RE: undefined as any,
    _U: undefined as any
  }
}

export { Resolver }
