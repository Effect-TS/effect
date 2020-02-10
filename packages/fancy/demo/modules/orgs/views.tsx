import * as React from "react";
import { effect as T } from "@matechs/effect";
import { generic } from "../../../lib";
import { OrgsOps, updateOrgs } from "./def";
import { orgsS, orgsSURI } from "./state";
import { pipe } from "fp-ts/lib/pipeable";
import * as O from "fp-ts/lib/Option";

// alpha
/* istanbul ignore file */

export const UpdateOrganisations = generic([orgsS])(App =>
  App.ui.withRun<OrgsOps>((run, dispose) =>
    T.pure(() => {
      React.useEffect(
        () => dispose, // when the component unmount dispose all launched effects
        []
      );

      return (
        <button
          onClick={() => {
            run(updateOrgs);
          }}
        >
          Fetch!
        </button>
      );
    })
  )
);

export const ShowOrgs = generic([orgsS])(App =>
  App.withState([orgsSURI])(
    T.pure(({ [orgsSURI]: { error, found } }) => (
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
  )
);
