import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import { app, dialog } from "electron";
import fs from "node:fs";
import { MAIN_DIST, RENDERER_DIST } from "./index";

class BackendManager {
  private backendProcess: ChildProcess | null = null;
  private readonly BACKEND_PORT: number = 5000;
  private readonly HEALTH_CHECK_INTERVAL: number = 10000;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private appRoot: string;

  constructor(APP_ROOT: string) {
    // Initialize appRoot in the constructor
    this.appRoot = APP_ROOT;
    this.initializeBackendManager();
  }

  private logPathInformation() {
    console.log("Backend Path Resolution Debug:");
    console.log("APP_ROOT:", this.appRoot);
    console.log("MAIN_DIST:", MAIN_DIST);
    console.log("RENDERER_DIST:", RENDERER_DIST);

    try {
      console.log("Attempted Backend Path:", this.getBackendPath());
    } catch (error) {
      console.error("Error getting backend path:", error);
    }
  }

  private initializeBackendManager() {
    // Bind methods to ensure correct context
    this.startBackendProcess = this.startBackendProcess.bind(this);
    this.stopBackendProcess = this.stopBackendProcess.bind(this);
    this.performHealthCheck = this.performHealthCheck.bind(this);
  }

  private getBackendPath(): string {
    // For packaged app
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "backend.exe");
    }

    // Development paths
    const possiblePaths = [
      path.join(this.appRoot, "electron", "backend.exe"),
      path.join(this.appRoot, "backend.exe"),
      path.join(this.appRoot, "dist-electron", "backend.exe"),
      // Add more potential paths as needed
    ];

    for (const backendPath of possiblePaths) {
      if (fs.existsSync(backendPath)) {
        console.log("Backend executable found at:", backendPath);
        return backendPath;
      }
    }

    // Fallback and error handling
    console.error("Possible backend paths searched:", possiblePaths);
    throw new Error(
      "Backend executable not found. Please check your project structure."
    );
  }

  // ... rest of the class remains the same
  public startBackendProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const backendPath = this.getBackendPath();

      console.log("Starting Backend Process:", backendPath);

      try {
        this.backendProcess = spawn(backendPath, {
          detached: true,
          stdio: "pipe",
          shell: false,
          env: {
            ...process.env,
            BACKEND_PORT: this.BACKEND_PORT.toString(),
          },
        });

        // Logging backend process output
        this.backendProcess.stdout?.on("data", (data) => {
          console.log(`Backend stdout: ${data}`);
        });

        this.backendProcess.stderr?.on("data", (data) => {
          console.error(`Backend stderr: ${data}`);
        });

        // Error handling
        this.backendProcess.on("error", (err) => {
          console.error("Failed to start backend process:", err);
          this.showBackendErrorDialog(err);
          reject(err);
        });

        // Process exit handling
        this.backendProcess.on("close", (code) => {
          console.log(`Backend process exited with code ${code}`);

          if (code !== 0) {
            this.handleBackendCrash();
          }
        });

        // Start health check
        this.startHealthCheck();

        // Wait a bit to ensure process is up
        setTimeout(() => {
          this.checkBackendHealth().then(resolve).catch(reject);
        }, 2000);
      } catch (error) {
        console.error("Error spawning backend:", error);
        this.showBackendErrorDialog(error);
        reject(error);
      }
    });
  }

  private async checkBackendHealth(): Promise<void> {
    try {
      const response = await fetch(
        `http://localhost:${this.BACKEND_PORT}/api/stats`
      );

      if (response.ok) {
        console.log("Backend is healthy");
        console.table(await response.json());
        return;
      }
      throw new Error("Unhealthy backend");
    } catch (error) {
      console.error("Backend health check failed:", error);
      return Promise.reject(error);
    }
  }

  private startHealthCheck() {
    this.healthCheckTimer = setInterval(
      this.performHealthCheck,
      this.HEALTH_CHECK_INTERVAL
    );
  }

  private async performHealthCheck() {
    try {
      await this.checkBackendHealth();
    } catch {
      this.handleBackendCrash();
    }
  }

  private handleBackendCrash() {
    // Stop existing health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Attempt to restart
    console.warn("Backend crashed. Attempting restart...");
    this.stopBackendProcess();

    // Retry starting backend
    setTimeout(() => {
      this.startBackendProcess().catch((error) => {
        this.showBackendErrorDialog(error);
      });
    }, 2000);
  }

  public stopBackendProcess() {
    if (this.backendProcess) {
      try {
        // Stop health checking
        if (this.healthCheckTimer) {
          clearInterval(this.healthCheckTimer);
        }

        // Kill process based on platform
        if (process.platform === "win32") {
          spawn("taskkill", [
            "/pid",
            this.backendProcess.pid!.toString(),
            "/f",
            "/t",
          ]);
        } else {
          process.kill(-this.backendProcess.pid!);
        }

        this.backendProcess = null;
      } catch (error) {
        console.error("Error stopping backend process:", error);
      }
    }
  }

  private showBackendErrorDialog(error: any) {
    dialog.showErrorBox(
      "Backend Service Error",
      `Failed to start or maintain backend service. 
      Error: ${error instanceof Error ? error.message : error}`
    );
  }

  // Getter for backend port (useful for IPC)
  public getBackendPort(): number {
    return this.BACKEND_PORT;
  }
}

export default BackendManager;
