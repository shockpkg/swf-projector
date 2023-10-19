48 8D 74 24 70                  lea     rsi, [rsp+0x70]
BA 34 00 00 00                  mov     edx, 0x34
48 89 DF                        mov     rdi, rbx
4C 89 E9                        mov     rcx, r13
FF 50 28                        call    QWORD PTR [rax+0x28]
84 C0                           test    al, al
75 4E                           jne     0x50
48 8B 03                        mov     rax, QWORD PTR [rbx]
48 89 DF                        mov     rdi, rbx
FF 50 08                        call    QWORD PTR [rax+0x8]
48 8B 44 24 08                  mov     rax, QWORD PTR [rsp+0x8]
4C 89 E7                        mov     rdi, r12
0F B6 18                        movzx   ebx, BYTE PTR [rax]
E8 -- -- -- --                  call    ...
48 8B 8C 24 A8 00 00 00         mov     rcx, QWORD PTR [rsp+0xA8]
64 48 33 0C 25 28 00 00 00      xor     rcx, QWORD PTR fs:0x28
89 D8                           mov     eax, ebx
0F 85 -- -- -- --               jne     ...
48 81 C4 B8 00 00 00            add     rsp, 0xB8
5B                              pop     rbx
5D                              pop     rbp
41 5C                           pop     r12
41 5D                           pop     r13
41 5E                           pop     r14
41 5F                           pop     r15
C3                              ret
-- -- -- -- -- -- -- -- -- --   ...
48 83 7C 24 30 34               cmp     QWORD PTR [rsp+0x30], 0x34
75 --                           jne     ...
8B B4 24 90 00 00 00            mov     esi, DWORD PTR [rsp+0x90]
BA 01 00 00 00                  mov     edx, 0x1
48 89 DF                        mov     rdi, rbx
E8 -- -- -- --                  call    ...
84 C0                           test    al, al
74 92                           
66 83 BC 24 A0 00 00 00 00      cmp     WORD PTR [rsp+0xA0], 0x0
0F 84 -- -- -- --               je      ...
45 31 F6                        xor     r14d, r14d
45 31 FF                        xor     r15d, r15d
0F 1F 00                        nop     DWORD PTR [rax]
48 8B 03                        mov     rax, QWORD PTR [rbx]
4C 89 E9                        mov     rcx, r13
BA 28 00 00 00                  mov     edx, 0x28
48 89 EE                        mov     rsi, rbp
48 89 DF                        mov     rdi, rbx
FF 50 28                        call    QWORD PTR [rax+0x28]
84 C0                           test    al, al
0F 85 -- -- -- --               jne     ...
