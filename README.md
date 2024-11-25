# llm streaming test

## 📋 Requirements

- Node.js version 20 or later.
- https://github.com/receptron/graphai-agent-server
  - run server

## 📖 Instruction

1. Git clone this repository
2. Run "yarn install" once to get necessary node modules.

## Usage

### Run server
In graphai-agent-server
Before run, set openai key

server/.env
```
OPENAI_API_KEY=sk-xxxx
```

Run server.

```
cd server
yarn run server
```

### Run web

```
yarn install
yarn run serve
```