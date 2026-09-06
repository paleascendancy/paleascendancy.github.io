# Banco de dados — Pale Ascendancy

A partir da V3, novas mudanças de banco devem entrar em `database/migrations/` com data e nome descritivo.

## Regra

1. Revisar a migration.
2. Executar primeiro em um projeto Supabase de teste quando possível.
3. Validar autenticação, RLS e páginas que consomem a tabela.
4. Só então aplicar no projeto principal.

## Migration V3 atual

`migrations/20260906_v3_project_requests.sql` cria o fluxo de pedidos de projeto (`project_requests`) com RLS para cliente, profissional e administração, incluindo validação de perfil profissional público.

## Histórico

Os SQL de versões anteriores foram movidos para `archive/legacy/`. Eles existem para auditoria e recuperação de contexto, não como sequência oficial de instalação da V3.

Novas migrations não devem ser adicionadas à raiz do repositório nem ao diretório de arquivo.
