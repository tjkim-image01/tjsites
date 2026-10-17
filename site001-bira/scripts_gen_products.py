"""tj002 조사 자료(DB 항목 json + Drive 이미지 목록) + 재고 시트(판매가)로 상품 md 를 만든다. 실행: python3 scripts_gen_products.py"""
import json, re
from pathlib import Path
OBJ = Path("/Users/jatu/app/tjkim2/project-obj/tj002")
SHEET = Path("/private/tmp/claude-501/-Users-jatu-app-tjkim2/dd5e8a6c-2abe-4c11-acf9-23cfc572c82d/scratchpad/leaflets.json")
OUT = Path("src/content/products"); OUT.mkdir(parents=True, exist_ok=True)
db = {x["code"]: x for x in json.loads((OBJ / "02_조사/01_원본자료/06_삐라_DB항목_20261015.json").read_text())}
sheet = {x["Item No."]: x for x in json.loads(SHEET.read_text())} if SHEET.exists() else {}
imgs = {}
for ln in (OBJ / "02_조사/01_원본자료/05_삐라_DB이미지목록_20261015.txt").read_text().splitlines():
    if ln.count("|") >= 5:
        code, n, *_ = ln.split("|"); imgs[code] = int(n)
have = sorted(Path("public/items").glob("*.jpg"))
files = {}
for f in have: files.setdefault(f.name.rsplit("_", 1)[0], []).append(f.name)

