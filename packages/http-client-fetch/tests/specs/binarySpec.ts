import { effect as T, exit as E, managed as M } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as J from "@matechs/test-jest";
import express from "express";
import { Do } from "fp-ts-contrib/lib/Do";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { expressM } from "../resources/expressM";

/* istanbul ignore file */

export const binarySpec = J.testM(
  "binary",
  M.use(expressM(4017), ({ app }) =>
    Do(T.effect)
      .do(
        T.sync(() => {
          app.use("/binary", express.raw(), (req, res) => {
            const body = req.body as Buffer;
            res.send(body);
          });
        })
      )
      .bindL("post", () =>
        T.result(
          H.postBinaryGetBinary("http://127.0.0.1:4017/binary", Buffer.from(`{ foo: "bar" }`))
        )
      )
      .bindL("put", () =>
        T.result(
          H.putBinaryGetBinary("http://127.0.0.1:4017/binary", Buffer.from(`{ foo: "bar" }`))
        )
      )
      .bindL("patch", () =>
        T.result(
          H.patchBinaryGetBinary("http://127.0.0.1:4017/binary", Buffer.from(`{ foo: "bar" }`))
        )
      )
      .bindL("del", () => T.result(H.delBinaryGetBinary("http://127.0.0.1:4017/binary")))
      .return(({ put, post, patch, del }) => {
        const binaryString = (b: O.Option<Buffer>): O.Option<string> =>
          pipe(
            b,
            O.map((b) => b.toString("utf-8"))
          );

        J.assert.deepEqual(E.isDone(post), true);
        J.assert.deepEqual(
          E.isDone(post) && binaryString(post.value.body),
          O.some(`{ foo: \"bar\" }`)
        );

        J.assert.deepEqual(E.isDone(put), true);
        J.assert.deepEqual(
          E.isDone(put) && binaryString(put.value.body),
          O.some(`{ foo: \"bar\" }`)
        );

        J.assert.deepEqual(E.isDone(patch), true);
        J.assert.deepEqual(
          E.isDone(patch) && binaryString(patch.value.body),
          O.some(`{ foo: \"bar\" }`)
        );

        J.assert.deepEqual(E.isDone(del), true);
        J.assert.deepEqual(E.isDone(del) && binaryString(del.value.body), O.some(``));
      })
  )
);
