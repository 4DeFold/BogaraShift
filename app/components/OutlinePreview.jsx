import {geometryForCell} from '../../lib/geometry.mjs';
import {cropColor} from '../../lib/dashboard.mjs';
export default function OutlinePreview({field,t}){
 const g=geometryForCell(field.cell),polys=g?(g.type==='Polygon'?[g.coordinates]:g.coordinates):[],points=polys.flatMap(p=>p.flat());
 let paths=[];
 if(points.length){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),span=Math.max(maxX-minX,maxY-minY)||1;paths=polys.map(poly=>poly.map(ring=>ring.map(([x,y],i)=>`${i?'L':'M'}${(50+(x-(minX+maxX)/2)*80/span).toFixed(2)},${(50-(y-(minY+maxY)/2)*80/span).toFixed(2)}`).join(' ')+' Z').join(' '));}
 return <div className="outline-preview"><svg viewBox="0 0 100 100" role="img" aria-label={t.scheme}>{paths.map((d,i)=><path key={i} d={d} fill={cropColor(field.displayCrop)} fillRule="evenodd" fillOpacity=".35" stroke={cropColor(field.displayCrop)} strokeWidth="1.2" vectorEffect="non-scaling-stroke"/>)}</svg><span>{t.scheme}</span></div>;
}
