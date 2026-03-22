"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ArrowRightIcon,
  DashboardIcon,
  DiaryIcon,
  StatsIcon,
  WardrobeIcon,
} from "@/components/common/icons";

type MarketingLandingProps = {
  isAuthenticated: boolean;
  loginHref: string;
  signupHref: string;
  dashboardHref: string;
  diaryHref: string;
};

const NAV_ITEMS = [
  { label: "기능", href: "#features" },
  { label: "미리보기", href: "#preview" },
  { label: "시작", href: "#cta" },
];

const STEPS = [
  {
    num: "01",
    title: "내 옷장을 아카이브로 정리하기",
    copy: "가지고 있는 옷을 카테고리와 컬러, 브랜드 기준으로 정리해 두면 이후 기록과 추천이 더 정교해집니다.",
  },
  {
    num: "02",
    title: "매일 입은 룩을 가볍게 기록하기",
    copy: "사진, 날씨, 메모, 착용 아이템을 함께 남겨 두면 스타일 기록이 나중에도 다시 찾기 쉬워집니다.",
  },
  {
    num: "03",
    title: "추천과 통계로 더 자주 활용하기",
    copy: "실제 옷장과 착용 기록을 바탕으로 다음 코디를 더 빠르게 고르고, 자주 입는 조합도 분명하게 확인할 수 있습니다.",
  },
];

const CAPABILITY_ITEMS = [
  {
    icon: WardrobeIcon,
    title: "디지털 옷장",
    copy: "보유 아이템을 한곳에 모아두고 카테고리와 스타일 메모까지 함께 관리합니다.",
  },
  {
    icon: DiaryIcon,
    title: "코디 다이어리",
    copy: "매일 입은 룩을 사진과 함께 남겨 나만의 스타일 아카이브를 만듭니다.",
  },
  {
    icon: DashboardIcon,
    title: "AI 코디 추천",
    copy: "새 옷을 찾기보다 지금 가진 옷으로 만들 수 있는 조합을 먼저 제안합니다.",
  },
  {
    icon: StatsIcon,
    title: "착용 통계",
    copy: "많이 입는 옷과 거의 손이 가지 않는 옷을 한눈에 파악할 수 있습니다.",
  },
];

