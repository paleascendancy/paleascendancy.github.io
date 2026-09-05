# PALE ASCENDANCY — V2

Base consolidada na linha V27 → aprimoramentos → Reels → Appearance → Profissionais → Permissões → Content.

## Correções desta versão
- Autenticação comum, profissional e administrativa inicializada pelo núcleo global.
- Perfil comum protegido: sem sessão, volta para o login.
- Logout encerra a sessão e retorna à Home.
- Perfis antigos podem recuperar o registro `profile` quando o gatilho histórico não o criou.
- Diretório profissional usa a view pública e possui fallback direto para `profile`.
- Profissionais públicos respeitam `is_public`.
- Reels agora possuem uma seção própria no diretório, com visual premium e atualização automática.
- Painel profissional voltou a carregar/editar perfil e gerenciar portfólio.
- Perfil profissional público carrega dados e portfólio.
- Player usa a pasta `music/` com as faixas originais incluídas.
- Cache de CSS/JS atualizado para evitar carregar versões antigas.
- Proteção global para elementos `[hidden]`.

## Supabase
Use `PALE_ASCENDANCY_V2.sql` como a base consolidada desta versão. Não execute os SQLs históricos V17/V23/V24/V27 em conjunto com ele.

## GitHub Pages
`index.html` fica na raiz do repositório. O site continua preparado para o domínio do repositório principal.
