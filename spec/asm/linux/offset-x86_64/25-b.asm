48 8D 74 24 68                  lea     rsi, [rsp+0x68]
BA 40 00 00 00                  mov     edx, 0x40
4C 89 FF                        mov     rdi, r15
4C 89 E1                        mov     rcx, r12
FF 50 28                        call    QWORD PTR [rax+0x28]
84 C0                           test    al, al
75 48                           jne     0x5F
49 8B 07                        mov     rax, QWORD PTR [r15]
4C 89 FF                        mov     rdi, r15
FF 50 08                        call    QWORD PTR [rax+0x8]
41 0F B6 5D 00                  movzx   ebx, BYTE PTR [r13+0x0]
48 89 EF                        mov     rdi, rbp
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
-- -- -- -- -- -- --            ...
48 83 7C 24 30 40               cmp     QWORD PTR [rsp+0x30], 0x40
75 --                           jne     ...
8B B4 24 90 00 00 00            mov     esi, DWORD PTR [rsp+0x90]
41 89 F6                        mov     r14d, esi
0F B7 84 24 A4 00 00 00         movzx   eax, WORD PTR [rsp+0xA4]
C1 E0 06                        shl     eax, 0x6
41 01 C6                        add     r14d, eax
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
90 90 90 90                     nop     4
EB --                           jmp     ...
