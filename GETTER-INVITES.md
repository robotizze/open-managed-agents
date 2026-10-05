# GETTER AI — convites em lote

Abra **Members** no portal e use **Convidar colaboradores em lote**.

- Cole e-mails separados por linha, vírgula ou ponto e vírgula, ou importe TXT/CSV com somente e-mails (sem cabeçalho).
- Limite: 100 destinatários por lote, somente `@executive.com.br`.
- Revise os destinatários e escolha Colaborador ou Administrador. Apenas o proprietário pode convidar administradores.
- Gere links individuais ou envie por e-mail quando SMTP estiver configurado.
- Os links expiram em sete dias, são de uso único e só podem ser aceitos pela conta convidada.
- Destinatários que já são membros ou possuem convite pendente são ignorados. Para renovar, revogue o convite pendente e crie outro.
- Se o envio falhar, o convite recém-criado é removido e o destinatário pode ser tentado novamente. Em falhas de transporte, o servidor SMTP pode já ter aceitado a mensagem; apenas o novo link será válido.

## Configuração de envio

Configure no Coolify: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` e opcionalmente `SMTP_SECURE=1`. Use um remetente aprovado, por exemplo `GETTER AI <convites@executive.com.br>`; não use senhas comuns de contas pessoais.

## Google

Configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Coolify. O callback do Better Auth é `/auth/callback/google` na URL pública do portal. Os convites vinculam a aceitação ao e-mail, mas esta mudança não restringe todo o cadastro do portal ao domínio Google Workspace nem implementa isolamento entre membros.

## Limites atuais

As funções são owner/admin/member. Não há função CEO nem isolamento de recursos por usuário: os membros de um workspace compartilham recursos. O espaço privado do CEO deve ser separado antes de conectar dados confidenciais. Links antigos continuam com o comportamento original, sem vínculo a e-mail; revogue-os se não forem necessários.
