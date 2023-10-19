// This file contains compile-time defined variables.

export const OOD_I386 = '#{spec/asm/windows/ood-i386}' as unknown as {
	[p: string]: number[];
};

export const OOD_X8664 = '#{spec/asm/windows/ood-x86_64}' as unknown as {
	[p: string]: number[];
};
