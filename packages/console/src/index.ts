import { eff as EFF, freeEnv as F } from "@matechs/effect";

export const consoleURI = "@matechs/console/consoleURI";

type Void = EFF.Eff<never, unknown, never, void>;

const Console_ = F.define({
  [consoleURI]: {
    assert: F.fn<(value: any, message?: string, ...optionalParams: any[]) => Void>(),
    time: F.fn<(label?: string) => Void>(),
    clear: F.cn<Void>(),
    info: F.fn<(message?: any, ...optionalParams: any[]) => Void>(),
    count: F.fn<(label?: string) => Void>(),
    countReset: F.fn<(label?: string) => Void>(),
    debug: F.fn<(message?: any, ...optionalParams: any[]) => Void>(),
    dir: F.fn<(obj: any, options?: NodeJS.InspectOptions) => Void>(),
    dirxml: F.fn<(...data: any[]) => Void>(),
    error: F.fn<(message?: any, ...optionalParams: any[]) => Void>(),
    group: F.fn<(...label: any[]) => Void>(),
    groupCollapsed: F.fn<(...label: any[]) => Void>(),
    groupEnd: F.cn<Void>(),
    log: F.fn<(message?: any, ...optionalParams: any[]) => Void>(),
    table: F.fn<(tabularData: any, properties?: string[]) => Void>(),
    timeEnd: F.fn<(label?: string) => Void>(),
    timeLog: F.fn<(label?: string, ...data: any[]) => Void>(),
    trace: F.fn<(message?: any, ...optionalParams: any[]) => Void>(),
    warn: F.fn<(message?: any, ...optionalParams: any[]) => Void>()
  }
});

export interface Console extends F.TypeOf<typeof Console_> {}

export const Console = F.opaque<Console>()(Console_);

export const provideConsoleEff = F.implementEff(Console)({
  [consoleURI]: {
    assert: (v, m, ...o) => EFF.sync(() => console.assert(v, m, ...o)),
    clear: EFF.sync(() => console.clear()),
    count: (l) => EFF.sync(() => console.count(l)),
    countReset: (l) => EFF.sync(() => console.countReset(l)),
    debug: (m, ...o) => EFF.sync(() => console.debug(m, ...o)),
    dir: (ob, op) => EFF.sync(() => console.dir(ob, op)),
    dirxml: (...d) => EFF.sync(() => console.dirxml(...d)),
    error: (m, ...o) => EFF.sync(() => console.error(m, ...o)),
    group: (...l) => EFF.sync(() => console.group(...l)),
    groupCollapsed: (...l) => EFF.sync(() => console.groupCollapsed(...l)),
    groupEnd: EFF.sync(() => console.groupEnd()),
    info: (m, ...o) => EFF.sync(() => console.info(m, ...o)),
    log: (m, ...o) => EFF.sync(() => console.log(m, ...o)),
    table: (t, p) => EFF.sync(() => console.table(t, p)),
    time: (l) => EFF.sync(() => console.time(l)),
    timeEnd: (l) => EFF.sync(() => console.timeEnd(l)),
    timeLog: (l, ...d) => EFF.sync(() => console.timeLog(l, ...d)),
    trace: (m, ...o) => EFF.sync(() => console.trace(m, ...o)),
    warn: (m, ...o) => EFF.sync(() => console.warn(m, ...o))
  }
});

export const provideConsole = EFF.providerToEffect(provideConsoleEff);

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
