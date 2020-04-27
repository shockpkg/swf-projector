// This file contains compile-time defined variables.

const LAUNCHERS: Readonly<{[key: string]: string}> = '@LAUNCHERS@' as any;

export const launchers = () => LAUNCHERS;
