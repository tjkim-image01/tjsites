import { Link } from "react-router-dom";
import { PRODUCTS } from "../lib/products";
import { Bubble, Char, Sfx } from "../components/Chars";

export default function AboutPage() {
  return (
    <section className="stage mint band">
      <div className="wrap narrow about">
        <h1 className="h2">이 가게는</h1>
        <p className="lead">티제이 김 컬렉션의 한국전쟁 삐라 {PRODUCTS.length}점을, 두 사람의 영상으로 소개하고 파는 곳입니다. 1945년 조선자유보부터 1953년 유엔군 특보까지, 하늘에서 떨어진 종이들입니다.</p>
        <div className="about-chars">
          <div className="about-char"><Char who="태진" pose="BASE" h={320} /><Bubble who="태진" tail="bottom"><b>태진</b> · 수집가. 삐라를 꺼내 보여 주고 뒷면 분석표를 읽어 줍니다.</Bubble></div>
          <div className="about-char"><Char who="옥자" pose="LAUGH" h={320} flip /><Bubble who="옥자" tail="bottom"><b>옥자 이모</b> · 국민학교 때 삐라 주워 파출소에서 공책 받은 세대. 다 자기 얘기라고 합니다.</Bubble></div>
        </div>
        <h2 className="h3"><Sfx text="숫자" size={24} rot={-5} /> 몇 가지</h2>
        <ul className="facts">
          <li><b>25억~40억 장</b> 한국전쟁 3년 동안 유엔군이 뿌린 삐라 (뉴스타파 추산)</li>
          <li><b>22,500장</b> 500파운드 폭탄 탄피 하나에 들어간 삐라</li>
          <li><b>2007년</b> 아이들이 삐라를 신고하면 공책·연필을 주던 경찰 규칙이 없어진 해</li>
          <li><b>1955년</b> 백령도에서 미국이 풍선 4,000개로 살포 실험을 한 해</li>
        </ul>
        <h2 className="h3">구매 방법</h2>
        <p>고가 1점물이라 실결제 없이 <Link to="/cart">담은 것</Link> → <b>구매 문의</b>로 진행합니다. 담당자가 가격·상태·배송(국내·해외)을 안내합니다. 표시 가격은 참고용이며 상태에 따라 달라질 수 있습니다.</p>
        <h2 className="h3">출처</h2>
        <p className="small">뉴스타파 「끝나지 않은 전쟁-삐라 심리전」(2020-07-27) · 한국일보 「남북 삐라 70년 변천사」(2020-06-07) · RFA 「6.25 특집 ② 삐라」(2009-06-24) · 위키백과 · 티제이 김 컬렉션 실물과 재고 기록. 영상은 Remotion으로 코드로 그렸고 캐릭터는 생성 이미지입니다.</p>
      </div>
    </section>
  );
}
