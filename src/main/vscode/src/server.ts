import * as http from "http";
import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import { DatabaseManager } from "./database";
import { LicenseStore } from "./licenseStore";
import { TrackerConfiguration } from "./config";



type SessionsByProject = {
  duration: number;
  sessions: Array<{
    start: string;
    end: string;
    type: string;
    file?: string | null;
    host?: string | null;
    url?: string | null;
  }>;
};

type DashboardStats = Record<string, Record<string, SessionsByProject>>;

export class TrackerServer {
  private app: express.Express | null = null;
  private server: http.Server | null = null;
  private currentPort: number | null = null;
  private staticRoot: string | null = null;
  private config: TrackerConfiguration;

  constructor(
    private readonly database: DatabaseManager,
    private readonly licenseStore: LicenseStore,
    config: TrackerConfiguration,
  ) {
    this.config = config;
  }

  async start(port: number, staticRoot: string): Promise<void> {
    if (this.server && this.currentPort === port) {
      return;
    }

    await this.stop();

    this.app = express();
    this.staticRoot = staticRoot;
    this.currentPort = port;

    this.configureMiddleware();
    this.configureRoutes();

    await new Promise<void>((resolve) => {
      this.server = this.app!.listen(port, () => {
        console.log(`CodePulse tracker server listening on port ${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => (err ? reject(err) : resolve()));
      }).catch((error) => {
        console.warn("CodePulse: failed to stop tracker server", error);
      });
    }
    this.server = null;
    this.app = null;
    this.currentPort = null;
  }

  async restart(port: number, staticRoot: string): Promise<void> {
    await this.start(port, staticRoot);
  }

  updateConfiguration(config: TrackerConfiguration): void {
    this.config = config;
  }

  private configureMiddleware(): void {
    if (!this.app) {
      return;
    }

    this.app.use(cors());
    this.app.use(bodyParser.json({ limit: "2mb" }));
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, X-Wrike-Token",
      );
      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
      }
      next();
    });

    if (this.staticRoot && fs.existsSync(this.staticRoot)) {
      this.app.use(express.static(this.staticRoot));
    }
  }

  private configureRoutes(): void {
    if (!this.app) {
      return;
    }

    const router = express.Router();

    router.get("/stats", (_req: Request, res: Response) => {
      try {
        const sessions = this.database.getAllSessions();
        const stats: DashboardStats = {};

        for (const session of sessions) {
          const date = session.start.substring(0, 10);
          if (!stats[date]) {
            stats[date] = {};
          }
          if (!stats[date][session.project]) {
            stats[date][session.project] = {
              duration: 0,
              sessions: [],
            };
          }
          const bucket = stats[date][session.project];
          bucket.duration += this.durationSeconds(session.start, session.end);
          bucket.sessions.push({
            start: session.start,
            end: session.end,
            type: session.type,
            file: session.file ?? undefined,
            host: session.host ?? undefined,
            url: session.url ?? undefined,
          });
        }

        res.json(stats);
      } catch (error) {
        console.error("CodePulse: failed to build stats", error);
        res.status(500).json({ error: "Failed to load stats" });
      }
    });

    router.get("/projects", (_req, res: Response) => {
      try {
        res.json(this.database.getAllActiveProjects());
      } catch (error) {
        console.error("CodePulse: failed to load projects", error);
        res.status(500).json({ error: "Failed to load projects" });
      }
    });

    router
      .route("/urls")
      .get((_req, res: Response) => {
        try {
          res.json(this.database.queryAllUrls());
        } catch (error) {
          console.error("CodePulse: failed to load URLs", error);
          res.status(500).json({ error: "Failed to load URL mappings" });
        }
      })
      .post((req, res) => {
        try {
          const { project, url } = req.body ?? {};
          if (typeof project !== "string") {
            res.status(400).json({ error: "Missing project" });
            return;
          }
          this.database.insertUrl(project, typeof url === "string" ? url : null);
          res.status(201).end();
        } catch (error) {
          console.error("CodePulse: failed to insert URL", error);
          res.status(500).json({ error: "Failed to insert URL" });
        }
      });

    router
      .route("/urls/:id")
      .put((req, res) => {
        try {
          const id = Number(req.params.id);
          const { project, url } = req.body ?? {};
          if (!Number.isFinite(id) || typeof project !== "string" || typeof url !== "string") {
            res.status(400).json({ error: "Invalid payload" });
            return;
          }
          this.database.updateUrl(id, project, url);
          res.status(204).end();
        } catch (error) {
          console.error("CodePulse: failed to update URL", error);
          res.status(500).json({ error: "Failed to update URL" });
        }
      })
      .delete((req, res) => {
        try {
          const id = Number(req.params.id);
          if (!Number.isFinite(id)) {
            res.status(400).json({ error: "Invalid identifier" });
            return;
          }
          this.database.deleteUrlById(id);
          res.status(204).end();
        } catch (error) {
          console.error("CodePulse: failed to delete URL", error);
          res.status(500).json({ error: "Failed to delete URL" });
        }
      });

    router
      .route("/ignored-projects")
      .get((_req, res: Response) => {
        try {
          res.json(this.database.getAllIgnoredProjects());
        } catch (error) {
          console.error("CodePulse: failed to load ignored projects", error);
          res.status(500).json({ error: "Failed to load ignored projects" });
        }
      })
      .post((req, res) => {
        try {
          const { projectName } = req.body ?? {};
          if (typeof projectName !== "string" || !projectName.trim()) {
            res.status(400).json({ error: "Missing projectName" });
            return;
          }
          this.database.insertIgnoredProject(projectName.trim());
          res.status(201).end();
        } catch (error) {
          console.error("CodePulse: failed to insert ignored project", error);
          res.status(500).json({ error: "Failed to insert ignored project" });
        }
      });

    router.delete("/ignored-projects/:id", (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
          res.status(400).json({ error: "Invalid identifier" });
          return;
        }
        this.database.deleteIgnoredProject(id);
        res.status(204).end();
      } catch (error) {
        console.error("CodePulse: failed to delete ignored project", error);
        res.status(500).json({ error: "Failed to delete ignored project" });
      }
    });

    router
      .route("/project-names")
      .get((_req, res: Response) => {
        try {
          res.json(this.database.getAllProjectNames());
        } catch (error) {
          console.error("CodePulse: failed to load project names", error);
          res.status(500).json({ error: "Failed to load project names" });
        }
      })
      .post((req, res) => {
        try {
          const { projectName, customName } = req.body ?? {};
          if (typeof projectName !== "string" || typeof customName !== "string") {
            res.status(400).json({ error: "Invalid payload" });
            return;
          }
          this.database.insertProjectName(projectName, customName);
          res.status(201).end();
        } catch (error) {
          console.error("CodePulse: failed to insert project name", error);
          res.status(500).json({ error: "Failed to insert project name" });
        }
      });

    router
      .route("/project-names/:id")
      .put((req, res) => {
        try {
          const id = Number(req.params.id);
          const { customName } = req.body ?? {};
          if (!Number.isFinite(id) || typeof customName !== "string") {
            res.status(400).json({ error: "Invalid payload" });
            return;
          }
          this.database.updateProjectName(id, customName);
          res.status(204).end();
        } catch (error) {
          console.error("CodePulse: failed to update project name", error);
          res.status(500).json({ error: "Failed to update project name" });
        }
      })
      .delete((req, res) => {
        try {
          const id = Number(req.params.id);
          if (!Number.isFinite(id)) {
            res.status(400).json({ error: "Invalid identifier" });
            return;
          }
          this.database.deleteProjectName(id);
          res.status(204).end();
        } catch (error) {
          console.error("CodePulse: failed to delete project name", error);
          res.status(500).json({ error: "Failed to delete project name" });
        }
      });

    router
      .route("/project-clients")
      .get((_req, res: Response) => {
        try {
          res.json(this.database.getAllProjectClients());
        } catch (error) {
          console.error("CodePulse: failed to load project clients", error);
          res.status(500).json({ error: "Failed to load project clients" });
        }
      })
      .post((req, res) => {
        try {
          const { projectName, clientName } = req.body ?? {};
          if (typeof projectName !== "string" || typeof clientName !== "string") {
            res.status(400).json({ error: "Invalid payload" });
            return;
          }
          this.database.insertProjectClient(projectName, clientName);
          res.status(201).end();
        } catch (error) {
          console.error("CodePulse: failed to insert project client", error);
          res.status(500).json({ error: "Failed to insert project client" });
        }
      });

    router
      .route("/project-clients/:id")
      .put((req, res) => {
        try {
          const id = Number(req.params.id);
          const { clientName } = req.body ?? {};
          if (!Number.isFinite(id) || typeof clientName !== "string") {
            res.status(400).json({ error: "Invalid payload" });
            return;
          }
          this.database.updateProjectClient(id, clientName);
          res.status(204).end();
        } catch (error) {
          console.error("CodePulse: failed to update project client", error);
          res.status(500).json({ error: "Failed to update project client" });
        }
      })
      .delete((req, res) => {
        try {
          const id = Number(req.params.id);
          if (!Number.isFinite(id)) {
            res.status(400).json({ error: "Invalid identifier" });
            return;
          }
          this.database.deleteProjectClient(id);
          res.status(204).end();
        } catch (error) {
          console.error("CodePulse: failed to delete project client", error);
          res.status(500).json({ error: "Failed to delete project client" });
        }
      });

    router
      .route("/commits")
      .get((_req, res: Response) => {
        try {
          res.json(this.database.getAllCommits());
        } catch (error) {
          console.error("CodePulse: failed to load commits", error);
          res.status(500).json({ error: "Failed to load commits" });
        }
      })
      .post((req, res) => {
        try {
          const body = req.body ?? {};
          if (
            typeof body.project !== "string" ||
            typeof body.commitHash !== "string" ||
            typeof body.commitMessage !== "string" ||
            typeof body.commitTime !== "string"
          ) {
            res.status(400).json({ error: "Missing commit payload fields" });
            return;
          }
          this.database.insertCommit({
            project: body.project,
            commitHash: body.commitHash,
            commitMessage: body.commitMessage,
            branch: typeof body.branch === "string" ? body.branch : null,
            authorName: typeof body.authorName === "string" ? body.authorName : null,
            authorEmail: typeof body.authorEmail === "string" ? body.authorEmail : null,
            commitTime: body.commitTime,
            filesChanged: Number(body.filesChanged ?? 0),
            linesAdded: Number(body.linesAdded ?? 0),
            linesDeleted: Number(body.linesDeleted ?? 0),
          });
          res.status(201).end();
        } catch (error) {
          console.error("CodePulse: failed to insert commit", error);
          res.status(500).json({ error: "Failed to insert commit" });
        }
      });

    router
      .route("/wrike-mappings")
      .get((_req, res: Response) => {
        try {
          res.json(this.database.getAllWrikeMappings());
        } catch (error) {
          console.error("CodePulse: failed to load Wrike mappings", error);
          res.status(500).json({ error: "Failed to load Wrike mappings" });
        }
      })
      .post((req, res) => {
        try {
          const { projectName, wrikeProjectId, wrikeProjectTitle, wrikePermalink } = req.body ?? {};
          if (
            typeof projectName !== "string" ||
            typeof wrikeProjectId !== "string" ||
            typeof wrikeProjectTitle !== "string" ||
            typeof wrikePermalink !== "string"
          ) {
            res.status(400).json({ error: "Invalid payload" });
            return;
          }
          this.database.insertOrUpdateWrikeMapping({
            projectName,
            wrikeProjectId,
            wrikeTitle: wrikeProjectTitle,
            wrikePermalink,
          });
          res.status(201).end();
        } catch (error) {
          console.error("CodePulse: failed to upsert Wrike mapping", error);
          res.status(500).json({ error: "Failed to upsert Wrike mapping" });
        }
      })
      .put((req, res) => {
        try {
          const { projectName, wrikeProjectId, wrikeProjectTitle, wrikePermalink } = req.body ?? {};
          if (
            typeof projectName !== "string" ||
            typeof wrikeProjectId !== "string" ||
            typeof wrikeProjectTitle !== "string" ||
            typeof wrikePermalink !== "string"
          ) {
            res.status(400).json({ error: "Invalid payload" });
            return;
          }
          this.database.insertOrUpdateWrikeMapping({
            projectName,
            wrikeProjectId,
            wrikeTitle: wrikeProjectTitle,
            wrikePermalink,
          });
          res.status(204).end();
        } catch (error) {
          console.error("CodePulse: failed to update Wrike mapping", error);
          res.status(500).json({ error: "Failed to update Wrike mapping" });
        }
      });

    router.delete("/wrike-mappings/:id", (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
          res.status(400).json({ error: "Invalid identifier" });
          return;
        }
        this.database.deleteWrikeMapping(id);
        res.status(204).end();
      } catch (error) {
        console.error("CodePulse: failed to delete Wrike mapping", error);
        res.status(500).json({ error: "Failed to delete Wrike mapping" });
      }
    });

    router
      .route("/meeting-patterns")
      .get((_req, res: Response) => {
        try {
          res.json(this.database.getAllMeetingPatterns());
        } catch (error) {
          console.error("CodePulse: failed to load meeting patterns", error);
          res.status(500).json({ error: "Failed to load meeting patterns" });
        }
      })
      .post((req, res) => {
        try {
          const { projectName, urlPattern, meetingTitle, description, autoAssign } = req.body ?? {};
          if (typeof projectName !== "string" || typeof urlPattern !== "string") {
            res.status(400).json({ error: "Invalid payload" });
            return;
          }
          this.database.insertOrUpdateMeetingPattern({
            projectName,
            urlPattern,
            meetingTitle: typeof meetingTitle === "string" ? meetingTitle : null,
            description: typeof description === "string" ? description : null,
            autoAssign: autoAssign !== false,
          });
          res.status(201).end();
        } catch (error) {
          console.error("CodePulse: failed to upsert meeting pattern", error);
          res.status(500).json({ error: "Failed to upsert meeting pattern" });
        }
      })
      .put((req, res) => {
        try {
          const { projectName, urlPattern, meetingTitle, description, autoAssign } = req.body ?? {};
          if (typeof projectName !== "string" || typeof urlPattern !== "string") {
            res.status(400).json({ error: "Invalid payload" });
            return;
          }
          this.database.insertOrUpdateMeetingPattern({
            projectName,
            urlPattern,
            meetingTitle: typeof meetingTitle === "string" ? meetingTitle : null,
            description: typeof description === "string" ? description : null,
            autoAssign: autoAssign !== false,
          });
          res.status(204).end();
        } catch (error) {
          console.error("CodePulse: failed to update meeting pattern", error);
          res.status(500).json({ error: "Failed to update meeting pattern" });
        }
      });

    router.delete("/meeting-patterns/:id", (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
          res.status(400).json({ error: "Invalid identifier" });
          return;
        }
        this.database.deleteMeetingPattern(id);
        res.status(204).end();
      } catch (error) {
        console.error("CodePulse: failed to delete meeting pattern", error);
        res.status(500).json({ error: "Failed to delete meeting pattern" });
      }
    });

    router.post("/meeting-patterns/match", (req, res) => {
      try {
        const { url } = req.body ?? {};
        if (typeof url !== "string") {
          res.status(400).json({ error: "Missing url" });
          return;
        }
        const projectName = this.database.findMeetingPattern(url);
        if (projectName) {
          res.json({ matched: true, projectName });
        } else {
          res.json({ matched: false });
        }
      } catch (error) {
        console.error("CodePulse: failed to match meeting pattern", error);
        res.status(500).json({ error: "Failed to match meeting pattern" });
      }
    });

    router.post("/license", async (req, res) => {
      try {
        const now = Date.now();
        const store = this.licenseStore.getState();
        const licenseKey = req.body?.license_key;

        if (
          store.isValid &&
          store.licenseKey === licenseKey &&
          now - store.lastCheckMillis < 24 * 60 * 60 * 1000
        ) {
          res.json({ valid: true, message: store.lastMessage ?? "License cached" });
          return;
        }

        const result = await this.validateLicense(typeof licenseKey === "string" ? licenseKey : "");
        this.licenseStore.update({
          licenseKey,
          isValid: result.valid,
          lastCheckMillis: now,
          lastMessage: result.message ?? null,
        });

        res.json(result);
      } catch (error) {
        console.error("CodePulse: license validation failed", error);
        res.status(500).json({ valid: false, message: "License validation failed" });
      }
    });

    router.post("/license/logout", (_req, res) => {
      this.licenseStore.clear();
      res.json({ cleared: true, timestamp: Date.now() });
    });

    router
      .route("/settings")
      .get((_req, res: Response) => {
        res.json({
          idleTimeoutMinutes: this.config.idleTimeoutMinutes,
          storageType: this.config.storageType ?? "local",
        });
      })
      .post(async (req, res) => {
        try {
          const { idleTimeoutMinutes, storageType } = req.body ?? {};
          if (typeof idleTimeoutMinutes !== "number") {
            res.status(400).json({ error: "Missing idleTimeoutMinutes" });
            return;
          }

          const config = vscode.workspace.getConfiguration("codepulseTimeTracker");
          await config.update(
            "idleTimeoutMinutes",
            idleTimeoutMinutes,
            vscode.ConfigurationTarget.Global,
          );
          if (typeof storageType === "string") {
            await config.update("storageType", storageType, vscode.ConfigurationTarget.Global);
          }

          this.config = {
            ...this.config,
            idleTimeoutMinutes,
            storageType:
              typeof storageType === "string" ? storageType : this.config.storageType ?? "local",
          } as TrackerConfiguration;

          res.json({ idleTimeoutMinutes, message: "Settings saved" });
        } catch (error) {
          console.error("CodePulse: failed to save settings", error);
          res.status(500).json({ error: "Failed to save settings" });
        }
      });

    router.get(/^\/wrike(\/.*)?$/, async (req, res) => {
      const token = req.header("X-Wrike-Token");
      if (!token) {
        res.status(401).json({ error: "Missing X-Wrike-Token" });
        return;
      }

      const suffix = req.path.replace(/^\/wrike/, "");
      const query = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
      const targetUrl = `https://www.wrike.com/api/v4${suffix}${query}`;

      try {
        const response = await fetch(targetUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const text = await response.text();
        res.status(response.status).send(text);
      } catch (error) {
        console.error("CodePulse: Wrike proxy error", error);
        res.status(500).json({ error: "Wrike proxy error" });
      }
    });

    this.app.post("/url-track", (req, res) => {
      try {
        const { url, duration, project } = req.body ?? {};
        if (typeof url !== "string" || typeof duration !== "number") {
          res.status(400).json({ error: "Invalid payload" });
          return;
        }

        try {
          const parsed = new URL(url);
          let projectName = this.database.queryProjectByUrl(parsed.host);
          if (!projectName && typeof project === "string" && project.trim()) {
            projectName = project.trim();
          }

          if (projectName) {
            const end = new Date();
            const start = new Date(end.getTime() - duration * 1000);
            this.database.insertSession({
              project: projectName,
              startIso: start.toISOString(),
              endIso: end.toISOString(),
              type: "browsing",
              host: parsed.host,
              url,
            });
          }
        } catch (error) {
          console.warn("CodePulse: failed to parse URL", error);
        }

        res.send("OK");
      } catch (error) {
        console.error("CodePulse: failed to handle url-track", error);
        res.status(500).json({ error: "Failed to track URL" });
      }
    });

    this.app.use("/api", router);

    this.app.get("*", (_req, res) => {
      if (this.staticRoot) {
        const indexPath = path.join(this.staticRoot, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
          return;
        }
      }
      res.status(404).send("Not Found");
    });
  }

  private durationSeconds(startIso: string, endIso: string): number {
    const start = Date.parse(startIso);
    const end = Date.parse(endIso);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return 0;
    }
    return Math.max(0, Math.floor((end - start) / 1000));
  }

  private async validateLicense(licenseKey: string): Promise<{ valid: boolean; message?: string }> {
    const trimmed = licenseKey.trim();
    if (!trimmed) {
      return { valid: false, message: "Missing license key" };
    }

    const demoKeys = new Set(["mxo", "MXO-DEV-2025"]);
    if (demoKeys.has(trimmed)) {
      return { valid: true, message: "License key is valid (demo)" };
    }

    try {
      const response = await fetch("https://addons.francislabonte.com/api/license/verify/codepulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: trimmed }),
      });
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return {
          valid: Boolean(json.valid),
          message: json.message ?? undefined,
        };
      } catch {
        return { valid: false, message: "Invalid response from license server" };
      }
    } catch (error) {
      console.error("CodePulse: license validation request failed", error);
      return { valid: false, message: "License validation request failed" };
    }
  }
}
