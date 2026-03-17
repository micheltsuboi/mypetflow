const sharp = require('sharp');
const path = require('path');

const input = '/Users/micheltsuboi/Documents/MY PET FLOW/LOGO-03.svg';
const publicDir = '/Users/micheltsuboi/Documents/MY PET FLOW/public';

const targets = [
    { name: 'icon-192.png', size: 192, padding: 0 },
    { name: 'icon-512.png', size: 512, padding: 0 },
    { name: 'apple-touch-icon.png', size: 180, padding: 20, whiteBg: true },
];

async function generate() {
    for (const t of targets) {
        let s = sharp(input);

        // For apple touch icon, we usually want it non-transparent on white
        if (t.whiteBg) {
            s = s.resize(t.size - t.padding, t.size - t.padding, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
                .extend({
                    top: t.padding / 2,
                    bottom: t.padding / 2,
                    left: t.padding / 2,
                    right: t.padding / 2,
                    background: 'white'
                })
                .flatten({ background: 'white' });
        } else {
            s = s.resize(t.size, t.size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } });
        }

        await s.toFile(path.join(publicDir, t.name));
        console.log(`Generated ${t.name}`);
    }
}

generate();
