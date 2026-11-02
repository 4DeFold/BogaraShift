// Reject degenerate or self-crossing user-drawn outlines; this does not validate land ownership.
export function validPolygon(points){
 if(!Array.isArray(points)||points.length<3||points.length>500||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))return false;
 const n=points.length;let area=0;
 for(let i=0;i<n;i++){const a=points[i],b=points[(i+1)%n];if(a[0]===b[0]&&a[1]===b[1])return false;area+=a[0]*b[1]-b[0]*a[1];}
 if(Math.abs(area)<1e-10)return false;
 const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const between=(a,b,c)=>c[0]>=Math.min(a[0],b[0])-1e-12&&c[0]<=Math.max(a[0],b[0])+1e-12&&c[1]>=Math.min(a[1],b[1])-1e-12&&c[1]<=Math.max(a[1],b[1])+1e-12;
 const intersects=(a,b,c,d)=>{const x=orient(a,b,c),y=orient(a,b,d),z=orient(c,d,a),w=orient(c,d,b);return (x*y<0&&z*w<0)||Math.abs(x)<1e-14&&between(a,b,c)||Math.abs(y)<1e-14&&between(a,b,d)||Math.abs(z)<1e-14&&between(c,d,a)||Math.abs(w)<1e-14&&between(c,d,b);};
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(j===i+1||(i===0&&j===n-1))continue;if(intersects(points[i],points[(i+1)%n],points[j],points[(j+1)%n]))return false;}
 return true;
}
