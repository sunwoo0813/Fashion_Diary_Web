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
  { label: "Preview", href: "#preview" },
  { label: "Flow", href: "#capabilities" },
  { label: "Start", href: "#top" },
];

const CAPABILITY_ITEMS = [
  {
    icon: WardrobeIcon,
    title: "옷장 아카이브",
    copy: "아이템, 카테고리, 사이즈, 착용 횟수 기준으로 옷장을 빠르게 찾아보세요.",
  },
  {
    icon: DiaryIcon,
    title: "날짜별 다이어리",
    copy: "매일의 룩을 메모, 사진, 태그된 옷장 아이템과 함께 기록할 수 있습니다.",
  },
  {
    icon: StatsIcon,
    title: "착용 분석",
    copy: "실제로 자주 입는 옷을 확인하고 패턴을 돌아보며 스타일 루틴을 다듬어 보세요.",
  },
  {
    icon: DashboardIcon,
    title: "데일리 개요",
    copy: "날씨, 최근 룩, 옷장 활동을 한눈에 정리해 보여줍니다.",
  },
];

const FEATURE_ITEMS = [
  {
    title: "룩 전체를 맥락까지 기억하기",
    copy:
      "사진, 날씨, 태그한 아이템이 함께 저장되어 각 코디의 맥락을 그대로 남길 수 있습니다.",
  },
  {
    title: "자주 입는 아이템을 더 빨리 파악하기",
    copy:
      "착용 기록이 쌓이면 예전 기록을 일일이 뒤지지 않아도 자주 입는 기본템과 부족한 부분이 보입니다.",
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
  const headerPrimaryLabel = isAuthenticated ? "Dashboard" : "Sign Up";
  const headerSecondaryHref = isAuthenticated ? diaryHref : loginHref;
  const headerSecondaryLabel = isAuthenticated ? "Open Diary" : "Log In";
  const heroPrimaryHref = isAuthenticated ? dashboardHref : signupHref;
  const heroPrimaryLabel = isAuthenticated ? "오뭐입?으로 이동" : "기록 시작하기";
  const heroSecondaryHref = isAuthenticated ? diaryHref : "#preview";
  const heroSecondaryLabel = isAuthenticated ? "다이어리 열기" : "미리보기 보기";

  return (
    <div className="marketing-page">
      <div className="marketing-ambient" aria-hidden>
        <span className="marketing-beam marketing-beam-left" />
        <span className="marketing-beam marketing-beam-right" />
        <span className="marketing-grid-glow" />
      </div>

      <header
        className={`marketing-header${isScrolled ? " is-scrolled" : ""}${menuOpen ? " is-open" : ""}`}
      >
        <div className="marketing-nav-shell">
          <div className="marketing-nav-bar">
            <Link href="/" aria-label="LAYERED home" className="marketing-brand">
              <span className="marketing-brand-mark">LY</span>
              <span className="marketing-brand-copy">
                <strong>LAYERED</strong>
                <small>Daily Styling Log</small>
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
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>

          <div id="marketing-mobile-nav" className="marketing-mobile-panel">
            <nav className="marketing-mobile-links" aria-label="Mobile">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="marketing-mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
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
            <Link href="#features" className="marketing-announcement">
              <span className="marketing-announcement-label">개인 옷장 아카이브</span>
              <span className="marketing-announcement-divider" />
              <span className="marketing-announcement-text">코디, 날씨, 아이템을 한곳에 모아 기록하세요</span>
              <span className="marketing-announcement-icon">
                <ArrowRightIcon size={14} />
              </span>
            </Link>

            <h1>
              <span>오늘 입은 옷을</span>
              <span>선명하게</span>
              <span>기록하세요</span>
            </h1>
            <p>
              매일의 코디를 기록하고, 착용한 아이템을 연결하고, 그날의 날씨까지 함께 남겨보세요.
              매일 쓰기에는 간단하고, 나중에 다시 보기에는 충분히 유용합니다.
            </p>

            <div className="marketing-hero-actions">
              <Link href={heroPrimaryHref} className="solid-button marketing-hero-primary">
                {heroPrimaryLabel}
              </Link>
              <Link href={heroSecondaryHref} className="ghost-button marketing-hero-secondary">
                {heroSecondaryLabel}
              </Link>
            </div>

            <ul className="marketing-proof-list" aria-label="Core strengths">
              <li>날짜별 코디 저장</li>
              <li>옷장 아이템 태그 연동</li>
              <li>룩별 날씨 기록 보관</li>
            </ul>
          </div>

          <div id="preview" className="marketing-showcase">
            <article className="marketing-floating-card marketing-floating-card-top">
              <span className="marketing-floating-kicker">오늘의 메모</span>
              <strong>3월 7일 | 도심 레이어드, 약한 비</strong>
              <p>사진, 날씨, 아이템 태그를 하나의 다이어리 기록에 함께 저장합니다.</p>
            </article>

            <div className="marketing-device">
              <div className="marketing-device-topbar">
                <div className="marketing-device-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <div className="marketing-device-pills">
                  <span>다이어리 보기</span>
                  <span>옷장 연동</span>
                </div>
              </div>

              <div className="marketing-device-body">
                <section className="marketing-preview-primary">
                  <div className="marketing-preview-heading">
                    <p>3월 7일 다이어리</p>
                    <strong>한 번의 코디 기록에 사진, 날씨, 태그한 아이템을 함께 담습니다</strong>
                  </div>

                  <div className="marketing-outfit-stage">
                    <div className="marketing-stage-halo" aria-hidden />
                    <div className="marketing-shot-frame">
                      <div className="marketing-shot-photo" aria-hidden />
                      <div className="marketing-shot-meta">
                        <span>16C</span>
                        <span>약한 비</span>
                        <span>서울</span>
                      </div>
                    </div>

                    <div className="marketing-look-summary">
                      <p className="marketing-look-label">태그한 아이템</p>
                      <div className="marketing-look-tags">
                        <span>블랙 코트</span>
                        <span>아이보리 니트</span>
                        <span>와이드 데님</span>
                        <span>레더 로퍼</span>
                      </div>
                      <div className="marketing-look-note">
                        출근하기 편한 룩. 실내에서는 충분히 따뜻하고, 가벼운 비에도 잘 어울리는 레이어드.
                      </div>
                    </div>
                  </div>

                  <div className="marketing-stat-row">
                    <article>
                      <strong>73</strong>
                      <span>저장된 룩</span>
                    </article>
                    <article>
                      <strong>12</strong>
                      <span>관리 중인 핵심 기본템</span>
                    </article>
                  </div>
                </section>

                <aside className="marketing-preview-column">
                  <article className="marketing-preview-card">
                    <p className="marketing-preview-kicker">옷장 밸런스</p>
                    <ul className="marketing-progress-list">
                      <li>
                        <span>아우터</span>
                        <div>
                          <em style={{ width: "68%" }} />
                        </div>
                      </li>
                      <li>
                        <span>니트웨어</span>
                        <div>
                          <em style={{ width: "84%" }} />
                        </div>
                      </li>
                      <li>
                        <span>하의</span>
                        <div>
                          <em style={{ width: "72%" }} />
                        </div>
                      </li>
                    </ul>
                  </article>

                  <article className="marketing-preview-card">
                    <p className="marketing-preview-kicker">최근 기록</p>
                    <div className="marketing-preview-entry">
                      <span>3월 4일</span>
                      <strong>비 오는 날용 레이어드 룩과 로퍼 태그를 함께 저장</strong>
                    </div>
                    <div className="marketing-preview-entry">
                      <span>3월 2일</span>
                      <strong>오피스 니트 룩과 체감 온도 메모를 기록</strong>
                    </div>
                  </article>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="marketing-capability-section">
          <div className="marketing-section-heading">
            <p>기록 흐름</p>
            <h2>기록하고, 연결하고, 다시 돌아보는 간단한 루틴.</h2>
            <span>코디에서 시작해 아이템을 연결하고, 맥락이 남아 있는 상태로 나중에 다시 확인하세요.</span>
          </div>

          <div className="marketing-capability-grid">
            {CAPABILITY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="marketing-capability-card">
                  <div className="marketing-capability-icon">
                    <Icon size={18} />
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

        <section id="features" className="marketing-editorial-section" aria-label="주요 기능 소개">
          <article className="marketing-editorial-lead">
            <p className="marketing-feature-label">왜 도움이 될까요</p>
            <h2>옷장과 코디 기록을 더 가볍게 연결하는 방법.</h2>
            <p className="marketing-editorial-copy">
              옷장과 다이어리를 별개의 도구로 나누지 않고, 하나의 기록처럼 자연스럽게 이어지도록 구성했습니다.
            </p>
            <div className="marketing-editorial-panel">
              <div className="marketing-editorial-photo" aria-hidden />
              <div className="marketing-editorial-text">
                <span>하나의 기록</span>
                <strong>사진, 메모, 날씨, 태그한 아이템이 함께 남습니다.</strong>
              </div>
            </div>
          </article>

          <div className="marketing-feature-grid">
            {FEATURE_ITEMS.map((item) => (
              <article key={item.title} className="marketing-feature-card">
                <p className="marketing-feature-label">기능</p>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <Link href={heroPrimaryHref} className="marketing-feature-link">
                  <span>{isAuthenticated ? "워크스페이스 열기" : "아카이브 시작하기"}</span>
                  <ChevronRightSmallIcon />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
