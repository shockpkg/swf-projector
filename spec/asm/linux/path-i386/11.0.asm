0F 84 -- -- -- --               je      ...
8D 45 E4                        lea     eax, [ebp-0x1C]
31 DB                           xor     ebx, ebx
89 04 24                        mov     DWORD PTR [esp], eax
C7 44 24 04 -- -- -- --         mov     DWORD PTR [esp+0x4], ...
E8 -- -- -- --                  call    ...
