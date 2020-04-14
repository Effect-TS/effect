import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import assert from "assert";
import express from "express";
import { libcurl } from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import { isDone, isRaise, isInterrupt } from "@matechs/effect/lib/exit";
import { Exit } from "@matechs/effect/lib/original/exit";
import { some, map, Option } from "fp-ts/lib/Option";
import { Do } from "fp-ts-contrib/lib/Do";

function run<E, A>(eff: T.AsyncRE<H.RequestEnv, E, A>): Promise<Exit<E, A>> {
  return T.runToPromiseExit(
    pipe(
      eff,
      T.provideS(
        libcurl({
          requestTransformer: (_) => {
            _.setOpt("FORBID_REUSE", 1);
            return _;
          }
        })
      ),
      T.provideS(
        H.middlewareStack([
          H.withPathHeaders({ foo: "bar" }, (path) => path === "http://127.0.0.1:4005/middle", true)
        ])
      )
    )
  );
}

function timer<R, E, A>(_: T.Effect<R, E, A>) {
  return Do(T.effect)
    .bind(
      "s",
      T.sync(() => new Date())
    )
    .bind("r", _)
    .bind(
      "e",
      T.sync(() => new Date())
    )
    .doL(({ s, e }) =>
      T.sync(() => {
        assert.strictEqual(e.getTime() - s.getTime() < 250, true);
      })
    )
    .return(({ r }) => r);
}

