import type {CharacterClass} from '../core/types';
import type {StoryId} from './definitions';
/** Clock-seekable staging. It cannot advance story, change controls or start encounters. */
export function cinematicFrame(id:StoryId,elapsed:number){
 const t=Math.max(0,elapsed),opening=id==='opening',entrance=id==='boss-entrance',ending=id==='ending';
 const introduction:CharacterClass|undefined=opening?t>=34000?'HEALER':t>=28000?'THIEF':t>=22000?'MAGE':t>=16000?'WARRIOR':undefined:undefined;
 const shot=opening?t<16000?'PLAZA':'PARTY':entrance?'GUARDIAN':ending?'CLUE':'PATH';
 return {shot,camera:{x:opening?t<16000?560:510:entrance||ending?840:650,y:opening?370:380},introduction,abduction:opening?Math.min(1,Math.max(0,(t-8000)/7000)):0,corruption:opening&&t>=8000?1:0,bossReveal:ending?Math.max(0,1-t/2000):entrance?Math.min(1,Math.max(0,(t-4200)/2000)):0,
  caption:opening?t<8000?'Ember Village · Delapan segel menahan Abyss':t<16000?'Segel retak · penjaga formula dibawa ke Ancient Ruins':t<41000?'Empat disiplin Arcane Formula · satu misi penyelamatan':'Ikuti jejak rune ke timur · selamatkan penjaga dan pulihkan segel':entrance?'Ancient Ruins · penjaga kuno telah dikuasai Abyss':ending?t<8000?'Segel pertama kembali stabil · tujuh tanda masih menyala':'Ancaman sesungguhnya belum terungkap':id==='encounter-1'?'Jejak penculik terhalang Shadow Hound':'Corruption mengalir dari rune milik Shaman'};
}