# 영상에 나온 삐라: 한글 제목 · 그룹 · 등장 편 · 대사
F = {
 "APKC210526397C": ("안전보장증서 (빨강 · 한국어)", "safe", ["S","D","long"], "태진: \"이거 들고 오면 안전 보장. 제일 많이 뿌린 종류예요.\" (D편)"),
 "APKC210526397D": ("안전보장증서 (파랑 · 중국어)", "safe", ["S","D","long"], "태진: \"빨간 건 한국어, 파란 건 중국어. 북한군 따로, 중공군 따로 만들었어요.\" (D편)"),
 "APAC230216031A": ("중공군이 미군에게 준 안전보장증 (영문)", "enemy", ["D"], "태진: \"반대쪽도 똑같이 만들었어요. 계급이나 국적에 상관없이 받아 준다.\" (D편)"),
 "APAC241013210": ("아버지는 어데 게세요? — 가족을 찾는 아이들", "home", ["S","E","long"], "태진: \"겁주는 게 아니라, 집 생각나게 하는 거. 아이들이 아버지를 찾는 그림.\" (E편)"),
 "APAC241013212": ("추석은 왔건마는 고향은 멀고멀다", "home", ["S","E","long"], "태진: \"보름달 밑에 혼자 앉은 군인.\" (E편)"),
 "APAC251106151A": ("중추절 달은 밝은데 나는 이국 땅에 (중국어)", "chinese", ["E"], "태진: \"중공군한텐 중국어로. 중추절 달은 유난히 밝은데, 나는 이국 땅에 있다.\" (E편)"),
 "APAC251106150D": ("그대들은 고양이 앞에 쥐 — 귀향증", "home", ["E"], "태진: \"살 길은 고향뿐이다. 만화로 그린 귀향증이에요.\" (E편)"),
 "APAC251106150B": ("나는 매국 멸족의 죄명을 쓰고 개죽음하기 싫다 — 귀향증", "home", ["E"], "같은 시리즈 귀향증. 뒷면에 '귀향증'이라고 찍혀 있다."),
 "APKC230619131": ("맥아더 포고 삐라 — 매일 밤 9시 950kc 방송", "etc", ["F","long"], "태진: \"매일 밤 아홉 시, 구백오십 킬로사이클로 맥아더 총사령부 방송을 들으시오. 라디오 광고예요.\" (F편)"),
 "APAC190103002B": ("극동사령부 분석표가 붙은 삐라 — 공산도배들은…", "analysis", ["F","long"], "태진: \"삐라 번호, 언어, 대상, 번역, 비고. 전부 타자로. 성적표예요.\" (F편)"),
 "APAC240608104": ("탈출! 유엔이 돌봐준다 — 중국어 양면 삐라 + 분석표", "analysis", ["F"], "태진: \"어떤 삐라가 잘 먹히는지 다 기록했어요.\" (F편)"),
 "APAC230216028": ("Oh! What a Beautiful Morning — 북한이 미군에게", "enemy", ["S","G","long"], "태진: \"아침 열한 시에 휘파람 불던 그 노래, 기억나지? 가족을 생각해라.\" (G편)"),
 "APAC230216029A": ("Use your head, soldier! — 머리를 붙여 두고 싶으면", "enemy", ["G","long"], "태진: \"유즈 유어 헤드, 솔저. 머리를 붙여 두고 싶으면.\" (G편)"),
 "APAC230216029B": ("Don't let your loved ones mourn for you", "enemy", ["S","G"], "태진: \"뒷면엔, 왜 여기 있느냐. 집에서 오천 마일 떨어져서.\" (G편)"),
 "APAC230216026": ("조선자유보 1945년 8월 4일 — 미군이 뿌린 한글 신문", "1945", ["I", "long2"],"태진: \"해방 열하루 전. 곧 끝난다, 라고 하늘에서 미리 알려 준 거죠.\" (I편)"),
 "APAC230216027": ("조선자유보 1945년 8월 4일 (2)", "1945", ["I"], "같은 날짜 조선자유보. 접힘과 얼룩이 있다."),
 "APAC230216025B": ("일본군 항복 삐라 1945 — The Bearer Has Ceased Resistance", "1945", ["I"], "태진: \"이걸 들고 나오면 해치지 않는다.\" (I편)"),
 "APAC230216025C": ("일본군 항복 삐라 1945 (2) — 日本降伏せり", "1945", ["I"], "같은 묶음의 두 번째 장."),
 "APAC241028216A": ("삐라 원화 (펜화) + 인쇄본 — 1952", "art", ["J"], "태진: \"인쇄된 삐라는 수십억 장인데, 원화는 한 장이에요.\" (J편)"),
 "APAC251106147B": ("평화를 가장한 공산당 비둘기 — 아이들만 남아 울고 있다", "ugly", ["K"], "태진: \"비둘기 몸에 낫이랑 망치가 숨어 있죠.\" (K편)"),
 "APAC251106147F": ("평화를 가장한 공산당 비둘기 — 800만 북한 동포", "ugly", ["K"], "같은 시리즈. 뒷면은 김일성 풍자."),
 "APAC251106148D": ("평화를 가장한 공산당 비둘기 — 김일성 죄악사", "ugly", ["K"], "같은 시리즈. 뒷면은 만화."),
 "APAC251106149B": ("Korea Winter 1950–51 — 지도 삐라 (중국어)", "chinese", ["L"], "태진: \"한국의 겨울, 지도 위에 영하 삼십 도.\" (L편)"),
 "APAC251106149C": ("겨울 추위를 못 견디겠다 — 아직 희망은 있다 (중국어)", "chinese", ["L"], "태진: \"추운 사람한테 추위 얘기를 했네.\" (L편)"),
 "APAC251106149F": ("여기 나오면 따뜻한 밥 — 혹한 삐라 (중국어)", "chinese", ["L"], "태진: \"여기 길이 있다, 이것도 같은 시리즈.\" (L편)"),
 "APAC251106149A": ("중국어 만화 삐라 (EUSAK 8619)", "chinese", ["L"], "겨울 시리즈와 함께 뿌린 만화 형식 삐라."),
 "APAC241013206": ("여지껏 공산당이 그대들에게 한 것이 무엇인가 + 분석표", "analysis", ["S"], "극동사령부 분석표가 스테이플러로 붙어 있다."),
 "APKC260215107": ("특보 — 유엔군총사령부 발행 1호 (1953)", "analysis", [], "미송환 포로를 위한 한국어 특보. 분석표 첨부."),
 # 시리즈2 (M~R) · 롱폼2 — 2026-10-17
 "APKC210526397E": ("공습예고 — 지금도 늦지 않습니다", "etc", ["M"], "태진: \"유엔군이 민간인한테 뿌린 삐라예요. 지금도 늦지 않습니다. 한시바삐 군사시설 근처에서 몸을 피하십시오.\" (M편)"),
 "APAC230216031C": ("정전 CEASE FIRE — 북한·중공군이 미군에게 (영문)", "enemy", ["M"], "태진: \"휴전 회담 하던 때예요. 죽고 싶지 않으면 휴전을 위해 싸워라.\" (M편)"),
 "APKC230301037E": ("1954년 분석표 — 살 수 있는 유일의 길은 귀순뿐이다", "analysis", ["M"], "태진: \"천구백오십사 년, 휴전 다음 해 미군 분석표.\" (M편)"),
 "APKC260527328": ("명령 · Life in the P.O.W. Camps — 포로수용소 사진 삐라", "enemy", ["N"], "태진: \"김일성, 펑더화이 이름으로. 투항하면 생명 보장, 물건 안 뺏고, 학대 안 하고, 다치면 치료.\" (N편)"),
 "APAC230216030B": ("Life in a POW Camp — 중공군이 뿌린 포로 생활 삐라", "enemy", ["N"], "태진: \"밥 먹는 사진, 치료받는 사진. 결국엔 집에 보내 준다.\" (N편)"),
 "APAC210916611": ("1956 미 하원 청문회 책자 — 포로들 사이의 공산주의 선전", "etc", ["N"], "태진: \"미국 의회가 포로들 사이의 공산주의 선전을 조사하는 청문회까지 열었어요.\" (N편)"),
 "APAC230119009B": ("A Soldier's Last Letter — 엄마에게 쓰다 만 편지", "enemy", ["O"], "태진: \"한국에서 죽은 아들이 엄마한테 쓰다 만 편지래요.\" (O편)"),
 "APAC230119009C": ("Remember This? · You Too Belong Back Home", "enemy", ["O"], "태진: \"당신도 집에 가야 할 사람이다.\" (O편)"),
 "APKC230619132B": ("살길을 찾아 투항하라 — 국군 대상 만화 삐라", "enemy", ["O"], "태진: \"국군한테 뿌린 만화 삐라. 말풍선이 하도 험해서 그대로는 못 읽어요.\" (O편)"),
 "APKC230619132A": ("국방군 장병들이여 — 국군 대상 삐라", "enemy", ["O"], "O편에 함께 나온 국군 대상 삐라."),
 "APAC251106151C": ("나는 이렇게 빠져나왔다 — 여섯 칸 만화 (중국어)", "chinese", ["P"], "태진: \"부대에서 빠져나와 유엔군 쪽으로 넘어온 이야기를 여섯 칸 만화로 그렸어요.\" (P편)"),
 "APAC251106149D": ("해 질 녘 집 그림 — 공산당이 이렇게 살게 두겠느냐 (중국어)", "chinese", ["P"], "태진: \"밭일 마치고 오니 아내가 맞고 아이가 웃는다.\" (P편)"),
 "APAC251106150C": ("공산당은 진실이 두렵다 — 불길 그림 (중국어)", "chinese", ["P"], "태진: \"공산당은 너희가 진실을 알까 두려워한다.\" (P편)"),
 "APAC251106148B": ("얘야, 돌아오너라 — 엄마 얼굴 (중국어)", "chinese", ["P"], "태진: \"이건 엄마 얼굴. 얘야, 돌아오너라.\" (P편)"),
 "APAC251106148F": ("오늘의 조선 — 死·生 지도와 영어 낙서 GOOD (HA HA)", "chinese", ["P"], "태진: \"받은 누군가가 장난을 친 거예요. 칠십 년 전 댓글이죠.\" (P편)"),
 "APAC190103002C": ("동방예의지국! 1953. 5. 25 + 분석표", "analysis", ["Q"], "태진: \"뒷면이 웃겨요. 효도가 다 뭐야, 일이나 해.\" (Q편)"),
 "APAC190103002F": ("한 시조 · 한 피 · 한 민족 — 태극기 삐라 + 분석표", "analysis", ["Q"], "태진: \"이건 한 시조, 한 피, 한 민족. 태극기 그림.\" (Q편)"),
 "APAC190103002D": ("오늘 중국의 참상을 보라 (중국어) + 분석표", "analysis", ["Q"], "태진: \"이건 중국어로, 오늘 중국의 참상을 보라. 다 분석표가 붙어 있어요.\" (Q편)"),
 "APAC190103002I": ("주간신보 「자유세계」 1953. 5. 20", "analysis", ["Q"], "태진: \"하늘에서 신문 배달을 한 거죠.\" (Q편)"),
 "APAC211070665B": ("日米休戦成立! — 1945 미군이 일본군에게", "1945", ["R", "long2"], "태진: \"일미 휴전 성립! 전투를 중지하라! 뒷면엔 제팔군 사령부.\" (R편)"),
 "APAC200330076": ("일본은 항복했다 — 1945 호주군 삐라", "1945", ["R"], "태진: \"뒤엔 일본어로, 일본은 항복했다, 전쟁은 끝났다, 평화가 왔다.\" (R편)"),
 "APKC190903128": ("기이조선전보실기 — 청일전쟁 니시키에 (3장 연결)", "poster", ["long2"], "태진: \"청일전쟁 때 일본에서 찍은 전쟁 판화, 니시키에. 세 장을 이어 붙인 그림이에요.\" (롱폼 2)"),
 "APAC170114003": ("Is Your Trip Necessary? — 1943 미국 포스터", "poster", ["long2"], "태진: \"그 여행 꼭 가야 합니까? 쓸데없는 여행은 전쟁을 방해한다.\" (롱폼 2)"),
 "APAC240926190": ("United We Are Strong — 1943 연합국 포스터", "poster", ["long2"], "태진: \"여기서 유나이티드 네이션스는 연합국이란 뜻이었어요.\" (롱폼 2)"),
 "APAC180604114": ("1960년대 북한 손그림 포스터 원화", "poster", ["long2"], "태진: \"인쇄가 아니라 붓으로 그린 거예요.\" (롱폼 2)"),
 "APAC200125042": ("1970년대 중국 체육 포스터", "poster", ["long2"], "태진: \"운동선수들이 행진하는데, 맨 앞 청년은 책을 읽고 있어요.\" (롱폼 2)"),
 "APKC260411283": ("1963 국제학생연맹(IUS) 포스터 — 두 개의 6·25", "poster", ["long2"], "태진: \"지도 위에 날짜가 두 개 있어요. 천구백오십 년 유월 이십오 일, 천구백육십삼 년 유월 이십오 일.\" (롱폼 2)"),
}
def group_of(code, t):
    tl = t.lower()
    if code in F: return F[code][1]
    if "safe conduct" in tl or "안전보장" in t: return "safe"
    if "analysis" in tl or "분석" in t or "classified" in tl: return "analysis"
    if "japan" in tl and ("1945" in t or "surrender" in tl or "wwii" in tl): return "1945"
    if "chinese" in tl or "중국어" in t or "중국삐라" in t: return "chinese"
    if "anti-korean" in tl or "anti-american" in tl or "surrender flyer" in tl or "north korea" in (db[code].get("maker") or "").lower(): return "enemy"
    if "poster" in tl: return "poster"
    return "etc"
