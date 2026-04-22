# Especificações do Projeto - Fase I

## 1. Objetivo
Implementar o aplicativo conforme especificações da Fase I com as seguintes entregas obrigatórias:
- **a)** CRUD de todas as tabelas já presentes.
- **b)** Relacionamento 1:N implementado com **Hash Extensível**.

## 2. Requisitos

### a) CRUD Completo
- Todas as tabelas identificadas na Fase I devem ter operações de:
  - Inserção
  - Busca
  - Atualização
  - Exclusão lógica

### b) Índices
- Todas as tabelas devem possuir **índice primário** baseado na PK (Primary Key).
- O relacionamento **1:N** deve ser implementado obrigatoriamente com **Hash Extensível**.

### c) Interface
- É obrigatória a implementação de um **front-end** para interação com o usuário.

### d) Persistência
- Os arquivos de dados e índices devem ser armazenados em disco e mantidos entre execuções do sistema.

### e) Documentação Técnica
Deve existir um documento explicando detalhadamente:
- Como os índices são armazenados em disco.
- Como ocorre o acesso ao relacionamento 1:N.
- Quais decisões de projeto foram tomadas (conforme o formulário abaixo).

### f) GitHub
- O código-fonte deve estar em um repositório de um dos membros do grupo.
- O arquivo `README` deve conter instruções claras de compilação e execução.

### g) Boas Práticas
- O código deve respeitar a arquitetura proposta na Fase I (ex.: **MVC** e/ou **DAO**).
- Variáveis, métodos e classes devem ter nomes claros e consistentes.

### h) Validação de Entradas
O sistema deve tratar erros comuns, incluindo:
- Inserção de PK duplicada.
- Exclusão de registro inexistente.
- Busca de chave não encontrada.

---

## 3. Formulário de Projeto
Responda às seguintes questões na documentação:

- **a)** Qual a estrutura usada para representar os registros?
- **b)** Como atributos multivalorados do tipo string foram tratados?
- **c)** Como foi implementada a exclusão lógica?
- **d)** Além das PKs, quais outras chaves foram utilizadas nesta etapa?
- **e)** Como a estrutura (hash) foi implementada para cada chave de pesquisa?
- **f)** Como foi implementado o relacionamento 1:N (explique a lógica da navegação entre registros e integridade referencial)?
- **g)** Como os índices são persistidos em disco? (formato, atualização, sincronização com os dados).
- **h)** Como está estruturado o projeto no GitHub (pastas, módulos, arquitetura)?

---

## 4. Entrega
A entrega deve ser feita exclusivamente via **Canvas**, em um único arquivo **PDF** contendo:

1. **Documentação do projeto**: Descrição das decisões de projeto e diagramas (podem ser refinados).
2. **Respostas completas** ao Formulário de Projeto.
3. **Link para o repositório GitHub** com o código-fonte completo.
4. **Link para o vídeo explicativo**.