# Terraform - EC2 MVP

Este diretório é o ponto de partida para a infraestrutura AWS.

Para o primeiro deploy, recomendo:

- VPC existente ou VPC dedicada
- subnet pública para ALB, se utilizado
- EC2 em subnet privada quando houver NAT
- Security Group sem SSH
- IAM Instance Profile com SSM
- EBS separado para `/opt/youtube-downloader/downloads`

A aplicação foi desenhada para ser administrada por SSM em vez de SSH.

O Terraform completo deve ser adaptado à VPC/conta AWS real antes de aplicar, especialmente CIDRs, AZs, subnets e política de saída.

Não coloque credenciais AWS no código Terraform.
