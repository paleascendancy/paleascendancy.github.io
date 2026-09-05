# PALE ASCENDANCY — V23

## O que mudou
- Corrigido o erro que mostrava `${[...]...}` como texto na seção de categorias adicionais.
- Área profissional agora aceita **Editores, Designers e Editor + Designer**.
- A aprovação de Editor/Designer continua sendo controlada pela administração.
- O administrador ganhou uma opção separada para marcar **Designer**.
- Foto de perfil pode ser escolhida diretamente do celular e enviada para o Supabase Storage.
- Cada profissional possui um **portfólio próprio** no perfil público.
- Portfólio aceita:
  - fotos / artes enviadas do celular;
  - vídeos enviados do celular;
  - links de projetos externos (Behance, Drive, site, YouTube etc.).
- O dono do perfil só pode editar/excluir os próprios trabalhos.
- Perfil público exibe os trabalhos do portfólio.
- Diretório agora mostra Editores e Designers.

## Supabase
Execute o conteúdo inteiro de:
`PALE_ASCENDANCY_V23_EDITORS_PORTFOLIO.sql`

Esse SQL cria/atualiza:
- `is_designer`;
- proteção dos campos de aprovação;
- `editor_portfolio_items`;
- RLS do portfólio;
- buckets públicos `avatars` e `portfolio`;
- políticas de upload, atualização, exclusão e leitura;
- diretório público de Editores e Designers.

## Limites de upload da interface
- Foto de perfil: 8 MB.
- Foto/arte de portfólio: 10 MB.
- Vídeo de portfólio: 30 MB.

Os limites podem ser alterados depois, se necessário.
