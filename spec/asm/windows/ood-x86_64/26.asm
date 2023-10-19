48 89 5C 24 08                  mov     QWORD PTR [rsp+0x8], rbx
57                              push    rdi
48 83 EC 20                     sub     rsp, 0x20
48 8B D9                        mov     rbx, rcx
48 8B FA                        mov     rdi, rdx
48 83 C1 08                     add     rcx, 0x8
E8 -- -- -- --                  call    ...
44 8B 03                        mov     r8d, DWORD PTR [rbx]
41 83 E8 01                     sub     r8d, 0x1
0F 84 85 00 00 00               je      0xAB
41 83 E8 01                     sub     r8d, 0x1
74 72                           je      0x9E
41 83 E8 01                     sub     r8d, 0x1
74 5F                           je      0x91
41 83 E8 01                     sub     r8d, 0x1
74 4C                           je      0x84
41 83 E8 01                     sub     r8d, 0x1
74 39                           je      0x77
41 83 E8 01                     sub     r8d, 0x1
74 26                           je      0x6A
41 83 E8 01                     sub     r8d, 0x1
74 13                           je      0x5D
41 83 F8 01                     cmp     r8d, 0x1
75 66                           jne     0xB6
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 59                           jmp     0xB6
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 4C                           jmp     0xB6
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 3F                           jmp     0xB6
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 32                           jmp     0xB6
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 25                           jmp     0xB6
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 18                           jmp     0xB6
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 0B                           jmp     0xB6
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
48 8B 5C 24 30                  mov     rbx, QWORD PTR [rsp+0x30]
48 83 C4 20                     add     rsp, 0x20
5F                              pop     rdi
C3                              ret
