// Boot order: loader → galaxy big-bang + hero wordmark → everything else wires itself on scroll.
(() => {
  UI.magnetic();
  UI.tilt();
  UI.nav();
  UI.counters();
  UI.film();
  UI.misc();
  UI.pauseOffscreen();
  Charts.init();
  onVisible($(".porta"), (el) => el.classList.add("in"), 0.4);
  UI.loader(() => {
    Galaxy.start();
    UI.wordmark();
    UI.reveals();
  });
})();
