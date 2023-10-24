F4 4F BE A9                     stp  x20, x19, [sp, #-0x20]!
FD 7B 01 A9                     stp  x29, x30, [sp, #0x10]
FD 43 00 91                     add  x29, sp, #0x10
F3 03 00 AA                     mov  x19, x0
-- -- -- --                     adrp x8, #_kCFAllocatorDefault_ptr@PAGE
08 -- -- F9                     ldr  x8, [x8, #_kCFAllocatorDefault_ptr@PAGEOFF]
00 01 40 F9                     ldr  x0, [x8]
22 20 40 A9                     ldp  x2, x8, [x1]
-- -- -- --                     adrp x9, ...
29 -- -- 91                     add  x9, x9, ...
1F 01 00 F1                     cmp  x8, #0
21 01 88 9A                     csel x1, x9, x8, eq
-- -- -- --                     bl   _CFStringCreateWithCharacters
