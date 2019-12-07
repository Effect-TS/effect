import { effect as T } from "@matechs/effect";

export enum Method {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH
}

export type Headers = Record<string, string>;

export interface Request<Body> {
  method: Method;
  body?: Body;
  headers: Headers;
}

export interface Response<Body> {
  body?: Body;
  headers: Headers;
  status: number;
}

export interface HttpResponseError<ErrorBody> {
  _tag: "HttpResponseError";
  response: Response<ErrorBody>;
}

export interface HttpRequestError {
  _tag: "HttpRequestError";
  error: Error;
}

export type HttpError<ErrorBody> =
  | HttpRequestError
  | HttpResponseError<ErrorBody>;

export interface Http {
  http: {
    request: <I, E, O>(
      method: Method,
      url: string,
      body?: I
    ) => T.Effect<T.NoEnv, HttpError<E>, O>;
  };
}

export function request<I, E, O>(
  method: Method,
  url: string,
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) => http.request(method, url, body));
}

export function Get<E, O>(url: string): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) => http.request(Method.GET, url));
}

export function Post<I, E, O>(
  url: string,
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) => http.request(Method.POST, url, body));
}

export function Patch<I, E, O>(
  url: string,
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) => http.request(Method.PATCH, url, body));
}

export function Put<I, E, O>(
  url: string,
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) => http.request(Method.PUT, url, body));
}

export function Delete<I, E, O>(
  url: string,
  body?: I
): T.Effect<Http, HttpError<E>, O> {
  return T.accessM(({ http }: Http) => http.request(Method.PUT, url, body));
}
