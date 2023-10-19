E8 -- -- -- --                  call    ...
8B 55 DC                        mov     edx, DWORD PTR [ebp-0x24]
8B 42 60                        mov     eax, DWORD PTR [edx+0x60]
89 04 24                        mov     DWORD PTR [esp], eax
E8 -- -- -- --                  call    _gtk_widget_show