def ko_title(t):
    t = re.sub(r"\s*\((Old|8\.3|86CE)[^)]*\)", "", t)
    t = re.sub(r"^(KOREAN WAR PROPAGANDA LEAFLETS?|한국전쟁삐라|삐라 및 분석자료|Poster[s]?|Postcard)\s*[:\-–(]*\s*", "", t, flags=re.I)
    t = re.sub(r"\s*-\s*한국전쟁 빠라/문서들.*$", "", t)
    t = re.sub(r"\s*\(?(Korean War (Chinese )?Propaganda Leaflet Classified|KOREAN WAR PROPOGANDA|Anti-Korean War|KOREAN ANTI-AMERICAN|Korean War Porpaganda).*$", "", t, flags=re.I)
    segs = [x.strip(" -:…") for x in re.split(r"\s+-\s+|\s*\(|\)|\s*:\s*", t) if x.strip(" -:…")]
    GEN = {"한국전쟁삐라", "삐라", "한국전쟁 삐라", "삐라 및 분석자료", "중국어삐라", "중국삐라", "중국어 삐라"}
    segs = [re.sub(r"^(중국어삐라|중국삐라|중국어 삐라)\s*-\s*", "", x) for x in segs]
    segs = [x for x in segs if x not in GEN and not re.fullmatch(r"\(?EUSAK[^)]*\)?|[A-Z]*-?\d{3,5}[A-Za-z-]*\)?", x)]
    ko = [x for x in segs if re.search(r"[가-힣]", x)]
    out = (ko[0] if ko else segs[0] if segs else t).strip()
    out = re.sub(r"\s*\.\.\.+\s*$", "", out)
    return out[:48]
