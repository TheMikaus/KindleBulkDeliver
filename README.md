# KindleBulkDeliver

Automation that will have Amazon deliver all of your books to a specific device.

## Windows 11 setup

1. Install **Node.js LTS** from https://nodejs.org, then close and open a new PowerShell window so the `node` and `npm` commands are available in PATH.
2. In PowerShell, go to this project folder:
   ```powershell
   cd C:\path\to\KindleBulkDeliver
   ```
3. Initialize npm (creates `package.json`):
   ```powershell
   npm init -y
   ```
4. Install Playwright:
   ```powershell
   npm install playwright
   ```
5. Install the Chromium browser Playwright uses:
   ```powershell
   npx playwright install chromium
   ```

## Script file

An empty `deliver-kindle.js` file is included in this repo. Paste your existing Kindle delivery automation script into that file.
