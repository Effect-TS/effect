import { effect as T } from "@matechs/effect";
import { App } from "../../../lib";
import { OrgsOps, updateOrgs } from "./def";
import { OrgsState } from "./state";
import { pipe } from "fp-ts/lib/pipeable";
import * as O from "fp-ts/lib/Option";

// alpha
/* istanbul ignore file */

export function UpdateOrganisations<S>(App: App<S>) {
  return App.ui.withRun<OrgsOps>(run =>
    T.pure(() => (
      <button
        onClick={() => {
          run(updateOrgs);
        }}
      >
        Fetch!
      </button>
    ))
  );
}

export function ShowOrgs<
  URI extends string & keyof S,
  S extends { [k in URI]: OrgsState }
>(App: App<S>, URI: URI) {
  return App.withState([URI])(
    T.pure(({ [URI]: { error, found } }) => (
      <>
        {pipe(
          found,
          O.map(orgs => <div>{orgs}</div>),
          O.toNullable
        )}
        {pipe(
          error,
          O.map(error => <div>{error}</div>),
          O.toNullable
        )}
      </>
    ))
  );
}
