import { effect as T } from "@matechs/effect";
import * as L from "../src";
import * as M from "@matechs/test-jest";
import { Do } from "fp-ts-contrib/lib/Do";

// tslint:disable-next-line: no-empty
const empty = () => {};

const loggerSpec = M.suite("Logger")(
  M.mockedTestM("use logger")(() => ({
    info: jest.spyOn(console, "info").mockImplementation(empty),
    warn: jest.spyOn(console, "warn").mockImplementation(empty),
    debug: jest.spyOn(console, "debug").mockImplementation(empty),
    error: jest.spyOn(console, "error").mockImplementation(empty),
  }))(({ useMockM }) =>
    Do(T.effect)
      .do(L.logger.info("ok"))
      .do(L.logger.http("ok"))
      .do(L.logger.debug("ok"))
      .do(L.logger.silly("ok"))
      .do(L.logger.verbose("ok"))
      .do(L.logger.warn("ok"))
      .do(L.logger.error("ok"))
      .do(L.logger.error("ok", { foo: "ok" }))
      .do(
        useMockM(({ info, debug, error, warn }) =>
          T.sync(() => {
            M.assert.deepEqual(info.mock.calls.length, 2);
            M.assert.deepEqual(debug.mock.calls.length, 3);
            M.assert.deepEqual(error.mock.calls.length, 2);
            M.assert.deepEqual(warn.mock.calls.length, 1);
          })
        )
      )
      .done()
      .fluent()
      .provideS(L.console.consoleLogger())
  ),
  M.mockedTestM("use logger with level")(() => ({
    debug: jest.spyOn(console, "debug").mockImplementation(empty),
  }))(({ useMockM }) =>
    Do(T.effect)
      .do(L.logger.debug("ok"))
      .do(
        useMockM(({ debug }) =>
          T.sync(() => {
            M.assert.deepEqual(debug.mock.calls.length, 0);
          })
        )
      )
      .done()
      .fluent()
      .provideS(L.console.consoleLogger(T.pure({ level: "warn" })))
  )
);

M.run(loggerSpec)();
