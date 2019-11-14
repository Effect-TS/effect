import * as _ from "../src";
import * as E from "fp-ts/lib/Either";
import * as assert from "assert";

describe("Effect", () => {
  describe("bracket", () => {
    let log: Array<string> = [];

    const acquireFailure = _.left("acquire failure");
    const acquireSuccess = _.right({ res: "acquire success" });
    const useSuccess = () => _.right("use success");
    const useFailure = () => _.left("use failure");
    const releaseSuccess = () =>
      _.liftIO(() => {
        log.push("release success");
      });
    const releaseFailure = () => _.left("release failure");

    beforeEach(() => {
      log = [];
    });

    it("should return the acquire error if acquire fails", async () => {
      const e = await _.run(
        _.bracket(acquireFailure, useSuccess, releaseSuccess)
      )();

      assert.deepStrictEqual(e, E.left("acquire failure"));
    });

    it("body and release must not be called if acquire fails", async () => {
      await _.run(_.bracket(acquireFailure, useSuccess, releaseSuccess))();
      assert.deepStrictEqual(log, []);
    });

    it("should return the use error if use fails and release does not", async () => {
      const e = await _.run(
        _.bracket(acquireSuccess, useFailure, releaseSuccess)
      )();
      assert.deepStrictEqual(e, E.left("use failure"));
    });

    it("should return the release error if both use and release fail", async () => {
      const e = await _.run(_.bracket(acquireSuccess, useFailure, releaseFailure))();
      assert.deepStrictEqual(e, E.left("release failure"));
    });

    it("release must be called if the body returns", async () => {
      await _.run(_.bracket(acquireSuccess, useSuccess, releaseSuccess))();
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("release must be called if the body throws", async () => {
      await _.run(_.bracket(acquireSuccess, useFailure, releaseSuccess))();
      assert.deepStrictEqual(log, ["release success"]);
    });

    it("should return the release error if release fails", async () => {
      const e = await _.run(_.bracket(acquireSuccess, useSuccess, releaseFailure))();
      assert.deepStrictEqual(e, E.left("release failure"));
    });
  });
});
