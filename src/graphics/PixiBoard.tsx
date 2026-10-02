import { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import type { Cell } from '../games/triple-spark/rules';
interface Props {
  cells:readonly Cell[]; winningLine:readonly number[] | null; hint:number|null;
  enabled:boolean; onCell:(cell:number)=>void; reducedMotion:boolean; highContrast:boolean;
}
export function PixiBoard(props:Props) {
  const mount=useRef<HTMLDivElement>(null),appRef=useRef<Application|null>(null),last=useRef(props),drawRef=useRef<()=>void>(()=>{});
  const [fallback,setFallback]=useState(false);
  last.current=props;
  drawRef.current=()=> {
    const app=appRef.current,host=mount.current; if (!app || !host) return;
    app.stage.removeChildren().forEach(node=>node.destroy({children:true}));
    const {cells,winningLine,hint,enabled,onCell,highContrast}=last.current;
    const w=app.screen.width,h=app.screen.height,size=Math.max(1,Math.min(w-24,h-24,550)), gap=size*0.019,cellSize=(size-2*gap)/3;
    const ox=(w-size)/2,oy=(h-size)/2;
    for(let i=0;i<9;i++) {
      const x=ox+(i%3)*(cellSize+gap),y=oy+Math.floor(i/3)*(cellSize+gap);
      const won=Boolean(winningLine?.includes(i));
      const frame=new Graphics().roundRect(x,y,cellSize,cellSize,Math.max(9,cellSize*0.11))
        .fill({color:won?0x204e4b:(highContrast?0x15243e:0x19283c),alpha:1})
        .stroke({color:won?0x49e3cb:hint===i?0xffd07b:0x394d66,width:won?4:hint===i?3:1.5,alpha:1});
      frame.eventMode=enabled && cells[i]===null?'static':'none';
      frame.cursor=enabled && cells[i]===null?'pointer':'default';
      frame.on('pointertap',()=>onCell(i));app.stage.addChild(frame);
      const m=cells[i];if (m) {
        const margin=cellSize*.27;
        const mark=new Graphics();
        if(m==='p1') {
          mark.moveTo(x+margin,y+margin).lineTo(x+cellSize-margin,y+cellSize-margin)
            .moveTo(x+cellSize-margin,y+margin).lineTo(x+margin,y+cellSize-margin)
            .stroke({width:Math.max(6,cellSize*.065),color:highContrast?0x00ffe0:0x49e3cb,cap:'round'});
        } else {
          mark.circle(x+cellSize/2,y+cellSize/2,(cellSize-2*margin)/2)
            .stroke({width:Math.max(6,cellSize*.065),color:highContrast?0xffe67a:0xbf8cff});
        }
        app.stage.addChild(mark);
      }
      if(hint===i && !m) app.stage.addChild(new Graphics().circle(x+cellSize/2,y+cellSize/2,6).fill(0xffd07b));
    }
  };
  useEffect(()=>{
    const host=mount.current;if(!host)return;
    let disposed=false;const app=new Application();let observer:ResizeObserver|null=null;
    void app.init({resizeTo:host,antialias:true,resolution:Math.min(window.devicePixelRatio||1,2),autoDensity:true,
      backgroundAlpha:0,preference:'webgl'}).then(()=>{
      if(disposed){app.destroy(true);return;}
      appRef.current=app;host.appendChild(app.canvas);
      observer=new ResizeObserver(()=>requestAnimationFrame(()=>drawRef.current()));observer.observe(host);
      drawRef.current();
    }).catch(()=>{if(!disposed)setFallback(true);});
    return ()=>{disposed=true;observer?.disconnect();if(appRef.current===app)appRef.current=null;
      try{if(app.renderer)app.destroy(true,{children:true});}catch{/* init may still be pending */}};
  },[]);
  useEffect(()=>{drawRef.current();},[props.cells,props.winningLine,props.hint,props.enabled,props.highContrast,props.onCell]);
  return <div className="board-root">
    <div className="pixi-board" ref={mount} aria-hidden="true"/>
    <div className="sr-only" role="grid" aria-label="Triple Spark board">
      {props.cells.map((mark,i)=><button key={i} role="gridcell" disabled={!props.enabled || mark!==null}
        aria-label={`Cell ${i+1}: ${mark??'empty'}`} onClick={()=>props.onCell(i)}>{mark??'empty'}</button>)}
    </div>
    {fallback && <div className="board-dom-fallback" role="grid" aria-label="Triple Spark playable board">
      {props.cells.map((mark,i)=><button key={i} disabled={!props.enabled || mark!==null}
        className={props.winningLine?.includes(i)?'won':''} onClick={()=>props.onCell(i)}>{mark==='p1'?'✕':mark==='p2'?'◯':props.hint===i?'•':''}</button>)}
    </div>}
  </div>;
}
