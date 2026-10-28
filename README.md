# Importados e Encomendas

Vitrine de encomendas com **catálogo e fotos locais**, publicada pelo fluxo **projeto → GitHub → Vercel**. Não usa banco de dados, API de catálogo, credenciais ou variáveis de ambiente. React, TypeScript e Vite.

O botão de pedido abre o WhatsApp **+55 41 8859-1333** com nome do produto, referência, quantidade e link preenchidos. O cliente confirma o envio no WhatsApp; a encomenda é combinada com a Kauany.

O visual atual é a **V2**, com destaque para perfumaria, fontes locais e atalhos para categorias. A direção visual, os recursos de design utilizados e os arquivos da versão anterior estão documentados em [design/V2.md](design/V2.md).

## Rodar localmente

```sh
npm install
npm run dev
```

Abra o endereço indicado no terminal. `npm run build` valida o catálogo e as fotos, verifica o TypeScript e gera a pasta `dist/`. `npm run preview` serve essa versão de produção.

## Onde ficam os produtos e as fotos

```text
catalog.config.json          # Controla o aviso de demonstração
public/
  data/
    products.json            # Lista de produtos, independente dos componentes
  images/
    yara-rose.webp            # Fotos locais incluídas no GitHub e no deploy
    seu-produto.webp
```

O arquivo `public/data/products.json` é a fonte do catálogo. As fotos ficam em `public/images/`, inclusive em subpastas, e devem ser enviadas ao GitHub junto com o JSON. Para cadastrar itens, não é necessário editar componentes React. O projeto local está em `D:\Projetos\site-kau`; caches e temporários devem permanecer no D:, conforme `AGENTS.md`.

### Adicionar um produto

1. Salve a foto em `public/images/`, por exemplo `meu-perfume.webp`. Prefira nomes em letras minúsculas, sem espaços ou acentos.
2. Abra `public/data/products.json` e acrescente um objeto à lista, separando os objetos por vírgula:

```json
{
  "id": "PERFUME-001",
  "name": "Nome do perfume",
  "brand": "Marca",
  "category": "perfumes",
  "description": "Descrição do produto e apresentação disponível para consulta.",
  "image_url": "/images/meu-perfume.webp",
  "featured": false,
  "active": true,
  "created_at": "2026-10-28T12:00:00Z"
}
```

3. Execute `npm run validate:catalog` para conferir os dados e os caminhos das fotos.
4. Envie o JSON e as novas fotos para o GitHub. Após conectar o repositório à Vercel, um push na branch de produção dispara um novo deploy.

O caminho público começa em `/images/`, sem o prefixo `public/`. Fotos PNG, JPG, JPEG, WebP, AVIF, GIF e SVG são aceitas. Use WebP ou AVIF para reduzir o tamanho dos arquivos. Não coloque a imagem em base64 dentro do JSON.

| Campo         | Como preencher                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Referência única e estável, com letras sem acentos, números, hífens ou sublinhados, até 100 caracteres. Mantenha o ID para preservar os links compartilhados. |
| `name`        | Nome do produto, de 1 a 180 caracteres.                                                                                                                       |
| `brand`       | Marca; use `""` se não houver.                                                                                                                                |
| `category`    | `perfumes`, `skincare`, `cosmeticos`, `eletronicos`, `smartwatches`, `oculos`, `mochilas`, `suplementos`, `roupas` ou `acessorios`.                           |
| `description` | Texto descritivo; sem HTML.                                                                                                                                   |
| `image_url`   | Caminho para uma foto local existente, por exemplo `/images/perfumes/meu-perfume.webp`.                                                                       |
| `featured`    | `true` para destacar na ordenação padrão; caso contrário, `false`.                                                                                            |
| `active`      | `true` para mostrar; `false` para ocultar o item da vitrine e dos detalhes.                                                                                   |
| `created_at`  | Data UTC usada na ordenação de novidades, no formato do exemplo acima.                                                                                        |

Para remover um item, apague seu objeto ou altere `active` para `false`. Os arquivos em `public/` continuam públicos mesmo quando um item está oculto; `active` é um controle de exibição. Para trocar uma foto, atualize o arquivo e o caminho no JSON; prefira um novo nome para evitar versões antigas no cache do navegador.

O build interrompe a publicação se houver JSON inválido, referências repetidas, campos incorretos ou fotos ausentes. Os caminhos devem respeitar maiúsculas e minúsculas: a hospedagem é sensível a essa diferença.

### Conteúdo inicial

