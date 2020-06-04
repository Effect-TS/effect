import assert from "assert"

import * as L from "../src"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/test-jest"

// eslint-disable-next-line @typescript-eslint/no-empty-function
const empty = () => {}

const loggerSpec = M.suite("Logger")(
  pipe(
    M.mockedTestM("use logger")(() => ({
      info: jest.spyOn(console, "info").mockImplementation(empty),
      warn: jest.spyOn(console, "warn").mockImplementation(empty),
      debug: jest.spyOn(console, "debug").mockImplementation(empty),
      error: jest.spyOn(console, "error").mockImplementation(empty)
    }))(({ useMockM }) =>
      T.Do()
        .do(L.logger.info("ok"))
        .do(L.logger.http("ok"))
        .do(L.logger.debug("ok"))
        .do(L.logger.silly("ok"))
        .do(L.logger.verbose("ok"))
        .do(L.logger.warn("ok"))
        .do(L.logger.error("ok"))
        .do(L.logger.error("ok", { foo: "ok" }))
        .do(
          useMockM(({ debug, error, info, warn }) =>
            T.sync(() => {
              M.assert.deepStrictEqual(info.mock.calls.length, 2)
              M.assert.deepStrictEqual(debug.mock.calls.length, 3)
              M.assert.deepStrictEqual(error.mock.calls.length, 2)
              M.assert.deepStrictEqual(warn.mock.calls.length, 1)
            })
          )
        )
        .done()
    ),
    M.withProvider(L.console.provideConsoleLogger),
    M.withProvider(L.console.provideConsoleLoggerConfig())
  ),
  pipe(
    M.mockedTestM("use logger with level")(() => ({
      debug: jest.spyOn(console, "debug").mockImplementation(empty)
    }))(({ useMockM }) =>
      T.Do()
        .do(L.logger.debug("ok"))
        .do(
          useMockM(({ debug }) =>
            T.sync(() => {
              assert.deepStrictEqual(debug.mock.calls.length, 0)
            })
          )
        )
        .done()
    ),
    M.withProvider(L.console.provideConsoleLogger),
    M.withProvider(L.console.provideConsoleLoggerConfig({ level: "warn" }))
  )
)

M.run(loggerSpec)()
