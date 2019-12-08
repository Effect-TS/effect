import { effect as T } from "@matechs/effect";
import { ParsedUrlQueryInput } from "querystring";
import { Predicate } from "fp-ts/lib/function";

/* tested in the implementation packages */
/* istanbul ignore file */

export enum Method {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH
}

export enum RequestType {
  JSON,
  DATA
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

export interface HttpDeserializer {
  httpDeserializer: {
    response: <A>(a: string) => A | undefined;
    errorResponse: <E>(error: string) => E | undefined;
  };
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
      headers: Record<string, string>,
      body?: I,
      requestType?: RequestType
    ) => T.Effect<HttpDeserializer, HttpError<E>, Response<O>>;
  };
}

function hasHeaders(r: unknown): r is HttpHeaders {
  return typeof r === "object" && !!r && "headers" in r;
}

type RequestF = <R, I, E, O>(
  method: Method,
  url: string,
  body?: I,
  requestType?: RequestType
) => T.Effect<RequestEnv & R, HttpError<E>, Response<O>>;

export type RequestMiddleware = (request: RequestF) => RequestF;

export interface MiddlewareStack {
  httpMiddlewareStack: {
    stack: RequestMiddleware[];
  };
}

export const middlewareStack: (
  stack?: MiddlewareStack["httpMiddlewareStack"]["stack"]
) => MiddlewareStack = (stack = []) => ({
  httpMiddlewareStack: {
    stack
  }
});

export type RequestEnv = Http & HttpDeserializer & MiddlewareStack;

function foldMiddlewareStack(
  { httpMiddlewareStack: { stack } }: MiddlewareStack,
  request: RequestF
): RequestF {
  if (stack.length > 0) {
    let r = request;

    for (const middleware of stack) {
      r = middleware(r);
    }

    return r;
  }

  return request;
}

export function requestInner<R, I, E, O>(
  method: Method,
  url: string,
  body?: I,
  requestType?: RequestType
): T.Effect<RequestEnv & R, HttpError<E>, Response<O>> {
  return T.accessM((r: Http & R) => {
    if (hasHeaders(r)) {
      return r.http.request(method, url, r.headers, body, requestType);
    } else {
      return r.http.request(method, url, {}, body, requestType);
    }
  });
}

export function request<R, I, E, O>(
  method: Method,
  url: string,
  body?: I,
  requestType?: RequestType
): T.Effect<RequestEnv & R, HttpError<E>, Response<O>> {
  return T.accessM((r: MiddlewareStack) =>
    foldMiddlewareStack(r, requestInner)<R, I, E, O>(
      method,
      url,
      body,
      requestType
    )
  );
}

export function get<E, O>(
  url: string
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.GET, url);
}

export function post<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.POST, url, body);
}

export function postData<I extends ParsedUrlQueryInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.POST, url, body, RequestType.DATA);
}

export function patch<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PATCH, url, body);
}

export function patchData<I extends ParsedUrlQueryInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PATCH, url, body, RequestType.DATA);
}

export function put<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PUT, url, body);
}

export function putData<I extends ParsedUrlQueryInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PUT, url, body, RequestType.DATA);
}

export function del<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.DELETE, url, body);
}

export function delData<I extends ParsedUrlQueryInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.DELETE, url, body, RequestType.DATA);
}

export function withHeaders(
  headers: Record<string, string>
): <R, E, O>(
  eff: T.Effect<R, HttpError<E>, Response<O>>
) => T.Effect<R, HttpError<E>, Response<O>> {
  return <R, E, O>(eff: T.Effect<R, HttpError<E>, Response<O>>) =>
    T.provideR<R, HttpHeaders & R>(r => ({
      ...r,
      headers: { ...r["headers"], ...headers }
    }))(eff);
}

export function withPathHeaders(
  headers: Record<string, string>,
  path: Predicate<string>
): RequestMiddleware {
  return req => (m, u, b, r) =>
    path(u) ? withHeaders(headers)(req(m, u, b, r)) : req(m, u, b, r);
}

export function replaceHeaders<I, E, O>(
  headers: Record<string, string>
): <R>(
  eff: T.Effect<R, HttpError<E>, Response<O>>
) => T.Effect<R, HttpError<E>, Response<O>> {
  return <R>(eff: T.Effect<R, HttpError<E>, Response<O>>) =>
    T.provideR<R, HttpHeaders & R>(r => ({
      ...r,
      headers
    }))(eff);
}

function tryJson<A>(a: string): A | undefined {
  try {
    return JSON.parse(a);
  } catch (_) {
    return undefined;
  }
}

export const jsonDeserializer: HttpDeserializer = {
  httpDeserializer: {
    errorResponse: tryJson,
    response: tryJson
  }
};
