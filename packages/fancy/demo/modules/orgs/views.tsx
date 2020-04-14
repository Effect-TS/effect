import * as React from "react";
import { effect as T } from "@matechs/effect";
import * as R from "../../../src";
import { OrgsOps, updateOrgs } from "./def";
import { pipe } from "fp-ts/lib/pipeable";
import * as O from "fp-ts/lib/Option";
import { OrgsStateEnv, orgsStateURI } from "./state";

// alpha
/* istanbul ignore file */

export const UpdateOrganisations = R.UI.withRun<OrgsOps>()((run, dispose) =>
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
);

export const ShowOrgs = R.UI.withState<OrgsStateEnv>()(
  ({ [orgsStateURI]: { error, found } }) => (
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
  )
);
