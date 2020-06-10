import assert from "assert"

import { ConsoleLogger, ConsoleLoggerConfig } from "../src/Console"
import * as L from "../src/Logger"

import * as T from "@matechs/core/Effect"
import * as M from "@matechs/test-jest"

// eslint-disable-next-line @typescript-eslint/no-empty-function
const empty = () => {}

const Logger = ConsoleLogger.with(ConsoleLoggerConfig())

const loggerSpec = M.suite("Logger")(
  M.mockedTestM("use logger")(() => ({
    info: jest.spyOn(console, "info").mockImplementation(empty),
    warn: jest.spyOn(console, "warn").mockImplementation(empty),
    debug: jest.spyOn(console, "debug").mockImplementation(empty),
    error: jest.spyOn(console, "error").mockImplementation(empty)
  }))(({ useMockM }) =>
    T.Do()
      .do(L.info("ok"))
      .do(L.http("ok"))
      .do(L.debug("ok"))
      .do(L.silly("ok"))
      .do(L.verbose("ok"))
      .do(L.warn("ok"))
      .do(L.error("ok"))
      .do(L.error("ok", { foo: "ok" }))
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
  M.mockedTestM("use logger with level")(() => ({
    debug: jest.spyOn(console, "debug").mockImplementation(empty)
  }))(({ useMockM }) =>
    T.Do()
      .do(L.debug("ok"))
      .do(
        useMockM(({ debug }) =>
          T.sync(() => {
            assert.deepStrictEqual(debug.mock.calls.length, 0)
          })
        )
      )
      .pipe(ConsoleLogger.with(ConsoleLoggerConfig({ level: "info" })).use)
      .done()
  )
)

M.run(loggerSpec)(Logger.use)
