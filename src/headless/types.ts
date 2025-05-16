export const extensionTypes = ["metamask", "flowwallet"] as const;

export type ExtensionType = (typeof extensionTypes)[number];

export type ExtensionConfig = {
    path: string;
    extensionId: string;
};
