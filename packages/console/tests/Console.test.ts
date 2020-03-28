import { effect as T } from "@matechs/effect";
import * as M from "@matechs/test-jest";
import { pipe } from "fp-ts/lib/pipeable";
import * as C from "../src";

const withConsoleTest = (method: jest.FunctionPropertyNames<Required<Console>>) =>
  M.withHook(
    T.sync(() => ({
      mock: jest.spyOn(console, method).mockImplementation(() => {}),
    })),
    ({ mock }) =>
      T.sync(() => {
        const l = mock.mock.calls.length;

        mock.mockReset();

        M.assert.deepEqual(l, 1);
      })
  );

const consoleSpec = M.suite("Console")(
  pipe(M.testM("assert", C.assert(1)), withConsoleTest("assert")),
  pipe(M.testM("clear", C.clear), withConsoleTest("clear")),
  pipe(M.testM("count", C.count()), withConsoleTest("count")),
  pipe(M.testM("countReset", C.countReset()), withConsoleTest("countReset")),
  pipe(M.testM("debug", C.debug()), withConsoleTest("debug")),
  pipe(M.testM("dir", C.dir({})), withConsoleTest("dir")),
  pipe(M.testM("dirxml", C.dirxml({})), withConsoleTest("dirxml")),
  pipe(M.testM("error", C.error()), withConsoleTest("error")),
  pipe(M.testM("group", C.group()), withConsoleTest("group")),
  pipe(M.testM("groupCollapsed", C.groupCollapsed()), withConsoleTest("groupCollapsed")),
  pipe(M.testM("groupEnd", C.groupEnd), withConsoleTest("groupEnd")),
  pipe(M.testM("info", C.info()), withConsoleTest("info")),
  pipe(M.testM("log", C.log()), withConsoleTest("log")),
  pipe(M.testM("table", C.table({})), withConsoleTest("table")),
  pipe(M.testM("time", C.time()), withConsoleTest("time")),
  pipe(M.testM("timeEnd", C.timeEnd()), withConsoleTest("timeEnd")),
  pipe(M.testM("timeLog", C.timeLog()), withConsoleTest("timeLog")),
  pipe(M.testM("trace", C.trace()), withConsoleTest("trace")),
  pipe(M.testM("warn", C.warn()), withConsoleTest("warn"))
);

M.run(consoleSpec)(C.provideConsole);
