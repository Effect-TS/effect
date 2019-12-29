import * as W from "../src";
import * as L from "@matechs/logger";
import { effect as T } from "@matechs/effect";
import * as assert from "assert";
import { createLogger, transports } from "winston";
import { isDone } from "@matechs/effect/lib/exit";
import { pipe } from "fp-ts/lib/pipeable";
import stdMocks from "std-mocks";
import { Level } from "@matechs/logger/lib/logger";

const logger = createLogger({
  transports: [
    new transports.Console({
      level: "silly"
    })
  ]
});

const factory: W.WinstonFactory = {
  [W.winstonFactoryEnv]: {
    logger: T.pure(logger)
  }
};

function testLevel(level: Level) {
  return async () => {
    stdMocks.use();

    const res = await T.runToPromiseExit(
      pipe(L.logger[level](""), W.winstonLogger, T.provideAll(factory))
    );

    const messages = stdMocks.flush();

    stdMocks.restore();

    assert.deepEqual(isDone(res), true);
    assert.deepEqual(
      messages.stdout.map(s => s.trim()),
      [JSON.stringify({ level, message: "" })]
    );
  };
}

describe("Winston", () => {
  it("info", testLevel("info"));
  it("silly", testLevel("silly"));
  it("debug", testLevel("debug"));
  it("error", testLevel("error"));
  it("http", testLevel("http"));
  it("verbose", testLevel("verbose"));
  it("warn", testLevel("warn"));
});
