import { access, copyFile, mkdir, writeFile, symlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.platform !== 'darwin') throw new Error('La construction du DMG nécessite macOS.');
const root = fileURLToPath(new URL('../', import.meta.url));
const staging = path.join(root, 'outputs/desktop/staging');
const contents = path.join(staging, 'Ancrage.app/Contents');
await mkdir(path.join(contents, 'MacOS'), { recursive: true });
await mkdir(path.join(contents, 'Resources'), { recursive: true });
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} a échoué (${result.status}).`);
}
run('swiftc', ['-O', '-target', 'arm64-apple-macosx13.0', '-module-cache-path', path.join(root, 'outputs/desktop/module-cache'), path.join(root, 'desktop/Ancrage.swift'), '-o', path.join(contents, 'MacOS/Ancrage')]);
await access(path.join(contents, 'MacOS/Ancrage'));
const iconset = path.join(root, 'outputs/desktop/Ancrage.iconset');
await mkdir(iconset, { recursive: true });
for (const size of [16, 32, 128, 256, 512]) {
  for (const scale of [1, 2]) {
    run('sips', ['-z', String(size * scale), String(size * scale), path.join(root, 'app/assets/brand-rock.png'), '--out', path.join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`)]);
  }
}
run('iconutil', ['-c', 'icns', iconset, '-o', path.join(root, 'outputs/desktop/Ancrage.icns')]);
await copyFile(path.join(root, 'outputs/desktop/Ancrage.icns'), path.join(contents, 'Resources/Ancrage.icns'));
await writeFile(path.join(contents, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Ancrage</string>
<key>CFBundleIdentifier</key><string>fr.ancrage.cockpit</string>
<key>CFBundleName</key><string>Ancrage</string>
<key>CFBundleIconFile</key><string>Ancrage</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
`);
run('codesign', ['--force', '--sign', '-', path.join(staging, 'Ancrage.app')]);
try { await symlink('/Applications', path.join(staging, 'Applications')); } catch (error) { if (error.code !== 'EEXIST') throw error; }
const destination = path.join(root, 'outputs/desktop/Ancrage-1.0.0-arm64.dmg');
run('hdiutil', ['create', '-ov', '-volname', 'Ancrage', '-srcfolder', staging, '-format', 'UDZO', destination]);
run('hdiutil', ['verify', destination]);
console.log(destination);
