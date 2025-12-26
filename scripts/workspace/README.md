# Workspace Utilities

Deze directory bevat symlinks naar workspace-wide utility scripts.

## 📁 Beschikbare Scripts

Via de symlink `root/` heb je toegang tot alle workspace utilities:

```bash
# MinIO utilities
./scripts/workspace/root/minio/open-minio.sh
./scripts/workspace/root/minio/setup-minio.sh

# Git utilities
python3 ./scripts/workspace/root/git/pull_cv_repo.py
python3 ./scripts/workspace/root/git/push_all_projects.py
```

## 📚 Documentatie

Voor volledige documentatie, zie:
- [Workspace Scripts README](../../../../scripts/README.md)

## 💡 Snelle Toegang

Je kunt ook direct vanuit deze directory werken:

```bash
cd scripts/workspace/root
./minio/open-minio.sh
python3 git/push_all_projects.py
```

