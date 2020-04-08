import { freeEnv as F } from "@matechs/effect";
import { consoleURI, Console, provideConsole as provideConsoleT } from "./console";

export const provideConsole = F.providerEff(provideConsoleT, "s");

export const {
  [consoleURI]: {
    assert,
    time,
    clear,
    info,
    count,
    countReset,
    debug,
    dir,
    dirxml,
    error,
    group,
    groupCollapsed,
    groupEnd,
    log,
    table,
    timeEnd,
    timeLog,
    trace,
    warn
  }
} = F.accessEff(Console, {
  [consoleURI]: {
    assert: "s",
    time: "s",
    clear: "s",
    info: "s",
    count: "s",
    countReset: "s",
    debug: "s",
    dir: "s",
    dirxml: "s",
    error: "s",
    group: "s",
    groupCollapsed: "s",
    groupEnd: "s",
    log: "s",
    table: "s",
    timeEnd: "s",
    timeLog: "s",
    trace: "s",
    warn: "s"
  }
});
