# Arturia.ShortLink 后端

## 本地启动

1. 复制 `.env.example` 为被 Git 忽略的 `.env.local`，填写仅用于本机的随机密码。
2. 启动 MySQL：`docker compose -f backend/compose.dev.yml --env-file backend/.env.local up -d mysql`。
3. 将 `.env.local` 中的 `ConnectionStrings__DefaultConnection`、`Database__AutoMigrate` 和 `Database__SeedDemoData` 注入当前终端环境。
4. 执行 `dotnet run --project backend/src/Arturia.ShortLink.Api --urls http://localhost:5000`。
5. 打开 `http://localhost:5000/scalar/v1`。

Development 环境会执行迁移和幂等演示种子；Production 默认不会自动迁移或写入演示数据。
