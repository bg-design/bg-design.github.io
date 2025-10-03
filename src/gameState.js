export const GameState = {
  karma: 0,
  coins: 0,
  timeHours: 0,   // global hour counter used by roaming
  flags: {},

  applyOutcome({ karma = 0, coins = 0, time = 0 } = {}) {
    this.karma += karma;
    this.coins += coins;
    this.timeHours = Math.max(0, this.timeHours + time);
    updateHUD();
  },

  setFlag(key, val=true){ this.flags[key] = val; },
  getFlag(key){ return !!this.flags[key]; }
};

export function updateHUD(){
  document.getElementById('hud-karma').textContent = `Karma: ${GameState.karma}`;
  document.getElementById('hud-coins').textContent = `Coins: ${GameState.coins}`;
  document.getElementById('hud-time').textContent = `Time: ${GameState.timeHours}h`;
}

export function saveState() {
  localStorage.setItem('bm-sim-state', JSON.stringify(GameState));
}

export function loadState() {
  const raw = localStorage.getItem('bm-sim-state');
  if (!raw) return;
  const s = JSON.parse(raw);
  Object.assign(GameState, s);
  updateHUD();
}
