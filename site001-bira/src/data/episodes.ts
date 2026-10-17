// 영상 18편 — 파일·길이·등장 상품(코드)·큐(초 → 상품). 새 영상은 여기 한 줄.
export type Episode = {
  id: string; no: number; title: string; hook: string; file: string; cover: string; seconds: number; vertical: boolean;
  items: string[]; cues: [number, string][]; chapters?: [number, string][];
};

export const EPISODES: Episode[] = [
  { id: "S", no: 1, title: "삐라 주워서 공책 받아 봤어?", hook: "2007년까지 진짜 있었던 경찰 규칙", file: "01_tj002_shorts_v01.mp4", cover: "01_tj002_shorts_v01", seconds: 80, vertical: true,
    items: ["APAC241013210", "APKC210526397C", "APKC210526397D", "APAC230216031A", "APAC230216028", "APAC230216029B", "APAC241013212"],
    cues: [[1, "APAC241013210"], [26, "APKC210526397C"], [29, "APKC210526397D"], [34, "APAC230216028"], [42, "APAC230216029B"], [52, "APAC241013212"]] },
  { id: "D", no: 2, title: "안전보장증서 = 비행기표?", hook: "사령관 사인 든 '할인 쿠폰'", file: "02_tj002_shorts_D_v01.mp4", cover: "02_tj002_shorts_D_v01", seconds: 60, vertical: true,
    items: ["APKC210526397C", "APKC210526397D", "APAC230216031A"], cues: [[0, "APKC210526397C"], [13, "APKC210526397D"], [29, "APAC230216031A"]] },
  { id: "E", no: 3, title: "아버지는 어데 게세요?", hook: "겁주기 대신 집 생각나게 하는 삐라", file: "03_tj002_shorts_E_v01.mp4", cover: "03_tj002_shorts_E_v01", seconds: 60, vertical: true,
    items: ["APAC241013210", "APAC241013212", "APAC251106151A", "APAC251106150D"], cues: [[0, "APAC241013210"], [15, "APAC241013212"], [22, "APAC251106151A"], [40, "APAC251106150D"]] },
  { id: "F", no: 4, title: "맥아더가 삐라로 라디오 광고를", hook: "삐라마다 붙은 미군 '성적표'", file: "04_tj002_shorts_F_v01.mp4", cover: "04_tj002_shorts_F_v01", seconds: 49, vertical: true,
    items: ["APKC230619131", "APAC190103002B", "APAC240608104"], cues: [[0, "APKC230619131"], [24, "APAC190103002B"], [36, "APAC240608104"]] },
  { id: "G", no: 5, title: "북한이 미군에게 영어로 보낸 삐라", hook: "Oh! What a Beautiful Morning", file: "05_tj002_shorts_G_v01.mp4", cover: "05_tj002_shorts_G_v01", seconds: 60, vertical: true,
    items: ["APAC230216028", "APAC230216029A", "APAC230216029B"], cues: [[0, "APAC230216028"], [22, "APAC230216029A"], [33, "APAC230216029B"]] },
  { id: "H", no: 6, title: "풍선 삐라 70년", hook: "1955 백령도에서 2024 오물풍선까지", file: "06_tj002_shorts_H_v01.mp4", cover: "06_tj002_shorts_H_v01", seconds: 57, vertical: true,
    items: ["APAC241013212", "APAC230216026"], cues: [] },
  { id: "I", no: 7, title: "'삐라'는 무슨 말?", hook: "해방 11일 전, 하늘에서 떨어진 신문", file: "07_tj002_shorts_I_v01.mp4", cover: "07_tj002_shorts_I_v01", seconds: 54, vertical: true,
    items: ["APAC230216026", "APAC230216027", "APAC230216025B", "APAC230216025C"], cues: [[14, "APAC230216026"], [38, "APAC230216025B"]] },
  { id: "J", no: 8, title: "삐라를 손으로 그린 화가", hook: "인쇄본은 수십억 장, 원화는 한 장", file: "08_tj002_shorts_J_v01.mp4", cover: "08_tj002_shorts_J_v01", seconds: 50, vertical: true,
    items: ["APAC241028216A"], cues: [[0, "APAC241028216A"]] },
  { id: "K", no: 9, title: "평화를 가장한 비둘기", hook: "삐라의 두 얼굴", file: "09_tj002_shorts_K_v01.mp4", cover: "09_tj002_shorts_K_v01", seconds: 49, vertical: true,
    items: ["APAC251106147B", "APAC251106147F", "APAC251106148D", "APAC241013210"], cues: [[0, "APAC251106147B"], [17, "APAC251106147F"], [19, "APAC251106148D"]] },
  { id: "L", no: 10, title: "영하 30도, 추운 사람에게 추위 얘기", hook: "중공군에게 보낸 겨울 삐라", file: "10_tj002_shorts_L_v01.mp4", cover: "10_tj002_shorts_L_v01", seconds: 43, vertical: true,
    items: ["APAC251106149B", "APAC251106149C", "APAC251106149F", "APAC251106149A"], cues: [[0, "APAC251106149B"], [16, "APAC251106149C"], [26, "APAC251106149F"]] },
  { id: "long", no: 11, title: "삐라 주우면 공책 줬다 — 하늘에서 떨어진 종이 100년", hook: "롱폼 · 7파트 · 4분", file: "01_tj002_longform_v01.mp4", cover: "01_tj002_longform_v01", seconds: 244, vertical: false,
    items: ["APAC241013210", "APKC210526397C", "APKC210526397D", "APAC241013212", "APAC190103002B", "APAC230216029A", "APAC230216028", "APKC230619131"],
    cues: [[1, "APAC241013210"], [83, "APKC210526397C"], [86, "APKC210526397D"], [96, "APAC241013212"], [110, "APAC190103002B"], [127, "APAC230216029A"], [140, "APAC230216028"], [155, "APKC230619131"]],
    chapters: [[0, "삐라 주우면 공책 줬다"], [35, "종이 폭탄"], [83, "종이 한 장에 뭘 적었나"], [127, "반대편도 뿌렸다"], [164, "풍선, 그리고 공책"], [200, "멈췄다가, 다시"], [222, "하늘에서 떨어진 DM"]] },
  { id: "M", no: 12, title: "폭탄보다 먼저 온 종이", hook: "공습예고 · 정전 · 휴전 다음 해까지", file: "11_tj002_shorts_M_v01.mp4", cover: "11_tj002_shorts_M_v01", seconds: 60, vertical: true,
    items: ["APKC210526397E", "APAC230216031C", "APKC230301037E"], cues: [[0, "APKC210526397E"], [19, "APAC230216031C"], [37, "APKC230301037E"]] },
  { id: "N", no: 13, title: "포로수용소를 광고했다", hook: "탁구 시합 · 압록강 수영 — 그리고 진실", file: "12_tj002_shorts_N_v01.mp4", cover: "12_tj002_shorts_N_v01", seconds: 65, vertical: true,
    items: ["APKC260527328", "APAC230216030B", "APAC210916611"], cues: [[0, "APKC260527328"], [29, "APAC230216030B"], [45, "APAC210916611"]] },
  { id: "O", no: 14, title: "북쪽도 '집에 가라' — 엄마의 편지", hook: "A Soldier's Last Letter", file: "13_tj002_shorts_O_v01.mp4", cover: "13_tj002_shorts_O_v01", seconds: 61, vertical: true,
    items: ["APAC230119009B", "APAC230119009C", "APKC230619132B", "APKC230619132A"], cues: [[0, "APAC230119009B"], [25, "APAC230119009C"], [38, "APKC230619132B"], [47, "APKC230619132A"]] },
  { id: "P", no: 15, title: "중공군에게 보낸 만화책", hook: "나는 이렇게 빠져나왔다 · GOOD (HA HA)", file: "14_tj002_shorts_P_v01.mp4", cover: "14_tj002_shorts_P_v01", seconds: 59, vertical: true,
    items: ["APAC251106151C", "APAC251106149D", "APAC251106150C", "APAC251106148B", "APAC251106148F"], cues: [[0, "APAC251106151C"], [19, "APAC251106149D"], [28, "APAC251106150C"], [37, "APAC251106148B"], [46, "APAC251106148F"]] },
  { id: "Q", no: 16, title: "삐라 성적표 읽어 드립니다", hook: "극동사령부 분석표 · 동방예의지국", file: "15_tj002_shorts_Q_v01.mp4", cover: "15_tj002_shorts_Q_v01", seconds: 78, vertical: true,
    items: ["APAC190103002C", "APAC190103002F", "APAC190103002D", "APAC190103002I"], cues: [[0, "APAC190103002C"], [47, "APAC190103002D"], [47, "APAC190103002F"], [59, "APAC190103002I"]] },
  { id: "R", no: 17, title: "전쟁이 끝난 걸 종이로 알렸다", hook: "1945 일미휴전 성립 · 29년을 싸운 군인", file: "16_tj002_shorts_R_v01.mp4", cover: "16_tj002_shorts_R_v01", seconds: 61, vertical: true,
    items: ["APAC211070665B", "APAC200330076"], cues: [[0, "APAC211070665B"], [18, "APAC200330076"]] },
  { id: "long2", no: 18, title: "선전물 100년 — 종이로 마음을 움직이는 법", hook: "롱폼 2 · 판화에서 휴대폰까지", file: "02_tj002_longform2_v01.mp4", cover: "02_tj002_longform2_v02", seconds: 194, vertical: false,
    items: ["APKC190903128", "APAC170114003", "APAC240926190", "APAC211070665B", "APAC230216026", "APAC180604114", "APAC200125042", "APKC260411283"], cues: [[14, "APKC190903128"], [45, "APAC170114003"], [66, "APAC240926190"], [88, "APAC211070665B"], [103, "APAC230216026"], [131, "APAC180604114"], [140, "APAC200125042"], [152, "APKC260411283"]], chapters: [[0, "선전물 100년"], [14, "판화로 판 전쟁"], [45, "포스터, 생활을 바꾸다"], [88, "포스터가 날개를 달다"], [111, "똑똑해진 종이"], [131, "다시 벽으로"], [167, "지금은 손바닥 위에"]] },
];

export const episodeById = (id: string) => EPISODES.find((e) => e.id === id);
export const episodesOfItem = (code: string) => EPISODES.filter((e) => e.items.includes(code));
export const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
