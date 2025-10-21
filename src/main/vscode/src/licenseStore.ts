import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface LicenseState {
  email?: string | null;
  licenseKey?: string | null;
  isValid: boolean;
  lastCheckMillis: number;
  lastMessage?: string | null;
}

const LICENSE_FILE = path.join(
  os.homedir(),
  ".cache",
  "phpstorm-time-tracker",
  "license.json",
);

function ensureParentDir(): void {
  const dir = path.dirname(LICENSE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export class LicenseStore {
  private state: LicenseState;

  constructor() {
    this.state = this.readState();
  }

  getState(): LicenseState {
    return this.state;
  }

  update(partial: Partial<LicenseState>): LicenseState {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.persist();
    return this.state;
  }

  clear(): void {
    this.state = {
      email: null,
      licenseKey: null,
      isValid: false,
      lastCheckMillis: 0,
      lastMessage: null,
    };
    this.persist();
  }

  private readState(): LicenseState {
    try {
      const raw = fs.readFileSync(LICENSE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return {
        email: parsed.email ?? null,
        licenseKey: parsed.licenseKey ?? parsed.license_key ?? null,
        isValid: Boolean(parsed.isValid),
        lastCheckMillis: Number(parsed.lastCheckMillis ?? parsed.last_check_ms ?? 0),
        lastMessage: parsed.lastMessage ?? null,
      };
    } catch {
      return {
        email: null,
        licenseKey: null,
        isValid: false,
        lastCheckMillis: 0,
        lastMessage: null,
      };
    }
  }

  private persist(): void {
    ensureParentDir();
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(this.state, null, 2), "utf8");
  }
}
