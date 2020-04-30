import { assert, testM, run, suite, mockedTestM } from "../src";
import { effect as T } from "@matechs/effect";
import { Do } from "fp-ts-contrib/lib/Do";

run(
  testM(
    "simple root",
    T.sync(() => assert.deepStrictEqual(2, 2))
  )
)();

run(
  suite("jest mock")(
    mockedTestM("test using mocked console")(() => ({
      info: jest.spyOn(console, "info").mockImplementation(() => {})
    }))(({ useMockM }) =>
      Do(T.effect)
        .do(
          T.sync(() => {
            console.info("ok");
          })
        )
        .do(
          useMockM(({ info }) =>
            T.sync(() => {
              expect(info.mock.calls).toEqual([["ok"]]);
            })
          )
        )
        .done()
    )
  )
)();
