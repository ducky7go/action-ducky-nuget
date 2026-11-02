## OpenSpec

This repo has no `openspec/` directory. OpenSpec for all `ducky7go-mono` sub-repos lives in the parent repo: `../../openspec/` (workflow rules `../../openspec/AGENTS.md`, specs `../../openspec/specs/`, changes `../../openspec/changes/`).


# action-ducky-nuget

## Project overview

`ducky7go/action-ducky-nuget` is a GitHub Action ("Ducky NuGet Mod Publisher", `action.yml`) that packs a game mod folder (for "Escape from Duckov") into a `.nupkg` and optionally pushes it to NuGet (nuget.org by default, or a custom server). It follows the NuGet mod packaging spec in `ducky7go/dukcy-package-spec`. It is consumed by mod authors' workflows (`uses: ducky7go/action-ducky-nuget@v1`). The action itself is a thin wrapper: all packing logic lives in `@ducky7go/ducky-cli`.

## Repository layout

- `action.yml` - action metadata: inputs `mod_folder_path`, `nuget_server`, `nuget_api_key`, `push`; outputs `success`, `package_path`, `version`, `error`; runtime `node20`, entry `dist/index.js`.
- `src/index.ts` - the only source file. Reads inputs, checks that the mod folder and `info.ini` exist, reads `version` from `info.ini` with a regex, then runs `npx -y @ducky7go/ducky-cli nuget push <folder> --pack [--server ..] [--api-key ..]` (push=true) or `nuget pack <folder>` (push=false). Parses `Package created: <path>.nupkg` from stdout to set `package_path`.
- `dist/` - ncc bundle committed to git (`index.js`, `licenses.txt`, `index.d.ts*`). This is what GitHub runs.
- `DisplayItemValue/` - sample mod (`info.ini`, `DisplayItemValue.dll`, `preview.png`) used by the repo's own CI workflows.
- `.github/workflows/` - `publish-mod.yml` (on `v*` tag: patches the version in `DisplayItemValue/info.ini`, NuGet OIDC login, runs `uses: ./`), `test-pack-only.yml` (PR check for `src/**`, `action.yml`; pack-only and default-push cases), `release-drafter.yml`.
- `../../openspec/` - OpenSpec specs (`specs/mod-packaging/spec.md`) and archived changes; see `../../openspec/AGENTS.md`.

## Build / test / run

Scripts in `package.json`:
- `pnpm run build` - `tsc` (outputs to `dist/`, CommonJS, ES2020, strict).
- `pnpm run package` - `ncc build src/index.ts -o dist --license licenses.txt`; this is the step that produces the committed bundle.
- There is no `pnpm test` script (the unused `jest` script was removed because jest is not installed and the repo has no tests). Verification is by the GitHub workflows (`test-pack-only.yml`) against `./DisplayItemValue`.

Runtime requirements on the runner (from the workflows): Mono (`mono-complete`) is installed before the action because ducky-cli uses `nuget.exe`.

## Conventions

- After any change to `src/index.ts` (or dependency changes), run `pnpm run package` and commit the refreshed `dist/`. `.gitignore` excludes `dist/*.d.ts`, `dist/*.d.ts.map`, `dist/*.js.map` and old per-module outputs, but the repo does track `dist/index.d.ts*` as well; do not rely on those being ignored.
- Failure handling pattern in `src/index.ts`: `core.setFailed(msg)` plus `core.setOutput('error', msg)` and `core.setOutput('success', 'false')`, then return.
- Never log the API key; the logged command masks it as `***`.
- Release: pushing a `v*` tag triggers `publish-mod.yml` (publishes the sample mod). Consumers pin `@v1`.
- Larger changes go through OpenSpec (see the OpenSpec note above); archived changes live in `../../openspec/changes/archive/`.

## Gotchas

- `npx -y @ducky7go/ducky-cli` in `src/index.ts` is unpinned at runtime: the `@ducky7go/ducky-cli` version in `package.json` (`^0.0.4`) is not what actually executes; npx fetches the latest published version.
- README says the action validates `info.ini`, DLL name and SemVer; in this repo that validation is performed by ducky-cli, not by `src/index.ts` (which only checks the folder and `info.ini` exist).
- `version` output comes from a regex on `info.ini` (default `1.0.0`), independent of what ducky-cli actually packs.

## Related repositories

- `ducky7go/ducky-cli` - npm package `@ducky7go/ducky-cli`, executes the real pack/push.
- `ducky7go/dukcy-package-spec` - the NuGet mod packaging specification this action implements.
