import { effect as T } from "@matechs/effect";
import * as C from "../src";
import assert from "assert";
import { done } from "@matechs/effect/lib/original/exit";

// tslint:disable: no-empty
describe("Console", () => {
  const assertMock = jest.spyOn(console, "assert");
  const clearMock = jest.spyOn(console, "clear");

  assertMock.mockImplementation(() => {});
  clearMock.mockImplementation(() => {});

  it("assert", async () => {
    assert.deepEqual(await T.runToPromiseExit(T.provideAll(C.consoleLive)(C.assert(1))), done(undefined));
    assert.deepEqual(assertMock.mock.calls.length, 1);
  });

  it("clear", async () => {
    assert.deepEqual(await T.runToPromiseExit(T.provideAll(C.consoleLive)(C.clear)), done(undefined));
    assert.deepEqual(clearMock.mock.calls.length, 1);
  });
});
