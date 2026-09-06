# Configuração do Supabase — Pale Ascendancy V3

## URL de produção

A implantação pública atual é:

`https://paleascendancy.vercel.app`

Em **Authentication → URL Configuration**, configure o **Site URL** para esse domínio e permita os redirects usados pela autenticação, incluindo:

`https://paleascendancy.vercel.app/perfil.html`

Se GitHub Pages continuar disponível apenas como hospedagem alternativa, ele não deve substituir o domínio de produção nas configurações principais.

## Banco de dados

As mudanças novas da V3 ficam em `database/migrations/`.

A migration atual de pedidos é:

`database/migrations/20260906_v3_project_requests.sql`

Ela cria `project_requests`, RLS, índices e validação de profissional público. A migration precisa ser revisada e executada manualmente no Supabase SQL Editor; o commit no GitHub não altera o banco automaticamente.

Os arquivos SQL antigos da raiz pertencem a versões anteriores e servem apenas como histórico até serem arquivados de forma segura.

## Testes de autenticação

1. Cadastre uma conta de teste.
2. Confirme o e-mail, quando a confirmação estiver habilitada.
3. Verifique se o retorno acontece no domínio Vercel.
4. Confirme que o perfil correspondente existe em `profile`.
5. Teste login comum, login profissional aprovado e login administrativo separadamente.
6. Teste logout e retorno para a Home com recarregamento completo da página.

## Segurança

Nunca coloque uma `service_role` key no HTML ou JavaScript. O frontend deve usar somente a chave publicável, enquanto permissões reais ficam em RLS, funções controladas e políticas do banco.
