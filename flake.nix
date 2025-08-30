{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };
  outputs =
    { nixpkgs, ... }:
    let
      forAllSystems =
        function:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
          system: function nixpkgs.legacyPackages.${system}
        );
    in
    {
      formatter = forAllSystems (pkgs: pkgs.alejandra);
      packages = forAllSystems (pkgs: {
        libsqlite3 = import ./nix/libsqlite3.nix { inherit pkgs; enableLoadExtension = true; };
      });
      checks = forAllSystems (pkgs: {
        sqliteLoadableExtensions = pkgs.runCommand "check-sqlite-ext" { } ''
          ${pkgs.sqlite}/bin/sqlite3 :memory: \
            'select 1 where not exists (
               select 1 from pragma_compile_options()
               where compile_options like "%OMIT_LOAD_EXTENSION%"
             );' >/dev/null
          touch $out
        '';
      });
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            corepack
            deno
            nodejs-slim_23
            python3
            yq-go
          ];
        };
      });
    };
}
