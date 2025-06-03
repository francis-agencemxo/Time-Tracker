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
npm install           # if not already installed
export TRACKER_SERVER_PORT=59001
export NEXT_PUBLIC_TRACKER_SERVER_PORT=59001
npm run dev
```

This starts Next.js on http://localhost:3000 with HMR for TSX, CSS, and Tailwind changes.

### 2. Launch the IntelliJ plugin sandbox

Open a separate terminal in the project root and run:

```bash
./gradlew runIde \
  -PtrackerServerPort=59001 \
  -PdashboardUrl=http://localhost:3000
```

This sets up the Kotlin HTTP server on port 59001 and configures the plugin's "Dashboard" button (or embedded browser) to point at the live Next.js server.

Now, any changes you make in the Next.js `app/`, `components/`, or styling files will be reflected immediately in the dashboard when you reload the plugin UI.

## Production Build

To package the plugin for distribution:

```bash
./gradlew buildPlugin
```

The plugin ZIP will be available under `build/distributions`.

## Release Process

1. Bump the version in `build.gradle.kts` under `version`.
2. Update the `<change-notes>` in `plugin.xml` or via `patchPluginXml` in `build.gradle.kts`.
3. Update `releases/updatePlugins.xml` if using a custom update feed.
4. Tag the release and push to GitHub.
5. Run `./release.sh` to upload artifacts to GitHub Releases and update the update feed.

## Contributing

Contributions are welcome! Please fork the repository, create a branch, and open a pull request. Remember to run:

```bash
pre-commit run --all-files
```

## Issues & Support

For bug reports or feature requests, please open an issue on GitHub:

https://github.com/francis-agencemxo/Time-Tracker/issues
