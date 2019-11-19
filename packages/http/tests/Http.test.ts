import * as T from "@matechs/effect";
import AX, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { get, httpClient, post } from "../src";
import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import express from "express";

const app = express();

app.post("/test", (_, res) => {
  res.send("ok");
});

app.get("/test", (_, res) => {
  res.send("ok");
});

describe("Http", () => {
  it("should use mock", async () => {
    const mockAxios: typeof AX = {
      post<T = any, R = AxiosResponse<T>>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
      ): Promise<R> {
        return Promise.reject(({ response: 1 } as any) as AxiosError<number>);
      }
    } as typeof AX;

    const res = await T.run(
      T.provide(httpClient(mockAxios))(post("url", {}))
    )();

    assert.deepEqual(res, E.left({ response: 1 }));
  });

  it("issue get", async () => {
    const server = app.listen(3001);

    const res = await T.run(
      T.provide(httpClient())(get("http://127.0.0.1:3001/test", {}))
    )();

    server.close();

    assert.deepEqual(E.isRight(res) && res.right.data, "ok");
  });

  it("issue get (404)", async () => {
    const server = app.listen(3001);

    const res = await T.run(
      T.provide(httpClient())(get("http://127.0.0.1:3001/404", {}))
    )();

    server.close();

    assert.deepEqual(E.isLeft(res) && res.left.response.status, 404);
  });
});
