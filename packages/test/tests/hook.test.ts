import {
  assert,
  testM,
  customRun,
  withHook,
  withHookP,
  withInit,
  withProvider,
  withFinalize,
  implementMock
} from "../src";
import { effect as T, freeEnv as F } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";

const TestValue_ = F.define({
  test: {
    value: F.cn<T.Sync<string>>()
  }
});

interface TestValue extends F.TypeOf<typeof TestValue_> {}

const TestValue = F.opaque<TestValue>()(TestValue_);

const TV = F.access(TestValue)["test"];

customRun({
  describe,
  it: {
    run: it,
    skip: it.skip,
    todo: it.todo
  }
})(
  pipe(
    testM(
      "mock concrete console using hook",
      T.asyncTotal((r) => {
        console.info("mocked");
        r(undefined);
        return () => {
          //
        };
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
      pipe(
        TV.value,
        T.chain((v) =>
          T.sync(() => {
            assert.deepEqual(v, "ok-ok");
          })
        )
      )
    ),
    withHookP(
      T.sync((): TestValue => ({ test: { value: T.pure("ok-ok") } })),
      () => T.unit
    )
  ),
  pipe(
    testM(
      "run initializer",
      T.accessM((_: TestValue) =>
        T.sync(() => {
          assert.deepEqual(_.test.value, T.pure("patched"));
        })
      )
    ),
    withInit(
      T.accessM((_: TestValue) =>
        T.sync(() => {
          _.test.value = T.pure("patched");
        })
      )
    ),
    withProvider(
      implementMock(TestValue)({
        test: {
          value: T.pure("initial")
        }
      })
    )
  ),
  pipe(
    testM(
      "run finalizer",
      pipe(
        TV.value,
        T.chain((v) =>
          T.accessM((_: TestValue) =>
            T.sync(() => {
              assert.deepEqual(v, "initial");
              _.test.value = T.pure("patched");
            })
          )
        )
      )
    ),
    withFinalize(
      pipe(
        TV.value,
        T.chain((v) =>
          T.sync(() => {
            assert.deepEqual(v, "patched");
          })
        )
      )
    ),
    withProvider(
      implementMock(TestValue)({
        test: {
          value: T.pure("initial")
        }
      })
    )
  )
)();
