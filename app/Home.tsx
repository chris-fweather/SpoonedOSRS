"use client";
import './home-polish.css';
import {useEffect} from 'react';
import {ArrowRight} from 'lucide-react';
import {CommunityChat, CommunityStatus, CommunityTotals, CollectorList, SupporterList, PublicHeader, useCommunity} from './Community';
import type {BoardRow} from '@/lib/flair';
import {PlayerSearch} from './SiteHeader';

export function Home() {
  const {rows, totals, error, setError, retry} = useCommunity();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('login') === 'failed') {setError('Discord login did not finish. Try again.'); params.delete('login'); history.replaceState(null, '', '/' + (params.size ? '?' + params : ''));}
  }, [setError]);
  return <div className="site"><PublicHeader page="home" onError={setError}/><main className="community-page home-page">
    <section className="home-discover"><div className="home-search-area"><span className="kicker">The collector’s journal</span><div className="home-title-mascot"><img src="/brand/rocky-mascot.webp" alt="Rocky, the SpoonedOSRS mascot"/><h1>Find your fellow collectors.</h1></div><p>Pets, drops and achievements. Look up a player to explore their collection and see what they’re hunting next.</p><PlayerSearch/></div><aside className="home-start"><img src="/brand/rocky-mascot.webp" alt="Rocky"/><h2>Make it your journal</h2><ol><li><span>1</span> Sign in with Discord</li><li><span>2</span> Link your RuneScape name</li><li><span>3</span> Sync and show your collection</li></ol><a className="btn" href="/player/Obifloat">Explore a profile <ArrowRight size={15}/></a><small>Use the account menu above to get started.</small></aside></section>
    <CommunityStatus rows={rows} error={error} retry={retry}/><CommunityTotals rows={rows} totals={totals}/>
    <HomeBoards rows={rows}/>
    <CommunityChat/>
  </main></div>;
}

export function HomeBoards({rows}:{rows:BoardRow[]|null}) {return <div className="community-columns"><section className="community-panel"><div className="section-heading"><div><h2><img src="/brand/rocky-mascot.webp" alt=""/> Pet collectors</h2><p>Meet the players building their menageries.</p></div><a className="link" href="/leaderboard">Leaderboard <ArrowRight size={15}/></a></div>{rows && <CollectorList rows={rows} limit={25} pageSize={5}/>}</section><section className="community-panel supporters"><div className="section-heading"><div><h2><img src="/icons/community/supporters-heart.png" alt=""/> <a href="/support">Our supporters</a></h2><p>The people helping SpoonedOSRS grow.</p></div><a className="link" href="/leaderboard?view=supporters">Leaderboard <ArrowRight size={15}/></a></div>{rows&&<SupporterList rows={rows} limit={25}/>}</section></div>;}
