import type { Locator, Page } from "playwright";

export interface ElementSpec {
	/** この要素が存在するページの URL */
	url: string;
	/** 安定した手がかり(role/text/aria/構造)で要素を返す */
	find: (page: Page) => Locator;
	/** 任意: 要素表示前に必要な操作(タブ切替、動画再生開始など) */
	prepare?: (page: Page) => Promise<void>;
}

/**
 * ログイン確認。extract は巡回を始める前にこのページを開き、
 * この要素が見つからなければ「認証失効」として exit code 2 で終了する。
 *
 * ログインページへのリダイレクトだけでなく、同じ URL のまま
 * 未ログイン向けページが表示されるケースを検知するためのもの。
 * 「ログイン時にのみ表示される要素」を指定すること。
 */
export const loginCheck: ElementSpec = {
	url: "https://www.nnn.ed.nico/genres/63",
	// コース一覧はログイン時のみ表示される想定。実ページに合わせて調整すること
	find: (p) => p.locator('a[href^="/courses/"]').first(),
};

/**
 * 複数のエントリから再利用する共通ロケータはこのように関数として
 * 括り出せる(find はただの関数なので合成できる)。
 *
 * ホームのコースセクション(見出し + カードグリッド)。同名見出しが
 * 複数あるため、/courses/2145 へのリンクを含む方に絞り込む。
 */
const homeCourseSection = (p: Page): Locator =>
	p
		.getByRole("heading", { name: "【ZEN Studyの使い方】" })
		.locator("xpath=../..")
		.filter({ has: p.locator('a[href="/courses/2145"]') })
		.first();

const chapterListItem = (p: Page): Locator =>
	p.getByRole("link", { name: "【はじめに】ZEN Studyについて" }).first();

/**
 * サイドバーのセクション一覧。この ul は list-style の影響で Chromium が
 * 暗黙の list ロールを外すため、getByRole ではなく aria-label の CSS で探す。
 */
const sectionList = (p: Page): Locator =>
	p.locator('ul[aria-label="課外教材リスト"]').first();

/** セクション一覧の各項目のクリック可能な div(li 直下)。 */
const sectionListItem = (p: Page): Locator =>
	sectionList(p).locator("xpath=./li/div");

const breadcrumbItem = (p: Page): Locator =>
	// sc-1mr8gis-0 kZYrPk
	// <ol class="sc-1mr8gis-4 bolqeU"><li class="sc-1mr8gis-0 kZYrPk"><a class="sc-1mr8gis-1 eCJxrg" href="/home"><i class="sc-x54faw-0 fsyZra sc-1mr8gis-7 itdTYV" type="home" aria-hidden="true"></i><span class="sc-1mr8gis-5 ehXNoQ">ホーム</span></a></li><li class="sc-1mr8gis-0 kZYrPk"><h2 class="sc-1mr8gis-3 hhGGPk"><span class="sc-1mr8gis-5 ehXNoQ">【ZEN Studyの使い方】</span></h2></li></ol>
	// パンくず先頭の li = /home へのリンクを直下に持つ li
	p.locator('li:has(> a[href="/home"])').first();

/**
 * 抽出対象の要素定義。ハッシュ化クラス名を直接書かず、
 * role / テキスト / aria 属性 / DOM 構造など安定した手がかりで探すこと。
 *
 * 同一 URL のエントリはページ遷移を再利用してまとめて処理される。
 */
