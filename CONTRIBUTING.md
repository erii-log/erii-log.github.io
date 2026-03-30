# ページ記述ルール

## リポジトリ構造

```
posts/
  YYYY-MM/
    YYYY-MM-DD.md      # 日付ごとの活動記録
  about.md             # サイトについてのページ
  asset/               # 画像等のアセット
```

---

## ページ構造

### ファイル名

`posts/YYYY-MM/YYYY-MM-DD.md`

### 見出しの階層

```markdown
# YYYY-MM-DD (曜日)

## セクション名

### サブセクション（オプション）
```

- **h1**: `YYYY-MM-DD (曜日)` — ファイルにつき 1 つ
- **h2**: 情報の種類またはイベント名
- **h3**: オプション。補足情報やサブセクション

---

## h2 セクションの種類

| h2                 | 用途                              | 日付基準     |
| ------------------ | --------------------------------- | ------------ |
| `<短いイベント名>` | オフラインイベント・ライブ        | 開催日       |
| `<番組名>`         | 冠番組の放送内容                  | 放送・配信日 |
| `ゲスト出演`       | ゲスト出演・作品出演              | 放送・配信日 |
| `SNS更新`          | X(Twitter)・Instagram 投稿        | 投稿日       |
| `ブログ更新`       | 公式ブログ                        | 投稿日       |
| `告知`             | CD 発売・イベント開催等の公式発表 | 告知日       |
| `エリみな`         | 田中美海さんとのエピソード        | 投稿日       |

---

## 情報種別ごとの記述ルール

### オフラインイベント

開催日基準で記録します。

```markdown
## <短いイベント名>

### 開催概要

- **会場**: 場所名
- **日時**: YYYY-MM-DD HH:MM〜
- **共演者**: ○○、○○
- **チケット**: 情報

### セットリスト

1. 曲名
2. 曲名

### グッズ販売

販売されたグッズの一覧

- グッズ名、¥価格

### 共演者の方

（共演者による SNS での山崎エリイさんへの言及・写真の埋め込み）
 
 ```

---

### SNS 更新

投稿日（JST）を基準に記録します。埋め込み HTML を使用します。

```markdown
## SNS更新

### Twitter

<blockquote class="twitter-tweet" ...>...</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

### Instagram

<blockquote class="instagram-media" data-instgrm-captioned ...>...</blockquote>
<script async src="//www.instagram.com/embed.js"></script>

### TikTok

<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@erii_yamazaki/video/...</blockquote> <script async src="https://www.tiktok.com/embed.js"></script>
```

#### Twitter

- 公式アカウント [@eriii_musicinfo](https://x.com/eriii_musicinfo) の本人が投稿ツイートを埋め込み
- oEmbed API で埋め込みコードを取得:
  ```
  https://publish.twitter.com/oembed?url=https://twitter.com/eriii_musicinfo/status/{id}&lang=ja
  ```

#### Instagram

- 公式アカウント [@erii_yamazaki](https://www.instagram.com/erii_yamazaki/)の投稿を埋め込み
- 「埋め込み」（キャプション追加あり）の HTML を使用

 #### TikTok
- 公式アカウント [@erii_yamazaki](https://www.tiktok.com/@erii_yamazaki) の投稿を埋め込み
- 埋め込みの HTML を使用

---

### 公式番 組

冠番組は放送・配信日を基準に記録します。

```markdown
## <番組名> 

### 正式な番組名と#回数
- 配信日時: YYYY-MM-DD HH:MM〜
- URL: https://...
- 共演者など

（番組で起きた主な出来事を記録）
```

- 番組公式 SNS・共演者の投稿は放送日基準で埋め込みで記録します。

#### 現行のレギュラー番組

| 番組名                 | 期間         | プラットフォーム | URL                                     | SNS                                             |
| ---------------------- | ------------ | ---------------- | --------------------------------------- | ----------------------------------------------- |
| エリイクリニック       | 2023/10/27〜 | OPENREC.tv       | https://www.openrec.tv/user/erii_clinic | [@seigurachannel](https://x.com/seigurachannel) |
| これって推し事なんです | 2019〜       | ニコニコ生放送   | https://ch.nicovideo.jp/voicegarage     | [@oshigoto_vg](https://x.com/oshigoto_vg)       |

#### 現行の準レギュラー番組

- 銀座de火曜祭 〜Let's sing a song from GINZA〜 
  - https://s.mxtv.jp/music/ginza-de-kayousai/

---

### 出演

公式サイトの出演情報をソースに記録します。

- 作品のタイトル、役名
- ゲスト出演の場合: 共演者、概要、URL、コーナーの内容

---

### ブログ更新

- ファンクラブメンバーズブログを、投稿日基準でリンク付きタイトルを記録します。
- 公式ブログ: https://yamazaki-erii.com/contents/blog

```markdown
## ブログ更新

- [タイトル](URL)
```

---

### 告知

公式に発表された日を基準に記録します。

```markdown
## 告知

[公式サイト News](https://yamazaki-erii.com/contents/news) や、公式 SNS のスタッフによる告知投稿をソースに、イベント開催や CD 発売などの情報を記録します。

### イベント名・CD タイトル等

- https://yamazaki-erii.com/contents/000000
- 詳細情報
```

- CD 発売、イベント開催、出演情報などです。

### エリみな

- 田中美海さんとのエピソードを記録します。
- SNS での投稿日基準で記録します。
- [Instagram](https://www.instagram.com/minazou_in_sta/) 
- [X(Twitter)](https://x.com/minazou_373)

---

## 特記事項

- **食べた物と感想**: 言及があれば記録します。

---

## Git 運用ルール

- 情報の**対象日付ごと**にコミットします。
- コミットメッセージ: `Update YYYY-MM-DD.md`

例:
```
Update 2026-03-28.md
Update 2026-03-25.md
```
