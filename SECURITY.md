# Security notes

- Do not expose PostgreSQL or Redis ports.
- Do not expose SSH if SSM can be used.
- Keep `.env` out of Git.
- Use Secrets Manager/Parameter Store in AWS.
- Keep rate limits enabled.
- Keep the worker concurrency low until resource usage is measured.
- Keep a maximum file size.
- Keep yt-dlp and FFmpeg updated through controlled image builds.
- Do not add authentication bypass, DRM bypass, or arbitrary URL fetching.
