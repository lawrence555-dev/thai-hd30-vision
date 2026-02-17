# 部署指南

Thai HD30 Vision 的 Vercel 部署步驟與設定說明。

---

## 前置需求

- GitHub 帳號
- Vercel 帳號
- Supabase 帳號
- Node.js 18+

---

## Supabase 設定

### 1. 建立專案

1. 前往 https://supabase.com
2. 點擊 "New Project"
3. 填寫專案名稱與密碼
4. 選擇區域 (建議: Singapore)
5. 等待專案建立完成

### 2. 執行 Migration

在 Supabase Dashboard 的 SQL Editor:

1. 開啟新查詢
2. 複製 `supabase/migrations/001_news_and_alerts.sql`
3. 執行
4. 複製 `supabase/migrations/002_advanced_alerts.sql`
5. 執行

驗證:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

應該看到 11 個表格。

### 3. 取得 API 金鑰

在 Project Settings > API:
- `Project URL` - 複製為 `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` - 複製為 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` - 複製為 `SUPABASE_SERVICE_ROLE_KEY`

---

## Vercel 部署

### 1. 連接 GitHub

1. 前往 https://vercel.com
2. 點擊 "New Project"
3. Import Git Repository
4. 選擇 `thai-hd30-vision`
5. 點擊 "Import"

### 2. 設定環境變數

在 Environment Variables 區塊:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

確保所有環境都勾選:
- Production
- Preview
- Development

### 3. 部署設定

**Framework Preset**: Next.js

**Build Command**: (保持預設)
```bash
npm run build
```

**Output Directory**: (保持預設)
```
.next
```

**Install Command**: (保持預設)
```bash
npm install
```

### 4. 開始部署

點擊 "Deploy" 按鈕,等待部署完成。

---

## Cron Job 設定

### 1. 建立 vercel.json

在專案根目錄建立 `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**說明**: 每 15 分鐘執行一次價格更新

### 2. Cron 表達式

格式: `分 時 日 月 星期`

範例:
- `*/15 * * * *` - 每 15 分鐘
- `0 * * * *` - 每小時
- `0 0 * * *` - 每天午夜
- `0 9 * * 1-5` - 週一到週五早上 9 點

### 3. 驗證 Cron

在 Vercel Dashboard:
1. 前往 Settings > Cron Jobs
2. 確認 `/api/cron/update-prices` 已列出
3. 查看執行歷史

---

## 自訂網域

### 1. 新增網域

在 Vercel Dashboard:
1. 前往 Settings > Domains
2. 輸入網域名稱 (例如: `thai-hd30.com`)
3. 點擊 "Add"

### 2. DNS 設定

在網域註冊商 (例如: Cloudflare, GoDaddy):

**A Record**:
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME Record**:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. 驗證

等待 DNS 傳播 (通常 5-10 分鐘),然後訪問自訂網域。

---

## 環境管理

### Production

- 主分支 (main) 自動部署
- 使用 Production 環境變數
- 啟用 Cron Jobs

### Preview

- Pull Request 自動建立 Preview
- 使用 Preview 環境變數
- 不執行 Cron Jobs

### Development

- 本機開發環境
- 使用 `.env.local`
- 手動觸發 Cron

---

## 監控與日誌

### Vercel Analytics

在 Dashboard 查看:
- 頁面瀏覽量
- 載入時間
- 使用者地理位置

### Function Logs

在 Deployments > Functions:
- API Routes 執行日誌
- Cron Job 執行結果
- 錯誤訊息

### Real-time Logs

```bash
vercel logs --follow
```

---

## 效能優化

### Edge Functions

Vercel 自動在全球 Edge Network 執行,無需額外設定。

### 快取策略

在 API Routes 設定快取標頭:

```typescript
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
    }
  });
}
```

### 圖片優化

使用 Next.js Image 元件:

```tsx
import Image from 'next/image';

<Image 
  src="/logo.png" 
  width={100} 
  height={100} 
  alt="Logo"
/>
```

---

## 故障排除

### 部署失敗

1. 檢查 Build Logs
2. 確認環境變數正確
3. 本機執行 `npm run build` 測試

### Cron Job 未執行

1. 確認 `vercel.json` 格式正確
2. 檢查 Cron Jobs 設定
3. 查看 Function Logs

### 環境變數未生效

1. 確認變數名稱正確
2. 重新部署專案
3. 清除快取

### 資料庫連線失敗

1. 檢查 Supabase URL 與金鑰
2. 確認 RLS 政策
3. 查看 Supabase Logs

---

## 回滾部署

### 方法 1: Vercel Dashboard

1. 前往 Deployments
2. 找到穩定版本
3. 點擊 "Promote to Production"

### 方法 2: Git Revert

```bash
git revert HEAD
git push origin main
```

Vercel 會自動部署回滾後的版本。

---

## 成本估算

### Vercel (Hobby 方案 - 免費)

- 100GB 頻寬/月
- 無限部署
- 自動 HTTPS
- Edge Network

**超額費用**: $20/100GB

### Supabase (Free 方案)

- 500MB 資料庫
- 1GB 檔案儲存
- 2GB 頻寬/月
- 50,000 月活躍使用者

**升級方案**: $25/月 (Pro)

### 總計

- 開發階段: $0/月
- 生產環境 (小流量): $0/月
- 生產環境 (中流量): $25-50/月

---

## 擴展建議

### 流量增長

1. 升級 Vercel Pro ($20/月)
2. 啟用 Edge Caching
3. 使用 CDN

### 資料增長

1. 升級 Supabase Pro ($25/月)
2. 啟用資料庫備份
3. 設定資料保留政策

### 功能擴展

1. 新增 API Routes
2. 整合第三方服務
3. 實作使用者認證

---

## 安全檢查清單

- [ ] 環境變數已設定
- [ ] RLS 政策已啟用
- [ ] HTTPS 已啟用
- [ ] CORS 已設定
- [ ] API 金鑰已保護
- [ ] 敏感資料已加密
- [ ] 定期備份資料庫
- [ ] 監控異常流量

---

## 持續整合/部署 (CI/CD)

Vercel 提供自動 CI/CD:

1. **Git Push** → 自動部署
2. **Pull Request** → 自動建立 Preview
3. **Merge** → 自動部署到 Production

無需額外設定 GitHub Actions 或其他 CI 工具。

---

## 聯絡支援

**Vercel Support**:
- 文檔: https://vercel.com/docs
- Discord: https://vercel.com/discord

**Supabase Support**:
- 文檔: https://supabase.com/docs
- Discord: https://discord.supabase.com

**專案 Issues**:
- GitHub: https://github.com/lawrence555-dev/thai-hd30-vision/issues
