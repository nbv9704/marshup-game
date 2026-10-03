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
      app.stage.addChild(new Graphics().roundRect(x+4,y+7,cellSize,cellSize,Math.max(9,cellSize*0.11))
        .fill({color:0x742b52,alpha:.56}));
      const frame=new Graphics().roundRect(x,y,cellSize,cellSize,Math.max(9,cellSize*0.11))
        .fill({color:won?0xffd365:(highContrast?0xffffff:0xffe7ba),alpha:1})
        .stroke({color:won?0xffffff:hint===i?0xffca41:0xfff9e7,width:won?6:hint===i?6:4,alpha:1});
      frame.eventMode=enabled && cells[i]===null?'static':'none';
      frame.cursor=enabled && cells[i]===null?'pointer':'default';
      frame.on('pointertap',()=>onCell(i));app.stage.addChild(frame);
      app.stage.addChild(new Graphics().roundRect(x+cellSize*.12,y+cellSize*.08,cellSize*.76,cellSize*.09,cellSize*.05)
        .fill({color:0xffffff,alpha:.36}));
      const m=cells[i];if (m) {
        const margin=cellSize*.27;
        const mark=new Graphics();
        if(m==='p1') {
          mark.moveTo(x+margin,y+margin).lineTo(x+cellSize-margin,y+cellSize-margin)
            .moveTo(x+cellSize-margin,y+margin).lineTo(x+margin,y+cellSize-margin)
            .stroke({width:Math.max(7,cellSize*.078),color:highContrast?0xc90035:0xe63658,cap:'round'});
        } else {
          mark.circle(x+cellSize/2,y+cellSize/2,(cellSize-2*margin)/2)
            .stroke({width:Math.max(7,cellSize*.078),color:highContrast?0x00689b:0x289bd3});
        }
        app.stage.addChild(mark);
      }
      if(hint===i && !m) app.stage.addChild(new Graphics().circle(x+cellSize/2,y+cellSize/2,8).fill(0xd84c7d));
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
