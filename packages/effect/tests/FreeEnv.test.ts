import assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";
import { freeEnv as F, effect as T } from "../src";
import { done } from "../src/original/exit";

const fnEnv: unique symbol = Symbol();

interface FnEnv {
  [fnEnv]: {
    mapString: (s: string) => T.UIO<string>;
  };
}

const fnLive: FnEnv = {
  [fnEnv]: {
    mapString: s => T.pure(`(${s})`)
  }
};

const {
  [fnEnv]: { mapString }
} = F.access(fnLive);

const consoleEnv: unique symbol = Symbol();

const consoleM = F.define({
  [consoleEnv]: {
    log: F.fn<(s: string) => T.RUIO<FnEnv, void>>(),
    get: F.cn<T.UIO<string[]>>()
  }
});

type Console = F.TypeOf<typeof consoleM>;

const {
  [consoleEnv]: { log, get }
} = F.access(consoleM);

const prefixEnv: unique symbol = Symbol();

const prefixM = F.define({
  [prefixEnv]: {
    accessPrefix: F.cn<T.UIO<string>>()
  }
});

const {
  [prefixEnv]: { accessPrefix }
} = F.access(prefixM);

const configEnv: unique symbol = Symbol();

const configM = F.define({
  [configEnv]: {
    accessConfig: F.cn<T.UIO<string>>()
  }
});

const {
  [configEnv]: { accessConfig }
} = F.access(configM);

const messages: string[] = [];
const messages2: string[] = [];

const consoleI = F.implement(consoleM)({
  [consoleEnv]: {
    log: s =>
      pipe(
        accessPrefix,
        T.chain(prefix => mapString(`${prefix}${s}`)),
        T.chain(s =>
          T.sync(() => {
            messages.push(s);
          })
        )
      ),
    get: pipe(
      accessConfig,
      T.chain(_ => T.pure(messages))
    )
  }
});

const consoleI2 = F.implement(consoleM)({
  [consoleEnv]: {
    log: s =>
      T.sync(() => {
        messages2.push(`${s}`);
      }),
    get: T.pure(messages2)
  }
});

const program: T.RUIO<Console & FnEnv, string[]> = pipe(
  log("message"),
  T.chain(_ => get)
);

describe("Generic", () => {
  it("use generic module", async () => {
    const prefixI = F.implement(prefixM)({
      [prefixEnv]: {
        accessPrefix: T.pure("prefix: ")
      }
    });

    const configI = F.implement(configM)({
      [configEnv]: {
        accessConfig: T.pure("")
      }
    });

    const main = pipe(program, consoleI, prefixI, configI);

    assert.deepEqual(
      await T.runToPromiseExit(T.provideAll(fnLive)(main)),
      done(["(prefix: message)"])
    );
  });

  it("use generic module (different interpreter)", async () => {
    const main = pipe(program, consoleI2);

    assert.deepEqual(
      await T.runToPromiseExit(T.provideAll(fnLive)(main)),
      done(["message"])
    );
  });

  it("use generic module (different interpreter, not need fnEnv)", async () => {
    const main = pipe(get, consoleI2);

    assert.deepEqual(await T.runToPromiseExit(main), done(["message"]));
  });
});
