import { effect as T, freeEnv as F } from "@matechs/effect";
import * as M from "@matechs/test-jest";
import { pipe } from "fp-ts/lib/pipeable";
import { consoleEff as C } from "../src";

const withConsoleTest = (method: jest.FunctionPropertyNames<Required<Console>>) =>
  M.withHook(
    T.sync(() => ({
      mock: jest.spyOn(console, method).mockImplementation(() => {})
    })),
    ({ mock }) =>
      T.sync(() => {
        const l = mock.mock.calls.length;

        mock.mockReset();

        M.assert.deepEqual(l, 1);
      })
  );

const consoleSpec = M.suite("Console")(
  pipe(M.testEff("assert", C.assert(1)), withConsoleTest("assert")),
  pipe(M.testEff("clear", C.clear), withConsoleTest("clear")),
  pipe(M.testEff("count", C.count()), withConsoleTest("count")),
  pipe(M.testEff("countReset", C.countReset()), withConsoleTest("countReset")),
  pipe(M.testEff("debug", C.debug()), withConsoleTest("debug")),
  pipe(M.testEff("dir", C.dir({})), withConsoleTest("dir")),
  pipe(M.testEff("dirxml", C.dirxml({})), withConsoleTest("dirxml")),
  pipe(M.testEff("error", C.error()), withConsoleTest("error")),
  pipe(M.testEff("group", C.group()), withConsoleTest("group")),
  pipe(M.testEff("groupCollapsed", C.groupCollapsed()), withConsoleTest("groupCollapsed")),
  pipe(M.testEff("groupEnd", C.groupEnd), withConsoleTest("groupEnd")),
  pipe(M.testEff("info", C.info()), withConsoleTest("info")),
  pipe(M.testEff("log", C.log()), withConsoleTest("log")),
  pipe(M.testEff("table", C.table({})), withConsoleTest("table")),
  pipe(M.testEff("time", C.time()), withConsoleTest("time")),
  pipe(M.testEff("timeEnd", C.timeEnd()), withConsoleTest("timeEnd")),
  pipe(M.testEff("timeLog", C.timeLog()), withConsoleTest("timeLog")),
  pipe(M.testEff("trace", C.trace()), withConsoleTest("trace")),
  pipe(M.testEff("warn", C.warn()), withConsoleTest("warn"))
);

M.run(consoleSpec)(F.providerT(C.provideConsole));