describe("Libcurl", () => {
  jest.setTimeout(10000);

  it("post-patch-put-del", async () => {
    const app = express();

    app.post("/post", express.json(), (req, res) => {
      res.send(req.body);
    });

    app.put("/put", express.json(), (req, res) => {
      res.send(req.body);
    });

    app.patch("/patch", express.json(), (req, res) => {
      res.send(req.body);
    });

    app.delete("/delete", express.json(), (req, res) => {
      res.send(req.body);
    });

    const s = app.listen(4001);

    const post = await run(
      timer(
        H.post("http://127.0.0.1:4001/post", {
          foo: "bar"
        })
      )
    );

    const postText = await run(
      timer(
        H.postReturnText("http://127.0.0.1:4001/post", {
          foo: "bar"
        })
      )
    );

    const postNoBody = await run(timer(H.post("http://127.0.0.1:4001/post", {})));

    const put = await run(
      timer(
        H.put("http://127.0.0.1:4001/put", {
          foo: "bar"
        })
      )
    );

    const patch = await run(
      timer(
        H.patch("http://127.0.0.1:4001/patch", {
          foo: "bar"
        })
      )
    );

    const del = await run(timer(H.del("http://127.0.0.1:4001/delete", { foo: "bar" })));

    await new Promise((res) =>
      s.close(() => {
        res();
      })
    );

    assert.deepEqual(isDone(post), true);
    assert.deepEqual(isDone(post) && post.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(postText), true);
    assert.deepEqual(isDone(postText) && postText.value.body, some(JSON.stringify({ foo: "bar" })));

    assert.deepEqual(isDone(postNoBody), true);
    assert.deepEqual(isDone(postNoBody) && postNoBody.value.body, some({}));

    assert.deepEqual(isDone(put), true);
    assert.deepEqual(isDone(put) && put.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(patch), true);
    assert.deepEqual(isDone(patch) && patch.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(del), true);
    assert.deepEqual(isDone(del) && del.value.body, some({ foo: "bar" }));
  });

  it("get 404", async () => {
    const app = express();

    const s = app.listen(4006);

    const result = await run(
      pipe(
        timer(H.get("http://127.0.0.1:4006/")),
        T.mapError(
          H.foldHttpError(
            (_) => 0,
            ({ status }) => status
          )
        )
      )
    );

    await new Promise((res) =>
      s.close(() => {
        res();
      })
    );

    assert.deepEqual(isRaise(result), true);
    assert.deepEqual(isRaise(result) && result.error, 404);
  });

  it("headers", async () => {
    const app = express();

    app.get("/h", express.json(), (req, res) => {
      res.send({
        foo: req.header("foo")
      });
    });

    const s = app.listen(4002);

    const result = await run(
      pipe(
        timer(H.get("http://127.0.0.1:4002/h")),
        H.withHeaders({
          foo: "bar"
        })
      )
    );

    await new Promise((res) =>
      s.close(() => {
        res();
      })
    );

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(isDone(result) && result.value.body, some({ foo: "bar" }));
  });

  it("headers middleware", async () => {
    const app = express();

    app.get("/middle", express.json(), (req, res) => {
      res.send({
        foo: req.header("foo")
      });
    });

    const s = app.listen(4005);

    const result = await run(timer(H.get("http://127.0.0.1:4005/middle")));

    await new Promise((res) =>
      s.close(() => {
        res();
      })
    );

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(isDone(result) && result.value.body, some({ foo: "bar" }));
  });

  it("replace headers", async () => {
    const app = express();

    app.get("/h", express.json(), (req, res) => {
      res.send({
        foo: req.header("foo"),
        bar: req.header("bar")
      });
    });

    const s = app.listen(4004);

    const result = await run(
      pipe(
        timer(H.get("http://127.0.0.1:4004/h")),
        H.withHeaders(
          {
            foo: "baz"
          },
          true
        ),
        H.withHeaders({
          foo: "bar",
          bar: "baz"
        })
      )
    );

    await new Promise((res) =>
      s.close(() => {
        res();
      })
    );

    assert.deepEqual(isDone(result), true);
    assert.deepEqual(isDone(result) && result.value.body, some({ foo: "baz" }));
  });

  it("data", async () => {
    const app = express();

    app.use("/data", express.urlencoded({ extended: true }), (req, res) => {
      res.send({
        foo: req.body["foo"]
      });
    });

    const s = app.listen(4003);

    const post = await run(timer(H.postData("http://127.0.0.1:4003/data", { foo: "bar" })));

    const put = await run(timer(H.putData("http://127.0.0.1:4003/data", { foo: "bar" })));

    const patch = await run(timer(H.patchData("http://127.0.0.1:4003/data", { foo: "bar" })));

    const del = await run(timer(H.delData("http://127.0.0.1:4003/data", { foo: "bar" })));

    await new Promise((res) =>
      s.close(() => {
        res();
      })
    );

    assert.deepEqual(isDone(post), true);
    assert.deepEqual(isDone(post) && post.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(put), true);
    assert.deepEqual(isDone(put) && put.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(patch), true);
    assert.deepEqual(isDone(patch) && patch.value.body, some({ foo: "bar" }));

    assert.deepEqual(isDone(del), true);
    assert.deepEqual(isDone(del) && del.value.body, some({ foo: "bar" }));
  });

  it.skip("binary", async () => {
    // TODO: make it work
    const app = express();

    app.use("/binary", express.raw(), (req, res) => {
      const body = req.body as Buffer;
      res.send(body);
    });

    const s = app.listen(4017);

    const post = await run(
      pipe(H.postBinaryGetBinary("http://127.0.0.1:4017/binary", Buffer.from(`{ foo: "bar" }`)))
    );

    const put = await run(
      pipe(H.putBinaryGetBinary("http://127.0.0.1:4017/binary", Buffer.from(`{ foo: "bar" }`)))
    );

    const patch = await run(
      pipe(H.patchBinaryGetBinary("http://127.0.0.1:4017/binary", Buffer.from(`{ foo: "bar" }`)))
    );

    const del = await run(pipe(H.delBinaryGetBinary("http://127.0.0.1:4017/binary")));

    await new Promise((res) =>
      s.close(() => {
        res();
      })
    );

    const binaryString = (b: Option<Buffer>): Option<string> =>
      pipe(
        b,
        map((b) => b.toString("utf-8"))
      );

    assert.deepEqual(post, true);
    assert.deepEqual(isDone(post), true);
    assert.deepEqual(isDone(post) && binaryString(post.value.body), some(`{ foo: \"bar\" }`));

    assert.deepEqual(isDone(put), true);
    assert.deepEqual(isDone(put) && binaryString(put.value.body), some(`{ foo: \"bar\" }`));

    assert.deepEqual(isDone(patch), true);
    assert.deepEqual(isDone(patch) && binaryString(patch.value.body), some(`{ foo: \"bar\" }`));

    assert.deepEqual(isDone(del), true);
    assert.deepEqual(isDone(del) && binaryString(del.value.body), some(``)); // TODO: Verify spec; del binary body does not touch the server
  });

  it("get https", async () => {
    const result = await run(H.get("https://jsonplaceholder.typicode.com/todos/1"));

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
    const result = await run(H.get("ht-ps://wrong.com/todos/1"));

    assert.deepEqual(isRaise(result), true);
    assert.deepEqual(
      isRaise(result) && result.error._tag === H.HttpErrorReason.Request && result.error.error,
      new Error("Unsupported protocol")
    );
  });

  it("cancel", async () => {
    let res;

    const cancel = T.run(
      pipe(H.get("https://jsonplaceholder.typicode.com/todos/1"), T.provideS(libcurl())),
      (r) => {
        res = r;
      }
    );

    cancel();

    assert.deepEqual(res && isInterrupt(res), true);
  });
});
