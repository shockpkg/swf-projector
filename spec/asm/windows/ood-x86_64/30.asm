48 89 5C 24 08                  mov     QWORD PTR [rsp+0x8], rbx
57                              push    rdi
48 83 EC 20                     sub     rsp, 0x20
48 8B D9                        mov     rbx, rcx
48 8B FA                        mov     rdi, rdx
48 83 C1 08                     add     rcx, 0x8
E8 -- -- -- --                  call    ...
44 8B 03                        mov     r8d, DWORD PTR [rbx]
41 83 F8 05                     cmp     r8d, 0x5
7F 64                           jg      0x81
74 55                           je      0x74
45 85 C0                        test    r8d, r8d
0F 84 90 00 00 00               je      0xB8
41 83 E8 01                     sub     r8d, 0x1
74 39                           je      0x67
41 83 E8 01                     sub     r8d, 0x1
74 26                           je      0x5A
41 83 E8 01                     sub     r8d, 0x1
74 13                           je      0x4D
41 83 F8 01                     cmp     r8d, 0x1
75 78                           jne     0xB8
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 6B                           jmp     0xB3
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 5E                           jmp     0xAE
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 51                           jmp     0xA9
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 44                           jmp     0xA4
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 37                           jmp     0x9F
41 83 F8 06                     cmp     r8d, 0x6
74 26                           je      0x94
41 83 F8 07                     cmp     r8d, 0x7
74 13                           je      0x87
41 83 F8 08                     cmp     r8d, 0x8
75 25                           jne     0x9F
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 18                           jmp     0x9A
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
EB 0B                           jmp     0x95
48 8B D7                        mov     rdx, rdi
48 8B CB                        mov     rcx, rbx
E8 -- -- -- --                  call    ...
48 8B 5C 24 30                  mov     rbx, QWORD PTR [rsp+0x30]
48 83 C4 20                     add     rsp, 0x20
5F                              pop     rdi
C3                              ret
