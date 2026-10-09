{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    # Deno 2.9.7 fixes Unix-socket fd ownership (denoland/deno#36353).
    # Keep the other development tools on their existing nixpkgs revision.
    nixpkgs-deno.url = "github:nixos/nixpkgs/39ad350a0602fa0a58a544344e3e9187526ea45c";
  };
  outputs = {
    nixpkgs,
    nixpkgs-deno,
    ...
  }: let
    forAllSystems = function:
      nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
        system: function nixpkgs.legacyPackages.${system}
      );
  in {
    formatter = forAllSystems (pkgs: pkgs.alejandra);
    devShells = forAllSystems (pkgs: {
      default = pkgs.mkShell {
        packages = with pkgs; [
          bun
          nixpkgs-deno.legacyPackages.${pkgs.stdenv.hostPlatform.system}.deno
          nodejs_latest
          pnpm
          python3
        ];
      };
    });
  };
}
