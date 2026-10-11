/** Bound bytes while streaming, before JSON parsing or allocating the full body. */
export async function requestJson(request:Request,maximum=100_000):Promise<any>{
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new RequestError(415,'Send JSON data.');
 if(Number(request.headers.get('content-length'))>maximum)throw new RequestError(413,'Request too large.');
 const reader=request.body?.getReader();if(!reader)throw new RequestError(400,'Missing request body.');
 let size=0,text='';const decoder=new TextDecoder();
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw new RequestError(413,'Request too large.');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
  let data;try{data=JSON.parse(text);}catch{throw new RequestError(400,'Invalid JSON.');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new RequestError(400,'Expected a JSON object.');return data;
 }finally{reader.releaseLock();}
}
export class RequestError extends Error{status:number;retryAfter?:number;constructor(status:number,message:string,retryAfter?:number){super(message);this.status=status;this.retryAfter=retryAfter;}}
export function requestFailure(error:unknown){const known=error instanceof RequestError;return Response.json({error:known?error.message:'Request could not be completed.'},{status:known?error.status:503,headers:{'Cache-Control':'no-store',...(known&&error.retryAfter?{'Retry-After':String(error.retryAfter)}:{})}});}
/** Only the app's own messages reach players. TypeError, SyntaxError, DOMException and
 * database errors carry runtime details (the redirect TypeError reached the UI this way). */
export function publicMessage(error:unknown,fallback:string){
 if(!(error instanceof Error)||/^D1_|SQLITE_|Error: D1_/.test(error.message))return fallback;
 return error.constructor===Error||error instanceof RequestError||error.name==='HttpError'?error.message:fallback;
}
