import AX, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import * as T from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";

export interface HttpClient {
  http: {
    post<E, A>(
      url: string,
      data: unknown,
      config?: AxiosRequestConfig
    ): T.Effect<T.NoEnv, AxiosError<E>, AxiosResponse<A>>;
    get<E, A>(
      url: string,
      config?: AxiosRequestConfig
    ): T.Effect<T.NoEnv, AxiosError<E>, AxiosResponse<A>>;
  };
}

export const httpClient: (X?: typeof AX) => HttpClient = (X = AX) => ({
  http: {
    post<E, A>(
      url: string,
      data: unknown,
      config?: AxiosRequestConfig
    ): T.Effect<T.NoEnv, AxiosError<E>, AxiosResponse<A>> {
      return pipe(
        () => X.post(url, data, config),
        T.fromPromiseMap(e => e as AxiosError<E>)
      );
    },
    get<E, A>(
      url: string,
      config?: AxiosRequestConfig
    ): T.Effect<T.NoEnv, AxiosError<E>, AxiosResponse<A>> {
      return pipe(
        () => X.get(url, config),
        T.fromPromiseMap(e => e as AxiosError<E>)
      );
    }
  }
});

export function post<E, A>(
  url: string,
  data: unknown,
  config?: AxiosRequestConfig
): T.Effect<HttpClient, AxiosError<E>, AxiosResponse<A>> {
  return T.accessM(({ http }: HttpClient) => http.post(url, data, config));
}

export function get<E, A>(
  url: string,
  config?: AxiosRequestConfig
): T.Effect<HttpClient, AxiosError<E>, AxiosResponse<A>> {
  return T.accessM(({ http }: HttpClient) => http.get(url, config));
}
