89 04 24                        mov     DWORD PTR [esp], eax
E8 -- -- -- --                  call    ...
BA 03 00 00 00                  mov     edx, 0x3
89 54 24 08                     mov     DWORD PTR [esp+0x8], edx
89 -- 24 04                     mov     DWORD PTR [esp+0x4], ...
89 04 24                        mov     DWORD PTR [esp], eax
90 90 90 90 90                  nop     5
