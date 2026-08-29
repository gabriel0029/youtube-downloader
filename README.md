# YouTube/Media Downloader MVP

Arquitetura inicial:

- Next.js + React
- Tailwind CSS
- Next.js Route Handlers
- BullMQ + Redis
- PostgreSQL + Prisma 7
- Worker separado
- yt-dlp + FFmpeg dentro da imagem
- Nginx como reverse proxy
- Docker Compose
- rate limit por IP
- limite de tamanho
- timeout do yt-dlp
- arquivos temporários com expiração
- health check
- containers sem portas públicas para PostgreSQL/Redis
- SSM recomendado para administração da EC2

> Use somente conteúdos cujo download e uso sejam autorizados. O projeto não implementa bypass de DRM, autenticação ou restrições de acesso.

## 1. Pré-requisitos

- Docker Engine
- Docker Compose
- Git

Para desenvolvimento sem Docker, Node.js 22+ também é recomendado.

## 2. Configuração

```bash
cp .env.example .env
```

Gere duas senhas aleatórias e coloque no `.env`.

Depois ajuste as duas URLs para usar exatamente as mesmas credenciais.

## 3. Subir os containers

```bash
docker compose up -d --build
```

Verifique:

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f worker
```

## 4. Aplicar a migration

Na primeira execução:

```bash
docker compose exec app npx prisma migrate deploy
```

Para ambiente de desenvolvimento, se ainda não existir migration:

```bash
docker compose exec app npx prisma migrate dev --name init
```

## 5. Testar

```bash
curl http://localhost/api/health
```

Abra:

```text
http://localhost
```

## 6. Fluxo

1. `/api/info` valida e consulta os metadados.
2. `/api/download` cria um registro no PostgreSQL e coloca um job no BullMQ.
3. Worker consome o job.
4. Worker usa yt-dlp + FFmpeg.
5. Progresso é persistido no PostgreSQL.
6. O frontend consulta `/api/download/:id`.
7. Arquivo fica disponível por 1 hora.
8. A aplicação não mantém o arquivo indefinidamente.

## 7. Logs

```bash
docker compose logs -f worker
docker compose logs -f app
docker compose logs -f nginx
```

## 8. Backup local do PostgreSQL

```bash
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Em produção, prefira RDS PostgreSQL com backup automatizado.

## 9. Evolução AWS

### Fase 1

Uma EC2:

```text
ALB opcional
  |
Nginx
  |
Next.js
  |
Redis + PostgreSQL + Worker
```

### Fase 2

Migrar:

- PostgreSQL -> RDS
- Redis -> ElastiCache
- downloads -> S3
- fila -> SQS
- worker -> ECS/EKS

A aplicação já separa API, queue e worker para facilitar essa evolução.

## 10. Segurança AWS

Recomendação:

- Security Group libera somente 80/443.
- Não abrir 5432.
- Não abrir 6379.
- Não abrir SSH 22.
- Administração via AWS Systems Manager Session Manager.
- IAM role da EC2 com `AmazonSSMManagedInstanceCore`.
- Colocar HTTPS no ALB com ACM.
- Guardar segredos fora do `.env` em produção, preferencialmente AWS Secrets Manager/SSM Parameter Store.

## 11. Atualização do yt-dlp

A imagem fixa o release utilizado no Dockerfile para tornar o build reproduzível.

Quando quiser atualizar:

1. altere a versão no Dockerfile;
2. teste localmente;
3. faça novo build;
4. publique a imagem;
5. faça rollout.

Não use `latest` para o binário dentro de produção sem controlar o processo de atualização.
