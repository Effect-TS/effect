// alpha
/* istanbul ignore file */

export const componentPropsURI = "@matechs/fancy/componentPropsURI";

export interface ComponentProps<P> {
  [componentPropsURI]: {
    props: P;
  };
}
