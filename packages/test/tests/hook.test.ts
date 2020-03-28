import { assert, testM, customRun, withHook, withInit } from "../src";
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
    )
  )
)(
  T.provideS<TestValue>({
    test: {
      value: "initial"
    }
  })
);
