import { effect as T } from "@matechs/effect";

export enum Method {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH
}

export type Headers = Record<string, string>;

export interface Response<Body> {
  body?: Body;
  headers: Headers;
  status: number;
}

export interface HttpResponseError<ErrorBody> {
  _tag: HttpErrorReason.Response;
  response: Response<ErrorBody>;
}

export interface HttpRequestError {
  _tag: HttpErrorReason.Request;
  error: Error;
}

export enum HttpErrorReason {
  Request,
  Response
}

export type HttpError<ErrorBody> =
  | HttpRequestError
  | HttpResponseError<ErrorBody>;

export function foldHttpError<A, B, ErrorBody>(
  onError: (e: Error) => A,
  onResponseError: (e: Response<ErrorBody>) => B
): (err: HttpError<ErrorBody>) => A | B {
  return err => {
    switch (err._tag) {
      case HttpErrorReason.Request:
        return onError(err.error);
      case HttpErrorReason.Response:
        return onResponseError(err.response);
    }
  };
}

export interface Http {
  http: {
    request: <I, E, O>(
      method: Method,
      url: string,
      headers?: Record<string, string>,
      body?: I
    ) => T.Effect<T.NoEnv, HttpError<E>, Response<O>>;
  };
}

export function request<I, E, O>(
  method: Method,
  url: string,
  headers: Record<string, string> = {},
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) =>
    http.request(method, url, headers, body)
  );
}

export function Get<E, O>(
  url: string,
  headers: Record<string, string> = {}
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) => http.request(Method.GET, url, headers));
}

export function Post<I, E, O>(
  url: string,
  headers: Record<string, string> = {},
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) =>
    http.request(Method.POST, url, headers, body)
  );
}

export function Patch<I, E, O>(
  url: string,
  headers: Record<string, string> = {},
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) =>
    http.request(Method.PATCH, url, headers, body)
  );
}

export function Put<I, E, O>(
  url: string,
  headers: Record<string, string> = {},
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) =>
    http.request(Method.PUT, url, headers, body)
  );
}

export function Delete<I, E, O>(
  url: string,
  headers: Record<string, string> = {},
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) =>
    http.request(Method.PUT, url, headers, body)
  );
}
