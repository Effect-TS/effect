import {
  assert,
  testM,
  customRun,
  withHook,
  withHookP,
  withInit,
  withProvider,
  withFinalize
} from "../src";
import { effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";

interface TestValue {
  test: {
    value: string;
  };
}

customRun({
  describe,
  it: {
    run: it,
    skip: it.skip
  }
})(
  pipe(
    testM(
      "mock concrete console using hook",
      T.sync(() => {
        console.info("mocked");
      })
    ),
    withHook(
      T.sync(() => {
        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

        return {
          infoSpy
        };
      }),
      ({ infoSpy }) =>
        T.sync(() => {
          const calls = infoSpy.mock.calls.map((c) => c[0]);

          infoSpy.mockRestore();

          assert.deepEqual(calls, ["mocked"]);
        })
    )
  ),
  pipe(
    testM(
      "provide with hook",
      T.access((_: TestValue) => {
        assert.deepEqual(_.test.value, "ok-ok");
      })
    ),
    withHookP(
      T.sync((): TestValue => ({ test: { value: "ok-ok" } })),
      () => T.unit
    )
  ),
  pipe(
    testM(
      "run initializer",
      T.accessM((_: TestValue) =>
        T.sync(() => {
          assert.deepEqual(_.test.value, "patched");
        })
      )
    ),
    withInit(
      T.accessM((_: TestValue) =>
        T.sync(() => {
          _.test.value = "patched";
        })
      )
    ),
    withProvider(
      T.provideS<TestValue>({
        test: {
          value: "initial"
        }
      })
    )
  ),
  pipe(
    testM(
      "run finalizer",
      T.accessM((_: TestValue) =>
        T.sync(() => {
          assert.deepEqual(_.test.value, "initial");
          _.test.value = "patched";
        })
      )
    ),
    withFinalize(
      T.accessM((_: TestValue) =>
        T.sync(() => {
          assert.deepEqual(_.test.value, "patched");
        })
      )
    ),
    withProvider(
      T.provideS<TestValue>({
        test: {
          value: "initial"
        }
      })
    )
  )
)();
