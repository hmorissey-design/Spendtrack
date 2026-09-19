/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const APP_VERSION = '1.2.0';
export const APP_BUILD_NUMBER = 2;

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
 * Checks GitHub Releases or local version endpoint for new APK updates
 */
export async function checkForAppUpdates(repoOwner = 'hmorissey-design', repoName = 'Spendtrack'): Promise<VersionInfo | null> {
  try {
    // 1. First check local live endpoint on app.loosebudget.com/version.json if present
    const localRes = await fetch('/version.json', { cache: 'no-store' }).catch(() => null);
    if (localRes && localRes.ok) {
      const data: VersionInfo = await localRes.json();
      if (data.buildNumber > APP_BUILD_NUMBER || isNewerVersion(data.version, APP_VERSION)) {
        return data;
      }
      return null;
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
        const downloadUrl = apkAsset ? apkAsset.browser_download_url : release.html_url;

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
