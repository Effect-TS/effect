import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import assert from "assert";
import bodyParser from "body-parser";
import express from "express";
import { libcurl } from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import { isDone, isRaise, isInterrupt } from "@matechs/effect/lib/exit";

describe("Libcurl", () => {
  it("post-patch-put-del", async () => {
    const app = express();

    app.post("/post", bodyParser.json(), (req, res) => {
      res.send(req.body);
    });

    app.put("/put", bodyParser.json(), (req, res) => {
      res.send(req.body);
    });

    app.patch("/patch", bodyParser.json(), (req, res) => {
      res.send(req.body);
    });

    app.delete("/delete", bodyParser.json(), (req, res) => {
      res.send(req.body);
    });

    const s = app.listen(4001);

    const post = await T.runToPromiseExit(
      pipe(
        H.post("http://127.0.0.1:4001/post", {
          foo: "bar"
        }),
        T.provide(libcurl)
      )
    );
    const postNoBody = await T.runToPromiseExit(
      pipe(H.post("http://127.0.0.1:4001/post"), T.provide(libcurl))
    );
    const put = await T.runToPromiseExit(
      pipe(
        H.put("http://127.0.0.1:4001/put", {
          foo: "bar"
        }),
        T.provide(libcurl)
      )
    );
    const patch = await T.runToPromiseExit(
      pipe(
        H.patch("http://127.0.0.1:4001/patch", {
          foo: "bar"
        }),
        T.provide(libcurl)
      )
    );

    const del = await T.runToPromiseExit(
      pipe(
        H.del("http://127.0.0.1:4001/delete", {
          foo: "bar"
        }),
        T.provide(libcurl)
      )
    );
    s.close();

    assert.deepEqual(isDone(post), true);
    assert.deepEqual(isDone(post) && post.value.body, { foo: "bar" });

    assert.deepEqual(isDone(postNoBody), true);
    assert.deepEqual(isDone(postNoBody) && postNoBody.value.body, {});

    assert.deepEqual(isDone(put), true);
    assert.deepEqual(isDone(put) && put.value.body, { foo: "bar" });

    assert.deepEqual(isDone(patch), true);
    assert.deepEqual(isDone(patch) && patch.value.body, { foo: "bar" });

    assert.deepEqual(isDone(del), true);
    assert.deepEqual(isDone(del) && del.value.body, { foo: "bar" });
  });

  it("get 404", async () => {
    const app = express();

    const s = app.listen(4001);

    const result = await T.runToPromiseExit(
      pipe(
        H.get("http://127.0.0.1:4001/"),
        T.mapError(
          H.foldHttpError(
            _ => 0,
            ({ status }) => status
          )
        ),
        T.provide(libcurl)
      )
    );

    s.close();

    assert.deepEqual(isRaise(result), true);
    assert.deepEqual(isRaise(result) && result.error, 404);
  });

  it("headers", async () => {
    const app = express();

    app.get("/h", bodyParser.json(), (req, res) => {
      res.send({
        foo: req.header("foo")
      });
    });

    const s = app.listen(4002);

    const result = await T.runToPromiseExit(
      pipe(
        H.get<unknown, { foo: string }>("http://127.0.0.1:4002/h"),
        H.withHeaders({
          foo: "bar"
        }),
        T.provide(libcurl)
      )
    );

    s.close();

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(isDone(result) && result.value.body?.foo, "bar");
  });

  it("get https", async () => {
    const result = await T.runToPromiseExit(
      pipe(
        H.get("https://jsonplaceholder.typicode.com/todos/1"),
        T.provide(libcurl)
      )
    );

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(isDone(result) && result.value.body, {
      userId: 1,
      id: 1,
      title: "delectus aut autem",
      completed: false
    });
  });

  it("malformed", async () => {
    const result = await T.runToPromiseExit(
      pipe(H.get("ht-ps://wrong.com/todos/1"), T.provide(libcurl))
    );

    assert.deepEqual(isRaise(result), true);
    assert.deepEqual(
      isRaise(result) &&
        result.error._tag === H.HttpErrorReason.Request &&
        result.error.error,
      new Error("Unsupported protocol")
    );
  });

  it("cancel", async () => {
    let res;

    const cancel = T.run(
      pipe(
        H.get("https://jsonplaceholder.typicode.com/todos/1"),
        T.provide(libcurl)
      ),
      r => {
        res = r;
      }
    );

    cancel();

    assert.deepEqual(res && isInterrupt(res), true);
  });
});
