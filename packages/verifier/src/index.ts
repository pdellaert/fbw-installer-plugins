import crypto from 'crypto';
import fs from 'fs';
import { getAssetsDetails } from 'fbw-installer-plugins-plugins';
import { program } from 'commander';
import Logger from './lib/logger';

program
    .description('Verifies a FlyByWire Installer Plugin')
    .option('-p, --plugin <path>', 'Provide a path to the json file of the plugin to verify.')
    .parse(process.argv);
const processArguments = program.opts();
const pluginFile = processArguments.plugin;

async function verify(pluginFile: string) {
    if (!pluginFile || !fs.existsSync(pluginFile)) {
        Logger.error('Plugin verification - Invalid plugin file path provided');
        process.exit(10);
    }

    const pluginPublicKeyBase64 = Buffer.from(process.env.PLUGIN_PUBLIC_KEY || '', 'base64');
    if (!pluginPublicKeyBase64) {
        Logger.error('Plugin verification - Missing public key environment variable');
        process.exit(20);
    }
    const pluginPublicKey = crypto.createPublicKey(pluginPublicKeyBase64.toString('utf-8'));

    let plugin;
    try {
        plugin = JSON.parse(fs.readFileSync(pluginFile, 'utf-8'));
    } catch (err) {
        Logger.error(`Plugin verification - Invalid plugin file format: ${err}`);
        process.exit(30);
    }

    const { signature } = plugin;
    if (!signature) {
        Logger.error('Plugin verification - Plugin does not have a signature');
        process.exit(40);
    }
    const signatureBuffer = Buffer.from(signature, 'base64');

    delete plugin.signature;
    const data = JSON.stringify({
        plugin,
        assetsDetails: await getAssetsDetails(plugin),
    });
    const pluginVerifier = crypto.createVerify('sha256');
    pluginVerifier.update(data);
    pluginVerifier.end();
    const pluginVerified = pluginVerifier.verify(pluginPublicKey, signatureBuffer);

    if (!pluginVerified) {
        Logger.error(`${plugin.metadata.id} is invalid and can not be verified`);
        process.exit(50);
    }
    Logger.info(`${plugin.metadata.id} is successfully verified`);
}

verify(pluginFile);
