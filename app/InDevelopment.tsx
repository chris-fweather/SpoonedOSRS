'use client';
import {useState} from 'react';
import {PublicHeader,CommunityChat} from './Community';
import './in-development.css';
export function InDevelopment({feature}:{feature:'Support'}) {
 const [error,setError]=useState('');
 return <div className="site"><PublicHeader page={feature.toLowerCase()} onError={setError}/><main className="community-page development-page">{error&&<p role="alert">{error}</p>}<section className="development-window"><div className="development-caption">SpoonedOSRS · {feature}</div><div className="development-message"><img src="/icons/community/support-coins.png" alt=""/><span className="kicker">Area under construction</span><h1>Coming soon</h1><h2>{feature} is not ready yet.</h2><p>The donation chest is closed for now.</p><a className="btn" href="/">Return home</a></div></section><CommunityChat/></main></div>;
}
