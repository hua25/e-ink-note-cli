export interface FanOutResult<T> {
  success: Record<string, T>;
  failed: Record<string, string>;
}

export async function fanOut<T>(
  deviceIds: string[],
  fn: (deviceId: string) => Promise<T>,
): Promise<FanOutResult<T>> {
  const results = await Promise.allSettled(deviceIds.map(fn));
  const success: Record<string, T> = {};
  const failed: Record<string, string> = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      success[deviceIds[i]] = r.value;
    } else {
      failed[deviceIds[i]] = r.reason instanceof Error ? r.reason.message : String(r.reason);
    }
  });
  return { success, failed };
}