O catálogo possui **750 referências pesquisadas na web**, com prioridade para perfumaria: **150 opções de Lattafa e 150 de outras marcas importadas**, além de 50 referências de Victoria’s Secret. O filtro **Perfumes reúne 339 itens com fotos próprias**, sendo a maior categoria da vitrine. As seleções de tecnologia, smartwatches, óculos, mochilas, beleza, roupas, acessórios e suplementos esportivos têm 50 opções cada. Algumas opções são variações de modelos, cores, sabores ou embalagens. As fotografias correspondem aos produtos identificados e estão salvas em `public/images/catalogo/`.

Suplementos são restritos à nutrição esportiva, como whey, creatina e hipercalóricos. Medicamentos, incluindo dipirona, são recusados pela validação do catálogo. Essa regra está em `catalog/supplement-rules.mjs` e vale tanto para a importação quanto para o build. Os textos não incluem doses ou promessas de resultados.

As fontes e os créditos estão em [catalog/SOURCES.md](catalog/SOURCES.md), com o registro individual de origem em `catalog/image-sources.json`. O site usa o título provisório **Importados e Encomendas**, sem definir uma marca, e o atendimento é da **Kauany**.

Os itens são referências para encomenda: preço, versão e disponibilidade precisam ser confirmados com a Kauany. O aviso de demonstração é opcional e controlado em `catalog.config.json`; está desativado para o catálogo de referências:

```json
{
  "demo": false
}
```

Para uma futura apresentação com itens fictícios, use `demo: true`. A indicação geral de valores e disponibilidade sob consulta permanece em ambos os modos.

### Carregamento do catálogo

O navegador carrega a lista JSON uma vez por abertura da página e reutiliza os dados na busca, nos filtros e nos detalhes. A vitrine exibe **12 produtos por página**; as fotos dos cartões são carregadas conforme a navegação. Busca sem acentos e por referência, filtros de categoria e marca, ordenação e links `/?produto=REFERENCIA#catalogo` funcionam sem servidor de aplicação.

A paginação limita os cartões exibidos; o JSON com os dados dos produtos é carregado por inteiro. O tamanho desse arquivo cresce com o catálogo. Se ele se tornar muito grande, a evolução possível é gerar índices e arquivos de catálogo divididos durante o build, mantendo a mesma hospedagem estática.

## GitHub → Vercel

1. Crie um repositório no GitHub e envie o projeto, incluindo `public/data/products.json`, `catalog.config.json` e todas as fotos em `public/images/`.
2. Na Vercel, importe esse repositório e selecione a branch de produção.
3. Use o framework **Vite**, comando **`npm run build`** e diretório de saída **`dist`**. Essas opções já estão em `vercel.json`.
4. Faça o primeiro deploy. Não é necessário configurar variáveis de ambiente para o catálogo.
5. A cada atualização, envie os arquivos alterados para a branch de produção no GitHub. A Vercel gera e publica uma nova versão.

Não envie `node_modules/` nem `dist/`; estão no `.gitignore` e a Vercel instala e constrói o projeto. As imagens finais ficam dentro do repositório e são servidas pela própria Vercel. O projeto não usa a hospedagem Sites.

## Imagens recebidas

`image1.png` e `image2.png` são os originais enviados. Suas versões otimizadas estão em `public/images/`. A primeira imagem está no link de divulgação na seção sobre a Kauany; a segunda é usada no destaque, nos perfumes e nos body splashes.

`node scripts/prepare-assets.mjs` recria essas versões usando somente os arquivos locais. Não é necessário executar esse script para cadastrar produtos ou fazer o deploy. As quatro fotos ilustrativas de skincare, fone, mochila e óculos já estão salvas localmente; sua origem está em `public/images/credits.txt`.

As 750 fotos pesquisadas ficam separadas em `public/images/catalogo/`. `npm run catalog:import` pode recriar a seleção por consulta às fontes registradas; é uma ferramenta manual de pesquisa e não é executada pela Vercel. `npm run catalog:import:additional` atualiza apenas roupas, acessórios e suplementos, preservando as outras seleções. `npm run catalog:expand:perfumes` completa as seleções de Lattafa e outros perfumes importados até 150 itens cada, sem excluir ou alterar os produtos existentes. Para adicionar produtos no dia a dia, prefira editar o JSON e adicionar os arquivos locais, sem reimportar a seleção inteira.

## Verificação

```sh
npm run validate:catalog
npm run build
npx playwright install chromium
npm test
```

Os testes verificam fotos locais, busca, categorias, ordenação, paginação, itens ocultos, recuperação de falhas, links compartilhados e pedidos pelo WhatsApp em tamanhos de tela de computador e celular.
