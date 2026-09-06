# Pale Ascendancy V3

Pale Ascendancy é uma plataforma para aproximar clientes de profissionais criativos, com diretório, perfis públicos, portfólios, serviços, contas, planos e fluxo de briefing para contratação.

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
- `editor-painel.html` — painel do profissional
- `admin.html` — administração
- `script.js` — núcleo legado/compatibilidade atual
- `v3.css` — fundação visual V3
- `v3-audit.css` — correções de responsividade e unificação do design system
- `v3-hire.css` — layout do briefing
- `v3-nav-fix.js` — força navegação completa entre páginas HTML enquanto o roteador legado não sincroniza head/body/scripts
- `v3-profile.js`, `contratar.js` — fluxos V3

## Supabase

Novas mudanças de banco devem ser adicionadas em `database/migrations/`.

A migration `database/migrations/20260906_v3_project_requests.sql` cria a tabela `project_requests` com RLS e validação do profissional selecionado. Ela não é aplicada automaticamente pelo site: revise e execute no Supabase SQL Editor antes de depender de persistência interna.

Os SQL históricos da raiz foram preservados como referência de versões anteriores. Eles não devem ser usados como padrão para novas migrations.

## Publicação

A implantação pública usada pela V3 é:

`https://paleascendancy.vercel.app/`

`robots.txt`, `sitemap.xml`, canonical e dados estruturados devem apontar para esse endereço até a adoção de um domínio próprio.

O repositório continua compatível com hospedagem estática, mas não deve haver dois domínios concorrendo como canonical.

## Regras de manutenção

- Não reintroduzir navegação SPA parcial sem sincronizar `head`, `body`, CSS, scripts específicos e ciclo de inicialização das páginas.
- Não criar cores principais concorrentes: Crimson é a cor de ação/ênfase da V3.
- Não inventar números, avaliações, clientes ou projetos.
- Informações de profissionais e portfólios devem vir dos dados reais da plataforma.
- Antes de apagar assets antigos, verificar também a possibilidade de URLs estarem salvas no Supabase, não apenas referências no HTML.
