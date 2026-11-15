import { getCollection, DeviceDoc } from "./mongo.js";

export async function findDeviceById(id: string): Promise<DeviceDoc | null> {
  const devices = getCollection<DeviceDoc>("devices");
  return devices.findOne({ id });
}

export async function findDeviceByTokenHash(tokenHash: string): Promise<DeviceDoc | null> {
  const devices = getCollection<DeviceDoc>("devices");
  return devices.findOne({ tokenHash, revokedAt: { $exists: false } });
}

export async function listDevicesForUser(userId: string): Promise<DeviceDoc[]> {
  const devices = getCollection<DeviceDoc>("devices");
  return devices.find({ userId, revokedAt: { $exists: false } }).sort({ pairedAt: -1 }).toArray();
}

export async function updateDevicePresence(
  deviceId: string,
  status: "online" | "offline",
  lastSeenAt: Date = new Date()
): Promise<void> {
  const devices = getCollection<DeviceDoc>("devices");
  await devices.updateOne(
    { id: deviceId },
    {
      $set: {
        status,
        lastSeenAt,
      },
    }
  );
}

export async function updateDeviceCapabilities(
  deviceId: string,
  data: {
    agentVersion: string;
    osVersion: string;
    chip: string;
    hostname: string;
    capabilities: string[];
    allowedFolders: string[];
  }
): Promise<void> {
  const devices = getCollection<DeviceDoc>("devices");
  await devices.updateOne(
    { id: deviceId },
    {
      $set: {
        agentVersion: data.agentVersion,
        osVersion: data.osVersion,
        chip: data.chip,
        hostname: data.hostname,
        capabilities: data.capabilities,
        allowedFolders: data.allowedFolders,
        status: "online",
        lastSeenAt: new Date(),
      },
    }
  );
}

export async function updateDeviceAllowlist(
  deviceId: string,
  userId: string,
  allowedFolders: string[]
): Promise<void> {
  const devices = getCollection<DeviceDoc>("devices");
  const result = await devices.updateOne(
    { id: deviceId, userId, revokedAt: { $exists: false } },
    {
      $set: {
        allowedFolders,
      },
    }
  );
  if (result.matchedCount === 0) {
    throw new Error("Device not found or not owned by user");
  }
}

export async function revokeDevice(deviceId: string, userId: string): Promise<DeviceDoc> {
  const devices = getCollection<DeviceDoc>("devices");
  const device = await devices.findOne({ id: deviceId, userId });
  if (!device) {
    throw new Error("Device not found or not owned by user");
  }

  await devices.updateOne(
    { id: deviceId },
    {
      $set: {
        revokedAt: new Date(),
        status: "offline",
      },
    }
  );

  return { ...device, revokedAt: new Date(), status: "offline" };
}
