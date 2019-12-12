import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "fp-ts/lib/Record";
import * as C from "node-libcurl";
import path from "path";
import querystring from "querystring";
import { fromNullable } from "fp-ts/lib/Option";

function isJson(requestType: H.RequestType): boolean {
  return H.foldRequestType(
    requestType,
    () => true,
    () => false,
    () => false
  );
}

export const libcurl: (caPath?: string) => H.Http = (
  caPath = path.join(
    require.resolve("@matechs/http-client-libcurl").replace("index.js", ""),
    "../cacert-2019-11-27.pem"
  )
) => ({
  [H.httpEnv]: {
    request: <I, E, O>(
      method: H.Method,
      url: string,
      headers: Record<string, string>,
      requestType: H.RequestType,
      body: I
    ): T.Effect<H.HttpDeserializer, H.HttpError<E>, H.Response<O>> =>
      requestType === "FORM"
        ? /* istanbul ignore next */ T.raiseError({
            // cannot be triggered from exposed functions
            _tag: H.HttpErrorReason.Request,
            error: new Error("multipart form not supported")
          })
        : T.accessM((r: H.HttpDeserializer) =>
            T.async(done => {
              const req = new C.Curl();
              const reqHead = [
                ...(isJson(requestType)
                  ? ["Content-Type: application/json"]
                  : []),
                ...pipe(
                  headers,
                  R.collect((k, v) => `${k}: ${v}`)
                )
              ];

              req.setOpt("URL", url);
              req.setOpt("CAINFO", caPath);
              req.setOpt("FOLLOWLOCATION", 1);
              req.setOpt("VERBOSE", 0);
              req.setOpt("SSL_VERIFYHOST", 2);
              req.setOpt("SSL_VERIFYPEER", 1);

              req.setOpt(C.Curl.option.HTTPHEADER, reqHead);

              if (method !== H.Method.GET) {
                customReq(H.getMethodAsString(method), req, requestType, body);
              }

              req
                .on("error", error => {
                  done(
                    E.left({
                      _tag: H.HttpErrorReason.Request,
                      error
                    })
                  );
                })
                .on("end", (statusCode, body, headers) => {
                  if (statusCode >= 200 && statusCode < 300) {
                    done(
                      E.right(
                        getResponse(
                          statusCode,
                          body.toString(),
                          headers,
                          r[H.httpDeserializerEnv]
                        )
                      )
                    );
                  } else {
                    done(
                      E.left({
                        _tag: H.HttpErrorReason.Response,
                        response: getResponse(
                          statusCode,
                          body.toString(),
                          headers,
                          r[H.httpDeserializerEnv]
                        )
                      })
                    );
                  }
                });

              req.perform();

              return () => {
                req.close();
              };
            })
          )
  }
});

function customReq<I>(
  method: string,
  req: C.Curl,
  requestType: H.RequestType,
  body?: I
): void {
  if (body) {
    req.setOpt(
      C.Curl.option.POSTFIELDS,
      isJson(requestType)
        ? JSON.stringify(body)
        : querystring.stringify(body as any)
    );
  }

  req.setOpt(C.Curl.option.CUSTOMREQUEST, method);
}

function getResponse<A>(
  statusCode: number,
  bodyStr: string,
  headers: Buffer | C.HeaderInfo[],
  httpDeserializer: H.HttpDeserializer[typeof H.httpDeserializerEnv]
): H.Response<A> {
  return {
    status: statusCode,
    body: fromNullable(
      bodyStr.length > 0
        ? statusCode >= 200 && statusCode < 300
          ? httpDeserializer.response(bodyStr)
          : httpDeserializer.errorResponse(bodyStr)
        : undefined
    ),
    headers: getHeaders(headers)
  };
}

function getHeaders(headers: Buffer | C.HeaderInfo[]): C.HeaderInfo {
  /* istanbul ignore next */
  return headers.length > 0
    ? typeof headers[0] !== "number"
      ? headers[0]
      : {}
    : {};
}

export const jsonClient = pipe(
  T.noEnv,
  T.mergeEnv(libcurl()),
  T.mergeEnv(H.jsonDeserializer)
);
