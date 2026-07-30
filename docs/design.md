# 設計ドキュメント

## 目的

ZEN Study のハッシュ化 CSS クラス名(CSS Modules 形式)を実ページから収集し、型付き TypeScript として npm パッケージ化する。詳細な背景・受け入れ条件はプロジェクト仕様(依頼文)を参照。

## モジュール構成

依存は一方向: `extract.ts` → (`spec.ts`, `lib/*`)。`lib/` は Playwright に依存しない純粋ロジック。

| モジュール | 責務(1 文) |
|---|---|
| `scripts/lib/classnames.ts` | `class` 属性のパースと、正確/ハッシュ耐性 CSS セレクタの生成 |
| `scripts/lib/codegen.ts` | 収集結果から公開モジュール `src/index.ts` のソースを決定的に生成 |
| `scripts/lib/group.ts` | spec エントリを URL でグルーピング(ページ遷移の再利用) |
| `scripts/spec.ts` | 抽出対象要素の定義(人間が編集する唯一のファイル) |
| `scripts/login.ts` | 手動ログインによる認証状態 (`auth.json`) の保存 |
| `scripts/extract.ts` | 巡回・抽出・生成のオーケストレーション(アプリケーション層) |
| `src/index.ts` | 自動生成される公開 API(コミット対象) |

## 運用モデル

サイトのクラス名は毎日変わるものではないため、鮮度は日次 CI(差分検知 → patch bump → publish)で担保し、利用側はパッケージ更新に追従して再ビルドする。したがって利用側の第一選択は完全一致の `selectors` であり、`stableSelectors` は更新が追いつくまでのフォールバックという位置づけ。

## 主要な設計判断

- **決定的な codegen**: 生成物にタイムスタンプを含めない。要素名は辞書順ソート、クラス配列は重複排除(DOM 順維持)、LF 固定・末尾改行 1 つ。CI の「差分があれば publish」が誤発火しないため。仕様の「ISO timestamp 入りヘッダ」はこの理由で意図的に外した(プランレビューでの指摘を採用)
- **全件成功時のみ更新**: 一時的な抽出失敗で公開 API からキーが消えるのを防ぐ。部分更新は `--allow-partial` の明示指定時のみ。生成はプロセス固有名の tmp ファイル → rename の atomic 置換。spec が空の場合も、実データを含む既存生成物は `--allow-empty` なしでは上書きしない
- **終了コード**: `0` 成功 / `1` 抽出失敗 / `2` 認証必要(`auth.json` 不在・パース不能・ログインリダイレクト検知のすべて)
- **auth.json の最小化**: login.ts は保存前にアプリ origin 上にいることを確認し、アプリ hostname に送信される cookie とアプリ origin のストレージのみを 0600 で保存(SSO/IdP 側の認証情報は含めない)
- **CI の publish 復旧**: 「生成物の差分有無」と「現在の version が npm に存在するか」を独立に判定し、publish が一度失敗しても次回 run で再試行できる。`concurrency` で同時実行を禁止
- **ハッシュ判定**: サイト本体は styled-components 形式(`sc-11in5kn-0 jTMKEj` 等)。`sc-*` はコンポーネント ID で比較的安定、それ以外の生成ハッシュ(`jTMKEj` 等)はビルドごとに変わり安定プレフィックスがない。そのため `stableSelector` は `sc-*` トークンが 1 つでもあればそれのみを採用し、生成ハッシュを捨てる。`sc-*` がない場合は CSS Modules 形式(`/^(.+__)[A-Za-z0-9-]+$/`、`HASHED_CLASS_PATTERN`)のプレフィックス部分一致にフォールバック。BEM (`menu__item`) を誤判定し得るヒューリスティックで、`pattern` 引数により差し替え可能
- **CSS エスケープ**: `.foo` 形式は `CSS.escape` 相当のエスケープ、属性値は `"` と `\` をエスケープ
- **ログイン検知**: 2 段構え。(1) `goto` 後の最終 URL が `https://www.nnn.ed.nico` origin 外、または `/login` 配下なら認証失効と判定(要素抽出失敗時にも再チェック)。(2) 巡回開始前に `spec.ts` の `loginCheck`(ログイン時のみ表示される要素)を積極的に確認し、同一 URL のまま未ログイン向けページが返るケースを検知。いずれも exit 2
- **Bun 互換性**: スクリプトは Bun 専用 API を避け `node:fs/promises` 等で記述(将来 Node でも実行可能)

## ビルド

- `tsconfig.json` — 全体の型チェック用 (noEmit)
- `tsconfig.build.json` — `src/` のみから `.d.ts` を生成(scripts の型定義が dist に混入しないよう分離)
- `bun build --target browser --format esm` で `dist/index.js`
