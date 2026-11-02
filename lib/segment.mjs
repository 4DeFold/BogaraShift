// Experimental seed-based segmentation on rendered HLS RGB tiles (not scientific classification).
// Four-connected region growing; refuse open-ended or undersized regions instead of inventing a border.
export function segmentRgb({data,width,height}, sx, sy) {
 sx=Math.floor(sx);sy=Math.floor(sy);
 if(sx<0||sy<0||sx>=width||sy>=height)return {error:'no_data'};
 const at=(x,y)=>4*(y*width+x), seed=at(sx,sy);
 if(data[seed+3]<200)return {error:'no_data'};
 if(data[seed]>235&&data[seed+1]>235&&data[seed+2]>235)return {error:'uncertain'};
 const dist=(a,b)=>Math.sqrt((data[a]-data[b])**2+(data[a+1]-data[b+1])**2+(data[a+2]-data[b+2])**2);
 const seen=new Uint8Array(width*height),mask=new Uint8Array(width*height),queue=new Int32Array(width*height);
 let head=0,tail=0,edge=false,missing=false; const start=sy*width+sx;seen[start]=1;queue[tail++]=start;
 while(head<tail){
  const idx=queue[head++],x=idx%width,y=Math.floor(idx/width),p=4*idx;mask[idx]=1;
  if(x===0||y===0||x===width-1||y===height-1)edge=true;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const ni=ny*width+nx,q=4*ni;if(seen[ni])continue;if(data[q+3]<200){missing=true;continue;}if(dist(seed,q)<=38 && dist(p,q)<=24){seen[ni]=1;queue[tail++]=ni;}}
 }
 if(edge||missing||tail>width*height*.32||tail<6)return {error:'uncertain'};
 // Trace oriented pixel edges; keep the longest loop (holes are deliberately not interpreted).
 const edges=new Map();const add=(x1,y1,x2,y2)=>{const k=`${x1},${y1}`;if(!edges.has(k))edges.set(k,[]);edges.get(k).push([x2,y2]);};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[y*width+x]){
  if(y===0||!mask[(y-1)*width+x])add(x,y,x+1,y);
  if(x===width-1||!mask[y*width+x+1])add(x+1,y,x+1,y+1);
  if(y===height-1||!mask[(y+1)*width+x])add(x+1,y+1,x,y+1);
  if(x===0||!mask[y*width+x-1])add(x,y+1,x,y);
 }
 let best=[];
 while(edges.size){const first=edges.keys().next().value;let p=first.split(',').map(Number),loop=[p];let key=first,guard=0;
  while(edges.has(key)&&guard++<width*height*4){const list=edges.get(key);p=list.pop();if(!list.length)edges.delete(key);key=p.join(',');if(key===first)break;loop.push(p);}
  if(key===first&&loop.length>best.length)best=loop;
 }
 if(best.length<4)return {error:'uncertain'};
 // Remove collinear pixel-edge points while preserving the raster-derived outline.
 const polygon=best.filter((p,i)=>{const prev=best[(i+best.length-1)%best.length],next=best[(i+1)%best.length];return (p[0]-prev[0])*(next[1]-p[1])!==(p[1]-prev[1])*(next[0]-p[0]);});
 if(polygon.length<4||polygon.length>240)return {error:'uncertain'};
 return {polygon,pixels:tail};
}
