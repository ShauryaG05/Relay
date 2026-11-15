"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  FileText,
  ChevronRight,
  ArrowUp,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  File,
} from "lucide-react";
import { api } from "@/lib/api";
import { FileListResult, FileEntry } from "@relay/protocol";

interface FileBrowserProps {
  deviceId: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FileBrowser({ deviceId }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.executeCommand<FileListResult>(deviceId, "files.list", {
        path,
      });
      if (res.data) {
        setCurrentPath(res.data.currentPath);
        setParentPath(res.data.parentPath);
        setEntries(res.data.entries);
      }
    } catch (err: any) {
      setError(err.message || "Failed to list folder");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory("");
  }, [deviceId]);

  const handleDownload = async (file: FileEntry) => {
    setDownloadingFile(file.path);
    try {
      const res = await api.executeCommand<{
        name: string;
        contentBase64: string;
        mimeType: string;
      }>(deviceId, "files.download", {
        path: file.path,
      });

      if (res.data && res.data.contentBase64) {
        const byteCharacters = atob(res.data.contentBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: res.data.mimeType || "application/octet-stream" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.data.name || file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentPath || currentPath === "/") return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(",")[1];
        if (!base64) return;

        const targetFilePath = `${currentPath.replace(/\/+$/, "")}/${file.name}`;
        await api.executeCommand(deviceId, "files.upload", {
          path: targetFilePath,
          contentBase64: base64,
          overwrite: true,
        });

        // Reload current directory
        loadDirectory(currentPath);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Navigation & Breadcrumbs Bar */}
      <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1">
          <button
            onClick={() => loadDirectory("")}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5 rounded"
          >
            Allowed Folders
          </button>
          {currentPath && currentPath !== "/" && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="font-mono text-muted-foreground truncate max-w-xs">{currentPath}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {parentPath && currentPath !== "/" && (
            <button
              onClick={() => loadDirectory(parentPath === "/" ? "" : parentPath)}
              disabled={loading}
              className="p-1.5 rounded-lg border border-border hover:bg-card text-foreground transition-colors"
              title="Go up one folder"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          )}

          {currentPath && currentPath !== "/" && (
            <label className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors flex items-center gap-1">
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Upload</span>
              <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      {/* Directory Contents */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
          <p className="text-xs">Loading files...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-600 dark:text-red-400 text-xs flex flex-col items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
          <button
            onClick={() => loadDirectory("")}
            className="mt-2 text-blue-600 dark:text-blue-400 underline font-medium"
          >
            Return to allowed roots
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-xs">
          Folder is empty or access is restricted by macOS permissions.
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.path}
              className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
            >
              <div
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  if (entry.isDirectory) {
                    loadDirectory(entry.path);
                  } else {
                    handleDownload(entry);
                  }
                }}
              >
                {entry.isDirectory ? (
                  <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="truncate">
                  <p className="text-xs font-medium text-foreground truncate">{entry.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {entry.isDirectory ? "Folder" : formatBytes(entry.size)} • {formatDate(entry.modifiedAt)}
                  </p>
                </div>
              </div>

              {!entry.isDirectory && (
                <button
                  onClick={() => handleDownload(entry)}
                  disabled={downloadingFile === entry.path}
                  className="p-1.5 rounded-lg border border-border hover:bg-card text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  title="Download file"
                >
                  {downloadingFile === entry.path ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
