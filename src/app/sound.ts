let ctx: AudioContext | null=null;
type MusicTheme='card'|'board'|'casino'|'fusion';
let music: {theme:MusicTheme;volume:number;muted:boolean}={theme:'card',volume:0,muted:true};
let musicTimer:ReturnType<typeof setInterval>|null=null;
let musicStep=0;
const phrases:Record<MusicTheme,readonly number[]>={
  card:[392,494,587,494,440,523,659,523],
  board:[262,330,392,330,294,349,440,349],
  casino:[220,330,392,330,247,370,440,370],
  fusion:[330,494,659,494,392,587,784,587]
};
function note(frequency:number,volume:number,duration:number,wave:'sine'|'triangle'|'square'='triangle'){
  if(!ctx||ctx.state!=='running'||volume<=0)return;
  const oscillator=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
  oscillator.type=wave;oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(0.0001,now);
  gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume),now+.014);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  oscillator.connect(gain).connect(ctx.destination);oscillator.start(now);oscillator.stop(now+duration+.01);
}
function ensureMusic(){
  if(musicTimer||!ctx||ctx.state!=='running'||music.muted||music.volume<=0)return;
  musicTimer=setInterval(()=>{
    if(document.hidden||!ctx||ctx.state!=='running'||music.muted||music.volume<=0)return;
    const phrase=phrases[music.theme],frequency=phrase[musicStep%phrase.length]!;
    note(frequency,music.volume*.018,.24);
    if(musicStep%4===0)note(frequency/2,music.volume*.012,.42,'sine');
    musicStep++;
  },290);
}
export function configureMusic(theme:MusicTheme,volume:number,muted:boolean){
  music={theme,volume,muted};
  if(muted||volume<=0){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}return;}
  ensureMusic();
}
/** Self-contained offline oscillators; instantiated only after a direct user interaction. */
export function playTone(volume:number, frequency=440, kind:'click'|'win'|'place'='click') {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume().then(ensureMusic).catch(()=>undefined);
    ensureMusic();
    if(volume<=0)return;
    const wave=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
    wave.type=kind==='win'?'triangle':'sine'; wave.frequency.setValueAtTime(frequency,now);
    if (kind==='win') wave.frequency.exponentialRampToValueAtTime(frequency*1.8,now+0.22);
    gain.gain.setValueAtTime(0.001,now); gain.gain.exponentialRampToValueAtTime(Math.max(0.002,volume*0.09),now+0.015);
    gain.gain.exponentialRampToValueAtTime(0.001,now+(kind==='win'?0.33:0.10));
    wave.connect(gain).connect(ctx.destination);wave.start(now);wave.stop(now+(kind==='win'?0.34:0.11));
  } catch { /* Accessibility and user agent audio policies can disable audio. */ }
}
export function playGameCue(volume:number,actionType:string,ended:boolean){
  if(volume<=0)return;
  try{
    ctx??=new AudioContext();if(ctx.state==='suspended')void ctx.resume().then(ensureMusic).catch(()=>undefined);ensureMusic();
    const sound=actionType==='roll'?330:actionType==='spin'?650:actionType==='draw'||actionType==='hit'?392:actionType==='play'?523:actionType==='move'?440:actionType==='stand'?294:587;
    note(sound,volume*.07,.16,actionType==='roll'||actionType==='spin'?'square':'triangle');
    if(ended){setTimeout(()=>{note(659,volume*.09,.22);note(880,volume*.08,.33);},150);}
  }catch{/* Audio may be unavailable in a restricted browser. */}
}
