# Vila da Praia

Site da Vila da Praia, espaço com quadras de areia para beach tennis, vôlei e futevôlei, aulas para todos os níveis e bar pé na areia em Sorocaba (SP).

O site apresenta o espaço e é alimentado por um painel onde a equipe publica eventos, a grade de aulas e avisos, sem mexer em código.

## Funcionalidades

- **Página principal:** topo animado, modalidades, aulas, bar, agenda de eventos, galeria e como chegar.
- **"Aberto agora":** o site calcula se o espaço está aberto pelo horário de Sorocaba.
- **Painel da equipe (`/admin`):** área protegida por senha para gerenciar:
  - **Eventos:** título, data, horário, categoria, modalidade, descrição, valor, link de inscrição, foto e destaque. Eventos passados saem do site sozinhos.
  - **Grade de aulas:** dia da semana, horário, modalidade, nível e professor.
  - **Configurações:** aviso no topo do site, nota e avaliações do Google e número do WhatsApp.

## Tecnologias

- HTML, CSS e JavaScript puro, sem framework e sem build.
- Funções serverless da [Vercel](https://vercel.com) para a API do painel.
- Upstash Redis para guardar os dados do painel.
- Fontes Unbounded e DM Sans auto-hospedadas (licença OFL).

## Estrutura

```
index.html      página principal
admin.html      painel da equipe
css/ e js/      estilo e comportamento da página
api/            funções serverless (dados, login e administração)
img/            fotos e logo vetorizado
frames/         quadros da animação do topo
fonts/          fontes
vendor/         biblioteca de animação
dev-server.js   servidor local para desenvolvimento
```
