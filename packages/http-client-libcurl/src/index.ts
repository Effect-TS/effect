import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "fp-ts/lib/Record";
import * as C from "node-libcurl";
import path from "path";

const certfile = path.join(__dirname, "../cacert-2019-11-27.pem");

export const libcurl: H.Http = {
  http: {
    request: <I, E, O>(
      method: H.Method,
      url: string,
      headers: Record<string, string>,
      body: I
    ): T.Effect<T.NoEnv, H.HttpError<E>, H.Response<O>> =>
      T.async(done => {
        const req = new C.Curl();
        const reqHead = [
          "Content-Type: application/json",
          ...pipe(
            headers,
            R.collect((k, v) => `${k}: ${v}`)
          )
        ];

        req.setOpt("URL", url);
        req.setOpt("CAINFO", certfile);
        req.setOpt("FOLLOWLOCATION", 1);
        req.setOpt("VERBOSE", 0);
        req.setOpt("SSL_VERIFYHOST", 2);
        req.setOpt("SSL_VERIFYPEER", 1);

        req.setOpt(C.Curl.option.HTTPHEADER, reqHead);

        const jsonBody = body ? JSON.stringify(body) : "";

        function customReq(method: string) {
          if (jsonBody.length > 0) {
            req.setOpt(C.Curl.option.POSTFIELDS, jsonBody);
          }
          req.setOpt(C.Curl.option.CUSTOMREQUEST, method);
        }

        switch (method) {
          case H.Method.POST:
            customReq("POST");
            break;
          case H.Method.PUT:
            customReq("PUT");
            break;
          case H.Method.PATCH:
            customReq("PATCH");
            break;
          case H.Method.DELETE:
            customReq("DELETE");
            break;
          default:
            break;
        }

        req
          .on("error", e => {
            done(
              E.left({
                _tag: H.HttpErrorReason.Request,
                error: e
              })
            );
          })
          .on("end", (statusCode, body, headers) => {
            const bodyStr = body.toString();

            const response = <A>(): H.Response<A> => ({
              status: statusCode,
              body: parseOrUndefined(bodyStr),
              headers: getHeaders(headers)
            });

            if (statusCode >= 200 && statusCode < 300) {
              done(E.right(response()));
            } else {
              done(
                E.left({
                  _tag: H.HttpErrorReason.Response,
                  response: response()
                })
              );
            }
          });

        req.perform();

        return () => {
          req.close();
        };
      })
  }
};

function getHeaders(headers: Buffer | C.HeaderInfo[]) {
  return headers.length > 0
    ? typeof headers[0] !== "number"
      ? headers[0]
      : {}
    : {};
}

function parseOrUndefined<A>(str: string): A | undefined {
  if (str.length > 0) {
    try {
      return JSON.parse(str);
    } catch (_) {
      return undefined;
    }
  } else {
    return undefined;
  }
}
