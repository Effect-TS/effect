import assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";
import { freeEnv as F, effect as T, utils as U } from "../src";
import { done } from "../src/original/exit";
import { sequenceS } from "fp-ts/lib/Apply";

const fnEnv: unique symbol = Symbol();

const fnEnvM_ = F.define({
  [fnEnv]: {
    mapString: F.fn<(s: string) => T.Sync<string>>()
  }
});

interface FnEnv extends F.TypeOf<typeof fnEnvM_> {}

const fnEnvM = F.opaque<FnEnv>()(fnEnvM_);

const fnLive: FnEnv = {
  [fnEnv]: {
    mapString: (s) => T.pure(`(${s})`)
  }
};

const {
  [fnEnv]: { mapString }
} = F.access(fnEnvM);

const consoleEnv: unique symbol = Symbol();

const consoleM = F.define({
  [consoleEnv]: {
    log: F.fn<(s: string) => T.SyncR<FnEnv, void>>(),
    get: F.cn<T.Sync<string[]>>()
  }
});

type Console = F.TypeOf<typeof consoleM>;

const {
  [consoleEnv]: { log, get }
} = F.access(consoleM);

const prefixEnv: unique symbol = Symbol();

const prefixM = F.define({
  [prefixEnv]: {
    accessPrefix: F.cn<T.Sync<string>>()
  }
});

const {
  [prefixEnv]: { accessPrefix }
} = F.access(prefixM);

const configEnv: unique symbol = Symbol();

const configM = F.define({
  [configEnv]: {
    accessConfig: F.cn<T.Sync<string>>()
  }
});

const {
  [configEnv]: { accessConfig }
} = F.access(configM);

const messages: string[] = [];
const messages2: string[] = [];

const consoleI = F.implement(consoleM)({
  [consoleEnv]: {
    log: (s) =>
      pipe(
        accessPrefix,
        T.chain((prefix) => mapString(`${prefix}${s}`)),
        T.chain((s) =>
          T.sync(() => {
            messages.push(s);
          })
        )
      ),
    get: pipe(
      accessConfig,
      T.chain((_) => T.pure(messages))
    )
  }
});

const consoleI2 = F.implement(consoleM)({
  [consoleEnv]: {
    log: (s) =>
      T.sync(() => {
        messages2.push(`${s}`);
      }),
    get: T.pure(messages2)
  }
});

const program: T.SyncR<Console & FnEnv, string[]> = pipe(
  log("message"),
  T.chain((_) => get)
);

describe("Generic", () => {
  it("use generic module", async () => {
    const prefixI = F.implement(prefixM)({
      [prefixEnv]: {
        accessPrefix: T.pure("prefix: ")
      }
    });

    const main = pipe(program, consoleI, prefixI);

    assert.deepEqual(
      await T.runToPromiseExit(
        T.provideS<U.Env<typeof main>>({
          ...fnLive,
          ...F.instance(configM)({
            [configEnv]: {
              accessConfig: T.pure("")
            }
          })
        })(main)
      ),
      done(["(prefix: message)"])
    );
  });

  it("use generic module (different interpreter)", async () => {
    const main = pipe(program, consoleI2);

    assert.deepEqual(await T.runToPromiseExit(T.provideS(fnLive)(main)), done(["message"]));
  });

  it("use generic module (different interpreter, not need fnEnv)", async () => {
    const main = pipe(get, consoleI2);

    assert.deepEqual(await T.runToPromiseExit(main), done(["message"]));
  });

  it("merge specs", async () => {
    const envA: unique symbol = Symbol();
    const envB: unique symbol = Symbol();

    const modA = F.define({
      [envA]: {
        foo: F.cn<T.Sync<string>>()
      }
    });

    const modB = F.define({
      [envB]: {
        bar: F.cn<T.Sync<string>>()
      }
    });

    const m = F.merge({ modA, modB });

    const {
      [envA]: { foo },
      [envB]: { bar }
    } = F.access(m);

    const impl = F.implement(m)({
      [envA]: {
        foo: T.pure("a")
      },
      [envB]: {
        bar: T.pure("b")
      }
    });

    assert.deepEqual(
      await T.runToPromiseExit(pipe(sequenceS(T.effect)({ foo, bar }), impl)),
      done({ foo: "a", bar: "b" })
    );
  });
});
