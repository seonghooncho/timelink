import fs from 'node:fs';
import path from 'node:path';

type PngInfo = {
  width: number;
  height: number;
  colorType: number;
};

const mobileRoot = process.cwd();
const repoRoot = path.resolve(mobileRoot, '..');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readPngInfo(filePath: string): PngInfo {
  const buffer = fs.readFileSync(filePath);
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25),
  };
}

describe('Android launch readiness', () => {
  it('keeps the public app identity aligned with the Play package', () => {
    const app = readJson<{
      expo: {
        name: string;
        android: {
          package: string;
          blockedPermissions?: string[];
          intentFilters?: Array<{
            autoVerify?: boolean;
            data?: Array<{ scheme?: string; host?: string; pathPrefix?: string }>;
          }>;
          adaptiveIcon?: Record<string, string>;
        };
        plugins?: unknown[];
      };
    }>(path.join(mobileRoot, 'app.json'));

    expect(app.expo.name).toBe('Timelink');
    expect(app.expo.android.package).toBe('cloud.timelink.app');
    expect(app.expo.android.blockedPermissions).toContain('android.permission.RECORD_AUDIO');
    expect(app.expo.android.adaptiveIcon).toEqual(expect.objectContaining({
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    }));

    const appLinks = app.expo.android.intentFilters?.find((filter) => filter.autoVerify);
    expect(appLinks?.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ scheme: 'https', host: 'timelink.cloud', pathPrefix: '/' }),
      expect.objectContaining({ scheme: 'https', host: 'www.timelink.cloud', pathPrefix: '/' }),
    ]));
  });

  it('serves Android App Links metadata for the Play app signing certificate', () => {
    const assetLinks = readJson<Array<{
      relation: string[];
      target: {
        namespace: string;
        package_name: string;
        sha256_cert_fingerprints: string[];
      };
    }>>(path.join(repoRoot, 'fe/public/.well-known/assetlinks.json'));

    expect(assetLinks).toHaveLength(1);
    expect(assetLinks[0].relation).toContain('delegate_permission/common.handle_all_urls');
    expect(assetLinks[0].target).toEqual({
      namespace: 'android_app',
      package_name: 'cloud.timelink.app',
      sha256_cert_fingerprints: [
        'F7:BA:DE:E0:FC:1C:1D:71:DF:53:B4:E2:A2:49:FD:11:63:1D:F3:8C:15:0D:C6:76:B7:5A:BB:A6:9E:74:AC:7F',
      ],
    });
  });

  it('keeps Google Play graphic assets in required dimensions without alpha', () => {
    const assetRoot = path.join(mobileRoot, 'store-assets/google-play');

    expect(readPngInfo(path.join(assetRoot, 'icon.png'))).toEqual({
      width: 512,
      height: 512,
      colorType: 2,
    });
    expect(readPngInfo(path.join(assetRoot, 'feature-graphic.png'))).toEqual({
      width: 1024,
      height: 500,
      colorType: 2,
    });

    const screenshots = fs
      .readdirSync(path.join(assetRoot, 'phone-screenshots'))
      .filter((file) => file.endsWith('.png'))
      .sort();

    expect(screenshots).toHaveLength(5);
    for (const screenshot of screenshots) {
      expect(readPngInfo(path.join(assetRoot, 'phone-screenshots', screenshot))).toEqual({
        width: 1080,
        height: 1920,
        colorType: 2,
      });
    }
  });

  it('keeps Korean and English Play listings publishable', () => {
    const listing = readJson<Record<string, {
      title: string;
      shortDescription: string;
      fullDescription: string;
    }>>(path.join(mobileRoot, 'store-assets/google-play/listing.json'));

    expect(Object.keys(listing).sort()).toEqual(['en-US', 'ko-KR']);
    for (const value of Object.values(listing)) {
      expect(value.title).toBe('Timelink');
      expect(value.title.length).toBeLessThanOrEqual(30);
      expect(value.shortDescription.length).toBeLessThanOrEqual(80);
      expect(value.fullDescription.length).toBeLessThanOrEqual(4000);
      expect(value.fullDescription.length).toBeGreaterThan(120);
    }
  });
});
