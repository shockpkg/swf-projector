E8 -- -- -- --                  call    ...
8B 55 10                        mov     edx, DWORD PTR [ebp+0x10]
8B 4D --                        mov     ecx, DWORD PTR [ebp-...]
89 54 24 08                     mov     DWORD PTR [esp+0x8], edx
89 4C 24 04                     mov     DWORD PTR [esp+0x4], ecx
89 04 24                        mov     DWORD PTR [esp], eax
E8 -- -- -- --                  call    _gtk_menu_shell_insert
