/**
 * id 요소가 위에 오도록 가장 가까운 스크롤 컨테이너(AppShell <main>)만 스크롤한다.
 * scrollIntoView 는 overflow:hidden 인 바깥 레이아웃까지 밀어 올려 헤더·사이드바가 가려지므로 쓰지 않는다.
 */
export function scrollToSection(id: string) {
  window.setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const container = el.closest('main');
    if (!container) return;
    const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    const gap = parseFloat(getComputedStyle(container).paddingTop) || 0;
    container.scrollTo({ top: Math.max(0, top - gap), behavior: 'smooth' });
  }, 0);
}
