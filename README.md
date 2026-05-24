# 夕食スキップ

iPhoneのホーム画面からワンタップで、自作Discord Botにお母様の個人DMへ「今日は夕食いらない」と送らせるパーソナルPWA。

## 構成

```
[iPhone ホーム画面アイコン]
    ↓ tap
[PWA (Vite+React+Tailwind, vite-plugin-pwa)]
    ↓ POST /api/send  (Bearer <SHARED_TOKEN>)
[Vercel Function: api/send.ts (Edge Runtime)]
    ↓ token検証 → 環境変数からBOT_TOKEN/RECIPIENT_USER_IDを取得
    ↓ ① POST /users/@me/channels        (DMチャンネルをopen)
    ↓ ② POST /channels/{id}/messages    (メッセージ送信)
[Discord Bot]
    ↓
[お母様の個人DM]  ← 「夕食連絡Bot からの新着メッセージ」として届く
```

既存の家族グループDMには一切手を加えない。Botとお母様の1対1のDMスレッドが新たに1本増えるだけ。

---

## セットアップ手順

### 1. Discord Bot を作成し、専用サーバーに招待する

Botがお母様の個人DMにメッセージを送るには、**Botとお母様が同じサーバーに参加している必要がある** (Discordの仕様)。そのため小さな専用サーバーを1つ作る。

#### 1-1. Discord Application + Bot を作成

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く
2. 右上の **New Application** をクリック
3. 名前を「夕食連絡Bot」など → **Create**
4. 左メニュー **Bot** を選択
5. **Reset Token** → 表示されたトークンをコピー
   - **このトークンは一度しか見られない**。すぐパスワードマネージャ等に保存
   - これが後の `DISCORD_BOT_TOKEN`
6. その下の **Privileged Gateway Intents** は **すべてOFFのまま**でOK
   - (このアプリは送信専用、メッセージ受信や状態同期は不要)
7. 必要なら同ページ上部の **App Icon** や **Username** をお好みで変更
   - これがお母様のDMに表示されるBot名・アイコンになる

#### 1-2. 専用サーバーを作成

1. Discordアプリ(またはブラウザ版)左サイドバー一番下の **+** ボタン
2. **オリジナルの作成** → **自分と友達のため**
3. サーバー名を「夕食連絡」など、アイコンお好みで → **作成**

#### 1-3. BotをそのサーバーにOAuthで招待

1. Developer Portal → 作成したアプリ → 左メニュー **OAuth2** → **URL Generator**
2. **Scopes** から `bot` にチェック
3. **Bot Permissions** から `Send Messages` にチェック (他は不要)
4. ページ下部に出てくる **Generated URL** をコピーしてブラウザの新しいタブで開く
5. 「サーバーを選択」で先ほど作った「夕食連絡」を選択 → **認証** → 「私はロボットではありません」
6. Discordアプリで「夕食連絡」サーバーを開き、Botが参加していることを確認

#### 1-4. お母様をサーバーに招待

1. 「夕食連絡」サーバー名の横の `∨` → **人を招待する**
2. 招待リンクの設定画面が出るので、画面下の **「招待リンクを編集」** で:
   - 有効期限: **無期限**
   - 使用回数: **1回** (セキュリティのため)
3. **新しいリンクを生成** → リンクをコピー
4. リンクを既存の家族グループDMで送るか、別チャネル(LINE等)でお母様に送る
5. お母様が招待リンクをタップして「夕食連絡」サーバーに参加(Discordアプリ必須)

#### 1-5. お母様のUser IDを取得

1. お母様にサーバーへ入ってもらう前/後どちらでもOK、まずあなた側のDiscordで:
2. Discord 設定(歯車) → **詳細設定** → **開発者モード** ON
3. 「夕食連絡」サーバーのメンバーリストでお母様を右クリック → **IDをコピー**
4. これが `DISCORD_RECIPIENT_USER_ID` の値 (18桁前後の数字)

#### 1-6. お母様のDM受信設定を確認

Botからの送信が成功するには、お母様側で以下が必要:
1. Discord 設定 → **プライバシー・安全** → 「サーバーメンバーからのダイレクトメッセージを許可する」が **ON** (デフォルトでON)
2. もしOFFになっている場合、Botからの送信は `Cannot send messages to this user` で失敗するので、お母様に一度ONにしてもらう

#### 1-7. 動作確認 (PowerShell)

Botトークンが正しく動くか、ローカルで確認:

```powershell
$token = '<コピーしたBOT_TOKEN>'
$userId = '<お母様のUSER_ID>'

# DMチャンネル作成 (or 既存取得)
$dmRes = Invoke-RestMethod -Method POST `
  -Uri 'https://discord.com/api/v10/users/@me/channels' `
  -Headers @{ Authorization = "Bot $token"; 'Content-Type' = 'application/json' } `
  -Body (@{ recipient_id = $userId } | ConvertTo-Json)

# メッセージ送信
Invoke-RestMethod -Method POST `
  -Uri "https://discord.com/api/v10/channels/$($dmRes.id)/messages" `
  -Headers @{ Authorization = "Bot $token"; 'Content-Type' = 'application/json' } `
  -Body (@{ content = "botテスト" } | ConvertTo-Json)
```

お母様のDiscordに「botテスト」というBotからのDMが届けば成功。

### 2. 依存パッケージのインストール

```powershell
cd c:\Users\Sachi\Desktop\Apps\dinner-skip
npm install
```

