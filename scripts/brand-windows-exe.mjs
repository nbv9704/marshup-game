import path from 'node:path';
import { rcedit } from 'rcedit';

// electron-builder's own resource editor downloads an archive containing macOS
// symlinks, which cannot be unpacked on some Windows accounts. The pinned
// Windows rcedit binary edits the already-unpacked app before NSIS archives it.
export default async function brandWindowsExe(context) {
  if (context.electronPlatformName !== 'win32') return;
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const icon = path.resolve('build/icon.ico');
  const version = context.packager.appInfo.version;
  const numericVersion = version.replace(/[^\d.].*$/, '').split('.').slice(0, 4).join('.');
  await rcedit(exe, {
    icon,
    'file-version': numericVersion,
    'product-version': numericVersion,
    'version-string': {
      FileDescription: 'Mashup Arena',
      ProductName: 'Mashup Arena',
      CompanyName: 'Mashup Arena',
      OriginalFilename: 'Mashup Arena.exe',
      ProductVersion: version,
    },
  });
  console.log(`Branded ${path.basename(exe)} with Mashup Arena icon and metadata`);
}
