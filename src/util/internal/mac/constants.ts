export const VM_PROT_READ = 0x1;

export const FAT_MAGIC = 0xcafebabe;
export const MH_MAGIC = 0xfeedface;
export const MH_CIGAM = 0xcefaedfe;
export const MH_MAGIC_64 = 0xfeedfacf;
export const MH_CIGAM_64 = 0xcffaedfe;

export const LC_REQ_DYLD = 0x80000000;

export const LC_SEGMENT = 0x1;
export const LC_SYMTAB = 0x2;
export const LC_DYSYMTAB = 0xb;
export const LC_SEGMENT_64 = 0x19;
export const LC_CODE_SIGNATURE = 0x1d;
export const LC_SEGMENT_SPLIT_INFO = 0x1e;
export const LC_DYLD_INFO = 0x22;
// eslint-disable-next-line no-bitwise
export const LC_DYLD_INFO_ONLY = (0x22 | LC_REQ_DYLD) >>> 0;
export const LC_FUNCTION_STARTS = 0x26;
export const LC_DATA_IN_CODE = 0x29;
export const LC_DYLIB_CODE_SIGN_DRS = 0x2b;
export const LC_LINKER_OPTIMIZATION_HINT = 0x2e;
// eslint-disable-next-line no-bitwise
export const LC_DYLD_EXPORTS_TRIE = (0x33 | LC_REQ_DYLD) >>> 0;
// eslint-disable-next-line no-bitwise
export const LC_DYLD_CHAINED_FIXUPS = (0x34 | LC_REQ_DYLD) >>> 0;

export const SEG_TEXT = '__TEXT';
export const SECT_TEXT = '__text';
export const SEG_LINKEDIT = '__LINKEDIT';

export const CPU_TYPE_POWERPC = 0x00000012;
export const CPU_TYPE_POWERPC64 = 0x01000012;
export const CPU_TYPE_I386 = 0x00000007;
export const CPU_TYPE_X86_64 = 0x01000007;
