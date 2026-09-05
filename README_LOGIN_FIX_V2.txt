CORREÇÃO V2 — LOGIN PROFISSIONAL

O problema foi corrigido sem criar uma nova etapa de aprovação.

Regra:
- Se is_editor = true OU is_designer = true, a conta já é profissional e pode entrar.
- professional_login_enabled não é exigido para o login.
- professional_plan/Premium não interfere no login.
- Uma conta já aprovada não precisa enviar candidatura novamente.

O login verifica a aprovação pelo editor_directory e depois abre editor-painel.html.

Se o seu Supabase já possui a view editor_directory correta, não é necessário executar SQL.
O arquivo PALE_ASCENDANCY_PROFESSIONAL_LOGIN_FIX_V2.sql existe apenas para garantir a view caso ela tenha sido alterada.
