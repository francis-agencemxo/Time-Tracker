# CodePulse Time Tracker Plugin

A JetBrains plugin for PhpStorm that tracks coding and browsing activity, with a Next.js dashboard for visualizing time statistics.

## Features

- Real-time Chrome URL tracking with domain-based grouping
- Daily and weekly dashboards with project breakdowns
- Automatic data export and Google Sheets integration
- Configurable settings panel for domains, scopes, and refresh interval

## Prerequisites

- Java 11 or higher
- Node.js 16+ and npm
- Chrome browser (for the companion extension)
- Git

## Getting Started

Clone the repository and navigate into the project directory:

```bash
git clone https://github.com/francis-agencemxo/Time-Tracker.git
cd phpstorm-time-tracker-ui-v7
```

### Build and Run the Plugin

To build the plugin and launch a sandbox IDE with the plugin loaded:

```bash
./gradlew runIde
```

### Export the Dashboard (Production)

For a static export of the Next.js dashboard (used in packaged releases):

```bash
cd src/main/resources/dashboard
npm install
npm run export
```

This outputs static files into `src/main/resources/public/_next` for inclusion in the plugin distribution.

## Local Development

Follow these steps to run the Next.js dashboard in hot-reload mode alongside the IntelliJ plugin in a sandbox:

### 1. Start the Next.js dev server

```bash
cd src/main/resources/dashboard
npm install
export TRACKER_SERVER_PORT=55000
export NEXT_PUBLIC_TRACKER_SERVER_PORT=55000
export DASHBOARD_PORT=55001
npm run dev
```

This starts Next.js on http://localhost:$DASHBOARD_PORT with HMR for TSX, CSS, and Tailwind changes.

### 2. Launch the IntelliJ plugin sandbox

Open a separate terminal in the project root and run:

```bash
# Pick up the port saved in Settings (default 56000) and open the dashboard at that port:
./gradlew runIde \
      -PtrackerServerPort=55000 \
      -PdashboardUrl=http://localhost:55001
```

This launches the plugin sandbox. The Tracker API server and Next.js dashboard will both listen on the same port (from Settings or CLI override).

Now, any changes you make in the Next.js `app/`, `components/`, or styling files will be reflected immediately in the dashboard when you reload the plugin UI.

## Plugin Settings

In PhpStorm, open **Settings | Tools | CodePulse Time Tracker** (on Windows/Linux) or **Preferences | Tools | CodePulse Time Tracker** (on macOS). You can configure:
- **Tracker Server Port**: port number that the built-in API server listens on (default **56000**).
- **Dashboard Port**: port number that the Next.js dashboard dev server listens on (default **3000**).

Changes take effect immediately; no IDE restart is required.

### Customizing Ports

By default, the Next.js dev server runs on port 3000 and the Tracker API server listens on port 56000. You can override these ports in a **single command** using inline environment variables (so they don't affect other processes) and by passing a Gradle property for the plugin sandbox.

For example, to run Next.js on port 55555 and the Tracker API on port 55556:

```bash
# In the dashboard directory (only for this command):
DASHBOARD_PORT=55555 TRACKER_SERVER_PORT=55556 NEXT_PUBLIC_TRACKER_SERVER_PORT=55556 npm run dev

# In the plugin root (separate terminal):
./gradlew runIde -PtrackerServerPort=55556
```

This starts Next.js on http://localhost:55555 with HMR and spins up your plugin's Tracker API on port 55556.

If you want the plugin to use the port configured in its **Settings UI** (instead of the CLI override), simply omit `-PtrackerServerPort` when running `runIde`:

```bash
./gradlew runIde -PdashboardUrl=http://localhost:55555
```

> **Note:** exporting `TRACKER_SERVER_PORT` or `DASHBOARD_URL` in your shell will apply to **all** child processes (including Gradle), which may override your Settings values or CLI flags. Using inline env vars scopes them only to the prefixed command.

### One-Command Dev Workflow

To simplify running both the Tracker API server and the Next.js dashboard in parallel, we've added the `concurrently` package and defined a `dev:full` npm script in `package.json`. Now you can start both services with:

```bash
cd src/main/resources/dashboard
npm install                    # install deps including concurrently
export TRACKER_SERVER_PORT=59001
export NEXT_PUBLIC_TRACKER_SERVER_PORT=59001
export DASHBOARD_PORT=59001
npm run dev:full
```

This will:
- Launch the Tracker API server on `$TRACKER_SERVER_PORT` via Gradle
  - Start the Next.js dev server on port `$DASHBOARD_PORT` with HMR

## Production Build

To package the plugin for distribution:

```bash
./gradlew buildPlugin
```

The plugin ZIP will be available under `build/distributions`.

## Release Process

Publishing a new release is a two-step workflow: running the `release.sh` helper script to bump,
build, and publish release assets; then uploading the plugin ZIP to the JetBrains Marketplace.

Before building a release (or running the static export), clear any custom port environment variables
to ensure the production bundle uses the default ports:

```bash
export PORT=
export TRACKER_SERVER_PORT=
export NEXT_PUBLIC_TRACKER_SERVER_PORT=
export DASHBOARD_PORT=
```

1. **Run the `release.sh` script**:
   ```bash
   # bump type: patch (default), minor, or major
   ./release.sh [patch|minor|major]
   ```
   This will:
   - Bump the plugin version in `build.gradle.kts` and `plugin.xml`
   - Build the plugin ZIP and place it in `releases/`
   - Update `releases/updatePlugins.xml` (for custom update feeds)
   - Commit changes, tag `v<new_version>`, and push to GitHub

2. **Upload to JetBrains Marketplace**:
   1. Sign in to your JetBrains Marketplace account and navigate to your plugin’s **Versions** page.
   2. Click **Upload new plugin version**, select the ZIP file from the `releases/` directory,
      and fill in the release notes/changelog.

After uploading, JetBrains will process the plugin and publish your new version to users.

## Contributing

Contributions are welcome! Please fork the repository, create a branch, and open a pull request. Remember to run:

```bash
pre-commit run --all-files
```

## Issues & Support

For bug reports or feature requests, please open an issue on GitHub:

https://github.com/francis-agencemxo/Time-Tracker/issues

## Privacy Policy

The Chrome extension tracks only your active tab URLs and browsing durations, associating them with the selected CodePulse project. No page contents or personal data are collected or transmitted to external services. See [chrome-extension/PRIVACY.md](chrome-extension/PRIVACY.md) for the full policy.
