import fs from 'fs';
import { join } from 'path';
import { getInstallerPlugins } from 'fbw-installer-plugins-plugins';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import crypto from 'crypto';
import fastCrc32c from 'fast-crc32c';
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

if (!fs.existsSync(join(__dirname, 'plugins'))) {
    try {
        fs.mkdirSync(join(__dirname, 'plugins'));
    } catch (err) {
        Logger.error(`Error while creating output dist folder: ${err}`);
    }
}

plugins.forEach(async (plugin) => {
    const data = JSON.stringify(plugin);
    const hashBuilder = crypto.createHash('sha256');
    hashBuilder.update(data);
    const dataDigest = hashBuilder.digest();
    const dataDigestCrc32c = fastCrc32c.calculate(dataDigest);
    let dataSignResponse;
    try {
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
    const pluginContent = JSON.stringify(plugin);
    try {
        fs.writeFileSync(join(__dirname, 'plugins', pluginFilename), pluginContent);
        Logger.info(`${plugin.metadata.id} - Signed and written to ${pluginFilename}`);
    } catch (err) {
        Logger.error(`${plugin.metadata.name} - Unable to sign plugin - error: ${err}`);
    }
});
