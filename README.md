# Hostly

## Sistema de Gestão de Locação de Imóveis por Temporada

Projeto desenvolvido para a disciplina **AEDs III (Algoritmos e Estruturas de Dados III)**, com foco em modelagem de dados, persistência em arquivos binários e aplicação de estruturas de dados avançadas.

---

## Sumário

1. [Sobre o Projeto](#sobre-o-projeto)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Domínios e Entidades](#domínios-e-entidades)
5. [Sistema de Hash Extensível](#sistema-de-hash-extensível)
6. [Persistência em Arquivo Binário](#persistência-em-arquivo-binário)
7. [Compilação e Execução](#compilação-e-execução)
8. [Endpoints da API](#endpoints-da-api)
9. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
10. [Arquitetura](#arquitetura)
11. [Conceitos Aplicados](#conceitos-aplicados)
12. [Equipe](#equipe)

---

## Sobre o Projeto

O **Hostly** é um sistema full-stack de gestão de imóveis para locação por temporada. O diferencial do projeto é **não utilizar SGBD**: toda a persistência é feita diretamente em arquivos binários customizados, com índices implementados do zero usando Hash Extensível.

**Funcionalidades principais:**
- CRUD completo de Imóveis, Usuários, Reservas e Comodidades
- Relacionamentos 1:N entre entidades (Anfitrião → Imóveis → Reservas)
- Busca por ID em O(1) via Hash Extensível primário
- Busca por relacionamento 1:N via Hash Extensível multi-valor
- Busca textual por tokens via índice invertido
- Ordenação externa por atributo
- Árvore B+ para busca por `valorDiaria`
- Dashboard com mapa e geolocalização por CEP

---

## Stack Tecnológica

### Back-end

| Item | Versão |
|------|--------|
| Go | 1.25.6+ |
| HTTP | `net/http` (stdlib) |
| Persistência | Arquivos binários customizados |
| Índices | Hash Extensível (implementação própria) |

### Front-end

| Item | Versão |
|------|--------|
| React | 19.2 |
| TypeScript | 5.9 |
| Tailwind CSS | 4.2 |
| Vite | 7.3 |
| Leaflet (mapas) | 1.9 |

---

## Estrutura do Projeto

```
Hostly/
├── backend/
│   ├── cmd/
│   │   └── main.go                          # Ponto de entrada da aplicação
│   ├── internal/
│   │   ├── domain/                          # Entidades e regras de negócio
│   │   │   ├── user.go
│   │   │   ├── property.go
│   │   │   ├── reservation.go
│   │   │   ├── amenity.go
│   │   │   └── errors.go
│   │   ├── adapters/
│   │   │   ├── repository/                  # Persistência e índices
│   │   │   │   ├── extensible_hash.go       # Hash Extensível (núcleo)
│   │   │   │   ├── relation_extensible_hash.go  # Hash multi-valor (1:N)
│   │   │   │   ├── binary_store.go          # Leitura/escrita no arquivo binário
│   │   │   │   ├── entity_codecs.go         # Serialização manual dos campos
│   │   │   │   ├── user_file_repo.go        # Repositório de Usuários
│   │   │   │   ├── property_file_repo.go    # Repositório de Imóveis
│   │   │   │   ├── reservation_file_repo.go # Repositório de Reservas
│   │   │   │   └── amenity_file_repo.go     # Repositório de Comodidades
│   │   │   └── web/                         # Handlers HTTP
│   │   │       ├── router.go
│   │   │       ├── auth_handler.go
│   │   │       ├── property_handler.go
│   │   │       ├── user_handler.go
│   │   │       ├── reservation_handler.go
│   │   │       ├── amenity_handler.go
│   │   │       ├── dashboard_handler.go
│   │   │       └── aed_handler.go           # Diagnóstico dos índices de hash
│   │   └── usecase/                         # Serviços / casos de uso
│   ├── data/                                # Arquivos binários gerados em runtime
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── components/                      # Atomic Design (atoms → pages)
│   │   ├── pages/
│   │   ├── services/
│   │   │   └── api.ts                       # Cliente HTTP centralizado
│   │   └── hooks/
│   │       └── useData.ts                   # Hooks de dados
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Domínios e Entidades

### Usuario

Representa anfitriões e administradores do sistema.

| Campo    | Tipo                              | Regras                    |
|----------|-----------------------------------|---------------------------|
| id       | int (PK, auto)                    |                           |
| nome     | string                            | Obrigatório               |
| email    | string                            | Único                     |
| telefone | string                            |                           |
| senha    | string                            | Armazenada com hash       |
| tipo     | `ADMIN` \| `ANFITRIAO` \| `HOSPEDE` |                         |
| ativo    | bool                              | Exclusão lógica (lápide)  |

### Imovel

Imóvel cadastrado por um anfitrião.

| Campo       | Tipo       | Regras                       |
|-------------|------------|------------------------------|
| id          | int (PK)   |                              |
| idUsuario   | int (FK)   | Referência ao anfitrião      |
| titulo      | string     | 4–120 caracteres             |
| descricao   | string     |                              |
| endereco    | Endereco   | Estrutura aninhada           |
| comodidades | []Amenity  | Máximo 20 itens              |
| cidade      | string     |                              |
| latitude    | float64    | Geocodificação por CEP       |
| longitude   | float64    |                              |
| valorDiaria | float64    | Deve ser > 0                 |
| dataCadastro| string     | Formato YYYY-MM-DD           |
| fotos       | []string   | Base64                       |
| ativo       | bool       | Exclusão lógica              |

**Estrutura de Endereço:**

| Campo        | Tipo   |
|--------------|--------|
| rua          | string |
| numero       | string |
| bairro       | string |
| cidade       | string |
| estado       | string |
| cep          | string |

### Reserva

Reserva feita por um hóspede para um imóvel.

| Campo         | Tipo                                                        | Regras                              |
|---------------|-------------------------------------------------------------|-------------------------------------|
| id            | int (PK)                                                    |                                     |
| idImovel      | int (FK)                                                    |                                     |
| idHospede     | int (FK)                                                    |                                     |
| dataInicio    | string                                                      | Formato YYYY-MM-DD                  |
| dataFim       | string                                                      | Deve ser após dataInicio            |
| valorTotal    | float64                                                     | >= 0                                |
| status        | `PENDENTE` \| `CONFIRMADA` \| `CANCELADA`                   |                                     |
| formaPagamento| `PIX` \| `CARTAO_CREDITO` \| `CARTAO_DEBITO` \| `BOLETO` \| `DINHEIRO` |            |
| statusPagamento| `NAO_INICIADO` \| `PENDENTE` \| `APROVADO` \| `FALHOU`    |                                     |
| confirmedAt   | string (RFC3339)                                            | Obrigatório se status = CONFIRMADA  |

### Comodidade

Catálogo de comodidades disponíveis para imóveis.

| Campo     | Tipo   | Regras          |
|-----------|--------|-----------------|
| id        | int (PK) |               |
| nome      | string | Mínimo 2 chars  |
| descricao | string |                 |
| icone     | string |                 |
| ativo     | bool   |                 |

---

## Sistema de Hash Extensível

O Hostly implementa três camadas de indexação baseadas em Hash Extensível, todas escritas do zero em Go, sem nenhuma biblioteca externa.

### Conceito: Hash Extensível

O Hash Extensível é uma estrutura de dados dinâmica que:
- Realiza buscas em **O(1)** amortizado
- Cresce de forma incremental (duplica apenas o diretório, não redistribui todos os dados)
- Divide buckets individualmente conforme a ocupação aumenta

**Componentes principais:**
- **Diretório**: array de ponteiros para buckets, indexado pelos `globalDepth` bits menos significativos da chave
- **Bucket**: conjunto de entradas (pares chave → valor) com profundidade local própria
- **Profundidade global**: controla o tamanho do diretório (`2^globalDepth` entradas)
- **Profundidade local**: por bucket; quando local == global, um split força o crescimento do diretório

**Funcionamento do lookup:**
```
dirIndex = key & ((1 << globalDepth) - 1)
bucketID = directory[dirIndex]
return bucket[bucketID][key]
```

**Funcionamento do split:**
```
1. Incrementa localDepth do bucket cheio
2. Cria novo bucket com a mesma localDepth
3. Redistribui entradas usando o novo bit discriminador
4. Atualiza entradas do diretório que apontavam para o bucket antigo
   onde (dirIndex & discriminatorBit) != 0
5. Se localDepth > globalDepth: duplica o diretório inteiro
```

---

### Camada 1 — Hash Primário (ID → offset no arquivo)

**Arquivo:** `extensible_hash.go`

Cada repositório mantém um índice primário que mapeia o ID inteiro da entidade para o offset do registro no arquivo binário:

```
Chave: idImovel = 42
Valor: offset = 1024  (posição em bytes no arquivo imoveis.db)
```

Esse índice é carregado do disco (`imoveis.db.pidx`) na inicialização e atualizado a cada inserção/remoção.

**Stats expostos pelo endpoint `/aed/diagnostico`:**
```json
{
  "imoveis": {
    "globalDepth": 2,
    "buckets": 4,
    "entries": 45
  }
}
```

---

### Camada 2 — Hash Multi-Valor / Relacional (1:N)

**Arquivo:** `relation_extensible_hash.go`

Estende o hash para mapear uma chave a **múltiplos valores** (`key → []int64`), suportando os relacionamentos 1:N do domínio:

| Índice | Chave | Valores | Arquivo |
|--------|-------|---------|---------|
| `byUserID` | idUsuario | []idImovel | `imoveis.db.byuser.ridx` |
| `byPropertyID` | idImovel | []idReserva | `reservas.db.byproperty.ridx` |
| `byGuestID` | idHospede | []idReserva | `reservas.db.byguest.ridx` |

**Exemplo:**
```
byUserID.Get(userID=1) → [10, 25, 33]   // imóveis do anfitrião 1
byPropertyID.Get(propertyID=10) → [5, 8, 12]  // reservas do imóvel 10
```

---

### Camada 3 — Índice Invertido por Termos (busca textual)

**Arquivo:** `relation_extensible_hash.go` (mesma estrutura multi-valor)

Ao inserir ou atualizar uma entidade, os campos textuais são tokenizados e cada token é indexado:

```
byTerm.Get("praia") → [idImovel=3, idImovel=17, idImovel=44]
byTerm.Get("florianopolis") → [idImovel=3, idImovel=9]
```

Isso permite busca textual eficiente sem varredura linear do arquivo.

| Índice | Arquivo |
|--------|---------|
| Imóveis por termo | `imoveis.db.byterm.ridx` |
| Reservas por termo | `reservas.db.byterm.ridx` |
| Usuários por termo | `usuarios.db.byterm.ridx` (hash secundário) |

---

### Arquivos de Índice Gerados

```
data/
├── usuarios.db              # Registros de usuários
├── usuarios.db.pidx         # Hash primário: idUsuario → offset
├── imoveis.db               # Registros de imóveis
├── imoveis.db.pidx          # Hash primário: idImovel → offset
├── imoveis.db.byuser.ridx   # Hash multi-valor: idUsuario → []idImovel
├── imoveis.db.byterm.ridx   # Hash invertido: token → []idImovel
├── reservas.db              # Registros de reservas
├── reservas.db.pidx         # Hash primário: idReserva → offset
├── reservas.db.byproperty.ridx  # Hash multi-valor: idImovel → []idReserva
├── reservas.db.byguest.ridx     # Hash multi-valor: idHospede → []idReserva
├── reservas.db.byterm.ridx      # Hash invertido: token → []idReserva
├── comodidades.db           # Registros de comodidades
└── comodidades.db.pidx      # Hash primário: idComodidade → offset
```

---

## Persistência em Arquivo Binário

### Estrutura do Cabeçalho (9 bytes)

```
[Version: 1 byte] [LastID: 4 bytes LE] [Count: 4 bytes LE]
```

### Estrutura do Registro

```
[ID: 4 bytes LE] [Offset: 8 bytes LE] [Size: 4 bytes LE] [Payload: N bytes]
```

### Formato do Payload (versão 4, baseado em campos)

```
[Version: 1 byte] [EntityType: 1 byte] [FieldCount: 2 bytes LE]
Para cada campo:
  [FieldID: 1 byte] [FieldSize: 4 bytes LE] [FieldData: N bytes]
```

### Exclusão Lógica (Lápide)

Registros deletados não são removidos fisicamente. O campo `ativo = false` marca o registro como inativo. Buscas lineares ignoram registros marcados; os índices de hash são atualizados para remover a entrada correspondente.

---

## Compilação e Execução

### Pré-requisitos

| Ferramenta | Versão mínima |
|------------|---------------|
| Go | 1.21+ |
| Node.js | 18+ |
| npm | 9+ |

---

### Back-end

```bash
# Entrar na pasta do back-end
cd backend

# Baixar dependências
go mod tidy

# Compilar o binário
go build -o hostly ./cmd/main.go

# Executar
./hostly
```

O servidor sobe em `http://localhost:8080`.

**O que acontece na inicialização:**
1. Cria a pasta `data/` se não existir
2. Abre os arquivos binários de cada entidade (ou cria caso não existam)
3. Carrega todos os índices de hash do disco
4. Reconstrói os índices de relacionamento se necessário
5. Insere dados iniciais: usuário admin padrão e catálogo de comodidades
6. Registra as rotas HTTP e inicia o listener na porta 8080

---

### Front-end

```bash
# Entrar na pasta do front-end
cd frontend

# Instalar dependências
npm install

# Servidor de desenvolvimento (hot reload)
npm run dev
# Disponível em http://localhost:5173

# Build de produção
npm run build
# Saída em: frontend/dist/

# Visualizar build de produção localmente
npm run preview

# Lint
npm run lint
```

---

### Executar os dois juntos (desenvolvimento)

```bash
# Terminal 1 — Back-end
cd backend && go run ./cmd/main.go

# Terminal 2 — Front-end
cd frontend && npm run dev
```

Acesse `http://localhost:5173` no navegador.

---

## Endpoints da API

### Saúde

```
GET  /health
```

### Autenticação

```
POST /auth/register      # Criar conta (anfitrião ou hóspede)
POST /auth/login         # Login (retorna Bearer token)
GET  /auth/me            # Dados do usuário autenticado
```

### Imóveis

```
GET    /imoveis                        # Listar imóveis
GET    /imoveis/{id}                   # Buscar por ID
GET    /imoveis/usuario/{idUsuario}    # Listar por anfitrião
POST   /imoveis                        # Criar imóvel
PUT    /imoveis/{id}                   # Atualizar imóvel
DELETE /imoveis/{id}                   # Excluir (lógico)
```

**Query params de listagem:**

| Parâmetro     | Tipo    | Descrição                                         |
|---------------|---------|---------------------------------------------------|
| `busca`       | string  | Busca textual por tokens (usa índice invertido)   |
| `cidade`      | string  | Filtro por cidade                                 |
| `ativo`       | bool    | Filtrar por status                                |
| `ordenarPor`  | string  | `titulo` \| `cidade` \| `valorDiaria` \| `dataCadastro` |
| `ordem`       | string  | `asc` \| `desc`                                   |
| `valorDiaria` | float   | Busca exata (usa Árvore B+)                       |
| `valorDiariaMin` | float | Faixa mínima de diária                         |
| `valorDiariaMax` | float | Faixa máxima de diária                         |

### Usuários

```
GET    /usuarios               # Listar todos (param: busca)
GET    /usuarios/anfitrioes    # Listar apenas anfitriões
GET    /usuarios/{id}          # Buscar por ID
POST   /usuarios               # Criar
PUT    /usuarios/{id}          # Atualizar
DELETE /usuarios/{id}          # Excluir (lógico)
```

### Reservas

```
GET    /reservas                           # Listar reservas
GET    /reservas/{id}                      # Buscar por ID
GET    /reservas/hospede/{idHospede}       # Listar por hóspede
GET    /reservas/anfitriao/{idAnfitriao}   # Listar por anfitrião
POST   /reservas                           # Criar reserva
PUT    /reservas/{id}                      # Atualizar
PUT    /reservas/{id}/confirmar            # Confirmar (requer formaPagamento)
DELETE /reservas/{id}                      # Cancelar
```

**Query params de listagem:**

| Parâmetro    | Tipo   | Descrição                                       |
|--------------|--------|-------------------------------------------------|
| `idImovel`   | int    | Filtro por imóvel (usa hash `byPropertyID`)     |
| `status`     | string | `PENDENTE` \| `CONFIRMADA` \| `CANCELADA`       |
| `periodoDe`  | string | Data início do intervalo (YYYY-MM-DD)           |
| `periodoAte` | string | Data fim do intervalo (YYYY-MM-DD)              |
| `ordenarPor` | string | `dataInicio` \| `dataFim` \| `valorTotal`       |
| `ordem`      | string | `asc` \| `desc`                                 |
| `busca`      | string | Busca textual                                   |

### Comodidades

```
GET    /comodidades       # Listar catálogo
GET    /comodidades/{id}  # Buscar por ID
POST   /comodidades       # Criar
PUT    /comodidades/{id}  # Atualizar
DELETE /comodidades/{id}  # Excluir
```

### Dashboard

```
GET /dashboard/stats
```

Resposta:
```json
{
  "totalImoveis": 45,
  "totalAnfitrioes": 8,
  "totalReservas": 120,
  "receitaTotal": 38500.00
}
```

### AED — Diagnóstico dos Índices

```
GET /aed/diagnostico
```

Retorna estatísticas dos hashes extensíveis de cada repositório:

```json
{
  "imoveis": { "globalDepth": 2, "buckets": 4, "entries": 45 },
  "usuarios": { "globalDepth": 1, "buckets": 2, "entries": 8 },
  "reservas": { "globalDepth": 1, "buckets": 2, "entries": 12 }
}
```

```
GET /aed/anfitriao/{id}
```

Retorna os imóveis do anfitrião e as reservas de cada imóvel, percorrendo o grafo de relacionamentos pelos índices hash.

---

## Fluxo de Funcionamento

### 1. Criar um Imóvel

```
[Frontend]  POST /imoveis (FormData)
              ├── idUsuario: 5
              ├── titulo: "Casa na praia"
              └── fotos: [arquivo.jpg]

[Handler]   propertyHandler.Create()
              └── propertyService.Create(domain.Property)
                    └── propertyRepo.Create()
                          ├── binaryStore.Write() → gera ID, grava no arquivo, retorna offset
                          ├── hashPrimario.Set(ID, offset) → índice primário
                          ├── hashRelacao.Insert(idUsuario, ID) → byUserID
                          └── hashTermos.Insert(token, ID) por cada palavra → byTerm

[Resposta]  { "idImovel": 123, "titulo": "Casa na praia", ... }
```

---

### 2. Buscar Imóvel por ID

```
[Frontend]  GET /imoveis/123

[Handler]   propertyHandler.GetByID(123)
              └── propertyRepo.GetByID(123)
                    ├── hashPrimario.Get(123) → offset = 1024  [O(1)]
                    └── binaryStore.ReadAt(offset) → deserializa registro

[Resposta]  { "idImovel": 123, ... }
```

---

### 3. Busca Textual

```
[Frontend]  GET /imoveis?busca=praia+florianópolis

[Handler]   propertyHandler.List(busca="praia florianópolis")
              ├── tokenizar("praia florianópolis") → ["praia", "florianopolis"]
              ├── hashTermos.Get("praia")       → [3, 17, 44]
              ├── hashTermos.Get("florianopolis") → [3, 9]
              ├── intersecção → [3]
              └── Para cada ID: hashPrimario.Get(ID) → offset → binaryStore.ReadAt(offset)

[Resposta]  [{ "idImovel": 3, "titulo": "...", "cidade": "Florianópolis", ... }]
```

---

### 4. Listar Imóveis de um Anfitrião

```
[Frontend]  GET /imoveis/usuario/5

[Handler]   propertyHandler.GetByOwner(5)
              └── propertyRepo.GetByOwnerID(5)
                    ├── hashRelacao.Get(5) → [10, 25, 33]  [O(1)]
                    └── Para cada ID: hashPrimario.Get(ID) → ReadAt(offset)

[Resposta]  [{ "idImovel": 10, ... }, { "idImovel": 25, ... }, ...]
```

---

### 5. Confirmar uma Reserva

```
[Frontend]  PUT /reservas/8/confirmar
              Body: { "formaPagamento": "PIX" }

[Handler]   reservationHandler.Confirm(8)
              ├── reservaRepo.GetByID(8) → busca via hash primário
              ├── Valida status (deve ser PENDENTE)
              ├── Atualiza status → CONFIRMADA, statusPagamento → APROVADO
              └── reservaRepo.Update(reserva)
                    ├── binaryStore.Update(offset, payload)
                    └── Índices permanecem inalterados (chave/ID não muda)

[Resposta]  { "idReserva": 8, "status": "CONFIRMADA", ... }
```

---

### 6. Consulta de Relacionamento AED

```
[Frontend]  GET /aed/anfitriao/5

[Handler]   aedHandler.RelacaoAnfitriao(5)
              ├── hashRelacaoImóveis.Get(5) → [10, 25, 33]
              └── Para cada imóvel:
                    └── hashRelacaoReservas.Get(idImovel) → [idReserva, ...]

[Resposta]  {
              "anfitriao": { ... },
              "imoveis": [
                { "idImovel": 10, "reservas": [...] },
                { "idImovel": 25, "reservas": [...] }
              ]
            }
```

---

### 7. Autenticação e Sessão

```
[Frontend]  POST /auth/login
              Body: { "email": "...", "senha": "..." }

[Backend]   Verifica hash da senha
            Gera Bearer token
            Retorna token + dados do usuário

[Frontend]  Armazena token em localStorage ("hostly_token")
            Toda requisição subsequente inclui:
              Authorization: Bearer {token}
```

---

## Arquitetura

### Back-end — Hexagonal (Ports & Adapters)

```
                        ┌─────────────────────────────┐
                        │           Domain             │
                        │  Usuario / Imovel / Reserva  │
                        │  (entidades + validações)    │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │           UseCase            │
                        │   (serviços de aplicação)    │
                        └───┬──────────────────────┬───┘
                            │                      │
             ┌──────────────▼──┐             ┌─────▼──────────────┐
             │   Web Adapter   │             │ Repository Adapter  │
             │  (HTTP handlers)│             │ (arquivo binário +  │
             │                 │             │  hash extensível)   │
             └─────────────────┘             └────────────────────┘
```

### Front-end — Atomic Design

```
Pages
  └── Templates
        └── Organisms (seções completas)
              └── Molecules (grupos de elementos)
                    └── Atoms (botão, input, badge...)
```

### Comunicação Frontend ↔ Backend

O arquivo `frontend/src/services/api.ts` centraliza todas as chamadas HTTP:

- URL base: `http://localhost:8080`
- Token lido do `localStorage` e injetado no header `Authorization` automaticamente
- Suporte a `application/json` e `multipart/form-data` (fotos)
- Erros do servidor são parseados e relançados como exceções tipadas

---

## Conceitos Aplicados

| Conceito | Onde |
|----------|------|
| **Hash Extensível** | Índice primário (ID → offset) de todas as entidades |
| **Hash Extensível Multi-Valor** | Relacionamentos 1:N e índice invertido de busca |
| **Ordenação Externa** | Listagem de imóveis com `ordenarPor` |
| **Árvore B+** | Busca por `valorDiaria` |
| **Exclusão Lógica (Lápide)** | Deleção em todas as entidades |
| **Serialização Manual** | Codec de campos com ID + tamanho + dados |
| **Arquitetura Hexagonal** | Back-end (Domain / UseCase / Ports / Adapters) |
| **Atomic Design** | Front-end (Atoms → Pages) |
| **Geocodificação** | Busca de coordenadas por CEP com ranking e cache |
| **Inversão de Dependência** | Repositórios injetados via interfaces Go |

---

## Equipe

- Rafael Xavier Oliveira
- Lucas Silva Santos
- Leonardo Stuart de Almeida Ramalho
- Luca Guimarães Lodi
- Tulio Geraldo da Costa Silva

---

## Status

Fase 1 — Concluída
Fase 2 — Concluída

Projeto acadêmico desenvolvido para fins educacionais — AEDs III / PUC Minas.
