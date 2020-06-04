import "isomorphic-fetch"
import * as assert from "assert"

import * as RPC from "../src"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as F from "@matechs/core/Service"
import * as E from "@matechs/express"
import * as L from "@matechs/http-client-fetch"
import * as RPCCLI from "@matechs/rpc-client"

const configEnv: unique symbol = Symbol()

interface AppConfig {
  [configEnv]: {
    gap: number
  }
}

const appConfig: AppConfig = {
  [configEnv]: {
    gap: 1
  }
}

const counterEnv: unique symbol = Symbol()

const counterM = F.define({
  [counterEnv]: {
    increment: F.fn<(n: number) => T.Async<number>>(),
    ni: F.cn<T.AsyncE<string, void>>()
  }
})

let counter = 0

const counterService = F.implement(counterM)({
  [counterEnv]: {
    increment: (n) =>
      pipe(
        T.accessM(({ [configEnv]: c }: AppConfig) =>
          T.sync(() => {
            counter = counter + n + c.gap
            return counter
          })
        )
      ),
    ni: T.raiseError("not implemented")
  }
})

const { increment, ni } = RPCCLI.client(counterM)

describe("RPC", () => {
  it("should call remote service", async () => {
    const program = E.withApp(
      T.Do()
        .do(RPC.server(counterM, counterService))
        .bind("server", E.bind(9003))
        .done()
    )

    const result = await T.runToPromise(
      pipe(
        program,
        T.provide(appConfig),
        T.provide(E.express),
        T.provide({
          [RPC.serverConfigEnv]: {
            [counterEnv]: {
              scope: "/counter"
            }
          }
        })
      )
    )

    const incResult = await T.runToPromiseExit(
      pipe(
        increment(1),
        T.provide(L.client(fetch)),
        T.provide({
          [RPCCLI.clientConfigEnv]: {
            [counterEnv]: {
              baseUrl: "http://127.0.0.1:9003/counter"
            }
          }
        })
      )
    )

    const niResult = await T.runToPromiseExit(
      pipe(
        ni,
        T.provide(L.client(fetch)),
        T.provide({
          [RPCCLI.clientConfigEnv]: {
            [counterEnv]: {
              baseUrl: "http://127.0.0.1:9003/counter"
            }
          }
        })
      )
    )

    result.server.close()

    assert.deepStrictEqual(incResult, Ex.done(2))
    assert.deepStrictEqual(niResult, Ex.raise("not implemented"))
  })
})
