// This file contains compile-time defined variables.

const LAUNCHERS = '@LAUNCHERS@' as unknown as Readonly<{[key: string]: string}>;

/**
 * Get launchers, raw deflate base64 data.
 *
 * @returns Launchers object.
 */
export const launchers = () => LAUNCHERS;
