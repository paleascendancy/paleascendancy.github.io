# Banco de dados — Pale Ascendancy

A partir da V3, novas mudanças de banco devem entrar em `database/migrations/` com data e nome descritivo.

## Regra

1. Revisar a migration.
2. Executar primeiro em um projeto Supabase de teste quando possível.
3. Validar autenticação, RLS e páginas que consomem a tabela.
4. Só então aplicar no projeto principal.

## Migration V3 atual

`20260906_v3_project_requests.sql` cria o fluxo de pedidos de projeto (`project_requests`) com RLS para cliente, profissional e administração.

Os arquivos SQL históricos na raiz foram preservados por enquanto para não perder contexto de versões anteriores. Novas migrations não devem voltar para a raiz.