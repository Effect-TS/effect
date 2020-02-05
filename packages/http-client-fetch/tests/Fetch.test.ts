import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import assert from "assert";
import bodyParser from "body-parser";
import express from "express";
import * as F from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import { isDone, isRaise, isInterrupt } from "@matechs/effect/lib/exit";
import { Exit } from "@matechs/effect/lib/original/exit";
import { some, map, Option } from "fp-ts/lib/Option";
import fetch from "isomorphic-fetch";

function run<E, A>(eff: T.Effect<H.RequestEnv, E, A>): Promise<Exit<E, A>> {
  return T.runToPromiseExit(
    pipe(
      eff,
      T.provide(F.client(fetch)),
      T.provide(
        H.middlewareStack([
          H.withPathHeaders(
            { foo: "bar" },
            path => path === "http://127.0.0.1:4015/middle",
            true
          )
        ])
      )
    )
  );
}

describe("Fetch", () => {
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

    const s = app.listen(4011);

    const post = await run(
      H.post("http://127.0.0.1:4011/post", {
        foo: "bar"
      })
    );

    const postNoBody = await run(H.post("http://127.0.0.1:4011/post", {}));

    const put = await run(
      H.put("http://127.0.0.1:4011/put", {
        foo: "bar"
      })
    );

    const patch = await run(
      H.patch("http://127.0.0.1:4011/patch", {
        foo: "bar"
      })
    );

    const del = await run(
      H.del("http://127.0.0.1:4011/delete")
    );

    s.close();

    assert.deepEqual(isDone(post), true);
    assert.deepEqual(isDone(post) && post.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(postNoBody), true);
    assert.deepEqual(isDone(postNoBody) && postNoBody.value.body, some({}));

    assert.deepEqual(isDone(put), true);
    assert.deepEqual(isDone(put) && put.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(patch), true);
    assert.deepEqual(isDone(patch) && patch.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(del), true);
    assert.deepEqual(isDone(del) && del.value.body, some({ }));
  });

  it("get 404", async () => {
    const app = express();

    const s = app.listen(4016);

    const result = await run(
      pipe(
        H.get("http://127.0.0.1:4016/", undefined),
        T.mapError(
          H.foldHttpError(
            _ => 0,
            ({ status }) => status
          )
        )
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

    const s = app.listen(4012);

    const result = await run(
      pipe(
        H.get("http://127.0.0.1:4012/h", undefined),
        H.withHeaders({
          foo: "bar"
        })
      )
    );

    s.close();

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(isDone(result) && result.value.body, some({ foo: "bar" }));
  });

  it("headers middleware", async () => {
    const app = express();

    app.get("/middle", bodyParser.json(), (req, res) => {
      res.send({
        foo: req.header("foo")
      });
    });

    const s = app.listen(4015);

    const result = await run(
      pipe(H.get("http://127.0.0.1:4015/middle", undefined))
    );

    s.close();

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(isDone(result) && result.value.body, some({ foo: "bar" }));
  });

  it("replace headers", async () => {
    const app = express();

    app.get("/h", bodyParser.json(), (req, res) => {
      res.send({
        foo: req.header("foo"),
        bar: req.header("bar")
      });
    });

    const s = app.listen(4014);

    const result = await run(
      pipe(
        pipe(
          H.get("http://127.0.0.1:4014/h", undefined),
          H.withHeaders(
            {
              foo: "baz"
            },
            true
          )
        ),
        H.withHeaders({
          foo: "bar",
          bar: "baz"
        })
      )
    );

    s.close();

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(isDone(result) && result.value.body, some({ foo: "baz" }));
  });

  it("data", async () => {
    const app = express();

    app.use("/data", bodyParser.urlencoded({ extended: true }), (req, res) => {
      res.send({
        foo: req.body["foo"]
      });
    });

    const s = app.listen(4013);

    const post: Exit<
      H.HttpError<unknown>,
      H.Response<unknown>
    > = await run(
      pipe(H.postData("http://127.0.0.1:4013/data", { foo: "bar" }))
    );

    const put: Exit<
      H.HttpError<unknown>,
      H.Response<unknown>
    > = await run(
      pipe(H.putData("http://127.0.0.1:4013/data", { foo: "bar" }))
    );

    const patch: Exit<
      H.HttpError<unknown>,
      H.Response<unknown>
    > = await run(
      pipe(H.patchData("http://127.0.0.1:4013/data", { foo: "bar" }))
    );

    const del: Exit<
      H.HttpError<unknown>,
      H.Response<unknown>
    > = await run(
      pipe(H.delData("http://127.0.0.1:4013/data"))
    );

    s.close();

    assert.deepEqual(isDone(post), true);
    assert.deepEqual(isDone(post) && post.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(put), true);
    assert.deepEqual(isDone(put) && put.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(patch), true);
    assert.deepEqual(isDone(patch) && patch.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(del), true);
    assert.deepEqual(isDone(del) && del.value.body, some({ }));
  });

  it("binary", async () => {
    const app = express();

    app.use("/binary", bodyParser.raw(), (req, res) => {
      const body = req.body as Buffer;
      res.send(body);
    });

    const s = app.listen(4017);

    const post: Exit<H.HttpError<unknown>, H.Response<Buffer>> = await run(
      pipe(
        H.postBinaryGetBinary(
          "http://127.0.0.1:4017/binary",
          Buffer.from(`{ foo: "bar" }`)
        )
      )
    );

    const put: Exit<H.HttpError<unknown>, H.Response<Buffer>> = await run(
      pipe(
        H.putBinaryGetBinary(
          "http://127.0.0.1:4017/binary",
          Buffer.from(`{ foo: "bar" }`)
        )
      )
    );

    const patch: Exit<H.HttpError<unknown>, H.Response<Buffer>> = await run(
      pipe(
        H.patchBinaryGetBinary(
          "http://127.0.0.1:4017/binary",
          Buffer.from(`{ foo: "bar" }`)
        )
      )
    );

    const del: Exit<H.HttpError<unknown>, H.Response<Buffer>> = await run(
      pipe(
        H.delBinaryGetBinary(
          "http://127.0.0.1:4017/binary"
        )
      )
    );

    s.close();

    const binaryString = (b: Option<Buffer>): Option<string> =>
      pipe(
        b,
        map(b => b.toString("utf-8"))
      );

    assert.deepEqual(isDone(post), true);
    assert.deepEqual(
      isDone(post) && binaryString(post.value.body),
      some(`{ foo: \"bar\" }`)
    );

    assert.deepEqual(isDone(put), true);
    assert.deepEqual(
      isDone(put) && binaryString(put.value.body),
      some(`{ foo: \"bar\" }`)
    );

    assert.deepEqual(isDone(patch), true);
    assert.deepEqual(
      isDone(patch) && binaryString(patch.value.body),
      some(`{ foo: \"bar\" }`)
    );

    assert.deepEqual(isDone(del), true);
    assert.deepEqual(isDone(del) && binaryString(del.value.body), some(``));
  });

  it("get https", async () => {
    const result = await run(
      H.get("https://jsonplaceholder.typicode.com/todos/1", undefined)
    );

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(
      isDone(result) && result.value.body,
      some({
        userId: 1,
        id: 1,
        title: "delectus aut autem",
        completed: false
      })
    );
  });

  it("malformed", async () => {
    const result = await run(H.get("ht-ps://wrong.com/todos/1", undefined));

    assert.deepEqual(isRaise(result), true);
    assert.deepEqual(
      isRaise(result) &&
        result.error._tag === H.HttpErrorReason.Request &&
        result.error.error,
      new Error("only http(s) protocols are supported")
    );
  });

  it("cancel", async () => {
    let res;

    const cancel = T.run(
      pipe(
        H.get("https://jsonplaceholder.typicode.com/todos/1", undefined),
        T.provideAll(F.client(fetch))
      ),
      r => {
        res = r;
      }
    );

    cancel();

    assert.deepEqual(res && isInterrupt(res), true);
  });
});
