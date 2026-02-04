// Theme toggle (light / dark / system)
(function(){
  const key='fd-theme';
  const html=document.documentElement;
  const btn=document.getElementById('themeBtn');
  function apply(v){ html.setAttribute('data-theme', v); }
  function cycle(){
    const cur=localStorage.getItem(key) || 'system';
    const nxt= cur==='system' ? 'dark' : cur==='dark' ? 'light' : 'system';
    localStorage.setItem(key, nxt); apply(nxt);
    btn.textContent = (nxt==='dark'?'?Œ™':nxt==='light'?'?€ï¸?':'?Œ—');
  }
  const init=localStorage.getItem(key) || 'system'; apply(init);
  if(btn){ btn.textContent = (init==='dark'?'?Œ™':init==='light'?'?€ï¸?':'?Œ—'); btn.onclick=cycle; }
})();
