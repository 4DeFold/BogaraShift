'use client';
import {useEffect,useState} from 'react';
import {findLatestHls} from '../../lib/imagery.mjs';
export async function probeHlsTile(url,{px,py},signal){
 const combined=AbortSignal.any([signal,AbortSignal.timeout(8000)]),response=await fetch(url,{signal:combined,mode:'cors'});
 // A GIBS day may not exist yet. Treat a 404 as no tile, but fail closed on network/other errors.
 if(response.status===404)return false;if(!response.ok)throw Error('Tile unavailable');
 const bitmap=await createImageBitmap(await response.blob());try{const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,px,py,1,1,0,0,1,1);return ctx.getImageData(0,0,1,1).data[3]>0;}finally{bitmap.close();}
}
export default function useLatestHls(position){
 const [state,setState]=useState({status:'loading'});
 useEffect(()=>{if(!position)return;const controller=new AbortController();setState({status:'loading'});const timer=setTimeout(async()=>{try{
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(90000)]);const candidate=await findLatestHls(position.lat,position.lon,{signal,probe:probeHlsTile});if(!controller.signal.aborted)setState(candidate?{status:'ready',...candidate}:{status:'empty'});
 }catch{if(!controller.signal.aborted)setState({status:'error'});}},400);return()=>{clearTimeout(timer);controller.abort();};},[position?.lat,position?.lon]);
 return state;
}
