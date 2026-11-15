import {
  ErrorCode,
  CommandExecutePayload,
  CommandResultPayload,
  CommandErrorPayload,
  FilesListParamsSchema,
  FilesDownloadParamsSchema,
  FilesUploadParamsSchema,
  ProcessKillParamsSchema,
  AudioSetVolumeParamsSchema,
  AudioSetMuteParamsSchema,
  NotifyShowParamsSchema,
} from "@relay/protocol";
import { handlePowerLock, handlePowerSleep, handlePowerRestart, handlePowerShutdown } from "./handlers/power.js";
import { handleFilesList, handleFilesDownload, handleFilesUpload } from "./handlers/files.js";
import { handleProcessList, handleProcessKill } from "./handlers/process.js";
import { handleAudioSetVolume, handleAudioSetMute } from "./handlers/audio.js";
import { handleNotifyShow } from "./handlers/notify.js";
import { ConfigManager } from "./config.js";

export class AgentDispatcher {
  constructor(private configManager: ConfigManager) {}

  public async dispatch(
    cmd: CommandExecutePayload
  ): Promise<CommandResultPayload | CommandErrorPayload> {
    const startTime = Date.now();
    const { commandId, action, params } = cmd;

    try {
      const allowedFolders = this.configManager.hasConfig()
        ? this.configManager.getConfig().allowedFolders
        : this.configManager.getDefaultAllowedFolders();

      let data: unknown;

      switch (action) {
        case "power.lock":
          data = await handlePowerLock();
          break;

        case "power.sleep":
          data = await handlePowerSleep();
          break;

        case "power.restart":
          data = await handlePowerRestart();
          break;

        case "power.shutdown":
          data = await handlePowerShutdown();
          break;

        case "files.list": {
          const parsed = FilesListParamsSchema.parse(params);
          data = await handleFilesList(parsed.path, allowedFolders);
          break;
        }

        case "files.download": {
          const parsed = FilesDownloadParamsSchema.parse(params);
          data = await handleFilesDownload(parsed.path, allowedFolders);
          break;
        }

        case "files.upload": {
          const parsed = FilesUploadParamsSchema.parse(params);
          data = await handleFilesUpload(
            parsed.path,
            parsed.contentBase64,
            parsed.overwrite,
            allowedFolders
          );
          break;
        }

        case "process.list":
          data = await handleProcessList();
          break;

        case "process.kill": {
          const parsed = ProcessKillParamsSchema.parse(params);
          data = await handleProcessKill(parsed.pid, parsed.signal);
          break;
        }

        case "audio.setVolume": {
          const parsed = AudioSetVolumeParamsSchema.parse(params);
          data = await handleAudioSetVolume(parsed.volume);
          break;
        }

        case "audio.setMute": {
          const parsed = AudioSetMuteParamsSchema.parse(params);
          data = await handleAudioSetMute(parsed.muted);
          break;
        }

        case "notify.show": {
          const parsed = NotifyShowParamsSchema.parse(params);
          data = await handleNotifyShow(parsed.title, parsed.message);
          break;
        }

        default:
          return {
            commandId,
            action,
            errorCode: ErrorCode.UNSUPPORTED,
            message: `Command action "${action}" is not supported by this agent`,
          };
      }

      return {
        commandId,
        action,
        success: true,
        data,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        commandId,
        action,
        errorCode: err.errorCode || ErrorCode.INTERNAL,
        message: err.message || "Unknown error executing command",
        details: err.details,
      };
    }
  }
}
