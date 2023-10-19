55                              push    ebp
89 E5                           mov     ebp, esp
56                              push    esi
53                              push    ebx
83 EC 10                        sub     esp, 0x10
8B 75 08                        mov     esi, DWORD PTR [ebp+0x8]
8B 45 0C                        mov     eax, DWORD PTR [ebp+0xc]
8B 18                           mov     ebx, DWORD PTR [eax]
8B 48 04                        mov     ecx, DWORD PTR [eax+0x4]
85 C9                           test    ecx, ecx
0F 44 0D -- -- -- --            cmove   ecx, DWORD PTR ds:...
89 5C 24 08                     mov     DWORD PTR [esp+0x8], ebx
89 4C 24 04                     mov     DWORD PTR [esp+0x4], ecx
8B 15 -- -- -- --               mov     edx, DWORD PTR ds:...
8B 02                           mov     eax, DWORD PTR [edx]
89 04 24                        mov     DWORD PTR [esp], eax
E8 -- -- -- --                  call    -- -- -- --
