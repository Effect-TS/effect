import * as T from "@matechs/effect";

export type CanRemote = {
  [k: string]: { [h: string]: (...args: any[]) => T.Effect<any, Error, any> };
};

export type PatchedF<M> = M extends (
  ...args: infer A
) => T.Effect<any, Error, infer D>
  ? (...args: A) => T.Effect<HttpClient, Error, D>
  : never;

export type Remote<M> = M extends {
  [k: string]: { [h: string]: (...args: any[]) => T.Effect<any, any, any> };
}
  ? { [k in keyof M]: { [h in keyof M[k]]: PatchedF<M[k][h]> } }
  : never;

export interface HttpClient {
  http: {
    post<A>(url: string, data: any): T.Effect<T.NoEnv, Error, A>;
  };
}

export function calculatePath(url: string, entry: string, k: string) {
  return `${url}/${entry}/${k}`;
}

export type Payload = { data: any[] };

export function remotely<A extends any[], R, E, B>(
  fn: (...args: A) => T.Effect<R, E, B>,
  url: string,
  entry: string,
  k: string
): (...args: A) => T.Effect<HttpClient & R, Error | E, B> {
  return (...args: A) =>
    T.accessM(({ http }: HttpClient) =>
      http.post<B>(calculatePath(url, entry, k), {
        data: args
      } as Payload)
    );
}

export function reinterpretRemotely<M extends CanRemote>(
  module: M,
  url: string
): Remote<M> {
  const patched = {};

  Object.keys(module).forEach(entry => {
    patched[entry] = {};

    Object.keys(module[entry]).forEach(k => {
      const fn = module[entry][k];

      patched[entry][k] = remotely(fn, url, entry, k);
    });
  });

  return patched as any;
}

export type PatchedClientF<M, Z extends CanRemote> = M extends (
  ...args: infer A
) => T.Effect<any, Error, infer D>
  ? (...args: A) => T.Effect<HttpClient & Remote<Z>, Error, D>
  : never;

export type ClientHelpers<M> = M extends {
  [k: string]: { [h: string]: (...args: any[]) => T.Effect<any, any, any> };
}
  ? { [k in keyof M]: { [h in keyof M[k]]: PatchedClientF<M[k][h], M> } }
  : never;

export function clientHelpers<M extends CanRemote>(
  module: M
): ClientHelpers<M> {
  const patched = {};

  Object.keys(module).forEach(entry => {
    patched[entry] = {};

    Object.keys(module[entry]).forEach(k => {
      patched[entry][k] = (...args) =>
        T.accessM((r: Remote<M>) => r[entry][k](...args));
    });
  });

  return patched as any;
}
