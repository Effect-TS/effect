import { T, Ex, O, M } from "@matechs/prelude";
import * as H from "@matechs/http-client";
import * as J from "@matechs/test-jest";
import express from "express";
import { expressM } from "../resources/expressM";

/* istanbul ignore file */

export const methodsSpec = J.testM(
  "post-patch-put-del",
  M.use(expressM(4011), ({ app }) =>
    T.Do()
      .do(
        T.sync(() => {
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
        })
      )
      .bindL("post", () =>
        T.result(
          H.post("http://127.0.0.1:4011/post", {
            foo: "bar"
          })
        )
      )
      .bindL("postNoBody", () => T.result(H.post("http://127.0.0.1:4011/post", {})))
      .bindL("put", () =>
        T.result(
          H.put("http://127.0.0.1:4011/put", {
            foo: "bar"
          })
        )
      )
      .bindL("patch", () =>
        T.result(
          H.patch("http://127.0.0.1:4011/patch", {
            foo: "bar"
          })
        )
      )
      .bindL("del", () => T.result(H.del("http://127.0.0.1:4011/delete", { foo: "bar" })))
      .return(({ del, patch, post, postNoBody, put }) => {
        J.assert.deepStrictEqual(Ex.isDone(post), true);
        J.assert.deepStrictEqual(Ex.isDone(post) && post.value.body, O.some({ foo: "bar" }));

        J.assert.deepStrictEqual(Ex.isDone(postNoBody), true);
        J.assert.deepStrictEqual(Ex.isDone(postNoBody) && postNoBody.value.body, O.some({}));

        J.assert.deepStrictEqual(Ex.isDone(put), true);
        J.assert.deepStrictEqual(Ex.isDone(put) && put.value.body, O.some({ foo: "bar" }));

        J.assert.deepStrictEqual(Ex.isDone(patch), true);
        J.assert.deepStrictEqual(Ex.isDone(patch) && patch.value.body, O.some({ foo: "bar" }));

        J.assert.deepStrictEqual(Ex.isDone(del), true);
        J.assert.deepStrictEqual(Ex.isDone(del) && del.value.body, O.some({ foo: "bar" }));
      })
  )
);
