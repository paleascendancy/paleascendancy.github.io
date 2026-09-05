PALE ASCENDANCY — FINAL CORREÇÃO V1

Substitua os arquivos do GitHub por TODO o conteúdo desta pasta. Não acumule os ZIPs anteriores por cima.

CORREÇÕES:
1. Restaura o estado “Você é um profissional aprovado” + “Editar meu perfil”.
2. Adiciona “Solicitar aprovação” apenas para quem está logado e ainda NÃO foi aprovado.
3. Profissional já aprovado continua aprovado por is_editor/is_designer; não existe segunda aprovação no login.
4. Administração não aparece para visitantes. O link só é criado quando a conta autenticada passa por is_admin/admin_users.
5. Logo padronizada em assets/pale-ascendancy-logo.png em todas as páginas.
6. Player de música é inicializado pelo script.js em todas as páginas. Os caminhos foram alinhados à pasta audio/ usada pelo projeto. O navegador ainda pode bloquear autoplay; tocar no player libera o áudio.
7. Reels têm rolagem interna própria.
8. Premium continua em R$ 15/mês, com prioridade visual, portfólios no destaque e personalização.
9. Categorias do cadastro foram preservadas.

BANCO:
- PALE_ASCENDANCY_V27.sql: base, caso ainda não tenha sido aplicada.
- PALE_ASCENDANCY_ADMIN_PERMISSIONS_V1.sql: permissões administrativas.
- PALE_ASCENDANCY_PREMIUM_PORTFOLIO_V1.sql: Premium/bordas/cards.
- PALE_ASCENDANCY_PROFESSIONAL_LOGIN_FIX_V2.sql: correção complementar de login, se necessária.

IMPORTANTE: não coloque um Gmail de administrador no JavaScript. A autorização administrativa deve continuar no banco, via admin_users/is_admin. Isso evita que o e-mail administrativo fique exposto no site.
