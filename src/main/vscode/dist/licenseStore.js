"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseStore = void 0;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const LICENSE_FILE = path.join(os.homedir(), ".cache", "phpstorm-time-tracker", "license.json");
function ensureParentDir() {
    const dir = path.dirname(LICENSE_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
class LicenseStore {
    constructor() {
        this.state = this.readState();
    }
    getState() {
        return this.state;
    }
    update(partial) {
        this.state = {
            ...this.state,
            ...partial,
        };
        this.persist();
        return this.state;
    }
    clear() {
        this.state = {
            email: null,
            licenseKey: null,
            isValid: false,
            lastCheckMillis: 0,
            lastMessage: null,
        };
        this.persist();
    }
    readState() {
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
        }
        catch {
            return {
                email: null,
                licenseKey: null,
                isValid: false,
                lastCheckMillis: 0,
                lastMessage: null,
            };
        }
    }
    persist() {
        ensureParentDir();
        fs.writeFileSync(LICENSE_FILE, JSON.stringify(this.state, null, 2), "utf8");
    }
}
exports.LicenseStore = LicenseStore;
//# sourceMappingURL=licenseStore.js.map