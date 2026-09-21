/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const APP_VERSION = '1.2.32';
export const APP_BUILD_NUMBER = 7;

export interface VersionInfo {
  version: string;
  buildNumber: number;
  releaseDate: string;
  releaseNotes: string[];
  apkDownloadUrl: string;
  minSupportedVersion?: string;
  mandatory?: boolean;
}

/**
 * Helper to determine if running inside native Android/iOS Capacitor shell
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    window.location.protocol === 'capacitor:' ||
    window.location.hostname === 'localhost' ||
    /Capacitor|AndroidNative/i.test(navigator.userAgent)
  );
}

/**
 * Helper to determine if visiting on an Android mobile device (and not Chromebook/Desktop)
 */
export function isAndroidMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android/i.test(ua) && !/CrOS|Ubuntu|X11/i.test(ua);
}

/**
 * Checks GitHub Releases or local version endpoint for new APK updates
 */
export async function checkForAppUpdates(repoOwner = 'hmorissey-design', repoName = 'Spendtrack'): Promise<VersionInfo | null> {
  // If running in a standard web browser / PWA, automatic updates are already handled by web deployments
  if (!isNativeApp()) {
    return null;
  }

  try {
    // 1. First check live absolute endpoint on app.loosebudget.com/version.json
    // Note: In Capacitor APKs, window.location.origin is 'https://localhost' or 'capacitor://localhost',
    // so we must explicitly query the live production URL https://app.loosebudget.com/version.json
    const remoteEndpoints = [
      'https://app.loosebudget.com/version.json',
      '/version.json'
    ];

    for (const endpoint of remoteEndpoints) {
      try {
        const localRes = await fetch(endpoint, { cache: 'no-store' }).catch(() => null);
        if (localRes && localRes.ok) {
          const data: VersionInfo = await localRes.json();
          if (data && (data.buildNumber > APP_BUILD_NUMBER || isNewerVersion(data.version, APP_VERSION))) {
            return data;
          }
          // If we successfully fetched the live file and we are already at latest, return null
          return null;
        }
      } catch (e) {
        // Try next endpoint
      }
    }

    // 2. Fallback to GitHub Releases API
    const ghRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      cache: 'no-store'
    }).catch(() => null);

    if (ghRes && ghRes.ok) {
      const release = await ghRes.json();
      const tagName = release.tag_name ? release.tag_name.replace(/^v/, '') : '';
      
      if (isNewerVersion(tagName, APP_VERSION)) {
        // Find attached APK asset if any, or default to direct release link
        const apkAsset = release.assets?.find((a: any) => a.name.endsWith('.apk'));
        const downloadUrl = apkAsset ? apkAsset.browser_download_url : (release.html_url || `https://github.com/${repoOwner}/${repoName}/releases`);

        return {
          version: tagName,
          buildNumber: APP_BUILD_NUMBER + 1,
          releaseDate: release.published_at ? release.published_at.substring(0, 10) : new Date().toISOString().substring(0, 10),
          releaseNotes: release.body ? release.body.split('\n').filter((l: string) => l.trim().length > 0) : ['Performance improvements & native widget updates'],
          apkDownloadUrl: downloadUrl
        };
      }
    }
  } catch (err) {
    console.warn('Update check failed:', err);
  }
  return null;
}

function isNewerVersion(remote: string, current: string): boolean {
  if (!remote || !current) return false;
  const rParts = remote.split('.').map(n => parseInt(n, 10) || 0);
  const cParts = current.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}
