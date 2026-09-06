# Pale Ascendancy V3

Pale Ascendancy é uma plataforma para aproximar clientes de editores e designers, com diretório profissional, perfis públicos, portfólios, serviços, contas, planos e fluxo de briefing para contratação.

## Fluxo principal

`Home → Serviços / Profissionais → Perfil → Briefing → Contato`

Também é possível começar diretamente em `contratar.html` e descrever o projeto antes de escolher um profissional.

## Estrutura principal

- `index.html` — home V3
- `editores.html` — diretório profissional
- `editor-perfil.html` — perfil público
- `contratar.html` — briefing e início de contratação
- `servicos.html` — categorias de serviço
- `planos.html` — planos profissionais
- `login.html` / `cadastro.html` — conta comum
- `login-profissional.html` / `cadastro-profissional.html` — acesso profissional
- `admin.html` — administração
- `script.js` — núcleo legado/compatibilidade atual
- `v3.css`, `v3-hire.css` — camada visual V3
- `v3-profile.js`, `contratar.js` — fluxos V3

## Supabase

Novas mudanças de banco devem ser adicionadas em `database/migrations/`.

A migration `database/migrations/20260906_v3_project_requests.sql` cria a tabela de briefings/pedidos `project_requests` com RLS. Ela não é aplicada automaticamente pelo site: revise e execute no Supabase SQL Editor antes de ativar persistência real.

Os SQL históricos da raiz foram preservados por compatibilidade e contexto de versões anteriores. Eles não devem ser usados como padrão para novas migrations.

## Publicação

O projeto permanece compatível com GitHub Pages. `robots.txt` e `sitemap.xml` estão configurados para o endereço `https://paleascendancy.github.io/`.

## Princípio da V3

Não inventar números, avaliações ou projetos. Informações de profissionais e portfólios devem vir dos dados reais da plataforma.