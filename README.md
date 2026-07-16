# NumVirtual — Plataforma de Números Virtuais Temporários

Site completo para vender números virtuais para recebimento de SMS
(ativação de WhatsApp, Telegram, Instagram etc). Feito para funcionar
com a sua chipeira física (GSM gateway / SIM box).

**Zero dependências externas.** O backend usa só módulos nativos do
Node.js — não precisa rodar `npm install` pra funcionar.

## Como rodar

Requisito: Node.js 18 ou superior instalado.

```bash
node server.js
```

Acesse http://localhost:3000

- Login de administrador padrão: `admin@seusite.com.br` / `admin123`
  **(troque essa senha assim que possível — veja "Segurança" abaixo)**
- Um cliente de teste pode ser criado pela própria tela de cadastro.

Os dados ficam salvos em `data/db.json` (usuários, números, pedidos,
pagamentos). Para produção com muito tráfego, migre isso para um banco
de verdade (Postgres, por exemplo) — está isolado em `lib/store.js`,
então dá pra trocar sem mexer nas rotas.

## Estrutura do projeto

```
server.js              → servidor HTTP e todas as rotas da API
lib/store.js           → "banco de dados" em arquivo JSON
lib/auth.js             → hash de senha e sessões
lib/mercadopago.js      → integração de pagamento (Pix + Cartão)
data/db.json            → os dados em si (catálogo, números, pedidos...)
public/                 → todo o front-end (HTML, CSS, JS puro)
  index.html             → landing page
  login.html / cadastro.html
  dashboard.html         → painel do cliente (comprar número, ver código)
  admin.html             → painel administrativo
.env.example             → modelo de variáveis de ambiente
```

## Conectando a sua chipeira (o passo mais importante)

Cada número virtual no sistema é um "slot" (veja no admin, aba
"Números"). Quando alguém compra um número, o slot fica `ocupado` e
vinculado ao pedido dela. Quando o SMS chega de verdade no chip físico,
**a sua chipeira precisa avisar o site**, chamando este endpoint:

```
POST /api/webhook/sms
Headers:  X-Webhook-Secret: <o valor de CHIPEIRA_WEBHOOK_SECRET no .env>
Body:     { "numero": "+55 11 91234-0001", "mensagem": "Seu código é 482931" }
```

O site encontra o slot pelo número, encontra o pedido em aberto
daquele slot, marca como recebido e já extrai o código automaticamente.

**O que muda dependendo da sua chipeira:**

Como você mencionou que já tem uma chipeira com vários slots, o que
falta é saber **como o hardware dela expõe os SMS recebidos**. Isso
varia por marca/modelo — os casos mais comuns:

1. **GSM Gateway dedicado** (GoIP, Dinstar, OpenVox, Yeastar TG, etc.):
   normalmente tem um painel web próprio com uma API HTTP ou protocolo
   SMPP para notificar SMS recebidos. Procure na documentação do
   fabricante por "SMS forwarding", "HTTP notify" ou "SMPP". Nesse
   caso, você vai escrever um pequeno script (posso te ajudar) que lê
   da API da chipeira e repassa pro endpoint acima.
2. **Farm de celulares Android** com apps como *SMS Gateway*, *SMS
   Forwarder* ou similares: a maioria desses apps já tem campo pra
   configurar uma "URL de webhook" — é só apontar direto para
   `https://seusite.com.br/api/webhook/sms`, ajustando o formato do
   corpo da requisição (pode precisar de um pequeno "tradutor" no
   meio, que eu também ajudo a montar).
3. **Sem API nenhuma**, só leitura manual: dá pra usar o próprio painel
   admin do site (`/admin.html` → aba Números → "Simular SMS") como
   forma manual de lançar o código, até você automatizar.

Me diga a marca/modelo da sua chipeira (ou tire um print do painel dela)
que eu escrevo o conector específico.

## Ativando pagamentos (Mercado Pago — Pix e Cartão)

1. Crie uma conta/aplicação em https://www.mercadopago.com.br/developers/panel
2. Copie o **Access Token** (comece com o de teste, que começa com `TEST-`)
3. Copie `.env.example` para `.env` e cole o token em `MP_ACCESS_TOKEN`
4. Pronto — o botão "Pagar com Pix" já gera QR code de verdade, e
   "Pagar com cartão" já redireciona pro Checkout do Mercado Pago.
5. Para o saldo ser creditado automaticamente (sem precisar atualizar a
   página), configure no painel do Mercado Pago a URL de notificação
   (webhook) apontando para: `https://seusite.com.br/api/webhook/mercadopago`

Sem o `.env` configurado, os botões de pagamento mostram uma mensagem
de erro amigável (não quebram o site) — assim você já pode testar todo
o resto da plataforma antes de ligar os pagamentos de verdade.

## Segurança antes de colocar no ar

- [ ] Troque a senha do admin padrão (`admin123`)
- [ ] Defina um `CHIPEIRA_WEBHOOK_SECRET` forte e único no `.env`
- [ ] Rode atrás de HTTPS (Nginx/Caddy como proxy reverso, ou um serviço
      como Railway/Render que já entrega HTTPS pronto)
- [ ] Nunca suba o arquivo `.env` (com tokens reais) para o GitHub

## Publicando o site (hospedagem)

Como o backend é um único processo Node sem dependências, ele roda em
praticamente qualquer lugar: Railway, Render, um VPS (Hostinger,
DigitalOcean, Contabo), ou até uma máquina sua com um domínio apontado.
Se quiser, posso te ajudar a montar o passo a passo de deploy pra
qualquer uma dessas opções.

## O que já funciona hoje

- Cadastro/login de clientes com sessão segura
- Catálogo de serviços com preço (editável pelo admin)
- Compra de número (debita saldo, reserva um slot livre, expira em 10 min)
- Painel do cliente com histórico de pedidos e status em tempo real
- Recarga de créditos via Pix ou cartão (Mercado Pago)
- Painel admin: gerenciar números/slots, serviços, ver todos os pedidos
  e usuários, e simular SMS pra testes
- Webhook genérico pronto para receber SMS de qualquer chipeira/gateway

## Design

Paleta escura (não usa o clichê "creme + serifada" nem "preto com neon
único"): fundo azul-marinho quase preto, com dois acentos — um teal
(sucesso/recebido) e um coral (ação/CTA). Tipografia: Space Grotesk nos
títulos, Inter no corpo, IBM Plex Mono nos números e códigos (reforça o
tema de "receber código por SMS"). O elemento de assinatura é a
simulação de "número chegando + SMS chegando" na página inicial.
