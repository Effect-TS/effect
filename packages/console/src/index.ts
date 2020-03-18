import { effect as T, freeEnv as F } from "@matechs/effect";

export const consoleURI = "@matechs/console/consoleURI";

const Console_ = F.define({
  [consoleURI]: {
    assert: F.fn<(value: any, message?: string, ...optionalParams: any[]) => T.UIO<void>>(),
    time: F.fn<(label?: string) => T.UIO<void>>(),
    clear: F.cn<T.UIO<void>>(),
    info: F.fn<(message?: any, ...optionalParams: any[]) => T.UIO<void>>(),
    count: F.fn<(label?: string) => T.UIO<void>>(),
    countReset: F.fn<(label?: string) => T.UIO<void>>(),
    debug: F.fn<(message?: any, ...optionalParams: any[]) => T.UIO<void>>(),
    dir: F.fn<(obj: any, options?: NodeJS.InspectOptions) => T.UIO<void>>(),
    dirxml: F.fn<(...data: any[]) => T.UIO<void>>(),
    error: F.fn<(message?: any, ...optionalParams: any[]) => T.UIO<void>>(),
    group: F.fn<(...label: any[]) => T.UIO<void>>(),
    groupCollapsed: F.fn<(...label: any[]) => T.UIO<void>>(),
    groupEnd: F.cn<T.UIO<void>>(),
    log: F.fn<(message?: any, ...optionalParams: any[]) => T.UIO<void>>(),
    table: F.fn<(tabularData: any, properties?: string[]) => T.UIO<void>>(),
    timeEnd: F.fn<(label?: string) => T.UIO<void>>(),
    timeLog: F.fn<(label?: string, ...data: any[]) => T.UIO<void>>(),
    trace: F.fn<(message?: any, ...optionalParams: any[]) => T.UIO<void>>(),
    warn: F.fn<(message?: any, ...optionalParams: any[]) => T.UIO<void>>()
  }
});

export interface Console extends F.TypeOf<typeof Console_> {}

export const Console = F.opaque<Console>()(Console_);

export const provideConsole = F.implement(Console)({
  [consoleURI]: {
    assert: (v, m, ...o) => T.sync(() => console.assert(v, m, ...o)),
    clear: T.sync(() => console.clear()),
    count: l => T.sync(() => console.count(l)),
    countReset: l => T.sync(() => console.countReset(l)),
    debug: (m, ...o) => T.sync(() => console.debug(m, ...o)),
    dir: (ob, op) => T.sync(() => console.dir(ob, op)),
    dirxml: (...d) => T.sync(() => console.dirxml(...d)),
    error: (m, ...o) => T.sync(() => console.error(m, ...o)),
    group: (...l) => T.sync(() => console.group(...l)),
    groupCollapsed: (...l) => T.sync(() => console.groupCollapsed(...l)),
    groupEnd: T.sync(() => console.groupEnd()),
    info: (m, ...o) => T.sync(() => console.info(m, ...o)),
    log: (m, ...o) => T.sync(() => console.log(m, ...o)),
    table: (t, p) => T.sync(() => console.table(t, p)),
    time: l => T.sync(() => console.time(l)),
    timeEnd: l => T.sync(() => console.timeEnd(l)),
    timeLog: (l, ...d) => T.sync(() => console.timeLog(l, ...d)),
    trace: (m, ...o) => T.sync(() => console.trace(m, ...o)),
    warn: (m, ...o) => T.sync(() => console.warn(m, ...o))
  }
});

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
} = F.access(Console);
