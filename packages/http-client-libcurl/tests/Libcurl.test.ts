import { effect as T } from "@matechs/effect";
import { done } from "@matechs/effect/lib/original/exit";
import * as H from "@matechs/http-client";
import assert from "assert";
import bodyParser from "body-parser";
import express, { response } from "express";
import { libcurl } from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import { isDone } from "@matechs/effect/lib/exit";

describe("Libcurl", () => {
  it("post", async () => {
    const app = express();

    app.post("/post", bodyParser.json(), (req, res) => {
      res.send(req.body);
    });

    const s = app.listen(4001);

    const result = await T.runToPromiseExit(
      pipe(
        H.post(
          "http://127.0.0.1:4001/post",
          {},
          {
            foo: "bar"
          }
        ),
        T.provide(libcurl)
      )
    );

    s.close();

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(isDone(result) && result.value.body, { foo: "bar" });
  });
});
