declare const __SPOONED_RELEASE__: {version:string;channel:string;buildId:string;builtAt:string};

/** Deployment identity only: no configuration, credentials or private Git history. */
export async function GET(){
  return Response.json(__SPOONED_RELEASE__,{headers:{'Cache-Control':'no-store'}});
}
