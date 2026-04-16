import { ipc } from "@/ipc/manager";

export function openExternalLink(url: string) {
  return ipc.client.shell.openExternalLink({ url });
}

export function copyText(text: string) {
  return ipc.client.shell.copyText({ text });
}

export function openPath(path: string) {
  return ipc.client.shell.openPath({ path });
}
