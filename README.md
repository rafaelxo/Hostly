# Hostly 🏠

## Sistema de Gestão de Locação de Imóveis por Temporada

Projeto desenvolvido para a disciplina **AEDs III (Algoritmos e Estruturas de Dados III)**, com foco em modelagem de dados, persistência em arquivos binários e aplicação de arquitetura em camadas.

---

## 📌 Sobre o Projeto

O **Hostly** é um sistema de gestão de imóveis para locação por temporada, cujo objetivo é permitir o cadastro, consulta, atualização e exclusão lógica de imóveis, garantindo organização estruturada e persistência eficiente dos dados.

Diferentemente de sistemas convencionais, este projeto **não utiliza SGBD**, realizando a persistência diretamente em **arquivos binários**, com:

- Cabeçalho de controle
- Exclusão lógica por lápide
- Serialização manual de registros

O projeto também aplica conceitos modernos de arquitetura de software no back-end e no front-end.

---

## 🎯 Objetivos da Fase 1

- Implementar o CRUD completo da entidade **Imóvel**
- Implementar CRUD básico da entidade **Usuário (Anfitrião)**
- Implementar cadastro/listagem/consulta da entidade **Reserva**
- Persistir dados em arquivo binário
- Implementar exclusão lógica (lápide)
- Estruturar o projeto com Arquitetura Hexagonal (Back-end)
- Organizar o front-end com Atomic Design

---

## 🎯 Objetivos da Fase 2

- Implementar CRUD completo das entidades do sistema
- Consolidar relacionamento **1:N** entre **Usuário (Anfitrião)** → **Imóveis** e **Imóvel** → **Reservas**
- Aplicar **Hash Extensível** para busca direta por chave (ID)
- Aplicar **Ordenação Externa** por atributo (ex.: título, cidade, valorDiaria, dataCadastro)
- Implementar **Árvore B+** (inserção e busca) para consultas por atributo
- Melhorar precisão de localização no mapa com geocodificação e persistência de coordenadas

---

## 🏗 Arquitetura do Projeto

### 🔹 Back-end

Tecnologia: **Go**

Arquitetura: **Hexagonal (Ports and Adapters)**

Estrutura em camadas:

- **Domain**
  - Entidades `Usuario`, `Imovel` e `Reserva`
  - Regras de validação
- **Application**
  - Casos de uso por entidade (Create, Read, Update, Delete, List)
- **Ports**
  - Interfaces de repositório (`UsuarioRepository`, `ImovelRepository`, `ReservaRepository`)
- **Adapters**
  - Implementação concreta de persistência em arquivo binário
  - API HTTP REST consumível pelo front-end

### 📁 Estrutura do Arquivo Binário

**Cabeçalho:**

- Último ID utilizado
- Quantidade de registros

**Registro:**

- Lápide (boolean)
- Tamanho do registro
- Dados serializados do imóvel

---

### 🔹 Front-end

Tecnologias:

- React
- TypeScript
- Tailwind CSS

Arquitetura:

- **Atomic Design**
  - Atoms
  - Molecules
  - Organisms
  - Templates
  - Pages

---

## 🗃 Entidade Principal

### Imóvel

| Campo        | Tipo             |
| ------------ | ---------------- |
| idImovel     | integer (PK)     |
| titulo       | string           |
| descricao    | string           |
| cidade       | string           |
| valorDiaria  | double           |
| dataCadastro | date             |
| fotos        | lista de strings |
| ativo        | boolean          |

### Usuário

| Campo     | Tipo               |
| --------- | ------------------ |
| idUsuario | integer (PK)       |
| nome      | string             |
| email     | string             |
| senha     | string             |
| tipo      | ADMIN \| ANFITRIAO |
| ativo     | boolean            |

### Reserva

| Campo       | Tipo         |
| ----------- | ------------ |
| idReserva   | integer (PK) |
| idImovel    | integer (FK) |
| nomeHospede | string       |
| dataInicio  | date         |
| dataFim     | date         |
| valorTotal  | double       |

---

## ⚙ Funcionalidades Implementadas (Fase 1)

- ✅ Cadastrar imóvel
- ✅ Listar imóveis ativos
- ✅ Consultar imóvel por ID
- ✅ Atualizar imóvel
- ✅ Excluir imóvel (exclusão lógica)
- ✅ Cadastrar anfitrião
- ✅ Listar anfitriões ativos
- ✅ Atualizar anfitrião
- ✅ Excluir anfitrião (exclusão lógica)
- ✅ Cadastrar reserva associada a imóvel
- ✅ Listar reservas (geral e por imóvel)
- ✅ Consultar reserva por ID

---

## ⚙ Funcionalidades Implementadas (Fase 2)

- ✅ CRUD completo das entidades já presentes
  - Imóveis
  - Usuários
  - Reservas
- ✅ Relacionamento 1:N operacional no domínio e na API
  - Anfitrião → múltiplos imóveis
  - Imóvel → múltiplas reservas
- ✅ Hash Extensível aplicado às buscas diretas por ID no armazenamento binário
- ✅ Ordenação Externa aplicada na listagem de imóveis por atributo
- ✅ Árvore B+ implementada para inserção e busca por `valorDiaria`
- ✅ Filtros e ordenação de reservas no backend e frontend
- ✅ Geolocalização aprimorada
  - Geocodificação por CEP/endereço estruturado/fallback
  - Ranking de candidatos por relevância
  - Cache local no frontend
  - Persistência de latitude/longitude no imóvel
- ✅ UI/UX refinada para fluxos principais (dashboard, imóveis e reservas)

---

## 🔌 Endpoints da API

- `GET /imoveis`
- `POST /imoveis`
- `GET /imoveis/{id}`
- `PUT /imoveis/{id}`
- `DELETE /imoveis/{id}`
- `GET /imoveis?ordenarPor={titulo|cidade|valorDiaria|dataCadastro}&ordem={asc|desc}`
- `GET /imoveis?valorDiaria={valor}`
- `POST /usuarios`
- `GET /usuarios/anfitrioes`
- `PUT /usuarios/{id}`
- `DELETE /usuarios/{id}`
- `GET /reservas`
- `GET /reservas?idImovel={id}`
- `GET /reservas?status={PENDENTE|CONFIRMADA|CANCELADA}`
- `GET /reservas?ordenarPor={dataInicio|dataFim|valorTotal}&ordem={asc|desc}`
- `GET /reservas/{id}`
- `POST /reservas`
- `GET /dashboard/stats`

---

## 📚 Conceitos Aplicados

- Persistência em arquivos binários
- Controle por cabeçalho
- Exclusão lógica com lápide
- Serialização manual
- Hash Extensível
- Ordenação Externa
- Árvore B+
- Separação de responsabilidades
- Inversão de dependência
- Arquitetura Hexagonal
- Atomic Design

---

## 👨‍💻 Equipe

- Rafael Xavier Oliveira
- Lucas Silva Santos
- Leonardo Stuart de Almeida Ramalho
- Luca Guimarães Lodi
- Tulio Geraldo da Costa Silva

---

## 🚀 Status

🟢 Fase 1 – Concluída
🟢 Fase 2 – Concluída

Estado atual:

- Persistência binária com cabeçalho, lápide e serialização estruturada
- CRUD completo das entidades
- Índices e algoritmos de busca/ordenação aplicados
- Dashboard com mapa e geolocalização aprimorada

---

## 📄 Licença

Projeto acadêmico desenvolvido para fins educacionais.