### 3. 環境変数を作成

`.env.local.example` をコピー:

```powershell
Copy-Item .env.local.example .env.local
```

`.env.local` を編集し、以下4つを設定:

| 変数名 | 値 | 取得方法 |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Botトークン | Step 1-1 |
| `DISCORD_RECIPIENT_USER_ID` | お母様のUser ID | Step 1-5 |
| `SHARED_TOKEN` | 自分で生成する64桁の乱数 | 下記コマンド |
| `VITE_SHARED_TOKEN` | `SHARED_TOKEN` と同じ値 | 同上 |

ランダム文字列の生成(PowerShell):

```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

### 4. ローカル動作確認

Vercel CLI で Function とフロントを一緒に動かす:

```powershell
npm install -g vercel    # 初回のみ
npx vercel dev
```

`http://localhost:3000` をブラウザで開き、ボタンを押す → お母様のDiscordに「今日は夕食いらない」がBotからのDMで届けばOK。

`npm run dev` 単体だとAPI部分が動かないので注意 (Vite単体は静的ファイルのみ)。

### 5. GitHubに push (private推奨)

```powershell
git init
git add .
git commit -m "init"
# GitHubで dinner-skip リポジトリを private で作成してから
git remote add origin <YOUR_REPO_URL>
git branch -M main
git push -u origin main
```

`.env.local` が `.gitignore` に含まれていることを必ず確認してから push する。

### 6. Vercelデプロイ

1. [vercel.com](https://vercel.com) にGitHubアカウントでサインイン
2. **Add New → Project** → 上で作ったリポジトリを Import
3. **Environment Variables** に以下4つを登録 (Productionに必須):
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_RECIPIENT_USER_ID`
   - `SHARED_TOKEN`
   - `VITE_SHARED_TOKEN` (`SHARED_TOKEN` と同じ値)
4. **Deploy** をクリック
5. 完了後、`https://dinner-skip-xxx.vercel.app` のURLが発行される

### 7. iPhone にホーム画面アイコンとして追加

1. iPhoneのSafariで上記Vercel URLを開く (QRコード経由が楽)
2. 共有メニュー → **ホーム画面に追加**
3. 名前を「夕食スキップ」など → 追加
4. ホーム画面の新しいアイコンをタップ → 全画面PWAが起動 → 中央の赤い丸ボタンをタップ
5. お母様のDiscordに「今日は夕食いらない」がBotからのDMで届くことを確認

---

## ファイル構成

```
dinner-skip/
├── api/
│   └── send.ts              # Vercel Function: Bot DM送信
├── public/
│   ├── icon-192.png         # PWAアイコン
│   ├── icon-512.png
│   ├── apple-touch-icon.png # iOS用 (180x180)
│   └── favicon.ico
├── src/
│   ├── App.tsx              # 大ボタン + 状態管理
│   ├── main.tsx
│   ├── index.css            # Tailwind + iOS safe-area対応
│   └── vite-env.d.ts
├── index.html               # iOS PWAメタタグ込み
├── vite.config.ts           # vite-plugin-pwa設定
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── package.json
├── .env.local.example
└── .gitignore
```

---

## カスタマイズ

### アイコンを変更

`public/` 内の以下4ファイルを差し替え:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `apple-touch-icon.png` (180×180)
- `favicon.ico`

[realfavicongenerator.net](https://realfavicongenerator.net/) で元画像1枚から全サイズ生成可能。

### Botのアイコン・名前を変更

Developer Portal → アプリ → **General Information** で:
- **App Icon**: ここの画像がお母様のDM一覧に表示される (例: 夕食の絵文字風)
- **Application Name**: お母様のDMで表示されるBot名

### メッセージ文を変更

`api/send.ts` の `DEFAULT_MESSAGE` 定数を編集してデプロイ。

---

## セキュリティの考え方

- **`DISCORD_BOT_TOKEN`**: Vercel環境変数のみ。フロントエンドのバンドルには含まれない。万が一漏れたら Developer Portal → Bot → **Reset Token** で即無効化 + 新トークンを環境変数に再設定
- **`VITE_SHARED_TOKEN`**: ビルド時にフロントに埋め込まれる。`view-source` やビルド成果物の解析で抜ける可能性あり。**「URLを共有しない」前提のソフトな認証**
- 万が一トークンが漏れた場合の被害範囲: Botがお母様にDMを送れるだけ。家族グループDMや他チャンネルには影響しない (Botがいないため)

---

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| `failed to open DM channel: 403` | Botがお母様と同じサーバーにいない → Step 1-3, 1-4 を確認 |
| `failed to send DM: 50007` (Cannot send messages to this user) | お母様のDM受信設定がOFF → Step 1-6 を確認 |
| `unauthorized` | `SHARED_TOKEN` と `VITE_SHARED_TOKEN` の値が一致していない |
| `server misconfigured` | Vercelの環境変数が登録されていない or デプロイ前 |
| Botからのメッセージが届かない (エラーは出ない) | お母様の通知設定でBotからのDMをミュートしている可能性 |

---

## 今後の拡張予定 (v2)

- 上部タブで複数プリセットを切替 (「夕食いらない」「外泊」など)
- 設定画面からプリセットのボタン名・送信文を編集
- localStorage にプリセット保存

API側 (`api/send.ts`) は既に `content` を任意で受け取れる作りなので、フロント追加だけで実装可能。
