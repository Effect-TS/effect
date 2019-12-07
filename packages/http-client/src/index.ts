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

export interface HttpHeaders {
  headers: Record<string, string>;
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

function hasHeaders(r: any): r is HttpHeaders {
  return "headers" in r;
}

export function request<R, I, E, O>(
  method: Method,
  url: string,
  body?: I
): T.Effect<Http & R, HttpError<E>, Response<O>> {
  return T.accessM(({ http }: Http) =>
    T.accessM((r: R) => {
      if (hasHeaders(r)) {
        return http.request(method, url, r.headers, body);
      } else {
        return http.request(method, url, {}, body);
      }
    })
  );
}

export function get<E, O>(
  url: string
): T.Effect<Http, HttpError<E>, Response<O>> {
  return request(Method.GET, url);
}

export function post<I, E, O>(
  url: string,
  body?: I
): T.Effect<Http, HttpError<E>, Response<O>> {
  return request(Method.POST, url, body);
}

export function patch<I, E, O>(
  url: string,
  body?: I
): T.Effect<Http, HttpError<E>, Response<O>> {
  return request(Method.PATCH, url, body);
}

export function put<I, E, O>(
  url: string,
  body?: I
): T.Effect<Http, HttpError<E>, Response<O>> {
  return request(Method.PUT, url, body);
}

export function del<I, E, O>(
  url: string,
  body?: I
): T.Effect<Http, HttpError<E>, Response<O>> {
  return request(Method.DELETE, url, body);
}

export function withHeaders<I, E, O>(
  headers: Record<string, string>
): (
  eff: T.Effect<Http, HttpError<E>, Response<O>>
) => T.Effect<Http, HttpError<E>, Response<O>> {
  return eff =>
    T.provideR<Http, HttpHeaders & Http>(r => ({
      ...r,
      headers: { ...r["headers"], ...headers }
    }))(eff);
}
