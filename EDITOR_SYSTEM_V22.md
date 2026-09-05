# Sistema de Editores V22

A V22 adiciona um fluxo de autogestão para editores aprovados.

## Fluxo
1. Usuário cria conta normalmente.
2. Administrador marca `is_editor = true` no painel administrativo.
3. O editor entra em `login-editor.html`.
4. O login verifica no Supabase se a conta possui `is_editor = true`.
5. O editor é levado para `editor-painel.html`.
6. O editor pode editar somente a própria linha de `profile`.
7. A página `editores.html` lê `editor_directory` e mostra as informações públicas.
8. Cada editor possui um perfil público em `editor-perfil.html?id=UUID`.

## SQL
Execute `PALE_ASCENDANCY_V22_EDITORS.sql` no Supabase depois da configuração base.

## Segurança
A permissão de editor não é definida pelo navegador. O painel consulta o campo `is_editor` no Supabase. As atualizações usam `auth.uid() = id`, então um editor não pode editar o perfil de outro editor pelo cliente.
