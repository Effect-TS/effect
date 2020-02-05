export const actionsURI: unique symbol = Symbol();

export interface Actions {
  [actionsURI]: {
    actions: any[];
  };
}
