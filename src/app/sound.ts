let ctx: AudioContext | null=null;
/** Self-contained offline oscillators; instantiated only after a direct user interaction. */
export function playTone(volume:number, frequency=440, kind:'click'|'win'|'place'='click') {
  if (volume <= 0) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const wave=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
    wave.type=kind==='win'?'triangle':'sine'; wave.frequency.setValueAtTime(frequency,now);
    if (kind==='win') wave.frequency.exponentialRampToValueAtTime(frequency*1.8,now+0.22);
    gain.gain.setValueAtTime(0.001,now); gain.gain.exponentialRampToValueAtTime(Math.max(0.002,volume*0.09),now+0.015);
    gain.gain.exponentialRampToValueAtTime(0.001,now+(kind==='win'?0.33:0.10));
    wave.connect(gain).connect(ctx.destination);wave.start(now);wave.stop(now+(kind==='win'?0.34:0.11));
  } catch { /* Accessibility and user agent audio policies can disable audio. */ }
}
