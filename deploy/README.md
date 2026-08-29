# Deployment flow

1. Build image:
   docker compose build --pull

2. Apply database migrations:
   docker compose run --rm app npx prisma migrate deploy

3. Start:
   docker compose up -d

4. Check:
   docker compose ps
   curl http://localhost/api/health

For AWS, put the EC2 behind an ALB when TLS/domain are needed. Keep PostgreSQL and Redis internal to the Docker network and do not publish their ports.
