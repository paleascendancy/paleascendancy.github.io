# Configuração do Supabase — Pale Ascendancy V18

## 1. SQL
Abra o SQL Editor e execute `PALE_ASCENDANCY_V18_SUPABASE.sql`.

Antes do bloco final, substitua `SEU_EMAIL_AQUI` pelo e-mail exato da sua conta de administrador.

## 2. Redirect do e-mail
Em Authentication → URL Configuration, configure o Site URL para:

`https://paleascendancy.github.io`

Adicione também o Redirect URL:

`https://paleascendancy.github.io/perfil.html`

Se usar o endereço de projeto da Vercel, adicione também o domínio/URL correspondente.

O cadastro envia `emailRedirectTo` para `perfil.html`, então, depois de confirmar o e-mail, o Supabase pode devolver o usuário ao site com a sessão autenticada.

## 3. Teste
1. Execute o SQL.
2. Cadastre uma conta nova.
3. Confirme o e-mail.
4. O link deve retornar para `perfil.html`.
5. O perfil deve existir automaticamente na tabela `profile`.
6. Entre no painel em `admin.html` com a conta marcada em `admin_users`.

## 4. Segurança
Nunca coloque uma `service_role` key no HTML/JavaScript. O site usa somente a chave publicável.
