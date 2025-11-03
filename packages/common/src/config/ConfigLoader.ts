import * as fs from "fs";
import * as path from "path";

export class ConfigLoader {
  private static instance: ConfigLoader;
  private configs: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  loadConfig<T>(configName: string, defaultPath?: string): T {
    if (this.configs.has(configName)) {
      return this.configs.get(configName) as T;
    }

    // Priority: ENV variable > Default path > Project root
    let configPath = process.env[`${configName.toUpperCase()}_CONFIG_PATH`];

    if (!configPath && defaultPath) {
      configPath = defaultPath;
    }

    if (!configPath) {
      // Find project root (where package.json is)
      let currentDir = __dirname;
      while (currentDir !== path.parse(currentDir).root) {
        const packageJsonPath = path.join(currentDir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          configPath = path.join(currentDir, "config", `${configName}.json`);
          break;
        }
        currentDir = path.dirname(currentDir);
      }
    }

    if (!configPath || !fs.existsSync(configPath)) {
      throw new Error(
        `Config file not found: ${configName}. Set ${configName.toUpperCase()}_CONFIG_PATH environment variable.`
      );
    }

    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);
    this.configs.set(configName, config);

    return config as T;
  }

  setConfig(configName: string, config: any): void {
    this.configs.set(configName, config);
  }

  clearCache(): void {
    this.configs.clear();
  }
}