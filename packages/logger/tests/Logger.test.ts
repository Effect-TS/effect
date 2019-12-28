import { effect as T } from "@matechs/effect";
import * as L from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import * as assert from "assert";
import { isDone } from "@matechs/effect/lib/exit";

// tslint:disable-next-line: no-empty
const empty = () => {};

describe("Logger", () => {
  const info = jest.spyOn(console, "info");
  const warn = jest.spyOn(console, "warn");
  const debug = jest.spyOn(console, "debug");
  const error = jest.spyOn(console, "error");

  info.mockImplementation(empty);
  warn.mockImplementation(empty);
  debug.mockImplementation(empty);
  error.mockImplementation(empty);

  it("use logger", async () => {
    assert.deepEqual(
      isDone(
        await T.runToPromiseExit(
          pipe(L.logger.info("ok"), L.console.consoleLogger())
        )
      ),
      true
    );

    assert.deepEqual(info.mock.calls.length, 1);

    assert.deepEqual(
      isDone(
        await T.runToPromiseExit(
          pipe(L.logger.http("ok"), L.console.consoleLogger())
        )
      ),
      true
    );

    assert.deepEqual(info.mock.calls.length, 2);

    assert.deepEqual(
      isDone(
        await T.runToPromiseExit(
          pipe(L.logger.debug("ok"), L.console.consoleLogger())
        )
      ),
      true
    );

    assert.deepEqual(debug.mock.calls.length, 1);

    assert.deepEqual(
      isDone(
        await T.runToPromiseExit(
          pipe(L.logger.silly("ok"), L.console.consoleLogger())
        )
      ),
      true
    );

    assert.deepEqual(debug.mock.calls.length, 2);

    assert.deepEqual(
      isDone(
        await T.runToPromiseExit(
          pipe(L.logger.verbose("ok"), L.console.consoleLogger())
        )
      ),
      true
    );

    assert.deepEqual(debug.mock.calls.length, 3);

    assert.deepEqual(
      isDone(
        await T.runToPromiseExit(
          pipe(L.logger.warn("ok"), L.console.consoleLogger())
        )
      ),
      true
    );

    assert.deepEqual(warn.mock.calls.length, 1);

    assert.deepEqual(
      isDone(
        await T.runToPromiseExit(
          pipe(L.logger.error("ok"), L.console.consoleLogger())
        )
      ),
      true
    );

    assert.deepEqual(error.mock.calls.length, 1);

    assert.deepEqual(
      isDone(
        await T.runToPromiseExit(
          pipe(L.logger.error("ok", { foo: "ok" }), L.console.consoleLogger())
        )
      ),
      true
    );

    assert.deepEqual(error.mock.calls.length, 2);
  });
});