const FEATURE_ITEMS = [
  {
    tag: "실제 옷장 기반",
    title: "추천은 취향 이미지보다 내 옷장 데이터에서 시작됩니다",
    copy: "LAYERED는 저장한 영감 이미지보다 실제 보유 아이템과 착용 기록을 더 중요하게 다룹니다. 그래서 추천이 더 현실적입니다.",
  },
  {
    tag: "매일 쓰는 기록",
    title: "잘 입혔던 룩을 다음에도 다시 꺼내볼 수 있게 남깁니다",
    copy: "날씨와 일정, 기분에 따라 잘 맞았던 룩을 기록해 두면 비슷한 날에 훨씬 빠르게 결정할 수 있습니다.",
  },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

function ChevronRightSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden width="14" height="14">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function MarketingLanding({
  isAuthenticated,
  loginHref,
  signupHref,
  dashboardHref,
  diaryHref,
}: MarketingLandingProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 28);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const headerPrimaryHref = isAuthenticated ? dashboardHref : signupHref;
  const headerPrimaryLabel = isAuthenticated ? "대시보드로" : "무료로 시작";
  const headerSecondaryHref = isAuthenticated ? diaryHref : loginHref;
  const headerSecondaryLabel = isAuthenticated ? "다이어리 보기" : "로그인";
  const heroPrimaryHref = isAuthenticated ? dashboardHref : signupHref;
  const heroPrimaryLabel = isAuthenticated ? "LAYERED 열기" : "회원가입";
  const heroSecondaryHref = isAuthenticated ? diaryHref : "#preview";
  const heroSecondaryLabel = isAuthenticated ? "다이어리 열기" : "미리보기";

  return (
    <div className="marketing-page">
      <div className="marketing-ambient" aria-hidden>
        <span className="marketing-grid-glow" />
      </div>

      <header className={`marketing-header${isScrolled ? " is-scrolled" : ""}${menuOpen ? " is-open" : ""}`}>
        <div className="marketing-nav-shell">
          <div className="marketing-nav-bar">
            <Link href="/" aria-label="LAYERED home" className="marketing-brand">
              <span className="marketing-brand-mark">L</span>
              <span className="marketing-brand-copy">
                <strong>LAYERED</strong>
                <small>나의 옷장 아카이브</small>
              </span>
            </Link>

            <nav className="marketing-nav-links" aria-label="Primary">
              {NAV_ITEMS.map((item) => (
                <Link key={item.label} href={item.href} className="marketing-nav-link">
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="marketing-nav-actions">
              <Link href={headerSecondaryHref} className="ghost-button">
                {headerSecondaryLabel}
              </Link>
              <Link href={headerPrimaryHref} className="solid-button">
                {headerPrimaryLabel}
              </Link>
            </div>

            <button
              type="button"
              className="marketing-menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="marketing-mobile-nav"
              aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>

          <div id="marketing-mobile-nav" className="marketing-mobile-panel">
            <nav className="marketing-mobile-links" aria-label="Mobile">
              {NAV_ITEMS.map((item) => (
                <Link key={item.label} href={item.href} className="marketing-mobile-link" onClick={() => setMenuOpen(false)}>
                  <span>{item.label}</span>
                  <ChevronRightSmallIcon />
                </Link>
              ))}
            </nav>
            <div className="marketing-mobile-actions">
              <Link href={headerSecondaryHref} className="ghost-button" onClick={() => setMenuOpen(false)}>
                {headerSecondaryLabel}
              </Link>
              <Link href={headerPrimaryHref} className="solid-button" onClick={() => setMenuOpen(false)}>
                {headerPrimaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="marketing-main">
        <section id="top" className="marketing-hero">
          <div className="marketing-copy">
            <span className="marketing-badge">
              <span className="marketing-badge-dot" />
              디지털 옷장, 코디 다이어리, AI 추천을 한곳에서
            </span>

            <h1>
              <span>내 옷을 더 자주,</span>
              <span>더 분명하게 입는 법.</span>
            </h1>

            <p>
              LAYERED는 가지고 있는 옷을 정리하고, 매일의 코디를 기록하고, 실제 옷장 데이터를 바탕으로 다음 룩을 더 쉽게
              고를 수 있게 도와줍니다.
            </p>

            <div className="marketing-hero-actions">
              <Link href={heroPrimaryHref} className="solid-button marketing-hero-primary">
                {heroPrimaryLabel}
              </Link>
              <Link href={heroSecondaryHref} className="ghost-button marketing-hero-secondary">
                {heroSecondaryLabel}
              </Link>
            </div>

            <ul className="marketing-proof-list" aria-label="주요 기능">
              <li><CheckIcon /> 옷장 아카이브 정리</li>
              <li><CheckIcon /> 데일리 룩 기록</li>
              <li><CheckIcon /> AI 코디 아이디어</li>
              <li><CheckIcon /> 착용 빈도 확인</li>
            </ul>
          </div>

          <div id="preview" className="marketing-showcase">
            <div className="marketing-device">
              <div className="marketing-device-topbar">
                <div className="marketing-device-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <div className="marketing-device-pills">
                  <span>옷장</span>
                  <span>다이어리</span>
                  <span>인사이트</span>
                </div>
              </div>

              <div className="marketing-device-body">
                <section className="marketing-preview-primary">
                  <div className="marketing-preview-heading">
                    <p>오늘의 코디 기록</p>
                    <strong>잘 입혔던 룩을 다시 꺼내보기 쉽게 정리합니다</strong>
                  </div>

                  <div className="marketing-outfit-stage">
                    <div className="marketing-stage-halo" aria-hidden />
                    <div className="marketing-shot-frame">
                      <div className="marketing-shot-photo" aria-hidden>
                        <div className="marketing-shot-toolbar">
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="marketing-shot-model">
                          <div className="marketing-shot-head" />
                          <div className="marketing-shot-body" />
                          <div className="marketing-shot-leg marketing-shot-leg-left" />
                          <div className="marketing-shot-leg marketing-shot-leg-right" />
                        </div>
                        <div className="marketing-shot-rail">
                          <div className="marketing-shot-swatch marketing-shot-swatch-coat" />
                          <div className="marketing-shot-swatch marketing-shot-swatch-knit" />
                          <div className="marketing-shot-swatch marketing-shot-swatch-denim" />
                          <div className="marketing-shot-swatch marketing-shot-swatch-shoes" />
                        </div>
                      </div>
                      <div className="marketing-shot-meta">
                        <span>12°C</span>
                        <span>가벼운 비</span>
                        <span>출근 룩</span>
                      </div>
                    </div>

                    <div className="marketing-look-summary">
                      <p className="marketing-look-label">태그된 아이템</p>
                      <div className="marketing-look-tags">
                        <span>트렌치코트</span>
                        <span>아이보리 니트</span>
                        <span>와이드 데님</span>
                        <span>로퍼</span>
                      </div>
                      <div className="marketing-look-note">
                        출근에도 단정하고 이동할 때도 편한 조합. 다음 비슷한 날에 그대로 다시 참고하기 좋은 룩입니다.
                      </div>
                    </div>
                  </div>

                  <div className="marketing-stat-row">
                    <article>
                      <strong>128</strong>
                      <span>등록된 아이템</span>
                    </article>
                    <article>
                      <strong>73</strong>
                      <span>기록된 룩</span>
                    </article>
                    <article>
                      <strong>82%</strong>
                      <span>반복 활용 가능한 조합</span>
                    </article>
                  </div>
                </section>

                <aside className="marketing-preview-column">
                  <article className="marketing-preview-card">
                    <p className="marketing-preview-kicker">옷장 밸런스</p>
                    <div className="marketing-closet-grid" aria-hidden>
                      <span className="marketing-closet-tile marketing-closet-coat" />
                      <span className="marketing-closet-tile marketing-closet-knit" />
                      <span className="marketing-closet-tile marketing-closet-shirt" />
                      <span className="marketing-closet-tile marketing-closet-denim" />
                    </div>
                    <ul className="marketing-progress-list">
                      <li>
                        <span>아우터</span>
                        <div><em style={{ width: "68%" }} /></div>
                      </li>
                      <li>
                        <span>상의</span>
                        <div><em style={{ width: "84%" }} /></div>
                      </li>
                      <li>
                        <span>하의</span>
                        <div><em style={{ width: "72%" }} /></div>
                      </li>
                      <li>
                        <span>슈즈</span>
                        <div><em style={{ width: "46%" }} /></div>
                      </li>
                    </ul>
                  </article>

                  <article className="marketing-preview-card">
                    <p className="marketing-preview-kicker">AI 추천</p>
                    <div className="marketing-preview-entry">
                      <span>날씨 + 기록 기반</span>
                      <strong>같은 상의에 슬랙스를 매치하면 조금 더 단정한 출근 버전으로 확장할 수 있어요.</strong>
                    </div>
                    <div className="marketing-preview-entry">
                      <span>이번 달 자주 입은 조합</span>
                      <strong>아이보리 니트와 블랙 로퍼 조합이 가장 안정적으로 반복되고 있어요.</strong>
                    </div>
                  </article>

                  <article className="marketing-preview-card">
                    <p className="marketing-preview-kicker">최근 다이어리</p>
                    <div className="marketing-preview-entry">
                      <span>3월 18일</span>
                      <strong>네이비 블레이저, 화이트 티, 스트레이트 데님</strong>
                    </div>
                    <div className="marketing-preview-entry">
                      <span>3월 15일</span>
                      <strong>가디건, 플리츠 스커트, 앵클부츠</strong>
                    </div>
                    <div className="marketing-preview-entry">
                      <span>3월 12일</span>
                      <strong>비 오는 날 트렌치와 로퍼 조합</strong>
                    </div>
                  </article>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="marketing-steps-section">
          <div className="marketing-section-heading marketing-section-heading-center">
            <p className="marketing-section-kicker">사용 흐름</p>
            <h2>실제로 매일 쓰기 위해 설계된 옷장 시스템</h2>
            <span>지금 가진 옷부터 정리하고, 기록이 쌓일수록 추천과 통계가 더 유용해지는 구조입니다.</span>
          </div>

          <div className="marketing-steps">
            {STEPS.map((step) => (
              <article key={step.num} className="marketing-step-card">
                <span className="marketing-step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="capabilities" className="marketing-capability-section">
          <div className="marketing-section-heading">
            <p className="marketing-section-kicker">핵심 기능</p>
            <h2>옷장 관리부터 코디 추천까지 하나의 흐름으로 연결됩니다</h2>
            <span>보유 아이템, 코디 기록, 추천, 착용 통계가 따로 놀지 않고 서로를 더 정교하게 만드는 구조입니다.</span>
          </div>

          <div className="marketing-capability-grid">
            {CAPABILITY_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="marketing-capability-card">
                  <div className="marketing-capability-icon">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-editorial-section" aria-label="Why LAYERED">
          <article className="marketing-editorial-lead">
            <p className="marketing-feature-label">왜 LAYERED인가요</p>
            <h2>옷이 중심이 되도록, UI는 조금 더 조용하게</h2>
            <p className="marketing-editorial-copy">
              패션 앱은 화면보다 옷이 먼저 보여야 합니다. LAYERED는 과한 장식보다 실제 착용 기록과 옷장 활용도를 더 분명하게
              보여주는 데 집중합니다.
            </p>
            <div className="marketing-editorial-panel">
              <div className="marketing-editorial-photo" aria-hidden />
              <div className="marketing-editorial-text">
                <span>연결된 워크플로우</span>
                <strong>룩 하나를 기록하면 옷장 히스토리, 통계, 다음 추천까지 함께 더 좋아집니다.</strong>
              </div>
            </div>
          </article>

          <div className="marketing-feature-grid">
            {FEATURE_ITEMS.map((item) => (
              <article key={item.title} className="marketing-feature-card">
                <p className="marketing-feature-label">{item.tag}</p>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <Link href={heroPrimaryHref} className="marketing-feature-link">
                  <span>{isAuthenticated ? "앱 열기" : "내 옷장부터 시작하기"}</span>
                  <ChevronRightSmallIcon />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="cta" className="marketing-cta-section" aria-labelledby="cta-heading">
          <div className="marketing-cta-inner">
            <span className="marketing-badge marketing-badge-inverted">
              <span className="marketing-badge-dot" />
              무료로 시작하고 바로 기록할 수 있습니다
            </span>
            <h2 id="cta-heading">내 옷장을 매일 쓰는 시스템으로 바꿔보세요</h2>
            <p>옷을 정리하고, 잘 입혔던 룩을 남기고, 다음 코디를 더 빠르게 고를 수 있도록 LAYERED가 도와줍니다.</p>
            <div className="marketing-cta-actions">
              <Link href={heroPrimaryHref} className="solid-button marketing-cta-primary">
                {heroPrimaryLabel}
                <ArrowRightIcon size={16} />
              </Link>
              {!isAuthenticated && (
                <Link href={loginHref} className="ghost-button">
                  이미 계정이 있어요
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <div className="marketing-footer-inner">
          <div className="marketing-brand">
            <span className="marketing-brand-mark">L</span>
            <span className="marketing-brand-copy">
              <strong>LAYERED</strong>
              <small>나의 옷장 아카이브</small>
            </span>
          </div>
          <p className="marketing-footer-copy">가지고 있는 옷을 기록하고, 잘 입는 방식을 더 분명하게 남기세요.</p>
        </div>
      </footer>
    </div>
  );
}
