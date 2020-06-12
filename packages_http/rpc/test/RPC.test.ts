import "isomorphic-fetch"
import * as assert from "assert"

import * as RPC from "../src"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as L from "@matechs/core/Layer"
import * as F from "@matechs/core/Service"
import * as E from "@matechs/express"
import * as H from "@matechs/http-client-fetch"
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

const CounterURI: unique symbol = Symbol()

const Counter_ = F.define({
  [CounterURI]: {
    increment: F.fn<(n: number) => T.Async<number>>(),
    ni: F.cn<T.AsyncE<string, void>>()
  }
})

interface CounterService extends F.TypeOf<typeof Counter_> {}

const CounterService = F.opaque<CounterService>()(Counter_)

let counter = 0

const Counter = F.layer(CounterService)({
  [CounterURI]: {
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

const { increment, ni } = RPCCLI.client(Counter_)

describe("RPC", () => {
  it("should call remote service", async () => {
    const program = T.Do()
      .bind("inc", T.result(increment(1)))
      .bind("ni", T.result(ni))
      .done()

    const main = pipe(
      program,
      RPC.Server(Counter_, Counter.use).withMany(
        E.Express(9003),
        RPC.ServerConfig<CounterService>(CounterURI, "/counter"),
        L.fromValue(appConfig),
        H.Client(fetch),
        RPCCLI.ClientConfig<CounterService>(CounterURI, "http://127.0.0.1:9003/counter")
      ).use
    )

    const result = await T.runToPromise(main)

    assert.deepStrictEqual(result.inc, Ex.done(2))
    assert.deepStrictEqual(result.ni, Ex.raise("not implemented"))
  })
})
