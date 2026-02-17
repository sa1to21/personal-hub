# Personal Hub

Микросервисное веб-приложение для управления проектами (kanban-доски) с аутентификацией. Вся инфраструктурная часть (Docker, CI/CD, Nginx) настроена вручную.

**Важно:** Вся инфраструктурная часть проекта (Dockerfiles, docker-compose, nginx.conf, Jenkinsfile, конфигурация Jenkins) написана вручную мной лично. Для написания кода (Node.js сервисы, React фронтенд) использовался AI, как разработчик-ассистент, чтобы сфокусироваться на DevOps-tools.

---

## Архитектура

Архитектура
Приложение разбито на три сервиса (на момент написания), каждый в своём контейнере:
Frontend - фронтенд на React (Vite), собирается через docker-compose.yml. Раздаётся через Nginx, который также проксирует запросы на бэкенд: /api/auth/ уходит в auth-service, остальные /api/ — в task-service.
Auth-service — сервис регистрации и авторизации на Node.js. Работает с JWT-токенами, хранит данные в отдельной PostgreSQL.
Task-service — сервис управления задачами на Node.js. Своя база данных PostgreSQL.

Обе базы подключены через тома (volumes) и поднимаются с healthcheck и сервисы стартуют только после готовности базы данных. 

- **Frontend** — собирается через multi-stage Docker build, отдается через Nginx, который также работает как reverse proxy для API
- **Auth Service** & **Task Service** — изолированные микросервисы, каждый со своей базой данных
- **Jenkins** — пайплайн для тестирования (sevices/auth-service/tests), сборки фронтенда и доставки на dev-сервер

---

## DevOps-стек (написано вручную)

| Файл | Описание |
|------|----------|
| `docker-compose.yml` | Оркестрация всех сервисов: frontend, auth-service, task-service, две изолированные базы данных PostgreSQL для каждого из сервисов. Настроен healthcheck для бд. Базы данных также сохраняются через тома (volumes) |
| `services/auth-service/Dockerfile` | Контейнеризация сервиса auth-service |
| `services/task-service/Dockerfile` | Контейнеризация сервиса task-service |
| `services/frontend/Dockerfile` |  Сборка React (Vite) + раздача через Nginx. Разделены этапы сборки (build) и раздачи (nginx) |
| `services/frontend/nginx.conf` | Конфигурация Nginx внутри frontend контейнера, настроенные location для /api/auth (auth-service) и для /api (task-service), также `try_files` для остальных путей |
| `Jenkinsfile` | CI/CD пайплайн: тесты > сборка фронтенда > деплой через Docker Compose |
| `Конфигурация Jenkins` | Настройка сервера: установка плагинов (Pipeline, Git), подключение credentials, настройка webhook-триггера из GitHub |
| `services/*/.dockerignore` | Оптимизация Docker context для каждого сервиса |
| `.gitignore` | Настройка исключений для Git |

---
# CI/CD

Jenkins pipeline выполняет три стадии:

1. **Test-auth** — запуск тестов auth-service (`npm test`)
2. **Build-frontend** — сборка фронтенда (`npm run build`)
3. **Dev-delivery** — пересборка и деплой всех контейнеров через Docker Compose

---

## Структура проекта

```
personalhub/
├── docker-compose.yml            # Оркестрация всех сервисов
├── Jenkinsfile                   # CI/CD пайплайн
├── .gitignore
├── services/
│   ├── auth-service/
│   │   ├── Dockerfile            # Контейнеризация
│   │   ├── .dockerignore
│   │   ├── src/                  # Код приложения (AI)
│   │   └── tests/
│   ├── task-service/
│   │   ├── Dockerfile            # Контейнеризация
│   │   ├── .dockerignore
│   │   └── src/                  # Код приложения (AI)
│   └── frontend/
│       ├── Dockerfile            # Multi-stage build
│       ├── nginx.conf            # Nginx конфигурация для frontend контейнера
│       └── src/                  # Код приложения (AI)
```
---

## Примечание

Код приложения (фронтенд и бэкенд-логика) написан с помощью AI (Claude Code). Инфраструктурная часть — Dockerfile'ы, docker-compose.yml, nginx.conf, Jenkinsfile — настроена полностью вручную.
