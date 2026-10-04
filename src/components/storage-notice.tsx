import { useSyncExternalStore } from "react";
import { serverStorageStatus, storageUnavailable, subscribeStorage } from "@/lib/safe-storage";

export function StorageNotice() {
  const unavailable = useSyncExternalStore(subscribeStorage, storageUnavailable, serverStorageStatus);
  if (!unavailable) return null;
  return <p role="status" className="border border-border bg-surface px-4 py-3 text-sm text-fg">瀏覽器無法儲存或讀取進度。目前可繼續操作，但重新整理可能遺失內容；請勿輸入真實個資。</p>;
}
