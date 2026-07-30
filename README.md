# @sim1222/zen-study-classnames

> [!WARNING]
> This project is 100% AI Generated. Use at your own risk.

ZEN Study (https://www.nnn.ed.nico) のハッシュ化 CSS クラス名(styled-components 形式、例: `sc-11in5kn-0 jTMKEj`)を実ページから自動収集し、型付き TypeScript として提供する npm パッケージ。

> **注意**: `stableSelectors` はベストエフォートの参照であり、サイトの安定した契約ではありません。
>
> - **styled-components 形式**(サイト本体、例: `sc-11in5kn-0 jTMKEj`): `sc-*` のコンポーネント ID のみを採用し、ビルドごとに変わる生成ハッシュ(`jTMKEj` 等)は捨てます。ただし `sc-*` ID もコンポーネントのソースが変われば変わります。また `sc-aXZVg` のような汎用コンポーネントの ID だけになる要素では特定力がほぼありません
> - **CSS Modules 形式**(例: `Button_primary__x3f2a`): `[class*="Button_primary__"]` の部分一致に変換します。ハッシュ部分の変更には耐えますが、コンポーネント名自体の変更には耐えません。また class 属性全体への部分一致のため、理論上は別トークン(例: `NotButton_primary__x`)にも一致し得ます
>
> 厳密な判定が必要な場合は `classNames` の値を使って `classList` を自前で検査してください。

## 使い方(パッケージ利用者)

```ts
import { classNames, selectors, stableSelectors, type ElementName } from "@sim1222/zen-study-classnames";

document.querySelector(selectors.playButton);
```

- `classNames` — 要素名 → 観測されたクラス名の配列
- `selectors` — 要素名 → `.a.b.c` 形式の完全一致セレクタ。**通常はこれを使う**
- `stableSelectors` — 要素名 → ハッシュ耐性セレクタ。パッケージ更新の合間にサイト側だけ変わった場合のフォールバック

## 運用モデル

このパッケージは CI が毎日サイトをチェックし、クラス名に差分があれば patch バージョンを上げて publish します。依存する側はパッケージ更新に追従して再ビルドすれば、常に最新の完全一致セレクタ(`selectors`)が使えます。`stableSelectors` はあくまで更新が追いつくまでの保険です。

## 開発(抽出とビルド)

必要なもの: [Bun](https://bun.sh)

```sh
bun install
bunx playwright install chromium   # 初回のみ。playwright 更新後も再実行
```

### 1. ログイン(初回・セッション失効時)

```sh
bun run login
```

ブラウザが開くので手動でログイン(SSO 含む)し、ターミナルで Enter を押すと認証状態が `auth.json` に保存されます。**`auth.json` は秘密情報です。絶対にコミットしないでください**(.gitignore 済み)。

### 2. 抽出

```sh
bun run extract
```

`scripts/spec.ts` の定義に従ってページを巡回し、`src/index.ts` を再生成します。

巡回の前に `spec.ts` の `loginCheck` で定義された「ログイン時にのみ表示される要素」を確認します。ログインページへのリダイレクトだけでなく、同じ URL のまま未ログイン向けページが表示されるケースもここで検知され、exit code 2 で終了します。

- 全要素の抽出に成功した場合のみ `src/index.ts` を更新します(一時的な失敗で公開 API からキーが消えるのを防ぐため)
- 部分的な結果で更新したい場合は `bun run extract --allow-partial`
- デバッグ時は `bun run extract --headed` でブラウザを表示したまま巡回を観察できます
- spec が空のとき、実データを含む既存の `src/index.ts` は上書きしません(`--allow-empty` で明示的に空生成可)
- ページ遷移間の待機は `EXTRACT_DELAY_MS`(デフォルト 750ms)で調整可能
- 終了コード: `0` 成功 / `1` 要素が見つからない / `2` 認証が必要(`auth.json` 不在または失効)

### 3. ビルド

```sh
bun run build    # dist/ に ESM + .d.ts を出力
bun run check    # 型チェック
bun test         # ユニットテスト
```

## 要素の追加方法

`scripts/spec.ts` にエントリを 1 件追加するだけで、次回の `bun run extract` で生成コードに反映されます。ハッシュ化クラス名を直接書かず、role / テキスト / aria 属性など安定した手がかりで探してください。

```ts
export const spec: Record<string, ElementSpec> = {
  playButton: {
    url: "https://www.nnn.ed.nico/courses/999/chapters/9999",
    find: (p) => p.getByRole("button", { name: "再生" }),
  },
};
```

同一 URL のエントリはページ遷移を再利用してまとめて処理されます。表示前に操作が必要な要素は `prepare` を使ってください。

## 運用上の注意

- `auth.json` および認証情報をログ・コミット・生成物に含めないこと
