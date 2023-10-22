55                              push    rbp
48 89 E5                        mov     rbp, rsp
41 56                           push    r14
53                              push    rbx
49 89 FE                        mov     r14, rdi
48 8B 05 -- -- -- --            mov     rax, QWORD PTR [rip+...]
48 8B 38                        mov     rdi, QWORD PTR [rax]
48 8B 16                        mov     rdx, QWORD PTR [rsi]
48 8B 76 08                     mov     rsi, QWORD PTR [rsi+0x8]
48 85 F6                        test    rsi, rsi
75 07                           jne     0x1d
48 8D 35 -- -- -- --            lea     rsi, [rip+...]
E8 -- -- -- --                  call    _CFStringCreateWithCharacters
