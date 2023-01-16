import { InstallerPlugin } from './lib/installerPlugin';
import { headwindInstallerPlugin } from './plugins/headwind';

export const getInstallerPlugins = ():InstallerPlugin[] => {
    const plugins = [
        headwindInstallerPlugin,
    ];
    return plugins;
};
