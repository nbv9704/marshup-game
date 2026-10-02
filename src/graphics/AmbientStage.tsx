import { useEffect, useRef } from 'react';
import { Application, Graphics } from 'pixi.js';
/** Light shared Pixi renderer decorating the lobby. Falls back to CSS on machines
 * with WebGL disabled; signal hydration after the renderer attempt. */
export function AmbientStage({onReady,reducedMotion}:{onReady:()=>void;reducedMotion:boolean}) {
  const div=useRef<HTMLDivElement>(null), callback=useRef(onReady); callback.current=onReady;
  useEffect(()=>{
    const host=div.current; if(!host){callback.current();return;}
    let destroyed=false,frame=0;const app=new Application();
    void app.init({resizeTo:host,backgroundAlpha:0,antialias:false,preference:'webgl'}).then(()=>{
      if(destroyed){app.destroy(true);return;}
      host.appendChild(app.canvas);
      const dots=Array.from({length:23},(_,i)=>{
        const p=new Graphics().circle(0,0,i%4===0?3:1.4).fill({color:i%3?0x49e3cb:0xbf8cff,alpha:0.45});
        app.stage.addChild(p);return p;
      });
      app.ticker.add(tick=>{
        if(reducedMotion)return;
        frame+=tick.deltaTime;
        dots.forEach((p,i)=>{
          p.x=(i*94+37+Math.sin((frame+i*9)*0.005)*14)%Math.max(1,app.screen.width);
          p.y=(i*47+frame*(0.19+i%3*.12))%Math.max(1,app.screen.height);
        });
      });
      callback.current();
    }).catch(()=>{if(!destroyed)callback.current();});
    return ()=>{destroyed=true;try{if(app.renderer)app.destroy(true,{children:true});}catch{/* async setup */}};
  },[reducedMotion]);
  return <div ref={div} className="ambient" aria-hidden="true"/>;
}
