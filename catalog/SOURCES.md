# Fontes do catálogo de referência

Pesquisa e download realizados em **28/10/2026**. São **400 referências com fotografias locais**, divididas em oito seleções de 50 opções. Algumas opções de mochilas são variações de cor identificadas pela loja.

| Seleção                    | Opções | Fontes consultadas para produtos e imagens                                                                                                                                                                                                     |
| -------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lattafa                    |     50 | [Catálogo Lattafa USA](https://www.lattafa-usa.com/collections/all), [seleção best sellers](https://www.lattafa-usa.com/collections/best-sellers)                                                                                              |
| Victoria’s Secret          |     50 | [Perfumeonline](https://perfumeonline.ca/collections/victoria-secret), [Loja Atmosphera](https://lojaatmosphera.com/collections/body-splash), [referência de best sellers da marca](https://www.victoriassecret.com/us/vs/beauty/best-sellers) |
| Outros perfumes importados |     50 | [Perfumeonline](https://perfumeonline.ca), [coleção Dior](https://perfumeonline.ca/collections/christian-dior)                                                                                                                                 |
| Tecnologia                 |     50 | [Baseus best sellers](https://www.baseus.com/collections/best-selling-products), [UGREEN best sellers](https://eu.ugreen.com/collections/best-sellers), [Edifier best sellers](https://edifier-online.com/collections/best-sellers)            |
| Smartwatches               |     50 | [Amazfit](https://us.amazfit.com/collections/best-sellers), [Haylou](https://haylou.com/collections/smartwatches), [Mibro](https://www.mibrofit.com), [Kospet](https://kospet.com)                                                             |
| Óculos                     |     50 | [Chilli Beans](https://loja.chillibeans.com.br), [goodr best sellers](https://goodr.com/collections/best-sellers)                                                                                                                              |
| Mochilas                   |     50 | [JanSport](https://www.jansport.com.br), [mais vendidos da loja](https://www.jansport.com.br/mochilas/mais-vendidos)                                                                                                                           |
| Beleza                     |     50 | [COSRX](https://www.cosrx.com), [Sallve](https://www.sallve.com.br)                                                                                                                                                                            |

As vitrines de mais vendidos orientaram parte da seleção. O catálogo não apresenta um ranking de vendas do mercado ou da Kauany. Preços de outras lojas não foram importados; valores, apresentações e disponibilidade são confirmados pelo WhatsApp.

## Identificação de cada fotografia

O arquivo [image-sources.json](image-sources.json) registra, para cada referência:

- ID e nome do produto;
- seleção de pesquisa;
- página do produto e catálogo de origem;
- URL da fotografia baixada;
- caminho do arquivo local, data de download e hash SHA-256.

As fotografias finais são WebP de 640 × 720 pixels e ficam em `public/images/catalogo/<selecao>/`. Todas são servidas pela própria hospedagem; o visitante não carrega fotos dos servidores das lojas de origem.

Créditos das imagens de produtos: respectivos fabricantes e lojas identificados no registro de origem. Os textos descritivos do site foram escritos para o atendimento por encomenda, sem copiar descrições comerciais extensas das fontes.

## Atualização manual

`npm run catalog:import` executa a coleta e substitui a seleção de produtos. Ele não faz parte do build nem do deploy. Use `--refresh` somente quando quiser consultar novamente as fontes e baixar as imagens. O cache de pesquisa deve permanecer no D:, conforme `AGENTS.md`.

Para cadastrar um item individualmente, basta adicionar sua foto e editar `public/data/products.json`, seguindo o README; não é necessário executar a importação completa.
