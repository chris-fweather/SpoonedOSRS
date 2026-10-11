export function localPreviewAllowed(dev: boolean, enabled: string | undefined, url: URL): boolean {
  return dev && enabled === '1' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}
