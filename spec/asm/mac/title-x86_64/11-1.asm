55                              push    rbp
48 89 E5                        mov     rbp, rsp
41 54                           push    r12
53                              push    rbx
49 89 FC                        mov     r12, rdi
48 8B 16                        mov     rdx, QWORD PTR [rsi]
48 8B 76 08                     mov     rsi, QWORD PTR [rsi+0x8]
48 85 F6                        test    rsi, rsi
74 --                           je      --
48 8B 05 -- -- -- --            mov     rax, QWORD PTR [rip+...]
48 8B 38                        mov     rdi, QWORD PTR [rax]
E8 -- -- -- --                  call    -- -- -- --
