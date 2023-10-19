55                              push    ebp
8B EC                           mov     ebp, esp
56                              push    esi
8B F1                           mov     esi, ecx
57                              push    edi
8B 7D 08                        mov     edi, DWORD PTR [ebp+0x8]
57                              push    edi
8D 4E 04                        lea     ecx, [esi+0x4]
E8 -- -- -- --                  call    ...
8B 06                           mov     eax, DWORD PTR [esi]
83 F8 0E                        cmp     eax, 0xE
77 55                           ja      0x6F
FF 24 85 -- -- -- --            jmp     DWORD PTR [eax*4+...]
57                              push    edi
8B CE                           mov     ecx, esi
E8 -- -- -- --                  call    ...
EB 44                           jmp     0x6F
57                              push    edi
8B CE                           mov     ecx, esi
E8 -- -- -- --                  call    ...
EB 3A                           jmp     0x6F
57                              push    edi
8B CE                           mov     ecx, esi
E8 -- -- -- --                  call    ...
EB 30                           jmp     0x6F
57                              push    edi
8B CE                           mov     ecx, esi
E8 -- -- -- --                  call    ...
EB 26                           jmp     0x6F
57                              push    edi
8B CE                           mov     ecx, esi
E8 -- -- -- --                  call    ...
EB 1C                           jmp     0x6F
57                              push    edi
8B CE                           mov     ecx, esi
E8 -- -- -- --                  call    ...
EB 12                           jmp     0x6F
57                              push    edi
8B CE                           mov     ecx, esi
E8 -- -- -- --                  call    ...
EB 08                           jmp     0x6F
57                              push    edi
8B CE                           mov     ecx, esi
E8 -- -- -- --                  call    ...
5F                              pop     edi
5E                              pop     esi
5D                              pop     ebp
C2 04 00                        ret     0x4
