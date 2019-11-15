import * as T from "@matechs/effect";
import AX, { AxiosRequestConfig, AxiosResponse } from "axios";
import { httpClient, post } from "../src";
import * as assert from "assert";
import * as E from "fp-ts/lib/Either";

describe("Http", () => {
  it("should call axios post", async () => {
    const mockAxios: typeof AX = {
      post<T = any, R = AxiosResponse<T>>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
      ): Promise<R> {
        return Promise.reject(new Error("not implemented"));
      }
    } as typeof AX;

    const res = await T.run(
      T.provide(httpClient(mockAxios))(post("url", {}))
    )();

    assert.deepEqual(res, E.left(T.error("not implemented")));
  });
});
