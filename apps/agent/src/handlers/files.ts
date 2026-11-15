import fs from "fs";
import path from "path";
import {
  FileListResult,
  FileEntry,
  ErrorCode,
} from "@relay/protocol";

const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

/**
 * Validates that targetPath resolves within one of the allowed folders.
 * Resolves symlinks and uses whole-segment comparisons.
 */
export function validateAndResolvePath(
  targetPath: string,
  allowedFolders: string[]
): string {
  if (!targetPath || targetPath.trim() === "") {
    throw new Error("Path cannot be empty");
  }

  // Canonicalize allowed folders
  const canonicalAllowed = allowedFolders.map((f) => {
    try {
      return fs.realpathSync(path.resolve(f));
    } catch {
      return path.resolve(f);
    }
  });

  const absoluteTarget = path.resolve(targetPath);
  let realTarget: string;

  try {
    realTarget = fs.realpathSync(absoluteTarget);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // For uploads to files that don't exist yet, check the realpath of the parent directory
      const parentDir = path.dirname(absoluteTarget);
      try {
        const realParent = fs.realpathSync(parentDir);
        realTarget = path.join(realParent, path.basename(absoluteTarget));
      } catch {
        throw {
          errorCode: ErrorCode.PATH_NOT_ALLOWED,
          message: `Parent directory does not exist: ${parentDir}`,
        };
      }
    } else {
      throw {
        errorCode: ErrorCode.PATH_NOT_ALLOWED,
        message: `Cannot access path: ${err.message}`,
      };
    }
  }

  // Check if realTarget is within any canonical allowed folder
  const isAllowed = canonicalAllowed.some((allowed) => {
    if (realTarget === allowed) return true;
    return realTarget.startsWith(allowed + path.sep);
  });

  if (!isAllowed) {
    throw {
      errorCode: ErrorCode.PATH_NOT_ALLOWED,
      message: `Access denied. Path "${targetPath}" is outside allowed folders.`,
    };
  }

  return realTarget;
}

export async function handleFilesList(
  targetPath: string,
  allowedFolders: string[]
): Promise<FileListResult> {
  // If targetPath is empty or "/", return the list of allowed root folders
  if (!targetPath || targetPath === "/" || targetPath.trim() === "") {
    const rootEntries: FileEntry[] = allowedFolders
      .filter((f) => fs.existsSync(f))
      .map((folder) => {
        const stats = fs.statSync(folder);
        return {
          name: path.basename(folder) || folder,
          path: folder,
          isDirectory: true,
          size: 0,
          modifiedAt: stats.mtimeMs,
        };
      });

    return {
      currentPath: "/",
      parentPath: null,
      entries: rootEntries,
    };
  }

  const resolved = validateAndResolvePath(targetPath, allowedFolders);
  const stats = await fs.promises.stat(resolved);

  if (!stats.isDirectory()) {
    throw {
      errorCode: ErrorCode.INVALID_PARAMS,
      message: `Path is not a directory: ${targetPath}`,
    };
  }

  const dirFiles = await fs.promises.readdir(resolved, { withFileTypes: true });
  const entries: FileEntry[] = [];

  for (const dirent of dirFiles.slice(0, 1000)) {
    // skip hidden files like .DS_Store
    if (dirent.name === ".DS_Store") continue;

    const fullItemPath = path.join(resolved, dirent.name);
    try {
      const itemStats = fs.statSync(fullItemPath);
      entries.push({
        name: dirent.name,
        path: fullItemPath,
        isDirectory: dirent.isDirectory(),
        size: dirent.isDirectory() ? 0 : itemStats.size,
        modifiedAt: itemStats.mtimeMs,
      });
    } catch {
      // Permission or broken symlink
    }
  }

  // Determine parent path
  const parentCandidate = path.dirname(resolved);
  let parentPath: string | null = null;
  try {
    validateAndResolvePath(parentCandidate, allowedFolders);
    parentPath = parentCandidate;
  } catch {
    parentPath = "/";
  }

  return {
    currentPath: resolved,
    parentPath,
    entries,
  };
}

export async function handleFilesDownload(
  filePath: string,
  allowedFolders: string[]
): Promise<{
  name: string;
  size: number;
  mimeType: string;
  contentBase64: string;
}> {
  const resolved = validateAndResolvePath(filePath, allowedFolders);
  const stats = await fs.promises.stat(resolved);

  if (stats.isDirectory()) {
    throw {
      errorCode: ErrorCode.INVALID_PARAMS,
      message: "Cannot download a directory directly",
    };
  }

  if (stats.size > MAX_DOWNLOAD_BYTES) {
    throw {
      errorCode: ErrorCode.TOO_LARGE,
      message: `File exceeds maximum download size (${MAX_DOWNLOAD_BYTES / (1024 * 1024)} MB)`,
    };
  }

  const buffer = await fs.promises.readFile(resolved);

  return {
    name: path.basename(resolved),
    size: stats.size,
    mimeType: "application/octet-stream",
    contentBase64: buffer.toString("base64"),
  };
}

export async function handleFilesUpload(
  filePath: string,
  contentBase64: string,
  overwrite: boolean,
  allowedFolders: string[]
): Promise<{ success: boolean; bytesWritten: number }> {
  const resolved = validateAndResolvePath(filePath, allowedFolders);

  if (fs.existsSync(resolved) && !overwrite) {
    throw {
      errorCode: ErrorCode.INVALID_PARAMS,
      message: `File already exists at ${filePath}. Overwrite confirmation required.`,
    };
  }

  const dir = path.dirname(resolved);
  const tempPath = path.join(dir, `.upload_tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  try {
    const buffer = Buffer.from(contentBase64, "base64");
    await fs.promises.writeFile(tempPath, buffer);
    // Atomic rename
    await fs.promises.rename(tempPath, resolved);

    return {
      success: true,
      bytesWritten: buffer.length,
    };
  } catch (err: any) {
    // Clean up partial file on failure
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
    throw {
      errorCode: ErrorCode.INTERNAL,
      message: `Failed to write file: ${err.message}`,
    };
  }
}
