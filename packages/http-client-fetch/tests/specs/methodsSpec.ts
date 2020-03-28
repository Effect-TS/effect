import { effect as T, managed as M } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import * as H from "@matechs/http-client";
import * as J from "@matechs/test-jest";
import express from "express";
import { Do } from "fp-ts-contrib/lib/Do";
import { some } from "fp-ts/lib/Option";
import { expressM } from "../resources/expressM";

/* istanbul ignore file */

export const methodsSpec = J.testM(
  "post-patch-put-del",
  M.use(expressM(4011), ({ app }) =>
    Do(T.effect)
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
            foo: "bar",
          })
        )
      )
      .bindL("postNoBody", () =>
        T.result(H.post("http://127.0.0.1:4011/post", {}))
      )
      .bindL("put", () =>
        T.result(
          H.put("http://127.0.0.1:4011/put", {
            foo: "bar",
          })
        )
      )
      .bindL("patch", () =>
        T.result(
          H.patch("http://127.0.0.1:4011/patch", {
            foo: "bar",
          })
        )
      )
      .bindL("del", () =>
        T.result(H.del("http://127.0.0.1:4011/delete", { foo: "bar" }))
      )
      .return(({ del, patch, post, postNoBody, put }) => {
        J.assert.deepEqual(isDone(post), true);
        J.assert.deepEqual(
          isDone(post) && post.value.body,
          some({ foo: "bar" })
        );

        J.assert.deepEqual(isDone(postNoBody), true);
        J.assert.deepEqual(
          isDone(postNoBody) && postNoBody.value.body,
          some({})
        );

        J.assert.deepEqual(isDone(put), true);
        J.assert.deepEqual(isDone(put) && put.value.body, some({ foo: "bar" }));

        J.assert.deepEqual(isDone(patch), true);
        J.assert.deepEqual(
          isDone(patch) && patch.value.body,
          some({ foo: "bar" })
        );

        J.assert.deepEqual(isDone(del), true);
        J.assert.deepEqual(isDone(del) && del.value.body, some({ foo: "bar" }));
      })
  )
);
