type InstallerPluginMetadata = {
    id: string,
    author: string,
    name: string,
    description?: string,
    version: string,
    iconFile?: string,
};

type InstallerPluginAsset = {
    type: 'configuration_extension' | 'configuration_image',
    file: string,
};

export type InstallerPlugin = {
    originUrl: string,
    metadata: InstallerPluginMetadata,
    assets: InstallerPluginAsset[],
    signature?: string,
};
