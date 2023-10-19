8B 45 0C                        mov     eax, DWORD PTR [ebp+0xC]
89 04 24                        mov     DWORD PTR [esp], eax
E8 -- -- -- --                  call    ...
C7 44 24 08 03 00 00 00         mov     DWORD PTR [esp+0x8], 0x3
89 5C 24 04                     mov     DWORD PTR [esp+0x4], ebx
89 04 24                        mov     DWORD PTR [esp], eax
90 90 90 90 90                  nop     5
