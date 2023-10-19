// This file contains compile-time defined variables.

export const MENU_I386 = '#{spec/asm/linux/menu-i386}' as unknown as {
	[p: string]: number[];
};

export const MENU_X8664 = '#{spec/asm/linux/menu-x86_64}' as unknown as {
	[p: string]: number[];
};

export const OFFSET_X8664 = '#{spec/asm/linux/offset-x86_64}' as unknown as {
	[p: string]: number[];
};

export const PATCH_I386 = '#{spec/asm/linux/patch-i386}' as unknown as {
	[p: string]: number[];
};

export const PATH_I386 = '#{spec/asm/linux/path-i386}' as unknown as {
	[p: string]: number[];
};

export const PATH_X8664 = '#{spec/asm/linux/path-x86_64}' as unknown as {
	[p: string]: number[];
};

export const TITLE_I386 = '#{spec/asm/linux/title-i386}' as unknown as {
	[p: string]: number[];
};

export const TITLE_X8664 = '#{spec/asm/linux/title-x86_64}' as unknown as {
	[p: string]: number[];
};
