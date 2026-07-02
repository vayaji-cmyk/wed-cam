const GUEST_ID_KEY = "wedding_cam_guest_id";
const GUEST_NAME_KEY = "wedding_cam_guest_name";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = generateId();
    window.localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getGuestName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GUEST_NAME_KEY);
}

export function setGuestName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_NAME_KEY, name.trim());
}