export const spec: Record<string, ElementSpec> = {
	// 例(実際のセレクタは実ページを確認して調整すること):
	// playButton: {
	//   url: "https://www.nnn.ed.nico/courses/999/chapters/9999",
	//   find: (p) => p.getByRole("button", { name: "再生" }),
	// },
	// progressIndicator: {
	//   url: "https://www.nnn.ed.nico/courses/999/chapters/9999",
	//   prepare: async (p) => {
	//     await p.getByRole("tab", { name: "進捗" }).click();
	//   },
	//   find: (p) => p.getByRole("progressbar"),
	// },
	// iframe 内の要素は frameLocator を経由して探す(戻り値は通常の Locator):
	// playerPlayButton: {
	//   url: "https://www.nnn.ed.nico/courses/999/chapters/9999/movie/99999",
	//   find: (p) =>
	//     p
	//       .frameLocator('iframe[title="プレイヤー"]')
	//       .getByRole("button", { name: "再生" }),
	// },
	registeredCourseIndicator: {
		url: "https://www.nnn.ed.nico/genres/63",
		/*
    sc-aXZVg jZJKMb
    <div class="sc-aXZVg fYHoYN"><div class="sc-aXZVg brBOOs"><h3 style="height: auto; font-size: 24px;" class="sc-1h5ye17-0 ipaxCh"><span height="100%" class="sc-aXZVg gezlcN">【ZEN Studyの使い方】</span></h3></div><div display="grid" class="sc-aXZVg hZXhEc"><div class="sc-aXZVg hBUmIR"><a tabindex="0" href="/courses/2145"><div height="113px" overflow="hidden" class="sc-aXZVg sc-gEvEer huaUmY fteAEG"><div class="sc-aXZVg iOPUvz"><div class="sc-aXZVg jZJKMb"><img alt="" src="https://cdn.fccc.info/KYzg/soroban/1399dc806044e012c027fa4d77f1f77c/soroban-course-2145/142873d7.jpg#multi-media://fccc?default=jpg&amp;origin=https%3A%2F%2Fs3-ap-northeast-1.amazonaws.com%2Fsoroban-private%2Fmaterials%2Fpackages%2FNTHT%2FNTHTXZ%2FNTHTXZ_TH.jpg&amp;property%5Bgroup_key%5D=soroban-course-2145&amp;property%5Bjob_id%5D=1399dc806044e012c027fa4d77f1f77c" width="200px" class="sc-aXZVg hKZGWI"></div><div display="none" opacity="0.4" class="sc-aXZVg ifQEBe"></div><div class="sc-1fxx7t2-0 klvLaX"><div class="sc-11in5kn-0 jTMKEj"><div class="sc-11in5kn-1 gnDgdR"></div><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" type="course-added" width="20px" height="20px" color="#0077D3" aria-hidden="true" class="sc-11in5kn-2 jRHtef"><path fill="#0077D3" d="m10.562 14.492-2.497-2.496a.5.5 0 0 0-.344-.15.47.47 0 0 0-.363.15.5.5 0 0 0-.16.354q0 .194.16.354l2.638 2.638q.242.243.566.243.322 0 .565-.243l5.477-5.477a.5.5 0 0 0 .15-.344.47.47 0 0 0-.15-.363.5.5 0 0 0-.354-.16.5.5 0 0 0-.354.16zM12.003 21a8.8 8.8 0 0 1-3.51-.709 9.1 9.1 0 0 1-2.859-1.922 9.1 9.1 0 0 1-1.925-2.857A8.75 8.75 0 0 1 3 12.003q0-1.866.708-3.51a9.1 9.1 0 0 1 1.924-2.859 9.1 9.1 0 0 1 2.856-1.925A8.75 8.75 0 0 1 11.997 3q1.866 0 3.51.708a9.1 9.1 0 0 1 2.859 1.924 9.1 9.1 0 0 1 1.925 2.856A8.75 8.75 0 0 1 21 11.997a8.8 8.8 0 0 1-.709 3.51 9.1 9.1 0 0 1-1.922 2.859 9.1 9.1 0 0 1-2.857 1.925 8.8 8.8 0 0 1-3.509.709"></path></svg></div></div></div><div display="grid" class="sc-aXZVg hKDGUq"><div color="gray.darkness2" overflow="hidden" font-size="14px" class="sc-aXZVg kgLJUx">一般の方（角川ドワンゴ学園の生徒以外の方）</div></div><div display="none" opacity="0.15" width="100%" height="100%" class="sc-aXZVg uGiQG"></div></div></a></div></div></div>
    */
		// サムネイル画像を直下に持つ div(= sc-aXZVg jZJKMb)。ページ内に複数
		// あるカードのうち最初の 1 枚から取る
		// find: (p) => p.locator('a[href^="/courses/"] div:has(> img)').first(),
		// もし「登録済み」バッジ本体(sc-11in5kn-0 jTMKEj)を狙うならこちら:
		find: (p) => p.locator('div:has(> svg[type="course-added"])').first(),
	},
	homeCourseElement: {
		url: "https://www.nnn.ed.nico/genres/63",
		/*
    sc-aXZVg fYHoYN
    <div class="sc-aXZVg fYHoYN"><div class="sc-aXZVg brBOOs"><h3 style="height: auto; font-size: 24px;" class="sc-1h5ye17-0 ipaxCh"><span height="100%" class="sc-aXZVg gezlcN">【ZEN Studyの使い方】</span></h3></div><div display="grid" class="sc-aXZVg hZXhEc"><div class="sc-aXZVg hBUmIR"><a tabindex="0" href="/courses/2145"><div height="113px" overflow="hidden" class="sc-aXZVg sc-gEvEer huaUmY fteAEG"><div class="sc-aXZVg iOPUvz"><div class="sc-aXZVg jZJKMb"><img alt="" src="https://cdn.fccc.info/KYzg/soroban/1399dc806044e012c027fa4d77f1f77c/soroban-course-2145/142873d7.jpg#multi-media://fccc?default=jpg&amp;origin=https%3A%2F%2Fs3-ap-northeast-1.amazonaws.com%2Fsoroban-private%2Fmaterials%2Fpackages%2FNTHT%2FNTHTXZ%2FNTHTXZ_TH.jpg&amp;property%5Bgroup_key%5D=soroban-course-2145&amp;property%5Bjob_id%5D=1399dc806044e012c027fa4d77f1f77c" width="200px" class="sc-aXZVg hKZGWI"></div><div display="none" opacity="0.4" class="sc-aXZVg ifQEBe"></div><div class="sc-1fxx7t2-0 klvLaX"><div class="sc-11in5kn-0 jTMKEj"><div class="sc-11in5kn-1 gnDgdR"></div><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" type="course-added" width="20px" height="20px" color="#0077D3" aria-hidden="true" class="sc-11in5kn-2 jRHtef"><path fill="#0077D3" d="m10.562 14.492-2.497-2.496a.5.5 0 0 0-.344-.15.47.47 0 0 0-.363.15.5.5 0 0 0-.16.354q0 .194.16.354l2.638 2.638q.242.243.566.243.322 0 .565-.243l5.477-5.477a.5.5 0 0 0 .15-.344.47.47 0 0 0-.15-.363.5.5 0 0 0-.354-.16.5.5 0 0 0-.354.16zM12.003 21a8.8 8.8 0 0 1-3.51-.709 9.1 9.1 0 0 1-2.859-1.922 9.1 9.1 0 0 1-1.925-2.857A8.75 8.75 0 0 1 3 12.003q0-1.866.708-3.51a9.1 9.1 0 0 1 1.924-2.859 9.1 9.1 0 0 1 2.856-1.925A8.75 8.75 0 0 1 11.997 3q1.866 0 3.51.708a9.1 9.1 0 0 1 2.859 1.924 9.1 9.1 0 0 1 1.925 2.856A8.75 8.75 0 0 1 21 11.997a8.8 8.8 0 0 1-.709 3.51 9.1 9.1 0 0 1-1.922 2.859 9.1 9.1 0 0 1-2.857 1.925 8.8 8.8 0 0 1-3.509.709"></path></svg></div></div></div><div display="grid" class="sc-aXZVg hKDGUq"><div color="gray.darkness2" overflow="hidden" font-size="14px" class="sc-aXZVg kgLJUx">一般の方（角川ドワンゴ学園の生徒以外の方）</div></div><div display="none" opacity="0.15" width="100%" height="100%" class="sc-aXZVg uGiQG"></div></div></a></div></div></div>
    */
		// 共通ロケータをそのまま使う
		find: homeCourseSection,
		// もしカード本体(a 直下の sc-gEvEer huaUmY fteAEG)を狙うならこちら:
		// find: (p) => p.locator('a[href^="/courses/"] > div').first(),
	},
	homeCourseCount: {
		// sc-aXZVg gXtGFW
		// <div class="sc-aXZVg gXtGFW"><div class="sc-aXZVg dKubqp">全2科目</div></div>
		url: "https://www.nnn.ed.nico/genres/63",
		find: (p) =>
			p
				.getByText(/全\d+科目/)
				.locator("xpath=..")
				.first(),
	},
	homeCourseList: {
		/* <div class="sc-aXZVg GIIGO">
        <div class="sc-aXZVg fYHoYN">...</div>
        <div class="sc-aXZVg fYHoYN">...</div>
        <div class="sc-aXZVg fYHoYN">...</div>
      </div> */
		url: "https://www.nnn.ed.nico/genres/63",
		// 他の定義に依存する例: コースセクション(homeCourseElement と同じ
		// 共通ロケータ)の親 = セクション一覧のコンテナ
		find: (p) => homeCourseSection(p).locator("xpath=.."),
	},
	breadcrumbList: {
		url: "https://www.nnn.ed.nico/genres/63",
		// sc-1mr8gis-4 bolqeU
		// <ol class="sc-1mr8gis-4 bolqeU"><li class="sc-1mr8gis-0 kZYrPk"><a class="sc-1mr8gis-1 eCJxrg" href="/home"><i class="sc-x54faw-0 fsyZra sc-1mr8gis-7 itdTYV" type="home" aria-hidden="true"></i><span class="sc-1mr8gis-5 ehXNoQ">ホーム</span></a></li><li class="sc-1mr8gis
		find: (p) => breadcrumbItem(p).locator("xpath=.."),
	},
	breadcrumbItem: {
		url: "https://www.nnn.ed.nico/genres/63",
		// sc-1mr8gis-0 kZYrPk
		// <ol class="sc-1mr8gis-4 bolqeU"><li class="sc-1mr8gis-0 kZYrPk"><a class="sc-1mr8gis-1 eCJxrg" href="/home"><i class="sc-x54faw-0 fsyZra sc-1mr8gis-7 itdTYV" type="home" aria-hidden="true"></i><span class="sc-1mr8gis-5 ehXNoQ">ホーム</span></a></li><li class="sc-1mr8gis-0 kZYrPk"><h2 class="sc-1mr8gis-3 hhGGPk"><span class="sc-1mr8gis-5 ehXNoQ">【ZEN Studyの使い方】</span></h2></li></ol>
		// パンくず先頭の li = /home へのリンクを直下に持つ li
		find: breadcrumbItem,
	},
	courseHeader: {
		url: "https://www.nnn.ed.nico/courses/2145",
		// sc-1g1n70x-0 fHOtAw
		// <div class="sc-1cgtf4b-1 jRpeNL"><h3 class="sc-1g1n70x-0 fHOtAw">チャプター (9)<div style="display: inline-block;"><archive-indicator></archive-indicator></div></h3></div>
		// チャプター数はコースごとに変わるため前方一致の正規表現で探す
		find: (p) => p.getByRole("heading", { name: /^チャプター/ }).first(),
	},
	chapterHeader: {
		url: "https://www.nnn.ed.nico/courses/2145/chapters/27150",
		// sc-aXZVg gPvMWS
		// <div width="100%" class="sc-aXZVg sc-gEvEer eovZuA fteAEG"><div class="sc-aXZVg gPvMWS">教材</div></div>
		// 「教材」テキストを直接持つ要素(完全一致)
		find: (p) => p.getByText("教材", { exact: true }).first(),
	},
	chapterList: {
		url: "https://www.nnn.ed.nico/courses/2145",
		find: (p) => chapterListItem(p).locator("xpath=../../../ul[1]"),
	},
	chapterListItem: {
		url: "https://www.nnn.ed.nico/courses/2145",
		// <a sc-10digve-0 kjrMxR
		find: chapterListItem,
	},
	movieSectionHeader: {
		url: "https://www.nnn.ed.nico/contents/courses/2145/chapters/27150/movies/50587?content_type=n-yobi&se_volume=100",
		find: (p) => p.getByRole("heading", { name: "ZEN Studyについて" }).first(),
	},
	movieSectionVideo: {
		url: "https://www.nnn.ed.nico/contents/courses/2145/chapters/27150/movies/50587?content_type=n-yobi&se_volume=100",
		find: (p) => p.locator("video#video-player").first(),
	},
	movieSectionReference: {
		url: "https://www.nnn.ed.nico/contents/courses/2145/chapters/27150/movies/50587?content_type=n-yobi&se_volume=100",
		find: (p) => p.locator('iframe[aria-label="補助テキスト"]').first(),
	},
	exerciseSectionHeader: {
		url: "https://www.nnn.ed.nico/courses/960/chapters/12682/exercise/23197",
		find: (p) => p.getByRole("heading", { name: "【問題】マウス" }).first(),
	},
	sectionList: {
		url: "https://www.nnn.ed.nico/courses/960/chapters/12682/exercise/23197",
		// sc-aXZVg sc-gEvEer sc-1at0r9g-0 dKubqp fteAEG hFtzCB
		// <ul aria-label="課外教材リスト" class="sc-aXZVg sc-gEvEer sc-1at0r9g-0 dKubqp fteAEG hFtzCB"><li class="sc-aXZVg sc-gEvEer sc-4ejpa1-0 dKubqp fteAEG ilVuVk"><div class="sc-aXZVg sc-gEvEer hYNtMZ fteAEG sc-1otp79h-0 sc-15ar6v9-0 dPmAoN hcbKWQ">
		find: sectionList,
	},
	/**
	 * divにイベントが設定されているため、liではなくdivを返す。liはクリックしても反応しない。
	 */
	sectionListItem: {
		url: "https://www.nnn.ed.nico/courses/960/chapters/12682/exercise/23197",
		// sc-aXZVg sc-gEvEer hYNtMZ fteAEG sc-1otp79h-0 sc-15ar6v9-0 dPmAoN kNgKxU
		// <ul aria-label="課外教材リスト" class="sc-aXZVg sc-gEvEer sc-1at0r9g-0 dKubqp fteAEG hFtzCB"><li class="sc-aXZVg sc-gEvEer sc-4ejpa1-0 dKubqp fteAEG ilVuVk"><div class="sc-aXZVg sc-gEvEer hYNtMZ fteAEG sc-1otp79h-0 sc-15ar6v9-0 dPmAoN hcbKWQ">
		// 最初の項目から取る(現在位置の項目はハッシュが異なる可能性あり)
		find: (p) => sectionListItem(p).first(),
	},
	/**
	 * イベント設定されているdivの中に、コンテナのdivがある。
	 * 現在位置を示す青いボーダーが右についているdivを返す。
	 * この要素はクリックしても反応しない。
	 */
	sectionListItemCurrentIndicator: {
		url: "https://www.nnn.ed.nico/courses/960/chapters/12682/exercise/23197",
		// sc-aXZVg sc-gEvEer sc-1wngno8-10 sc-15ar6v9-1 dKubqp fteAEG ghmxKl
		// 現在表示中のセクション(このページでは「【問題】マウス」)の項目に
		// 絞り込み、その内側 1 つ目のコンテナ div を返す
		// <li class="sc-aXZVg sc-gEvEer sc-4ejpa1-0 dKubqp fteAEG ilVuVk"><div class="sc-aXZVg sc-gEvEer hYNtMZ fteAEG sc-1otp79h-0 sc-15ar6v9-0 dPmAoN hcbKWQ"><div class="sc-aXZVg sc-gEvEer sc-1wngno8-10 sc-15ar6v9-1 dKubqp fteAEG ghmxKl"><div class="sc-aXZVg sc-gEvEer sc-1wngno8-11 dKubqp fteAEG kzlEEr"><div class="sc-aXZVg sc-gEvEer jUNcNr fteAEG"><div width="40px" height="40px" class="sc-aXZVg ekWEKw"><svg viewBox="-1 -1 34 34" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><circle r="16" cx="16" cy="16" stroke-width="2" fill="none" stroke="#e9e9e9"></circle><circle r="16" cx="16" cy="16" stroke="#0077D3" stroke-width="2" stroke-linecap="butt" transform="rotate(-90 16 16)" stroke-dasharray="100" fill="none" stroke-dashoffset="93.5" class="sc-1k6tdum-0 eALPWZ"></circle></svg><div style="position: absolute; inset: 0px;" class="sc-aXZVg sc-gEvEer dZMTdN fteAEG"><div class="sc-4d51dh-0 gvkrAa"><div class="sc-4d51dh-1 cKFgTY"></div><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" type="res-movie" width="32px" height="32px" color="#b3b3b3" aria-hidden="true" class="sc-4d51dh-2 gvgjET"><path fill="#b3b3b3" fill-rule="evenodd" d="M12 0c6.628 0 12 5.372 12 12 0 6.627-5.372 12-12 12S0 18.627 0 12C0 5.372 5.372 0 12 0m-1.596 6.97C9.56 6.436 8.25 6.9 8.25 8.06v7.88c0 1.159 1.31 1.624 2.154 1.09l6.235-3.94a1.28 1.28 0 0 0 0-2.18z" clip-rule="evenodd"></path></svg></div></div></div></div><div class="sc-aXZVg sc-gEvEer sc-1wngno8-12 dKubqp fteAEG enQHPL"><div class="sc-aXZVg sc-gEvEer lgoOnT fteAEG"><span font-size="15px" width="100%" class="sc-aXZVg kcMtEY">ZEN Studyについて</span></div><div width="100%" class="sc-aXZVg elbZCm"></div></div></div><div class="sc-aXZVg sc-gEvEer fIiKFo fteAEG"><div class="sc-aXZVg dKubqp"><div font-size="12px" color="gray.darkness2" font-family="&quot;Menlo&quot;, &quot;Monaco&quot;, &quot;Consolas&quot;, &quot;Courier New&quot;, &quot;Courier&quot;, monospace" class="sc-aXZVg gkpjeS"> 7:23</div></div></div></div></div></li>
		find: (p) =>
			sectionListItem(p)
				.filter({ hasText: "【問題】マウス" })
				.first()
				.locator("xpath=./div[1]"),
	},
	nextChapterButton: {
		url: "https://www.nnn.ed.nico/courses/960/chapters/12682/exercise/23197",
		// sc-aXZVg bhKrcp sc-13j7nb-0 jTSQNP
		// アクセシブルネームが「次へ」と完全一致しないため role ではなく
		// テキスト包含で探す
		find: (p) => p.locator('button:has-text("次へ")').first(),
	},
	prevChapterButton: {
		url: "https://www.nnn.ed.nico/courses/960/chapters/12682/exercise/23197",
		// sc-aXZVg bhKrcp sc-13j7nb-0 jTSQNP
		// アクセシブルネームが「次へ」と完全一致しないため role ではなく
		// テキスト包含で探す
		find: (p) => p.locator('button:has-text("前へ")').first(),
	},
};
