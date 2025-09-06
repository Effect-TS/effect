{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    sqlite-cr.url = "github:subtleGradient/sqlite-cr";
  };
  outputs =
    { nixpkgs, sqlite-cr, ... }:
    let
      forAllSystems =
        function:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
          system: function nixpkgs.legacyPackages.${system} system
        );
    in
    {
      formatter = forAllSystems (pkgs: system: pkgs.alejandra);
      packages = forAllSystems (pkgs: system: {
        libsqlite3 = import ./nix/libsqlite3.nix { inherit pkgs; enableLoadExtension = true; };
      });
      checks = forAllSystems (pkgs: system: {
        sqliteLoadableExtensions = pkgs.runCommand "check-sqlite-ext" { } ''
          ${pkgs.sqlite}/bin/sqlite3 :memory: \
            'select 1 where not exists (
               select 1 from pragma_compile_options()
               where compile_options like "%OMIT_LOAD_EXTENSION%"
             );' >/dev/null
          touch $out
        '';
      });
      devShells = forAllSystems (pkgs: system: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            corepack
            deno
            nodejs-slim_23
            python3
            yq-go
          ] ++ [ 
            sqlite-cr.packages.${system}.default 
            sqlite-cr.packages.${system}.crsqlite
          ];
          
          shellHook = ''
            export CRSQLITE_PATH="${sqlite-cr.packages.${system}.crsqlite}/lib/libcrsqlite${if pkgs.stdenv.isDarwin then ".dylib" else ".so"}"
            echo "CR-SQLite extension available at: $CRSQLITE_PATH"
          '';
        };
      });
    };
}
