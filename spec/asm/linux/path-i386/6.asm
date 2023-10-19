55                              push    ebp
57                              push    edi
56                              push    esi
53                              push    ebx
83 EC 24                        sub     esp, 0x24
BB 00 10 00 00                  mov     ebx, 0x1000
8B 6C 24 40                     mov     ebp, DWORD PTR [esp+0x40]
53                              push    ebx
68 -- -- -- --                  push    ...
C6 05 -- -- -- -- 00            mov     BYTE PTR ds:..., 0x0
E8 -- -- -- --                  call    ...
89 C7                           mov     edi, eax
83 C4 10                        add     esp, 0x10
85 FF                           test    edi, edi
0F 84 -- -- -- --               je      ...
85 ED                           test    ebp, ebp
0F 84 -- -- -- --               je      ...
83 EC 08                        sub     esp, 0x8
53                              push    ebx
57                              push    edi
E8 -- -- -- --                  call    ...
83 C4 10                        add     esp, 0x10
84 C0                           test    al, al
0F 84 -- -- -- --               je      ...
83 EC 08                        sub     esp, 0x8
68 -- -- -- --                  push    ...
8D 5C 24 0C                     lea     ebx, [esp+0xC]
53                              push    ebx
E8 -- -- -- --                  call    ...
5A                              pop     edx
59                              pop     ecx
57                              push    edi
53                              push    ebx
E8 -- -- -- --                  call    ...
89 2C 24                        mov     DWORD PTR [esp], ebp
E8 -- -- -- --                  call    ...
83 C4 10                        add     esp, 0x10
83 F8 05                        cmp     eax, 0x5
7E --                           jle     ...
83 EC 0C                        sub     esp, 0xC
57                              push    edi
