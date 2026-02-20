# Hostly 🏠
### Sistema de Gestão de Locação de Imóveis por Temporada

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
- Persistir dados em arquivo binário
- Implementar exclusão lógica (lápide)
- Estruturar o projeto com Arquitetura Hexagonal (Back-end)
- Organizar o front-end com Atomic Design

---

## 🏗 Arquitetura do Projeto

### 🔹 Back-end

Tecnologia: **Go**

Arquitetura: **Hexagonal (Ports and Adapters)**

Estrutura em camadas:

- **Domain**
  - Entidade `Imovel`
  - Regras de validação
- **Application**
  - Casos de uso (Create, Read, Update, Delete, List)
- **Ports**
  - Interfaces de repositório
- **Adapters**
  - Implementação concreta de persistência em arquivo binário

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

| Campo | Tipo |
|-------|------|
| idImovel | integer (PK) |
| titulo | string |
| descricao | string |
| cidade | string |
| valorDiaria | double |
| dataCadastro | date |
| fotos | lista de strings |
| ativo | boolean |

---

## ⚙ Funcionalidades Implementadas (Fase 1)

- ✅ Cadastrar imóvel
- ✅ Listar imóveis ativos
- ✅ Consultar imóvel por ID
- ✅ Atualizar imóvel
- ✅ Excluir imóvel (exclusão lógica)

---

## 📚 Conceitos Aplicados

- Persistência em arquivos binários
- Controle por cabeçalho
- Exclusão lógica com lápide
- Serialização manual
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

🟢 Fase 1 – Modelagem e Implementação do CRUD da entidade Imóvel
🔜 Próximas fases incluirão indexação externa, compactação e mecanismos avançados de busca.

---

## 📄 Licença

Projeto acadêmico desenvolvido para fins educacionais.
