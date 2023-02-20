import { InstallerPlugin } from '../lib/installerPlugin';

export const headwindBasePlugin: InstallerPlugin = {
    originUrl: 'https://cdn.flybywiresim.com/installer/plugin-test',
    metadata: {
        id: 'headwind-base',
        author: 'Headwind Simulations',
        name: 'Headwind Simulations',
        description: 'Adds Headwind Simulations aircraft to the FlyByWire Installer',
        version: 'v1.0.0',
        iconFile: 'https://raw.githubusercontent.com/headwind-msfs/branding/main/logos/Headwind.svg',
    },
    assets: [
        {
            type: 'configuration_extension',
            file: 'headwind-config.json',
        },
    ],
};
