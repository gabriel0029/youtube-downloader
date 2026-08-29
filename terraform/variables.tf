variable "aws_region" {
  type    = string
  default = "sa-east-1"
}

variable "project_name" {
  type    = string
  default = "youtube-downloader"
}

variable "instance_type" {
  type    = string
  default = "t3.large"
}

variable "vpc_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "allowed_ingress_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}
