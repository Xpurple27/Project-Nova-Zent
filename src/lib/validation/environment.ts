/** Vercel production builds must fail closed when required PUBLIC configuration is missing. */
export function assertProductionEnvironment(env:Record<string,string|undefined>){
 if(env.VERCEL_ENV!=='production')return;
 for(const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_HCAPTCHA_SITE_KEY'])if(!env[name]?.trim())throw Error('Missing production public configuration: '+name);
 const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL!);if(url.protocol!=='https:')throw Error('Supabase production URL must use HTTPS');
 if(!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.startsWith('sb_publishable_'))throw Error('Production browser requires a Supabase publishable key; never use a service key');
}
