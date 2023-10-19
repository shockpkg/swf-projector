48 8D 74 24 68                  lea     rsi, [rsp+0x68]
BA 40 00 00 00                  mov     edx, 0x40
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
48 83 7C 24 30 40               cmp     QWORD PTR [rsp+0x30], 0x40
75 --                           jne     ...
8B B4 24 90 00 00 00            mov     esi, DWORD PTR [rsp+0x90]
41 89 F7                        mov     r15d, esi
0F B7 84 24 A4 00 00 00         movzx   eax, WORD PTR [rsp+0xA4]
C1 E0 06                        shl     eax, 0x6
41 01 C7                        add     r15d, eax
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
