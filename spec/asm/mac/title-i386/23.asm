55                              push    ebp
89 E5                           mov     ebp, esp
57                              push    edi
56                              push    esi
83 EC 10                        sub     esp, 0x10
E8 00 00 00 00                  call    0xd
5F                              pop     edi
8B 45 0C                        mov     eax, DWORD PTR [ebp+0xc]
8B 8F -- -- -- --               mov     ecx, DWORD PTR [edi+...]
8B 09                           mov     ecx, DWORD PTR [ecx]
8B 10                           mov     edx, DWORD PTR [eax]
8B 40 04                        mov     eax, DWORD PTR [eax+0x4]
85 C0                           test    eax, eax
0F 44 87 -- -- -- --            cmove   eax, DWORD PTR [edi+...]
89 54 24 08                     mov     DWORD PTR [esp+0x8], edx
89 44 24 04                     mov     DWORD PTR [esp+0x4], eax
89 0C 24                        mov     DWORD PTR [esp], ecx
E8 -- -- -- --                  call    _CFStringCreateWithCharacters
