import * as T from "@matechs/effect";
import AX, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { get, httpClient, post } from "../src";
import * as assert from "assert";
import express from "express";
import { ExitTag } from "waveguide/lib/exit";

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

    assert.deepEqual(res, T.raise({ response: 1 }));
  });

  it("issue get", async () => {
    const server = app.listen(3001);

    const res = await T.run(
      T.provide(httpClient())(get("http://127.0.0.1:3001/test", {}))
    )();

    server.close();

    assert.deepEqual(res._tag === ExitTag.Done && res.value.data, "ok");
  });

  it("issue get (404)", async () => {
    const server = app.listen(3001);

    const res = await T.run(
      T.provide(httpClient())(get("http://127.0.0.1:3001/404", {}))
    )();

    server.close();

    assert.deepEqual(
      res._tag === ExitTag.Raise && res.error.response.status,
      404
    );
  });
});
