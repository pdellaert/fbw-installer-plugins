import fetch from 'cross-fetch';
import Logger from './lib/logger';
import { InstallerPlugin } from './lib/installerPlugin';
import { headwindInstallerPlugin } from './plugins/headwind';

export function getInstallerPlugins():InstallerPlugin[] {
    const plugins = [
        headwindInstallerPlugin,
    ];
    return plugins;
}

export async function getAssetsDetails(plugin: InstallerPlugin) {
    const assetsList = [];
    const { assets, originUrl } = plugin;
    const fetchController = new AbortController();
    const fetchTimeout = setTimeout(() => fetchController.abort(), 5000);
    for (const asset of assets) {
        const { file } = asset;
        const assetUrl = `${originUrl}/assets/${file}`;
        Logger.debug(`Handling asset - ${file} - ${assetUrl}`);
        try {
            // eslint-disable-next-line no-await-in-loop
            const assetResponse = await fetch(assetUrl);
            if (assetResponse.ok) {
                // eslint-disable-next-line no-await-in-loop
                const assetData = await assetResponse.json();
                assetsList.push(assetData);
            } else {
                Logger.error(`${plugin.metadata.id} - Unable to fetch asset: ${file} - error: response code ${assetResponse.status}`);
            }
        } catch (err) {
            Logger.error(`${plugin.metadata.id} - Unable to fetch asset: ${file} - error: ${err}`);
        } finally {
            clearTimeout(fetchTimeout);
        }
    }
    return assetsList;
}
