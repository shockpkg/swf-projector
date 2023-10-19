E8 -- -- -- --                  call    ...
8B 55 14                        mov     edx, DWORD PTR [ebp+0x14]
89 74 24 04                     mov     DWORD PTR [esp+0x4], esi
89 54 24 08                     mov     DWORD PTR [esp+0x8], edx
89 04 24                        mov     DWORD PTR [esp], eax
90 90 90 90 90                  nop     5
