import { effect as T } from "@matechs/effect";
import * as L from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import * as assert from "assert";
import { isDone } from "@matechs/effect/lib/exit";

// tslint:disable-next-line: no-empty
const empty = () => {};

const withEnv = T.provideAll(L.console.consoleLogger());

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
      isDone(await T.runToPromiseExit(pipe(L.logger.info("ok"), withEnv))),
      true
    );

    assert.deepEqual(info.mock.calls.length, 1);

    assert.deepEqual(
      isDone(await T.runToPromiseExit(pipe(L.logger.http("ok"), withEnv))),
      true
    );

    assert.deepEqual(info.mock.calls.length, 2);

    assert.deepEqual(
      isDone(await T.runToPromiseExit(pipe(L.logger.debug("ok"), withEnv))),
      true
    );

    assert.deepEqual(debug.mock.calls.length, 1);

    assert.deepEqual(
      isDone(await T.runToPromiseExit(pipe(L.logger.silly("ok"), withEnv))),
      true
    );

    assert.deepEqual(debug.mock.calls.length, 2);

    assert.deepEqual(
      isDone(await T.runToPromiseExit(pipe(L.logger.verbose("ok"), withEnv))),
      true
    );

    assert.deepEqual(debug.mock.calls.length, 3);

    assert.deepEqual(
      isDone(await T.runToPromiseExit(pipe(L.logger.warn("ok"), withEnv))),
      true
    );

    assert.deepEqual(warn.mock.calls.length, 1);

    assert.deepEqual(
      isDone(await T.runToPromiseExit(pipe(L.logger.error("ok"), withEnv))),
      true
    );

    assert.deepEqual(error.mock.calls.length, 1);

    assert.deepEqual(
      isDone(
        await T.runToPromiseExit(
          pipe(L.logger.error("ok", { foo: "ok" }), withEnv)
        )
      ),
      true
    );

    assert.deepEqual(error.mock.calls.length, 2);
  });
});
