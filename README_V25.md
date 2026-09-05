# Pale Ascendancy V25 — Correções

Correções principais:
- login comum identifica administrador e abre `admin.html` automaticamente;
- perfil passa a mostrar acesso à Administração para contas admin;
- perfil mostra Área profissional para editor/designer aprovado;
- menu mobile recebeu binding direto + fallback de toque;
- cadastro ganhou seleção de categoria por botões, mais confiável no celular;
- cadastro ganhou escolha e prévia de foto;
- foto escolhida no cadastro pode ser concluída automaticamente após confirmação do e-mail;
- edição de perfil usa atualização segura e avatar com caminho único para evitar cache antigo;
- SQL V25 reforça função de admin, trigger de perfil e políticas dos buckets `avatars` e `portfolio`.

Execute `PALE_ASCENDANCY_V25_FIXES.sql` no Supabase SQL Editor depois das estruturas V23/V24.
