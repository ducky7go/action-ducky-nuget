# action-ducky-nuget

## Project overview

`ducky7go/action-ducky-nuget` is a GitHub Action ("Ducky NuGet Mod Publisher", `action.yml`) that packs a game mod folder (for "Escape from Duckov") into a `.nupkg` and optionally pushes it to NuGet (nuget.org by default, or a custom server). It implements the packaging spec in `ducky7go/dukcy-package-spec`. Mod authors consume it with `uses: ducky7go/action-ducky-nuget@v1`. The action is a thin wrapper: packing and validation live in `@ducky7go/ducky-cli`.

## Repository layout

- `action.yml` - inputs `mod_folder_path`, `nuget_server`, `nuget_api_key`, `push`; outputs `success`, `package_path`, `version`, `error`; runtime `node20`, entry `dist/index.js`.
- `src/index.ts` - the only source file. It checks that the mod folder and `info.ini` exist, reads `version` from `info.ini` with a regex, then runs `npx -y @ducky7go/ducky-cli nuget push <folder> --pack [--server ..] [--api-key ..]` (push=true) or `nuget pack <folder>` (push=false). It parses `Package created: <path>.nupkg` from stdout to set `package_path`.
- `dist/` - ncc bundle committed to git: `index.js`, `licenses.txt`, and `index.d.ts` / `index.d.ts.map`. GitHub runs `dist/index.js`.
- `DisplayItemValue/` - sample mod (`info.ini`, `DisplayItemValue.dll`, `preview.png`) used by this repo's own workflows.
- `.github/workflows/`: `publish-mod.yml` (on `v*` tag: rewrites the version in `DisplayItemValue/info.ini` in the runner's working tree, logs in to NuGet via OIDC, runs `uses: ./`), `test-pack-only.yml` (PRs touching `src/**`, `action.yml` or itself; pack-only and default-push cases), `release-drafter.yml`.

## Build / test / run

Scripts in `package.json`:
- `pnpm run build` - `tsc` with `tsconfig.json` (CommonJS, ES2020, strict), output to `dist/`. Do not use it as the release step: it writes `dist/index.js` too, which would replace the ncc bundle with an unbundled build (derived from the tsconfig, not run).
- `pnpm run package` - `ncc build src/index.ts -o dist --license licenses.txt`. This is the step that produces the committed bundle.
- There is no `test` script and no test suite. Verification is the `test-pack-only.yml` workflow against `./DisplayItemValue`.

Runner requirement: ducky-cli runs `nuget.exe` through Mono on Linux, so `mono-complete` must be installed before the action runs. The workflows install it.

## Conventions

- After any change to `src/index.ts` or dependencies, run `pnpm run package` and commit the refreshed `dist/`.
- `.gitignore` excludes `dist/*.d.ts`, `dist/*.d.ts.map`, `dist/*.js.map` and some old module outputs, but `dist/index.d.ts` and `dist/index.d.ts.map` are tracked anyway.
- Failure pattern in `src/index.ts`: `core.setFailed(msg)`, `core.setOutput('error', msg)`, `core.setOutput('success', 'false')`, then return.
- Never log the API key; the logged command masks it as `***`.
- Release: a `v*` tag runs `publish-mod.yml`, which publishes the sample mod.
- Behavior or spec changes follow the OpenSpec workflow.

## Gotchas

- `@ducky7go/ducky-cli` is unpinned at runtime. `src/index.ts` runs `npx -y @ducky7go/ducky-cli`, which fetches the latest published version; the `^0.0.4` in `package.json` does not control what runs.
- README says the action validates `info.ini`, the DLL name and SemVer. That validation is done by ducky-cli; `src/index.ts` only checks that the folder and `info.ini` exist.
- The `version` output is a regex on `info.ini` (default `1.0.0`), independent of what ducky-cli packs.
- README and workflows pin `@v1`, but this repo has no `v1` tag locally or on origin. Tags are `v0.1.0` to `v0.1.9` and `v1.0.0`, `v1.0.1`, `v1.1.0`, `v1.1.1`. Check the tag before changing any `@v1` reference.
- `test-default-push` in `test-pack-only.yml` uses `continue-on-error` and its verify step only prints a note, so it cannot fail the job.

## Related repositories

- `ducky7go/ducky-cli` - npm package `@ducky7go/ducky-cli`, runs the real pack and push.
- `ducky7go/dukcy-package-spec` - the NuGet mod packaging specification this action implements.
