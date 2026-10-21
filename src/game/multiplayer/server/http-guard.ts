/** Bounded per-isolate accidental-spam protection; database CAS remains the correctness boundary. */
export class RequestBudget{
 private windows=new Map<string,{at:number;count:number}>();
 constructor(private limit=40,private windowMs=10000,private capacity=2048){}
 allow(key:string,now:number){let w=this.windows.get(key);if(!w||now-w.at>=this.windowMs){if(!w&&this.windows.size>=this.capacity){for(const[k,v]of this.windows)if(now-v.at>=this.windowMs)this.windows.delete(k);if(this.windows.size>=this.capacity)return false;}w={at:now,count:0};this.windows.set(key,w);}return ++w.count<=this.limit;}
}
/** Stop reading at 8KiB; Content-Length alone is not trustworthy. */
export async function limitedBody(request:Request,max=8192){const reader=request.body?.getReader();if(!reader)return '';const chunks:Uint8Array[]=[];let size=0;try{for(;;){const{value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('PAYLOAD_TOO_LARGE');}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}return new TextDecoder().decode(bytes);}