GROUP_KO = {"safe": "안전보장증서", "home": "집 생각나게 하는 삐라", "enemy": "북한·중공군이 미군에게", "chinese": "중공군에게 보낸 중국어 삐라", "1945": "1945, 전쟁 전의 삐라", "art": "원화", "analysis": "분석표가 붙은 삐라", "ugly": "상대를 괴물로 그린 삐라", "poster": "선전 포스터", "etc": "그 밖의 삐라"}
index = []
for code, fl in files.items():
    d = db.get(code); s = sheet.get(code, {})
    if not d: continue
    t = d["title"] or ""
    feat = F.get(code)
    title = feat[0] if feat else ko_title(t)
    group = group_of(code, t)
    eps = feat[2] if feat else []
    price = s.get("판매가 (US$)")
    cond = (s.get("Condition") or "").strip()
    desc_ko = (d.get("desc_ko") or s.get("작품설명 (한글)") or "").strip()
    desc_en = (d.get("desc_orig") or "").strip()
    fm = {"code": code, "title": title, "title_en": t.replace('"', "'"), "year": d.get("year") or "", "maker": d.get("maker") or "", "size": d.get("size") or "", "qty": d.get("qty") or 1,
          "price_usd": price if isinstance(price, (int, float)) else "", "group": group, "episodes": eps, "featured": bool(feat), "images": fl, "condition": cond.replace('"', "'")}
    def v(x):
        if isinstance(x, list): return "[" + ", ".join(str(i) for i in x) + "]"
        if isinstance(x, bool): return "true" if x else "false"
        return json.dumps(x, ensure_ascii=False) if isinstance(x, str) else str(x)
    body = ["## 무슨 삐라인가", ""]
    body.append(desc_ko if desc_ko else (desc_en if desc_en else f"{GROUP_KO[group]} 묶음의 한 장. 티제이 김 컬렉션 소장 번호 {code}."))
    if desc_ko and desc_en: body += ["", "> " + desc_en.replace("\n", " ")[:600]]
    if feat and feat[3]: body += ["", "## 영상에서", "", "> " + feat[3]]
    if len(fl) > 1: body += ["", "## 사진", "", f"앞면·뒷면·첨부 문서 등 {len(fl)}장. 뒷면과 분석표도 꼭 확인하세요."]
    body += ["", "## 구매", "", "고가 1점물이라 실결제 없이 **구매 문의**로 진행합니다. 담당자가 가격·상태·배송을 안내합니다."]
    md = "---\n" + "\n".join(f"{k}: {v(x)}" for k, x in fm.items()) + "\n---\n\n" + "\n".join(body) + "\n"
    (OUT / f"{code}.md").write_text(md, encoding="utf-8")
    index.append((code, title, group, price, len(fl), bool(feat)))
import collections
print(len(index), "products;", collections.Counter(g for *_, g, _, _, _ in [(0,0,i[2],0,0,0) for i in index]))
print("featured", sum(1 for i in index if i[5]), "no price", sum(1 for i in index if not i[3]))
