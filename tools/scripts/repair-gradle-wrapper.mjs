import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const [relativeProjectPath] = process.argv.slice(2);

if (!relativeProjectPath) {
  console.error(
    "Usage: node tools/scripts/repair-gradle-wrapper.mjs <projectPath>",
  );
  process.exit(1);
}

const projectPath = resolve(process.cwd(), relativeProjectPath);
const wrapperDir = join(projectPath, "gradle", "wrapper");
const wrapperJarPath = join(wrapperDir, "gradle-wrapper.jar");
const wrapperPropertiesPath = join(wrapperDir, "gradle-wrapper.properties");

async function isValidWrapperJar(filePath) {
  try {
    const fileHandle = await fs.open(filePath, "r");
    const header = Buffer.allocUnsafe(4);
    await fileHandle.read(header, 0, header.length, 0);
    await fileHandle.close();
    return header.toString("binary") === "PK\u0003\u0004";
  } catch {
    return false;
  }
}

async function currentWrapperHash(filePath) {
  const hash = createHash("sha256");
  const fileHandle = await fs.open(filePath, "r");
  try {
    const stream = fileHandle.createReadStream();
    await pipeline(stream, async (source) => {
      for await (const chunk of source) {
        hash.update(chunk);
      }
    });
  } finally {
    await fileHandle.close();
  }
  return hash.digest("hex");
}

async function parseGradleVersion() {
  try {
    const contents = await fs.readFile(wrapperPropertiesPath, "utf8");
    const match = contents.match(
      /distributionUrl=.*gradle-([\d.]+(?:-rc-\d+)?)-bin\.zip/i,
    );
    if (!match) {
      throw new Error("Unable to determine Gradle version from distributionUrl");
    }
    return match[1];
  } catch (error) {
    throw new Error(
      `Failed to read gradle-wrapper.properties: ${(error && error.message) || error}`,
    );
  }
}

async function downloadGradleDistribution(url, destination) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const fileStream = createWriteStream(destination);
  await pipeline(Readable.fromWeb(response.body), fileStream);
}

function expandArchive(archivePath, destinationPath) {
  if (process.platform === "win32") {
    const expandResult = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${archivePath}' -DestinationPath '${destinationPath}' -Force`,
      ],
      { stdio: "inherit" },
    );
    if (expandResult.status !== 0) {
      throw new Error("Failed to expand Gradle distribution with PowerShell");
    }
  } else {
    const expandResult = spawnSync(
      "unzip",
      ["-q", archivePath, "-d", destinationPath],
      { stdio: "inherit" },
    );
    if (expandResult.status !== 0) {
      throw new Error("Failed to expand Gradle distribution with unzip");
    }
  }
}

function spawnGradle(gradleExecutable, args) {
  const gradleResult =
    process.platform === "win32"
      ? spawnSync(`${gradleExecutable} ${args.join(" ")}`, {
          cwd: projectPath,
          stdio: "inherit",
          shell: true,
        })
      : spawnSync(gradleExecutable, args, {
          cwd: projectPath,
          stdio: "inherit",
        });

  if (gradleResult.status !== 0) {
    throw new Error("Gradle wrapper regeneration failed");
  }
}

async function ensureWritable(filePath) {
  try {
    await fs.chmod(filePath, 0o644);
  } catch {
    // ignore chmod failures, common if file doesn't yet exist
  }
  if (process.platform === "win32" && existsSync(filePath)) {
    spawnSync("attrib", ["-R", filePath]);
  }
}

async function setReadOnly(filePath) {
  if (!existsSync(filePath)) {
    return;
  }
  try {
    await fs.chmod(filePath, 0o444);
  } catch {
    // ignore chmod failures
  }
  if (process.platform === "win32") {
    spawnSync("attrib", ["+R", filePath]);
  }
}

async function repairWrapperJar() {
  const gradleVersion = await parseGradleVersion();
  const tmpBase = await fs.mkdtemp(join(tmpdir(), "gradle-wrapper-repair-"));
  const archivePath = join(tmpBase, `gradle-${gradleVersion}-bin.zip`);
  const extractDir = join(tmpBase, "dist");

  const distributionUrl = `https://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip`;
  console.info(`Downloading ${distributionUrl}...`);
  await downloadGradleDistribution(distributionUrl, archivePath);

  console.info("Expanding downloaded archive...");
  await fs.mkdir(extractDir, { recursive: true });
  expandArchive(archivePath, extractDir);

  const extractedGradleDir = join(extractDir, `gradle-${gradleVersion}`);
  const gradleExecutable =
    process.platform === "win32"
      ? join(extractedGradleDir, "bin", "gradle.bat")
      : join(extractedGradleDir, "bin", "gradle");

  if (!existsSync(gradleExecutable)) {
    throw new Error("Unable to locate gradle executable in extracted archive");
  }

  await ensureWritable(wrapperJarPath);
  console.info("Regenerating Gradle wrapper artifacts...");
  spawnGradle(gradleExecutable, [
    "wrapper",
    "--gradle-version",
    gradleVersion,
  ]);

  console.info("Cleaning up temporary files...");
  await fs.rm(tmpBase, { recursive: true, force: true });

  const hash = await currentWrapperHash(wrapperJarPath);
  console.info(`New gradle-wrapper.jar SHA256: ${hash}`);
  await setReadOnly(wrapperJarPath);
}

async function main() {
  const needsRepair = !existsSync(wrapperJarPath)
    ? true
    : !(await isValidWrapperJar(wrapperJarPath));

  if (!needsRepair) {
    console.info("gradle-wrapper.jar looks healthy. No repair needed.");
    const hash = await currentWrapperHash(wrapperJarPath);
    console.info(`Current SHA256: ${hash}`);
    return;
  }

  console.warn("gradle-wrapper.jar appears to be missing or corrupt. Repairing...");
  await repairWrapperJar();
  console.info("Gradle wrapper repair completed successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

