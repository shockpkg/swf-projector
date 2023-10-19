48 8D B4 24 80 00 00 00         lea     rsi, [rsp+0x80]
BA 34 00 00 00                  mov     edx, 0x34
4C 89 FF                        mov     rdi, r15
4C 89 E1                        mov     rcx, r12
FF 50 28                        call    QWORD PTR [rax+0x28]
84 C0                           test    al, al
75 45                           jne     0x5D
49 8B 07                        mov     rax, QWORD PTR [r15]
4C 89 FF                        mov     rdi, r15
FF 50 08                        call    QWORD PTR [rax+0x8]
41 0F B6 5D 00                  movzx   ebx, BYTE PTR [r13+0x0]
48 89 EF                        mov     rdi, rbp
E8 -- -- -- --                  call    ...
48 8B 8C 24 B8 00 00 00         mov     rcx, QWORD PTR [rsp+0xB8]
64 48 33 0C 25 28 00 00 00      xor     rcx, QWORD PTR fs:0x28
89 D8                           mov     eax, ebx
0F 85 -- -- -- --               jne     ...
48 81 C4 C8 00 00 00            add     rsp, 0xC8
5B                              pop     rbx
5D                              pop     rbp
41 5C                           pop     r12
41 5D                           pop     r13
41 5E                           pop     r14
41 5F                           pop     r15
C3                              ret
-- -- -- --                     ...
48 83 7C 24 30 34               cmp     QWORD PTR [rsp+0x30], 0x34
75 --                           jne     ...
8B B4 24 A0 00 00 00            mov     esi, DWORD PTR [rsp+0xA0]
BA 01 00 00 00                  mov     edx, 0x1
4C 89 FF                        mov     rdi, r15
E8 -- -- -- --                  call    ...
84 C0                           test    al, al
74 --                           je      ...
45 31 F6                        xor     r14d, r14d
66 83 BC 24 B0 00 00 00 00      cmp     WORD PTR [rsp+0xB0], 0x0
C7 44 24 0C 00 00 00 00         mov     DWORD PTR [rsp+0xC], 0x0
74 --                           je      ...
