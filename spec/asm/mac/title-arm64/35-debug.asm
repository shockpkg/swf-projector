FF 43 01 D1                     sub  sp, sp, #0x50
FD 7B 04 A9                     stp  x29, x30, [sp, #0x40]
FD 03 01 91                     add  x29, sp, #0x40
A0 83 1F F8                     stur x0, [x29, #-8]
A1 03 1F F8                     stur x1, [x29, #-0x10]
A8 83 5F F8                     ldur x8, [x29, #-8]
-- -- -- --                     adrp x9, #_kCFAllocatorDefault_ptr@PAGE
29 -- -- F9                     ldr  x9, [x9, #_kCFAllocatorDefault_ptr@PAGEOFF]
20 01 40 F9                     ldr  x0, [x9]
A9 03 5F F8                     ldur x9, [x29, #-0x10]
E0 13 00 F9                     str  x0, [sp, #0x20]
E0 03 09 AA                     mov  x0, x9
E8 0F 00 F9                     str  x8, [sp, #0x18]
-- -- -- --                     bl   ...
A8 03 5F F8                     ldur x8, [x29, #-0x10]
E0 0B 00 F9                     str  x0, [sp, #0x10]
E0 03 08 AA                     mov  x0, x8
-- -- -- --                     bl   ...
E8 13 40 F9                     ldr  x8, [sp, #0x20]
E0 07 00 F9                     str  x0, [sp, #8]
E0 03 08 AA                     mov  x0, x8
E1 0B 40 F9                     ldr  x1, [sp, #0x10]
E2 07 40 F9                     ldr  x2, [sp, #8]
-- -- -- --                     bl   _CFStringCreateWithCharacters
