import fs from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(file){
  const buf = fs.readFileSync(file);
  if(buf[0]!==137||buf[1]!==80) throw new Error('not png');
  let pos=8, w=0,h=0,bit=0,color=0;
  const idat=[];
  while(pos<buf.length){
    const len=buf.readUInt32BE(pos); const type=buf.toString('ascii',pos+4,pos+8); const data=buf.slice(pos+8,pos+8+len);
    if(type==='IHDR'){ w=data.readUInt32BE(0); h=data.readUInt32BE(4); bit=data[8]; color=data[9]; }
    if(type==='IDAT') idat.push(data);
    pos += 12+len;
  }
  if(color!==2 || bit!==8) throw new Error('only RGB8 supported, got '+color+'/'+bit);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp=3, stride=w*bpp;
  const out=Buffer.alloc(w*h*3);
  let prev=Buffer.alloc(stride);
  for(let y=0;y<h;y++){
    const f=raw[y*(stride+1)]; const line=raw.slice(y*(stride+1)+1,(y+1)*(stride+1));
    const cur=Buffer.from(line);
    for(let x=0;x<stride;x++){
      const a=x>=bpp?cur[x-bpp]:0;
      const b=prev[x];
      const c=x>=bpp?prev[x-bpp]:0;
      let val=cur[x];
      if(f===1) val=(val+a)&0xFF;
      else if(f===2) val=(val+b)&0xFF;
      else if(f===3) val=(val+((a+b)>>1))&0xFF;
      else if(f===4){
        const p=a+b-c, pa=Math.abs(p-a), pb=Math.abs(p-b), pc=Math.abs(p-c);
        val=(val+(pa<=pb&&pa<=pc?a:(pb<=pc?b:c)))&0xFF;
      }
      cur[x]=val;
    }
    cur.copy(out,y*stride); prev=cur;
  }
  return {w,h,pixels:out};
}

function px(img,x,y){
  const i=(y*img.w+x)*3;
  return [img.pixels[i],img.pixels[i+1],img.pixels[i+2]];
}

function analyze(file){
  const img=decodePNG(file);
  const out=[];
  out.push(`== ${file}  ${img.w}x${img.h} ==`);
  // 背景采样（顶部边缘，避开卡片）
  const bg=px(img,15,120);
  out.push('背景(15,120) rgb='+bg.join(',')+' 浅色='+bg.every(v=>v>225));
  // 统计绿色像素（记录按钮 #0aa87a 附近）
  let green=0;
  for(let y=0;y<img.h;y+=2) for(let x=0;x<img.w;x+=2){
    const c=px(img,x,y);
    if(c[1]>140&&c[1]<200&&c[0]<70&&c[2]<150&&c[1]>c[0]+60&&c[1]>c[2]+20) green++;
  }
  out.push('绿色像素(步长2采样): '+green);
  // 统计蓝色像素（日历圆点 #0b8ed6）
  let blue=0;
  for(let y=0;y<img.h;y+=2) for(let x=0;x<img.w;x+=2){
    const c=px(img,x,y);
    if(c[2]>140&&c[1]>80&&c[1]<170&&c[0]<70&&c[2]>c[0]+80) blue++;
  }
  out.push('蓝色像素(步长2采样): '+blue);
  // 统计白色卡片像素
  let white=0;
  for(let y=0;y<img.h;y+=2) for(let x=0;x<img.w;x+=2){
    const c=px(img,x,y);
    if(c[0]>245&&c[1]>245&&c[2]>245) white++;
  }
  out.push('白色像素(步长2采样): '+white);
  return out.join('\n');
}

for(const f of ['1_home','2_record_sheet','3_detail']){
  console.log(analyze(`F:\\AI\\codex\\箱根驿传\\_qa\\${f}.png`));
}