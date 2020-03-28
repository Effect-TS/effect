import { effect as T, exit as E, managed as M } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as J from "@matechs/test-jest";
import express from "express";
import { Do } from "fp-ts-contrib/lib/Do";
import * as O from "fp-ts/lib/Option";
import { expressM } from "../resources/expressM";

/* istanbul ignore file */

export const dataSpec = J.testM(
  "data",
  M.use(expressM(4013), ({ app }) =>
    Do(T.effect)
      .do(
        T.sync(() => {
          app.use(
            "/data",
            express.urlencoded({ extended: true }),
            (req, res) => {
              res.send({
                foo: req.body["foo"],
              });
            }
          );
        })
      )
      .bindL("post", () =>
        T.result(H.postData("http://127.0.0.1:4013/data", { foo: "bar" }))
      )
      .bindL("put", () =>
        T.result(H.postData("http://127.0.0.1:4013/data", { foo: "bar" }))
      )
      .bindL("patch", () =>
        T.result(H.postData("http://127.0.0.1:4013/data", { foo: "bar" }))
      )
      .bindL("del", () =>
        T.result(H.postData("http://127.0.0.1:4013/data", { foo: "bar" }))
      )
      .return(({ put, post, patch, del }) => {
        J.assert.deepEqual(E.isDone(post), true);
        J.assert.deepEqual(
          E.isDone(post) && post.value.body,
          O.some({ foo: "bar" })
        );

        J.assert.deepEqual(E.isDone(put), true);
        J.assert.deepEqual(
          E.isDone(put) && put.value.body,
          O.some({ foo: "bar" })
        );

        J.assert.deepEqual(E.isDone(patch), true);
        J.assert.deepEqual(
          E.isDone(patch) && patch.value.body,
          O.some({ foo: "bar" })
        );

        J.assert.deepEqual(E.isDone(del), true);
        J.assert.deepEqual(
          E.isDone(del) && del.value.body,
          O.some({ foo: "bar" })
        );
      })
  )
);
