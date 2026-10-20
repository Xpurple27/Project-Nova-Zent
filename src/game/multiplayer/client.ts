
import { browserSupabase } from "../../lib/supabase/browser";
import { CLASSES, GAME_STATES, type RoomState } from "../core/types";
export type LobbyCommand = "CREATE"|"JOIN"|"GET"|"HEARTBEAT"|"SELECT_CLASS"|"SET_READY"|"START"|"LEAVE"|"REMOVE_INACTIVE";
export const normalizeRoomCode=(s:string)=>s.trim().toUpperCase();
export const validRoomCode=(s:string)=>/^[A-HJ-NP-Z2-9]{7}$/.test(normalizeRoomCode(s));
export function parseRoom(value:unknown):RoomState {
 if(!value||typeof value!=="object")throw new Error("INVALID_ROOM_RESPONSE");
 const r=value as RoomState;
 if(typeof r.id!=="string"||typeof r.sessionId!=="string"||!/^\d+$/.test(r.version)||!GAME_STATES.includes(r.state)||!Array.isArray(r.players)||r.players.length>4)throw new Error("INVALID_ROOM_RESPONSE");
 for(const p of r.players)if(typeof p.id!=="string"||typeof p.userId!=="string"||typeof p.nickname!=="string"||(p.classId!==null&&!CLASSES.includes(p.classId)))throw new Error("INVALID_ROOM_RESPONSE");
 return r;
}
export async function lobbyCommand(command:LobbyCommand,payload:Record<string,unknown>,requestId=crypto.randomUUID()):Promise<RoomState>{
 const args={p_command:command,p_payload:payload,p_request_id:requestId};
 // Retry transport failures with the SAME idempotency key, never a second logical command.
 let response=await browserSupabase().rpc("nz_lobby_v1",args);
 if(response.error&&(response.status===0||response.status>=500))response=await browserSupabase().rpc("nz_lobby_v1",args);
 if(response.error)throw new Error(response.error.message);
 return parseRoom(response.data);
}
export function lobbyError(error:unknown):string{
 const message=error instanceof Error?error.message:String(error);
 const known:Record<string,string>={
  SUPABASE_NOT_CONFIGURED:"Isi environment Supabase sesuai .env.example.",
  ROOM_NOT_FOUND:"Kode room tidak ditemukan.",ROOM_FULL:"Room sudah berisi empat pemain.",
  ROOM_EXPIRED:"Room sudah kedaluwarsa.",CLASS_TAKEN:"Class itu baru saja dipilih pemain lain.",
  CLASS_OR_SEAT_TAKEN:"Slot atau class sudah terpakai. State room diperbarui.",
  CLASS_REQUIRED:"Pilih class sebelum Ready.",NOT_COORDINATOR:"Hanya coordinator yang dapat memulai.",
  NOT_READY:"Semua anggota harus aktif, memilih class, dan Ready.",
  RUN_ALREADY_STARTED:"Room sudah dimulai. Pemain baru tidak dapat bergabung.",
  NOT_A_MEMBER:"Identitas ini bukan anggota room.",RATE_LIMITED:"Terlalu banyak permintaan. Tunggu sebentar."
 };
 if(/anonymous.*disabled/i.test(message))return "Anonymous Sign-Ins belum aktif di Supabase. Aktifkan pada Authentication → Sign In / Providers → Anonymous.";
 return known[message]??message;
}
