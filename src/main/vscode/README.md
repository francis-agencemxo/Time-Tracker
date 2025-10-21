# CodePulse Time Tracker for VS Code

This directory hosts the VS Code companion extension that mirrors the PhpStorm
plugin's behaviour. It records coding sessions, file saves, Git commits, and
browsing activity into the shared SQLite database (`~/.cache/phpstorm-time-tracker/data.db`)
and exposes the same HTTP API used by the dashboard and Chrome extension.

## Development

```bash
cd src/main/vscode
npm install
# Build better-sqlite3 for VS Code's Electron runtime (required for SQLite)
npm run rebuild-native  # downloads Electron headers via electron-rebuild
npm run watch
```

If you only need the JSON fallback (for example, when you lack a native build
toolchain) set `CODEPULSE_SKIP_NATIVE_REBUILD=1` before `npm install`. The
extension will log a warning on startup when it falls back to JSON storage.

Launch VS Code with `code --extensionDevelopmentPath=src/main/vscode` to run the
extension in the Extension Development Host. The tracker server will start on
`codepulseTimeTracker.trackerServerPort` (default `56000`).

## Packaging

The extension expects the exported dashboard assets under
`../resources/public`. Run the existing Next.js export pipeline before packaging
the extension (`npm run export` in `src/main/resources/dashboard`).

Use the VS Code Extension Manager (`vsce`) to package the extension. The
`vscode:prepublish` script runs both the native rebuild and the compiler, which
ensures the bundled `.vsix` always ships with the Electron-compatible
`better-sqlite3` binary and the dashboard assets.

## Native SQLite bindings

When `better-sqlite3` is rebuilt successfully the extension writes to the same
database as the PhpStorm plugin (`~/.cache/phpstorm-time-tracker/data.db`),
allowing both IDEs to share history. If the native module cannot be loaded the
extension automatically falls back to a JSON datastore at
`~/.cache/phpstorm-time-tracker/data.json` and warns in the developer console.
Set `CODEPULSE_ELECTRON_VERSION` when you need to rebuild against a particular
VS Code (or Insiders) Electron runtime. By default the rebuild script tries to detect
the running VS Code instance via `code --status`; if that fails it falls back to Electron 25.9.7.
