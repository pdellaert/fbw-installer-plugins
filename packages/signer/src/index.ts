import { join } from 'path';
import { getInstallerPlugins, getAssetsDetails } from 'fbw-installer-plugins-plugins';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import { program } from 'commander';
import crypto from 'crypto';
import fastCrc32c from 'fast-crc32c';
import fs from 'fs';
import Logger from './lib/logger';

const projectId = process.env.GCLOUD_PROJECT || '';
const locationId = process.env.GCLOUD_LOCATION || 'global';
const keyRingId = process.env.GCLOUD_KEYRING || '';
const keyId = process.env.GCLOUD_KEY || '';
const keyVersionId = process.env.GCLOUD_KEY_VERSION || '';
const clientPrivateKeyBase64 = Buffer.from(process.env.GCLOUD_PRIVATE_KEY || '', 'base64');
const clientPrivateKey = clientPrivateKeyBase64.toString('utf-8');
const clientAuthOptions = {
    credentials: {
        client_email: process.env.GCLOUD_CLIENT_EMAIL || '',
        private_key: clientPrivateKey,
    },
    projectId,
};
const gcloudKMSClient = new KeyManagementServiceClient(clientAuthOptions);
const keyVersionName = gcloudKMSClient.cryptoKeyVersionPath(
    projectId,
    locationId,
    keyRingId,
    keyId,
    keyVersionId,
);
const plugins = getInstallerPlugins();

program
    .description('Signs a FlyByWire Installer Plugin')
    .option('-p, --plugin-ids <plugin...>', 'Provide one or more IDs of plugins to sign.')
    .action(async (options) => {
        const { pluginIds } = options;
        if (pluginIds !== undefined) {
            Logger.debug(`Plugin IDs provided: ${pluginIds.join(', ')}`);
        } else {
            Logger.debug('No Plugin IDs provided, signing all');
        }
        if (!fs.existsSync(join(__dirname, 'plugins'))) {
            try {
                fs.mkdirSync(join(__dirname, 'plugins'));
            } catch (err) {
                Logger.error(`Error while creating output dist folder: ${err}`);
            }
        }

        for (const plugin of plugins) {
            Logger.debug(`Handling ${plugin.metadata.id}`);
            if (pluginIds !== undefined && !pluginIds.includes(plugin.metadata.id)) {
                Logger.debug(`${plugin.metadata.id} is not equal to the requested plugin IDs: ${pluginIds.join(', ')}`);
                continue;
            }
            const data = JSON.stringify({
                plugin,
                // eslint-disable-next-line no-await-in-loop
                assetsDetails: await getAssetsDetails(plugin),
            });
            const hashBuilder = crypto.createHash('sha256');
            hashBuilder.update(data);
            const dataDigest = hashBuilder.digest();
            const dataDigestCrc32c = fastCrc32c.calculate(dataDigest);
            let dataSignResponse;
            try {
                // eslint-disable-next-line no-await-in-loop
                [dataSignResponse] = await gcloudKMSClient.asymmetricSign({
                    name: keyVersionName,
                    digest: { sha256: dataDigest },
                    digestCrc32c: { value: dataDigestCrc32c },
                });
            } catch (err) {
                Logger.error(`${plugin.metadata.id} - Unable to sign plugin - error: ${err}`);
                return;
            }

            if (!dataSignResponse || !dataSignResponse.signature) {
                Logger.error(`${plugin.metadata.id} - Unable to sign plugin - error: Illegal response`);
                return;
            }
            Logger.info(`${plugin.metadata.id} - Successfully signed`);

            const dataSignature = Buffer.from(dataSignResponse.signature).toString('base64');
            plugin.signature = dataSignature;
            const pluginFilename = `${plugin.metadata.id}.json`;
            const pluginContent = JSON.stringify(plugin, null, 2);
            try {
                fs.writeFileSync(join(__dirname, 'plugins', pluginFilename), pluginContent);
                Logger.info(`${plugin.metadata.id} - Signed and written to ${pluginFilename}`);
            } catch (err) {
                Logger.error(`${plugin.metadata.name} - Unable to sign plugin - error: ${err}`);
            }
        }
    });

program.parse();
