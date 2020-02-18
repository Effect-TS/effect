import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import querystring from "querystring";
import { left, right } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { fromNullable } from "fp-ts/lib/Option";

function getContentType(requestType: H.RequestType): string {
  return H.foldRequestType(
    requestType,
    () => "application/json",
    () => "application/x-www-form-urlencoded",
    () => "multipart/form-data",
    () => "application/octet-stream"
  );
}
function getBody(
  body: unknown,
  requestType: H.RequestType
): string | ArrayBuffer | SharedArrayBuffer | FormData {
  return H.foldRequestType(
    requestType,
    () => JSON.stringify(body),
    () => querystring.stringify(body as any),
    () => (body as any) as FormData,
    () => body as Buffer
  );
}

export const httpFetch: (fetchApi: typeof fetch) => H.Http = fetchApi => ({
  [H.httpEnv]: {
    request(
      method: H.Method,
      url: string,
      requestType: H.RequestType,
      responseType: H.ResponseType,
      headers: Record<string, string>,
      body: unknown
    ): T.Effect<T.NoEnv, H.HttpError<string>, H.Response<any>> {
      const input: RequestInit = {
        headers: {
          "Content-Type": getContentType(requestType),
          ...headers
        },
        body: body ? getBody(body, requestType) : undefined,
        method: H.getMethodAsString(method)
      };

      return T.async(r => {
        fetchApi(url, input)
          .then(resp => {
            const h: Record<string, string> = {};

            resp.headers.forEach((val, key) => {
              h[key] = val;
            });

            if (resp.status >= 200 && resp.status < 300) {
              H.foldResponseType(
                responseType,
                () => {
                  resp.json().then((json: unknown) => {
                    r(
                      right({
                        headers: h,
                        status: resp.status,
                        body: fromNullable(json)
                      })
                    );
                  });
                },
                () =>
                  resp.text().then(text => {
                    r(
                      right({
                        headers: h,
                        status: resp.status,
                        body: fromNullable(text)
                      })
                    );
                  }),
                () => {
                  if (resp["arrayBuffer"]) {
                    resp.arrayBuffer().then(arrayBuffer => {
                      r(
                        right({
                          headers: h,
                          status: resp.status,
                          body: fromNullable(Buffer.from(arrayBuffer))
                        })
                      );
                    });
                  } else {
                    (resp as any).buffer().then((buffer: Buffer) => {
                      r(
                        right({
                          headers: h,
                          status: resp.status,
                          body: fromNullable(Buffer.from(buffer))
                        })
                      );
                    });
                  }
                }
              );
            } else {
              resp.text().then(text => {
                r(
                  left({
                    _tag: H.HttpErrorReason.Response,
                    response: {
                      headers: h,
                      status: resp.status,
                      body: fromNullable(text)
                    }
                  })
                );
              });
            }
          })
          .catch(err => {
            r(left({ _tag: H.HttpErrorReason.Request, error: err }));
          });

        // tslint:disable-next-line: no-empty
        return cb => {
          cb();
        };
      });
    }
  }
});

export const client = (fetchApi: typeof fetch) =>
  pipe(T.noEnv, T.mergeEnv(httpFetch(fetchApi)));
