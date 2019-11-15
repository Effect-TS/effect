import AX from "axios";
import * as T from "@matechs/effect";
import { toError } from "fp-ts/lib/Either";

export interface HttpClient {
  http: {
    post<A>(url: string, data: any): T.Effect<T.NoEnv, Error, A>;
  };
}

export const httpClient: (X: typeof AX) => HttpClient = (X = AX) => ({
  http: {
    post<A>(url: string, data: any): T.Effect<T.NoEnv, Error, A> {
      return T.effectMonad.map(
        T.tryCatch(
          () => X.post(url, data),
          e => {
            if (e.response && e.response.data && e.response.data.message) {
              return new Error(e.response.data.message);
            }
            return toError(e);
          }
        ),
        r => r.data.result
      );
    }
  }
});

export function post<A>(
  url: string,
  data: any
): T.Effect<HttpClient, Error, A> {
  return T.accessM(({ http }: HttpClient) => http.post(url, data));
}
