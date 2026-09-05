# Pale Ascendancy V24 — Profissionais e planos

## Acessos separados
- `login.html`: conta comum.
- `login-profissional.html`: acesso exclusivo para editor/designer aprovado.
- `editor-painel.html`: painel do profissional aprovado.

## Aprovação pelo administrador
No `admin.html`, a administração pode marcar separadamente `Editor` e `Designer`. Também pode escolher o plano do profissional.

## Portfólio
O plano gratuito permite 2 espaços. O limite também é protegido no Supabase por trigger, além do bloqueio visual no painel.

## Planos
- Gratuito: 2 espaços.
- Premium: 5 espaços — R$ 7/mês.
- Pro: 10 espaços — R$ 20/mês.
- Studio: 20 espaços — R$ 35/mês.
- Elite: 40 espaços — R$ 59/mês.

Há também opções anuais apresentadas em `planos.html`. A V24 deixa a ativação preparada para ser administrada no Supabase. O processamento automático de pagamento ainda não está conectado a um gateway.

## Menu mobile
O clique do botão é tratado de forma delegada pelo `script.js`, então o menu continua funcionando mesmo quando a navegação interna troca apenas o `<main>` via navegação dinâmica.
