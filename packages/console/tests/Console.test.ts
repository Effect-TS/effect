import { effect as T } from "@matechs/effect";
import * as C from "../src";
import assert from "assert";
import { done, Exit } from "@matechs/effect/lib/original/exit";
import { pipe } from "fp-ts/lib/pipeable";

function test<E, A>(eff: T.Effect<C.Console, E, A>): Promise<Exit<E, A>> {
  return T.runToPromiseExit(pipe(eff, C.provideConsole));
}

describe("Console", () => {
  const assertMock = jest.spyOn(console, "assert");
  const clearMock = jest.spyOn(console, "clear");
  const countMock = jest.spyOn(console, "count");
  const countResetMock = jest.spyOn(console, "countReset");
  const debugMock = jest.spyOn(console, "debug");
  const dirMock = jest.spyOn(console, "dir");
  const dirXmlMock = jest.spyOn(console, "dirxml");
  const errorMock = jest.spyOn(console, "error");
  const groupMock = jest.spyOn(console, "group");
  const groupCollapsedMock = jest.spyOn(console, "groupCollapsed");
  const groupEndMock = jest.spyOn(console, "groupEnd");
  const infoMock = jest.spyOn(console, "info");
  const logMock = jest.spyOn(console, "log");
  const tableMock = jest.spyOn(console, "table");
  const timeMock = jest.spyOn(console, "time");
  const timeEndMock = jest.spyOn(console, "timeEnd");
  const timeLogMock = jest.spyOn(console, "timeLog");
  const traceMock = jest.spyOn(console, "trace");
  const warnMock = jest.spyOn(console, "warn");

  assertMock.mockImplementation(() => {});
  clearMock.mockImplementation(() => {});
  countMock.mockImplementation(() => {});
  countResetMock.mockImplementation(() => {});
  debugMock.mockImplementation(() => {});
  dirMock.mockImplementation(() => {});
  dirXmlMock.mockImplementation(() => {});
  errorMock.mockImplementation(() => {});
  groupMock.mockImplementation(() => {});
  groupCollapsedMock.mockImplementation(() => {});
  groupEndMock.mockImplementation(() => {});
  infoMock.mockImplementation(() => {});
  logMock.mockImplementation(() => {});
  tableMock.mockImplementation(() => {});
  timeMock.mockImplementation(() => {});
  timeEndMock.mockImplementation(() => {});
  timeLogMock.mockImplementation(() => {});
  traceMock.mockImplementation(() => {});
  warnMock.mockImplementation(() => {});

  it("assert", async () => {
    assert.deepEqual(await test(C.assert(1)), done(undefined));
    assert.deepEqual(assertMock.mock.calls.length, 1);
  });

  it("clear", async () => {
    assert.deepEqual(await test(C.clear), done(undefined));
    assert.deepEqual(clearMock.mock.calls.length, 1);
  });

  it("count", async () => {
    assert.deepEqual(await test(C.count()), done(undefined));
    assert.deepEqual(countMock.mock.calls.length, 1);
  });

  it("countReset", async () => {
    assert.deepEqual(await test(C.countReset()), done(undefined));
    assert.deepEqual(countResetMock.mock.calls.length, 1);
  });

  it("debug", async () => {
    assert.deepEqual(await test(C.debug()), done(undefined));
    assert.deepEqual(debugMock.mock.calls.length, 1);
  });

  it("dir", async () => {
    assert.deepEqual(await test(C.dir({})), done(undefined));
    assert.deepEqual(dirMock.mock.calls.length, 1);
  });

  it("dirxml", async () => {
    assert.deepEqual(await test(C.dirxml({})), done(undefined));
    assert.deepEqual(dirXmlMock.mock.calls.length, 1);
  });

  it("error", async () => {
    assert.deepEqual(await test(C.error()), done(undefined));
    assert.deepEqual(errorMock.mock.calls.length, 1);
  });

  it("group", async () => {
    assert.deepEqual(await test(C.group()), done(undefined));
    assert.deepEqual(groupMock.mock.calls.length, 1);
  });

  it("groupCollapsed", async () => {
    assert.deepEqual(await test(C.groupCollapsed()), done(undefined));
    assert.deepEqual(groupCollapsedMock.mock.calls.length, 1);
  });

  it("groupEnd", async () => {
    assert.deepEqual(await test(C.groupEnd), done(undefined));
    assert.deepEqual(groupEndMock.mock.calls.length, 1);
  });

  it("info", async () => {
    assert.deepEqual(await test(C.info()), done(undefined));
    assert.deepEqual(infoMock.mock.calls.length, 1);
  });

  it("log", async () => {
    assert.deepEqual(await test(C.log()), done(undefined));
    assert.deepEqual(logMock.mock.calls.length, 1);
  });

  it("table", async () => {
    assert.deepEqual(await test(C.table({})), done(undefined));
    assert.deepEqual(tableMock.mock.calls.length, 1);
  });

  it("time", async () => {
    assert.deepEqual(await test(C.time()), done(undefined));
    assert.deepEqual(timeMock.mock.calls.length, 1);
  });

  it("timeEnd", async () => {
    assert.deepEqual(await test(C.timeEnd()), done(undefined));
    assert.deepEqual(timeEndMock.mock.calls.length, 1);
  });

  it("timeLog", async () => {
    assert.deepEqual(await test(C.timeLog()), done(undefined));
    assert.deepEqual(timeLogMock.mock.calls.length, 1);
  });

  it("trace", async () => {
    assert.deepEqual(await test(C.trace()), done(undefined));
    assert.deepEqual(traceMock.mock.calls.length, 1);
  });

  it("warn", async () => {
    assert.deepEqual(await test(C.warn()), done(undefined));
    assert.deepEqual(warnMock.mock.calls.length, 1);
  });
});
