# Privacy Policy for Code Pulse Browsing Tracker Chrome Extension

**Last updated: 2025-06-30**

## Overview

Code Pulse Browsing Tracker ("Extension") is a Chrome extension developed by MXO (info@francislabonte.com) to capture your browsing activity and integrate with the CodePulse Time Tracker plugin for JetBrains IDEs. This policy explains what data is collected, how it is used, and how you can control it.

## Data Collected

- **Active Tab URL and Duration**  
  We record the URL of your currently active browser tab, along with start and end timestamps and the total duration (in seconds) you spend on that tab.
- **Active Project**  
  The project name you select via the popup or floating toolbar—used to tag your browsing time under a specific CodePulse project.

No other browsing history, personal data (such as page contents), or personally identifiable information (PII) is collected by the Extension.

## How Data Is Used

All collected data is transmitted only to the locally installed CodePulse Time Tracker plugin’s built-in HTTP API endpoint (default `http://localhost:56000`). The data is used exclusively to generate time-tracking statistics within your JetBrains IDE and/or Next.js dashboard.

## Data Storage & Retention

- The Extension itself does not persist data beyond the in-memory context required to detect tab changes.  
- The CodePulse plugin or dashboard stores data locally according to your IDE plugin or dashboard settings.  
- No browsing data is sent to external servers, third parties, or cloud services by the Extension.

## Third-Party Sharing

The Extension does not share any data with third parties, analytics providers, advertisers, or social media platforms.

## Security

- Data is sent via HTTP to `localhost` only.  
- No user credentials or PII are collected or transmitted.  
- You control what data is tracked—see the “Opt-out & Removal” section.

## Opt-out & Removal

- To pause or disable browsing tracking, open the Extension popup and uncheck “Show Floating Toolbar.”  
- To remove all functionality, uninstall the Extension from `chrome://extensions`. Uninstalling ceases all tracking immediately.

## Changes to This Policy

We may update this policy over time. The “Last updated” date at the top will reflect any changes. Continued use of the Extension after an update constitutes acceptance of the revised policy.

## Contact

If you have any questions or concerns about this policy, please contact us at info@francislabonte.com.