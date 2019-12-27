import { effect as T, derived as D } from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import assert from "assert";
import { done } from "../src/original/exit";

const consoleEnv: unique symbol = Symbol();

const consoleM = D.generic({
  [consoleEnv]: {
    log: D.fn<(s: string) => T.UIO<void>>(),
    get: D.cn<T.UIO<string[]>>()
  }
});

type Console = D.TypeOf<typeof consoleM>;

const { log, get } = D.derive(consoleM);

const prefixEnv: unique symbol = Symbol();

const prefixM = D.generic({
  [prefixEnv]: {
    accessPrefix: D.cn<T.UIO<string>>()
  }
});

const { accessPrefix } = D.derive(prefixM);

const messages: string[] = [];
const messages2: string[] = [];

const consoleI = D.interpreter(consoleM)(() => ({
  [consoleEnv]: {
    log: s =>
      pipe(
        accessPrefix,
        T.chain(prefix =>
          T.sync(() => {
            messages.push(`${prefix}${s}`);
          })
        )
      ),
    get: T.pure(messages)
  }
}));

const consoleI2 = D.interpreter(consoleM)(() => ({
  [consoleEnv]: {
    log: s =>
      T.sync(() => {
        messages2.push(`${s}`);
      }),
    get: T.pure(messages2)
  }
}));

const program: T.RUIO<Console, string[]> = pipe(
  log("message"),
  T.chain(_ => get)
);

describe("Generic", () => {
  it("use generic module", async () => {
    const prefixI = D.interpreter(prefixM)(() => ({
      [prefixEnv]: {
        accessPrefix: T.pure("prefix: ")
      }
    }));

    const main = pipe(program, consoleI, prefixI);

    assert.deepEqual(await T.runToPromiseExit(main), done(["prefix: message"]));
  });

  it("use generic module (different interpreter)", async () => {
    const main = pipe(program, consoleI2);

    assert.deepEqual(await T.runToPromiseExit(main), done(["message"]));
  });
});
