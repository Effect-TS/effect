import * as TO from "typeorm";
import * as Ef from "@matechs/effect";
import { toError } from "fp-ts/lib/Either";

export interface HasOrmConfig {
  orm: {
    options: TO.ConnectionOptions;
  };
}

export interface HasOrmConnection {
  orm: {
    connection: TO.Connection;
  };
}

export interface Orm {
  orm: {
    withConnection<R, E, A>(
      op: Ef.Effect<HasOrmConnection & R, E, A>
    ): Ef.Effect<HasOrmConfig & R, Error | E, A>;
  };
}

export const orm: Orm = {
  orm: {
    withConnection<R, E, A>(
      op: Ef.Effect<HasOrmConnection & R, E, A>
    ): Ef.Effect<HasOrmConfig & R, Error | E, A> {
      return Ef.accessM(({ orm: { options } }: HasOrmConfig) =>
        Ef.bracket(
          Ef.tryCatch(() => TO.createConnection(options), toError),
          db => Ef.provide<HasOrmConnection>({ orm: { connection: db } })(op),
          db => Ef.tryCatch(db.close, toError)
        )
      );
    }
  }
};

export function withConnection<R, E, A>(
  op: Ef.Effect<HasOrmConnection & R, E, A>
): Ef.Effect<Orm & HasOrmConfig & R, Error | E, A> {
  return Ef.accessM(({ orm }: Orm) => orm.withConnection(op));
}
